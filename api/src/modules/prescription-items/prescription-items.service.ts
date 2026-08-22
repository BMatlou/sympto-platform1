import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreatePrescriptionItemDto } from './dto/create-prescription-item.dto';
import { UpdatePrescriptionItemDto } from './dto/update-prescription-item.dto';
import { QueryPrescriptionItemDto } from './dto/query-prescription-item.dto';

@Injectable()
export class PrescriptionItemsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePrescriptionItemDto,
  ) {
    const [
      prescription,
      medication,
    ] = await this.prisma.$transaction([
      this.prisma.prescription.findUnique({
        where: {
          id: dto.prescriptionId,
        },
      }),

      this.prisma.medication.findUnique({
        where: {
          id: dto.medicationId,
        },
      }),
    ]);

    if (!prescription) {
      throw new NotFoundException(
        'Prescription not found.',
      );
    }

    if (!medication) {
      throw new NotFoundException(
        'Medication not found.',
      );
    }

    return this.prisma.prescriptionItem.create({
      data: {
        prescriptionId: dto.prescriptionId,
        medicationId: dto.medicationId,
        dosage: dto.dosage,
        frequency: dto.frequency,
        route: dto.route,
        durationDays: dto.durationDays,
        quantity: dto.quantity,
        refills: dto.refills,
        instructions: dto.instructions,
      },

      include: {
        medication: true,
        prescription: true,
        dispensations: true,
      },
    });
  }

  async findAll(
    query: QueryPrescriptionItemDto,
  ) {
    const {
      page,
      limit,
      prescriptionId,
    } = query;

    const where = prescriptionId
      ? {
          prescriptionId,
        }
      : {};

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.prescriptionItem.findMany({
          where,

          include: {
            medication: true,
            prescription: true,
            dispensations: true,
          },

          orderBy: {
            id: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.prescriptionItem.count({
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
      await this.prisma.prescriptionItem.findUnique({
        where: {
          id,
        },

        include: {
          medication: true,
          prescription: true,
          dispensations: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Prescription item not found.',
      );
    }

    return item;
  }

  async update(
    id: string,
    dto: UpdatePrescriptionItemDto,
  ) {
    await this.findOne(id);

    return this.prisma.prescriptionItem.update({
      where: {
        id,
      },

      data: {
        prescriptionId: dto.prescriptionId,
        medicationId: dto.medicationId,
        dosage: dto.dosage,
        frequency: dto.frequency,
        route: dto.route,
        durationDays: dto.durationDays,
        quantity: dto.quantity,
        refills: dto.refills,
        instructions: dto.instructions,
      },

      include: {
        medication: true,
        prescription: true,
        dispensations: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.prescriptionItem.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Prescription item deleted successfully.',
    };
  }
}