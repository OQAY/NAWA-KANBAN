import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

export class CreateColumnDto {
  @ApiProperty({ example: 'Em Revisão' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  name: string;

  @ApiProperty({ example: 'review' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Status must contain only lowercase letters, numbers and underscores'
  })
  @Length(1, 30)
  status: string;
}