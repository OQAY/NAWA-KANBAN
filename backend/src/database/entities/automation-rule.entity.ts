import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity('automation_rules')
export class AutomationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'jsonb' })
  trigger: { type: string; conditions?: Record<string, unknown>[] };

  @Column({ type: 'jsonb' })
  actions: { type: string; params: Record<string, unknown> }[];

  @Column({ name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt: Date;

  @Column({ name: 'run_count', default: 0 })
  runCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
