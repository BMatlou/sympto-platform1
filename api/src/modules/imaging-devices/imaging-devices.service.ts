import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateImagingDeviceDto } from './dto/create-imaging-device.dto';
import { UpdateImagingDeviceDto } from './dto/update-imaging-device.dto';
import { QueryImagingDeviceDto } from './dto/query-imaging-device.dto';

@Injectable()
export class ImagingDevicesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateImagingDeviceDto,
  ) {
    const imagingCenter =
      await this.prisma.imagingCenter.findUnique({
        where: {
          id: dto.imagingCenterId,
        },
      });

    if (!imagingCenter) {
      throw new NotFoundException(
        'Imaging center not found.',
      );
    }

    return this.prisma.imagingDevice.create({
      data: {
        imagingCenterId: dto.imagingCenterId,
        code: dto.code,
        name: dto.name,
        modality: dto.modality,
        manufacturer: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        active: dto.active,
      },

      include: {
        imagingCenter: true,
        studies: true,
      },
    });
  }

  async findAll(
    query: QueryImagingDeviceDto,
  ) {
    const {
      page,
      limit,
      imagingCenterId,
      search,
      active,
    } = query;

    const where: Prisma.ImagingDeviceWhereInput =
      {
        ...(imagingCenterId && {
          imagingCenterId,
        }),

        ...(search && {
          OR: [
            {
              code: {
                contains: search,
              },
            },
            {
              name: {
                contains: search,
              },
            },
            {
              manufacturer: {
                contains: search,
              },
            },
            {
              model: {
                contains: search,
              },
            },
            {
              serialNumber: {
                contains: search,
              },
            },
          ],
        }),

        ...(active !== undefined && {
          active,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.imagingDevice.findMany({
          where,

          include: {
            imagingCenter: true,
            studies: true,
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.imagingDevice.count({
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
    const device =
      await this.prisma.imagingDevice.findUnique({
        where: {
          id,
        },

        include: {
          imagingCenter: true,
          studies: true,
        },
      });

    if (!device) {
      throw new NotFoundException(
        'Imaging device not found.',
      );
    }

    return device;
  }

  async update(
    id: string,
    dto: UpdateImagingDeviceDto,
  ) {
    await this.findOne(id);

    if (dto.imagingCenterId) {
      const imagingCenter =
        await this.prisma.imagingCenter.findUnique({
          where: {
            id: dto.imagingCenterId,
          },
        });

      if (!imagingCenter) {
        throw new NotFoundException(
          'Imaging center not found.',
        );
      }
    }

    return this.prisma.imagingDevice.update({
      where: {
        id,
      },

      data: {
        imagingCenterId: dto.imagingCenterId,
        code: dto.code,
        name: dto.name,
        modality: dto.modality,
        manufacturer: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        active: dto.active,
      },

      include: {
        imagingCenter: true,
        studies: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.imagingDevice.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Imaging device deleted successfully.',
    };
  }
}