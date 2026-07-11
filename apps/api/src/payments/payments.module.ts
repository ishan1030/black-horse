import { Module } from '@nestjs/common';
import { FonepayProvider } from './fonepay.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, FonepayProvider],
})
export class PaymentsModule {}
