import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateBranchDto } from './dto/create-branch.dto';
import { QueryBranchDto } from './dto/query-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateBranchDto,
  ) {
    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id: dto.organizationId,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found.',
      );
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

    const existing =
      await this.prisma.branch.findFirst({
        where: {
          organizationId:
            dto.organizationId,
          name: dto.name,
        },
      });

    if (existing) {
      throw new ConflictException(
        'A branch with this name already exists in the organization.',
      );
    }

    return this.prisma.branch.create({
      data: {
        organizationId:
          dto.organizationId,
        name: dto.name,
        addressId:
          dto.addressId,
        phone: dto.phone,
      },

      include: {
        organization: true,
        address: true,
      },
    });
  }

  async findAll(
    query: QueryBranchDto,
  ) {
    const {
      page,
      limit,
      organizationId,
      name,
    } = query;

    const where: Prisma.BranchWhereInput =
      {
        ...(organizationId && {
          organizationId,
        }),

        ...(name && {
          name: {
            contains: name,
            mode: 'insensitive',
          },
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.branch.findMany({
          where,

          include: {
            organization: true,
            address: true,
            departments: true,
          },

          orderBy: {
            name: 'asc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.branch.count({
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
    const branch =
      await this.prisma.branch.findUnique({
        where: {
          id,
        },

        include: {
          organization: true,
          address: true,
          departments: true,
        },
      });

    if (!branch) {
      throw new NotFoundException(
        'Branch not found.',
      );
    }

    return branch;
  }

  async update(
    id: string,
    dto: UpdateBranchDto,
  ) {
    const branch =
      await this.prisma.branch.findUnique({
        where: {
          id,
        },
      });

    if (!branch) {
      throw new NotFoundException(
        'Branch not found.',
      );
    }

    if (
      dto.organizationId &&
      dto.organizationId !==
        branch.organizationId
    ) {
      const organization =
        await this.prisma.organization.findUnique({
          where: {
            id: dto.organizationId,
          },
        });

      if (!organization) {
        throw new NotFoundException(
          'Organization not found.',
        );
      }
    }

    if (
      dto.addressId &&
      dto.addressId !==
        branch.addressId
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
      dto.name &&
      (dto.name !== branch.name ||
        dto.organizationId)
    ) {
      const existing =
        await this.prisma.branch.findFirst({
          where: {
            organizationId:
              dto.organizationId ??
              branch.organizationId,

            name: dto.name,

            NOT: {
              id,
            },
          },
        });

      if (existing) {
        throw new ConflictException(
          'A branch with this name already exists in the organization.',
        );
      }
    }

    return this.prisma.branch.update({
      where: {
        id,
      },

      data: {
        ...(dto.organizationId !==
          undefined && {
          organizationId:
            dto.organizationId,
        }),

        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        ...(dto.addressId !==
          undefined && {
          addressId: dto.addressId,
        }),

        ...(dto.phone !== undefined && {
          phone: dto.phone,
        }),
      },

      include: {
        organization: true,
        address: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const branch =
      await this.prisma.branch.findUnique({
        where: {
          id,
        },
      });

    if (!branch) {
      throw new NotFoundException(
        'Branch not found.',
      );
    }

    await this.prisma.branch.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Branch deleted successfully.',
    };
  }
}