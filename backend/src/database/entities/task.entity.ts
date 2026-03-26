import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, ManyToMany, JoinTable, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';
import { Comment } from './comment.entity';
import { KanbanColumn } from './column.entity';
import { Label } from './label.entity';
import { Sprint } from './sprint.entity';

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

  // Posição da task dentro da coluna (para ordenação customizada)
  @Column({ default: 0 })
  position: number;

  @Column({ name: 'due_date', nullable: true })
  dueDate: Date;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @OneToMany(() => Comment, comment => comment.task)
  comments: Comment[];

  @ManyToMany(() => Label, label => label.tasks)
  @JoinTable({ name: 'task_labels' })
  labels: Label[];

  @ManyToOne(() => KanbanColumn, column => column.tasks, { nullable: true })
  @JoinColumn({ name: 'column_id' })
  column: KanbanColumn;

  @Column({ name: 'column_id', nullable: true })
  columnId: string;

  // Subtask relationship (self-referencing)
  @ManyToOne(() => Task, task => task.subtasks, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: Task;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string;

  @OneToMany(() => Task, task => task.parent)
  subtasks: Task[];

  // Sprint relationship
  @ManyToOne(() => Sprint, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sprint_id' })
  sprint: Sprint;

  @Column({ name: 'sprint_id', type: 'uuid', nullable: true })
  sprintId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}