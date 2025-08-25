import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsInt, IsDateString, Min, Max } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement user authentication' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Add JWT authentication to the API', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'pending', default: 'pending', required: false })
  @IsOptional()
  @IsString()
  status?: string = 'pending';

  @ApiProperty({ example: 'uuid-project-id' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: 'uuid-user-id', required: false })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiProperty({ example: 1, default: 0, required: false, minimum: 0, maximum: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  priority?: number = 0;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}