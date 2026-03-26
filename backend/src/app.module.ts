/**
 * Módulo raiz da aplicação Kanban
 * Organiza todos os módulos funcionais do sistema
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { CommentsModule } from './comments/comments.module';
import { ColumnsModule } from './columns/columns.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AiModule } from './ai/ai.module';
import { LabelsModule } from './labels/labels.module';
import { ChecklistsModule } from './checklists/checklists.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { SearchModule } from './search/search.module';
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
    // Rate limiting global: 60 requests por minuto por IP
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    // Event emitter for cross-cutting concerns (notifications, activity log)
    EventEmitterModule.forRoot(),
    // Módulos funcionais do sistema Kanban
    DatabaseModule,    // TypeORM + Supabase
    AuthModule,       // JWT + RBAC
    TasksModule,      // CRUD de tarefas
    UsersModule,      // Gerenciamento de usuários
    ProjectsModule,   // Sistema de projetos
    CommentsModule,   // Comentários em tarefas
    ColumnsModule,    // Colunas personalizadas
    OrganizationsModule, // Empresas/Organizações
    AiModule,         // AI chat com Gemini + WebSocket
    LabelsModule,     // Labels/Tags coloridas para tarefas
    ChecklistsModule, // Checklists dentro de tarefas
    NotificationsModule, // Notificações in-app via events
    ActivityLogModule,   // Histórico de atividade
    SearchModule,        // Busca global cross-project
    AnalyticsModule,     // Métricas e analytics
    TypeOrmModule.forFeature([Task]), // Para o serviço de migração
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DataMigrationService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}