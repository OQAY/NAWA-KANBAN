import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Task } from './task.entity';
import { Project } from './project.entity';
import { KanbanColumn } from './column.entity';
import { Organization } from './organization.entity';
import { OrganizationMember } from './organization-member.entity';

/**
 * Sistema RBAC com 4 níveis hierárquicos de permissão
 * Admin > Manager > Developer > Viewer
 */
export enum UserRole {
  ADMIN = 'admin',      // Acesso total ao sistema
  MANAGER = 'manager',  // Gerencia projetos e usuários
  DEVELOPER = 'developer', // CRUD próprias tarefas
  VIEWER = 'viewer',    // Apenas visualização
}

/**
 * Entidade de usuário com sistema de permissões RBAC
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.DEVELOPER })
  role: UserRole;

  @Column({ name: 'board_config', type: 'text', nullable: true })
  boardConfig: string;

  @OneToMany(() => Task, task => task.assignee)
  assignedTasks: Task[];

  @OneToMany(() => Task, task => task.createdBy)
  createdTasks: Task[];

  @OneToMany(() => Project, project => project.owner)
  ownedProjects: Project[];

  @OneToMany(() => KanbanColumn, column => column.user)
  ownedColumns: KanbanColumn[];

  @OneToMany(() => Organization, org => org.owner)
  ownedOrganizations: Organization[];

  @OneToMany(() => OrganizationMember, member => member.user)
  organizationMemberships: OrganizationMember[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}