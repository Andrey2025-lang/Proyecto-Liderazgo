import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewApplicationDto {
  @IsIn(['UNDER_REVIEW', 'INFO_REQUESTED'])
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
