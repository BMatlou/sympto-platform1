import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateOrganizationDto } from './dto/create-organization.dto';
import { QueryOrganizationDto } from './dto/query-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateOrganizationDto,
  ) {
    if (dto.parentOrganizationId) {
      const parent =
        await this.prisma.organization.findUnique({
          where: {
            id: dto.parentOrganizationId,
          },
        });

      if (!parent) {
        throw new NotFoundException(
          'Parent organization not found.',
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

    if (dto.registrationNumber) {
      const existing =
        await this.prisma.organization.findFirst({
          where: {
            registrationNumber:
              dto.registrationNumber,
          },
        });

      if (existing) {
        throw new ConflictException(
          'Registration number already exists.',
        );
      }
    }

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        legalName: dto.legalName,
        registrationNumber:
          dto.registrationNumber,
        taxNumber: dto.taxNumber,
        organizationType:
          dto.organizationType,
        status:
          dto.status,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        addressId:
          dto.addressId,
        parentOrganizationId:
          dto.parentOrganizationId,
        logoUrl:
          dto.logoUrl,
        timezone:
          dto.timezone,
      },

      include: {
        address: true,
        parentOrganization: true,
      },
    });
  }

  async findAll(
    query: QueryOrganizationDto,
  ) {
    const {
      page,
      limit,
      name,
      organizationType,
      status,
    } = query;

    const where: Prisma.OrganizationWhereInput =
      {
        ...(name && {
          name: {
            contains: name,
            mode: 'insensitive',
          },
        }),

        ...(organizationType && {
          organizationType,
        }),

        ...(status && {
          status,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.organization.findMany({
          where,

          include: {
            address: true,
            parentOrganization: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.organization.count({
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
    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id,
        },

        include: {
          address: true,
          parentOrganization: true,
          childOrganizations: true,
          branches: true,
          departments: true,
          members: true,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found.',
      );
    }

    return organization;
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
  ) {
    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found.',
      );
    }

    if (
      dto.parentOrganizationId &&
      dto.parentOrganizationId !==
        organization.parentOrganizationId
    ) {
      const parent =
        await this.prisma.organization.findUnique({
          where: {
            id: dto.parentOrganizationId,
          },
        });

      if (!parent) {
        throw new NotFoundException(
          'Parent organization not found.',
        );
      }
    }

    if (
      dto.addressId &&
      dto.addressId !==
        organization.addressId
    ) {
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

    if (
      dto.registrationNumber &&
      dto.registrationNumber !==
        organization.registrationNumber
    ) {
      const existing =
        await this.prisma.organization.findFirst({
          where: {
            registrationNumber:
              dto.registrationNumber,

            NOT: {
              id,
            },
          },
        });

      if (existing) {
        throw new ConflictException(
          'Registration number already exists.',
        );
      }
    }

    return this.prisma.organization.update({
      where: {
        id,
      },

      data: {
        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        ...(dto.legalName !== undefined && {
          legalName: dto.legalName,
        }),

        ...(dto.registrationNumber !== undefined && {
          registrationNumber:
            dto.registrationNumber,
        }),

        ...(dto.taxNumber !== undefined && {
          taxNumber: dto.taxNumber,
        }),

        ...(dto.organizationType !== undefined && {
          organizationType:
            dto.organizationType,
        }),

        ...(dto.status !== undefined && {
          status: dto.status,
        }),

        ...(dto.email !== undefined && {
          email: dto.email,
        }),

        ...(dto.phone !== undefined && {
          phone: dto.phone,
        }),

        ...(dto.website !== undefined && {
          website: dto.website,
        }),

        ...(dto.addressId !== undefined && {
          addressId: dto.addressId,
        }),

        ...(dto.parentOrganizationId !== undefined && {
          parentOrganizationId:
            dto.parentOrganizationId,
        }),

        ...(dto.logoUrl !== undefined && {
          logoUrl: dto.logoUrl,
        }),

        ...(dto.timezone !== undefined && {
          timezone: dto.timezone,
        }),
      },

      include: {
        address: true,
        parentOrganization: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found.',
      );
    }

    await this.prisma.organization.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Organization deleted successfully.',
    };
  }
}