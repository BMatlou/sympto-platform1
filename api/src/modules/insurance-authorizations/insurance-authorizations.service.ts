import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AuthorizationStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateInsuranceAuthorizationDto } from './dto/create-insurance-authorization.dto';
import { QueryInsuranceAuthorizationDto } from './dto/query-insurance-authorization.dto';
import { UpdateInsuranceAuthorizationDto } from './dto/update-insurance-authorization.dto';

@Injectable()
export class InsuranceAuthorizationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateInsuranceAuthorizationDto,
  ) {
    const patientInsurance =
      await this.prisma.patientInsurance.findUnique({
        where: {
          id: dto.patientInsuranceId,
        },
      });

    if (!patientInsurance) {
      throw new NotFoundException(
        'Patient insurance not found.',
      );
    }

    const existing =
      await this.prisma.insuranceAuthorization.findUnique({
        where: {
          authorizationNumber:
            dto.authorizationNumber,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Authorization number already exists.',
      );
    }

    return this.prisma.insuranceAuthorization.create({
      data: {
        patientInsuranceId:
          dto.patientInsuranceId,
        authorizationNumber:
          dto.authorizationNumber,
        encounterId:
          dto.encounterId,
        practitionerId:
          dto.practitionerId,
        status:
          dto.status ??
          AuthorizationStatus.REQUESTED,
        reason:
          dto.reason,
        approvedAmount:
          dto.approvedAmount
            ? new Prisma.Decimal(
                dto.approvedAmount,
              )
            : undefined,
        validFrom:
          dto.validFrom,
        validTo:
          dto.validTo,
      },

      include: {
        patientInsurance: {
          include: {
            patient: true,
            insurancePolicy: {
              include: {
                provider: true,
              },
            },
          },
        },

        encounter: true,
        practitioner: true,
      },
    });
  }

    async findAll(
    query: QueryInsuranceAuthorizationDto,
  ) {
    const {
      page,
      limit,
      patientInsuranceId,
      practitionerId,
      encounterId,
      status,
    } = query;

    const where: Prisma.InsuranceAuthorizationWhereInput = {
      ...(patientInsuranceId && {
        patientInsuranceId,
      }),

      ...(practitionerId && {
        practitionerId,
      }),

      ...(encounterId && {
        encounterId,
      }),

      ...(status && {
        status,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.insuranceAuthorization.findMany({
          where,

          include: {
            patientInsurance: {
              include: {
                patient: true,
                insurancePolicy: {
                  include: {
                    provider: true,
                  },
                },
              },
            },

            encounter: true,
            practitioner: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.insuranceAuthorization.count({
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
    const authorization =
      await this.prisma.insuranceAuthorization.findUnique({
        where: {
          id,
        },

        include: {
          patientInsurance: {
            include: {
              patient: true,
              insurancePolicy: {
                include: {
                  provider: true,
                },
              },
            },
          },

          encounter: true,
          practitioner: true,
        },
      });

    if (!authorization) {
      throw new NotFoundException(
        'Insurance authorization not found.',
      );
    }

    return authorization;
  }

    async update(
    id: string,
    dto: UpdateInsuranceAuthorizationDto,
  ) {
    const existing =
      await this.prisma.insuranceAuthorization.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Insurance authorization not found.',
      );
    }

    if (
      dto.authorizationNumber &&
      dto.authorizationNumber !==
        existing.authorizationNumber
    ) {
      const duplicate =
        await this.prisma.insuranceAuthorization.findUnique({
          where: {
            authorizationNumber:
              dto.authorizationNumber,
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'Authorization number already exists.',
        );
      }
    }

    return this.prisma.insuranceAuthorization.update({
      where: {
        id,
      },

      data: {
        patientInsuranceId:
          dto.patientInsuranceId,
        authorizationNumber:
          dto.authorizationNumber,
        encounterId:
          dto.encounterId,
        practitionerId:
          dto.practitionerId,
        status:
          dto.status,
        reason:
          dto.reason,
        approvedAmount:
          dto.approvedAmount
            ? new Prisma.Decimal(
                dto.approvedAmount,
              )
            : undefined,
        validFrom:
          dto.validFrom,
        validTo:
          dto.validTo,
      },

      include: {
        patientInsurance: {
          include: {
            patient: true,
            insurancePolicy: {
              include: {
                provider: true,
              },
            },
          },
        },

        encounter: true,
        practitioner: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const existing =
      await this.prisma.insuranceAuthorization.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Insurance authorization not found.',
      );
    }

    await this.prisma.insuranceAuthorization.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Insurance authorization deleted successfully.',
    };
  }
}