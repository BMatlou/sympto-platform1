import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePatientInsuranceDto } from './dto/create-patient-insurance.dto';
import { QueryPatientInsuranceDto } from './dto/query-patient-insurance.dto';
import { UpdatePatientInsuranceDto } from './dto/update-patient-insurance.dto';

@Injectable()
export class PatientInsuranceService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePatientInsuranceDto,
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

    const policy =
      await this.prisma.insurancePolicy.findUnique({
        where: {
          id: dto.insurancePolicyId,
        },
      });

    if (!policy) {
      throw new NotFoundException(
        'Insurance policy not found.',
      );
    }

    const existing =
      await this.prisma.patientInsurance.findFirst({
        where: {
          membershipNumber:
            dto.membershipNumber,
          insurancePolicyId:
            dto.insurancePolicyId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Membership already exists for this policy.',
      );
    }

    return this.prisma.patientInsurance.create({
      data: {
        patientId:
          dto.patientId,
        insurancePolicyId:
          dto.insurancePolicyId,
        membershipNumber:
          dto.membershipNumber,
        dependantCode:
          dto.dependantCode,
        principalMemberName:
          dto.principalMemberName,
        relationship:
          dto.relationship,
        effectiveFrom:
          dto.effectiveFrom,
        effectiveTo:
          dto.effectiveTo,
        active:
          dto.active ?? true,
      },

      include: {
        patient: true,
        insurancePolicy: {
          include: {
            provider: true,
          },
        },
      },
    });
  }

    async findAll(
    query: QueryPatientInsuranceDto,
  ) {
    const {
      page,
      limit,
      patientId,
      insurancePolicyId,
      membershipNumber,
      active,
    } = query;

    const where: Prisma.PatientInsuranceWhereInput = {
      ...(patientId && {
        patientId,
      }),

      ...(insurancePolicyId && {
        insurancePolicyId,
      }),

      ...(membershipNumber && {
        membershipNumber: {
          contains:
            membershipNumber,
          mode: 'insensitive',
        },
      }),

      ...(active !== undefined && {
        active,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.patientInsurance.findMany({
          where,

          include: {
            patient: true,

            insurancePolicy: {
              include: {
                provider: true,
              },
            },

            authorizations: true,
            claims: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.patientInsurance.count({
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
    const patientInsurance =
      await this.prisma.patientInsurance.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,

          insurancePolicy: {
            include: {
              provider: true,
              benefits: true,
            },
          },

          authorizations: true,
          claims: true,
        },
      });

    if (!patientInsurance) {
      throw new NotFoundException(
        'Patient insurance not found.',
      );
    }

    return patientInsurance;
  }

    async update(
    id: string,
    dto: UpdatePatientInsuranceDto,
  ) {
    const existing =
      await this.prisma.patientInsurance.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Patient insurance not found.',
      );
    }

    if (
      dto.membershipNumber &&
      (dto.membershipNumber !==
        existing.membershipNumber ||
        dto.insurancePolicyId)
    ) {
      const duplicate =
        await this.prisma.patientInsurance.findFirst({
          where: {
            membershipNumber:
              dto.membershipNumber,
            insurancePolicyId:
              dto.insurancePolicyId ??
              existing.insurancePolicyId,
            NOT: {
              id,
            },
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'Membership already exists for this policy.',
        );
      }
    }

    return this.prisma.patientInsurance.update({
      where: {
        id,
      },

      data: {
        patientId: dto.patientId,
        insurancePolicyId:
          dto.insurancePolicyId,
        membershipNumber:
          dto.membershipNumber,
        dependantCode:
          dto.dependantCode,
        principalMemberName:
          dto.principalMemberName,
        relationship:
          dto.relationship,
        effectiveFrom:
          dto.effectiveFrom,
        effectiveTo:
          dto.effectiveTo,
        active:
          dto.active,
      },

      include: {
        patient: true,
        insurancePolicy: {
          include: {
            provider: true,
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    const existing =
      await this.prisma.patientInsurance.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Patient insurance not found.',
      );
    }

    await this.prisma.patientInsurance.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Patient insurance deleted successfully.',
    };
  }
}