import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { QueryMedicationDto } from './dto/query-medication.dto';

@Injectable()
export class MedicationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /*
  |--------------------------------------------------------------------------
  | CREATE MEDICATION
  |--------------------------------------------------------------------------
  */

  async create(dto: CreateMedicationDto) {
    const name = dto.name.trim();

    const existing =
      await this.prisma.medication.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive',
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        'A medication with this name already exists.',
      );
    }

    return this.prisma.medication.create({
      data: {
        name,

        genericName:
          dto.genericName?.trim(),

        brandName:
          dto.brandName?.trim(),

        description:
          dto.description?.trim(),

        category:
          dto.category?.trim(),

        rxNormCode:
          dto.rxNormCode?.trim(),

        controlled:
          dto.controlled ?? false,

        prescriptionRequired:
          dto.prescriptionRequired ?? true,

        searchable:
          dto.searchable ?? true,

        active:
          dto.active ?? true,
      },

      include: {
        strengths: {
          where: {
            active: true,
          },

          orderBy: {
            strength: 'asc',
          },
        },

        _count: {
          select: {
            strengths: true,
            patientMedications: true,
            prescriptionItems: true,
          },
        },
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | FIND ALL / SEARCH
  |--------------------------------------------------------------------------
  */

  async findAll(query: QueryMedicationDto) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const normalizedSearch = query.search?.trim();

  const where: Prisma.MedicationWhereInput = {
    active: true,
    searchable: true,
  };

  if (normalizedSearch) {
    where.OR = [
      {
        name: {
          contains: normalizedSearch,
          mode: 'insensitive',
        },
      },
      {
        genericName: {
          contains: normalizedSearch,
          mode: 'insensitive',
        },
      },
      {
        brandName: {
          contains: normalizedSearch,
          mode: 'insensitive',
        },
      },
      {
        category: {
          contains: normalizedSearch,
          mode: 'insensitive',
        },
      },
      {
        rxNormCode: {
          contains: normalizedSearch,
          mode: 'insensitive',
        },
      },
      {
  strengths: {
    some: {
      active: true,
      strength: {
        contains: normalizedSearch,
        mode: 'insensitive',
      },
    },
  },
},
{
  strengths: {
    some: {
      active: true,
      dosageForm: {
        contains: normalizedSearch,
        mode: 'insensitive',
      },
    },
  },
},
{
  strengths: {
    some: {
      active: true,
      route: {
        contains: normalizedSearch,
        mode: 'insensitive',
      },
    },
  },
},
    ];
  }

  const [data, total] =
    await this.prisma.$transaction([
      this.prisma.medication.findMany({
        where,

        select: {
          id: true,
          rxNormCode: true,
          name: true,
          genericName: true,
          brandName: true,
          description: true,
          category: true,
          controlled: true,
          prescriptionRequired: true,
          active: true,

          strengths: {
            where: {
              active: true,
            },

            select: {
              id: true,
              strength: true,
              dosageForm: true,
              route: true,
              active: true,
            },

            orderBy: {
              strength: 'asc',
            },
          },
        },

        orderBy: [
          {
            genericName: 'asc',
          },
          {
            name: 'asc',
          },
        ],

        skip: (page - 1) * limit,
        take: limit,
      }),

      this.prisma.medication.count({
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
  /*
  |--------------------------------------------------------------------------
  | FIND ONE
  |--------------------------------------------------------------------------
  */

  async findOne(id: string) {
    const medication =
      await this.prisma.medication.findUnique({
        where: {
          id,
        },

        include: {
          strengths: {
            where: {
              active: true,
            },

            orderBy: {
              strength: 'asc',
            },
          },

          _count: {
            select: {
              strengths: true,
              patientMedications: true,
              prescriptionItems: true,
            },
          },
        },
      });

    if (!medication) {
      throw new NotFoundException(
        'Medication not found.',
      );
    }

    return medication;
  }

  /*
  |--------------------------------------------------------------------------
  | UPDATE
  |--------------------------------------------------------------------------
  */

  async update(
    id: string,
    dto: UpdateMedicationDto,
  ) {
    await this.findOne(id);

    if (dto.name) {
      const duplicate =
        await this.prisma.medication.findFirst({
          where: {
            id: {
              not: id,
            },

            name: {
              equals:
                dto.name.trim(),
              mode: 'insensitive',
            },
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'A medication with this name already exists.',
        );
      }
    }

    return this.prisma.medication.update({
      where: {
        id,
      },

      data: {
        name:
          dto.name?.trim(),

        genericName:
          dto.genericName?.trim(),

        brandName:
          dto.brandName?.trim(),

        description:
          dto.description?.trim(),

        category:
          dto.category?.trim(),

        rxNormCode:
          dto.rxNormCode?.trim(),

        controlled:
          dto.controlled,

        prescriptionRequired:
          dto.prescriptionRequired,

        searchable:
          dto.searchable,

        active:
          dto.active,
      },

      include: {
        strengths: {
          where: {
            active: true,
          },

          orderBy: {
            strength: 'asc',
          },
        },

        _count: {
          select: {
            strengths: true,
            patientMedications: true,
            prescriptionItems: true,
          },
        },
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.medication.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Medication deleted successfully.',
    };
  }
}