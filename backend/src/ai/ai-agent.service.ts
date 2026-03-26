import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';

import { IsNull, In } from 'typeorm';
import { Task } from '../database/entities/task.entity';
import { Project } from '../database/entities/project.entity';
import { KanbanColumn } from '../database/entities/column.entity';
import { ProjectMember } from '../database/entities/project-member.entity';
import { Organization } from '../database/entities/organization.entity';
import { OrganizationMember } from '../database/entities/organization-member.entity';
import { User } from '../database/entities/user.entity';
import { TasksService } from '../tasks/tasks.service';
import { AiMemoryService } from './ai-memory.service';
import { AiResponse } from './dto/ai-response.dto';

const SYSTEM_PROMPT = `Você é KANBA, assistente de gestão de tarefas. Você age como um gerente de projetos experiente que entende linguagem natural e toma decisões inteligentes sem precisar perguntar o óbvio.

## Filosofia Central
Você é PROATIVO. Entende intenção, não apenas palavras literais. Age imediatamente e confirma com uma mensagem curta. NUNCA faz perguntas desnecessárias quando a intenção é clara.

## Contexto do Usuário
Nome: {userName}
Projeto Atual: {currentProject}
{boardContext}

## Como Interpretar Comandos

### CRIAR TAREFA — padrão sempre é a PRIMEIRA coluna (ex: "Pendente", "A fazer", "To Do")
Frases que significam CRIAR na primeira coluna:
- "adicione X no projeto Y"
- "cria uma task de X"
- "preciso fazer X"
- "anota X para o projeto Y"
- "no projeto X, faça Y" / "no projeto X, adicione Y"
- Qualquer instrução que descreva algo a ser feito

**REGRA DE OURO**: Toda nova tarefa vai para a PRIMEIRA coluna, a menos que o usuário diga explicitamente outra coluna.

### MOVER TAREFA — quando o usuário menciona status/conclusão
Frases que significam MOVER para última coluna (Concluído/Done):
- "X foi concluída"
- "terminei X"
- "X está pronta"
- "X foi feita"
- "marcar X como concluída"

Frases que significam MOVER para coluna específica:
- "mover X para [coluna]"
- "colocar X em [coluna]"
- "X está em andamento" → move para coluna de progresso

### RESOLUÇÃO AUTOMÁTICA DE NOMES
- Projeto mencionado por nome → use list_projects para encontrar o ID, depois aja
- Tarefa mencionada por nome → use get_board para encontrar o ID, depois aja
- NUNCA peça ID ao usuário — sempre resolva automaticamente

## Fluxo de Decisão (execute sempre nesta ordem)

1. **Entender a intenção** — criar? mover? atualizar? deletar? listar?
2. **Resolver referências** — se projeto por nome → list_projects | se task por nome → get_board
3. **AGE** — execute a ferramenta
4. **Confirme** com mensagem curta e direta em português

## O que NUNCA fazer
- NUNCA perguntar "qual é o ID?" ou "qual projeto você quer dizer?"
- NUNCA responder sem executar a ferramenta quando a intenção é clara
- NUNCA criar tarefa em status genérico como "pending" — sempre use a primeira coluna real do board
- NUNCA pedir confirmação antes de agir — aja imediatamente

## Confirmação: APÓS a ação, não antes
Depois de executar, responda em UMA linha curta:
- Criar: "✓ _título_ → _projeto_ / _coluna_"
- Mover: "✓ _título_ movida para _coluna_"
- Deletar: "✓ _título_ removida"
- Atualizar: "✓ _título_ atualizada"
Não precisa de parágrafo. Uma linha basta.

## Tolerância a Erros de Transcrição de Voz
O usuário frequentemente usa entrada por voz. Transcrições podem ter erros. Se uma mensagem parecer estranha ou incompleta:
- Interprete pela intenção geral, não pelas palavras exatas
- Nomes de projetos com grafia errada (ex: "santandê", "santander" → projeto Santander)
- Verbos mal transcritos (ex: "adiçone", "adição" → adicionar/criar)
- Frases incompletas → complete com o que fizer mais sentido no contexto
- Se genuinamente impossível interpretar, peça esclarecimento em UMA pergunta curta

## Prioridades
0=nenhuma, 1=baixa, 2=média, 3=alta
Infira a prioridade pelo contexto quando possível (ex: "urgente" → 3=alta).
`;

@Injectable()
export class AiAgentService implements OnModuleInit {
  private readonly logger = new Logger(AiAgentService.name);
  private model: ChatGoogleGenerativeAI | null = null;
  private initialized = false;

  constructor(
    private configService: ConfigService,
    private memoryService: AiMemoryService,
    private tasksService: TasksService,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(KanbanColumn)
    private columnRepository: Repository<KanbanColumn>,
    @InjectRepository(ProjectMember)
    private memberRepository: Repository<ProjectMember>,
    @InjectRepository(Organization)
    private orgRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private orgMemberRepository: Repository<OrganizationMember>,
  ) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured — AI agent disabled');
      return;
    }

    this.model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash',
      apiKey,
      temperature: 0.3,
      maxOutputTokens: 2048,
    });

    this.initialized = true;
    this.logger.log('LangChain AI Agent initialized with Gemini 2.0 Flash');
  }

  async chat(
    user: User,
    message: string,
    projectId?: string,
  ): Promise<AiResponse> {
    if (!this.initialized || !this.model) {
      return { text: 'AI não está configurada. Verifique a GEMINI_API_KEY no .env.' };
    }

    try {
      // Build tools scoped to this user/project
      const tools = this.buildTools(user, projectId);

      // Get conversation history from Redis
      const history = await this.memoryService.getHistory(user.id);

      // Resolve current project name
      const projectName = await this.resolveProjectName(user, projectId);

      // Pre-load board context so AI knows columns without calling get_board
      const boardContext = await this.buildBoardContext(user, projectId);

      // Build system message
      const systemContent = SYSTEM_PROMPT
        .replace('{userName}', user.name || 'Usuário')
        .replace('{currentProject}', projectName || 'Nenhum selecionado')
        .replace('{boardContext}', boardContext);

      // Compose messages: system + history + current message
      const messages = [
        new SystemMessage(systemContent),
        ...history,
        new HumanMessage(message),
      ];

      // Bind tools to model and invoke with agent loop
      const modelWithTools = this.model.bindTools(tools);
      let response = await modelWithTools.invoke(messages);

      this.logger.debug(`Initial response tool_calls: ${response.tool_calls?.length || 0}`);

      // Agent loop: keep calling tools until no more tool calls
      const agentMessages = [...messages, response];
      let iterations = 0;
      const MAX_ITERATIONS = 8;

      while (response.tool_calls && response.tool_calls.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;

        // Execute each tool call
        for (const toolCall of response.tool_calls) {
          this.logger.debug(`Tool call: ${toolCall.name}`);
          const matchingTool = tools.find(t => t.name === toolCall.name);
          if (!matchingTool) {
            this.logger.warn(`Tool not found: ${toolCall.name}`);
            continue;
          }

          const toolCallId = toolCall.id || toolCall.name;
          try {
            const toolResult = await (matchingTool as any).invoke(toolCall.args);
            agentMessages.push(new ToolMessage({
              content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
              tool_call_id: toolCallId,
            }));
          } catch (toolError) {
            this.logger.error(`Tool ${toolCall.name} error: ${toolError.message}`);
            agentMessages.push(new ToolMessage({
              content: `Erro ao executar ${toolCall.name}: ${toolError.message}`,
              tool_call_id: toolCallId,
            }));
          }
        }

        // Call model again with tool results
        response = await modelWithTools.invoke(agentMessages);
        agentMessages.push(response);
      }

      const responseText = typeof response.content === 'string'
        ? response.content
        : Array.isArray(response.content)
          ? response.content.map(c => typeof c === 'string' ? c : (c as any).text || '').join('')
          : String(response.content);

      // Save to Redis memory (only user message + final AI response)
      await this.memoryService.addMessages(user.id, [
        new HumanMessage(message),
        new AIMessage(responseText),
      ]);

      // Extract actions from tool calls for board update notifications
      const executedActions = this.extractExecutedActions(agentMessages);

      return {
        text: responseText,
        actions: executedActions.length > 0
          ? executedActions.map(a => ({ action: a.action as any, params: a.params, success: a.success }))
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Agent error: ${error.message}`, error.stack);
      return {
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
      };
    }
  }

  async resetSession(userId: string): Promise<void> {
    await this.memoryService.clearHistory(userId);
  }

  private buildTools(user: User, currentProjectId?: string): StructuredToolInterface[] {
    // Tool: List user's organizations and projects
    const listProjects = tool(
      async () => {
        const memberships = await this.orgMemberRepository.find({
          where: { userId: user.id },
          relations: ['organization'],
        });

        const result: any[] = [];

        for (const m of memberships) {
          const org = m.organization;
          const allOrgProjects = await this.projectRepository.find({
            where: { organizationId: org.id },
            select: ['id', 'name', 'description', 'ownerId'],
          });

          // Filter to only projects user owns or is an explicit member of
          const projectIds = allOrgProjects.map(p => p.id);
          const projectMemberships = projectIds.length > 0
            ? await this.memberRepository.find({
                where: { userId: user.id, projectId: In(projectIds) },
                select: ['projectId'],
              })
            : [];
          const memberProjectIds = new Set(projectMemberships.map(pm => pm.projectId));
          const accessibleProjects = allOrgProjects.filter(
            p => p.ownerId === user.id || memberProjectIds.has(p.id)
          );

          if (accessibleProjects.length > 0) {
            result.push({
              organization: { id: org.id, name: org.name },
              projects: accessibleProjects.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
              })),
            });
          }
        }

        // Also get standalone projects (no org)
        const standaloneProjects = await this.projectRepository.find({
          where: { ownerId: user.id, organizationId: IsNull() },
          select: ['id', 'name', 'description'],
        });

        if (standaloneProjects.length > 0) {
          result.push({
            organization: { id: null, name: 'Projetos Avulsos' },
            projects: standaloneProjects.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description,
            })),
          });
        }

        return JSON.stringify(result, null, 2);
      },
      {
        name: 'list_projects',
        description: 'Lista todas as organizações e projetos do usuário. Use para descobrir IDs de projetos quando o usuário mencionar um projeto por nome.',
        schema: z.object({}),
      },
    );

    // Tool: Get board state (columns + tasks)
    const getBoard = tool(
      async (input: { projectId?: string }) => {
        // Validate UUID format — if user passed a name, ignore it and use currentProjectId
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validProjectId = input.projectId && uuidRegex.test(input.projectId)
          ? input.projectId
          : null;
        const pid = validProjectId || currentProjectId;
        if (!pid) return 'Nenhum projeto selecionado. Use list_projects para ver os projetos disponíveis.';

        const project = await this.verifyProjectAccess(user, pid);
        if (!project) return 'Projeto não encontrado ou sem permissão de acesso.';

        const columns = await this.columnRepository.find({
          where: { userId: user.id },
          order: { order: 'ASC' },
        });

        const tasks = await this.taskRepository.find({
          where: { projectId: pid },
          relations: ['assignee'],
          order: { position: 'ASC' },
        });

        const priorityLabels = ['nenhuma', 'baixa', 'média', 'alta'];
        const boardState = {
          project: project.name,
          projectId: pid,
          columns: columns.map(col => ({
            name: col.name,
            status: col.status,
            tasks: tasks
              .filter(t => t.status === col.status)
              .map(t => ({
                id: t.id,
                title: t.title,
                priority: priorityLabels[t.priority] || 'nenhuma',
                assignee: t.assignee?.name || null,
                dueDate: t.dueDate?.toISOString().split('T')[0] || null,
                description: t.description || null,
              })),
          })),
          totalTasks: tasks.length,
        };

        return JSON.stringify(boardState, null, 2);
      },
      {
        name: 'get_board',
        description: `Retorna o estado completo do board: colunas, tarefas com IDs, prioridades e status. Use SEMPRE que precisar saber quais tasks existem ou obter o ID de uma task. Projeto atual: ${currentProjectId || 'nenhum'}. Não passe projectId a menos que queira ver um projeto DIFERENTE do atual.`,
        schema: z.object({
          projectId: z.string().optional().describe('UUID do projeto (somente se diferente do atual). Na maioria dos casos, omita este campo.'),
        }),
      },
    );

    // Tool: Create task
    const createTask = tool(
      async (input: {
        title: string;
        projectId?: string;
        description?: string;
        status?: string;
        priority?: number;
      }) => {
        const pid = input.projectId || currentProjectId;
        if (!pid) return 'Erro: nenhum projeto selecionado para criar a tarefa.';

        // Verify user has access to this project
        const project = await this.verifyProjectAccess(user, pid);
        if (!project) return 'Erro: você não tem acesso a este projeto.';

        // Resolve status: validate against user's columns, fallback to first column
        let resolvedStatus = input.status;
        const userColumns = await this.columnRepository.find({
          where: { userId: user.id },
          order: { order: 'ASC' },
        });
        const validStatuses = userColumns.map(c => c.status);
        if (!resolvedStatus || !validStatuses.includes(resolvedStatus)) {
          resolvedStatus = validStatuses[0] || 'pending';
        }

        const task = await this.tasksService.create(
          {
            title: input.title.slice(0, 255),
            description: input.description || '',
            status: resolvedStatus,
            priority: input.priority ?? 0,
            projectId: pid,
          } as any,
          user,
        );

        return JSON.stringify({
          success: true,
          task: { id: task.id, title: task.title, status: task.status },
          message: `Tarefa "${task.title}" criada com sucesso.`,
        });
      },
      {
        name: 'create_task',
        description: 'Cria uma nova tarefa em um projeto. IMPORTANTE: se o usuário não especificar coluna, NÃO passe o campo status — o sistema coloca automaticamente na primeira coluna (Pendente). Só passe status se o usuário explicitamente disser em qual coluna quer.',
        schema: z.object({
          title: z.string().describe('Título da tarefa'),
          projectId: z.string().optional().describe('ID do projeto. Se omitido, usa o projeto atual.'),
          description: z.string().optional().describe('Descrição da tarefa'),
          status: z.string().optional().describe('Coluna destino — omitir para usar a primeira coluna automaticamente'),
          priority: z.number().min(0).max(3).optional().describe('Prioridade: 0=nenhuma, 1=baixa, 2=média, 3=alta'),
        }),
      },
    );

    // Tool: Move task
    const moveTask = tool(
      async (input: { taskId: string; status: string }) => {
        const task = await this.verifyTaskAccess(user, input.taskId);
        if (!task) return 'Tarefa não encontrada ou sem permissão.';

        // Resolve status: user might pass column name or status key — try to match
        let resolvedStatus = input.status;
        const userColumns = await this.columnRepository.find({
          where: { userId: user.id },
          order: { order: 'ASC' },
        });
        const byStatus = userColumns.find(c => c.status === input.status);
        if (!byStatus) {
          // Try matching by column name (case-insensitive)
          const byName = userColumns.find(c =>
            c.name.toLowerCase() === input.status.toLowerCase()
          );
          if (byName) {
            resolvedStatus = byName.status;
          } else {
            // Only fallback to doneKeywords if no column matched by name
            const doneKeywords = ['concluído', 'concluida', 'done', 'finalizado', 'pronto', 'finished'];
            if (doneKeywords.some(k => input.status.toLowerCase().includes(k))) {
              resolvedStatus = userColumns[userColumns.length - 1]?.status || input.status;
            }
          }
        }

        const updated = await this.tasksService.update(
          input.taskId,
          { status: resolvedStatus } as any,
          user,
        );

        const targetCol = userColumns.find(c => c.status === resolvedStatus);
        return JSON.stringify({
          success: true,
          message: `Tarefa "${updated.title}" movida para "${targetCol?.name || resolvedStatus}".`,
        });
      },
      {
        name: 'move_task',
        description: 'Move uma tarefa para outra coluna. Aceita o status da coluna OU o nome da coluna (ex: "Concluído", "Em andamento"). Para "concluída/finalizada/pronta", move para a última coluna automaticamente.',
        schema: z.object({
          taskId: z.string().describe('ID da tarefa'),
          status: z.string().describe('Status ou nome da coluna destino'),
        }),
      },
    );

    // Tool: Update task
    const updateTask = tool(
      async (input: {
        taskId: string;
        title?: string;
        description?: string;
        priority?: number;
      }) => {
        const task = await this.verifyTaskAccess(user, input.taskId);
        if (!task) return 'Tarefa não encontrada ou sem permissão.';

        const updateData: Record<string, any> = {};
        if (input.title) updateData.title = input.title.slice(0, 255);
        if (input.description !== undefined) updateData.description = input.description.slice(0, 2000);
        if (input.priority !== undefined) updateData.priority = input.priority;

        const updated = await this.tasksService.update(
          input.taskId,
          updateData as any,
          user,
        );

        return JSON.stringify({
          success: true,
          message: `Tarefa "${updated.title}" atualizada.`,
        });
      },
      {
        name: 'update_task',
        description: 'Atualiza uma tarefa existente. Pode alterar título, descrição ou prioridade.',
        schema: z.object({
          taskId: z.string().describe('ID da tarefa'),
          title: z.string().optional().describe('Novo título'),
          description: z.string().optional().describe('Nova descrição'),
          priority: z.number().min(0).max(3).optional().describe('Nova prioridade'),
        }),
      },
    );

    // Tool: Delete task
    const deleteTask = tool(
      async (input: { taskId: string }) => {
        const task = await this.verifyTaskAccess(user, input.taskId);
        if (!task) return 'Tarefa não encontrada ou sem permissão.';

        await this.tasksService.remove(input.taskId, user);
        return JSON.stringify({
          success: true,
          message: 'Tarefa deletada com sucesso.',
        });
      },
      {
        name: 'delete_task',
        description: 'Deleta uma tarefa permanentemente. Use com cuidado!',
        schema: z.object({
          taskId: z.string().describe('ID da tarefa a deletar'),
        }),
      },
    );

    return [listProjects, getBoard, createTask, moveTask, updateTask, deleteTask];
  }

  /**
   * Verifica se o usuário tem acesso ao projeto (owner ou membro).
   * Retorna o Project se autorizado, null se não.
   */
  private async verifyProjectAccess(user: User, projectId: string): Promise<Project | null> {
    // Check ownership
    let project = await this.projectRepository.findOne({
      where: { id: projectId, ownerId: user.id },
    });
    if (project) return project;

    // Check membership
    const membership = await this.memberRepository.findOne({
      where: { projectId, userId: user.id },
    });
    if (membership) {
      return this.projectRepository.findOne({ where: { id: projectId } });
    }

    return null;
  }

  /**
   * Verifica se a task pertence a um projeto que o usuário tem acesso.
   */
  private async verifyTaskAccess(user: User, taskId: string): Promise<Task | null> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      select: ['id', 'title', 'projectId', 'status', 'priority'],
    });
    if (!task) return null;

    const hasAccess = await this.verifyProjectAccess(user, task.projectId);
    return hasAccess ? task : null;
  }

  private async resolveProjectName(user: User, projectId?: string): Promise<string | null> {
    if (!projectId) return null;

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['id', 'name'],
    });

    return project?.name || null;
  }

  /**
   * Builds board context string to inject into system prompt.
   * This avoids the AI needing to call get_board just to know column names.
   */
  private async buildBoardContext(user: User, projectId?: string): Promise<string> {
    const columns = await this.columnRepository.find({
      where: { userId: user.id },
      order: { order: 'ASC' },
    });

    if (!columns.length) return '';

    const colList = columns.map((c, i) =>
      `  ${i === 0 ? '→ PRIMEIRA (padrão para novas tarefas)' : i === columns.length - 1 ? '→ ÚLTIMA (concluído)' : '  '} "${c.name}" (status: ${c.status})`
    ).join('\n');

    let context = `## Colunas do Board Atual\n${colList}\n`;

    if (projectId) {
      const tasks = await this.taskRepository.find({
        where: { projectId },
        order: { position: 'ASC' },
        select: ['id', 'title', 'status', 'priority'],
      });
      if (tasks.length) {
        const priorityLabels = ['', 'baixa', 'média', 'alta'];
        context += `\n## Tarefas Atuais do Projeto\n`;
        context += tasks.map(t =>
          `  - "${t.title}" [${t.status}]${t.priority ? ` (${priorityLabels[t.priority]})` : ''} (id: ${t.id})`
        ).join('\n');
      }
    }

    return context;
  }

  private extractExecutedActions(messages: any[]): Array<{ action: string; params: Record<string, any>; success: boolean }> {
    const actions: Array<{ action: string; params: Record<string, any>; success: boolean }> = [];
    const mutatingTools = ['create_task', 'move_task', 'update_task', 'delete_task'];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg.tool_calls) continue;

      for (const tc of msg.tool_calls) {
        if (!mutatingTools.includes(tc.name)) continue;

        // Find the corresponding ToolMessage result
        const toolCallId = tc.id || tc.name;
        const resultMsg = messages.slice(i + 1).find(
          (m: any) => m.constructor?.name === 'ToolMessage' && m.tool_call_id === toolCallId,
        );

        let success = true;
        if (resultMsg) {
          const content = typeof resultMsg.content === 'string' ? resultMsg.content : '';
          // Check if the tool returned an error message
          success = content.includes('"success":true') || content.includes('"success": true');
          if (!success) {
            // Also check if it doesn't contain error indicators
            success = !content.startsWith('Erro') && !content.includes('não encontrada') && !content.includes('sem permissão');
          }
        }

        actions.push({ action: tc.name, params: tc.args || {}, success });
      }
    }

    return actions;
  }
}
