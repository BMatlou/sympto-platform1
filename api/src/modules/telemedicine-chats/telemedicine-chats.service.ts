import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateTelemedicineChatDto } from './dto/create-telemedicine-chat.dto';
import { QueryTelemedicineChatDto } from './dto/query-telemedicine-chat.dto';
import { UpdateTelemedicineChatDto } from './dto/update-telemedicine-chat.dto';

@Injectable()
export class TelemedicineChatsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateTelemedicineChatDto,
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

    const sender =
      await this.prisma.user.findUnique({
        where: {
          id: dto.senderId,
        },
      });

    if (!sender) {
      throw new NotFoundException(
        'Sender not found.',
      );
    }

    return this.prisma.telemedicineChat.create({
      data: {
        sessionId: dto.sessionId,
        senderId: dto.senderId,
        message: dto.message,
      },

      include: {
        session: true,
        sender: true,
      },
    });
  }

  async findAll(
    query: QueryTelemedicineChatDto,
  ) {
    const {
      page,
      limit,
      sessionId,
      senderId,
    } = query;

    const where: Prisma.TelemedicineChatWhereInput =
      {
        ...(sessionId && {
          sessionId,
        }),

        ...(senderId && {
          senderId,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.telemedicineChat.findMany({
          where,

          include: {
            session: true,
            sender: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.telemedicineChat.count({
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
    const chat =
      await this.prisma.telemedicineChat.findUnique({
        where: {
          id,
        },

        include: {
          session: true,
          sender: true,
        },
      });

    if (!chat) {
      throw new NotFoundException(
        'Telemedicine chat not found.',
      );
    }

    return chat;
  }

  async update(
    id: string,
    dto: UpdateTelemedicineChatDto,
  ) {
    const chat =
      await this.prisma.telemedicineChat.findUnique({
        where: {
          id,
        },
      });

    if (!chat) {
      throw new NotFoundException(
        'Telemedicine chat not found.',
      );
    }

    if (
      dto.sessionId &&
      dto.sessionId !== chat.sessionId
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
      dto.senderId &&
      dto.senderId !== chat.senderId
    ) {
      const sender =
        await this.prisma.user.findUnique({
          where: {
            id: dto.senderId,
          },
        });

      if (!sender) {
        throw new NotFoundException(
          'Sender not found.',
        );
      }
    }

    return this.prisma.telemedicineChat.update({
      where: {
        id,
      },

      data: {
        ...(dto.sessionId !== undefined && {
          sessionId: dto.sessionId,
        }),

        ...(dto.senderId !== undefined && {
          senderId: dto.senderId,
        }),

        ...(dto.message !== undefined && {
          message: dto.message,
        }),
      },

      include: {
        session: true,
        sender: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const chat =
      await this.prisma.telemedicineChat.findUnique({
        where: {
          id,
        },
      });

    if (!chat) {
      throw new NotFoundException(
        'Telemedicine chat not found.',
      );
    }

    await this.prisma.telemedicineChat.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Telemedicine chat deleted successfully.',
    };
  }
}