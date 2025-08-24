import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTaskStatusEnum1724521200000 implements MigrationInterface {
  name = 'FixTaskStatusEnum1724521200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting TaskStatus enum migration...');
    
    // Step 1: Update existing data from 'to_do' to 'pending'
    console.log('Step 1: Updating to_do tasks to pending...');
    await queryRunner.query(`
      UPDATE tasks 
      SET status = 'pending' 
      WHERE status = 'to_do'
    `);

    // Step 2: Drop the existing default value
    console.log('Step 2: Dropping default value...');
    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ALTER COLUMN "status" DROP DEFAULT
    `);

    // Step 3: Create new enum with correct values
    console.log('Step 3: Creating new enum...');
    await queryRunner.query(`
      CREATE TYPE "tasks_status_enum_new" AS ENUM('pending', 'in_progress', 'testing', 'done')
    `);

    // Step 4: Update the column to use the new enum (all existing data should map correctly)
    console.log('Step 4: Converting column to new enum...');
    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ALTER COLUMN "status" TYPE "tasks_status_enum_new" 
      USING status::text::"tasks_status_enum_new"
    `);

    // Step 5: Drop the old enum and rename the new one
    console.log('Step 5: Cleaning up old enum...');
    await queryRunner.query(`DROP TYPE "tasks_status_enum"`);
    await queryRunner.query(`ALTER TYPE "tasks_status_enum_new" RENAME TO "tasks_status_enum"`);

    // Step 6: Set default value for new records
    console.log('Step 6: Setting default value...');
    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ALTER COLUMN "status" SET DEFAULT 'pending'
    `);
    
    console.log('Migration completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Reverting TaskStatus enum migration...');
    
    // Update any 'testing' status to 'in_progress' before reverting
    await queryRunner.query(`
      UPDATE tasks 
      SET status = 'in_progress' 
      WHERE status = 'testing'
    `);

    // Revert to old enum structure
    await queryRunner.query(`
      CREATE TYPE "tasks_status_enum_old" AS ENUM('to_do', 'pending', 'in_progress', 'done')
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ALTER COLUMN "status" TYPE "tasks_status_enum_old" 
      USING status::text::"tasks_status_enum_old"
    `);

    await queryRunner.query(`DROP TYPE "tasks_status_enum"`);
    await queryRunner.query(`ALTER TYPE "tasks_status_enum_old" RENAME TO "tasks_status_enum"`);

    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ALTER COLUMN "status" SET DEFAULT 'to_do'
    `);
    
    console.log('Revert completed!');
  }
}