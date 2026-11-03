import { IsString, MinLength } from 'class-validator';
import { CreateApplicationDto } from './create-application.dto';

export class AssistedApplicationDto extends CreateApplicationDto {
  @IsString()
  @MinLength(1)
  clientId: string;
}
