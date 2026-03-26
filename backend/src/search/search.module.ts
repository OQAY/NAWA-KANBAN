import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../database/entities/task.entity';
import { Project } from '../database/entities/project.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
