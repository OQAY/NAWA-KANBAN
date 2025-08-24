import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateTaskStatus1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Primeiro, atualizar todas as tasks com status 'testing' para 'pending'
    await queryRunner.query(`
      UPDATE tasks 
      SET status = 'pending' 
      WHERE status = 'testing'
    `);

    // Agora podemos alterar o enum com segurança
    await queryRunner.query(`
      ALTER TYPE tasks_status_enum RENAME TO tasks_status_enum_old;
    `);

    await queryRunner.query(`
      CREATE TYPE tasks_status_enum AS ENUM('to_do', 'pending', 'in_progress', 'done');
    `);

    await queryRunner.query(`
      ALTER TABLE tasks 
      ALTER COLUMN status 
      TYPE tasks_status_enum 
      USING status::text::tasks_status_enum;
    `);

    await queryRunner.query(`
      DROP TYPE tasks_status_enum_old;
    `);

    // Definir default para to_do
    await queryRunner.query(`
      ALTER TABLE tasks 
      ALTER COLUMN status 
      SET DEFAULT 'to_do';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter para o enum anterior
    await queryRunner.query(`
      ALTER TYPE tasks_status_enum RENAME TO tasks_status_enum_old;
    `);

    await queryRunner.query(`
      CREATE TYPE tasks_status_enum AS ENUM('pending', 'in_progress', 'testing', 'done');
    `);

    await queryRunner.query(`
      ALTER TABLE tasks 
      ALTER COLUMN status 
      TYPE tasks_status_enum 
      USING status::text::tasks_status_enum;
    `);

    await queryRunner.query(`
      DROP TYPE tasks_status_enum_old;
    `);

    await queryRunner.query(`
      ALTER TABLE tasks 
      ALTER COLUMN status 
      SET DEFAULT 'pending';
    `);
  }
}