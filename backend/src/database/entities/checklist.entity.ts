import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Task } from './task.entity';

@Entity('checklists')
export class Checklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  title: string;

  @Column({ default: 0 })
  order: number;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'task_id' })
  taskId: string;

  @OneToMany(() => ChecklistItem, item => item.checklist, { cascade: true, eager: true })
  items: ChecklistItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('checklist_items')
export class ChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  text: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ default: 0 })
  order: number;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'completed_by_id', nullable: true })
  completedById: string;

  @ManyToOne(() => Checklist, checklist => checklist.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'checklist_id' })
  checklist: Checklist;

  @Column({ name: 'checklist_id' })
  checklistId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
