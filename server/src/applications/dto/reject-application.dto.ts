import { IsString, MinLength } from 'class-validator';

export class RejectApplicationDto {
  @IsString()
  @MinLength(5)
  reason: string;
}
