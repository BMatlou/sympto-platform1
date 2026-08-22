import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateOrganizationMemberDto } from './dto/create-organization-member.dto';
import { QueryOrganizationMemberDto } from './dto/query-organization-member.dto';
import { UpdateOrganizationMemberDto } from './dto/update-organization-member.dto';

@Injectable()
export class OrganizationMembersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateOrganizationMemberDto,
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

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: dto.userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found.',
      );
    }

    const existing =
      await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId:
              dto.organizationId,
            userId: dto.userId,
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        'User is already a member of this organization.',
      );
    }

    return this.prisma.organizationMember.create({
      data: {
        organizationId:
          dto.organizationId,
        userId: dto.userId,
        role: dto.role,
        active:
          dto.active ?? true,
      },

      include: {
        organization: true,
        user: true,
      },
    });
  }

  async findAll(
    query: QueryOrganizationMemberDto,
  ) {
    const {
      page,
      limit,
      organizationId,
      userId,
      role,
      active,
    } = query;

    const where: Prisma.OrganizationMemberWhereInput =
      {
        ...(organizationId && {
          organizationId,
        }),

        ...(userId && {
          userId,
        }),

        ...(role && {
          role,
        }),

        ...(active !== undefined && {
          active,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.organizationMember.findMany({
          where,

          include: {
            organization: true,
            user: true,
          },

          orderBy: {
            joinedAt: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.organizationMember.count({
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
    const member =
      await this.prisma.organizationMember.findUnique({
        where: {
          id,
        },

        include: {
          organization: true,
          user: true,
        },
      });

    if (!member) {
      throw new NotFoundException(
        'Organization member not found.',
      );
    }

    return member;
  }

  async update(
    id: string,
    dto: UpdateOrganizationMemberDto,
  ) {
    const member =
      await this.prisma.organizationMember.findUnique({
        where: {
          id,
        },
      });

    if (!member) {
      throw new NotFoundException(
        'Organization member not found.',
      );
    }

    if (
      dto.organizationId &&
      dto.organizationId !==
        member.organizationId
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
      dto.userId &&
      dto.userId !== member.userId
    ) {
      const user =
        await this.prisma.user.findUnique({
          where: {
            id: dto.userId,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'User not found.',
        );
      }
    }

    if (
      dto.organizationId ||
      dto.userId
    ) {
      const existing =
        await this.prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId:
                dto.organizationId ??
                member.organizationId,

              userId:
                dto.userId ??
                member.userId,
            },
          },
        });

      if (
        existing &&
        existing.id !== id
      ) {
        throw new ConflictException(
          'User is already a member of this organization.',
        );
      }
    }

    return this.prisma.organizationMember.update({
      where: {
        id,
      },

      data: {
        ...(dto.organizationId !== undefined && {
          organizationId:
            dto.organizationId,
        }),

        ...(dto.userId !== undefined && {
          userId: dto.userId,
        }),

        ...(dto.role !== undefined && {
          role: dto.role,
        }),

        ...(dto.active !== undefined && {
          active: dto.active,
        }),
      },

      include: {
        organization: true,
        user: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const member =
      await this.prisma.organizationMember.findUnique({
        where: {
          id,
        },
      });

    if (!member) {
      throw new NotFoundException(
        'Organization member not found.',
      );
    }

    await this.prisma.organizationMember.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Organization member removed successfully.',
    };
  }
}