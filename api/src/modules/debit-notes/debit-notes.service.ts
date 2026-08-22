import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { InvoiceCalculatorService } from '../billing/invoice-calculator/invoice-calculator.service';

import { CreateDebitNoteDto } from './dto/create-debit-note.dto';
import { QueryDebitNoteDto } from './dto/query-debit-note.dto';
import { UpdateDebitNoteDto } from './dto/update-debit-note.dto';

@Injectable()
export class DebitNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceCalculator: InvoiceCalculatorService,
  ) {}

  async create(
    dto: CreateDebitNoteDto,
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
        const debitNote =
          await tx.debitNote.create({
            data: {
              invoiceId:
                dto.invoiceId,
              amount:
                new Prisma.Decimal(
                  dto.amount,
                ),
              reason:
                dto.reason,
              issuedAt:
                dto.issuedAt,
            },

            include: {
              invoice: true,
            },
          });

        await this.invoiceCalculator.recalculateInvoice(
          tx,
          dto.invoiceId,
        );

        return debitNote;
      },
    );
  }

    async findAll(
    query: QueryDebitNoteDto,
  ) {
    const {
      page,
      limit,
      invoiceId,
      issuedFrom,
      issuedTo,
    } = query;

    const where: Prisma.DebitNoteWhereInput = {
      ...(invoiceId && {
        invoiceId,
      }),

      ...((issuedFrom || issuedTo) && {
        issuedAt: {
          ...(issuedFrom && {
            gte: new Date(
              issuedFrom,
            ),
          }),

          ...(issuedTo && {
            lte: new Date(
              issuedTo,
            ),
          }),
        },
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.debitNote.findMany({
          where,

          include: {
            invoice: true,
          },

          orderBy: {
            issuedAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.debitNote.count({
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
    const debitNote =
      await this.prisma.debitNote.findUnique({
        where: {
          id,
        },

        include: {
          invoice: true,
        },
      });

    if (!debitNote) {
      throw new NotFoundException(
        'Debit note not found.',
      );
    }

    return debitNote;
  }

    async update(
    id: string,
    dto: UpdateDebitNoteDto,
  ) {
    const existing =
      await this.prisma.debitNote.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Debit note not found.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const debitNote =
          await tx.debitNote.update({
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
              issuedAt:
                dto.issuedAt,
            },

            include: {
              invoice: true,
            },
          });

        await this.invoiceCalculator.recalculateInvoice(
          tx,
          debitNote.invoiceId,
        );

        return debitNote;
      },
    );
  }

  async remove(
    id: string,
  ) {
    const debitNote =
      await this.prisma.debitNote.findUnique({
        where: {
          id,
        },
      });

    if (!debitNote) {
      throw new NotFoundException(
        'Debit note not found.',
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        await tx.debitNote.delete({
          where: {
            id,
          },
        });

        await this.invoiceCalculator.recalculateInvoice(
          tx,
          debitNote.invoiceId,
        );
      },
    );

    return {
      message:
        'Debit note deleted successfully.',
    };
  }
}