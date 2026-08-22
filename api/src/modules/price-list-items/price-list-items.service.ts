import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePriceListItemDto } from './dto/create-price-list-item.dto';
import { UpdatePriceListItemDto } from './dto/update-price-list-item.dto';
import { QueryPriceListItemDto } from './dto/query-price-list-item.dto';

@Injectable()
export class PriceListItemsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePriceListItemDto,
  ) {
    const priceList =
      await this.prisma.priceList.findUnique({
        where: {
          id: dto.priceListId,
        },
      });

    if (!priceList) {
      throw new NotFoundException(
        'Price list not found.',
      );
    }

    return this.prisma.priceListItem.create({
      data: {
        priceListId: dto.priceListId,
        serviceCode: dto.serviceCode,
        serviceName: dto.serviceName,
        price: new Prisma.Decimal(
          dto.price,
        ),
      },

      include: {
        priceList: true,
      },
    });
  }

  async findAll(
    query: QueryPriceListItemDto,
  ) {
    const {
      page,
      limit,
      priceListId,
      search,
    } = query;

    const where: Prisma.PriceListItemWhereInput =
      {
        ...(priceListId && {
          priceListId,
        }),

        ...(search && {
          OR: [
            {
              serviceCode: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              serviceName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.priceListItem.findMany({
          where,

          include: {
            priceList: true,
          },

          orderBy: {
            serviceName: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.priceListItem.count({
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
      await this.prisma.priceListItem.findUnique({
        where: {
          id,
        },

        include: {
          priceList: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Price list item not found.',
      );
    }

    return item;
  }

  async update(
    id: string,
    dto: UpdatePriceListItemDto,
  ) {
    await this.findOne(id);

    if (dto.priceListId) {
      const priceList =
        await this.prisma.priceList.findUnique({
          where: {
            id: dto.priceListId,
          },
        });

      if (!priceList) {
        throw new NotFoundException(
          'Price list not found.',
        );
      }
    }

    return this.prisma.priceListItem.update({
      where: {
        id,
      },

      data: {
        priceListId: dto.priceListId,
        serviceCode: dto.serviceCode,
        serviceName: dto.serviceName,
        price:
          dto.price !== undefined
            ? new Prisma.Decimal(
                dto.price,
              )
            : undefined,
      },

      include: {
        priceList: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.priceListItem.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Price list item deleted successfully.',
    };
  }
}