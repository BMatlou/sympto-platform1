import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, AddressType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePersonAddressDto } from './dto/create-person-address.dto';
import { UpdatePersonAddressDto } from './dto/update-person-address.dto';
import { QueryPersonAddressDto } from './dto/query-person-address.dto';

@Injectable()
export class PersonAddressesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePersonAddressDto,
  ) {
    const person = await this.prisma.person.findUnique({
      where: {
        id: dto.personId,
      },
    });

    if (!person) {
      throw new NotFoundException(
        'Person not found.',
      );
    }

    const address = await this.prisma.address.findUnique({
      where: {
        id: dto.addressId,
      },
    });

    if (!address) {
      throw new NotFoundException(
        'Address not found.',
      );
    }

    const existing =
      await this.prisma.personAddress.findFirst({
        where: {
          personId: dto.personId,
          addressId: dto.addressId,
          type: dto.type,
        },
      });

    if (existing) {
      throw new ConflictException(
        'This address has already been assigned to the person for this address type.',
      );
    }

    if (dto.isPrimary) {
      await this.prisma.personAddress.updateMany({
        where: {
          personId: dto.personId,
          type: dto.type,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return this.prisma.personAddress.create({
      data: {
        personId: dto.personId,
        addressId: dto.addressId,
        type: dto.type,
        isPrimary: dto.isPrimary ?? false,
        validFrom: dto.validFrom,
        validTo: dto.validTo,
      },

      include: {
        person: true,
        address: {
          include: {
            country: true,
          },
        },
      },
    });
  }

  async findAll(
    query: QueryPersonAddressDto,
  ) {
    const {
      page,
      limit,
      personId,
      addressId,
      type,
      isPrimary,
    } = query;

    const where: Prisma.PersonAddressWhereInput = {
      ...(personId && {
        personId,
      }),

      ...(addressId && {
        addressId,
      }),

      ...(type && {
        type,
      }),

      ...(isPrimary !== undefined && {
        isPrimary,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.personAddress.findMany({
          where,

          include: {
            person: true,
            address: {
              include: {
                country: true,
              },
            },
          },

          orderBy: [
            {
              personId: 'asc',
            },
            {
              type: 'asc',
            },
          ],

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.personAddress.count({
          where,
        }),
      ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    id: string,
  ) {
    const record =
      await this.prisma.personAddress.findUnique({
        where: {
          id,
        },

        include: {
          person: true,
          address: {
            include: {
              country: true,
            },
          },
        },
      });

    if (!record) {
      throw new NotFoundException(
        'Person address not found.',
      );
    }

    return record;
  }

  async update(
    id: string,
    dto: UpdatePersonAddressDto,
  ) {
    const existing = await this.findOne(id);

    const personId =
      dto.personId ?? existing.personId;

    const addressId =
      dto.addressId ?? existing.addressId;

    const type =
      dto.type ?? existing.type;

    if (dto.personId) {
      const person =
        await this.prisma.person.findUnique({
          where: {
            id: dto.personId,
          },
        });

      if (!person) {
        throw new NotFoundException(
          'Person not found.',
        );
      }
    }

    if (dto.addressId) {
      const address =
        await this.prisma.address.findUnique({
          where: {
            id: dto.addressId,
          },
        });

      if (!address) {
        throw new NotFoundException(
          'Address not found.',
        );
      }
    }

    const duplicate =
      await this.prisma.personAddress.findFirst({
        where: {
          personId,
          addressId,
          type,
          NOT: {
            id,
          },
        },
      });

    if (duplicate) {
      throw new ConflictException(
        'Another person address already exists with the same person, address and type.',
      );
    }

    if (dto.isPrimary === true) {
      await this.prisma.personAddress.updateMany({
        where: {
          personId,
          type,
          isPrimary: true,
          NOT: {
            id,
          },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return this.prisma.personAddress.update({
      where: {
        id,
      },

      data: {
        personId: dto.personId,
        addressId: dto.addressId,
        type: dto.type,
        isPrimary: dto.isPrimary,
        validFrom: dto.validFrom,
        validTo: dto.validTo,
      },

      include: {
        person: true,
        address: {
          include: {
            country: true,
          },
        },
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.personAddress.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Person address deleted successfully.',
    };
  }
}