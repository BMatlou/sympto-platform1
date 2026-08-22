import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePaymentAllocationDto } from './dto/create-payment-allocation.dto';
import { UpdatePaymentAllocationDto } from './dto/update-payment-allocation.dto';
import { QueryPaymentAllocationDto } from './dto/query-payment-allocation.dto';

@Injectable()
export class PaymentAllocationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePaymentAllocationDto,
  ) {
    const payment =
      await this.prisma.payment.findUnique({
        where: {
          id: dto.paymentId,
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'Payment not found.',
      );
    }

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

    return this.prisma.paymentAllocation.create({
      data: {
        paymentId: dto.paymentId,
        invoiceId: dto.invoiceId,
        amount: new Prisma.Decimal(
          dto.amount,
        ),
      },

      include: {
        payment: true,
        invoice: true,
      },
    });
  }

  async findAll(
    query: QueryPaymentAllocationDto,
  ) {
    const {
      page,
      limit,
      paymentId,
      invoiceId,
    } = query;

    const where: Prisma.PaymentAllocationWhereInput =
      {
        ...(paymentId && {
          paymentId,
        }),

        ...(invoiceId && {
          invoiceId,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.paymentAllocation.findMany({
          where,

          include: {
            payment: true,
            invoice: true,
          },

          orderBy: {
            id: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.paymentAllocation.count({
          where,
        }),
      ]);

    return {
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit,
        ),
      },
    };
  }

  async findOne(id: string) {
    const allocation =
      await this.prisma.paymentAllocation.findUnique({
        where: {
          id,
        },

        include: {
          payment: true,
          invoice: true,
        },
      });

    if (!allocation) {
      throw new NotFoundException(
        'Payment allocation not found.',
      );
    }

    return allocation;
  }

  async update(
    id: string,
    dto: UpdatePaymentAllocationDto,
  ) {
    await this.findOne(id);

    if (dto.paymentId) {
      const payment =
        await this.prisma.payment.findUnique({
          where: {
            id: dto.paymentId,
          },
        });

      if (!payment) {
        throw new NotFoundException(
          'Payment not found.',
        );
      }
    }

    if (dto.invoiceId) {
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
    }

    return this.prisma.paymentAllocation.update({
      where: {
        id,
      },

      data: {
        paymentId: dto.paymentId,
        invoiceId: dto.invoiceId,
        amount:
          dto.amount !== undefined
            ? new Prisma.Decimal(
                dto.amount,
              )
            : undefined,
      },

      include: {
        payment: true,
        invoice: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.paymentAllocation.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Payment allocation deleted successfully.',
    };
  }
}