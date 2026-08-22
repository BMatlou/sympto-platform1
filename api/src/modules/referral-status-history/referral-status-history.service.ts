import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateReferralStatusHistoryDto } from './dto/create-referral-status-history.dto';
import { UpdateReferralStatusHistoryDto } from './dto/update-referral-status-history.dto';
import { QueryReferralStatusHistoryDto } from './dto/query-referral-status-history.dto';

@Injectable()
export class ReferralStatusHistoryService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateReferralStatusHistoryDto,
  ) {
    const referral =
      await this.prisma.referral.findUnique({
        where: {
          id: dto.referralId,
        },
      });

    if (!referral) {
      throw new NotFoundException(
        'Referral not found.',
      );
    }

    return this.prisma.referralStatusHistory.create({
      data: {
        referralId: dto.referralId,
        status: dto.status,
        notes: dto.notes,
      },

      include: {
        referral: true,
      },
    });
  }

  async findAll(
    query: QueryReferralStatusHistoryDto,
  ) {
    const {
      page,
      limit,
      referralId,
      status,
    } = query;

    const where: Prisma.ReferralStatusHistoryWhereInput =
      {
        ...(referralId && {
          referralId,
        }),

        ...(status && {
          status,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.referralStatusHistory.findMany({
          where,

          include: {
            referral: true,
          },

          orderBy: {
            changedAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.referralStatusHistory.count({
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

  async findOne(id: string) {
    const history =
      await this.prisma.referralStatusHistory.findUnique({
        where: {
          id,
        },

        include: {
          referral: true,
        },
      });

    if (!history) {
      throw new NotFoundException(
        'Referral status history not found.',
      );
    }

    return history;
  }

  async update(
    id: string,
    dto: UpdateReferralStatusHistoryDto,
  ) {
    await this.findOne(id);

    if (dto.referralId) {
      const referral =
        await this.prisma.referral.findUnique({
          where: {
            id: dto.referralId,
          },
        });

      if (!referral) {
        throw new NotFoundException(
          'Referral not found.',
        );
      }
    }

    return this.prisma.referralStatusHistory.update({
      where: {
        id,
      },

      data: {
        referralId: dto.referralId,
        status: dto.status,
        notes: dto.notes,
      },

      include: {
        referral: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.referralStatusHistory.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Referral status history deleted successfully.',
    };
  }
}