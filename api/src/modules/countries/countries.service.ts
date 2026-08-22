import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { QueryCountryDto } from './dto/query-country.dto';

@Injectable()
export class CountriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateCountryDto,
  ) {
    const existing =
      await this.prisma.country.findFirst({
        where: {
          OR: [
            {
              iso2: dto.iso2.toUpperCase(),
            },
            {
              iso3: dto.iso3.toUpperCase(),
            },
          ],
        },
      });

    if (existing) {
      throw new ConflictException(
        'Country with this ISO code already exists.',
      );
    }

    return this.prisma.country.create({
      data: {
        name: dto.name,
        iso2: dto.iso2.toUpperCase(),
        iso3: dto.iso3.toUpperCase(),
        continent: dto.continent,
        currencyCode: dto.currencyCode,
        currencyName: dto.currencyName,
        flagEmoji: dto.flagEmoji,
        flagImageUrl: dto.flagImageUrl,
        active: dto.active ?? true,
        numericCode: dto.numericCode,
        officialName: dto.officialName,
      },
    });
  }

  async findAll(
    query: QueryCountryDto,
  ) {
    const {
      page,
      limit,
      search,
      isActive,
    } = query;

    const where: Prisma.CountryWhereInput = {
      ...(isActive !== undefined && {
        isActive,
      }),

      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            officialName: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            iso2: {
              contains: search.toUpperCase(),
            },
          },
          {
            iso3: {
              contains: search.toUpperCase(),
            },
          },
          {
            currencyCode: {
              contains: search.toUpperCase(),
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.country.findMany({
          where,

          orderBy: {
            name: 'asc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.country.count({
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
    const country =
      await this.prisma.country.findUnique({
        where: {
          id,
        },
      });

    if (!country) {
      throw new NotFoundException(
        'Country not found.',
      );
    }

    return country;
  }

  async update(
    id: string,
    dto: UpdateCountryDto,
  ) {
    await this.findOne(id);

    if (dto.iso2 || dto.iso3) {
      const existing =
        await this.prisma.country.findFirst({
          where: {
            NOT: {
              id,
            },
            OR: [
              ...(dto.iso2
                ? [
                    {
                      iso2: dto.iso2.toUpperCase(),
                    },
                  ]
                : []),
              ...(dto.iso3
                ? [
                    {
                      iso3: dto.iso3.toUpperCase(),
                    },
                  ]
                : []),
            ],
          },
        });

      if (existing) {
        throw new ConflictException(
          'Country ISO code already exists.',
        );
      }
    }

    return this.prisma.country.update({
      where: {
        id,
      },

      data: {
        name: dto.name,
        iso2: dto.iso2?.toUpperCase(),
        iso3: dto.iso3?.toUpperCase(),
        continent: dto.continent,
        currencyCode: dto.currencyCode,
        currencyName: dto.currencyName,
        flagEmoji: dto.flagEmoji,
        flagImageUrl: dto.flagImageUrl,
        active: dto.active,
        numericCode: dto.numericCode,
        officialName: dto.officialName,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.country.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Country deleted successfully.',
    };
  }
}