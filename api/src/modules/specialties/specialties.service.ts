import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { QuerySpecialtyDto } from './dto/query-specialty.dto';

@Injectable()
export class SpecialtiesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateSpecialtyDto,
  ) {
    const existing =
      await this.prisma.specialty.findFirst({
        where: {
          name: {
            equals: dto.name,
            mode: 'insensitive',
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        'A specialty with this name already exists.',
      );
    }

    return this.prisma.specialty.create({
      data: {
        name: dto.name.trim(),
      },

      include: {
        practitioners: {
          include: {
            practitioner: {
              include: {
                person: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(
    query: QuerySpecialtyDto,
  ) {
    const {
      page,
      limit,
      search,
    } = query;

    const where: Prisma.SpecialtyWhereInput = {
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.specialty.findMany({
          where,

          include: {
            practitioners: {
              include: {
                practitioner: {
                  include: {
                    person: true,
                  },
                },
              },
            },

            _count: {
              select: {
                practitioners: true,
              },
            },
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.specialty.count({
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
    const specialty =
      await this.prisma.specialty.findUnique({
        where: {
          id,
        },

        include: {
          practitioners: {
            include: {
              practitioner: {
                include: {
                  person: true,
                },
              },
            },
          },

          _count: {
            select: {
              practitioners: true,
            },
          },
        },
      });

    if (!specialty) {
      throw new NotFoundException(
        'Specialty not found.',
      );
    }

    return specialty;
  }

  async update(
    id: string,
    dto: UpdateSpecialtyDto,
  ) {
    await this.findOne(id);

    if (dto.name) {
      const duplicate =
        await this.prisma.specialty.findFirst({
          where: {
            id: {
              not: id,
            },

            name: {
              equals: dto.name,
              mode: 'insensitive',
            },
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'A specialty with this name already exists.',
        );
      }
    }

    return this.prisma.specialty.update({
      where: {
        id,
      },

      data: {
        name: dto.name?.trim(),
      },

      include: {
        practitioners: {
          include: {
            practitioner: {
              include: {
                person: true,
              },
            },
          },
        },

        _count: {
          select: {
            practitioners: true,
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.specialty.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Specialty deleted successfully.',
    };
  }
}