import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  ReferralPriority,
  ReferralStatus,
  ReferralType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { QueryReferralDto } from './dto/query-referral.dto';

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateReferralDto,
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

    const referringPractitioner =
      await this.prisma.practitioner.findUnique({
        where: {
          id: dto.referringPractitionerId,
        },
      });

    if (!referringPractitioner) {
      throw new NotFoundException(
        'Referring practitioner not found.',
      );
    }

    if (dto.receivingPractitionerId) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id: dto.receivingPractitionerId,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Receiving practitioner not found.',
        );
      }
    }

    return this.prisma.referral.create({
      data: {
        patientId: dto.patientId,
        referringPractitionerId:
          dto.referringPractitionerId,
        receivingPractitionerId:
          dto.receivingPractitionerId,
        referringPracticeId:
          dto.referringPracticeId,
        receivingPracticeId:
          dto.receivingPracticeId,
        encounterId:
          dto.encounterId,
        appointmentId:
          dto.appointmentId,
        referralNumber:
          dto.referralNumber,
        type:
          dto.type,
        priority:
          dto.priority,
        status:
          dto.status,
        specialty:
          dto.specialty,
        reason:
          dto.reason,
        clinicalSummary:
          dto.clinicalSummary,
        requestedDate:
          dto.requestedDate,
        acceptedDate:
          dto.acceptedDate,
        completedDate:
          dto.completedDate,
      },

      include: {
        patient: true,
        referringPractitioner: true,
        receivingPractitioner: true,
        referringPractice: true,
        receivingPractice: true,
        encounter: true,
        appointment: true,
        documents: true,
        notes: true,
        feedback: true,
        statusHistory: true,
      },
    });
  }

  async findAll(
    query: QueryReferralDto,
  ) {
    const {
      page,
      limit,
      patientId,
      status,
      priority,
      search,
    } = query;

    const where: Prisma.ReferralWhereInput = {
      ...(patientId && {
        patientId,
      }),

      ...(status && {
        status,
      }),

      ...(priority && {
        priority,
      }),

      ...(search && {
        OR: [
          {
            referralNumber: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            reason: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            specialty: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.referral.findMany({
          where,

          include: {
            patient: true,
            referringPractitioner: true,
            receivingPractitioner: true,
            referringPractice: true,
            receivingPractice: true,
            encounter: true,
            appointment: true,
            feedback: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.referral.count({
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

  async findOne(
    id: string,
  ) {
    const referral =
      await this.prisma.referral.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          referringPractitioner: true,
          receivingPractitioner: true,
          referringPractice: true,
          receivingPractice: true,
          encounter: true,
          appointment: true,
          documents: true,
          notes: true,
          feedback: true,
          statusHistory: true,
        },
      });

    if (!referral) {
      throw new NotFoundException(
        'Referral not found.',
      );
    }

    return referral;
  }

  async update(
    id: string,
    dto: UpdateReferralDto,
  ) {
    await this.findOne(id);

    return this.prisma.referral.update({
      where: {
        id,
      },

      data: {
        patientId:
          dto.patientId,
        referringPractitionerId:
          dto.referringPractitionerId,
        receivingPractitionerId:
          dto.receivingPractitionerId,
        referringPracticeId:
          dto.referringPracticeId,
        receivingPracticeId:
          dto.receivingPracticeId,
        encounterId:
          dto.encounterId,
        appointmentId:
          dto.appointmentId,
        referralNumber:
          dto.referralNumber,
        type:
          dto.type as
            | ReferralType
            | undefined,
        priority:
          dto.priority as
            | ReferralPriority
            | undefined,
        status:
          dto.status as
            | ReferralStatus
            | undefined,
        specialty:
          dto.specialty,
        reason:
          dto.reason,
        clinicalSummary:
          dto.clinicalSummary,
        requestedDate:
          dto.requestedDate,
        acceptedDate:
          dto.acceptedDate,
        completedDate:
          dto.completedDate,
      },

      include: {
        patient: true,
        referringPractitioner: true,
        receivingPractitioner: true,
        referringPractice: true,
        receivingPractice: true,
        encounter: true,
        appointment: true,
        documents: true,
        notes: true,
        feedback: true,
        statusHistory: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.referral.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Referral deleted successfully.',
    };
  }
}