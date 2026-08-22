import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { InvoiceNumberService } from '../billing/invoice-number/invoice-number.service';

import { CreateReceiptDto } from './dto/create-receipt.dto';
import { QueryReceiptDto } from './dto/query-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceNumberService: InvoiceNumberService,
  ) {}

  private readonly include =
    Prisma.validator<Prisma.ReceiptInclude>()({
      patient: true,
      payments: true,
    });

  async create(
    dto: CreateReceiptDto,
  ) {
    const patient =
      await this.prisma.patient.findUnique({
        where: {
          id: dto.patientId,
        },
      });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

    const receiptNumber =
      this.invoiceNumberService.generateReceiptNumber();

    const existing =
      await this.prisma.receipt.findUnique({
        where: {
          receiptNumber,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Receipt number already exists.',
      );
    }

    return this.prisma.receipt.create({
      data: {
        receiptNumber,
        patientId: dto.patientId,
        issuedAt: dto.issuedAt,
        total: new Prisma.Decimal(
          dto.total,
        ),
      },

      include: this.include,
    });
  }

    async findAll(
    query: QueryReceiptDto,
  ) {
    const {
      page,
      limit,
      patientId,
      receiptNumber,
      issuedFrom,
      issuedTo,
    } = query;

    const where: Prisma.ReceiptWhereInput = {
      ...(patientId && {
        patientId,
      }),

      ...(receiptNumber && {
        receiptNumber: {
          contains: receiptNumber,
          mode: 'insensitive',
        },
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
        this.prisma.receipt.findMany({
          where,

          include: this.include,

          orderBy: {
            issuedAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.receipt.count({
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
    const receipt =
      await this.prisma.receipt.findUnique({
        where: {
          id,
        },

        include: this.include,
      });

    if (!receipt) {
      throw new NotFoundException(
        'Receipt not found.',
      );
    }

    return receipt;
  }

    async update(
    id: string,
    dto: UpdateReceiptDto,
  ) {
    const receipt =
      await this.prisma.receipt.findUnique({
        where: {
          id,
        },
      });

    if (!receipt) {
      throw new NotFoundException(
        'Receipt not found.',
      );
    }

    if (dto.patientId) {
      const patient =
        await this.prisma.patient.findUnique({
          where: {
            id: dto.patientId,
          },
        });

      if (!patient) {
        throw new NotFoundException(
          'Patient not found.',
        );
      }
    }

    return this.prisma.receipt.update({
      where: {
        id,
      },

      data: {
        patientId: dto.patientId,
        issuedAt: dto.issuedAt,
        total: dto.total
          ? new Prisma.Decimal(
              dto.total,
            )
          : undefined,
      },

      include: this.include,
    });
  }

  async remove(
    id: string,
  ) {
    const receipt =
      await this.prisma.receipt.findUnique({
        where: {
          id,
        },
      });

    if (!receipt) {
      throw new NotFoundException(
        'Receipt not found.',
      );
    }

    const linkedPayments =
      await this.prisma.payment.count({
        where: {
          receiptId: id,
        },
      });

    if (linkedPayments > 0) {
      throw new ConflictException(
        'Cannot delete a receipt that has linked payments.',
      );
    }

    await this.prisma.receipt.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Receipt deleted successfully.',
    };
  }
}