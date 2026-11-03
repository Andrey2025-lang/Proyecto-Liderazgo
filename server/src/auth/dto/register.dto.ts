import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MinLength, MaxLength, NotEquals } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ example: 'Ana Mora' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'ana@correo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Cliente123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '8888-8888', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '5-0456-0789' })
  @IsString()
  @Matches(/^\d-\d{4}-\d{4}$/, {
    message: 'La cédula debe tener el formato 1-2345-6789.',
  })
  cedula: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @NotEquals('Otra zona', { message: 'Especificá el nombre de la zona.' })
  community?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  occupation?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  acceptPrivacy: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  acceptEquifax?: boolean;
}
