import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateImmunizationDto } from './dto/create-immunization.dto';
import { UpdateImmunizationDto } from './dto/update-immunization.dto';
import { QueryImmunizationDto } from './dto/query-immunization.dto';

@Injectable()
export class ImmunizationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateImmunizationDto,
  ) {
    const existing =
      await this.prisma.immunization.findFirst({
        where: {
          name: {
            equals: dto.name.trim(),
            mode: 'insensitive',
          },

          ...(dto.manufacturer && {
            manufacturer: {
              equals: dto.manufacturer.trim(),
              mode: 'insensitive',
            },
          }),
        },
      });

    if (existing) {
      throw new ConflictException(
        'An immunization with this name and manufacturer already exists.',
      );
    }

    return this.prisma.immunization.create({
      data: {
        name: dto.name.trim(),
        manufacturer: dto.manufacturer?.trim(),
      },

      include: {
        patientImmunizations: {
          include: {
            healthPassport: {
              include: {
                patient: {
                  include: {
                    person: true,
                  },
                },
              },
            },
          },
        },

        _count: {
          select: {
            patientImmunizations: true,
          },
        },
      },
    });
  }

  async findAll(
    query: QueryImmunizationDto,
  ) {
    const {
      page,
      limit,
      search,
    } = query;

    const where: Prisma.ImmunizationWhereInput = {
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            manufacturer: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            diseaseProtected: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.immunization.findMany({
          where,

          include: {
            patientImmunizations: {
              include: {
                healthPassport: {
                  include: {
                    patient: {
                      include: {
                        person: true,
                      },
                    },
                  },
                },
              },
            },

            _count: {
              select: {
                patientImmunizations: true,
              },
            },
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.immunization.count({
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
    const immunization =
      await this.prisma.immunization.findUnique({
        where: {
          id,
        },

        include: {
          patientImmunizations: {
            include: {
              healthPassport: {
                include: {
                  patient: {
                    include: {
                      person: true,
                    },
                  },
                },
              },
            },
          },

          _count: {
            select: {
              patientImmunizations: true,
            },
          },
        },
      });

    if (!immunization) {
      throw new NotFoundException(
        'Immunization not found.',
      );
    }

    return immunization;
  }

  async update(
    id: string,
    dto: UpdateImmunizationDto,
  ) {
    await this.findOne(id);

    if (dto.name) {
      const duplicate =
        await this.prisma.immunization.findFirst({
          where: {
            id: {
              not: id,
            },

            name: {
              equals: dto.name.trim(),
              mode: 'insensitive',
            },

            ...(dto.manufacturer && {
              manufacturer: {
                equals: dto.manufacturer.trim(),
                mode: 'insensitive',
              },
            }),
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'An immunization with this name and manufacturer already exists.',
        );
      }
    }

    return this.prisma.immunization.update({
      where: {
        id,
      },

      data: {
        name: dto.name?.trim(),
        manufacturer: dto.manufacturer?.trim(),
diseaseProtected: dto.diseaseProtected?.trim(),      },

      include: {
        patientImmunizations: {
          include: {
            healthPassport: {
              include: {
                patient: {
                  include: {
                    person: true,
                  },
                },
              },
            },
          },
        },

        _count: {
          select: {
            patientImmunizations: true,
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.immunization.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Immunization deleted successfully.',
    };
  }
}