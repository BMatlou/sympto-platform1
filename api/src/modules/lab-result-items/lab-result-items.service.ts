import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateLabResultItemDto } from './dto/create-lab-result-item.dto';
import { UpdateLabResultItemDto } from './dto/update-lab-result-item.dto';
import { QueryLabResultItemDto } from './dto/query-lab-result-item.dto';

@Injectable()
export class LabResultItemsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabResultItemDto,
  ) {
    const result =
      await this.prisma.labResult.findUnique({
        where: {
          id: dto.resultId,
        },
      });

    if (!result) {
      throw new NotFoundException(
        'Lab result not found.',
      );
    }

    const orderItem =
      await this.prisma.labOrderItem.findUnique({
        where: {
          id: dto.orderItemId,
        },
      });

    if (!orderItem) {
      throw new NotFoundException(
        'Lab order item not found.',
      );
    }

    const test =
      await this.prisma.labTest.findUnique({
        where: {
          id: dto.testId,
        },
      });

    if (!test) {
      throw new NotFoundException(
        'Lab test not found.',
      );
    }

    return this.prisma.labResultItem.create({
      data: {
        resultId: dto.resultId,
        orderItemId: dto.orderItemId,
        testId: dto.testId,
        numericValue: dto.numericValue,
        textValue: dto.textValue,
        booleanValue: dto.booleanValue,
        dateValue: dto.dateValue
          ? new Date(dto.dateValue)
          : undefined,
        abnormal: dto.abnormal,
        critical: dto.critical,
        comments: dto.comments,
      },

      include: {
        result: true,
        orderItem: true,
        test: true,
      },
    });
  }

  async findAll(
    query: QueryLabResultItemDto,
  ) {
    const {
      page,
      limit,
      resultId,
      testId,
    } = query;

    const where = {
      ...(resultId && {
        resultId,
      }),
      ...(testId && {
        testId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.labResultItem.findMany({
          where,

          include: {
            result: true,
            orderItem: true,
            test: true,
          },

          orderBy: {
            id: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.labResultItem.count({
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
      await this.prisma.labResultItem.findUnique({
        where: {
          id,
        },

        include: {
          result: true,
          orderItem: true,
          test: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Lab result item not found.',
      );
    }

    return item;
  }

  async update(
    id: string,
    dto: UpdateLabResultItemDto,
  ) {
    await this.findOne(id);

    return this.prisma.labResultItem.update({
      where: {
        id,
      },

      data: {
        resultId: dto.resultId,
        orderItemId: dto.orderItemId,
        testId: dto.testId,
        numericValue: dto.numericValue,
        textValue: dto.textValue,
        booleanValue: dto.booleanValue,
        dateValue: dto.dateValue
          ? new Date(dto.dateValue)
          : undefined,
        abnormal: dto.abnormal,
        critical: dto.critical,
        comments: dto.comments,
      },

      include: {
        result: true,
        orderItem: true,
        test: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labResultItem.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab result item deleted successfully.',
    };
  }
}