import { IsEmail, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddOrganizationMemberDto {
  @ApiProperty({ example: 'user@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'member', required: false, enum: ['admin', 'member'] })
  @IsOptional()
  @IsIn(['admin', 'member'])
  role?: string = 'member';
}
