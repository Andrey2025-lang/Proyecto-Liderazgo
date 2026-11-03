import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'cliente@correo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Cliente123!' })
  @IsString()
  password: string;
}
