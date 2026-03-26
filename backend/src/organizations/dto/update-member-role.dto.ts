import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({ example: 'member', enum: ['admin', 'member'] })
  @IsIn(['admin', 'member'])
  role: string;
}
