import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateDispensationDto } from './dto/create-dispensation.dto';
import { QueryDispensationDto } from './dto/query-dispensation.dto';
import { UpdateDispensationDto } from './dto/update-dispensation.dto';

@Injectable()
export class DispensationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateDispensationDto) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: {
        id: dto.pharmacyId,
      },
    });

    if (!pharmacy) {
      throw new NotFoundException(
        'Pharmacy not found.',
      );
    }

    const prescriptionItem =
      await this.prisma.prescriptionItem.findUnique({
        where: {
          id: dto.prescriptionItemId,
        },
      });

    if (!prescriptionItem) {
      throw new NotFoundException(
        'Prescription item not found.',
      );
    }

    return this.prisma.dispensation.create({
      data: {
        pharmacyId: dto.pharmacyId,
        prescriptionItemId: dto.prescriptionItemId,
        quantity: dto.quantity,
        batchNumber: dto.batchNumber?.trim(),
        expiryDate: dto.expiryDate
          ? new Date(dto.expiryDate)
          : undefined,
        pharmacistName: dto.pharmacistName?.trim(),
        notes: dto.notes?.trim(),
      },

      include: {
        pharmacy: true,
        prescriptionItem: true,
      },
    });
  }

  async findAll(query: QueryDispensationDto) {
    const {
      page = 1,
      limit = 20,
      pharmacyId,
      prescriptionItemId,
    } = query;

    const where: Prisma.DispensationWhereInput = {};

    if (pharmacyId) {
      where.pharmacyId = pharmacyId;
    }

    if (prescriptionItemId) {
      where.prescriptionItemId = prescriptionItemId;
    }

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.dispensation.findMany({
          where,

          include: {
            pharmacy: true,
            prescriptionItem: true,
          },

          orderBy: {
            dispensedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.dispensation.count({
          where,
        }),
      ]);

    return {
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const dispensation =
      await this.prisma.dispensation.findUnique({
        where: {
          id,
        },

        include: {
          pharmacy: true,
          prescriptionItem: true,
        },
      });

    if (!dispensation) {
      throw new NotFoundException(
        'Dispensation not found.',
      );
    }

    return dispensation;
  }

  async update(
    id: string,
    dto: UpdateDispensationDto,
  ) {
    await this.findOne(id);

    return this.prisma.dispensation.update({
      where: {
        id,
      },

      data: {
        quantity: dto.quantity,
        batchNumber: dto.batchNumber?.trim(),
        expiryDate: dto.expiryDate
          ? new Date(dto.expiryDate)
          : undefined,
        pharmacistName: dto.pharmacistName?.trim(),
        notes: dto.notes?.trim(),
      },

      include: {
        pharmacy: true,
        prescriptionItem: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.dispensation.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Dispensation deleted successfully.',
    };
  }
}