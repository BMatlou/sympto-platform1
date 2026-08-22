import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';
import { QueryQualificationDto } from './dto/query-qualification.dto';

@Injectable()
export class QualificationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateQualificationDto,
  ) {
    const existing =
      await this.prisma.qualification.findFirst({
        where: {
          name: {
            equals: dto.name.trim(),
            mode: 'insensitive',
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        'A qualification with this name already exists.',
      );
    }

    return this.prisma.qualification.create({
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

        _count: {
          select: {
            practitioners: true,
          },
        },
      },
    });
  }

  async findAll(
    query: QueryQualificationDto,
  ) {
    const {
      page,
      limit,
      search,
    } = query;

    const where: Prisma.QualificationWhereInput = {
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.qualification.findMany({
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

        this.prisma.qualification.count({
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
    const qualification =
      await this.prisma.qualification.findUnique({
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

    if (!qualification) {
      throw new NotFoundException(
        'Qualification not found.',
      );
    }

    return qualification;
  }

  async update(
    id: string,
    dto: UpdateQualificationDto,
  ) {
    await this.findOne(id);

    if (dto.name) {
      const duplicate =
        await this.prisma.qualification.findFirst({
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
          'A qualification with this name already exists.',
        );
      }
    }

    return this.prisma.qualification.update({
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

    await this.prisma.qualification.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Qualification deleted successfully.',
    };
  }
}