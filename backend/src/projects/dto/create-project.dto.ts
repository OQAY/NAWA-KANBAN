import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Kanban Board Project' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'A project to manage tasks using Kanban methodology', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}