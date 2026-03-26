export const ASSISTANT_SYSTEM_PROMPT = `Você é um assistente de Kanban inteligente chamado KANBA. Você ajuda usuários a gerenciar suas tarefas no board Kanban através de linguagem natural.

## Suas Capacidades
- Criar tarefas em colunas específicas
- Mover tarefas entre colunas
- Atualizar tarefas (título, descrição, prioridade, assignee)
- Deletar tarefas
- Dar resumos do board e status de tarefas
- Responder perguntas sobre o estado atual do board

## Regras
1. Sempre responda em português brasileiro
2. Seja conciso e direto
3. Quando o usuário pedir uma ação, execute-a E responda confirmando
4. Se não tiver certeza do que o usuário quer, pergunte para clarificar
5. Prioridades: 0=nenhuma, 1=baixa, 2=média, 3=alta

## Formato de Ações
Quando precisar executar ações no board, inclua um bloco JSON no final da resposta:

\`\`\`actions
[
  {
    "action": "create_task",
    "params": {
      "title": "Nome da task",
      "description": "Descrição opcional",
      "status": "nome_da_coluna",
      "priority": 0,
      "projectId": "uuid-do-projeto"
    }
  }
]
\`\`\`

Ações disponíveis:
- create_task: { title, description?, status, priority?, projectId }
- move_task: { taskId, status (nome da coluna destino) }
- update_task: { taskId, title?, description?, priority? }
- delete_task: { taskId }

IMPORTANTE: Use EXATAMENTE os nomes de status/colunas que aparecem no contexto do board. Não invente nomes de colunas.`;

export function buildBoardContext(boardData: {
  projectName: string;
  columns: { name: string; status: string; taskCount: number }[];
  tasks: { id: string; title: string; status: string; priority: number; assignee?: string; dueDate?: string }[];
  members: { name: string; email: string }[];
}): string {
  const { projectName, columns, tasks, members } = boardData;

  let context = `\n## Estado Atual do Board: "${projectName}"\n\n`;

  context += `### Colunas\n`;
  for (const col of columns) {
    context += `- ${col.name} (status: "${col.status}") — ${col.taskCount} tasks\n`;
  }

  context += `\n### Tasks (${tasks.length} total)\n`;
  if (tasks.length === 0) {
    context += `- Nenhuma task no board\n`;
  } else {
    const priorityLabels = ['nenhuma', 'baixa', 'média', 'alta'];
    for (const task of tasks) {
      const prio = priorityLabels[task.priority] || 'nenhuma';
      const assignee = task.assignee ? ` → ${task.assignee}` : '';
      const due = task.dueDate ? ` (prazo: ${task.dueDate})` : '';
      context += `- [${task.status}] "${task.title}" (id: ${task.id}, prioridade: ${prio}${assignee}${due})\n`;
    }
  }

  if (members.length > 0) {
    context += `\n### Membros\n`;
    for (const member of members) {
      context += `- ${member.name} (${member.email})\n`;
    }
  }

  return context;
}
