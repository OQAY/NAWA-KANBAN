import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class TaskQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'pending' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'uuid-project-id' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ example: 'uuid-user-id' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}

export class MoveTaskDto {
  @ApiProperty({ example: 'uuid-new-project-id' })
  @IsUUID()
  projectId: string;
}