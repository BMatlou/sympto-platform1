import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateTenantSettingDto } from './dto/create-tenant-setting.dto';
import { QueryTenantSettingDto } from './dto/query-tenant-setting.dto';
import { UpdateTenantSettingDto } from './dto/update-tenant-setting.dto';

@Injectable()
export class TenantSettingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateTenantSettingDto,
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
      await this.prisma.tenantSetting.findUnique({
        where: {
          organizationId:
            dto.organizationId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Tenant settings already exist for this organization.',
      );
    }

    return this.prisma.tenantSetting.create({
      data: {
        organizationId:
          dto.organizationId,
        settings:
          dto.settings as Prisma.InputJsonValue,
      },

      include: {
        organization: true,
      },
    });
  }

  async findAll(
    query: QueryTenantSettingDto,
  ) {
    const {
      page,
      limit,
      organizationId,
    } = query;

    const where: Prisma.TenantSettingWhereInput =
      {
        ...(organizationId && {
          organizationId,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.tenantSetting.findMany({
          where,

          include: {
            organization: true,
          },

          orderBy: {
            organizationId: 'asc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.tenantSetting.count({
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
    const tenantSetting =
      await this.prisma.tenantSetting.findUnique({
        where: {
          id,
        },

        include: {
          organization: true,
        },
      });

    if (!tenantSetting) {
      throw new NotFoundException(
        'Tenant setting not found.',
      );
    }

    return tenantSetting;
  }

  async update(
    id: string,
    dto: UpdateTenantSettingDto,
  ) {
    const tenantSetting =
      await this.prisma.tenantSetting.findUnique({
        where: {
          id,
        },
      });

    if (!tenantSetting) {
      throw new NotFoundException(
        'Tenant setting not found.',
      );
    }

    if (
      dto.organizationId &&
      dto.organizationId !==
        tenantSetting.organizationId
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
        await this.prisma.tenantSetting.findUnique({
          where: {
            organizationId:
              dto.organizationId,
          },
        });

      if (
        existing &&
        existing.id !== id
      ) {
        throw new ConflictException(
          'Tenant settings already exist for this organization.',
        );
      }
    }

    return this.prisma.tenantSetting.update({
      where: {
        id,
      },

      data: {
        ...(dto.organizationId !== undefined && {
          organizationId:
            dto.organizationId,
        }),

        ...(dto.settings !== undefined && {
          settings:
            dto.settings as Prisma.InputJsonValue,
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
    const tenantSetting =
      await this.prisma.tenantSetting.findUnique({
        where: {
          id,
        },
      });

    if (!tenantSetting) {
      throw new NotFoundException(
        'Tenant setting not found.',
      );
    }

    await this.prisma.tenantSetting.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Tenant setting deleted successfully.',
    };
  }
}