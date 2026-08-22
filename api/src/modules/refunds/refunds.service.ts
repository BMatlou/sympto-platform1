import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { InvoiceCalculatorService } from '../billing/invoice-calculator/invoice-calculator.service';

import { CreateRefundDto } from './dto/create-refund.dto';
import { QueryRefundDto } from './dto/query-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceCalculator: InvoiceCalculatorService,
  ) {}

 private readonly include =
  Prisma.validator<Prisma.RefundInclude>()({
    payment: true,
  });

  async create(
    dto: CreateRefundDto,
  ) {
    const payment =
      await this.prisma.payment.findUnique({
        where: {
          id: dto.paymentId,
        },

        include: {
          refunds: true,
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'Payment not found.',
      );
    }

    const refunded =
      payment.refunds.reduce(
        (sum, refund) =>
          sum.plus(refund.amount),
        new Prisma.Decimal(0),
      );

    const requested =
      new Prisma.Decimal(dto.amount);

    if (
      refunded
        .plus(requested)
        .gt(payment.amount)
    ) {
      throw new ConflictException(
        'Refund exceeds payment amount.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const refund =
          await tx.refund.create({
            data: {
              paymentId:
                dto.paymentId,
              amount:
                requested,
              reason:
                dto.reason,
              refundedAt:
                dto.refundedAt,
            },

            include: {
            payment: true,
          },
          });

        await this.invoiceCalculator.recalculateInvoice(
          tx,
          payment.invoiceId,
        );

        return refund;
      },
    );
  }

  async findAll(
    query: QueryRefundDto,
  ) {
    const {
      page,
      limit,
      paymentId,
    } = query;

    const where: Prisma.RefundWhereInput = {
      ...(paymentId && {
        paymentId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.refund.findMany({
          where,

          include: {
          payment: true,
        },

          orderBy: {
            refundedAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.refund.count({
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
    const refund =
      await this.prisma.refund.findUnique({
        where: {
          id,
        },

        include: {
        payment: true,
        },
      });

    if (!refund) {
      throw new NotFoundException(
        'Refund not found.',
      );
    }

    return refund;
  }

    async update(
    id: string,
    dto: UpdateRefundDto,
  ) {
    const existing =
      await this.prisma.refund.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Refund not found.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const refund =
          await tx.refund.update({
            where: {
              id,
            },

            data: {
              amount: dto.amount
                ? new Prisma.Decimal(
                    dto.amount,
                  )
                : undefined,
              reason: dto.reason,
              refundedAt:
                dto.refundedAt,
            },

            include: {
            payment: true,
            },
          });

        const payment =
          await tx.payment.findUnique({
            where: {
              id: refund.paymentId,
            },
          });

        if (payment) {
          await this.invoiceCalculator.recalculateInvoice(
            tx,
            payment?.invoiceId,
          );
        }

        return refund;
      },
    );
  }

  async remove(
    id: string,
  ) {
    const refund =
      await this.prisma.refund.findUnique({
        where: {
          id,
        },

        include: {
          payment: true,
        },
      });

    if (!refund) {
      throw new NotFoundException(
        'Refund not found.',
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        await tx.refund.delete({
          where: {
            id,
          },
        });

        await this.invoiceCalculator.recalculateInvoice(
          tx,
          refund.payment.invoiceId,
        );
      },
    );

    return {
      message:
        'Refund deleted successfully.',
    };
  }
}