import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColumnsController } from './columns.controller';
import { ColumnsService } from './columns.service';
import { KanbanColumn } from '../database/entities/column.entity';
import { Task } from '../database/entities/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([KanbanColumn, Task])],
  controllers: [ColumnsController],
  providers: [ColumnsService],
  exports: [ColumnsService]
})
export class ColumnsModule {}