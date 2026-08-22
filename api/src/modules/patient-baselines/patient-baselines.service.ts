import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePatientBaselineDto } from './dto/create-patient-baseline.dto';
import { UpdatePatientBaselineDto } from './dto/update-patient-baseline.dto';
import { QueryPatientBaselineDto } from './dto/query-patient-baseline.dto';

@Injectable()
export class PatientBaselinesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePatientBaselineDto,
  ) {
    return this.prisma.patientBaseline.create({
      data: {
        ...dto,
      },

      include: {
        patient: true,
      },
    });
  }

  async findAll(
    query: QueryPatientBaselineDto,
  ) {
    const {
      page,
      limit,
      patientId,
    } = query;

    const where: Prisma.PatientBaselineWhereInput =
      {
        patientId,
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.patientBaseline.findMany({
          where,

          include: {
            patient: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.patientBaseline.count({
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
    const baseline =
      await this.prisma.patientBaseline.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
        },
      });

    if (!baseline) {
      throw new NotFoundException(
        'Patient baseline not found.',
      );
    }

    return baseline;
  }

  async update(
    id: string,
    dto: UpdatePatientBaselineDto,
  ) {
    await this.findOne(id);

    return this.prisma.patientBaseline.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: {
        patient: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.patientBaseline.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Patient baseline deleted successfully.',
    };
  }
}