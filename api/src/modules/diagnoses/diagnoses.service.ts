import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { UpdateDiagnosisDto } from './dto/update-diagnosis.dto';
import { QueryDiagnosisDto } from './dto/query-diagnosis.dto';

@Injectable()
export class DiagnosesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateDiagnosisDto) {
    const existing = await this.prisma.diagnosis.findFirst({
      where: {
        OR: [
          {
            name: dto.name.trim(),
          },
          ...(dto.icd10Code
            ? [
                {
                  icd10Code: dto.icd10Code.trim(),
                },
              ]
            : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        'Diagnosis already exists.',
      );
    }

    return this.prisma.diagnosis.create({
      data: {
        name: dto.name.trim(),
        icd10Code: dto.icd10Code?.trim(),
        description: dto.description?.trim(),
      },
      include: {
  patientDiagnoses: true,
}
    });
  }

  async findAll(query: QueryDiagnosisDto) {
    const { page = 1, limit = 20, search } = query;

    const where = search
      ? {
          OR: [
            {
              name: {
                contains: search,
              },
            },
            {
              icd10Code: {
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

    const [data, total] = await this.prisma.$transaction([
      this.prisma.diagnosis.findMany({
        where,
        include: {
  patientDiagnoses: true,
},
        orderBy: {
          name: 'asc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.diagnosis.count({
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
    const diagnosis = await this.prisma.diagnosis.findUnique({
      where: {
        id,
      },
      include: {
  patientDiagnoses: true,
}
    });

    if (!diagnosis) {
      throw new NotFoundException(
        'Diagnosis not found.',
      );
    }

    return diagnosis;
  }

  async update(
    id: string,
    dto: UpdateDiagnosisDto,
  ) {
    await this.findOne(id);

    if (dto.name || dto.icd10Code) {
      const existing = await this.prisma.diagnosis.findFirst({
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
            ...(dto.icd10Code
              ? [
                  {
                    icd10Code: dto.icd10Code.trim(),
                  },
                ]
              : []),
          ],
        },
      });

      if (existing) {
        throw new ConflictException(
          'Diagnosis already exists.',
        );
      }
    }

    return this.prisma.diagnosis.update({
      where: {
        id,
      },
      data: {
        name: dto.name?.trim(),
        icd10Code: dto.icd10Code?.trim(),
        description: dto.description?.trim(),
      },
      include: {
  patientDiagnoses: true,
}
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.diagnosis.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Diagnosis deleted successfully.',
    };
  }
}