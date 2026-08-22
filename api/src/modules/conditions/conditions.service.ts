import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateConditionDto } from './dto/create-condition.dto';
import { UpdateConditionDto } from './dto/update-condition.dto';
import { QueryConditionDto } from './dto/query-condition.dto';

@Injectable()
export class ConditionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateConditionDto,
  ) {
    const existing =
      await this.prisma.condition.findFirst({
        where: {
          name: {
            equals: dto.name.trim(),
            mode: 'insensitive',
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        'A condition with this name already exists.',
      );
    }

    return this.prisma.condition.create({
      data: {
        name: dto.name.trim(),
        icd10Code: dto.icd10Code?.trim(),
        description: dto.description?.trim(),
      },

      include: {
        patientConditions: {
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
    patientConditions: true,
  },
},
      },
    });
  }

  async findAll(
    query: QueryConditionDto,
  ) {
    const {
      page,
      limit,
      search,
    } = query;

    const where: Prisma.ConditionWhereInput = {
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            icd10Code: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.condition.findMany({
          where,

          include: {
            patientConditions: {
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
    patientConditions: true,
  },
},
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.condition.count({
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
    const condition =
      await this.prisma.condition.findUnique({
        where: {
          id,
        },

        include: {
          patientConditions: {
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
    patientConditions: true,
  },
},
        },
      });

    if (!condition) {
      throw new NotFoundException(
        'Condition not found.',
      );
    }

    return condition;
  }

  async update(
    id: string,
    dto: UpdateConditionDto,
  ) {
    await this.findOne(id);

    if (dto.name) {
      const duplicate =
        await this.prisma.condition.findFirst({
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
          'A condition with this name already exists.',
        );
      }
    }

    return this.prisma.condition.update({
      where: {
        id,
      },

      data: {
        name: dto.name?.trim(),
        icd10Code: dto.icd10Code?.trim(),
        description: dto.description?.trim(),
      },

      include: {
        patientConditions: {
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
            patientConditions: true,
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.condition.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Condition deleted successfully.',
    };
  }
}