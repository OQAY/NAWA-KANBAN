import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class QueryAnalyticsDto {
  @ApiProperty({ example: '2026-04-01', required: false, description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ example: '2026-04-09', required: false, description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreatePomodoroDto {
  @ApiProperty({ example: 'Implementar API de produtividade', required: false })
  @IsOptional()
  taskName?: string;

  @ApiProperty({ example: 5400, description: 'Planned duration in seconds (e.g. 5400 = 90min)' })
  @IsInt()
  @Min(1)
  plannedDurationSeconds: number;

  @ApiProperty({ example: 5100 })
  @IsInt()
  @Min(0)
  actualDurationSeconds: number;

  @ApiProperty({ example: 'completed', enum: ['completed', 'interrupted', 'abandoned', 'auto_paused'] })
  @IsIn(['completed', 'interrupted', 'abandoned', 'auto_paused'])
  status: string;

  @ApiProperty({ example: '2026-04-09T14:00:00.000Z' })
  @IsDateString()
  startedAt: string;

  @ApiProperty({ example: '2026-04-09T15:30:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  interruptionCount?: number;

  @ApiProperty({ example: 300, required: false, description: 'AFK time during session in seconds' })
  @IsOptional()
  @IsInt()
  afkTimeSeconds?: number;
}
