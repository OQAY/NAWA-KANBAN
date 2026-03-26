import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Task } from './entities/task.entity';
import { Project } from './entities/project.entity';
import { Comment } from './entities/comment.entity';
import { KanbanColumn } from './entities/column.entity';
import { ProjectMember } from './entities/project-member.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization-member.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const sslEnabled = configService.get('DB_SSL', 'true') !== 'false';
        return {
          type: 'postgres',
          host: configService.get('DB_HOST'),
          port: parseInt(configService.get('DB_PORT', '5432')),
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_NAME'),
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          timezone: 'America/Sao_Paulo',
          entities: [User, Task, Project, Comment, KanbanColumn, ProjectMember, Organization, OrganizationMember],
          synchronize: true,
          logging: configService.get('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}