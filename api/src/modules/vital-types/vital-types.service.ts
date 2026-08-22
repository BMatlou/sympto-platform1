import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateVitalTypeDto } from './dto/create-vital-type.dto';
import { UpdateVitalTypeDto } from './dto/update-vital-type.dto';
import { QueryVitalTypeDto } from './dto/query-vital-type.dto';

@Injectable()
export class VitalTypesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateVitalTypeDto,
  ) {
    const existing =
      await this.prisma.vitalType.findFirst({
        where: {
          name: {
            equals: dto.name.trim(),
            mode: 'insensitive',
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        'A vital type with this name already exists.',
      );
    }

    return this.prisma.vitalType.create({
      data: {
        code: dto.code,
        name: dto.name.trim(),
        unit: dto.unit?.trim(),
      },

      include: {
        clinicalVitals: true,

        _count: {
          select: {
            clinicalVitals: true,
          },
        },
      },
    });
  }

  async findAll(
    query: QueryVitalTypeDto,
  ) {
    const {
      page,
      limit,
      search,
    } = query;

    const where: Prisma.VitalTypeWhereInput = {
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            unit: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.vitalType.findMany({
          where,

          include: {
            clinicalVitals: true,

            _count: {
              select: {
                clinicalVitals: true,
              },
            },
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.vitalType.count({
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
    const vitalType =
      await this.prisma.vitalType.findUnique({
        where: {
          id,
        },

        include: {
          clinicalVitals: true,

          _count: {
            select: {
              clinicalVitals: true,
            },
          },
        },
      });

    if (!vitalType) {
      throw new NotFoundException(
        'Vital type not found.',
      );
    }

    return vitalType;
  }

  async update(
    id: string,
    dto: UpdateVitalTypeDto,
  ) {
    await this.findOne(id);

    if (dto.name) {
      const duplicate =
        await this.prisma.vitalType.findFirst({
          where: {
            id: {
              not: id,
            },

            name: {
              equals: dto.name.trim(),
              mode: 'insensitive',
            },
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'A vital type with this name already exists.',
        );
      }
    }

    return this.prisma.vitalType.update({
      where: {
        id,
      },

      data: {
        name: dto.name?.trim(),
        unit: dto.unit?.trim(),
      },

      include: {
        clinicalVitals: true,

        _count: {
          select: {
            clinicalVitals: true,
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.vitalType.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Vital type deleted successfully.',
    };
  }
}