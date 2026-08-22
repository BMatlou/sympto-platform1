import { Injectable } from '@nestjs/common';
import {
  AdjustmentType,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class InvoiceCalculatorService {
  async recalculateInvoice(
    tx: Prisma.TransactionClient,
    invoiceId: string,
  ): Promise<void> {
    const invoice = await tx.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      include: {
        payments: true,
        creditNotes: true,
        debitNotes: true,
        adjustments: true,
      },
    });

    if (!invoice) {
      return;
    }

    const zero = new Prisma.Decimal(0);

    const paymentTotal = invoice.payments.reduce(
      (sum, payment) => sum.plus(payment.amount),
      zero,
    );

    const creditTotal = invoice.creditNotes.reduce(
      (sum, note) => sum.plus(note.amount),
      zero,
    );

    const debitTotal = invoice.debitNotes.reduce(
      (sum, note) => sum.plus(note.amount),
      zero,
    );

    const adjustmentTotal = invoice.adjustments.reduce(
      (sum, adjustment) => {
        switch (adjustment.type) {
          case AdjustmentType.PENALTY:
          case AdjustmentType.TAX:
            return sum.plus(adjustment.amount);

          case AdjustmentType.DISCOUNT:
          case AdjustmentType.WRITE_OFF:
          case AdjustmentType.CREDIT:
            return sum.minus(adjustment.amount);

          default:
            return sum;
        }
      },
      zero,
    );

    // Base invoice total
    const baseTotal = invoice.subtotal
      .minus(invoice.discount)
      .plus(invoice.tax);

    // Final total after adjustments
    const total = baseTotal
      .minus(creditTotal)
      .plus(debitTotal)
      .plus(adjustmentTotal);

    const balance = total.minus(paymentTotal);

    let status = invoice.status;

    if (balance.lte(0)) {
      status = InvoiceStatus.PAID;
    } else if (paymentTotal.gt(0)) {
      status = InvoiceStatus.PARTIALLY_PAID;
    } else if (invoice.status !== InvoiceStatus.DRAFT) {
      status = InvoiceStatus.ISSUED;
    }

    await tx.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        total,
        amountPaid: paymentTotal,
        balance,
        status,
      },
    });
  }
}