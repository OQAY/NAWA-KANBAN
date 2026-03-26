import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Task } from '../database/entities/task.entity';
import { KanbanColumn } from '../database/entities/column.entity';
import { Project } from '../database/entities/project.entity';
import { ProjectMember } from '../database/entities/project-member.entity';
import { User } from '../database/entities/user.entity';
import { Organization } from '../database/entities/organization.entity';
import { OrganizationMember } from '../database/entities/organization-member.entity';
import { AiUserMemory } from '../database/entities/ai-user-memory.entity';
import { TasksModule } from '../tasks/tasks.module';
import { ColumnsModule } from '../columns/columns.module';
import { AiAgentService } from './ai-agent.service';
import { AiMemoryService } from './ai-memory.service';
import { AiLongMemoryService } from './ai-long-memory.service';
import { AiGateway } from './ai.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      KanbanColumn,
      Project,
      ProjectMember,
      User,
      Organization,
      OrganizationMember,
      AiUserMemory,
    ]),
    TasksModule,
    ColumnsModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AiAgentService, AiMemoryService, AiLongMemoryService, AiGateway],
  exports: [AiAgentService, AiLongMemoryService],
})
export class AiModule {}
