import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { QueryPersonDto } from './dto/query-person.dto';

@Injectable()
export class PersonsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePersonDto,
  ) {
    if (dto.countryId) {
      const country =
        await this.prisma.country.findUnique({
          where: {
            id: dto.countryId,
          },
        });

      if (!country) {
        throw new NotFoundException(
          'Country not found.',
        );
      }
    }

    return this.prisma.person.create({
      data: {
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        preferredName: dto.preferredName,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
        countryId: dto.countryId,
      },

      include: {
        country: true,
      },
    });
  }

  async findAll(
    query: QueryPersonDto,
  ) {
    const {
      page,
      limit,
      countryId,
      search,
    } = query;

    const where: Prisma.PersonWhereInput = {
      deletedAt: null,

      ...(countryId && {
        countryId,
      }),

      ...(search && {
        OR: [
          {
            firstName: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            middleName: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            lastName: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            preferredName: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.person.findMany({
          where,

          include: {
            country: true,
            user: true,
            patient: true,
            practitioner: true,
            administrator: true,
          },

          orderBy: [
            {
              lastName: 'asc',
            },
            {
              firstName: 'asc',
            },
          ],

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.person.count({
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
    const person =
      await this.prisma.person.findFirst({
        where: {
          id,
          deletedAt: null,
        },

        include: {
          country: true,
          user: true,
          patient: true,
          practitioner: true,
          administrator: true,
          personAddresses: {
            include: {
              address: {
                include: {
                  country: true,
                },
              },
            },
          },
        },
      });

    if (!person) {
      throw new NotFoundException(
        'Person not found.',
      );
    }

    return person;
  }

  async update(
    id: string,
    dto: UpdatePersonDto,
  ) {
    await this.findOne(id);

    if (dto.countryId) {
      const country =
        await this.prisma.country.findUnique({
          where: {
            id: dto.countryId,
          },
        });

      if (!country) {
        throw new NotFoundException(
          'Country not found.',
        );
      }
    }

    return this.prisma.person.update({
      where: {
        id,
      },

      data: {
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        preferredName: dto.preferredName,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
        countryId: dto.countryId,
      },

      include: {
        country: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.person.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message:
        'Person deleted successfully.',
    };
  }
}