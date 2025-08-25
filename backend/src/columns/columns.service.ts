import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanbanColumn } from '../database/entities/column.entity';
import { User } from '../database/entities/user.entity';
import { Task } from '../database/entities/task.entity';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Injectable()
export class ColumnsService {
  constructor(
    @InjectRepository(KanbanColumn)
    private columnRepository: Repository<KanbanColumn>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  /**
   * Cria uma nova coluna personalizada para o usuário
   */
  async create(createColumnDto: CreateColumnDto, user: User): Promise<KanbanColumn> {
    // Verifica se status já existe para este usuário
    const existingColumn = await this.columnRepository.findOne({
      where: { status: createColumnDto.status, userId: user.id }
    });

    if (existingColumn) {
      throw new ConflictException('Column with this status already exists');
    }

    // Determina a próxima ordem
    const maxOrder = await this.columnRepository
      .createQueryBuilder('column')
      .select('MAX(column.order)', 'maxOrder')
      .where('column.userId = :userId', { userId: user.id })
      .getRawOne();

    const nextOrder = (maxOrder?.maxOrder || 0) + 1;

    const column = this.columnRepository.create({
      ...createColumnDto,
      userId: user.id,
      order: nextOrder,
      type: 'normal' // Todas as colunas são normais
    });

    return this.columnRepository.save(column);
  }

  /**
   * Cria as colunas iniciais para um novo usuário
   */
  async createInitialColumns(user: User): Promise<KanbanColumn[]> {
    const initialColumnsData = [
      { name: 'Pendente', status: 'pending', order: 0 },
      { name: 'Em Progresso', status: 'in_progress', order: 1 },
      { name: 'Em Teste', status: 'testing', order: 2 },
      { name: 'Concluído', status: 'done', order: 3 },
    ];

    const columns = initialColumnsData.map(columnData => 
      this.columnRepository.create({
        ...columnData,
        type: 'normal',
        userId: user.id
      })
    );

    return this.columnRepository.save(columns);
  }

  /**
   * Lista todas as colunas do usuário
   */
  async findAll(user: User): Promise<KanbanColumn[]> {
    return this.columnRepository.find({
      where: { userId: user.id },
      order: { order: 'ASC' }
    });
  }

  /**
   * Busca uma coluna específica
   */
  async findOne(id: string, user: User): Promise<KanbanColumn> {
    const column = await this.columnRepository.findOne({
      where: { id, userId: user.id }
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return column;
  }

  /**
   * Atualiza uma coluna personalizada
   */
  async update(id: string, updateColumnDto: UpdateColumnDto, user: User): Promise<KanbanColumn> {
    const column = await this.findOne(id, user);

    if (column.type === 'standard') {
      throw new ForbiddenException('Cannot update standard columns');
    }

    // Se mudando o status, verifica se já existe
    if (updateColumnDto.status && updateColumnDto.status !== column.status) {
      const existingColumn = await this.columnRepository.findOne({
        where: { status: updateColumnDto.status, userId: user.id }
      });

      if (existingColumn) {
        throw new ConflictException('Column with this status already exists');
      }
    }

    Object.assign(column, updateColumnDto);
    return this.columnRepository.save(column);
  }

  /**
   * Remove uma coluna (permite deletar qualquer tipo, incluindo padrão)
   * O usuário tem total liberdade para customizar seu board
   */
  async remove(id: string, user: User): Promise<void> {
    const column = await this.findOne(id, user);

    // Verifica se há tasks usando esta coluna e as move para 'pending' ou deleta
    if (column.tasks && column.tasks.length > 0) {
      // Move todas as tasks desta coluna para status 'pending' ou remove a referência
      for (const task of column.tasks) {
        task.status = 'pending';
        task.columnId = null;
        await this.taskRepository.save(task);
      }
    }

    await this.columnRepository.remove(column);
  }

  /**
   * Reordena colunas do usuário
   */
  async reorder(columnIds: string[], user: User): Promise<KanbanColumn[]> {
    const columns = await this.columnRepository.find({
      where: { userId: user.id }
    });

    // Atualiza ordem baseado na nova sequência
    for (let i = 0; i < columnIds.length; i++) {
      const column = columns.find(c => c.id === columnIds[i]);
      if (column) {
        column.order = i;
        await this.columnRepository.save(column);
      }
    }

    return this.findAll(user);
  }
}