import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../database/entities/organization.entity';
import { OrganizationMember } from '../database/entities/organization-member.entity';
import { User } from '../database/entities/user.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddOrganizationMemberDto } from './dto/add-member.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private orgRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(dto: CreateOrganizationDto, user: User): Promise<Organization> {
    const org = this.orgRepository.create({
      ...dto,
      ownerId: user.id,
    });
    const saved = await this.orgRepository.save(org);

    // Owner is automatically an admin member
    await this.memberRepository.save({
      organizationId: saved.id,
      userId: user.id,
      role: 'admin',
    });

    return saved;
  }

  async findAll(user: User): Promise<Organization[]> {
    // Return orgs where user is owner or member
    const memberships = await this.memberRepository.find({
      where: { userId: user.id },
      select: ['organizationId'],
    });
    const orgIds = memberships.map(m => m.organizationId);

    if (orgIds.length === 0) return [];

    return this.orgRepository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.owner', 'owner')
      .select([
        'org.id', 'org.name', 'org.description', 'org.color', 'org.ownerId',
        'org.createdAt', 'org.updatedAt',
        'owner.id', 'owner.name', 'owner.email',
      ])
      .where('org.id IN (:...orgIds)', { orgIds })
      .orderBy('org.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, user: User): Promise<Organization> {
    await this.verifyAccess(id, user.id);

    return this.orgRepository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.owner', 'owner')
      .leftJoinAndSelect('org.projects', 'projects')
      .select([
        'org.id', 'org.name', 'org.description', 'org.color', 'org.ownerId',
        'org.createdAt', 'org.updatedAt',
        'owner.id', 'owner.name', 'owner.email',
        'projects.id', 'projects.name', 'projects.description', 'projects.color',
        'projects.createdAt',
      ])
      .where('org.id = :id', { id })
      .getOne();
  }

  async reorderOrgs(orgIds: string[], user: User) {
    const memberships = await this.memberRepository.find({
      where: { userId: user.id },
    });

    for (const membership of memberships) {
      const idx = orgIds.indexOf(membership.organizationId);
      if (idx !== -1) {
        membership.position = idx;
      }
    }

    await this.memberRepository.save(memberships);
    return { success: true };
  }

  async getMyOverview(user: User) {
    const memberships = await this.memberRepository.find({
      where: { userId: user.id },
      select: ['organizationId', 'position'],
      order: { position: 'ASC', createdAt: 'ASC' },
    });
    const orgIds = memberships.map(m => m.organizationId);
    if (orgIds.length === 0) return [];

    // Build position map for ordering
    const positionMap = new Map<string, number>();
    memberships.forEach(m => positionMap.set(m.organizationId, m.position));

    const orgs = await this.orgRepository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.projects', 'project')
      .leftJoinAndSelect('project.tasks', 'task')
      .where('org.id IN (:...orgIds)', { orgIds })
      .addOrderBy('project.createdAt', 'ASC')
      .addOrderBy('task.position', 'ASC')
      .getMany();

    // Sort orgs by user's position preference
    orgs.sort((a, b) => (positionMap.get(a.id) ?? 0) - (positionMap.get(b.id) ?? 0));

    return orgs.map(org => ({
      id: org.id,
      name: org.name,
      description: org.description,
      color: org.color,
      ownerId: org.ownerId,
      createdAt: org.createdAt,
      projects: org.projects.map(p => {
        const tasks = p.tasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          startDate: t.startDate,
          completedAt: t.completedAt,
          position: t.position,
          createdAt: t.createdAt,
        }));
        const tasksByStatus: Record<string, number> = {};
        for (const t of tasks) {
          tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
        }
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          color: p.color,
          totalTasks: tasks.length,
          tasksByStatus,
          tasks,
          createdAt: p.createdAt,
        };
      }),
    }));
  }

  async getOverview(id: string, user: User) {
    await this.verifyAccess(id, user.id);

    const org = await this.orgRepository.findOne({
      where: { id },
      relations: ['projects', 'projects.tasks'],
    });

    if (!org) throw new NotFoundException('Organization not found');

    const projects = org.projects.map(p => {
      const tasks = p.tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        startDate: t.startDate,
        completedAt: t.completedAt,
        position: t.position,
        createdAt: t.createdAt,
      }));
      const tasksByStatus: Record<string, number> = {};
      for (const t of tasks) {
        tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
      }
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        color: p.color,
        totalTasks: tasks.length,
        tasksByStatus,
        tasks,
        createdAt: p.createdAt,
      };
    });

    return {
      id: org.id,
      name: org.name,
      description: org.description,
      color: org.color,
      ownerId: org.ownerId,
      createdAt: org.createdAt,
      projects,
    };
  }

  async update(id: string, dto: UpdateOrganizationDto, user: User): Promise<Organization> {
    const org = await this.orgRepository.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    if (org.ownerId !== user.id) throw new ForbiddenException('Only the owner can update');

    Object.assign(org, dto);
    return this.orgRepository.save(org);
  }

  async remove(id: string, user: User): Promise<void> {
    const org = await this.orgRepository.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    if (org.ownerId !== user.id) throw new ForbiddenException('Only the owner can delete');

    await this.orgRepository.remove(org);
  }

  async getMembers(orgId: string, user: User): Promise<OrganizationMember[]> {
    await this.verifyAccess(orgId, user.id);
    return this.memberRepository.find({
      where: { organizationId: orgId },
      order: { createdAt: 'ASC' },
    });
  }

  async addMember(orgId: string, dto: AddOrganizationMemberDto, user: User): Promise<OrganizationMember> {
    await this.verifyOwnerOrAdmin(orgId, user.id);

    const targetUser = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!targetUser) throw new NotFoundException('User not found');

    const existing = await this.memberRepository.findOne({
      where: { organizationId: orgId, userId: targetUser.id },
    });
    if (existing) throw new ForbiddenException('User is already a member');

    return this.memberRepository.save({
      organizationId: orgId,
      userId: targetUser.id,
      role: dto.role || 'member',
    });
  }

  async updateMember(orgId: string, memberId: string, role: string, user: User): Promise<OrganizationMember> {
    await this.verifyOwnerOrAdmin(orgId, user.id);

    const member = await this.memberRepository.findOne({ where: { id: memberId, organizationId: orgId } });
    if (!member) throw new NotFoundException('Member not found');

    member.role = role;
    return this.memberRepository.save(member);
  }

  async removeMember(orgId: string, memberId: string, user: User): Promise<void> {
    await this.verifyOwnerOrAdmin(orgId, user.id);

    const member = await this.memberRepository.findOne({ where: { id: memberId, organizationId: orgId } });
    if (!member) throw new NotFoundException('Member not found');

    // Can't remove the owner
    const org = await this.orgRepository.findOne({ where: { id: orgId } });
    if (member.userId === org.ownerId) throw new ForbiddenException('Cannot remove the owner');

    await this.memberRepository.remove(member);
  }

  private async verifyAccess(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { organizationId: orgId, userId },
    });
    if (!member) throw new ForbiddenException('You are not a member of this organization');
  }

  private async verifyOwnerOrAdmin(orgId: string, userId: string): Promise<void> {
    const org = await this.orgRepository.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    if (org.ownerId === userId) return;

    const member = await this.memberRepository.findOne({
      where: { organizationId: orgId, userId },
    });
    if (!member || member.role !== 'admin') {
      throw new ForbiddenException('Only owner or admin can perform this action');
    }
  }
}
