import { IsOptional, IsString } from 'class-validator';

export class AssignLoanDto {
  @IsOptional()
  @IsString()
  collectorId?: string | null;
}
