import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  VerificationStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateVerificationRequestDto } from './dto/create-verification-request.dto';
import { UpdateVerificationRequestDto } from './dto/update-verification-request.dto';
import { QueryVerificationRequestDto } from './dto/query-verification-request.dto';

@Injectable()
export class VerificationRequestsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateVerificationRequestDto,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: dto.userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found.',
      );
    }

    const existing =
      await this.prisma.verificationRequest.findFirst({
        where: {
          userId: dto.userId,
          type: dto.type,
          status: VerificationStatus.PENDING,
        },
      });

    if (existing) {
      throw new ConflictException(
        'A pending verification request already exists for this user and verification type.',
      );
    }

    return this.prisma.verificationRequest.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        status:
          dto.status ??
          VerificationStatus.PENDING,
        reviewerNotes: dto.reviewerNotes,
        reviewedAt:
          dto.status &&
          dto.status !== VerificationStatus.PENDING
            ? new Date()
            : null,
      },

      include: {
        user: {
          include: {
            person: true,
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(
    query: QueryVerificationRequestDto,
  ) {
    const {
      page,
      limit,
      userId,
      type,
      status,
    } = query;

    const where: Prisma.VerificationRequestWhereInput = {
      ...(userId && {
        userId,
      }),

      ...(type && {
        type,
      }),

      ...(status && {
        status,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.verificationRequest.findMany({
          where,

          include: {
            user: {
              include: {
                person: true,
                roles: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          },

          orderBy: {
            submittedAt: 'desc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.verificationRequest.count({
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
    const request =
      await this.prisma.verificationRequest.findUnique({
        where: {
          id,
        },

        include: {
          user: {
            include: {
              person: true,
              roles: {
                include: {
                  role: true,
                },
              },
            },
          },
        },
      });

    if (!request) {
      throw new NotFoundException(
        'Verification request not found.',
      );
    }

    return request;
  }

  async update(
    id: string,
    dto: UpdateVerificationRequestDto,
  ) {
    const existing =
      await this.findOne(id);

    if (dto.userId) {
      const user =
        await this.prisma.user.findUnique({
          where: {
            id: dto.userId,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'User not found.',
        );
      }
    }

    if (
      dto.userId ||
      dto.type ||
      dto.status === VerificationStatus.PENDING
    ) {
      const duplicate =
        await this.prisma.verificationRequest.findFirst({
          where: {
            id: {
              not: id,
            },
            userId:
              dto.userId ??
              existing.userId,
            type:
              dto.type ??
              existing.type,
            status:
              VerificationStatus.PENDING,
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'A pending verification request already exists for this user and verification type.',
        );
      }
    }

    const reviewedAt =
      dto.status &&
      dto.status !== VerificationStatus.PENDING
        ? new Date()
        : existing.reviewedAt;

    return this.prisma.verificationRequest.update({
      where: {
        id,
      },

      data: {
        userId: dto.userId,
        type: dto.type,
        status: dto.status,
        reviewerNotes: dto.reviewerNotes,
        reviewedAt,
      },

      include: {
        user: {
          include: {
            person: true,
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.verificationRequest.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Verification request deleted successfully.',
    };
  }
}