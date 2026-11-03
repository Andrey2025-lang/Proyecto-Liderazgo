import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  IsInt,
} from 'class-validator';

export class ApproveApplicationDto {
  @ApiProperty({ example: 50000, description: 'Monto habilitado, no mayor al solicitado.' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10000000)
  approvedAmount: number;

  @ApiProperty({ example: 5, description: 'Interés total sobre el monto aprobado.' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  annualRate: number;

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

  @ApiProperty({ example: '2026-11-01' })
  @IsDateString()
  firstDueDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedCollectorId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
