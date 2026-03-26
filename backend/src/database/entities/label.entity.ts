import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, ManyToMany, JoinColumn } from 'typeorm';
import { Project } from './project.entity';
import { Task } from './task.entity';

@Entity('labels')
export class Label {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 7 })
  color: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToMany(() => Task, task => task.labels)
  tasks: Task[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
