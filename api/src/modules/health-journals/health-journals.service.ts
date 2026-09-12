import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { GoalsEngineService } from '../health-goals/goals-engine.service';
import { CreateHealthJournalDto } from './dto/create-health-journal.dto';
import { UpdateHealthJournalDto } from './dto/update-health-journal.dto';
import { QueryHealthJournalDto } from './dto/query-health-journal.dto';

@Injectable()
export class HealthJournalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsEngine: GoalsEngineService,
  ) {}

  private async getPatientId(userId: string): Promise<string> {
    const patient = await this.prisma.patient.findUnique({ where: { userId }, select: { id: true } });
    if (!patient) throw new NotFoundException('Patient not found.');
    return patient.id;
  }

  async create(userId: string, dto: CreateHealthJournalDto) {
    const patientId = await this.getPatientId(userId);
    const journal = await this.prisma.healthJournal.create({
      data: { ...dto, patientId },
      include: { patient: true, encounter: true, practitioner: true },
    });

    if (journal.exerciseMinutes !== null) {
      await this.goalsEngine.recordMetricEvent({
        patientId,
        metricType: 'EXERCISE',
        metricKey: 'exercise.minutes',
        loggedValue: journal.exerciseMinutes,
        occurredAt: journal.createdAt,
        source: 'health-journal',
        sourceId: journal.id,
      });
    }

    if (journal.waterIntakeMl !== null) {
      await this.goalsEngine.recordMetricEvent({
        patientId,
        metricType: 'HYDRATION',
        metricKey: 'hydration.ml',
        loggedValue: journal.waterIntakeMl,
        occurredAt: journal.createdAt,
        source: 'health-journal',
        sourceId: journal.id,
      });
    }

    return journal;
  }

  async findAll(userId: string, query: QueryHealthJournalDto) {
    const patientId = await this.getPatientId(userId);
    const { page, limit, encounterId, practitionerId, mood, energyLevel } = query;
    const where: Prisma.HealthJournalWhereInput = { patientId, encounterId, practitionerId, mood, energyLevel };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.healthJournal.findMany({ where, include: { patient: true, encounter: true, practitioner: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.healthJournal.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(userId: string, id: string) {
    const patientId = await this.getPatientId(userId);
    const journal = await this.prisma.healthJournal.findFirst({ where: { id, patientId }, include: { patient: true, encounter: true, practitioner: true } });
    if (!journal) throw new NotFoundException('Health journal not found.');
    return journal;
  }

  async update(userId: string, id: string, dto: UpdateHealthJournalDto) {
    const patientId = await this.getPatientId(userId);
    const journal = await this.prisma.healthJournal.findFirst({ where: { id, patientId } });
    if (!journal) throw new NotFoundException('Health journal not found.');

    const updated = await this.prisma.healthJournal.update({
      where: { id },
      data: dto,
      include: { patient: true, encounter: true, practitioner: true },
    });

    await this.prisma.$executeRaw`
      DELETE FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${patientId}
        AND "sourceId" = ${id}
        AND "source" IN ('health-journal', 'health-journal-update')
    `;

    if (updated.exerciseMinutes !== null) {
      await this.goalsEngine.recordMetricEvent({
        patientId,
        metricType: 'EXERCISE',
        metricKey: 'exercise.minutes',
        loggedValue: updated.exerciseMinutes,
        occurredAt: updated.createdAt,
        source: 'health-journal',
        sourceId: updated.id,
      });
    }

    if (updated.waterIntakeMl !== null) {
      await this.goalsEngine.recordMetricEvent({
        patientId,
        metricType: 'HYDRATION',
        metricKey: 'hydration.ml',
        loggedValue: updated.waterIntakeMl,
        occurredAt: updated.createdAt,
        source: 'health-journal',
        sourceId: updated.id,
      });
    }

    return updated;
  }

  async remove(userId: string, id: string) {
    const patientId = await this.getPatientId(userId);
    const journal = await this.prisma.healthJournal.findFirst({ where: { id, patientId } });
    if (!journal) throw new NotFoundException('Health journal not found.');

    await this.prisma.$executeRaw`
      DELETE FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${patientId}
        AND "sourceId" = ${id}
        AND "source" = 'health-journal'
    `;
    await this.prisma.healthJournal.delete({ where: { id } });
    return { message: 'Health journal deleted successfully.' };
  }
}
