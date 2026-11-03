import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsInt, Min, Max, IsOptional } from 'class-validator';

export class SimulateDto {
  @ApiProperty({ example: 50000, description: 'Uno de los montos habilitados en configuración.' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10000000)
  amount: number;

  @ApiProperty({ example: 8, description: 'Cantidad de cuotas según semanas y frecuencia.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(104)
  termInstallments: number;

  @ApiProperty({ example: 'WEEKLY', enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] })
  @IsIn(['WEEKLY', 'BIWEEKLY', 'MONTHLY'])
  paymentFrequency: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(104)
  termWeeks?: number;
}
