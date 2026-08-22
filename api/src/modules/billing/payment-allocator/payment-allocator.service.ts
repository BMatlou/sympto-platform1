import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentAllocatorService {
  /**
   * Allocates a payment to an invoice.
   *
   * Current implementation:
   * One payment → One invoice
   *
   * Future:
   * One payment → Multiple invoices
   */
  async allocatePayment(
    tx: Prisma.TransactionClient,
    paymentId: string,
    invoiceId: string,
    amount: Prisma.Decimal,
  ): Promise<void> {
    await tx.paymentAllocation.upsert({
      where: {
        paymentId_invoiceId: {
          paymentId,
          invoiceId,
        },
      },

      update: {
        amount,
      },

      create: {
        paymentId,
        invoiceId,
        amount,
      },
    });
  }

  /**
   * Removes all allocations for a payment.
   */
  async clearPaymentAllocations(
    tx: Prisma.TransactionClient,
    paymentId: string,
  ): Promise<void> {
    await tx.paymentAllocation.deleteMany({
      where: {
        paymentId,
      },
    });
  }
}