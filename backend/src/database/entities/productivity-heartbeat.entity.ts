import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('productivity_heartbeats')
@Index('idx_heartbeat_user_time', ['userId', 'startTime'])
export class ProductivityHeartbeat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Column({ name: 'duration_seconds', type: 'int' })
  durationSeconds: number;

  @Column({ name: 'is_afk', default: false })
  isAfk: boolean;

  @Column({ name: 'alert_level', type: 'int', default: 0 })
  alertLevel: number; // 0=none, 1=gota, 2=nudge, 3=pulsos

  @Column({ name: 'app_name', nullable: true })
  appName: string;

  @Column({ name: 'window_title', type: 'text', nullable: true })
  windowTitle: string;

  @Column({ nullable: true })
  hostname: string;

  @Column({ name: 'focus_score', type: 'int', default: 0 })
  focusScore: number;

  @Column({ name: 'productivity_category', type: 'int', default: 0 })
  productivityCategory: number; // -2 to +2

  @Column({ name: 'audio_source', nullable: true })
  audioSource: string;

  @Column({ name: 'keystroke_rate', type: 'int', default: 0 })
  keystrokeRate: number;

  @Column({ name: 'whisper_active', default: false })
  whisperActive: boolean;

  @Column({ name: 'work_score', type: 'int', default: 0 })
  workScore: number; // 0-100

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
