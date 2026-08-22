import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateDepartmentDto } from './dto/create-department.dto';
import { QueryDepartmentDto } from './dto/query-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateDepartmentDto,
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

    if (dto.branchId) {
      const branch =
        await this.prisma.branch.findUnique({
          where: {
            id: dto.branchId,
          },
        });

      if (!branch) {
        throw new NotFoundException(
          'Branch not found.',
        );
      }
    }

    const existing =
      await this.prisma.department.findFirst({
        where: {
          organizationId:
            dto.organizationId,
          name: dto.name,
        },
      });

    if (existing) {
      throw new ConflictException(
        'A department with this name already exists in the organization.',
      );
    }

    return this.prisma.department.create({
      data: {
        organizationId:
          dto.organizationId,
        branchId:
          dto.branchId,
        name: dto.name,
        type: dto.type,
        description:
          dto.description,
      },

      include: {
        organization: true,
        branch: true,
      },
    });
  }

  async findAll(
    query: QueryDepartmentDto,
  ) {
    const {
      page,
      limit,
      organizationId,
      branchId,
      type,
      name,
    } = query;

    const where: Prisma.DepartmentWhereInput =
      {
        ...(organizationId && {
          organizationId,
        }),

        ...(branchId && {
          branchId,
        }),

        ...(type && {
          type,
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
        this.prisma.department.findMany({
          where,

          include: {
            organization: true,
            branch: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.department.count({
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
    const department =
      await this.prisma.department.findUnique({
        where: {
          id,
        },

        include: {
          organization: true,
          branch: true,
          practitioners: true,
          practitionerOrganizations: true,
          publicHealthReports: true,
        },
      });

    if (!department) {
      throw new NotFoundException(
        'Department not found.',
      );
    }

    return department;
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
  ) {
    const department =
      await this.prisma.department.findUnique({
        where: {
          id,
        },
      });

    if (!department) {
      throw new NotFoundException(
        'Department not found.',
      );
    }

    if (
      dto.organizationId &&
      dto.organizationId !==
        department.organizationId
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
      dto.branchId &&
      dto.branchId !==
        department.branchId
    ) {
      const branch =
        await this.prisma.branch.findUnique({
          where: {
            id: dto.branchId,
          },
        });

      if (!branch) {
        throw new NotFoundException(
          'Branch not found.',
        );
      }
    }

    if (
      dto.name &&
      (dto.name !== department.name ||
        dto.organizationId)
    ) {
      const existing =
        await this.prisma.department.findFirst({
          where: {
            organizationId:
              dto.organizationId ??
              department.organizationId,

            name: dto.name,

            NOT: {
              id,
            },
          },
        });

      if (existing) {
        throw new ConflictException(
          'A department with this name already exists in the organization.',
        );
      }
    }

    return this.prisma.department.update({
      where: {
        id,
      },

      data: {
        ...(dto.organizationId !== undefined && {
          organizationId:
            dto.organizationId,
        }),

        ...(dto.branchId !== undefined && {
          branchId:
            dto.branchId,
        }),

        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        ...(dto.type !== undefined && {
          type: dto.type,
        }),

        ...(dto.description !== undefined && {
          description:
            dto.description,
        }),
      },

      include: {
        organization: true,
        branch: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const department =
      await this.prisma.department.findUnique({
        where: {
          id,
        },
      });

    if (!department) {
      throw new NotFoundException(
        'Department not found.',
      );
    }

    await this.prisma.department.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Department deleted successfully.',
    };
  }
}