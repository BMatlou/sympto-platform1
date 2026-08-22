import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

import { CreateLabTestDto } from './dto/create-lab-test.dto';
import { UpdateLabTestDto } from './dto/update-lab-test.dto';
import { QueryLabTestDto } from './dto/query-lab-test.dto';

@Injectable()
export class LabTestsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabTestDto,
  ) {
    const category =
      await this.prisma.labCategory.findUnique({
        where: {
          id: dto.categoryId,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Lab category not found.',
      );
    }

    if (dto.methodId) {
      const method =
        await this.prisma.labMethod.findUnique({
          where: {
            id: dto.methodId,
          },
        });

      if (!method) {
        throw new NotFoundException(
          'Lab method not found.',
        );
      }
    }

    if (dto.unitId) {
      const unit =
        await this.prisma.labUnit.findUnique({
          where: {
            id: dto.unitId,
          },
        });

      if (!unit) {
        throw new NotFoundException(
          'Lab unit not found.',
        );
      }
    }

    return this.prisma.labTest.create({
      data: {
        categoryId: dto.categoryId,
        methodId: dto.methodId,
        unitId: dto.unitId,
        code: dto.code,
        name: dto.name,
        loincCode: dto.loincCode,
        description: dto.description,
        resultType: dto.resultType,
        active: dto.active,
      },

      include: {
        category: true,
        method: true,
        unit: true,
        referenceRanges: true,
        panels: {
          include: {
            panel: true,
          },
        },
      },
    });
  }

  async findAll(
    query: QueryLabTestDto,
  ) {
    const {
      page,
      limit,
      categoryId,
      search,
      active,
    } = query;

    const where: Prisma.LabTestWhereInput = {
      ...(categoryId && {
        categoryId,
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
            loincCode: {
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
        this.prisma.labTest.findMany({
          where,

          include: {
            category: true,
            method: true,
            unit: true,
            referenceRanges: true,
            panels: {
              include: {
                panel: true,
              },
            },
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.labTest.count({
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
    const test =
      await this.prisma.labTest.findUnique({
        where: {
          id,
        },

        include: {
          category: true,
          method: true,
          unit: true,
          referenceRanges: true,
          panels: {
            include: {
              panel: true,
            },
          },
        },
      });

    if (!test) {
      throw new NotFoundException(
        'Lab test not found.',
      );
    }

    return test;
  }

  async update(
    id: string,
    dto: UpdateLabTestDto,
  ) {
    await this.findOne(id);

    if (dto.categoryId) {
      const category =
        await this.prisma.labCategory.findUnique({
          where: {
            id: dto.categoryId,
          },
        });

      if (!category) {
        throw new NotFoundException(
          'Lab category not found.',
        );
      }
    }

    if (dto.methodId) {
      const method =
        await this.prisma.labMethod.findUnique({
          where: {
            id: dto.methodId,
          },
        });

      if (!method) {
        throw new NotFoundException(
          'Lab method not found.',
        );
      }
    }

    if (dto.unitId) {
      const unit =
        await this.prisma.labUnit.findUnique({
          where: {
            id: dto.unitId,
          },
        });

      if (!unit) {
        throw new NotFoundException(
          'Lab unit not found.',
        );
      }
    }

    return this.prisma.labTest.update({
      where: {
        id,
      },

      data: {
        categoryId: dto.categoryId,
        methodId: dto.methodId,
        unitId: dto.unitId,
        code: dto.code,
        name: dto.name,
        loincCode: dto.loincCode,
        description: dto.description,
        resultType: dto.resultType,
        active: dto.active,
      },

      include: {
        category: true,
        method: true,
        unit: true,
        referenceRanges: true,
        panels: {
          include: {
            panel: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labTest.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab test deleted successfully.',
    };
  }
}