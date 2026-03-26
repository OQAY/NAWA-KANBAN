import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ description: 'User message text' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'Project ID for board context', required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
