import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { QueryPriceListDto } from './dto/query-price-list.dto';

@Injectable()
export class PriceListsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePriceListDto,
  ) {
    return this.prisma.priceList.create({
      data: {
        name: dto.name,
        description:
          dto.description,
        active:
          dto.active ?? true,
      },

      include: {
        items: true,
      },
    });
  }

  async findAll(
    query: QueryPriceListDto,
  ) {
    const {
      page,
      limit,
      search,
      active,
    } = query;

    const where: Prisma.PriceListWhereInput =
      {
        ...(search && {
          name: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        }),

        ...(active !== undefined && {
          active,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.priceList.findMany({
          where,

          include: {
            items: true,
          },

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.priceList.count({
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
    const priceList =
      await this.prisma.priceList.findUnique({
        where: {
          id,
        },

        include: {
          items: true,
        },
      });

    if (!priceList) {
      throw new NotFoundException(
        'Price list not found.',
      );
    }

    return priceList;
  }

  async update(
    id: string,
    dto: UpdatePriceListDto,
  ) {
    await this.findOne(id);

    return this.prisma.priceList.update({
      where: {
        id,
      },

      data: {
        name: dto.name,
        description:
          dto.description,
        active: dto.active,
      },

      include: {
        items: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.priceList.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Price list deleted successfully.',
    };
  }
}