import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';
import { Comment } from './comment.entity';
import { KanbanColumn } from './column.entity';

// TaskStatus enum removido - agora usa status dinâmico baseado em colunas customizáveis

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

  @Column({ default: 'pending' })
  status: string; // Status dinâmico baseado nas colunas do usuário

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

  // Prioridade: 0=none, 1=low, 2=medium, 3=high (compatível com frontend)
  @Column({ default: 0 })
  priority: number;

  @Column({ name: 'due_date', nullable: true })
  dueDate: Date;

  @OneToMany(() => Comment, comment => comment.task)
  comments: Comment[];

  @ManyToOne(() => KanbanColumn, column => column.tasks, { nullable: true })
  @JoinColumn({ name: 'column_id' })
  column: KanbanColumn;

  @Column({ name: 'column_id', nullable: true })
  columnId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}