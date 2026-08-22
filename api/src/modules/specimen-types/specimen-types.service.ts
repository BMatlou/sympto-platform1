import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateSpecimenTypeDto } from './dto/create-specimen-type.dto';
import { UpdateSpecimenTypeDto } from './dto/update-specimen-type.dto';
import { QuerySpecimenTypeDto } from './dto/query-specimen-type.dto';

@Injectable()
export class SpecimenTypesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateSpecimenTypeDto,
  ) {
    return this.prisma.specimenType.create({
      data: {
        ...dto,
      },

      include: {
        specimens: true,
      },
    });
  }

  async findAll(
    query: QuerySpecimenTypeDto,
  ) {
    const {
      page,
      limit,
    } = query;

    const where: Prisma.SpecimenTypeWhereInput = {};

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.specimenType.findMany({
          where,

          include: {
            specimens: true,
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.specimenType.count({
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

    async findOne(
    id: string,
  ) {
    const specimenType =
      await this.prisma.specimenType.findUnique({
        where: {
          id,
        },

        include: {
          specimens: true,
        },
      });

    if (!specimenType) {
      throw new NotFoundException(
        'Specimen type not found.',
      );
    }

    return specimenType;
  }

  async update(
    id: string,
    dto: UpdateSpecimenTypeDto,
  ) {
    const specimenType =
      await this.prisma.specimenType.findUnique({
        where: {
          id,
        },
      });

    if (!specimenType) {
      throw new NotFoundException(
        'Specimen type not found.',
      );
    }

    return this.prisma.specimenType.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: {
        specimens: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const specimenType =
      await this.prisma.specimenType.findUnique({
        where: {
          id,
        },
      });

    if (!specimenType) {
      throw new NotFoundException(
        'Specimen type not found.',
      );
    }

    await this.prisma.specimenType.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Specimen type deleted successfully.',
    };
  }
}