import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

export type IdleResolutionType = 'away_working' | 'break' | 'procrastinating' | 'discarded';

@Entity('idle_resolutions')
@Index('idx_idle_res_user_time', ['userId', 'idleStartedAt'])
export class IdleResolution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'idle_started_at', type: 'timestamptz' })
  idleStartedAt: Date;

  @Column({ name: 'idle_ended_at', type: 'timestamptz' })
  idleEndedAt: Date;

  @Column({ name: 'duration_seconds', type: 'int' })
  durationSeconds: number;

  @Column({ name: 'resolution', type: 'varchar', length: 30 })
  resolution: IdleResolutionType;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
