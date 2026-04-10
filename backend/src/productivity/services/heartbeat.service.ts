import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductivityHeartbeat } from '../../database/entities/productivity-heartbeat.entity';
import { CreateHeartbeatBulkDto } from '../dto/create-heartbeat-bulk.dto';

@Injectable()
export class HeartbeatService {
  constructor(
    @InjectRepository(ProductivityHeartbeat)
    private heartbeatRepo: Repository<ProductivityHeartbeat>,
  ) {}

  async ingestHeartbeats(dto: CreateHeartbeatBulkDto, userId: string) {
    const entities = dto.events.map(event => {
      const hb = new ProductivityHeartbeat();
      hb.userId = userId;
      hb.startTime = new Date(event.startTime);
      hb.endTime = new Date(event.endTime);
      hb.durationSeconds = event.durationSeconds;
      hb.isAfk = event.isAfk;
      hb.alertLevel = event.alertLevel ?? 0;
      hb.appName = event.appName;
      hb.windowTitle = event.windowTitle;
      hb.hostname = dto.clientMetadata?.hostname;
      hb.focusScore = event.focusScore ?? 0;
      hb.productivityCategory = event.productivityCategory ?? 0;
      hb.audioSource = event.audioSource || null;
      hb.keystrokeRate = event.keystrokeRate ?? 0;
      hb.whisperActive = event.whisperActive ?? false;
      hb.workScore = event.workScore ?? 0;
      return hb;
    });

    const saved = await this.heartbeatRepo.save(entities);
    return { ingested: saved.length };
  }
}
