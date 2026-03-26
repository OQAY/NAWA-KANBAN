import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Checklist, ChecklistItem } from '../database/entities/checklist.entity';
import { TasksModule } from '../tasks/tasks.module';
import { ChecklistsService } from './checklists.service';
import { ChecklistsController } from './checklists.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Checklist, ChecklistItem]), TasksModule],
  controllers: [ChecklistsController],
  providers: [ChecklistsService],
  exports: [ChecklistsService],
})
export class ChecklistsModule {}
