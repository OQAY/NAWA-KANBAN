import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { IdleResolution } from '../../database/entities/idle-resolution.entity';
import { CreateIdleResolutionDto } from '../dto/create-idle-resolution.dto';
import { dayRangeUTC } from '../productivity.utils';

const RESOLUTION_LABELS: Record<string, string> = {
  away_working:    'Trabalhando fora do PC',
  break:           'Pausa (café, banheiro, etc.)',
  procrastinating: 'Procrastinando',
  discarded:       'Descartado',
};

@Injectable()
export class IdleResolutionService {
  constructor(
    @InjectRepository(IdleResolution)
    private idleResolutionRepo: Repository<IdleResolution>,
  ) {}

  async create(dto: CreateIdleResolutionDto, userId: string) {
    const entity = this.idleResolutionRepo.create({
      userId,
      idleStartedAt: new Date(dto.idleStartedAt),
      idleEndedAt: new Date(dto.idleEndedAt),
      durationSeconds: dto.durationSeconds,
      resolution: dto.resolution as any,
      note: dto.note || null,
    });
    return this.idleResolutionRepo.save(entity);
  }

  async getByDate(userId: string, date: string) {
    const { start, end } = dayRangeUTC(date);
    const rows = await this.idleResolutionRepo.find({
      where: { userId, idleStartedAt: Between(start, end) },
      order: { idleStartedAt: 'ASC' },
    });

    return rows.map(r => ({
      id: r.id,
      startedAt: r.idleStartedAt,
      endedAt: r.idleEndedAt,
      durationSeconds: r.durationSeconds,
      resolution: r.resolution,
      resolutionLabel: RESOLUTION_LABELS[r.resolution] ?? r.resolution,
      note: r.note,
    }));
  }
}
