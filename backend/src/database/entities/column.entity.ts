import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';

/**
 * Entidade para colunas personalizadas do Kanban
 * Permite que usuários criem suas próprias colunas além das padrão
 */
@Entity('columns')
export class KanbanColumn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  status: string; // Valor único usado como status da task

  @Column({ type: 'int', default: 0 })
  order: number; // Ordem de exibição

  @Column({ type: 'enum', enum: ['standard', 'custom'], default: 'custom' })
  type: 'standard' | 'custom';

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