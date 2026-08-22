import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateReferralFeedbackDto } from './dto/create-referral-feedback.dto';
import { UpdateReferralFeedbackDto } from './dto/update-referral-feedback.dto';
import { QueryReferralFeedbackDto } from './dto/query-referral-feedback.dto';

@Injectable()
export class ReferralFeedbackService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateReferralFeedbackDto,
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

    const existing =
      await this.prisma.referralFeedback.findUnique({
        where: {
          referralId: dto.referralId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Referral feedback already exists.',
      );
    }

    return this.prisma.referralFeedback.create({
      data: {
        referralId: dto.referralId,
        diagnosis: dto.diagnosis,
        recommendations:
          dto.recommendations,
        followUpRequired:
          dto.followUpRequired ??
          false,
        followUpNotes:
          dto.followUpNotes,
      },

      include: {
        referral: true,
      },
    });
  }

  async findAll(
    query: QueryReferralFeedbackDto,
  ) {
    const {
      page,
      limit,
      referralId,
      followUpRequired,
    } = query;

    const where = {
      ...(referralId && {
        referralId,
      }),

      ...(followUpRequired !==
        undefined && {
        followUpRequired,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.referralFeedback.findMany({
          where,

          include: {
            referral: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.referralFeedback.count({
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
    const feedback =
      await this.prisma.referralFeedback.findUnique({
        where: {
          id,
        },

        include: {
          referral: true,
        },
      });

    if (!feedback) {
      throw new NotFoundException(
        'Referral feedback not found.',
      );
    }

    return feedback;
  }

  async update(
    id: string,
    dto: UpdateReferralFeedbackDto,
  ) {
    await this.findOne(id);

    if (
      dto.referralId
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
    }

    return this.prisma.referralFeedback.update({
      where: {
        id,
      },

      data: {
        referralId:
          dto.referralId,
        diagnosis:
          dto.diagnosis,
        recommendations:
          dto.recommendations,
        followUpRequired:
          dto.followUpRequired,
        followUpNotes:
          dto.followUpNotes,
      },

      include: {
        referral: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.referralFeedback.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Referral feedback deleted successfully.',
    };
  }
}