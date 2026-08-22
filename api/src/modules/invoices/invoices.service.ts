import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InvoiceStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateInvoiceDto,
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

    if (dto.appointmentId) {
      const appointment =
        await this.prisma.appointment.findUnique({
          where: {
            id: dto.appointmentId,
          },
        });

      if (!appointment) {
        throw new NotFoundException(
          'Appointment not found.',
        );
      }
    }

    if (dto.encounterId) {
      const encounter =
        await this.prisma.encounter.findUnique({
          where: {
            id: dto.encounterId,
          },
        });

      if (!encounter) {
        throw new NotFoundException(
          'Encounter not found.',
        );
      }
    }

    const existing =
      await this.prisma.invoice.findUnique({
        where: {
          invoiceNumber:
            dto.invoiceNumber.trim(),
        },
      });

    if (existing) {
      throw new ConflictException(
        'Invoice number already exists.',
      );
    }

    return this.prisma.invoice.create({
      data: {
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        encounterId: dto.encounterId,
        invoiceNumber:
          dto.invoiceNumber.trim(),
        type: dto.type,
        status:
          dto.status ??
          InvoiceStatus.DRAFT,
        currency:
          dto.currency?.trim() ??
          'ZAR',
        subtotal: new Prisma.Decimal(
          dto.subtotal,
        ),
        discount: new Prisma.Decimal(
          dto.discount ?? '0',
        ),
        tax: new Prisma.Decimal(
          dto.tax ?? '0',
        ),
        total: new Prisma.Decimal(
          dto.total,
        ),
        amountPaid:
          new Prisma.Decimal(
            dto.amountPaid ?? '0',
          ),
        balance:
          new Prisma.Decimal(
            dto.balance ??
              dto.total,
          ),
        dueDate: dto.dueDate
          ? new Date(dto.dueDate)
          : undefined,
        paidAt: dto.paidAt
          ? new Date(dto.paidAt)
          : undefined,
        notes: dto.notes?.trim(),
      },

      include: {
        patient: true,
        appointment: true,
        encounter: true,
        items: true,
        payments: true,
        history: true,
        claim: true,
        creditNotes: true,
        debitNotes: true,
        adjustments: true,
        allocations: true,
      },
    });
  }

  async findAll(
    query: QueryInvoiceDto,
  ) {
    const {
      page = 1,
      limit = 20,
      patientId,
      status,
      type,
      search,
    } = query;

    const where: Prisma.InvoiceWhereInput =
      {};

    if (patientId) {
      where.patientId =
        patientId;
    }

    if (status) {
      where.status =
        status;
    }

    if (type) {
      where.type =
        type;
    }

    if (search) {
      where.OR = [
        {
          invoiceNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          notes: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.invoice.findMany({
          where,          include: {
            patient: true,
            appointment: true,
            encounter: true,
            items: true,
            payments: true,
            history: true,
            claim: true,
            creditNotes: true,
            debitNotes: true,
            adjustments: true,
            allocations: true,
          },

          orderBy: {
            issueDate: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.invoice.count({
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

  async findOne(
    id: string,
  ) {
    const invoice =
      await this.prisma.invoice.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          appointment: true,
          encounter: true,
          items: true,
          payments: true,
          history: true,
          claim: true,
          creditNotes: true,
          debitNotes: true,
          adjustments: true,
          allocations: true,
        },
      });

    if (!invoice) {
      throw new NotFoundException(
        'Invoice not found.',
      );
    }

    return invoice;
  }

  async update(
    id: string,
    dto: UpdateInvoiceDto,
  ) {
    await this.findOne(id);

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

    if (dto.appointmentId) {
      const appointment =
        await this.prisma.appointment.findUnique({
          where: {
            id: dto.appointmentId,
          },
        });

      if (!appointment) {
        throw new NotFoundException(
          'Appointment not found.',
        );
      }
    }

    if (dto.encounterId) {
      const encounter =
        await this.prisma.encounter.findUnique({
          where: {
            id: dto.encounterId,
          },
        });

      if (!encounter) {
        throw new NotFoundException(
          'Encounter not found.',
        );
      }
    }

    if (dto.invoiceNumber) {
      const duplicate =
        await this.prisma.invoice.findFirst({
          where: {
            id: {
              not: id,
            },

            invoiceNumber:
              dto.invoiceNumber.trim(),
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'Invoice number already exists.',
        );
      }
    }

    return this.prisma.invoice.update({
      where: {
        id,
      },

      data: {
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        encounterId: dto.encounterId,
        invoiceNumber:
          dto.invoiceNumber?.trim(),
        type: dto.type,
        status: dto.status,
        currency: dto.currency?.trim(),
        subtotal:
          dto.subtotal !== undefined
            ? new Prisma.Decimal(
                dto.subtotal,
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
            : undefined,        amountPaid:
          dto.amountPaid !== undefined
            ? new Prisma.Decimal(
                dto.amountPaid,
              )
            : undefined,

        balance:
          dto.balance !== undefined
            ? new Prisma.Decimal(
                dto.balance,
              )
            : undefined,

        dueDate:
          dto.dueDate !== undefined
            ? new Date(dto.dueDate)
            : undefined,

        paidAt:
          dto.paidAt !== undefined
            ? new Date(dto.paidAt)
            : undefined,

        notes: dto.notes?.trim(),
      },

      include: {
        patient: true,
        appointment: true,
        encounter: true,
        items: true,
        payments: true,
        history: true,
        claim: true,
        creditNotes: true,
        debitNotes: true,
        adjustments: true,
        allocations: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.invoice.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Invoice deleted successfully.',
    };
  }
}