/**
 * Módulo raiz da aplicação Kanban
 * Organiza todos os módulos funcionais do sistema
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { CommentsModule } from './comments/comments.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Task } from './database/entities/task.entity';
import { DataMigrationService } from './common/services/data-migration.service';

@Module({
  imports: [
    // Configuração global de variáveis de ambiente
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Módulos funcionais do sistema Kanban
    DatabaseModule,    // TypeORM + Supabase
    AuthModule,       // JWT + RBAC
    TasksModule,      // CRUD de tarefas
    UsersModule,      // Gerenciamento de usuários
    ProjectsModule,   // Sistema de projetos
    CommentsModule,   // Comentários em tarefas
    TypeOrmModule.forFeature([Task]), // Para o serviço de migração
  ],
  controllers: [AppController],
  providers: [AppService, DataMigrationService],
})
export class AppModule {}