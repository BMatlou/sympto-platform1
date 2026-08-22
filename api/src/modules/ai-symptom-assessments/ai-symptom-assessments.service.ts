import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAISymptomAssessmentDto } from './dto/create-ai-symptom-assessment.dto';
import { UpdateAISymptomAssessmentDto } from './dto/update-ai-symptom-assessment.dto';
import { QueryAISymptomAssessmentDto } from './dto/query-ai-symptom-assessment.dto';

@Injectable()
export class AISymptomAssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateAISymptomAssessmentDto,
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

    if (dto.createdByUserId) {
      const user =
        await this.prisma.user.findUnique({
          where: {
            id: dto.createdByUserId,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'User not found.',
        );
      }
    }

    if (dto.referralId) {
      const referral =
        await this.prisma.referral.findUnique({
          where: {
            id: dto.referralId,
          },
        });

      if (!referral) {
        throw new NotFoundException(
          'Referral not found.',
        );
      }
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

    return this.prisma.aISymptomAssessment.create({
      data: {
        patientId: dto.patientId,
        createdByUserId: dto.createdByUserId,
        referralId: dto.referralId,
        encounterId: dto.encounterId,
        status: dto.status,
        severity: dto.severity,
        summary: dto.summary,
      },

      include: {
        patient: true,
        createdByUser: true,
        referral: true,
        encounter: true,

        symptoms: true,
        questions: true,
        recommendations: true,
        differentialDiagnoses: true,
        clinicalReviews: true,
      },
    });
  }

  async findAll(
    query: QueryAISymptomAssessmentDto,
  ) {
    const {
      page,
      limit,
      patientId,
      createdByUserId,
      referralId,
      encounterId,
      status,
      severity,
    } = query;

    const where: Prisma.AISymptomAssessmentWhereInput =
      {
        ...(patientId && {
          patientId,
        }),

        ...(createdByUserId && {
          createdByUserId,
        }),

        ...(referralId && {
          referralId,
        }),

        ...(encounterId && {
          encounterId,
        }),

        ...(status && {
          status,
        }),

        ...(severity && {
          severity,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.aISymptomAssessment.findMany({
          where,

          include: {
            patient: true,
            createdByUser: true,
            referral: true,
            encounter: true,

            symptoms: true,
            questions: true,
            recommendations: true,
            differentialDiagnoses: true,
            clinicalReviews: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.aISymptomAssessment.count({
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
    const assessment =
      await this.prisma.aISymptomAssessment.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          createdByUser: true,
          referral: true,
          encounter: true,

          symptoms: true,
          questions: true,
          recommendations: true,
          differentialDiagnoses: true,
          clinicalReviews: {
            include: {
              practitioner: true,
            },
          },
        },
      });

    if (!assessment) {
      throw new NotFoundException(
        'AI symptom assessment not found.',
      );
    }

    return assessment;
  }

  async update(
    id: string,
    dto: UpdateAISymptomAssessmentDto,
  ) {
    const assessment =
      await this.prisma.aISymptomAssessment.findUnique({
        where: {
          id,
        },
      });

    if (!assessment) {
      throw new NotFoundException(
        'AI symptom assessment not found.',
      );
    }

    if (
      dto.patientId &&
      dto.patientId !== assessment.patientId
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
    }

    if (
      dto.createdByUserId &&
      dto.createdByUserId !== assessment.createdByUserId
    ) {
      const user =
        await this.prisma.user.findUnique({
          where: {
            id: dto.createdByUserId,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'User not found.',
        );
      }
    }

    if (
      dto.referralId &&
      dto.referralId !== assessment.referralId
    ) {
      const referral =
        await this.prisma.referral.findUnique({
          where: {
            id: dto.referralId,
          },
        });

      if (!referral) {
        throw new NotFoundException(
          'Referral not found.',
        );
      }
    }

    if (
      dto.encounterId &&
      dto.encounterId !== assessment.encounterId
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
    }

    return this.prisma.aISymptomAssessment.update({
      where: {
        id,
      },

      data: {
        ...(dto.patientId !== undefined && {
          patientId: dto.patientId,
        }),

        ...(dto.createdByUserId !== undefined && {
          createdByUserId: dto.createdByUserId,
        }),

        ...(dto.referralId !== undefined && {
          referralId: dto.referralId,
        }),

        ...(dto.encounterId !== undefined && {
          encounterId: dto.encounterId,
        }),

        ...(dto.status !== undefined && {
          status: dto.status,
        }),

        ...(dto.severity !== undefined && {
          severity: dto.severity,
        }),

        ...(dto.summary !== undefined && {
          summary: dto.summary,
        }),
      },

      include: {
        patient: true,
        createdByUser: true,
        referral: true,
        encounter: true,

        symptoms: true,
        questions: true,
        recommendations: true,
        differentialDiagnoses: true,
        clinicalReviews: {
          include: {
            practitioner: true,
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    const assessment =
      await this.prisma.aISymptomAssessment.findUnique({
        where: {
          id,
        },
      });

    if (!assessment) {
      throw new NotFoundException(
        'AI symptom assessment not found.',
      );
    }

    await this.prisma.aISymptomAssessment.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'AI symptom assessment deleted successfully.',
    };
  }
}