import { IsString, IsIn } from 'class-validator';

export class UpdateMemberDto {
  @IsString()
  @IsIn(['viewer', 'editor'])
  role: string;
}
