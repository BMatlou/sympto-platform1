import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { InvoiceCalculatorService } from './invoice-calculator/invoice-calculator.service';
import { InvoiceNumberService } from './invoice-number/invoice-number.service';
import { PaymentAllocatorService } from './payment-allocator/payment-allocator.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    InvoiceCalculatorService,
    InvoiceNumberService,
    PaymentAllocatorService,
  ],
  exports: [
    InvoiceCalculatorService,
    InvoiceNumberService,
    PaymentAllocatorService,
  ],
})
export class BillingModule {}