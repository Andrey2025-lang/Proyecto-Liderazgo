import { IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsString() loanAmounts?: string;
  @IsOptional() @IsString() minAmount?: string;
  @IsOptional() @IsString() maxAmount?: string;
  @IsOptional() @IsString() annualRate?: string;
  @IsOptional() @IsString() minTerm?: string;
  @IsOptional() @IsString() maxTerm?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() contactPhone2?: string;
  @IsOptional() @IsString() contactPhone3?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() hours?: string;
  @IsOptional() @IsString() heroTitle?: string;
  @IsOptional() @IsString() heroSubtitle?: string;
  @IsOptional() @IsString() privacyVersion?: string;
}
