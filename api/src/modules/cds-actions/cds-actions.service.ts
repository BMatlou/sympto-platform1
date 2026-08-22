import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService as DatabaseService } from '../../database/prisma.service';

import { CreateCdsActionDto } from './dto/create-cds-action.dto';
import { UpdateCdsActionDto } from './dto/update-cds-action.dto';
import { QueryCdsActionDto } from './dto/query-cds-action.dto';

@Injectable()
export class CdsActionsService {
  constructor(
    private readonly prisma: DatabaseService,
  ) {}

  async create(dto: CreateCdsActionDto) {
    const cds =
      await this.prisma.clinicalDecisionSupport.findUnique({
        where: {
          id: dto.clinicalDecisionSupportId,
        },
      });

    if (!cds) {
      throw new NotFoundException(
        'Clinical decision support record not found.',
      );
    }

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: dto.userId,
        },
      });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.prisma.cDSAction.create({
      data: {
        clinicalDecisionSupportId:
          dto.clinicalDecisionSupportId,
        userId: dto.userId,
        action: dto.action,
        notes: dto.notes,
      },
      include: {
        clinicalDecisionSupport: true,
        user: true,
      },
    });
  }

  async findAll(query: QueryCdsActionDto) {
    const {
      page,
      limit,
      clinicalDecisionSupportId,
      userId,
    } = query;

    const where: Prisma.CDSActionWhereInput = {
      ...(clinicalDecisionSupportId && {
        clinicalDecisionSupportId,
      }),
      ...(userId && {
        userId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.cDSAction.findMany({
          where,
          include: {
            clinicalDecisionSupport: true,
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.cDSAction.count({
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

  async findOne(id: string) {
    const action =
      await this.prisma.cDSAction.findUnique({
        where: { id },
        include: {
          clinicalDecisionSupport: true,
          user: true,
        },
      });

    if (!action) {
      throw new NotFoundException(
        'CDS action not found.',
      );
    }

    return action;
  }

  async update(
    id: string,
    dto: UpdateCdsActionDto,
  ) {
    await this.findOne(id);

    if (dto.clinicalDecisionSupportId) {
      const cds =
        await this.prisma.clinicalDecisionSupport.findUnique({
          where: {
            id: dto.clinicalDecisionSupportId,
          },
        });

      if (!cds) {
        throw new NotFoundException(
          'Clinical decision support record not found.',
        );
      }
    }

    if (dto.userId) {
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

    return this.prisma.cDSAction.update({
      where: {
        id,
      },
      data: {
        clinicalDecisionSupportId:
          dto.clinicalDecisionSupportId,
        userId: dto.userId,
        action: dto.action,
        notes: dto.notes,
      },
      include: {
        clinicalDecisionSupport: true,
        user: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.cDSAction.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'CDS action deleted successfully.',
    };
  }
}