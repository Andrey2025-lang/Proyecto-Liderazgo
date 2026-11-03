import { IsIn } from 'class-validator';

export class UpdateStatusDto {
  @IsIn(['ACTIVE', 'INACTIVE'])
  status: string;
}
