/**
 * Decorator para definir roles necessárias em endpoints
 * Usado junto com RolesGuard para implementar RBAC
 * Exemplo: @Roles(UserRole.ADMIN, UserRole.MANAGER)
 */
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../database/entities/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);