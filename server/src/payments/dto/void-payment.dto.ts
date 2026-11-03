import { IsString, MinLength } from 'class-validator';

export class VoidPaymentDto {
  @IsString()
  @MinLength(5)
  reason: string;
}
