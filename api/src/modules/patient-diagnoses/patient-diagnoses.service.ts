import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreatePatientDiagnosisDto } from './dto/create-patient-diagnosis.dto';
import { UpdatePatientDiagnosisDto } from './dto/update-patient-diagnosis.dto';
import { QueryPatientDiagnosisDto } from './dto/query-patient-diagnosis.dto';

@Injectable()
export class PatientDiagnosesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePatientDiagnosisDto,
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

    const diagnosis =
      await this.prisma.diagnosis.findUnique({
        where: {
          id: dto.diagnosisId,
        },
      });

    if (!diagnosis) {
      throw new NotFoundException(
        'Diagnosis not found.',
      );
    }

    return this.prisma.patientDiagnosis.create({
      data: {
        healthPassportId: dto.healthPassportId,
        encounterId: dto.encounterId,
        diagnosisId: dto.diagnosisId,
        notes: dto.notes,
      },

      include: {
        encounter: true,
        diagnosis: true,
      },
    });
  }

  async findAll(
    query: QueryPatientDiagnosisDto,
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
        this.prisma.patientDiagnosis.findMany({
          where,

          include: {
            encounter: true,
            diagnosis: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.patientDiagnosis.count({
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
    const diagnosis =
      await this.prisma.patientDiagnosis.findUnique({
        where: {
          id,
        },

        include: {
          encounter: true,
          diagnosis: true,
        },
      });

    if (!diagnosis) {
      throw new NotFoundException(
        'Patient diagnosis not found.',
      );
    }

    return diagnosis;
  }

  async update(
    id: string,
    dto: UpdatePatientDiagnosisDto,
  ) {
    await this.findOne(id);

    return this.prisma.patientDiagnosis.update({
      where: {
        id,
      },

      data: {
        encounterId: dto.encounterId,
        diagnosisId: dto.diagnosisId,
        notes: dto.notes,
      },

      include: {
        encounter: true,
        diagnosis: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.patientDiagnosis.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Patient diagnosis deleted successfully.',
    };
  }
}