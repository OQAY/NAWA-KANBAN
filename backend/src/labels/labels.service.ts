import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from '../database/entities/label.entity';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
  constructor(
    @InjectRepository(Label)
    private labelRepository: Repository<Label>,
  ) {}

  async findByProject(projectId: string): Promise<Label[]> {
    return this.labelRepository.find({
      where: { projectId },
      order: { name: 'ASC' },
    });
  }

  async create(dto: CreateLabelDto): Promise<Label> {
    const label = this.labelRepository.create(dto);
    return this.labelRepository.save(label);
  }

  async update(id: string, dto: UpdateLabelDto, userId: string): Promise<Label> {
    const label = await this.labelRepository.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!label) throw new NotFoundException('Label not found');
    if (label.project?.ownerId !== userId) throw new ForbiddenException('Access denied');
    Object.assign(label, dto);
    return this.labelRepository.save(label);
  }

  async remove(id: string, userId: string): Promise<void> {
    const label = await this.labelRepository.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!label) throw new NotFoundException('Label not found');
    if (label.project?.ownerId !== userId) throw new ForbiddenException('Access denied');
    await this.labelRepository.remove(label);
  }
}
