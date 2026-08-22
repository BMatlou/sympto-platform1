import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PaymentAllocationsController } from './payment-allocations.controller';
import { PaymentAllocationsService } from './payment-allocations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PaymentAllocationsController],
  providers: [PaymentAllocationsService],
  exports: [PaymentAllocationsService],
})
export class PaymentAllocationsModule {}