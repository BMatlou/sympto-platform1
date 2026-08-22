import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateImagingCenterDto } from './dto/create-imaging-center.dto';
import { UpdateImagingCenterDto } from './dto/update-imaging-center.dto';
import { QueryImagingCenterDto } from './dto/query-imaging-center.dto';

@Injectable()
export class ImagingCentersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateImagingCenterDto,
  ) {
    if (dto.practiceId) {
      const practice =
        await this.prisma.practice.findUnique({
          where: {
            id: dto.practiceId,
          },
        });

      if (!practice) {
        throw new NotFoundException(
          'Practice not found.',
        );
      }
    }

    if (dto.addressId) {
      const address =
        await this.prisma.address.findUnique({
          where: {
            id: dto.addressId,
          },
        });

      if (!address) {
        throw new NotFoundException(
          'Address not found.',
        );
      }
    }

    return this.prisma.imagingCenter.create({
      data: {
        code: dto.code,
        name: dto.name,
        practiceId: dto.practiceId,
        addressId: dto.addressId,
        active: dto.active,
      },

      include: {
        address: true,
        practice: true,
        devices: true,
        orders: true,
        studies: true,
      },
    });
  }

  async findAll(
    query: QueryImagingCenterDto,
  ) {
    const {
      page,
      limit,
      practiceId,
      search,
      active,
    } = query;

    const where: Prisma.ImagingCenterWhereInput =
      {
        ...(practiceId && {
          practiceId,
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
          ],
        }),

        ...(active !== undefined && {
          active,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.imagingCenter.findMany({
          where,

          include: {
            address: true,
            practice: true,
            devices: true,
            orders: true,
            studies: true,
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.imagingCenter.count({
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
    const center =
      await this.prisma.imagingCenter.findUnique({
        where: {
          id,
        },

        include: {
          address: true,
          practice: true,
          devices: true,
          orders: true,
          studies: true,
        },
      });

    if (!center) {
      throw new NotFoundException(
        'Imaging center not found.',
      );
    }

    return center;
  }

  async update(
    id: string,
    dto: UpdateImagingCenterDto,
  ) {
    await this.findOne(id);

    if (dto.practiceId) {
      const practice =
        await this.prisma.practice.findUnique({
          where: {
            id: dto.practiceId,
          },
        });

      if (!practice) {
        throw new NotFoundException(
          'Practice not found.',
        );
      }
    }

    if (dto.addressId) {
      const address =
        await this.prisma.address.findUnique({
          where: {
            id: dto.addressId,
          },
        });

      if (!address) {
        throw new NotFoundException(
          'Address not found.',
        );
      }
    }

    return this.prisma.imagingCenter.update({
      where: {
        id,
      },

      data: {
        code: dto.code,
        name: dto.name,
        practiceId: dto.practiceId,
        addressId: dto.addressId,
        active: dto.active,
      },

      include: {
        address: true,
        practice: true,
        devices: true,
        orders: true,
        studies: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.imagingCenter.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Imaging center deleted successfully.',
    };
  }
}