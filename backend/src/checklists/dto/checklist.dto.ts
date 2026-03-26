import { IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChecklistDto {
  @ApiProperty({ example: 'Todo list' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;
}

export class CreateChecklistItemDto {
  @ApiProperty({ example: 'Write tests' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text: string;
}

export class UpdateChecklistItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
