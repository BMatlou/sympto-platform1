import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { QueryApiKeyDto } from './dto/query-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateApiKeyDto,
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

    const existing =
      await this.prisma.aPIKey.findUnique({
        where: {
          keyHash: dto.keyHash,
        },
      });

    if (existing) {
      throw new ConflictException(
        'API key already exists.',
      );
    }

    return this.prisma.aPIKey.create({
      data: {
        organizationId:
          dto.organizationId,
        name: dto.name,
        keyHash: dto.keyHash,
        active:
          dto.active ?? true,
        expiresAt:
          dto.expiresAt,
        lastUsedAt:
          dto.lastUsedAt,
      },

      include: {
        organization: true,
      },
    });
  }

  async findAll(
    query: QueryApiKeyDto,
  ) {
    const {
      page,
      limit,
      organizationId,
      active,
    } = query;

    const where: Prisma.APIKeyWhereInput =
      {
        ...(organizationId && {
          organizationId,
        }),

        ...(active !== undefined && {
          active,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.aPIKey.findMany({
          where,

          include: {
            organization: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.aPIKey.count({
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
    const apiKey =
      await this.prisma.aPIKey.findUnique({
        where: {
          id,
        },

        include: {
          organization: true,
        },
      });

    if (!apiKey) {
      throw new NotFoundException(
        'API key not found.',
      );
    }

    return apiKey;
  }

  async update(
    id: string,
    dto: UpdateApiKeyDto,
  ) {
    const apiKey =
      await this.prisma.aPIKey.findUnique({
        where: {
          id,
        },
      });

    if (!apiKey) {
      throw new NotFoundException(
        'API key not found.',
      );
    }

    if (
      dto.organizationId &&
      dto.organizationId !==
        apiKey.organizationId
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
      dto.keyHash &&
      dto.keyHash !== apiKey.keyHash
    ) {
      const existing =
        await this.prisma.aPIKey.findUnique({
          where: {
            keyHash: dto.keyHash,
          },
        });

      if (
        existing &&
        existing.id !== id
      ) {
        throw new ConflictException(
          'API key already exists.',
        );
      }
    }

    return this.prisma.aPIKey.update({
      where: {
        id,
      },

      data: {
        ...(dto.organizationId !== undefined && {
          organizationId:
            dto.organizationId,
        }),

        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        ...(dto.keyHash !== undefined && {
          keyHash: dto.keyHash,
        }),

        ...(dto.active !== undefined && {
          active: dto.active,
        }),

        ...(dto.expiresAt !== undefined && {
          expiresAt: dto.expiresAt,
        }),

        ...(dto.lastUsedAt !== undefined && {
          lastUsedAt: dto.lastUsedAt,
        }),
      },

      include: {
        organization: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const apiKey =
      await this.prisma.aPIKey.findUnique({
        where: {
          id,
        },
      });

    if (!apiKey) {
      throw new NotFoundException(
        'API key not found.',
      );
    }

    await this.prisma.aPIKey.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'API key deleted successfully.',
    };
  }
}