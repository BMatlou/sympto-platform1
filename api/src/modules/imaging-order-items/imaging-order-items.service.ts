import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateImagingOrderItemDto } from './dto/create-imaging-order-item.dto';
import { UpdateImagingOrderItemDto } from './dto/update-imaging-order-item.dto';
import { QueryImagingOrderItemDto } from './dto/query-imaging-order-item.dto';

@Injectable()
export class ImagingOrderItemsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateImagingOrderItemDto,
  ) {
    const order =
      await this.prisma.imagingOrder.findUnique({
        where: {
          id: dto.orderId,
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Imaging order not found.',
      );
    }

    const procedure =
      await this.prisma.imagingProcedure.findUnique({
        where: {
          id: dto.procedureId,
        },
      });

    if (!procedure) {
      throw new NotFoundException(
        'Imaging procedure not found.',
      );
    }

    return this.prisma.imagingOrderItem.create({
      data: {
        orderId: dto.orderId,
        procedureId: dto.procedureId,
        notes: dto.notes,
      },

      include: {
        order: true,
        procedure: true,
      },
    });
  }

  async findAll(
    query: QueryImagingOrderItemDto,
  ) {
    const {
      page,
      limit,
      orderId,
      procedureId,
    } = query;

    const where: Prisma.ImagingOrderItemWhereInput =
      {
        ...(orderId && {
          orderId,
        }),

        ...(procedureId && {
          procedureId,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.imagingOrderItem.findMany({
          where,

          include: {
            order: true,
            procedure: true,
          },

          orderBy: {
            id: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.imagingOrderItem.count({
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
    const item =
      await this.prisma.imagingOrderItem.findUnique({
        where: {
          id,
        },

        include: {
          order: true,
          procedure: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Imaging order item not found.',
      );
    }

    return item;
  }

  async update(
    id: string,
    dto: UpdateImagingOrderItemDto,
  ) {
    await this.findOne(id);

    if (dto.orderId) {
      const order =
        await this.prisma.imagingOrder.findUnique({
          where: {
            id: dto.orderId,
          },
        });

      if (!order) {
        throw new NotFoundException(
          'Imaging order not found.',
        );
      }
    }

    if (dto.procedureId) {
      const procedure =
        await this.prisma.imagingProcedure.findUnique({
          where: {
            id: dto.procedureId,
          },
        });

      if (!procedure) {
        throw new NotFoundException(
          'Imaging procedure not found.',
        );
      }
    }

    return this.prisma.imagingOrderItem.update({
      where: {
        id,
      },

      data: {
        orderId: dto.orderId,
        procedureId: dto.procedureId,
        notes: dto.notes,
      },

      include: {
        order: true,
        procedure: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.imagingOrderItem.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Imaging order item deleted successfully.',
    };
  }
}