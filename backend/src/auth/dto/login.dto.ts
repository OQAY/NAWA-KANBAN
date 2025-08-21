import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ 
    example: 'user@example.com', 
    description: 'Email or username for login'
  })
  @IsString()
  email: string; // Mantendo nome 'email' para compatibilidade, mas aceita email OU nome

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}