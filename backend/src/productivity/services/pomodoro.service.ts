import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PomodoroSession } from '../../database/entities/pomodoro-session.entity';
import { CreatePomodoroDto } from '../dto/query-analytics.dto';

@Injectable()
export class PomodoroService {
  constructor(
    @InjectRepository(PomodoroSession)
    private pomodoroRepo: Repository<PomodoroSession>,
  ) {}

  async createSession(dto: CreatePomodoroDto, userId: string) {
    const session = this.pomodoroRepo.create({
      userId,
      taskName: dto.taskName,
      plannedDurationSeconds: dto.plannedDurationSeconds,
      actualDurationSeconds: dto.actualDurationSeconds,
      status: dto.status,
      startedAt: new Date(dto.startedAt),
      endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
      interruptionCount: dto.interruptionCount ?? 0,
      afkTimeSeconds: dto.afkTimeSeconds ?? 0,
    });
    return this.pomodoroRepo.save(session);
  }

  async getSessions(userId: string, from?: string, to?: string) {
    const where: any = { userId };
    if (from && to) {
      where.startedAt = Between(new Date(from), new Date(to + 'T23:59:59Z'));
    }
    return this.pomodoroRepo.find({
      where,
      order: { startedAt: 'DESC' },
      take: 100,
    });
  }

  async getDaySummary(userId: string, start: Date, end: Date) {
    return this.pomodoroRepo
      .createQueryBuilder('p')
      .select("COUNT(CASE WHEN p.status = 'completed' THEN 1 END)", 'completed')
      .addSelect("COUNT(CASE WHEN p.status != 'completed' THEN 1 END)", 'interrupted')
      .where('p.user_id = :userId', { userId })
      .andWhere('p.started_at >= :start', { start })
      .andWhere('p.started_at <= :end', { end })
      .getRawOne();
  }
}
