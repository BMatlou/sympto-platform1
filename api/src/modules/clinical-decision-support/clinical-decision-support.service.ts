import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { Prisma, CDSStatus, CDSSeverity } from '@prisma/client';

import { CreateClinicalDecisionSupportDto } from './dto/create-clinical-decision-support.dto';
import { UpdateClinicalDecisionSupportDto } from './dto/update-clinical-decision-support.dto';
import { QueryClinicalDecisionSupportDto } from './dto/query-clinical-decision-support.dto';

@Injectable()
export class ClinicalDecisionSupportService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateClinicalDecisionSupportDto,
  ) {
    const patient =
      await this.prisma.patient.findUnique({
        where: {
          id: dto.patientId,
        },
      });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

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

    if (dto.encounterId) {
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
    }

    return this.prisma.clinicalDecisionSupport.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        practitionerId: dto.practitionerId,
        recommendationType: dto.recommendationType,
        title: dto.title,
        description: dto.description,
        evidence: dto.evidence,
        guidelineSource: dto.guidelineSource,
        aiModel: dto.aiModel,
        confidence: dto.confidence,
        severity: dto.severity,
        status: dto.status,
      },

      include: {
        patient: true,
        practitioner: true,
        encounter: true,
        actions: true,
        alerts: true,
        cdsoverrides: true,
      },
    });
  }

  async findAll(
    query: QueryClinicalDecisionSupportDto,
  ) {
    const {
      page,
      limit,
      patientId,
      status,
      severity,
      search,
    } = query;

    const where: Prisma.ClinicalDecisionSupportWhereInput =
      {
        ...(patientId && {
          patientId,
        }),

        ...(status && {
          status: status as CDSStatus,
        }),

        ...(severity && {
          severity:
            severity as CDSSeverity,
        }),

        ...(search && {
          OR: [
            {
              title: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.clinicalDecisionSupport.findMany({
          where,

          include: {
            patient: true,
            practitioner: true,
            encounter: true,
            actions: true,
            alerts: true,
            cdsoverrides: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.clinicalDecisionSupport.count({
          where,
        }),
      ]);

    return {
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit,
          ),
      },
    };
  }

  async findOne(id: string) {
    const cds =
      await this.prisma.clinicalDecisionSupport.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          practitioner: true,
          encounter: true,
          actions: true,
          alerts: true,
          cdsoverrides: true,
        },
      });

    if (!cds) {
      throw new NotFoundException(
        'Clinical decision support record not found.',
      );
    }

    return cds;
  }

  async update(
    id: string,
    dto: UpdateClinicalDecisionSupportDto,
  ) {
    await this.findOne(id);

    return this.prisma.clinicalDecisionSupport.update({
      where: {
        id,
      },

      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        practitionerId:
          dto.practitionerId,
        recommendationType:
          dto.recommendationType,
        title: dto.title,
        description:
          dto.description,
        evidence: dto.evidence,
        guidelineSource:
          dto.guidelineSource,
        aiModel: dto.aiModel,
        confidence:
          dto.confidence,
        severity: dto.severity,
        status: dto.status,
      },

      include: {
        patient: true,
        practitioner: true,
        encounter: true,
        actions: true,
        alerts: true,
        cdsoverrides: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.clinicalDecisionSupport.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Clinical decision support deleted successfully.',
    };
  }
}