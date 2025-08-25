import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateBoardConfigDto {
  @ApiProperty({ 
    description: 'JSON string containing the user\'s kanban board configuration',
    example: '{"columns":[{"id":"pending","status":"pending","label":"Pendente","type":"dynamic","order":0}]}'
  })
  @IsString()
  boardConfig: string;
}