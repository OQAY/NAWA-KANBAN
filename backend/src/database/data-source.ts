import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from './entities/user.entity';
import { Task } from './entities/task.entity';
import { Project } from './entities/project.entity';
import { Comment } from './entities/comment.entity';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  synchronize: false, // Disable for migrations
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Task, Project, Comment],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
});