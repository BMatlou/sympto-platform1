import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateConversationDto } from './dto/create-conversation.dto';
import { QueryConversationDto } from './dto/query-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateConversationDto,
  ) {
    const creator =
      await this.prisma.user.findUnique({
        where: {
          id: dto.createdById,
        },
      });

    if (!creator) {
      throw new NotFoundException(
        'Creator not found.',
      );
    }

    const participantIds = [
      ...new Set([
        dto.createdById,
        ...dto.participantIds,
      ]),
    ];

    const users =
      await this.prisma.user.findMany({
        where: {
          id: {
            in: participantIds,
          },
        },
      });

    if (
      users.length !== participantIds.length
    ) {
      throw new NotFoundException(
        'One or more participants were not found.',
      );
    }

    if (
      !(dto.isGroup ?? false) &&
      participantIds.length === 2
    ) {
      const existingConversations =
        await this.prisma.conversation.findMany({
          where: {
            isGroup: false,
            participants: {
              some: {
                userId: participantIds[0],
              },
            },
          },
          include: {
            participants: {
              select: {
                userId: true,
              },
            },
          },
        });

      const duplicate =
        existingConversations.find(
          (conversation) => {
            const existingIds =
              conversation.participants
                .map(
                  (participant) =>
                    participant.userId,
                )
                .sort();

            const incomingIds =
              [...participantIds].sort();

            return (
              existingIds.length ===
                incomingIds.length &&
              existingIds.every(
                (id, index) =>
                  id ===
                  incomingIds[index],
              )
            );
          },
        );

      if (duplicate) {
        throw new ConflictException(
          'A direct conversation already exists between these users.',
        );
      }
    }

    return this.prisma.$transaction(
      async (tx) => {
        const conversation =
          await tx.conversation.create({
            data: {
              title: dto.title,
              isGroup:
                dto.isGroup ?? false,
              createdById:
                dto.createdById,
              lastMessageAt: null,
            },
          });

        await tx.conversationParticipant.createMany({
          data: participantIds.map(
            (userId) => ({
              conversationId:
                conversation.id,
              userId,
            }),
          ),
        });

        return tx.conversation.findUnique({
          where: {
            id: conversation.id,
          },
          include: {
            createdBy: true,
            participants: {
              include: {
                user: true,
              },
            },
            messages: {
              include: {
                sender: true,
              },
              orderBy: {
                sentAt: 'desc',
              },
              take: 1,
            },
          },
        });
      },
    );
  }

    async findAll(
    query: QueryConversationDto,
  ) {
    const {
      page,
      limit,
      participantId,
      isGroup,
      title,
    } = query;

    const where: Prisma.ConversationWhereInput = {
      ...(typeof isGroup === 'boolean' && {
        isGroup,
      }),

      ...(title && {
        title: {
          contains: title,
          mode: 'insensitive',
        },
      }),

      ...(participantId && {
        participants: {
          some: {
            userId: participantId,
          },
        },
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.conversation.findMany({
          where,

          include: {
            createdBy: true,

            participants: {
              include: {
                user: true,
              },
            },

            messages: {
              include: {
                sender: true,
              },

              orderBy: {
                sentAt: 'desc',
              },

              take: 1,
            },
          },

          orderBy: [
            {
              lastMessageAt: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.conversation.count({
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
    const conversation =
      await this.prisma.conversation.findUnique({
        where: {
          id,
        },

        include: {
          createdBy: true,

          participants: {
            include: {
              user: true,
            },
          },

          messages: {
            include: {
              sender: true,
            },

            orderBy: {
              sentAt: 'asc',
            },
          },
        },
      });

    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found.',
      );
    }

    return conversation;
  }

    async update(
    id: string,
    dto: UpdateConversationDto,
  ) {
    const conversation =
      await this.prisma.conversation.findUnique({
        where: {
          id,
        },
      });

    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found.',
      );
    }

    return this.prisma.conversation.update({
      where: {
        id,
      },

      data: {
        ...(dto.title !== undefined && {
          title: dto.title,
        }),

        ...(dto.isGroup !== undefined && {
          isGroup: dto.isGroup,
        }),
      },

      include: {
        createdBy: true,

        participants: {
          include: {
            user: true,
          },
        },

        messages: {
          include: {
            sender: true,
          },

          orderBy: {
            sentAt: 'desc',
          },

          take: 1,
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    const conversation =
      await this.prisma.conversation.findUnique({
        where: {
          id,
        },
      });

    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found.',
      );
    }

    await this.prisma.conversation.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Conversation deleted successfully.',
    };
  }

    async addParticipant(
    conversationId: string,
    userId: string,
  ) {
    const conversation =
      await this.prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
      });

    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found.',
      );
    }

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found.',
      );
    }

    const participant =
      await this.prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      });

    if (participant) {
      throw new ConflictException(
        'User is already a participant.',
      );
    }

    await this.prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId,
      },
    });

    return this.prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },

      include: {
        createdBy: true,

        participants: {
          include: {
            user: true,
          },
        },

        messages: {
          include: {
            sender: true,
          },

          orderBy: {
            sentAt: 'desc',
          },

          take: 1,
        },
      },
    });
  }

  async removeParticipant(
    conversationId: string,
    userId: string,
  ) {
    const conversation =
      await this.prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
      });

    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found.',
      );
    }

    const participant =
      await this.prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      });

    if (!participant) {
      throw new NotFoundException(
        'Participant not found.',
      );
    }

    await this.prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    return {
      message:
        'Participant removed successfully.',
    };
  }
}