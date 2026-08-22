import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateAuditEventDto } from './dto/create-audit-event.dto';
import { QueryAuditEventDto } from './dto/query-audit-event.dto';

@Injectable()
export class AuditEventsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateAuditEventDto,
  ) {
    const auditLog =
      await this.prisma.auditLog.findUnique({
        where: {
          id: dto.auditLogId,
        },
      });

    if (!auditLog) {
      throw new NotFoundException(
        'Audit log not found.',
      );
    }

    return this.prisma.auditEvent.create({
      data: {
        ...dto,
      },

      include: {
        auditLog: true,
      },
    });
  }

  async findAll(
    query: QueryAuditEventDto,
  ) {
    const {
      page,
      limit,
      auditLogId,
      severity,
    } = query;

    const where: Prisma.AuditEventWhereInput = {
      ...(auditLogId && {
        auditLogId,
      }),

      ...(severity && {
        severity,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.auditEvent.findMany({
          where,

          include: {
            auditLog: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.auditEvent.count({
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
    const auditEvent =
      await this.prisma.auditEvent.findUnique({
        where: {
          id,
        },

        include: {
          auditLog: {
            include: {
              user: true,
              organization: true,
            },
          },
        },
      });

    if (!auditEvent) {
      throw new NotFoundException(
        'Audit event not found.',
      );
    }

    return auditEvent;
  }
}