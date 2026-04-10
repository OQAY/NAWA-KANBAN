import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('pomodoro_sessions')
export class PomodoroSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'task_name', nullable: true })
  taskName: string;

  @Column({ name: 'planned_duration_seconds', type: 'int' })
  plannedDurationSeconds: number;

  @Column({ name: 'actual_duration_seconds', type: 'int', default: 0 })
  actualDurationSeconds: number;

  // completed | interrupted | abandoned | auto_paused
  @Column({ default: 'completed' })
  status: string;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date;

  @Column({ name: 'interruption_count', type: 'int', default: 0 })
  interruptionCount: number;

  @Column({ name: 'afk_time_seconds', type: 'int', default: 0 })
  afkTimeSeconds: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
