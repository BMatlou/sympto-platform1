import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateImagingSeriesDto } from './dto/create-imaging-series.dto';
import { UpdateImagingSeriesDto } from './dto/update-imaging-series.dto';
import { QueryImagingSeriesDto } from './dto/query-imaging-series.dto';

@Injectable()
export class ImagingSeriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateImagingSeriesDto,
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

    return this.prisma.imagingSeries.create({
      data: {
        studyId: dto.studyId,
        seriesInstanceUID:
          dto.seriesInstanceUID,
        modality: dto.modality,
        description: dto.description,
      },

      include: {
        study: true,
        images: true,
      },
    });
  }

  async findAll(
    query: QueryImagingSeriesDto,
  ) {
    const {
      page,
      limit,
      studyId,
      search,
    } = query;

    const where: Prisma.ImagingSeriesWhereInput =
      {
        ...(studyId && {
          studyId,
        }),

        ...(search && {
          OR: [
            {
              seriesInstanceUID: {
                contains: search,
              },
            },
            {
              description: {
                contains: search,
              },
            },
          ],
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.imagingSeries.findMany({
          where,

          include: {
            study: true,
            images: true,
          },

          orderBy: {
            seriesInstanceUID: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.imagingSeries.count({
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
    const series =
      await this.prisma.imagingSeries.findUnique({
        where: {
          id,
        },

        include: {
          study: true,
          images: true,
        },
      });

    if (!series) {
      throw new NotFoundException(
        'Imaging series not found.',
      );
    }

    return series;
  }

  async update(
    id: string,
    dto: UpdateImagingSeriesDto,
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

    return this.prisma.imagingSeries.update({
      where: {
        id,
      },

      data: {
        studyId: dto.studyId,
        seriesInstanceUID:
          dto.seriesInstanceUID,
        modality: dto.modality,
        description: dto.description,
      },

      include: {
        study: true,
        images: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.imagingSeries.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Imaging series deleted successfully.',
    };
  }
}