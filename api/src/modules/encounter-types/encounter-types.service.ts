import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateEncounterTypeDto } from './dto/create-encounter-type.dto';
import { UpdateEncounterTypeDto } from './dto/update-encounter-type.dto';
import { QueryEncounterTypeDto } from './dto/query-encounter-type.dto';

@Injectable()
export class EncounterTypesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateEncounterTypeDto,
  ) {
    const existing =
      await this.prisma.encounterType.findFirst({
        where: {
          name: {
            equals: dto.name.trim(),
            mode: 'insensitive',
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        'An encounter type with this name already exists.',
      );
    }

    return this.prisma.encounterType.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
      },

      include: {
        encounters: true,

        _count: {
          select: {
            encounters: true,
          },
        },
      },
    });
  }

  async findAll(
    query: QueryEncounterTypeDto,
  ) {
    const {
      page,
      limit,
      search,
    } = query;

    const where: Prisma.EncounterTypeWhereInput = {
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.encounterType.findMany({
          where,

          include: {
            encounters: true,

            _count: {
              select: {
                encounters: true,
              },
            },
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.encounterType.count({
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

  async findOne(
    id: string,
  ) {
    const encounterType =
      await this.prisma.encounterType.findUnique({
        where: {
          id,
        },

        include: {
          encounters: true,

          _count: {
            select: {
              encounters: true,
            },
          },
        },
      });

    if (!encounterType) {
      throw new NotFoundException(
        'Encounter type not found.',
      );
    }

    return encounterType;
  }

  async update(
    id: string,
    dto: UpdateEncounterTypeDto,
  ) {
    await this.findOne(id);

    if (dto.name) {
      const duplicate =
        await this.prisma.encounterType.findFirst({
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
          'An encounter type with this name already exists.',
        );
      }
    }

    return this.prisma.encounterType.update({
      where: {
        id,
      },

      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
      },

      include: {
        encounters: true,

        _count: {
          select: {
            encounters: true,
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.encounterType.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Encounter type deleted successfully.',
    };
  }
}