import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

import { CreateCdsRuleDto } from './dto/create-cds-rule.dto';
import { UpdateCdsRuleDto } from './dto/update-cds-rule.dto';
import { QueryCdsRuleDto } from './dto/query-cds-rule.dto';

@Injectable()
export class CdsRulesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateCdsRuleDto) {
    const existing = await this.prisma.cDSRule.findUnique({
      where: {
        code: dto.code,
      },
    });

    if (existing) {
      throw new ConflictException(
        'A CDS rule with this code already exists.',
      );
    }

    return this.prisma.cDSRule.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        version: dto.version,
        active: dto.active ?? true,
        ruleDefinition: dto.ruleDefinition,
      },
    });
  }

  async findAll(query: QueryCdsRuleDto) {
    const {
      page,
      limit,
      active,
      search,
    } = query;

    const where: Prisma.CDSRuleWhereInput = {
      ...(active !== undefined && {
        active,
      }),

      ...(search && {
        OR: [
          {
            code: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            name: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            description: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.cDSRule.findMany({
          where,

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.cDSRule.count({
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

  async findOne(id: string) {
    const rule =
      await this.prisma.cDSRule.findUnique({
        where: {
          id,
        },

        include: {
          cdsruleExecutions: true,
        },
      });

    if (!rule) {
      throw new NotFoundException(
        'CDS rule not found.',
      );
    }

    return rule;
  }

  async update(
    id: string,
    dto: UpdateCdsRuleDto,
  ) {
    await this.findOne(id);

    if (dto.code) {
      const existing =
        await this.prisma.cDSRule.findFirst({
          where: {
            code: dto.code,
            NOT: {
              id,
            },
          },
        });

      if (existing) {
        throw new ConflictException(
          'Another CDS rule already uses this code.',
        );
      }
    }

    return this.prisma.cDSRule.update({
      where: {
        id,
      },

      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        version: dto.version,
        active: dto.active,
        ruleDefinition:
          dto.ruleDefinition,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.cDSRule.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'CDS rule deleted successfully.',
    };
  }
}