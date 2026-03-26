import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, Matches } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Kanban Board Project' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'A project to manage tasks using Kanban methodology', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'uuid-organization-id', required: false })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ example: '#38BDF8', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color (e.g. #38BDF8)' })
  color?: string;
}