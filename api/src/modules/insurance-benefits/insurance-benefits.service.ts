import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateInsuranceBenefitDto } from './dto/create-insurance-benefit.dto';
import { QueryInsuranceBenefitDto } from './dto/query-insurance-benefit.dto';
import { UpdateInsuranceBenefitDto } from './dto/update-insurance-benefit.dto';

@Injectable()
export class InsuranceBenefitsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateInsuranceBenefitDto,
  ) {
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

    return this.prisma.insuranceBenefit.create({
      data: {
        insurancePolicyId:
          dto.insurancePolicyId,
        coverageType:
          dto.coverageType,
        description:
          dto.description,
        annualLimit:
          dto.annualLimit
            ? new Prisma.Decimal(
                dto.annualLimit,
              )
            : undefined,
        coPayment:
          dto.coPayment
            ? new Prisma.Decimal(
                dto.coPayment,
              )
            : undefined,
        deductible:
          dto.deductible
            ? new Prisma.Decimal(
                dto.deductible,
              )
            : undefined,
      },

      include: {
        insurancePolicy: {
          include: {
            provider: true,
          },
        },
      },
    });
  }

    async findAll(
    query: QueryInsuranceBenefitDto,
  ) {
    const {
      page,
      limit,
      insurancePolicyId,
      coverageType,
    } = query;

    const where: Prisma.InsuranceBenefitWhereInput = {
      ...(insurancePolicyId && {
        insurancePolicyId,
      }),

      ...(coverageType && {
        coverageType,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.insuranceBenefit.findMany({
          where,

          include: {
            insurancePolicy: {
              include: {
                provider: true,
              },
            },
          },

          orderBy: {
            coverageType: 'asc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.insuranceBenefit.count({
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
    const benefit =
      await this.prisma.insuranceBenefit.findUnique({
        where: {
          id,
        },

        include: {
          insurancePolicy: {
            include: {
              provider: true,
            },
          },
        },
      });

    if (!benefit) {
      throw new NotFoundException(
        'Insurance benefit not found.',
      );
    }

    return benefit;
  }

    async update(
    id: string,
    dto: UpdateInsuranceBenefitDto,
  ) {
    const existing =
      await this.prisma.insuranceBenefit.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Insurance benefit not found.',
      );
    }

    return this.prisma.insuranceBenefit.update({
      where: {
        id,
      },

      data: {
        insurancePolicyId:
          dto.insurancePolicyId,
        coverageType:
          dto.coverageType,
        description:
          dto.description,
        annualLimit:
          dto.annualLimit
            ? new Prisma.Decimal(
                dto.annualLimit,
              )
            : undefined,
        coPayment:
          dto.coPayment
            ? new Prisma.Decimal(
                dto.coPayment,
              )
            : undefined,
        deductible:
          dto.deductible
            ? new Prisma.Decimal(
                dto.deductible,
              )
            : undefined,
      },

      include: {
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
      await this.prisma.insuranceBenefit.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Insurance benefit not found.',
      );
    }

    await this.prisma.insuranceBenefit.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Insurance benefit deleted successfully.',
    };
  }
}