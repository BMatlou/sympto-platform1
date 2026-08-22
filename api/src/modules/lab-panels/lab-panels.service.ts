import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateLabPanelDto } from './dto/create-lab-panel.dto';
import { UpdateLabPanelDto } from './dto/update-lab-panel.dto';
import { QueryLabPanelDto } from './dto/query-lab-panel.dto';

@Injectable()
export class LabPanelsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabPanelDto,
  ) {
    return this.prisma.labPanel.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        active: dto.active,
      },

      include: {
        panelItems: {
          include: {
            test: true,
          },
        },
      },
    });
  }

  async findAll(
    query: QueryLabPanelDto,
  ) {
    const {
      page,
      limit,
      search,
      active,
    } = query;

    const where: Prisma.LabPanelWhereInput = {
      ...(search && {
        OR: [
          {
            code: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            name: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
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
        this.prisma.labPanel.findMany({
          where,

          include: {
            panelItems: {
              include: {
                test: true,
              },
            },
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.labPanel.count({
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
    const panel =
      await this.prisma.labPanel.findUnique({
        where: {
          id,
        },

        include: {
          panelItems: {
            include: {
              test: true,
            },
          },
        },
      });

    if (!panel) {
      throw new NotFoundException(
        'Lab panel not found.',
      );
    }

    return panel;
  }

  async update(
    id: string,
    dto: UpdateLabPanelDto,
  ) {
    await this.findOne(id);

    return this.prisma.labPanel.update({
      where: {
        id,
      },

      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        active: dto.active,
      },

      include: {
        panelItems: {
          include: {
            test: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labPanel.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab panel deleted successfully.',
    };
  }
}