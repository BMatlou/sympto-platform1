import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AdjustmentType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { InvoiceCalculatorService } from '../billing/invoice-calculator/invoice-calculator.service';

import { CreateFinancialAdjustmentDto } from './dto/create-financial-adjustment.dto';
import { QueryFinancialAdjustmentDto } from './dto/query-financial-adjustment.dto';
import { UpdateFinancialAdjustmentDto } from './dto/update-financial-adjustment.dto';

@Injectable()
export class FinancialAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceCalculator: InvoiceCalculatorService,
  ) {}

  async create(
    dto: CreateFinancialAdjustmentDto,
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

    return this.prisma.$transaction(
      async (tx) => {
        const adjustment =
          await tx.financialAdjustment.create({
            data: {
              invoiceId:
                dto.invoiceId,
              type:
                dto.type,
              amount:
                new Prisma.Decimal(
                  dto.amount,
                ),
              reason:
                dto.reason,
            },

            include: {
              invoice: true,
            },
          });

        await this.invoiceCalculator.recalculateInvoice(
          tx,
          dto.invoiceId,
        );

        return adjustment;
      },
    );
  }

    async findAll(
    query: QueryFinancialAdjustmentDto,
  ) {
    const {
      page,
      limit,
      invoiceId,
      type,
    } = query;

    const where: Prisma.FinancialAdjustmentWhereInput = {
      ...(invoiceId && {
        invoiceId,
      }),

      ...(type && {
        type,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.financialAdjustment.findMany({
          where,

          include: {
            invoice: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.financialAdjustment.count({
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
    const adjustment =
      await this.prisma.financialAdjustment.findUnique({
        where: {
          id,
        },

        include: {
          invoice: true,
        },
      });

    if (!adjustment) {
      throw new NotFoundException(
        'Financial adjustment not found.',
      );
    }

    return adjustment;
  }

    async update(
    id: string,
    dto: UpdateFinancialAdjustmentDto,
  ) {
    const existing =
      await this.prisma.financialAdjustment.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Financial adjustment not found.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const adjustment =
          await tx.financialAdjustment.update({
            where: {
              id,
            },

            data: {
              type: dto.type,
              amount: dto.amount
                ? new Prisma.Decimal(
                    dto.amount,
                  )
                : undefined,
              reason: dto.reason,
            },

            include: {
              invoice: true,
            },
          });

        await this.invoiceCalculator.recalculateInvoice(
          tx,
          adjustment.invoiceId,
        );

        return adjustment;
      },
    );
  }

  async remove(
    id: string,
  ) {
    const adjustment =
      await this.prisma.financialAdjustment.findUnique({
        where: {
          id,
        },
      });

    if (!adjustment) {
      throw new NotFoundException(
        'Financial adjustment not found.',
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        await tx.financialAdjustment.delete({
          where: {
            id,
          },
        });

        await this.invoiceCalculator.recalculateInvoice(
          tx,
          adjustment.invoiceId,
        );
      },
    );

    return {
      message:
        'Financial adjustment deleted successfully.',
    };
  }
}