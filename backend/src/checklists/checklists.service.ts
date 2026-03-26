import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Checklist, ChecklistItem } from '../database/entities/checklist.entity';

@Injectable()
export class ChecklistsService {
  constructor(
    @InjectRepository(Checklist)
    private checklistRepository: Repository<Checklist>,
    @InjectRepository(ChecklistItem)
    private itemRepository: Repository<ChecklistItem>,
  ) {}

  async findByTask(taskId: string): Promise<Checklist[]> {
    return this.checklistRepository.find({
      where: { taskId },
      relations: ['items'],
      order: { order: 'ASC' },
    });
  }

  async createChecklist(taskId: string, title: string): Promise<Checklist> {
    const checklist = this.checklistRepository.create({ title, taskId });
    return this.checklistRepository.save(checklist);
  }

  async updateChecklist(id: string, title: string): Promise<Checklist> {
    const checklist = await this.checklistRepository.findOne({ where: { id } });
    if (!checklist) throw new NotFoundException('Checklist not found');
    checklist.title = title;
    return this.checklistRepository.save(checklist);
  }

  async removeChecklist(id: string): Promise<void> {
    const checklist = await this.checklistRepository.findOne({ where: { id } });
    if (!checklist) throw new NotFoundException('Checklist not found');
    await this.checklistRepository.remove(checklist);
  }

  async addItem(checklistId: string, text: string): Promise<ChecklistItem> {
    const checklist = await this.checklistRepository.findOne({ where: { id: checklistId } });
    if (!checklist) throw new NotFoundException('Checklist not found');
    const item = this.itemRepository.create({ text, checklistId });
    return this.itemRepository.save(item);
  }

  async updateItem(itemId: string, data: { text?: string; completed?: boolean }, userId?: string): Promise<ChecklistItem> {
    const item = await this.itemRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Checklist item not found');

    if (data.text !== undefined) item.text = data.text;
    if (data.completed !== undefined) {
      item.completed = data.completed;
      item.completedAt = data.completed ? new Date() : null;
      item.completedById = data.completed ? userId || null : null;
    }

    return this.itemRepository.save(item);
  }

  async toggleItem(itemId: string, userId?: string): Promise<ChecklistItem> {
    const item = await this.itemRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Checklist item not found');

    item.completed = !item.completed;
    item.completedAt = item.completed ? new Date() : null;
    item.completedById = item.completed ? userId || null : null;

    return this.itemRepository.save(item);
  }

  async removeItem(itemId: string): Promise<void> {
    const item = await this.itemRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Checklist item not found');
    await this.itemRepository.remove(item);
  }
}
