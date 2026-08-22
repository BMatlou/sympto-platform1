import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ClaimStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateClaimDto } from './dto/create-claim.dto';
import { QueryClaimDto } from './dto/query-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';

@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateClaimDto,
  ) {
    const [
      patient,
      invoice,
    ] = await Promise.all([
      this.prisma.patient.findUnique({
        where: {
          id: dto.patientId,
        },
      }),

      this.prisma.invoice.findUnique({
        where: {
          id: dto.invoiceId,
        },
      }),
    ]);

    if (!patient) {
      throw new NotFoundException(
        'Patient not found.',
      );
    }

    if (!invoice) {
      throw new NotFoundException(
        'Invoice not found.',
      );
    }

    if (dto.patientInsuranceId) {
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
    }

    if (dto.insurancePolicyId) {
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
    }

    const duplicate =
      await this.prisma.claim.findFirst({
        where: {
          OR: [
            {
              claimNumber:
                dto.claimNumber,
            },
            {
              invoiceId:
                dto.invoiceId,
            },
          ],
        },
      });

    if (duplicate) {
      throw new ConflictException(
        'Claim already exists.',
      );
    }

    return this.prisma.claim.create({
      data: {
        patientId:
          dto.patientId,

        invoiceId:
          dto.invoiceId,

        patientInsuranceId:
          dto.patientInsuranceId,

        insurancePolicyId:
          dto.insurancePolicyId,

        claimNumber:
          dto.claimNumber,

        status:
          dto.status ??
          ClaimStatus.DRAFT,

        approvedAmount:
          dto.approvedAmount
            ? new Prisma.Decimal(
                dto.approvedAmount,
              )
            : undefined,

        rejectedReason:
          dto.rejectedReason,
      },

      include: {
        patient: true,
        invoice: true,
        patientInsurance: true,
        insurancePolicy: true,
        claimDocuments: true,
        payments: true,
        statusHistory: true,
      },
    });
  }

    async findAll(
    query: QueryClaimDto,
  ) {
    const {
      page,
      limit,
      patientId,
      invoiceId,
      patientInsuranceId,
      insurancePolicyId,
      status,
      claimNumber,
    } = query;

    const where: Prisma.ClaimWhereInput = {
      ...(patientId && {
        patientId,
      }),

      ...(invoiceId && {
        invoiceId,
      }),

      ...(patientInsuranceId && {
        patientInsuranceId,
      }),

      ...(insurancePolicyId && {
        insurancePolicyId,
      }),

      ...(status && {
        status,
      }),

      ...(claimNumber && {
        claimNumber: {
          contains: claimNumber,
          mode: 'insensitive',
        },
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.claim.findMany({
          where,

          include: {
            patient: true,
            invoice: true,
            patientInsurance: true,
            insurancePolicy: true,
            claimDocuments: true,
            payments: true,
            statusHistory: true,
          },

          orderBy: {
            submittedAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.claim.count({
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
    const claim =
      await this.prisma.claim.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          invoice: true,
          patientInsurance: true,
          insurancePolicy: true,
          claimDocuments: true,
          payments: true,
          statusHistory: true,
        },
      });

    if (!claim) {
      throw new NotFoundException(
        'Claim not found.',
      );
    }

    return claim;
  }

    async update(
    id: string,
    dto: UpdateClaimDto,
  ) {
    const existing =
      await this.prisma.claim.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Claim not found.',
      );
    }

    if (
      dto.claimNumber &&
      dto.claimNumber !==
        existing.claimNumber
    ) {
      const duplicate =
        await this.prisma.claim.findUnique({
          where: {
            claimNumber:
              dto.claimNumber,
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'Claim number already exists.',
        );
      }
    }

    return this.prisma.claim.update({
      where: {
        id,
      },

      data: {
        patientId:
          dto.patientId,
        invoiceId:
          dto.invoiceId,
        patientInsuranceId:
          dto.patientInsuranceId,
        insurancePolicyId:
          dto.insurancePolicyId,
        claimNumber:
          dto.claimNumber,
        status:
          dto.status,
        approvedAmount:
          dto.approvedAmount
            ? new Prisma.Decimal(
                dto.approvedAmount,
              )
            : undefined,
        rejectedReason:
          dto.rejectedReason,
      },

      include: {
        patient: true,
        invoice: true,
        patientInsurance: true,
        insurancePolicy: true,
        claimDocuments: true,
        payments: true,
        statusHistory: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const existing =
      await this.prisma.claim.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Claim not found.',
      );
    }

    await this.prisma.claim.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Claim deleted successfully.',
    };
  }
}