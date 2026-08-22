import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateLabResultDto } from './dto/create-lab-result.dto';
import { UpdateLabResultDto } from './dto/update-lab-result.dto';
import { QueryLabResultDto } from './dto/query-lab-result.dto';

@Injectable()
export class LabResultsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabResultDto,
  ) {
    const specimen =
      await this.prisma.specimen.findUnique({
        where: {
          id: dto.specimenId,
        },
      });

    if (!specimen) {
      throw new NotFoundException(
        'Specimen not found.',
      );
    }

    const orderItem =
      await this.prisma.labOrderItem.findUnique({
        where: {
          id: dto.orderItemId,
        },
      });

    if (!orderItem) {
      throw new NotFoundException(
        'Lab order item not found.',
      );
    }

    return this.prisma.labResult.create({
      data: {
        specimenId: dto.specimenId,
        orderItemId: dto.orderItemId,
        status: dto.status,
        reportedAt: dto.reportedAt
          ? new Date(dto.reportedAt)
          : undefined,
        releasedAt: dto.releasedAt
          ? new Date(dto.releasedAt)
          : undefined,
      },

      include: {
        specimen: true,
        orderItem: true,
        items: true,
        attachments: true,
        verifications: true,
        amendments: true,
        criticalResults: true,
      },
    });
  }

  async findAll(
    query: QueryLabResultDto,
  ) {
    const {
      page,
      limit,
      specimenId,
      orderItemId,
    } = query;

    const where = {
      ...(specimenId && {
        specimenId,
      }),

      ...(orderItemId && {
        orderItemId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.labResult.findMany({
          where,

          include: {
            specimen: true,
            orderItem: true,
            items: true,
            attachments: true,
            verifications: true,
            amendments: true,
            criticalResults: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.labResult.count({
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
    const result =
      await this.prisma.labResult.findUnique({
        where: {
          id,
        },

        include: {
          specimen: true,
          orderItem: true,
          items: {
            include: {
              test: true,
            },
          },
          attachments: true,
          verifications: {
            include: {
              practitioner: true,
            },
          },
          amendments: {
            include: {
              practitioner: true,
            },
          },
          criticalResults: {
            include: {
              practitioner: true,
            },
          },
        },
      });

    if (!result) {
      throw new NotFoundException(
        'Lab result not found.',
      );
    }

    return result;
  }

  async update(
    id: string,
    dto: UpdateLabResultDto,
  ) {
    await this.findOne(id);

    return this.prisma.labResult.update({
      where: {
        id,
      },

      data: {
        specimenId: dto.specimenId,
        orderItemId: dto.orderItemId,
        status: dto.status,
        reportedAt: dto.reportedAt
          ? new Date(dto.reportedAt)
          : undefined,
        releasedAt: dto.releasedAt
          ? new Date(dto.releasedAt)
          : undefined,
      },

      include: {
        specimen: true,
        orderItem: true,
        items: true,
        attachments: true,
        verifications: true,
        amendments: true,
        criticalResults: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labResult.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab result deleted successfully.',
    };
  }
}