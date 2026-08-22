import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { QueryProcedureDto } from './dto/query-procedure.dto';

@Injectable()
export class ProceduresService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateProcedureDto) {
    const existing = await this.prisma.procedure.findFirst({
      where: {
        OR: [
          {
            name: dto.name.trim(),
          },
          ...(dto.cptCode
            ? [
                {
                  cptCode: dto.cptCode.trim(),
                },
              ]
            : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        'Procedure already exists.',
      );
    }

    return this.prisma.procedure.create({
      data: {
        name: dto.name.trim(),
        cptCode: dto.cptCode?.trim(),
        description: dto.description?.trim(),
      },
      include: {
        patientProcedures: true,
      },
    });
  }

  async findAll(query: QueryProcedureDto) {
    const {
      page = 1,
      limit = 20,
      search,
    } = query;

    const where = search
      ? {
          OR: [
            {
              name: {
                contains: search,
              },
            },
            {
              cptCode: {
                contains: search,
              },
            },
            {
              description: {
                contains: search,
              },
            },
          ],
        }
      : {};

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.procedure.findMany({
          where,
          include: {
            patientProcedures: true,
          },
          orderBy: {
            name: 'asc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.procedure.count({
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
    const procedure =
      await this.prisma.procedure.findUnique({
        where: {
          id,
        },
        include: {
          patientProcedures: true,
        },
      });

    if (!procedure) {
      throw new NotFoundException(
        'Procedure not found.',
      );
    }

    return procedure;
  }

  async update(
    id: string,
    dto: UpdateProcedureDto,
  ) {
    await this.findOne(id);

    if (dto.name || dto.cptCode) {
      const existing =
        await this.prisma.procedure.findFirst({
          where: {
            NOT: {
              id,
            },
            OR: [
              ...(dto.name
                ? [
                    {
                      name: dto.name.trim(),
                    },
                  ]
                : []),
              ...(dto.cptCode
                ? [
                    {
                      cptCode: dto.cptCode.trim(),
                    },
                  ]
                : []),
            ],
          },
        });

      if (existing) {
        throw new ConflictException(
          'Procedure already exists.',
        );
      }
    }

    return this.prisma.procedure.update({
      where: {
        id,
      },
      data: {
        name: dto.name?.trim(),
        cptCode: dto.cptCode?.trim(),
        description: dto.description?.trim(),
      },
      include: {
        patientProcedures: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.procedure.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Procedure deleted successfully.',
    };
  }
}