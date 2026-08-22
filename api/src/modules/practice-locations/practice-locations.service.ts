import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePracticeLocationDto } from './dto/create-practice-location.dto';
import { UpdatePracticeLocationDto } from './dto/update-practice-location.dto';
import { QueryPracticeLocationDto } from './dto/query-practice-location.dto';

@Injectable()
export class PracticeLocationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePracticeLocationDto,
  ) {
    const practice =
      await this.prisma.practice.findUnique({
        where: {
          id: dto.practiceId,
        },
      });

    if (!practice) {
      throw new NotFoundException(
        'Practice not found.',
      );
    }

    return this.prisma.practiceLocation.create({
      data: {
        practiceId: dto.practiceId,
        latitude: new Prisma.Decimal(
          dto.latitude,
        ),
        longitude: new Prisma.Decimal(
          dto.longitude,
        ),
        radiusKm: dto.radiusKm ?? 20,
      },

      include: {
        practice: {
          include: {
            practitioner: {
              include: {
                person: true,
                department: true,
              },
            },
            address: true,
            organization: true,
          },
        },
      },
    });
  }

  async findAll(
    query: QueryPracticeLocationDto,
  ) {
    const {
      page,
      limit,
      practiceId,
    } = query;

    const where: Prisma.PracticeLocationWhereInput = {
      ...(practiceId && {
        practiceId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.practiceLocation.findMany({
          where,

          include: {
            practice: {
              include: {
                practitioner: {
                  include: {
                    person: true,
                    department: true,
                  },
                },
                address: true,
                organization: true,
              },
            },
          },

          orderBy: {
            practice: {
              name: 'asc',
            },
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.practiceLocation.count({
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
    const location =
      await this.prisma.practiceLocation.findUnique({
        where: {
          id,
        },

        include: {
          practice: {
            include: {
              practitioner: {
                include: {
                  person: true,
                  department: true,
                },
              },
              address: true,
              organization: true,
            },
          },
        },
      });

    if (!location) {
      throw new NotFoundException(
        'Practice location not found.',
      );
    }

    return location;
  }

  async update(
    id: string,
    dto: UpdatePracticeLocationDto,
  ) {
    await this.findOne(id);

    if (dto.practiceId) {
      const practice =
        await this.prisma.practice.findUnique({
          where: {
            id: dto.practiceId,
          },
        });

      if (!practice) {
        throw new NotFoundException(
          'Practice not found.',
        );
      }
    }

    return this.prisma.practiceLocation.update({
      where: {
        id,
      },

      data: {
        practiceId: dto.practiceId,
        latitude:
          dto.latitude !== undefined
            ? new Prisma.Decimal(dto.latitude)
            : undefined,
        longitude:
          dto.longitude !== undefined
            ? new Prisma.Decimal(dto.longitude)
            : undefined,
        radiusKm: dto.radiusKm,
      },

      include: {
        practice: {
          include: {
            practitioner: {
              include: {
                person: true,
                department: true,
              },
            },
            address: true,
            organization: true,
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.practiceLocation.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Practice location deleted successfully.',
    };
  }
}