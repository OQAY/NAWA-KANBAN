import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../database/entities/task.entity';
import { KanbanColumn } from '../database/entities/column.entity';
import { Project } from '../database/entities/project.entity';
import { ProjectMember } from '../database/entities/project-member.entity';
import { User } from '../database/entities/user.entity';
import { buildBoardContext } from './prompts/assistant.prompt';

@Injectable()
export class AiContextService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(KanbanColumn)
    private columnRepository: Repository<KanbanColumn>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private memberRepository: Repository<ProjectMember>,
  ) {}

  async buildContext(user: User, projectId?: string): Promise<string> {
    // Get user's columns
    const columns = await this.columnRepository.find({
      where: { userId: user.id },
      order: { order: 'ASC' },
    });

    // Determine which project to use (F14: verify access)
    let project: Project | null = null;
    if (projectId) {
      // Check ownership first
      project = await this.projectRepository.findOne({
        where: { id: projectId, ownerId: user.id },
      });

      // If not owner, check membership
      if (!project) {
        const membership = await this.memberRepository.findOne({
          where: { projectId, userId: user.id },
        });
        if (membership) {
          project = await this.projectRepository.findOne({
            where: { id: projectId },
          });
        }
      }
    } else {
      project = await this.projectRepository.findOne({
        where: { ownerId: user.id },
        order: { createdAt: 'DESC' },
      });
    }

    if (!project) {
      return '\n## Estado do Board\nNenhum projeto encontrado. O usuário precisa criar um projeto primeiro.\n';
    }

    // Get tasks for this project
    const tasks = await this.taskRepository.find({
      where: { projectId: project.id },
      relations: ['assignee'],
      order: { position: 'ASC' },
    });

    // Get project members
    const members = await this.memberRepository.find({
      where: { projectId: project.id },
      relations: ['user'],
    });

    // Count tasks per column
    const columnData = columns.map((col) => ({
      name: col.name,
      status: col.status,
      taskCount: tasks.filter((t) => t.status === col.status).length,
    }));

    const taskData = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee?.name,
      dueDate: t.dueDate?.toISOString().split('T')[0],
    }));

    const memberData = [
      { name: user.name, email: user.email },
      ...members.map((m) => ({
        name: m.user?.name || 'Unknown',
        email: m.user?.email || '',
      })),
    ];

    return buildBoardContext({
      projectName: project.name,
      columns: columnData,
      tasks: taskData,
      members: memberData,
    });
  }

  async getProjectId(user: User, projectId?: string): Promise<string | null> {
    if (projectId) return projectId;

    const project = await this.projectRepository.findOne({
      where: { ownerId: user.id },
      order: { createdAt: 'DESC' },
    });

    return project?.id || null;
  }
}
