import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateIdleResolutionDto {
  @ApiProperty({ example: '2026-04-10T11:00:00.000Z' })
  @IsDateString()
  idleStartedAt: string;

  @ApiProperty({ example: '2026-04-10T11:15:00.000Z' })
  @IsDateString()
  idleEndedAt: string;

  @ApiProperty({ example: 900 })
  @IsInt()
  @Min(0)
  durationSeconds: number;

  @ApiProperty({ example: 'break', enum: ['away_working', 'break', 'procrastinating', 'discarded'] })
  @IsIn(['away_working', 'break', 'procrastinating', 'discarded'])
  resolution: string;

  @ApiProperty({ example: 'Preparei café e fui ao banheiro', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
