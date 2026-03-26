import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Checklist, ChecklistItem } from '../database/entities/checklist.entity';
import { TasksService } from '../tasks/tasks.service';
import { User } from '../database/entities/user.entity';

@Injectable()
export class ChecklistsService {
  constructor(
    @InjectRepository(Checklist)
    private checklistRepository: Repository<Checklist>,
    @InjectRepository(ChecklistItem)
    private itemRepository: Repository<ChecklistItem>,
    private tasksService: TasksService,
  ) {}

  async findByTask(taskId: string, user: User): Promise<Checklist[]> {
    await this.tasksService.findOne(taskId, user); // verify ownership
    return this.checklistRepository.find({
      where: { taskId },
      relations: ['items'],
      order: { order: 'ASC' },
    });
  }

  async createChecklist(taskId: string, title: string, user: User): Promise<Checklist> {
    await this.tasksService.findOne(taskId, user); // verify ownership
    const checklist = this.checklistRepository.create({ title, taskId });
    return this.checklistRepository.save(checklist);
  }

  private async verifyChecklistOwnership(checklistId: string, user: User): Promise<Checklist> {
    const checklist = await this.checklistRepository.findOne({ where: { id: checklistId } });
    if (!checklist) throw new NotFoundException('Checklist not found');
    await this.tasksService.findOne(checklist.taskId, user);
    return checklist;
  }

  private async verifyItemOwnership(itemId: string, user: User): Promise<ChecklistItem> {
    const item = await this.itemRepository.findOne({
      where: { id: itemId },
      relations: ['checklist'],
    });
    if (!item) throw new NotFoundException('Checklist item not found');
    await this.tasksService.findOne(item.checklist.taskId, user);
    return item;
  }

  async updateChecklist(id: string, title: string, user: User): Promise<Checklist> {
    const checklist = await this.verifyChecklistOwnership(id, user);
    checklist.title = title;
    return this.checklistRepository.save(checklist);
  }

  async removeChecklist(id: string, user: User): Promise<void> {
    const checklist = await this.verifyChecklistOwnership(id, user);
    await this.checklistRepository.remove(checklist);
  }

  async addItem(checklistId: string, text: string, user: User): Promise<ChecklistItem> {
    await this.verifyChecklistOwnership(checklistId, user);
    const item = this.itemRepository.create({ text, checklistId });
    return this.itemRepository.save(item);
  }

  async updateItem(itemId: string, data: { text?: string; completed?: boolean }, user: User): Promise<ChecklistItem> {
    const item = await this.verifyItemOwnership(itemId, user);

    if (data.text !== undefined) item.text = data.text;
    if (data.completed !== undefined) {
      item.completed = data.completed;
      item.completedAt = data.completed ? new Date() : null;
      item.completedById = data.completed ? user.id : null;
    }

    return this.itemRepository.save(item);
  }

  async toggleItem(itemId: string, user: User): Promise<ChecklistItem> {
    const item = await this.verifyItemOwnership(itemId, user);

    item.completed = !item.completed;
    item.completedAt = item.completed ? new Date() : null;
    item.completedById = item.completed ? user.id : null;

    return this.itemRepository.save(item);
  }

  async removeItem(itemId: string, user: User): Promise<void> {
    const item = await this.verifyItemOwnership(itemId, user);
    await this.itemRepository.remove(item);
  }
}
