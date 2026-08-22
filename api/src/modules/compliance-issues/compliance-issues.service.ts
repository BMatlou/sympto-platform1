import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ComplianceStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateComplianceIssueDto } from './dto/create-compliance-issue.dto';
import { UpdateComplianceIssueDto } from './dto/update-compliance-issue.dto';
import { QueryComplianceIssueDto } from './dto/query-compliance-issue.dto';

@Injectable()
export class ComplianceIssuesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateComplianceIssueDto,
  ) {
    if (dto.organizationId) {
      const organization =
        await this.prisma.organization.findUnique({
          where: { id: dto.organizationId },
        });

      if (!organization) {
        throw new NotFoundException(
          'Organization not found.',
        );
      }
    }

    if (dto.reportedById) {
      const reportedBy =
        await this.prisma.user.findUnique({
          where: { id: dto.reportedById },
        });

      if (!reportedBy) {
        throw new NotFoundException(
          'Reporting user not found.',
        );
      }
    }

    if (dto.assignedToId) {
      const assignedTo =
        await this.prisma.user.findUnique({
          where: { id: dto.assignedToId },
        });

      if (!assignedTo) {
        throw new NotFoundException(
          'Assigned user not found.',
        );
      }
    }

    return this.prisma.complianceIssue.create({
      data: {
        ...dto,
      },

      include: {
        organization: true,
        reportedBy: true,
        assignedTo: true,
      },
    });
  }

  async findAll(
    query: QueryComplianceIssueDto,
  ) {
    const {
      page,
      limit,
      organizationId,
      reportedById,
      assignedToId,
      status,
    } = query;

    const where: Prisma.ComplianceIssueWhereInput = {
      ...(organizationId && { organizationId }),
      ...(reportedById && { reportedById }),
      ...(assignedToId && { assignedToId }),
      ...(status && { status }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.complianceIssue.findMany({
          where,

          include: {
            organization: true,
            reportedBy: true,
            assignedTo: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.complianceIssue.count({
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
    const complianceIssue =
      await this.prisma.complianceIssue.findUnique({
        where: {
          id,
        },

        include: {
          organization: true,
          reportedBy: true,
          assignedTo: true,
        },
      });

    if (!complianceIssue) {
      throw new NotFoundException(
        'Compliance issue not found.',
      );
    }

    return complianceIssue;
  }

  async update(
    id: string,
    dto: UpdateComplianceIssueDto,
  ) {
    const complianceIssue =
      await this.prisma.complianceIssue.findUnique({
        where: {
          id,
        },
      });

    if (!complianceIssue) {
      throw new NotFoundException(
        'Compliance issue not found.',
      );
    }

    if (
      dto.organizationId &&
      dto.organizationId !== complianceIssue.organizationId
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
      dto.reportedById &&
      dto.reportedById !== complianceIssue.reportedById
    ) {
      const reportedBy =
        await this.prisma.user.findUnique({
          where: {
            id: dto.reportedById,
          },
        });

      if (!reportedBy) {
        throw new NotFoundException(
          'Reporting user not found.',
        );
      }
    }

    if (
      dto.assignedToId &&
      dto.assignedToId !== complianceIssue.assignedToId
    ) {
      const assignedTo =
        await this.prisma.user.findUnique({
          where: {
            id: dto.assignedToId,
          },
        });

      if (!assignedTo) {
        throw new NotFoundException(
          'Assigned user not found.',
        );
      }
    }

    const resolvedStatuses: ComplianceStatus[] = [
      ComplianceStatus.RESOLVED,
    ];

    return this.prisma.complianceIssue.update({
      where: {
        id,
      },

      data: {
        ...dto,

        ...(dto.status !== undefined && {
          resolvedAt: resolvedStatuses.includes(dto.status)
            ? new Date()
            : null,
        }),
      },

      include: {
        organization: true,
        reportedBy: true,
        assignedTo: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const complianceIssue =
      await this.prisma.complianceIssue.findUnique({
        where: {
          id,
        },
      });

    if (!complianceIssue) {
      throw new NotFoundException(
        'Compliance issue not found.',
      );
    }

    await this.prisma.complianceIssue.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Compliance issue deleted successfully.',
    };
  }
}