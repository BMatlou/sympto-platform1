import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PolicyStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateInsurancePolicyDto } from './dto/create-insurance-policy.dto';
import { QueryInsurancePolicyDto } from './dto/query-insurance-policy.dto';
import { UpdateInsurancePolicyDto } from './dto/update-insurance-policy.dto';

@Injectable()
export class InsurancePoliciesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateInsurancePolicyDto,
  ) {
    const provider =
      await this.prisma.insuranceProvider.findUnique({
        where: {
          id: dto.providerId,
        },
      });

    if (!provider) {
      throw new NotFoundException(
        'Insurance provider not found.',
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

    const existing =
      await this.prisma.insurancePolicy.findUnique({
        where: {
          code: dto.code,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Insurance policy code already exists.',
      );
    }

    return this.prisma.insurancePolicy.create({
      data: {
        providerId:
          dto.providerId,
        patientId:
          dto.patientId,
        code: dto.code,
        name: dto.name,
        description:
          dto.description,
        status:
          dto.status ??
          PolicyStatus.ACTIVE,
        annualLimit:
          dto.annualLimit
            ? new Prisma.Decimal(
                dto.annualLimit,
              )
            : undefined,
        deductible:
          dto.deductible
            ? new Prisma.Decimal(
                dto.deductible,
              )
            : undefined,
        coPayment:
          dto.coPayment
            ? new Prisma.Decimal(
                dto.coPayment,
              )
            : undefined,
      },

      include: {
        provider: true,
        patient: true,
      },
    });
  }

    async findAll(
    query: QueryInsurancePolicyDto,
  ) {
    const {
      page,
      limit,
      providerId,
      patientId,
      status,
      search,
    } = query;

    const where: Prisma.InsurancePolicyWhereInput = {
      ...(providerId && {
        providerId,
      }),

      ...(patientId && {
        patientId,
      }),

      ...(status && {
        status,
      }),

      ...(search && {
        OR: [
          {
            code: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.insurancePolicy.findMany({
          where,

          include: {
            provider: true,
            patient: true,
            benefits: true,
          },

          orderBy: {
            name: 'asc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.insurancePolicy.count({
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
    const policy =
      await this.prisma.insurancePolicy.findUnique({
        where: {
          id,
        },

        include: {
          provider: true,
          patient: true,
          benefits: true,
          claims: true,
        },
      });

    if (!policy) {
      throw new NotFoundException(
        'Insurance policy not found.',
      );
    }

    return policy;
  }

    async update(
    id: string,
    dto: UpdateInsurancePolicyDto,
  ) {
    const existing =
      await this.prisma.insurancePolicy.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Insurance policy not found.',
      );
    }

    if (dto.providerId) {
  const provider =
    await this.prisma.insuranceProvider.findUnique({
      where: {
        id: dto.providerId,
      },
    });

  if (!provider) {
    throw new NotFoundException(
      'Insurance provider not found.',
    );
  }
}

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

    if (
      dto.code &&
      dto.code !== existing.code
    ) {
      const duplicate =
        await this.prisma.insurancePolicy.findUnique({
          where: {
            code: dto.code,
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'Insurance policy code already exists.',
        );
      }
    }

    return this.prisma.insurancePolicy.update({
      where: {
        id,
      },

      data: {
        providerId:
          dto.providerId,
        patientId:
          dto.patientId,
        code: dto.code,
        name: dto.name,
        description:
          dto.description,
        status:
          dto.status,
       annualLimit:
  dto.annualLimit !== undefined
    ? new Prisma.Decimal(dto.annualLimit)
    : undefined,
        deductible:
  dto.deductible !== undefined
    ? new Prisma.Decimal(dto.deductible)
    : undefined,
        coPayment:
  dto.coPayment !== undefined
    ? new Prisma.Decimal(dto.coPayment)
    : undefined,
      },

      include: {
        provider: true,
        patient: true,
        benefits: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const policy =
      await this.prisma.insurancePolicy.findUnique({
        where: {
          id,
        },
      });

    if (!policy) {
      throw new NotFoundException(
        'Insurance policy not found.',
      );
    }

    await this.prisma.insurancePolicy.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Insurance policy deleted successfully.',
    };
  }
}