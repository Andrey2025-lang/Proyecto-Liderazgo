import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DisburseLoanDto {
  @IsOptional()
  @IsString()
  listoRecaudoLoanId?: string;

  @IsOptional()
  @IsString()
  assignedCollectorId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedRenewalPayoff?: number;
}
