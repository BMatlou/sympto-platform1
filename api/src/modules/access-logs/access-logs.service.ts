import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAccessLogDto } from './dto/create-access-log.dto';
import { UpdateAccessLogDto } from './dto/update-access-log.dto';
import { QueryAccessLogDto } from './dto/query-access-log.dto';

@Injectable()
export class AccessLogsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateAccessLogDto,
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

    return this.prisma.accessLog.create({
      data: {
        ...dto,
      },

      include: {
        user: true,
      },
    });
  }

  async findAll(
    query: QueryAccessLogDto,
  ) {
    const {
      page,
      limit,
      userId,
      successful,
    } = query;

    const where: Prisma.AccessLogWhereInput = {
      ...(userId && {
        userId,
      }),

      ...(successful !== undefined && {
        successful,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.accessLog.findMany({
          where,

          include: {
            user: true,
          },

          orderBy: {
            loginAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.accessLog.count({
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
    const accessLog =
      await this.prisma.accessLog.findUnique({
        where: {
          id,
        },

        include: {
          user: true,
        },
      });

    if (!accessLog) {
      throw new NotFoundException(
        'Access log not found.',
      );
    }

    return accessLog;
  }

  async update(
    id: string,
    dto: UpdateAccessLogDto,
  ) {
    const accessLog =
      await this.prisma.accessLog.findUnique({
        where: {
          id,
        },
      });

    if (!accessLog) {
      throw new NotFoundException(
        'Access log not found.',
      );
    }

    return this.prisma.accessLog.update({
      where: {
        id,
      },

      data: {
        logoutAt: new Date(),
      },

      include: {
        user: true,
      },
    });
  }
}