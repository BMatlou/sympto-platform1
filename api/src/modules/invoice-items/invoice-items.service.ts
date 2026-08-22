import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateInvoiceItemDto } from './dto/create-invoice-item.dto';
import { UpdateInvoiceItemDto } from './dto/update-invoice-item.dto';
import { QueryInvoiceItemDto } from './dto/query-invoice-item.dto';

@Injectable()
export class InvoiceItemsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateInvoiceItemDto,
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

    return this.prisma.invoiceItem.create({
      data: {
        invoiceId: dto.invoiceId,
        description: dto.description,
        quantity: new Prisma.Decimal(
          dto.quantity,
        ),
        unitPrice: new Prisma.Decimal(
          dto.unitPrice,
        ),
        discount: new Prisma.Decimal(
          dto.discount,
        ),
        tax: new Prisma.Decimal(
          dto.tax,
        ),
        total: new Prisma.Decimal(
          dto.total,
        ),
      },

      include: {
        invoice: true,
      },
    });
  }

  async findAll(
    query: QueryInvoiceItemDto,
  ) {
    const {
      page,
      limit,
      invoiceId,
    } = query;

    const where: Prisma.InvoiceItemWhereInput =
      {
        ...(invoiceId && {
          invoiceId,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.invoiceItem.findMany({
          where,

          include: {
            invoice: true,
          },

          orderBy: {
            description: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.invoiceItem.count({
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
    const item =
      await this.prisma.invoiceItem.findUnique({
        where: {
          id,
        },

        include: {
          invoice: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Invoice item not found.',
      );
    }

    return item;
  }

  async update(
    id: string,
    dto: UpdateInvoiceItemDto,
  ) {
    await this.findOne(id);

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

    return this.prisma.invoiceItem.update({
      where: {
        id,
      },

      data: {
        invoiceId: dto.invoiceId,
        description: dto.description,
        quantity:
          dto.quantity !== undefined
            ? new Prisma.Decimal(
                dto.quantity,
              )
            : undefined,
        unitPrice:
          dto.unitPrice !== undefined
            ? new Prisma.Decimal(
                dto.unitPrice,
              )
            : undefined,
        discount:
          dto.discount !== undefined
            ? new Prisma.Decimal(
                dto.discount,
              )
            : undefined,
        tax:
          dto.tax !== undefined
            ? new Prisma.Decimal(
                dto.tax,
              )
            : undefined,
        total:
          dto.total !== undefined
            ? new Prisma.Decimal(
                dto.total,
              )
            : undefined,
      },

      include: {
        invoice: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.invoiceItem.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Invoice item deleted successfully.',
    };
  }
}