import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GoalsEngineService } from '../health-goals/goals-engine-v3.service';
import { CreateClinicalVitalDto } from './dto/create-clinical-vital.dto';
import { UpdateClinicalVitalDto } from './dto/update-clinical-vital.dto';
import { QueryClinicalVitalDto } from './dto/query-clinical-vital.dto';

@Injectable()
export class ClinicalVitalsService {
  constructor(private readonly prisma: PrismaService, private readonly goalsEngine: GoalsEngineService) {}

  private async syncWeightGoal(patientId: string, vitalId: string, vitalName: string, value: unknown, measuredAt: Date) {
    if (!vitalName.trim().toLowerCase().includes('weight')) return;
    const loggedValue = Number(value);
    if (!Number.isFinite(loggedValue)) return;
    await this.prisma.patient.update({ where: { id: patientId }, data: { weightKg: String(loggedValue) } });
    await this.goalsEngine.recordMetricEvent({ patientId, metricType: 'WEIGHT', metricKey: 'weight.kg', loggedValue, occurredAt: measuredAt, source: 'clinical-vital', sourceId: vitalId });
  }

  async create(dto: CreateClinicalVitalDto) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id: dto.encounterId }, select: { id: true, medicalRecord: { select: { patientId: true } } } });
    if (!encounter) throw new NotFoundException('Encounter not found.');
    if (!encounter.medicalRecord?.patientId) throw new NotFoundException('Patient for encounter not found.');
    const vitalType = await this.prisma.vitalType.findUnique({ where: { id: dto.vitalTypeId } });
    if (!vitalType) throw new NotFoundException('Vital type not found.');
    const measuredAt = new Date(dto.measuredAt);
    const vital = await this.prisma.clinicalVital.create({ data: { encounterId: dto.encounterId, vitalTypeId: dto.vitalTypeId, value: dto.value, measuredAt }, include: { encounter: true, vitalType: true } });
    await this.syncWeightGoal(encounter.medicalRecord.patientId, vital.id, vitalType.name, dto.value, measuredAt);
    return vital;
  }

  async findAll(query: QueryClinicalVitalDto) {
    const { page, limit, encounterId, vitalTypeId } = query;
    const where = { ...(encounterId && { encounterId }), ...(vitalTypeId && { vitalTypeId }) };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.clinicalVital.findMany({ where, include: { encounter: true, vitalType: true }, orderBy: { measuredAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.clinicalVital.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const vital = await this.prisma.clinicalVital.findUnique({ where: { id }, include: { encounter: true, vitalType: true } });
    if (!vital) throw new NotFoundException('Clinical vital not found.');
    return vital;
  }

  async update(id: string, dto: UpdateClinicalVitalDto) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.clinicalVital.update({ where: { id }, data: { encounterId: dto.encounterId, vitalTypeId: dto.vitalTypeId, value: dto.value, measuredAt: dto.measuredAt ? new Date(dto.measuredAt) : undefined }, include: { encounter: true, vitalType: true } });
    const oldEncounter = await this.prisma.encounter.findUnique({ where: { id: existing.encounterId }, select: { medicalRecord: { select: { patientId: true } } } });
    const newEncounter = await this.prisma.encounter.findUnique({ where: { id: updated.encounterId }, select: { medicalRecord: { select: { patientId: true } } } });
    if (oldEncounter?.medicalRecord?.patientId) await this.goalsEngine.removeSourceEvents(oldEncounter.medicalRecord.patientId, 'clinical-vital', existing.id);
    if (newEncounter?.medicalRecord?.patientId) await this.syncWeightGoal(newEncounter.medicalRecord.patientId, updated.id, updated.vitalType.name, updated.value, updated.measuredAt);
    return updated;
  }

  async remove(id: string) {
    const vital = await this.findOne(id);
    const encounter = await this.prisma.encounter.findUnique({ where: { id: vital.encounterId }, select: { medicalRecord: { select: { patientId: true } } } });
    if (encounter?.medicalRecord?.patientId) await this.goalsEngine.removeSourceEvents(encounter.medicalRecord.patientId, 'clinical-vital', vital.id);
    await this.prisma.clinicalVital.delete({ where: { id } });
    return { message: 'Clinical vital deleted successfully.' };
  }
}
