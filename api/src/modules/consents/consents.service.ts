import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateConsentDto } from './dto/create-consent.dto';
import { UpdateConsentDto } from './dto/update-consent.dto';
import { QueryConsentDto } from './dto/query-consent.dto';

@Injectable()
export class ConsentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateConsentDto,
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

    if (dto.grantedToUserId) {
      const user =
        await this.prisma.user.findUnique({
          where: {
            id: dto.grantedToUserId,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'Granted user not found.',
        );
      }
    }

    return this.prisma.consent.create({
      data: {
        patientId: dto.patientId,
        grantedToUserId: dto.grantedToUserId,
        type: dto.type,
        purpose: dto.purpose,
        granted: dto.granted ?? true,
        grantedAt: dto.grantedAt,
        expiresAt: dto.expiresAt,
        revokedAt: dto.revokedAt,
      },

      include: {
        patient: true,
        grantedToUser: true,
      },
    });
  }

  async findAll(
    query: QueryConsentDto,
  ) {
    const {
      page,
      limit,
      patientId,
      grantedToUserId,
      granted,
    } = query;

    const where: Prisma.ConsentWhereInput = {
      ...(patientId && {
        patientId,
      }),

      ...(grantedToUserId && {
        grantedToUserId,
      }),

      ...(granted !== undefined && {
        granted,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.consent.findMany({
          where,

          include: {
            patient: true,
            grantedToUser: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.consent.count({
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
      await this.prisma.consent.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          grantedToUser: true,
        },
      });

    if (!consent) {
      throw new NotFoundException(
        'Consent not found.',
      );
    }

    return consent;
  }

  async update(
    id: string,
    dto: UpdateConsentDto,
  ) {
    await this.findOne(id);

    if (dto.patientId) {
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

    if (dto.grantedToUserId) {
      const user =
        await this.prisma.user.findUnique({
          where: {
            id: dto.grantedToUserId,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'Granted user not found.',
        );
      }
    }

    return this.prisma.consent.update({
      where: {
        id,
      },

      data: {
        patientId: dto.patientId,
        grantedToUserId: dto.grantedToUserId,
        type: dto.type,
        purpose: dto.purpose,
        granted: dto.granted,
        grantedAt: dto.grantedAt,
        expiresAt: dto.expiresAt,
        revokedAt: dto.revokedAt,
      },

      include: {
        patient: true,
        grantedToUser: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.consent.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Consent deleted successfully.',
    };
  }
}