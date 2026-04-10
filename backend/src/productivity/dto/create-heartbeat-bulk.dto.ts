import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min, Max, ValidateNested, ArrayMaxSize } from 'class-validator';

export class HeartbeatEventDto {
  @ApiProperty({ example: '2026-04-09T14:30:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-04-09T14:32:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ example: 120 })
  @IsInt()
  @Min(1)
  durationSeconds: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  isAfk: boolean;

  @ApiProperty({ example: 0, description: '0=none, 1=gota, 2=nudge, 3=pulsos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  alertLevel?: number;

  @ApiProperty({ example: 'Code.exe', required: false })
  @IsOptional()
  @IsString()
  appName?: string;

  @ApiProperty({ example: 'monitor.py - VSCode', required: false })
  @IsOptional()
  @IsString()
  windowTitle?: string;

  @ApiProperty({ example: 75, description: 'Focus score 0-100', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  focusScore?: number;

  @ApiProperty({ example: 2, description: 'Productivity category -2 to +2', required: false })
  @IsOptional()
  @IsInt()
  @Min(-2)
  @Max(2)
  productivityCategory?: number;

  @ApiProperty({ example: 'vivaldi.exe', description: 'Process emitting audio', required: false })
  @IsOptional()
  @IsString()
  audioSource?: string;

  @ApiProperty({ example: 45, description: 'Keystrokes per minute (privacy-safe count)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  keystrokeRate?: number;

  @ApiProperty({ example: false, description: 'Whisper STT was active', required: false })
  @IsOptional()
  @IsBoolean()
  whisperActive?: boolean;

  @ApiProperty({ example: 72, description: 'Composite work score 0-100', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  workScore?: number;
}

export class ClientMetadataDto {
  @ApiProperty({ example: 'desktop-01' })
  @IsOptional()
  @IsString()
  hostname?: string;

  @ApiProperty({ example: 'Windows 11' })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiProperty({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;
}

export class CreateHeartbeatBulkDto {
  @ApiProperty({ type: ClientMetadataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientMetadataDto)
  clientMetadata?: ClientMetadataDto;

  @ApiProperty({ type: [HeartbeatEventDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => HeartbeatEventDto)
  events: HeartbeatEventDto[];
}
