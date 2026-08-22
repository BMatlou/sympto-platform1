import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateTelemedicineParticipantDto } from './dto/create-telemedicine-participant.dto';
import { QueryTelemedicineParticipantDto } from './dto/query-telemedicine-participant.dto';
import { UpdateTelemedicineParticipantDto } from './dto/update-telemedicine-participant.dto';

@Injectable()
export class TelemedicineParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateTelemedicineParticipantDto,
  ) {
    const session =
      await this.prisma.telemedicineSession.findUnique({
        where: {
          id: dto.sessionId,
        },
      });

    if (!session) {
      throw new NotFoundException(
        'Telemedicine session not found.',
      );
    }

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
      await this.prisma.telemedicineParticipant.findFirst({
        where: {
          sessionId: dto.sessionId,
          userId: dto.userId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'User is already a participant in this session.',
      );
    }

    return this.prisma.telemedicineParticipant.create({
      data: {
        sessionId: dto.sessionId,
        userId: dto.userId,
        role: dto.role,
        status:
          dto.status,
        joinedAt:
          dto.joinedAt,
        leftAt:
          dto.leftAt,
      },

      include: {
        session: true,
        user: true,
      },
    });
  }

  async findAll(
    query: QueryTelemedicineParticipantDto,
  ) {
    const {
      page,
      limit,
      sessionId,
      userId,
      role,
      status,
    } = query;

    const where: Prisma.TelemedicineParticipantWhereInput =
      {
        ...(sessionId && {
          sessionId,
        }),

        ...(userId && {
          userId,
        }),

        ...(role && {
          role,
        }),

        ...(status && {
          status,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.telemedicineParticipant.findMany({
          where,

          include: {
            session: true,
            user: true,
          },

          orderBy: {
            joinedAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.telemedicineParticipant.count({
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
    const participant =
      await this.prisma.telemedicineParticipant.findUnique({
        where: {
          id,
        },

        include: {
          session: true,
          user: true,
        },
      });

    if (!participant) {
      throw new NotFoundException(
        'Telemedicine participant not found.',
      );
    }

    return participant;
  }

  async update(
    id: string,
    dto: UpdateTelemedicineParticipantDto,
  ) {
    const participant =
      await this.prisma.telemedicineParticipant.findUnique({
        where: {
          id,
        },
      });

    if (!participant) {
      throw new NotFoundException(
        'Telemedicine participant not found.',
      );
    }

    if (
      dto.sessionId &&
      dto.sessionId !==
        participant.sessionId
    ) {
      const session =
        await this.prisma.telemedicineSession.findUnique({
          where: {
            id: dto.sessionId,
          },
        });

      if (!session) {
        throw new NotFoundException(
          'Telemedicine session not found.',
        );
      }
    }

    if (
      dto.userId &&
      dto.userId !==
        participant.userId
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
    }

    if (
      dto.sessionId ||
      dto.userId
    ) {
      const existing =
        await this.prisma.telemedicineParticipant.findFirst({
          where: {
            sessionId:
              dto.sessionId ??
              participant.sessionId,

            userId:
              dto.userId ??
              participant.userId,
          },
        });

      if (
        existing &&
        existing.id !== id
      ) {
        throw new ConflictException(
          'User is already a participant in this session.',
        );
      }
    }

    return this.prisma.telemedicineParticipant.update({
      where: {
        id,
      },

      data: {
        ...(dto.sessionId !== undefined && {
          sessionId:
            dto.sessionId,
        }),

        ...(dto.userId !== undefined && {
          userId:
            dto.userId,
        }),

        ...(dto.role !== undefined && {
          role:
            dto.role,
        }),

        ...(dto.status !== undefined && {
          status:
            dto.status,
        }),

        ...(dto.joinedAt !== undefined && {
          joinedAt:
            dto.joinedAt,
        }),

        ...(dto.leftAt !== undefined && {
          leftAt:
            dto.leftAt,
        }),
      },

      include: {
        session: true,
        user: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const participant =
      await this.prisma.telemedicineParticipant.findUnique({
        where: {
          id,
        },
      });

    if (!participant) {
      throw new NotFoundException(
        'Telemedicine participant not found.',
      );
    }

    await this.prisma.telemedicineParticipant.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Telemedicine participant removed successfully.',
    };
  }
}