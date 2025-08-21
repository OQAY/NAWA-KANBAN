import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum, IsInt, IsDateString } from 'class-validator';
import { TaskStatus } from '../../database/entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement user authentication' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Add JWT authentication to the API', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TaskStatus, default: TaskStatus.PENDING, required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus = TaskStatus.PENDING;

  @ApiProperty({ example: 'uuid-project-id' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: 'uuid-user-id', required: false })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiProperty({ example: 1, default: 0, required: false })
  @IsOptional()
  @IsInt()
  priority?: number = 0;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}