import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { InvoiceCalculatorService } from '../billing/invoice-calculator/invoice-calculator.service';
import { PaymentAllocatorService } from '../billing/payment-allocator/payment-allocator.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceCalculator: InvoiceCalculatorService,
    private readonly paymentAllocator: PaymentAllocatorService,
  ) {}

  private readonly include =
    Prisma.validator<Prisma.PaymentInclude>()({
      invoice: true,
      receipt: true,
      allocations: true,
      refunds: true,
      cashTransactions: true,
    });

  async create(
    dto: CreatePaymentDto,
  ) {
    const invoice =
      await this.prisma.invoice.findUnique({
        where: {
          id: dto.invoiceId,
        },
      });

    if (!invoice) {
      throw new NotFoundException(
        'Invoice not found.',
      );
    }

    if (dto.receiptId) {
      const receipt =
        await this.prisma.receipt.findUnique({
          where: {
            id: dto.receiptId,
          },
        });

      if (!receipt) {
        throw new NotFoundException(
          'Receipt not found.',
        );
      }
    }

    return this.prisma.$transaction(
      async (tx) => {
        const payment =
          await tx.payment.create({
            data: {
              invoiceId: dto.invoiceId,
              receiptId: dto.receiptId,
              amount: new Prisma.Decimal(
                dto.amount,
              ),
              currency:
                dto.currency ?? 'ZAR',
              method: dto.method,
              status:
  dto.status ??
  PaymentStatus.PENDING,
              transactionReference:
                dto.transactionReference,
              gatewayReference:
                dto.gatewayReference,
              paidAt: dto.paidAt,
            },

            include: this.include,
          });

        await this.paymentAllocator.allocatePayment(
          tx,
          payment.id,
          payment.invoiceId,
          payment.amount,
        );

        await this.invoiceCalculator.recalculateInvoice(
          tx,
          payment.invoiceId,
        );

        return payment;
      },
    );
  }

    async findAll(
    query: QueryPaymentDto,
  ) {
    const {
      page,
      limit,
      invoiceId,
      receiptId,
      method,
      status,
    } = query;

    const where: Prisma.PaymentWhereInput = {
      ...(invoiceId && {
        invoiceId,
      }),

      ...(receiptId && {
        receiptId,
      }),

      ...(method && {
        method,
      }),

      ...(status && {
        status,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.payment.findMany({
          where,

          include: this.include,

          orderBy: {
            paidAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.payment.count({
          where,
        }),
      ]);

    return {
      data,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit,
          ),
      },
    };
  }

  async findOne(
    id: string,
  ) {
    const payment =
      await this.prisma.payment.findUnique({
        where: {
          id,
        },

        include: this.include,
      });

    if (!payment) {
      throw new NotFoundException(
        'Payment not found.',
      );
    }

    return payment;
  }

    async update(
    id: string,
    dto: UpdatePaymentDto,
  ) {
    const existing =
      await this.prisma.payment.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Payment not found.',
      );
    }

    if (
      dto.receiptId &&
      dto.receiptId !==
        existing.receiptId
    ) {
      const receipt =
        await this.prisma.receipt.findUnique({
          where: {
            id: dto.receiptId,
          },
        });

      if (!receipt) {
        throw new NotFoundException(
          'Receipt not found.',
        );
      }
    }

    return this.prisma.$transaction(
      async (tx) => {
        const payment =
          await tx.payment.update({
            where: {
              id,
            },

            data: {
              receiptId:
                dto.receiptId,
              amount: dto.amount
                ? new Prisma.Decimal(
                    dto.amount,
                  )
                : undefined,
              currency:
                dto.currency,
              method:
                dto.method,
              status:
                dto.status ??
                PaymentStatus.PENDING,
              transactionReference:
                dto.transactionReference,
              gatewayReference:
                dto.gatewayReference,
              paidAt:
                dto.paidAt,
            },

            include: this.include,
          });

        await this.paymentAllocator.allocatePayment(
          tx,
          payment.id,
          payment.invoiceId,
          payment.amount,
        );

        await this.invoiceCalculator.recalculateInvoice(
          tx,
          payment.invoiceId,
        );

        return payment;
      },
    );
  }

    async remove(
    id: string,
  ) {
    const payment =
      await this.prisma.payment.findUnique({
        where: {
          id,
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'Payment not found.',
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        await this.paymentAllocator.clearPaymentAllocations(
          tx,
          payment.id,
        );

        await tx.payment.delete({
          where: {
            id: payment.id,
          },
        });

        await this.invoiceCalculator.recalculateInvoice(
          tx,
          payment.invoiceId,
        );
      },
    );

    return {
      message:
        'Payment deleted successfully.',
    };
  }
}