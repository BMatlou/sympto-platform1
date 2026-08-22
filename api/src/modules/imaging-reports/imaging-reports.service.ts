import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateImagingReportDto } from './dto/create-imaging-report.dto';
import { UpdateImagingReportDto } from './dto/update-imaging-report.dto';
import { QueryImagingReportDto } from './dto/query-imaging-report.dto';

@Injectable()
export class ImagingReportsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateImagingReportDto,
  ) {
    const study =
      await this.prisma.imagingStudy.findUnique({
        where: {
          id: dto.studyId,
        },
      });

    if (!study) {
      throw new NotFoundException(
        'Imaging study not found.',
      );
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

    return this.prisma.imagingReport.create({
      data: {
        studyId: dto.studyId,
        practitionerId:
          dto.practitionerId,
        findings: dto.findings,
        impression: dto.impression,
        recommendations:
          dto.recommendations,
      },

      include: {
        study: true,
        practitioner: true,
      },
    });
  }

  async findAll(
    query: QueryImagingReportDto,
  ) {
    const {
      page,
      limit,
      studyId,
      practitionerId,
    } = query;

    const where: Prisma.ImagingReportWhereInput =
      {
        ...(studyId && {
          studyId,
        }),

        ...(practitionerId && {
          practitionerId,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.imagingReport.findMany({
          where,

          include: {
            study: true,
            practitioner: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.imagingReport.count({
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
    const report =
      await this.prisma.imagingReport.findUnique({
        where: {
          id,
        },

        include: {
          practitioner: true,
          study: {
            include: {
              patient: true,
              order: true,
              imagingCenter: true,
              device: true,
              series: {
                include: {
                  images: true,
                },
              },
            },
          },
        },
      });

    if (!report) {
      throw new NotFoundException(
        'Imaging report not found.',
      );
    }

    return report;
  }

  async update(
    id: string,
    dto: UpdateImagingReportDto,
  ) {
    await this.findOne(id);

    if (dto.studyId) {
      const study =
        await this.prisma.imagingStudy.findUnique({
          where: {
            id: dto.studyId,
          },
        });

      if (!study) {
        throw new NotFoundException(
          'Imaging study not found.',
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

    return this.prisma.imagingReport.update({
      where: {
        id,
      },

      data: {
        studyId: dto.studyId,
        practitionerId:
          dto.practitionerId,
        findings: dto.findings,
        impression: dto.impression,
        recommendations:
          dto.recommendations,
      },

      include: {
        study: true,
        practitioner: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.imagingReport.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Imaging report deleted successfully.',
    };
  }
}