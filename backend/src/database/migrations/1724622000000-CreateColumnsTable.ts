import { MigrationInterface, QueryRunner, Table, ForeignKey } from 'typeorm';

export class CreateColumnsTable1724622000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela columns
    await queryRunner.createTable(
      new Table({
        name: 'columns',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'order',
            type: 'int',
            default: 0,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['standard', 'custom'],
            default: "'custom'",
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Adicionar foreign key para user_id
    await queryRunner.createForeignKey(
      'columns',
      new ForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Modificar tabela tasks para aceitar status dinâmico e adicionar column_id
    await queryRunner.changeColumn('tasks', 'status', {
      name: 'status',
      type: 'varchar',
      length: '50',
      default: "'pending'",
    });

    await queryRunner.addColumn('tasks', {
      name: 'column_id',
      type: 'uuid',
      isNullable: true,
    });

    // Adicionar foreign key para column_id (opcional)
    await queryRunner.createForeignKey(
      'tasks',
      new ForeignKey({
        columnNames: ['column_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'columns',
        onDelete: 'SET NULL',
      }),
    );

    console.log('Tabela columns criada e tasks atualizada para suportar colunas dinâmicas');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter mudanças na tabela tasks
    const tasksForeignKey = await queryRunner.getForeignKey('tasks', ['column_id']);
    if (tasksForeignKey) {
      await queryRunner.dropForeignKey('tasks', tasksForeignKey);
    }
    
    await queryRunner.dropColumn('tasks', 'column_id');
    
    // Reverter coluna status para enum
    await queryRunner.changeColumn('tasks', 'status', {
      name: 'status',
      type: 'enum',
      enum: ['pending', 'in_progress', 'testing', 'done'],
      default: "'pending'",
    });

    // Remover tabela columns
    await queryRunner.dropTable('columns');
  }
}