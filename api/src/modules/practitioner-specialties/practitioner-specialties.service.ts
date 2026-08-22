import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePractitionerSpecialtyDto } from './dto/create-practitioner-specialty.dto';
import { UpdatePractitionerSpecialtyDto } from './dto/update-practitioner-specialty.dto';
import { QueryPractitionerSpecialtyDto } from './dto/query-practitioner-specialty.dto';

@Injectable()
export class PractitionerSpecialtiesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePractitionerSpecialtyDto,
  ) {
    const practitioner =
      await this.prisma.practitioner.findUnique({
        where: {
          id: dto.practitionerId,
        },
      });

    if (!practitioner) {
      throw new NotFoundException(
        'Practitioner not found.',
      );
    }

    const specialty =
      await this.prisma.specialty.findUnique({
        where: {
          id: dto.specialtyId,
        },
      });

    if (!specialty) {
      throw new NotFoundException(
        'Specialty not found.',
      );
    }

    const existing =
      await this.prisma.practitionerSpecialty.findFirst({
        where: {
          practitionerId: dto.practitionerId,
          specialtyId: dto.specialtyId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'This practitioner already has the selected specialty.',
      );
    }

    return this.prisma.practitionerSpecialty.create({
      data: {
        practitionerId: dto.practitionerId,
        specialtyId: dto.specialtyId,
      },

      include: {
        practitioner: {
          include: {
            person: true,
            department: true,
          },
        },
        specialty: true,
      },
    });
  }

  async findAll(
    query: QueryPractitionerSpecialtyDto,
  ) {
    const {
      page,
      limit,
      practitionerId,
      specialtyId,
    } = query;

    const where: Prisma.PractitionerSpecialtyWhereInput = {
      ...(practitionerId && {
        practitionerId,
      }),

      ...(specialtyId && {
        specialtyId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.practitionerSpecialty.findMany({
          where,

          include: {
            practitioner: {
              include: {
                person: true,
                department: true,
              },
            },
            specialty: true,
          },

          orderBy: {
            practitioner: {
              person: {
                lastName: 'asc',
              },
            },
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.practitionerSpecialty.count({
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

  async findOne(id: string) {
    const practitionerSpecialty =
      await this.prisma.practitionerSpecialty.findUnique({
        where: {
          id,
        },

        include: {
          practitioner: {
            include: {
              person: true,
              department: true,
            },
          },
          specialty: true,
        },
      });

    if (!practitionerSpecialty) {
      throw new NotFoundException(
        'Practitioner specialty not found.',
      );
    }

    return practitionerSpecialty;
  }

  async update(
    id: string,
    dto: UpdatePractitionerSpecialtyDto,
  ) {
    const existing =
      await this.findOne(id);

    const practitionerId =
      dto.practitionerId ??
      existing.practitionerId;

    const specialtyId =
      dto.specialtyId ??
      existing.specialtyId;

    if (dto.practitionerId) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id: dto.practitionerId,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Practitioner not found.',
        );
      }
    }

    if (dto.specialtyId) {
      const specialty =
        await this.prisma.specialty.findUnique({
          where: {
            id: dto.specialtyId,
          },
        });

      if (!specialty) {
        throw new NotFoundException(
          'Specialty not found.',
        );
      }
    }

    const duplicate =
      await this.prisma.practitionerSpecialty.findFirst({
        where: {
          id: {
            not: id,
          },
          practitionerId,
          specialtyId,
        },
      });

    if (duplicate) {
      throw new ConflictException(
        'This practitioner already has the selected specialty.',
      );
    }

    return this.prisma.practitionerSpecialty.update({
      where: {
        id,
      },

      data: {
        practitionerId,
        specialtyId,
      },

      include: {
        practitioner: {
          include: {
            person: true,
            department: true,
          },
        },
        specialty: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.practitionerSpecialty.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Practitioner specialty deleted successfully.',
    };
  }
}