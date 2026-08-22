import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateAuditLogDto,
  ) {
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

    if (dto.organizationId) {
      const organization =
        await this.prisma.organization.findUnique({
          where: {
            id: dto.organizationId,
          },
        });

      if (!organization) {
        throw new NotFoundException(
          'Organization not found.',
        );
      }
    }

    return this.prisma.auditLog.create({
      data: {
        ...dto,
      },

      include: {
        user: true,
        organization: true,
        events: true,
      },
    });
  }

  async findAll(
    query: QueryAuditLogDto,
  ) {
    const {
      page,
      limit,
      userId,
      organizationId,
      action,
    } = query;

    const where: Prisma.AuditLogWhereInput = {
      ...(userId && { userId }),
      ...(organizationId && {
        organizationId,
      }),
      ...(action && { action }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.auditLog.findMany({
          where,

          include: {
            user: true,
            organization: true,
            events: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.auditLog.count({
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
    const auditLog =
      await this.prisma.auditLog.findUnique({
        where: {
          id,
        },

        include: {
          user: true,
          organization: true,
          events: true,
        },
      });

    if (!auditLog) {
      throw new NotFoundException(
        'Audit log not found.',
      );
    }

    return auditLog;
  }
}