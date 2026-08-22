import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateTelemedicineConsentDto } from './dto/create-telemedicine-consent.dto';
import { UpdateTelemedicineConsentDto } from './dto/update-telemedicine-consent.dto';
import { QueryTelemedicineConsentDto } from './dto/query-telemedicine-consent.dto';

@Injectable()
export class TelemedicineConsentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateTelemedicineConsentDto,
  ) {
    const session =
      await this.prisma.telemedicineSession.findUnique({
        where: {
          id: dto.sessionId,
        },
      });

    if (!session) {
      throw new NotFoundException(
        'Telemedicine session not found.',
      );
    }

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

    return this.prisma.telemedicineConsent.create({
      data: {
        sessionId: dto.sessionId,
        patientId: dto.patientId,
        consented: dto.consented,
        consentedAt: dto.consentedAt,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },

      include: {
        session: true,
        patient: true,
      },
    });
  }

  async findAll(
    query: QueryTelemedicineConsentDto,
  ) {
    const {
      page,
      limit,
      sessionId,
      patientId,
      consented,
    } = query;

    const where: Prisma.TelemedicineConsentWhereInput = {
      ...(sessionId && {
        sessionId,
      }),

      ...(patientId && {
        patientId,
      }),

      ...(consented !== undefined && {
        consented,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.telemedicineConsent.findMany({
          where,

          include: {
            session: true,
            patient: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.telemedicineConsent.count({
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
    const consent =
      await this.prisma.telemedicineConsent.findUnique({
        where: {
          id,
        },

        include: {
          session: true,
          patient: true,
        },
      });

    if (!consent) {
      throw new NotFoundException(
        'Telemedicine consent not found.',
      );
    }

    return consent;
  }

  async update(
    id: string,
    dto: UpdateTelemedicineConsentDto,
  ) {
    const consent =
      await this.prisma.telemedicineConsent.findUnique({
        where: {
          id,
        },
      });

    if (!consent) {
      throw new NotFoundException(
        'Telemedicine consent not found.',
      );
    }

    if (
      dto.sessionId &&
      dto.sessionId !== consent.sessionId
    ) {
      const session =
        await this.prisma.telemedicineSession.findUnique({
          where: {
            id: dto.sessionId,
          },
        });

      if (!session) {
        throw new NotFoundException(
          'Telemedicine session not found.',
        );
      }
    }

    if (
      dto.patientId &&
      dto.patientId !== consent.patientId
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

    return this.prisma.telemedicineConsent.update({
      where: {
        id,
      },

      data: {
        ...(dto.sessionId !== undefined && {
          sessionId: dto.sessionId,
        }),

        ...(dto.patientId !== undefined && {
          patientId: dto.patientId,
        }),

        ...(dto.consented !== undefined && {
          consented: dto.consented,
        }),

        ...(dto.consentedAt !== undefined && {
          consentedAt: dto.consentedAt,
        }),

        ...(dto.ipAddress !== undefined && {
          ipAddress: dto.ipAddress,
        }),

        ...(dto.userAgent !== undefined && {
          userAgent: dto.userAgent,
        }),
      },

      include: {
        session: true,
        patient: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const consent =
      await this.prisma.telemedicineConsent.findUnique({
        where: {
          id,
        },
      });

    if (!consent) {
      throw new NotFoundException(
        'Telemedicine consent not found.',
      );
    }

    await this.prisma.telemedicineConsent.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Telemedicine consent deleted successfully.',
    };
  }
}