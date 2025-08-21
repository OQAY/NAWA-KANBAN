import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Esta tarefa precisa ser revisada antes da entrega' })
  @IsString()
  @IsNotEmpty()
  content: string;
}