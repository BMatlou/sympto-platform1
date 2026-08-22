import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateLabUnitDto } from './dto/create-lab-unit.dto';
import { UpdateLabUnitDto } from './dto/update-lab-unit.dto';
import { QueryLabUnitDto } from './dto/query-lab-unit.dto';

@Injectable()
export class LabUnitsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLabUnitDto,
  ) {
    return this.prisma.labUnit.create({
      data: {
        code: dto.code,
        name: dto.name,
        symbol: dto.symbol,
        description: dto.description,
      },

      include: {
        labTests: true,
        referenceRanges: true,
      },
    });
  }

  async findAll(
    query: QueryLabUnitDto,
  ) {
    const {
      page,
      limit,
      search,
    } = query;

    const where: Prisma.LabUnitWhereInput = {
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
          {
            symbol: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.labUnit.findMany({
          where,

          include: {
            labTests: true,
            referenceRanges: true,
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.labUnit.count({
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
    const unit =
      await this.prisma.labUnit.findUnique({
        where: {
          id,
        },

        include: {
          labTests: true,
          referenceRanges: true,
        },
      });

    if (!unit) {
      throw new NotFoundException(
        'Lab unit not found.',
      );
    }

    return unit;
  }

  async update(
    id: string,
    dto: UpdateLabUnitDto,
  ) {
    await this.findOne(id);

    return this.prisma.labUnit.update({
      where: {
        id,
      },

      data: {
        code: dto.code,
        name: dto.name,
        symbol: dto.symbol,
        description: dto.description,
      },

      include: {
        labTests: true,
        referenceRanges: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.labUnit.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Lab unit deleted successfully.',
    };
  }
}