import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Unique } from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';

/**
 * Entidade para colunas personalizadas do Kanban
 * Permite que usuários criem suas próprias colunas além das padrão
 * Constraint única por usuário e status
 */
@Entity('columns')
@Unique(['status', 'userId'])
export class KanbanColumn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  status: string; // Status único por usuário

  @Column({ type: 'int', default: 0 })
  order: number; // Ordem de exibição

  @Column({ default: 'normal' })
  type: string; // Todas as colunas são tratadas igualmente

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, user => user.ownedColumns)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Task, task => task.column)
  tasks: Task[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}