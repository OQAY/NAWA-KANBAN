import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('daily_summaries')
export class DailySummary {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @PrimaryColumn({ name: 'summary_date', type: 'date' })
  summaryDate: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'total_tracked_seconds', type: 'int', default: 0 })
  totalTrackedSeconds: number;

  @Column({ name: 'active_seconds', type: 'int', default: 0 })
  activeSeconds: number;

  @Column({ name: 'afk_seconds', type: 'int', default: 0 })
  afkSeconds: number;

  @Column({ name: 'alerts_level1', type: 'int', default: 0 })
  alertsLevel1: number;

  @Column({ name: 'alerts_level2', type: 'int', default: 0 })
  alertsLevel2: number;

  @Column({ name: 'alerts_level3', type: 'int', default: 0 })
  alertsLevel3: number;

  @Column({ name: 'longest_focus_streak_seconds', type: 'int', default: 0 })
  longestFocusStreakSeconds: number;

  @Column({ name: 'pomodoro_completed', type: 'int', default: 0 })
  pomodoroCompleted: number;

  @Column({ name: 'pomodoro_interrupted', type: 'int', default: 0 })
  pomodoroInterrupted: number;

  @Column({ name: 'focus_score', type: 'float', default: 0 })
  focusScore: number;

  @Column({ name: 'first_activity_at', type: 'timestamptz', nullable: true })
  firstActivityAt: Date;

  @Column({ name: 'last_activity_at', type: 'timestamptz', nullable: true })
  lastActivityAt: Date;
}
