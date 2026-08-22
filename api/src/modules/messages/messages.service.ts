import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateMessageDto } from './dto/create-message.dto';
import { QueryMessageDto } from './dto/query-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateMessageDto,
  ) {
    const conversation =
      await this.prisma.conversation.findUnique({
        where: {
          id: dto.conversationId,
        },
      });

    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found.',
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

    const participant =
      await this.prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: dto.conversationId,
            userId: dto.senderId,
          },
        },
      });

    if (!participant) {
      throw new NotFoundException(
        'Sender is not a participant of this conversation.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const message =
          await tx.message.create({
            data: {
              conversationId:
                dto.conversationId,
              senderId:
                dto.senderId,
              content:
                dto.content,
              status:
                dto.status,
            },

            include: {
              sender: true,
              conversation: true,
            },
          });

        await tx.conversation.update({
          where: {
            id: dto.conversationId,
          },

          data: {
            lastMessageAt:
              message.sentAt,
          },
        });

        return message;
      },
    );
  }

    async findAll(
    query: QueryMessageDto,
  ) {
    const {
      page,
      limit,
      conversationId,
      senderId,
    } = query;

    const where: Prisma.MessageWhereInput = {
      ...(conversationId && {
        conversationId,
      }),

      ...(senderId && {
        senderId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.message.findMany({
          where,

          include: {
            sender: true,
            conversation: true,
          },

          orderBy: {
            sentAt: 'desc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.message.count({
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
    const message =
      await this.prisma.message.findUnique({
        where: {
          id,
        },

        include: {
          sender: true,
          conversation: true,
        },
      });

    if (!message) {
      throw new NotFoundException(
        'Message not found.',
      );
    }

    return message;
  }

    async update(
    id: string,
    dto: UpdateMessageDto,
  ) {
    const message =
      await this.prisma.message.findUnique({
        where: {
          id,
        },
      });

    if (!message) {
      throw new NotFoundException(
        'Message not found.',
      );
    }

    return this.prisma.message.update({
      where: {
        id,
      },

      data: {
        ...(dto.content !== undefined && {
          content: dto.content,
        }),

        ...(dto.status !== undefined && {
          status: dto.status,
        }),
      },

      include: {
        sender: true,
        conversation: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const message =
      await this.prisma.message.findUnique({
        where: {
          id,
        },
      });

    if (!message) {
      throw new NotFoundException(
        'Message not found.',
      );
    }

    await this.prisma.message.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Message deleted successfully.',
    };
  }
}