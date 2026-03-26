import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskTemplate } from '../database/entities/task-template.entity';
import { TaskTemplatesService } from './task-templates.service';
import { TaskTemplatesController } from './task-templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskTemplate])],
  controllers: [TaskTemplatesController],
  providers: [TaskTemplatesService],
})
export class TaskTemplatesModule {}
