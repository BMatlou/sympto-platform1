import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateClaimStatusHistoryDto } from './dto/create-claim-status-history.dto';
import { QueryClaimStatusHistoryDto } from './dto/query-claim-status-history.dto';
import { UpdateClaimStatusHistoryDto } from './dto/update-claim-status-history.dto';

@Injectable()
export class ClaimStatusHistoryService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateClaimStatusHistoryDto,
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

    return this.prisma.claimStatusHistory.create({
      data: {
        claimId: dto.claimId,
        status: dto.status,
        notes: dto.notes,
      },

      include: {
        claim: true,
      },
    });
  }

    async findAll(
    query: QueryClaimStatusHistoryDto,
  ) {
    const {
      page,
      limit,
      claimId,
      status,
    } = query;

    const where: Prisma.ClaimStatusHistoryWhereInput = {
      ...(claimId && {
        claimId,
      }),

      ...(status && {
        status,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.claimStatusHistory.findMany({
          where,

          include: {
            claim: true,
          },

          orderBy: {
            changedAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.claimStatusHistory.count({
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
    const history =
      await this.prisma.claimStatusHistory.findUnique({
        where: {
          id,
        },

        include: {
          claim: true,
        },
      });

    if (!history) {
      throw new NotFoundException(
        'Claim status history not found.',
      );
    }

    return history;
  }

    async update(
    id: string,
    dto: UpdateClaimStatusHistoryDto,
  ) {
    const existing =
      await this.prisma.claimStatusHistory.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Claim status history not found.',
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

    return this.prisma.claimStatusHistory.update({
      where: {
        id,
      },

      data: {
        claimId: dto.claimId,
        status: dto.status,
        notes: dto.notes,
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
      await this.prisma.claimStatusHistory.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Claim status history not found.',
      );
    }

    await this.prisma.claimStatusHistory.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Claim status history deleted successfully.',
    };
  }
}