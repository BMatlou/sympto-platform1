import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateDataAccessConsentDto } from './dto/create-data-access-consent.dto';
import { UpdateDataAccessConsentDto } from './dto/update-data-access-consent.dto';
import { QueryDataAccessConsentDto } from './dto/query-data-access-consent.dto';

@Injectable()
export class DataAccessConsentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateDataAccessConsentDto,
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

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: dto.grantedToUserId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found.',
      );
    }

    return this.prisma.dataAccessConsent.create({
      data: {
        ...dto,
      },

      include: {
        patient: true,
        grantedTo: true,
      },
    });
  }

  async findAll(
    query: QueryDataAccessConsentDto,
  ) {
    const {
      page,
      limit,
      patientId,
      grantedToUserId,
    } = query;

    const where: Prisma.DataAccessConsentWhereInput = {
      ...(patientId && {
        patientId,
      }),

      ...(grantedToUserId && {
        grantedToUserId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.dataAccessConsent.findMany({
          where,

          include: {
            patient: true,
            grantedTo: true,
          },

          orderBy: {
            grantedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.dataAccessConsent.count({
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
      await this.prisma.dataAccessConsent.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          grantedTo: true,
        },
      });

    if (!consent) {
      throw new NotFoundException(
        'Data access consent not found.',
      );
    }

    return consent;
  }

  async update(
    id: string,
    dto: UpdateDataAccessConsentDto,
  ) {
    const consent =
      await this.prisma.dataAccessConsent.findUnique({
        where: {
          id,
        },
      });

    if (!consent) {
      throw new NotFoundException(
        'Data access consent not found.',
      );
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

    if (
      dto.grantedToUserId &&
      dto.grantedToUserId !== consent.grantedToUserId
    ) {
      const user =
        await this.prisma.user.findUnique({
          where: {
            id: dto.grantedToUserId,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'User not found.',
        );
      }
    }

    return this.prisma.dataAccessConsent.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: {
        patient: true,
        grantedTo: true,
      },
    });
  }
}