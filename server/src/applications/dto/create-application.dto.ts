import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  IsInt,
  Max,
} from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ example: 50000, description: 'Uno de los montos habilitados en configuración.' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10000000)
  amountRequested: number;

  @ApiProperty({ example: 8, description: 'Plazo en semanas dentro del rango configurado.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(104)
  termWeeks: number;

  @ApiProperty({ example: 8, description: 'Cantidad de cuotas según semanas y frecuencia.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(104)
  termInstallments: number;

  @ApiProperty({ example: 'WEEKLY', enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] })
  @IsIn(['WEEKLY', 'BIWEEKLY', 'MONTHLY'])
  paymentFrequency: string;

  @ApiProperty({ example: 'Capital de trabajo', required: false })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiProperty({ example: 'Ana Mora' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '8888-8888' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '5-0456-0789' })
  @Matches(/^\d-\d{4}-\d{4}$/, {
    message: 'La cédula debe tener el formato 1-2345-6789.',
  })
  cedula: string;

  @ApiProperty({ example: '1995-05-18', required: false })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Nicoya', required: false })
  @IsOptional()
  @IsString()
  community?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  employer?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  employmentStartDate?: string;

  @ApiProperty({ example: 450000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyIncome?: number;

  @ApiProperty({ example: 50000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherIncome?: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  acceptPrivacy: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  acceptEquifax: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  saveAsDraft?: boolean;

  @IsOptional()
  @IsString()
  renewalOfLoanId?: string;
}
