import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from '../../database/entities/task.entity';

/**
 * Serviço responsável por migrar dados existentes
 * Converte tasks com status TESTING para PENDING
 */
@Injectable()
export class DataMigrationService implements OnModuleInit {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async onModuleInit() {
    await this.migrateTaskStatuses();
  }

  private async migrateTaskStatuses() {
    try {
      // Migração já foi aplicada - buscar tasks com status 'testing' usando query SQL
      const result = await this.taskRepository.query(
        `UPDATE tasks SET status = $1 WHERE status = $2 RETURNING *`,
        ['pending', 'testing']
      );
      
      if (result.length > 0) {
        console.log(`Migração aplicada: ${result.length} tasks de 'testing' para 'pending'`);
      }
    } catch (error) {
      // Ignorar erro - pode ser que o enum 'testing' já não exista
      console.log('Migração de status já foi aplicada anteriormente.');
    }
  }
}