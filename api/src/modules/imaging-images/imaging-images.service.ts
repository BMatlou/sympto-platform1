import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateImagingImageDto } from './dto/create-imaging-image.dto';
import { UpdateImagingImageDto } from './dto/update-imaging-image.dto';
import { QueryImagingImageDto } from './dto/query-imaging-image.dto';

@Injectable()
export class ImagingImagesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateImagingImageDto,
  ) {
    const series =
      await this.prisma.imagingSeries.findUnique({
        where: {
          id: dto.seriesId,
        },
      });

    if (!series) {
      throw new NotFoundException(
        'Imaging series not found.',
      );
    }

    return this.prisma.imagingImage.create({
      data: {
        seriesId: dto.seriesId,
        sopInstanceUID:
          dto.sopInstanceUID,
        fileUrl: dto.fileUrl,
        thumbnailUrl:
          dto.thumbnailUrl,
        imageNumber:
          dto.imageNumber,
      },

      include: {
        series: true,
      },
    });
  }

  async findAll(
    query: QueryImagingImageDto,
  ) {
    const {
      page,
      limit,
      seriesId,
      search,
    } = query;

    const where: Prisma.ImagingImageWhereInput =
      {
        ...(seriesId && {
          seriesId,
        }),

        ...(search && {
          sopInstanceUID: {
            contains: search,
          },
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.imagingImage.findMany({
          where,

          include: {
            series: true,
          },

          orderBy: {
            imageNumber: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.imagingImage.count({
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
    const image =
      await this.prisma.imagingImage.findUnique({
        where: {
          id,
        },

        include: {
          series: {
            include: {
              study: true,
            },
          },
        },
      });

    if (!image) {
      throw new NotFoundException(
        'Imaging image not found.',
      );
    }

    return image;
  }

  async update(
    id: string,
    dto: UpdateImagingImageDto,
  ) {
    await this.findOne(id);

    if (dto.seriesId) {
      const series =
        await this.prisma.imagingSeries.findUnique({
          where: {
            id: dto.seriesId,
          },
        });

      if (!series) {
        throw new NotFoundException(
          'Imaging series not found.',
        );
      }
    }

    return this.prisma.imagingImage.update({
      where: {
        id,
      },

      data: {
        seriesId: dto.seriesId,
        sopInstanceUID:
          dto.sopInstanceUID,
        fileUrl: dto.fileUrl,
        thumbnailUrl:
          dto.thumbnailUrl,
        imageNumber:
          dto.imageNumber,
      },

      include: {
        series: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.imagingImage.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Imaging image deleted successfully.',
    };
  }
}