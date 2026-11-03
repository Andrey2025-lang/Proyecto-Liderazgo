import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 25000 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: '2026-10-20', required: false })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiProperty({ example: 'CASH', enum: ['CASH', 'TRANSFER', 'SINPE', 'DEPOSIT', 'OTHER'] })
  @IsIn(['CASH', 'TRANSFER', 'SINPE', 'DEPOSIT', 'OTHER'])
  method: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  listoRecaudoReceipt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
