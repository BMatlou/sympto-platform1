import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePractitionerOrganizationDto } from './dto/create-practitioner-organization.dto';
import { UpdatePractitionerOrganizationDto } from './dto/update-practitioner-organization.dto';
import { QueryPractitionerOrganizationDto } from './dto/query-practitioner-organization.dto';

@Injectable()
export class PractitionerOrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePractitionerOrganizationDto,
  ) {
    const practitioner =
      await this.prisma.practitioner.findUnique({
        where: {
          id: dto.practitionerId,
        },
      });

    if (!practitioner) {
      throw new NotFoundException(
        'Practitioner not found.',
      );
    }

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

    if (dto.departmentId) {
      const department =
        await this.prisma.department.findUnique({
          where: {
            id: dto.departmentId,
          },
        });

      if (!department) {
        throw new NotFoundException(
          'Department not found.',
        );
      }
    }

    const existing =
      await this.prisma.practitionerOrganization.findFirst({
        where: {
          practitionerId: dto.practitionerId,
          organizationId: dto.organizationId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Practitioner is already assigned to this organization.',
      );
    }

    if (dto.primaryOrganization) {
      await this.prisma.practitionerOrganization.updateMany({
        where: {
          practitionerId: dto.practitionerId,
          primaryOrganization: true,
        },
        data: {
          primaryOrganization: false,
        },
      });
    }

    return this.prisma.practitionerOrganization.create({
      data: {
        practitionerId: dto.practitionerId,
        organizationId: dto.organizationId,
        departmentId: dto.departmentId,
        licenseNumber: dto.licenseNumber,
        primaryOrganization:
          dto.primaryOrganization ?? false,
        startDate: dto.startDate,
        endDate: dto.endDate,
        active: dto.active ?? true,
      },

      include: {
        practitioner: true,
        organization: true,
        department: true,
      },
    });
  }

  async findAll(
    query: QueryPractitionerOrganizationDto,
  ) {
    const {
      page,
      limit,
      practitionerId,
      organizationId,
      active,
    } = query;

    const where: Prisma.PractitionerOrganizationWhereInput =
      {
        ...(practitionerId && {
          practitionerId,
        }),

        ...(organizationId && {
          organizationId,
        }),

        ...(active !== undefined && {
          active,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.practitionerOrganization.findMany({
          where,

          include: {
            practitioner: true,
            organization: true,
            department: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.practitionerOrganization.count({
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
    const record =
      await this.prisma.practitionerOrganization.findUnique({
        where: {
          id,
        },

        include: {
          practitioner: true,
          organization: true,
          department: true,
        },
      });

    if (!record) {
      throw new NotFoundException(
        'Practitioner organization record not found.',
      );
    }

    return record;
  }

  async update(
    id: string,
    dto: UpdatePractitionerOrganizationDto,
  ) {
    const existing =
      await this.findOne(id);

    if (dto.practitionerId) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id: dto.practitionerId,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Practitioner not found.',
        );
      }
    }

    if (dto.organizationId) {
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

    if (dto.departmentId) {
      const department =
        await this.prisma.department.findUnique({
          where: {
            id: dto.departmentId,
          },
        });

      if (!department) {
        throw new NotFoundException(
          'Department not found.',
        );
      }
    }

    if (dto.primaryOrganization === true) {
      await this.prisma.practitionerOrganization.updateMany({
        where: {
          practitionerId:
            dto.practitionerId ??
            existing.practitionerId,
          primaryOrganization: true,
          NOT: {
            id,
          },
        },
        data: {
          primaryOrganization: false,
        },
      });
    }

    return this.prisma.practitionerOrganization.update({
      where: {
        id,
      },

      data: {
        practitionerId: dto.practitionerId,
        organizationId: dto.organizationId,
        departmentId: dto.departmentId,
        licenseNumber: dto.licenseNumber,
        primaryOrganization:
          dto.primaryOrganization,
        startDate: dto.startDate,
        endDate: dto.endDate,
        active: dto.active,
      },

      include: {
        practitioner: true,
        organization: true,
        department: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.practitionerOrganization.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Practitioner organization deleted successfully.',
    };
  }
}