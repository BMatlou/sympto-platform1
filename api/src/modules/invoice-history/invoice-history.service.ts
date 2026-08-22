import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateInvoiceHistoryDto } from './dto/create-invoice-history.dto';
import { UpdateInvoiceHistoryDto } from './dto/update-invoice-history.dto';
import { QueryInvoiceHistoryDto } from './dto/query-invoice-history.dto';

@Injectable()
export class InvoiceHistoryService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateInvoiceHistoryDto,
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

    return this.prisma.invoiceHistory.create({
      data: {
        invoiceId: dto.invoiceId,
        status: dto.status,
        notes: dto.notes?.trim(),
      },

      include: {
        invoice: true,
      },
    });
  }

  async findAll(
    query: QueryInvoiceHistoryDto,
  ) {
    const {
      page,
      limit,
      invoiceId,
      status,
    } = query;

    const where: Prisma.InvoiceHistoryWhereInput =
      {};

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    if (status) {
      where.status = status;
    }

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.invoiceHistory.findMany({
          where,

          include: {
            invoice: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.invoiceHistory.count({
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
    const history =
      await this.prisma.invoiceHistory.findUnique({
        where: {
          id,
        },

        include: {
          invoice: true,
        },
      });

    if (!history) {
      throw new NotFoundException(
        'Invoice history not found.',
      );
    }

    return history;
  }

  async update(
    id: string,
    dto: UpdateInvoiceHistoryDto,
  ) {
    await this.findOne(id);

    return this.prisma.invoiceHistory.update({
      where: {
        id,
      },

      data: {
        status: dto.status,
        notes: dto.notes?.trim(),
      },

      include: {
        invoice: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.invoiceHistory.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Invoice history deleted successfully.',
    };
  }
}