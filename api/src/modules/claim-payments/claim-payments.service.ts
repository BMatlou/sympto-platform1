import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateClaimPaymentDto } from './dto/create-claim-payment.dto';
import { QueryClaimPaymentDto } from './dto/query-claim-payment.dto';
import { UpdateClaimPaymentDto } from './dto/update-claim-payment.dto';

@Injectable()
export class ClaimPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateClaimPaymentDto,
  ) {
    const claim =
      await this.prisma.claim.findUnique({
        where: {
          id: dto.claimId,
        },
      });

    if (!claim) {
      throw new NotFoundException(
        'Claim not found.',
      );
    }

    return this.prisma.claimPayment.create({
      data: {
        claimId: dto.claimId,

        amount: new Prisma.Decimal(
          dto.amount,
        ),

        paidAt: new Date(
          dto.paidAt,
        ),

        reference:
          dto.reference,
      },

      include: {
        claim: true,
      },
    });
  }

    async findAll(
    query: QueryClaimPaymentDto,
  ) {
    const {
      page,
      limit,
      claimId,
    } = query;

    const where: Prisma.ClaimPaymentWhereInput = {
      ...(claimId && {
        claimId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.claimPayment.findMany({
          where,

          include: {
            claim: true,
          },

          orderBy: {
            paidAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.claimPayment.count({
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
    const payment =
      await this.prisma.claimPayment.findUnique({
        where: {
          id,
        },

        include: {
          claim: true,
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'Claim payment not found.',
      );
    }

    return payment;
  }

    async update(
    id: string,
    dto: UpdateClaimPaymentDto,
  ) {
    const existing =
      await this.prisma.claimPayment.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Claim payment not found.',
      );
    }

    if (dto.claimId) {
      const claim =
        await this.prisma.claim.findUnique({
          where: {
            id: dto.claimId,
          },
        });

      if (!claim) {
        throw new NotFoundException(
          'Claim not found.',
        );
      }
    }

    return this.prisma.claimPayment.update({
      where: {
        id,
      },

      data: {
        claimId: dto.claimId,

        amount:
          dto.amount !== undefined
            ? new Prisma.Decimal(
                dto.amount,
              )
            : undefined,

        paidAt:
          dto.paidAt
            ? new Date(
                dto.paidAt,
              )
            : undefined,

        reference:
          dto.reference,
      },

      include: {
        claim: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const existing =
      await this.prisma.claimPayment.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Claim payment not found.',
      );
    }

    await this.prisma.claimPayment.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Claim payment deleted successfully.',
    };
  }
}