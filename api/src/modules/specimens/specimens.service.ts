import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateSpecimenDto } from './dto/create-specimen.dto';
import { UpdateSpecimenDto } from './dto/update-specimen.dto';
import { QuerySpecimenDto } from './dto/query-specimen.dto';

@Injectable()
export class SpecimensService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateSpecimenDto,
  ) {
    const order =
      await this.prisma.labOrder.findUnique({
        where: {
          id: dto.orderId,
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Lab order not found.',
      );
    }

    const specimenType =
      await this.prisma.specimenType.findUnique({
        where: {
          id: dto.specimenTypeId,
        },
      });

    if (!specimenType) {
      throw new NotFoundException(
        'Specimen type not found.',
      );
    }

    if (dto.containerId) {
      const container =
        await this.prisma.specimenContainer.findUnique({
          where: {
            id: dto.containerId,
          },
        });

      if (!container) {
        throw new NotFoundException(
          'Specimen container not found.',
        );
      }
    }

    return this.prisma.specimen.create({
      data: {
        orderId: dto.orderId,
        specimenTypeId: dto.specimenTypeId,
        containerId: dto.containerId,
        barcode: dto.barcode,
        collectedAt: dto.collectedAt
          ? new Date(dto.collectedAt)
          : undefined,
        receivedAt: dto.receivedAt
          ? new Date(dto.receivedAt)
          : undefined,
      },

      include: {
        order: true,
        specimenType: true,
        container: true,
        results: true,
        collections: true,
        rejections: true,
      },
    });
  }

  async findAll(
    query: QuerySpecimenDto,
  ) {
    const {
      page,
      limit,
      orderId,
    } = query;

    const where = orderId
      ? {
          orderId,
        }
      : {};

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.specimen.findMany({
          where,

          include: {
            order: true,
            specimenType: true,
            container: true,
            results: true,
            collections: true,
            rejections: true,
          },

          orderBy: {
            collectedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.specimen.count({
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
    const specimen =
      await this.prisma.specimen.findUnique({
        where: {
          id,
        },

        include: {
          order: true,
          specimenType: true,
          container: true,
          results: true,
          collections: true,
          rejections: true,
        },
      });

    if (!specimen) {
      throw new NotFoundException(
        'Specimen not found.',
      );
    }

    return specimen;
  }

  async update(
    id: string,
    dto: UpdateSpecimenDto,
  ) {
    await this.findOne(id);

    return this.prisma.specimen.update({
      where: {
        id,
      },

      data: {
        orderId: dto.orderId,
        specimenTypeId: dto.specimenTypeId,
        containerId: dto.containerId,
        barcode: dto.barcode,
        collectedAt: dto.collectedAt
          ? new Date(dto.collectedAt)
          : undefined,
        receivedAt: dto.receivedAt
          ? new Date(dto.receivedAt)
          : undefined,
      },

      include: {
        order: true,
        specimenType: true,
        container: true,
        results: true,
        collections: true,
        rejections: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.specimen.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Specimen deleted successfully.',
    };
  }
}