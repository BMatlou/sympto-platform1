import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { QueryNotificationTemplateDto } from './dto/query-notification-template.dto';

@Injectable()
export class NotificationTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateNotificationTemplateDto,
  ) {
    const existing =
      await this.prisma.notificationTemplate.findUnique({
        where: {
          name: dto.name,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Notification template already exists.',
      );
    }

    return this.prisma.notificationTemplate.create({
      data: {
        name: dto.name,
        type: dto.type,
        channel: dto.channel,
        subject: dto.subject,
        title: dto.title,
        body: dto.body,
        active: dto.active ?? true,
      },
    });
  }

  async findAll(
    query: QueryNotificationTemplateDto,
  ) {
    const {
      page,
      limit,
      name,
      type,
      channel,
    } = query;

    const where: Prisma.NotificationTemplateWhereInput =
      {
        ...(name && {
          name: {
            contains: name,
            mode: 'insensitive',
          },
        }),

        ...(type && {
          type,
        }),

        ...(channel && {
          channel,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.notificationTemplate.findMany({
          where,

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.notificationTemplate.count({
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
    const template =
      await this.prisma.notificationTemplate.findUnique({
        where: {
          id,
        },
      });

    if (!template) {
      throw new NotFoundException(
        'Notification template not found.',
      );
    }

    return template;
  }

  async update(
    id: string,
    dto: UpdateNotificationTemplateDto,
  ) {
    const template =
      await this.prisma.notificationTemplate.findUnique({
        where: {
          id,
        },
      });

    if (!template) {
      throw new NotFoundException(
        'Notification template not found.',
      );
    }

    if (
      dto.name &&
      dto.name !== template.name
    ) {
      const existing =
        await this.prisma.notificationTemplate.findUnique({
          where: {
            name: dto.name,
          },
        });

      if (existing) {
        throw new ConflictException(
          'Notification template name already exists.',
        );
      }
    }

    return this.prisma.notificationTemplate.update({
      where: {
        id,
      },

      data: {
        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        ...(dto.type !== undefined && {
          type: dto.type,
        }),

        ...(dto.channel !== undefined && {
          channel: dto.channel,
        }),

        ...(dto.subject !== undefined && {
          subject: dto.subject,
        }),

        ...(dto.title !== undefined && {
          title: dto.title,
        }),

        ...(dto.body !== undefined && {
          body: dto.body,
        }),

        ...(dto.active !== undefined && {
          active: dto.active,
        }),
      },
    });
  }

  async remove(
    id: string,
  ) {
    const template =
      await this.prisma.notificationTemplate.findUnique({
        where: {
          id,
        },
      });

    if (!template) {
      throw new NotFoundException(
        'Notification template not found.',
      );
    }

    await this.prisma.notificationTemplate.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Notification template deleted successfully.',
    };
  }
}