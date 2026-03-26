import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sprint, SprintStatus } from '../database/entities/sprint.entity';
import { Task } from '../database/entities/task.entity';

@Injectable()
export class SprintsService {
  constructor(
    @InjectRepository(Sprint)
    private sprintRepository: Repository<Sprint>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  private async findAndVerify(id: string, userId: string): Promise<Sprint> {
    const sprint = await this.sprintRepository.findOne({ where: { id }, relations: ['project'] });
    if (!sprint) throw new NotFoundException('Sprint not found');
    if (sprint.project?.ownerId !== userId) throw new ForbiddenException('Access denied');
    return sprint;
  }

  async findByProject(projectId: string): Promise<Sprint[]> {
    return this.sprintRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<Sprint>): Promise<Sprint> {
    const sprint = this.sprintRepository.create(data);
    return this.sprintRepository.save(sprint);
  }

  async update(id: string, data: Partial<Sprint>, userId: string): Promise<Sprint> {
    const sprint = await this.findAndVerify(id, userId);
    Object.assign(sprint, data);
    return this.sprintRepository.save(sprint);
  }

  async remove(id: string, userId: string): Promise<void> {
    const sprint = await this.findAndVerify(id, userId);
    if (sprint.status !== SprintStatus.PLANNING) {
      throw new ConflictException('Only planning sprints can be deleted');
    }
    await this.sprintRepository.remove(sprint);
  }

  async start(id: string, userId: string): Promise<Sprint> {
    const sprint = await this.findAndVerify(id, userId);

    const active = await this.sprintRepository.findOne({
      where: { projectId: sprint.projectId, status: SprintStatus.ACTIVE },
    });
    if (active) throw new ConflictException('Another sprint is already active');

    sprint.status = SprintStatus.ACTIVE;
    sprint.startDate = new Date();
    return this.sprintRepository.save(sprint);
  }

  async complete(id: string, userId: string): Promise<Sprint> {
    const sprint = await this.findAndVerify(id, userId);

    await this.taskRepository
      .createQueryBuilder()
      .update(Task)
      .set({ sprintId: null as unknown as string })
      .where('sprint_id = :sprintId', { sprintId: id })
      .andWhere("status != 'done'")
      .execute();

    sprint.status = SprintStatus.COMPLETED;
    sprint.endDate = new Date();
    return this.sprintRepository.save(sprint);
  }
}
