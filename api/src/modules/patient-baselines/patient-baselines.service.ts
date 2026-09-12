import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { GoalsEngineService } from '../health-goals/goals-engine-v3.service';

import { CreatePatientBaselineDto } from './dto/create-patient-baseline.dto';
import { UpdatePatientBaselineDto } from './dto/update-patient-baseline.dto';
import { QueryPatientBaselineDto } from './dto/query-patient-baseline.dto';

@Injectable()
export class PatientBaselinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsEngine: GoalsEngineService,
  ) {}

  async create(dto: CreatePatientBaselineDto) {
    const baseline = await this.prisma.patientBaseline.create({
      data: { ...dto },
      include: { patient: true },
    });

    if (dto.weightKg != null && Number.isFinite(Number(dto.weightKg))) {
      await this.goalsEngine.recordMetricEvent({
        patientId: baseline.patientId,
        metricType: 'WEIGHT',
        metricKey: 'weight.kg',
        loggedValue: Number(dto.weightKg),
        occurredAt: new Date(),
        source: 'patient-profile',
        sourceId: 'profile',
      });
    }

    return baseline;
  }

  async findAll(query: QueryPatientBaselineDto) {
    const { page, limit, patientId } = query;
    const where: Prisma.PatientBaselineWhereInput = { patientId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.patientBaseline.findMany({
        where,
        include: { patient: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.patientBaseline.count({ where }),
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
    const baseline = await this.prisma.patientBaseline.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!baseline) {
      throw new NotFoundException('Patient baseline not found.');
    }

    return baseline;
  }

  async update(id: string, dto: UpdatePatientBaselineDto) {
    const baseline = await this.findOne(id);
    const updated = await this.prisma.patientBaseline.update({
      where: { id },
      data: { ...dto },
      include: { patient: true },
    });

    if (
      dto.weightKg != null &&
      Number.isFinite(Number(dto.weightKg)) &&
      Number(dto.weightKg) !== Number(baseline.weightKg)
    ) {
      await this.goalsEngine.recordMetricEvent({
        patientId: baseline.patientId,
        metricType: 'WEIGHT',
        metricKey: 'weight.kg',
        loggedValue: Number(dto.weightKg),
        occurredAt: new Date(),
        source: 'patient-profile',
        sourceId: 'profile',
      });
    }

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.patientBaseline.delete({ where: { id } });

    return {
      message: 'Patient baseline deleted successfully.',
    };
  }
}
