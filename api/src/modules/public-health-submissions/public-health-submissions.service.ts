import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePublicHealthSubmissionDto } from './dto/create-public-health-submission.dto';
import { UpdatePublicHealthSubmissionDto } from './dto/update-public-health-submission.dto';
import { QueryPublicHealthSubmissionDto } from './dto/query-public-health-submission.dto';

@Injectable()
export class PublicHealthSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePublicHealthSubmissionDto,
  ) {
    const report =
      await this.prisma.publicHealthReport.findUnique({
        where: {
          id: dto.reportId,
        },
      });

    if (!report) {
      throw new NotFoundException(
        'Public health report not found.',
      );
    }

    return this.prisma.publicHealthSubmission.create({
      data: {
        reportId: dto.reportId,
        destination: dto.destination,
        responseCode: dto.responseCode,
        responseMessage: dto.responseMessage,
        submittedAt: dto.submittedAt,
      },

      include: {
        report: true,
      },
    });
  }

  async findAll(
    query: QueryPublicHealthSubmissionDto,
  ) {
    const {
      page,
      limit,
      reportId,
    } = query;

    const where: Prisma.PublicHealthSubmissionWhereInput = {
      ...(reportId && {
        reportId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.publicHealthSubmission.findMany({
          where,

          include: {
            report: true,
          },

          orderBy: {
            submittedAt: 'desc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.publicHealthSubmission.count({
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

  async findOne(id: string) {
    const submission =
      await this.prisma.publicHealthSubmission.findUnique({
        where: {
          id,
        },

        include: {
          report: true,
        },
      });

    if (!submission) {
      throw new NotFoundException(
        'Public health submission not found.',
      );
    }

    return submission;
  }

  async update(
    id: string,
    dto: UpdatePublicHealthSubmissionDto,
  ) {
    await this.findOne(id);

    if (dto.reportId) {
      const report =
        await this.prisma.publicHealthReport.findUnique({
          where: {
            id: dto.reportId,
          },
        });

      if (!report) {
        throw new NotFoundException(
          'Public health report not found.',
        );
      }
    }

    return this.prisma.publicHealthSubmission.update({
      where: {
        id,
      },

      data: {
        reportId: dto.reportId,
        destination: dto.destination,
        responseCode: dto.responseCode,
        responseMessage: dto.responseMessage,
        submittedAt: dto.submittedAt,
      },

      include: {
        report: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.publicHealthSubmission.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Public health submission deleted successfully.',
    };
  }
}