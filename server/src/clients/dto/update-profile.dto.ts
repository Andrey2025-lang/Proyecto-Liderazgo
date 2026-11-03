import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, example: '1995-05-18' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, example: 'Nicoya' })
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

  @ApiProperty({ required: false, example: '2021-03-01' })
  @IsOptional()
  @IsDateString()
  employmentStartDate?: string;

  @ApiProperty({ required: false, example: 450000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyIncome?: number;

  @ApiProperty({ required: false, example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherIncome?: number;
}
