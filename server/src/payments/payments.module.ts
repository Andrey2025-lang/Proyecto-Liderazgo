import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { LoansModule } from '../loans/loans.module';

@Module({
  imports: [LoansModule],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
