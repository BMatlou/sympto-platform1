import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePractitionerQualificationDto } from './dto/create-practitioner-qualification.dto';
import { UpdatePractitionerQualificationDto } from './dto/update-practitioner-qualification.dto';
import { QueryPractitionerQualificationDto } from './dto/query-practitioner-qualification.dto';

@Injectable()
export class PractitionerQualificationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePractitionerQualificationDto,
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

    const qualification =
      await this.prisma.qualification.findUnique({
        where: {
          id: dto.qualificationId,
        },
      });

    if (!qualification) {
      throw new NotFoundException(
        'Qualification not found.',
      );
    }

    const existing =
      await this.prisma.practitionerQualification.findFirst({
        where: {
          practitionerId: dto.practitionerId,
          qualificationId: dto.qualificationId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'This practitioner already has the selected qualification.',
      );
    }

    return this.prisma.practitionerQualification.create({
      data: {
        practitionerId: dto.practitionerId,
        qualificationId: dto.qualificationId,
        institution: dto.institution,
        graduationYear: dto.graduationYear,
      },

      include: {
        practitioner: {
          include: {
            person: true,
            department: true,
          },
        },
        qualification: true,
      },
    });
  }

  async findAll(
    query: QueryPractitionerQualificationDto,
  ) {
    const {
      page,
      limit,
      practitionerId,
      qualificationId,
    } = query;

    const where: Prisma.PractitionerQualificationWhereInput = {
      ...(practitionerId && {
        practitionerId,
      }),

      ...(qualificationId && {
        qualificationId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.practitionerQualification.findMany({
          where,

          include: {
            practitioner: {
              include: {
                person: true,
                department: true,
              },
            },
            qualification: true,
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

        this.prisma.practitionerQualification.count({
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
    const practitionerQualification =
      await this.prisma.practitionerQualification.findUnique({
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
          qualification: true,
        },
      });

    if (!practitionerQualification) {
      throw new NotFoundException(
        'Practitioner qualification not found.',
      );
    }

    return practitionerQualification;
  }

  async update(
    id: string,
    dto: UpdatePractitionerQualificationDto,
  ) {
    const existing =
      await this.findOne(id);

    const practitionerId =
      dto.practitionerId ??
      existing.practitionerId;

    const qualificationId =
      dto.qualificationId ??
      existing.qualificationId;

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

    if (dto.qualificationId) {
      const qualification =
        await this.prisma.qualification.findUnique({
          where: {
            id: dto.qualificationId,
          },
        });

      if (!qualification) {
        throw new NotFoundException(
          'Qualification not found.',
        );
      }
    }

    const duplicate =
      await this.prisma.practitionerQualification.findFirst({
        where: {
          id: {
            not: id,
          },
          practitionerId,
          qualificationId,
        },
      });

    if (duplicate) {
      throw new ConflictException(
        'This practitioner already has the selected qualification.',
      );
    }

    return this.prisma.practitionerQualification.update({
      where: {
        id,
      },

      data: {
        practitionerId,
        qualificationId,
        institution: dto.institution,
        graduationYear: dto.graduationYear,
      },

      include: {
        practitioner: {
          include: {
            person: true,
            department: true,
          },
        },
        qualification: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.practitionerQualification.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Practitioner qualification deleted successfully.',
    };
  }
}