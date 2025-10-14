import { IsEmail, IsString, IsIn } from 'class-validator';

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['viewer', 'editor'])
  role: string;
}
