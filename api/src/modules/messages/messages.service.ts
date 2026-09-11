import {
  ForbiddenException,
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

  async create(dto: CreateMessageDto, requesterUserId: string) {
    if (dto.senderId !== requesterUserId) {
      throw new ForbiddenException('You can only send messages as yourself.');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const isParticipant = conversation.participants.some(
      (participant) => participant.userId === requesterUserId,
    );

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId: dto.conversationId,
          senderId: requesterUserId,
          content: dto.content,
          status: dto.status,
        },
        include: {
          sender: true,
          conversation: true,
        },
      });

      await tx.conversation.update({
        where: { id: dto.conversationId },
        data: { lastMessageAt: message.sentAt },
      });

      return message;
    });
  }

  async findAll(query: QueryMessageDto, requesterUserId: string) {
    const { page, limit, conversationId, senderId } = query;

    const accessibleConversationFilter: Prisma.ConversationWhereInput = {
      participants: {
        some: { userId: requesterUserId },
      },
    };

    const where: Prisma.MessageWhereInput = {
      conversation: accessibleConversationFilter,
      ...(conversationId && { conversationId }),
      ...(senderId && { senderId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        include: {
          sender: true,
          conversation: true,
        },
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, requesterUserId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: {
        sender: true,
        conversation: {
          include: {
            participants: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (
      !message.conversation.participants.some(
        (participant) => participant.userId === requesterUserId,
      )
    ) {
      throw new ForbiddenException(
        'You are not a participant of this conversation.',
      );
    }

    return message;
  }

  async update(id: string, dto: UpdateMessageDto, requesterUserId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            participants: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (message.senderId !== requesterUserId) {
      throw new ForbiddenException('You can only update your own messages.');
    }

    if (
      !message.conversation.participants.some(
        (participant) => participant.userId === requesterUserId,
      )
    ) {
      throw new ForbiddenException(
        'You are not a participant of this conversation.',
      );
    }

    return this.prisma.message.update({
      where: { id },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        sender: true,
        conversation: true,
      },
    });
  }

  async remove(id: string, requesterUserId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            participants: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (message.senderId !== requesterUserId) {
      throw new ForbiddenException('You can only delete your own messages.');
    }

    if (
      !message.conversation.participants.some(
        (participant) => participant.userId === requesterUserId,
      )
    ) {
      throw new ForbiddenException(
        'You are not a participant of this conversation.',
      );
    }

    await this.prisma.message.delete({ where: { id } });

    return { message: 'Message deleted successfully.' };
  }
}
