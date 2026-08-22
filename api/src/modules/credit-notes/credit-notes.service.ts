import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { InvoiceCalculatorService } from '../billing/invoice-calculator/invoice-calculator.service';

import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { QueryCreditNoteDto } from './dto/query-credit-note.dto';
import { UpdateCreditNoteDto } from './dto/update-credit-note.dto';

@Injectable()
export class CreditNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceCalculator: InvoiceCalculatorService,
  ) {}

  async create(
    dto: CreateCreditNoteDto,
  ) {
    const invoice =
      await this.prisma.invoice.findUnique({
        where: {
          id: dto.invoiceId,
        },

        include: {
          creditNotes: true,
        },
      });

    if (!invoice) {
      throw new NotFoundException(
        'Invoice not found.',
      );
    }

    const creditTotal =
      invoice.creditNotes.reduce(
        (sum, note) =>
          sum.plus(note.amount),
        new Prisma.Decimal(0),
      );

    const requested =
      new Prisma.Decimal(dto.amount);

    if (
      creditTotal
        .plus(requested)
        .gt(invoice.total)
    ) {
      throw new ConflictException(
        'Credit exceeds invoice total.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const creditNote =
          await tx.creditNote.create({
            data: {
              invoiceId:
                dto.invoiceId,
              amount:
                requested,
              reason:
                dto.reason,
              issuedAt:
                dto.issuedAt,
            },
          });

        await this.invoiceCalculator.recalculateInvoice(
          tx,
          dto.invoiceId,
        );

        return creditNote;
      },
    );
  }

    async findAll(
    query: QueryCreditNoteDto,
  ) {
    const {
      page,
      limit,
      invoiceId,
      issuedFrom,
      issuedTo,
    } = query;

    const where: Prisma.CreditNoteWhereInput = {
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
        this.prisma.creditNote.findMany({
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

        this.prisma.creditNote.count({
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
    const creditNote =
      await this.prisma.creditNote.findUnique({
        where: {
          id,
        },

        include: {
          invoice: true,
        },
      });

    if (!creditNote) {
      throw new NotFoundException(
        'Credit note not found.',
      );
    }

    return creditNote;
  }

    async update(
    id: string,
    dto: UpdateCreditNoteDto,
  ) {
    const existing =
      await this.prisma.creditNote.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Credit note not found.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const creditNote =
          await tx.creditNote.update({
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
          creditNote.invoiceId,
        );

        return creditNote;
      },
    );
  }

  async remove(
    id: string,
  ) {
    const creditNote =
      await this.prisma.creditNote.findUnique({
        where: {
          id,
        },
      });

    if (!creditNote) {
      throw new NotFoundException(
        'Credit note not found.',
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        await tx.creditNote.delete({
          where: {
            id,
          },
        });

        await this.invoiceCalculator.recalculateInvoice(
          tx,
          creditNote.invoiceId,
        );
      },
    );

    return {
      message:
        'Credit note deleted successfully.',
    };
  }
}