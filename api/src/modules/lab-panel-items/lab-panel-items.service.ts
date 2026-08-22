import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateLabPanelItemDto } from './dto/create-lab-panel-item.dto';
import { UpdateLabPanelItemDto } from './dto/update-lab-panel-item.dto';
import { QueryLabPanelItemDto } from './dto/query-lab-panel-item.dto';

@Injectable()
export class LabPanelItemsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabPanelItemDto,
  ) {
    const panel =
      await this.prisma.labPanel.findUnique({
        where: {
          id: dto.panelId,
        },
      });

    if (!panel) {
      throw new NotFoundException(
        'Lab panel not found.',
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

    const existing =
      await this.prisma.labPanelItem.findUnique({
        where: {
          panelId_testId: {
            panelId: dto.panelId,
            testId: dto.testId,
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        'This test already exists in the selected panel.',
      );
    }

    return this.prisma.labPanelItem.create({
      data: {
        panelId: dto.panelId,
        testId: dto.testId,
        displayOrder:
          dto.displayOrder ?? 1,
        required:
          dto.required ?? true,
      },

      include: {
        panel: true,
        test: true,
      },
    });
  }

  async findAll(
    query: QueryLabPanelItemDto,
  ) {
    const {
      page,
      limit,
      panelId,
      testId,
    } = query;

    const where: Prisma.LabPanelItemWhereInput = {
      ...(panelId && {
        panelId,
      }),

      ...(testId && {
        testId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.labPanelItem.findMany({
          where,

          include: {
            panel: true,
            test: true,
          },

          orderBy: [
            {
              panelId: 'asc',
            },
            {
              displayOrder: 'asc',
            },
          ],

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.labPanelItem.count({
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
      await this.prisma.labPanelItem.findUnique({
        where: {
          id,
        },

        include: {
          panel: true,
          test: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Lab panel item not found.',
      );
    }

    return item;
  }

  async update(
    id: string,
    dto: UpdateLabPanelItemDto,
  ) {
    await this.findOne(id);

    if (dto.panelId) {
      const panel =
        await this.prisma.labPanel.findUnique({
          where: {
            id: dto.panelId,
          },
        });

      if (!panel) {
        throw new NotFoundException(
          'Lab panel not found.',
        );
      }
    }

    if (dto.testId) {
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
    }

    return this.prisma.labPanelItem.update({
      where: {
        id,
      },

      data: {
        panelId: dto.panelId,
        testId: dto.testId,
        displayOrder: dto.displayOrder,
        required: dto.required,
      },

      include: {
        panel: true,
        test: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labPanelItem.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab panel item deleted successfully.',
    };
  }
}