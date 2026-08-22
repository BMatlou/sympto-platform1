import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateLabOrderItemDto } from './dto/create-lab-order-item.dto';
import { UpdateLabOrderItemDto } from './dto/update-lab-order-item.dto';
import { QueryLabOrderItemDto } from './dto/query-lab-order-item.dto';

@Injectable()
export class LabOrderItemsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabOrderItemDto,
  ) {
    const [
      order,
      test,
    ] = await this.prisma.$transaction([
      this.prisma.labOrder.findUnique({
        where: {
          id: dto.orderId,
        },
      }),

      this.prisma.labTest.findUnique({
        where: {
          id: dto.testId,
        },
      }),
    ]);

    if (!order) {
      throw new NotFoundException(
        'Lab order not found.',
      );
    }

    if (!test) {
      throw new NotFoundException(
        'Lab test not found.',
      );
    }

    return this.prisma.labOrderItem.create({
      data: {
        orderId: dto.orderId,
        testId: dto.testId,
        priority: dto.priority,
        status: dto.status,
        notes: dto.notes,
      },

      include: {
        order: true,
        test: true,
        labResults: true,
        resultItems: true,
      },
    });
  }

  async findAll(
    query: QueryLabOrderItemDto,
  ) {
    const {
      page,
      limit,
      orderId,
    } = query;

    const where = orderId
      ? {
          orderId,
        }
      : {};

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.labOrderItem.findMany({
          where,

          include: {
            order: true,
            test: true,
            labResults: true,
            resultItems: true,
          },

          orderBy: {
            id: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.labOrderItem.count({
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
      await this.prisma.labOrderItem.findUnique({
        where: {
          id,
        },

        include: {
          order: true,
          test: true,
          labResults: true,
          resultItems: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Lab order item not found.',
      );
    }

    return item;
  }

  async update(
    id: string,
    dto: UpdateLabOrderItemDto,
  ) {
    await this.findOne(id);

    return this.prisma.labOrderItem.update({
      where: {
        id,
      },

      data: {
        orderId: dto.orderId,
        testId: dto.testId,
        priority: dto.priority,
        status: dto.status,
        notes: dto.notes,
      },

      include: {
        order: true,
        test: true,
        labResults: true,
        resultItems: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labOrderItem.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab order item deleted successfully.',
    };
  }
}