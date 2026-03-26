import { IsString, IsNotEmpty, MaxLength, Matches, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLabelDto {
  @ApiProperty({ example: 'Bug' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: '#ef4444' })
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Color must be a hex color (e.g. #ef4444)' })
  color: string;

  @ApiProperty()
  @IsUUID()
  projectId: string;
}
