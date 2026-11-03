import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'María Rodríguez' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'supervisor@jyc.cr' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Super123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '8888-8888', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'CLERK', enum: ['ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK'] })
  @IsIn(['ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK'])
  role: string;
}
