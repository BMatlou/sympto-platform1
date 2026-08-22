import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateSecurityIncidentDto } from './dto/create-security-incident.dto';
import { UpdateSecurityIncidentDto } from './dto/update-security-incident.dto';
import { QuerySecurityIncidentDto } from './dto/query-security-incident.dto';

@Injectable()
export class SecurityIncidentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateSecurityIncidentDto,
  ) {
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

    if (dto.practitionerId) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id: dto.practitionerId,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Practitioner not found.',
        );
      }
    }

    return this.prisma.securityIncident.create({
      data: {
        ...dto,
      },

      include: {
        organization: true,
        practitioner: true,
        user: true,
      },
    });
  }

  async findAll(
    query: QuerySecurityIncidentDto,
  ) {
    const {
      page,
      limit,
      organizationId,
      practitionerId,
      userId,
      type,
      severity,
      resolved,
    } = query;

    const where: Prisma.SecurityIncidentWhereInput = {
      ...(organizationId && { organizationId }),
      ...(practitionerId && { practitionerId }),
      ...(userId && { userId }),
      ...(type && { type }),
      ...(severity && { severity }),
      ...(resolved !== undefined && { resolved }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.securityIncident.findMany({
          where,

          include: {
            organization: true,
            practitioner: true,
            user: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.securityIncident.count({
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
    const incident =
      await this.prisma.securityIncident.findUnique({
        where: {
          id,
        },

        include: {
          organization: true,
          practitioner: true,
          user: true,
        },
      });

    if (!incident) {
      throw new NotFoundException(
        'Security incident not found.',
      );
    }

    return incident;
  }

  async update(
    id: string,
    dto: UpdateSecurityIncidentDto,
  ) {
    const incident =
      await this.prisma.securityIncident.findUnique({
        where: {
          id,
        },
      });

    if (!incident) {
      throw new NotFoundException(
        'Security incident not found.',
      );
    }

    if (
      dto.organizationId &&
      dto.organizationId !== incident.organizationId
    ) {
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

    if (
      dto.userId &&
      dto.userId !== incident.userId
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
      dto.practitionerId &&
      dto.practitionerId !== incident.practitionerId
    ) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id: dto.practitionerId,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Practitioner not found.',
        );
      }
    }

    return this.prisma.securityIncident.update({
      where: {
        id,
      },

      data: {
        ...(dto.organizationId !== undefined && {
          organizationId: dto.organizationId,
        }),

        ...(dto.userId !== undefined && {
          userId: dto.userId,
        }),

        ...(dto.practitionerId !== undefined && {
          practitionerId: dto.practitionerId,
        }),

        ...(dto.title !== undefined && {
          title: dto.title,
        }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),

        ...(dto.type !== undefined && {
          type: dto.type,
        }),

        ...(dto.severity !== undefined && {
          severity: dto.severity,
        }),

        ...(dto.ipAddress !== undefined && {
          ipAddress: dto.ipAddress,
        }),

        ...(dto.userAgent !== undefined && {
          userAgent: dto.userAgent,
        }),

        ...(dto.resolved !== undefined && {
          resolved: dto.resolved,
          resolvedAt: dto.resolved
            ? new Date()
            : null,
        }),
      },

      include: {
        organization: true,
        practitioner: true,
        user: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const incident =
      await this.prisma.securityIncident.findUnique({
        where: {
          id,
        },
      });

    if (!incident) {
      throw new NotFoundException(
        'Security incident not found.',
      );
    }

    await this.prisma.securityIncident.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Security incident deleted successfully.',
    };
  }
}