import { PartialType } from '@nestjs/swagger';
import { CreateColumnDto } from './create-column.dto';
import { IsOptional, IsInt, Min } from 'class-validator';

export class UpdateColumnDto extends PartialType(CreateColumnDto) {
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}