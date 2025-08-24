import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';
import { Comment } from './comment.entity';

/**
 * Estados possíveis de uma tarefa no fluxo Kanban
 * Representa o ciclo de vida completo de uma tarefa
 */
export enum TaskStatus {
  TO_DO = 'to_do',          // A Fazer - Tarefa planejada
  PENDING = 'pending',       // Pendente - Aguardando início
  IN_PROGRESS = 'in_progress', // Em Progresso - Em desenvolvimento
  DONE = 'done',            // Concluído - Tarefa finalizada
}

/**
 * Entidade principal do sistema Kanban
 * Representa uma tarefa com todos os seus relacionamentos e metadados
 */
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TO_DO })
  status: TaskStatus;

  @ManyToOne(() => Project, project => project.tasks)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => User, user => user.assignedTasks, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User;

  @Column({ name: 'assignee_id', nullable: true })
  assigneeId: string;

  @ManyToOne(() => User, user => user.createdTasks)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  // Prioridade: 0=baixa, 1=média, 2=alta
  @Column({ default: 0 })
  priority: number;

  @Column({ name: 'due_date', nullable: true })
  dueDate: Date;

  @OneToMany(() => Comment, comment => comment.task)
  comments: Comment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}