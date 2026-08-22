import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreatePatientProcedureDto } from './dto/create-patient-procedure.dto';
import { UpdatePatientProcedureDto } from './dto/update-patient-procedure.dto';
import { QueryPatientProcedureDto } from './dto/query-patient-procedure.dto';

@Injectable()
export class PatientProceduresService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePatientProcedureDto,
  ) {
    const encounter =
      await this.prisma.encounter.findUnique({
        where: {
          id: dto.encounterId,
        },
      });

    if (!encounter) {
      throw new NotFoundException(
        'Encounter not found.',
      );
    }

    const procedure =
      await this.prisma.procedure.findUnique({
        where: {
          id: dto.procedureId,
        },
      });

    if (!procedure) {
      throw new NotFoundException(
        'Procedure not found.',
      );
    }

    return this.prisma.patientProcedure.create({
      data: {
        healthPassportId: dto.healthPassportId,
        encounterId: dto.encounterId,
        procedureId: dto.procedureId,
        notes: dto.notes,
        performedAt: dto.performedAt
          ? new Date(dto.performedAt)
          : undefined,
      },

      include: {
        encounter: true,
        procedure: true,
      },
    });
  }

  async findAll(
    query: QueryPatientProcedureDto,
  ) {
    const {
      page,
      limit,
      encounterId,
    } = query;

    const where = encounterId
      ? {
          encounterId,
        }
      : {};

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.patientProcedure.findMany({
          where,

          include: {
            encounter: true,
            procedure: true,
          },

          orderBy: {
            performedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.patientProcedure.count({
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

  async findOne(id: string) {
    const procedure =
      await this.prisma.patientProcedure.findUnique({
        where: {
          id,
        },

        include: {
          encounter: true,
          procedure: true,
        },
      });

    if (!procedure) {
      throw new NotFoundException(
        'Patient procedure not found.',
      );
    }

    return procedure;
  }

  async update(
    id: string,
    dto: UpdatePatientProcedureDto,
  ) {
    await this.findOne(id);

    return this.prisma.patientProcedure.update({
      where: {
        id,
      },

      data: {
        encounterId: dto.encounterId,
        procedureId: dto.procedureId,
        notes: dto.notes,
        performedAt: dto.performedAt
          ? new Date(dto.performedAt)
          : undefined,
      },

      include: {
        encounter: true,
        procedure: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.patientProcedure.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Patient procedure deleted successfully.',
    };
  }
}