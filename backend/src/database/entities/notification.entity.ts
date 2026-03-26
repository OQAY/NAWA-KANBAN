import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export type NotificationType = 'task_assigned' | 'task_commented' | 'due_date_warning' | 'member_added';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 50 })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ nullable: true })
  body: string;

  @Column({ default: false })
  read: boolean;

  @Column({ name: 'entity_id', nullable: true })
  entityId: string;

  @Column({ name: 'entity_type', nullable: true })
  entityType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
