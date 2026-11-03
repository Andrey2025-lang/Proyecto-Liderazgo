import { IsOptional, IsString } from 'class-validator';

export class AssignCollectorDto {
  @IsOptional()
  @IsString()
  collectorId?: string | null;
}
