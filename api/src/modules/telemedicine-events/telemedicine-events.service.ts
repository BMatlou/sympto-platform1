import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateTelemedicineEventDto } from './dto/create-telemedicine-event.dto';
import { QueryTelemedicineEventDto } from './dto/query-telemedicine-event.dto';
import { UpdateTelemedicineEventDto } from './dto/update-telemedicine-event.dto';

@Injectable()
export class TelemedicineEventsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateTelemedicineEventDto,
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

    return this.prisma.telemedicineEvent.create({
      data: {
        sessionId: dto.sessionId,
        userId: dto.userId,
        type: dto.type,
        description:
          dto.description,
      },

      include: {
        session: true,
        user: true,
      },
    });
  }

  async findAll(
    query: QueryTelemedicineEventDto,
  ) {
    const {
      page,
      limit,
      sessionId,
      userId,
      type,
    } = query;

    const where: Prisma.TelemedicineEventWhereInput =
      {
        ...(sessionId && {
          sessionId,
        }),

        ...(userId && {
          userId,
        }),

        ...(type && {
          type,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.telemedicineEvent.findMany({
          where,

          include: {
            session: true,
            user: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.telemedicineEvent.count({
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
    const event =
      await this.prisma.telemedicineEvent.findUnique({
        where: {
          id,
        },

        include: {
          session: true,
          user: true,
        },
      });

    if (!event) {
      throw new NotFoundException(
        'Telemedicine event not found.',
      );
    }

    return event;
  }

  async update(
    id: string,
    dto: UpdateTelemedicineEventDto,
  ) {
    const event =
      await this.prisma.telemedicineEvent.findUnique({
        where: {
          id,
        },
      });

    if (!event) {
      throw new NotFoundException(
        'Telemedicine event not found.',
      );
    }

    if (
      dto.sessionId &&
      dto.sessionId !== event.sessionId
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
      dto.userId !== event.userId
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

    return this.prisma.telemedicineEvent.update({
      where: {
        id,
      },

      data: {
        ...(dto.sessionId !== undefined && {
          sessionId: dto.sessionId,
        }),

        ...(dto.userId !== undefined && {
          userId: dto.userId,
        }),

        ...(dto.type !== undefined && {
          type: dto.type,
        }),

        ...(dto.description !== undefined && {
          description: dto.description,
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
    const event =
      await this.prisma.telemedicineEvent.findUnique({
        where: {
          id,
        },
      });

    if (!event) {
      throw new NotFoundException(
        'Telemedicine event not found.',
      );
    }

    await this.prisma.telemedicineEvent.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Telemedicine event deleted successfully.',
    };
  }
}