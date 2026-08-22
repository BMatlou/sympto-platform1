import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateSpecimenContainerDto } from './dto/create-specimen-container.dto';
import { UpdateSpecimenContainerDto } from './dto/update-specimen-container.dto';
import { QuerySpecimenContainerDto } from './dto/query-specimen-container.dto';

@Injectable()
export class SpecimenContainersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateSpecimenContainerDto,
  ) {
    return this.prisma.specimenContainer.create({
      data: {
        ...dto,
      },

      include: {
        specimens: true,
      },
    });
  }

  async findAll(
    query: QuerySpecimenContainerDto,
  ) {
    const {
      page,
      limit,
    } = query;

    const where: Prisma.SpecimenContainerWhereInput = {};

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.specimenContainer.findMany({
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

        this.prisma.specimenContainer.count({
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
    const specimenContainer =
      await this.prisma.specimenContainer.findUnique({
        where: {
          id,
        },

        include: {
          specimens: true,
        },
      });

    if (!specimenContainer) {
      throw new NotFoundException(
        'Specimen container not found.',
      );
    }

    return specimenContainer;
  }

  async update(
    id: string,
    dto: UpdateSpecimenContainerDto,
  ) {
    const specimenContainer =
      await this.prisma.specimenContainer.findUnique({
        where: {
          id,
        },
      });

    if (!specimenContainer) {
      throw new NotFoundException(
        'Specimen container not found.',
      );
    }

    return this.prisma.specimenContainer.update({
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
    const specimenContainer =
      await this.prisma.specimenContainer.findUnique({
        where: {
          id,
        },
      });

    if (!specimenContainer) {
      throw new NotFoundException(
        'Specimen container not found.',
      );
    }

    await this.prisma.specimenContainer.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Specimen container deleted successfully.',
    };
  }
}