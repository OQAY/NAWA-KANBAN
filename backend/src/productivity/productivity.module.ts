import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductivityHeartbeat } from '../database/entities/productivity-heartbeat.entity';
import { PomodoroSession } from '../database/entities/pomodoro-session.entity';
import { DailySummary } from '../database/entities/daily-summary.entity';
import { IdleResolution } from '../database/entities/idle-resolution.entity';
import { HeartbeatService } from './services/heartbeat.service';
import { PomodoroService } from './services/pomodoro.service';
import { AnalyticsService } from './services/analytics.service';
import { IdleResolutionService } from './services/idle-resolution.service';
import { ProductivityController } from './productivity.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductivityHeartbeat,
      PomodoroSession,
      DailySummary,
      IdleResolution,
    ]),
  ],
  controllers: [ProductivityController],
  providers: [HeartbeatService, PomodoroService, AnalyticsService, IdleResolutionService],
  exports: [HeartbeatService, PomodoroService, AnalyticsService, IdleResolutionService],
})
export class ProductivityModule {}
