import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationQueueService } from '../notification-queue/notification-queue.service';
import { HealthGoalsService } from '../health-goals/health-goals.service';
import { CreatePatientMedicationDto } from './dto/create-patient-medication.dto';
import { UpdatePatientMedicationDto } from './dto/update-patient-medication.dto';
import { QueryPatientMedicationDto } from './dto/query-patient-medication.dto';
import { CreateMedicationReminderDto } from './dto/create-medication-reminder.dto';
import { MedicationAdherenceAction, RecordMedicationAdherenceDto } from '../medication-adherence/dto/record-medication-adherence.dto';
import { MedicationStatus, NotificationChannel, NotificationPriority, NotificationStatus, NotificationType } from '@prisma/client';

@Injectable()
export class PatientMedicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly healthGoalsService: HealthGoalsService,
  ) {}

  async create(dto: CreatePatientMedicationDto) {
    const healthPassport = await this.prisma.healthPassport.findUnique({ where: { id: dto.healthPassportId } });
    if (!healthPassport) throw new NotFoundException('Health passport not found.');
    const medication = await this.prisma.medication.findUnique({ where: { id: dto.medicationId } });
    if (!medication) throw new NotFoundException('Medication not found.');
    const existing = await this.prisma.patientMedication.findFirst({ where: { healthPassportId: dto.healthPassportId, medicationId: dto.medicationId } });
    if (existing) throw new ConflictException('This medication has already been added to the health passport.');
    return this.prisma.patientMedication.create({
      data: {
        healthPassportId: dto.healthPassportId,
        medicationId: dto.medicationId,
        dosage: dto.dosage?.trim(),
        frequency: dto.frequency?.trim(),
        route: dto.route?.trim(),
        indication: dto.indication?.trim(),
        instructions: dto.instructions?.trim(),
        prescribedBy: dto.prescribedBy?.trim(),
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        ongoing: dto.ongoing ?? true,
        sideEffects: dto.sideEffects?.trim(),
        effectiveness: dto.effectiveness?.trim(),
        status: dto.status ?? MedicationStatus.ACTIVE,
        notes: dto.notes?.trim(),
      },
      include: { medication: true, healthPassport: { include: { patient: { include: { person: true } } } } },
    });
  }

  async findAll(query: QueryPatientMedicationDto) {
    const { page, limit, healthPassportId, medicationId, status } = query;
    const where: Prisma.PatientMedicationWhereInput = { ...(healthPassportId && { healthPassportId }), ...(medicationId && { medicationId }), ...(status !== undefined && { status }) };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.patientMedication.findMany({ where, include: { medication: true, healthPassport: { include: { patient: { include: { person: true } } } } }, orderBy: { startedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.patientMedication.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const patientMedication = await this.prisma.patientMedication.findUnique({ where: { id }, include: { medication: true, healthPassport: { include: { patient: { include: { person: true } } } } } });
    if (!patientMedication) throw new NotFoundException('Patient medication not found.');
    return patientMedication;
  }

  async getClinicalReference(id: string, authenticatedUserId: string) {
    const patientMedication = await this.findOne(id);
    const ownerUserId = patientMedication.healthPassport.patient.userId;
    if (!authenticatedUserId || ownerUserId !== authenticatedUserId) {
      throw new NotFoundException('Patient medication not found.');
    }

    type ClinicalReferenceRow = {
      id: string;
      relationType: string;
      evidenceLevel: string | null;
      source: string | null;
      notes: string | null;
      symptomId: string;
      symptomName: string;
      symptomDescription: string | null;
      symptomCategory: string | null;
      symptomBodySystem: string | null;
    };

    const rows = await this.prisma.$queryRaw<ClinicalReferenceRow[]>`
      SELECT
        r."id" AS "id",
        r."relationType" AS "relationType",
        r."evidenceLevel" AS "evidenceLevel",
        r."source" AS "source",
        r."notes" AS "notes",
        s."id" AS "symptomId",
        s."name" AS "symptomName",
        s."description" AS "symptomDescription",
        s."category" AS "symptomCategory",
        s."bodySystem" AS "symptomBodySystem"
      FROM "MedicationClinicalReference" r
      INNER JOIN "Symptom" s ON s."id" = r."symptomId"
      WHERE r."medicationId" = ${patientMedication.medicationId}
        AND r."active" = true
        AND s."active" = true
      ORDER BY r."relationType" ASC, s."name" ASC
    `;

    const grouped = {
      sideEffects: rows.filter((row) => row.relationType === 'SIDE_EFFECT'),
      relievesSymptoms: rows.filter((row) => row.relationType === 'RELIEVES_SYMPTOM'),
      mayMaskSymptoms: rows.filter((row) => row.relationType === 'MAY_MASK_SYMPTOM'),
    };

    const mapSymptom = (row: ClinicalReferenceRow) => ({
      id: row.symptomId,
      name: row.symptomName,
      description: row.symptomDescription,
      category: row.symptomCategory,
      bodySystem: row.symptomBodySystem,
      evidenceLevel: row.evidenceLevel,
      source: row.source,
      notes: row.notes,
    });

    return {
      medication: {
        id: patientMedication.medication.id,
        name: patientMedication.medication.name,
        genericName: patientMedication.medication.genericName,
        category: patientMedication.medication.category,
      },
      sideEffects: grouped.sideEffects.map(mapSymptom),
      relievesSymptoms: grouped.relievesSymptoms.map(mapSymptom),
      mayMaskSymptoms: grouped.mayMaskSymptoms.map(mapSymptom),
      counts: {
        sideEffects: grouped.sideEffects.length,
        relievesSymptoms: grouped.relievesSymptoms.length,
        mayMaskSymptoms: grouped.mayMaskSymptoms.length,
      },
    };
  }

  async update(id: string, dto: UpdatePatientMedicationDto) {
    const existing = await this.findOne(id);
    const healthPassportId = dto.healthPassportId ?? existing.healthPassportId;
    const medicationId = dto.medicationId ?? existing.medicationId;
    if (dto.healthPassportId && !(await this.prisma.healthPassport.findUnique({ where: { id: dto.healthPassportId } }))) throw new NotFoundException('Health passport not found.');
    if (dto.medicationId && !(await this.prisma.medication.findUnique({ where: { id: dto.medicationId } }))) throw new NotFoundException('Medication not found.');
    const duplicate = await this.prisma.patientMedication.findFirst({ where: { id: { not: id }, healthPassportId, medicationId } });
    if (duplicate) throw new ConflictException('This medication has already been added to the health passport.');
    return this.prisma.patientMedication.update({
      where: { id },
      data: {
        healthPassportId,
        medicationId,
        dosage: dto.dosage?.trim(),
        frequency: dto.frequency?.trim(),
        route: dto.route?.trim(),
        indication: dto.indication?.trim(),
        instructions: dto.instructions?.trim(),
        prescribedBy: dto.prescribedBy?.trim(),
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        ongoing: dto.ongoing,
        sideEffects: dto.sideEffects?.trim(),
        effectiveness: dto.effectiveness?.trim(),
        status: dto.status,
        notes: dto.notes?.trim(),
      },
      include: { medication: true, healthPassport: { include: { patient: { include: { person: true } } } } },
    });
  }

  async recordAdherence(id: string, dto: RecordMedicationAdherenceDto, authenticatedUserId: string) {
    const existing = await this.prisma.patientMedication.findUnique({ where: { id }, include: { medication: true, healthPassport: { include: { patient: { include: { person: true } } } } } });
    if (!existing) throw new NotFoundException('Patient medication not found.');
    const patientId = existing.healthPassport.patient.id;
    const ownerUserId = existing.healthPassport.patient.userId;
    if (!authenticatedUserId || ownerUserId !== authenticatedUserId) throw new NotFoundException('Patient medication not found.');
    if (dto.medicationId && dto.medicationId !== existing.medicationId) throw new BadRequestException('Medication does not match the patient medication record.');

    const settings = await this.prisma.healthJournalSettings.findUnique({ where: { patientId }, select: { trackMedications: true } });
    if (settings && !settings.trackMedications) return { tracked: false, message: 'Medication tracking is disabled in your health tracking preferences.', medication: existing, affectedGoals: [] };

    const previousAdherence = existing.adherencePercentage == null ? null : Number(existing.adherencePercentage);
    const previousMissed = existing.missedDoses ?? 0;
    let previousTotal = 0;
    let previousTaken = 0;
    if (previousAdherence != null) {
      if (previousAdherence >= 100) { previousTotal = 1; previousTaken = 1; }
      else if (previousAdherence <= 0) { previousTotal = Math.max(1, previousMissed); previousTaken = 0; }
      else { previousTotal = Math.max(1, Math.round(previousMissed / (1 - previousAdherence / 100))); previousTaken = Math.max(0, previousTotal - previousMissed); }
    }

    const totalDoses = previousTotal + 1;
    const takenDoses = previousTaken + (dto.action === MedicationAdherenceAction.TAKEN ? 1 : 0);
    const missedDoses = previousMissed + (dto.action === MedicationAdherenceAction.SKIPPED ? 1 : 0);
    const adherencePercentage = Number(((takenDoses / totalDoses) * 100).toFixed(2));
    const medication = await this.prisma.patientMedication.update({ where: { id }, data: { adherencePercentage, missedDoses }, include: { medication: true, healthPassport: { include: { patient: { include: { person: true } } } } } });

    const measuredAt = dto.scheduledFor ? new Date(dto.scheduledFor) : new Date();
    const effectiveMeasuredAt = Number.isNaN(measuredAt.getTime()) ? new Date() : measuredAt;
    const source = 'medication-adherence';
    const sourceId = `${id}:${effectiveMeasuredAt.toISOString()}`;

    const existingEvent = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "HealthGoalMetricEvent"
      WHERE "patientId" = ${patientId}
        AND "source" = ${source}
        AND "sourceId" = ${sourceId}
      LIMIT 1
    `;

    if (existingEvent.length) {
      await this.prisma.$executeRaw`
        UPDATE "HealthGoalMetricEvent"
        SET "metricType" = 'MEDICATION',
            "metricKey" = 'medication.adherence',
            "loggedValue" = ${adherencePercentage},
            "occurredAt" = ${effectiveMeasuredAt}
        WHERE "id" = ${existingEvent[0].id}::uuid
      `;
    } else {
      await this.prisma.$executeRaw`
        INSERT INTO "HealthGoalMetricEvent"
          ("id", "patientId", "metricType", "metricKey", "loggedValue", "occurredAt", "source", "sourceId")
        VALUES
          (gen_random_uuid(), ${patientId}, 'MEDICATION', 'medication.adherence', ${adherencePercentage}, ${effectiveMeasuredAt}, ${source}, ${sourceId})
    `;
    }

    await this.healthGoalsService.recomputeMetricForPatient(
      patientId,
      'MEDICATION',
      'medication.adherence',
      effectiveMeasuredAt,
    );

    const dayParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(effectiveMeasuredAt);
    const dayKey = `${dayParts.find((part) => part.type === 'year')?.value}-${dayParts.find((part) => part.type === 'month')?.value}-${dayParts.find((part) => part.type === 'day')?.value}`;
    const medicationLabel = existing.medication.name || existing.medication.genericName || 'Medication';
    const journalTitle = `Medication adherence · ${medicationLabel} · ${dayKey}`;
    let journalUpdated = false;
    try {
      const existingJournal = await this.prisma.healthJournal.findFirst({
        where: { patientId, title: journalTitle },
        select: { id: true },
      });
      const journalText = [
        `Medication adherence update for ${dayKey}: ${dto.action === MedicationAdherenceAction.TAKEN ? 'dose marked taken' : 'dose marked skipped'}.`,
        `Current overall adherence: ${adherencePercentage.toFixed(1)}%.`,
        `Missed doses recorded: ${missedDoses}.`,
      ].join(' ');
      if (existingJournal) {
        await this.prisma.healthJournal.update({
          where: { id: existingJournal.id },
          data: {
            journal: journalText,
            notes: 'Updated from Today medication actions.',
          },
        });
      } else {
        await this.prisma.healthJournal.create({
          data: {
            patientId,
            title: journalTitle,
            journal: journalText,
            notes: 'Updated from Today medication actions.',
            createdAt: effectiveMeasuredAt,
          },
        });
      }
      journalUpdated = true;
    } catch {
      journalUpdated = false;
    }

    return {
      tracked: true,
      action: dto.action,
      scheduledFor: dto.scheduledFor ?? null,
      medication,
      adherencePercentage,
      missedDoses,
      affectedGoals: [],
      journal: { updated: journalUpdated, title: journalTitle, dayKey },
    };
  }

  async scheduleReminder(id: string, dto: CreateMedicationReminderDto, authenticatedUserId: string) {
    const medication = await this.findOne(id);
    const ownerUserId = medication.healthPassport.patient.userId;
    if (!authenticatedUserId || ownerUserId !== authenticatedUserId) throw new NotFoundException('Patient medication not found.');
    const medicationName = medication.medication.name || medication.medication.genericName || 'Medication';
    const scheduledFor = new Date(dto.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime())) throw new ConflictException('The reminder time is invalid.');
    if (scheduledFor.getTime() <= Date.now()) throw new ConflictException('The reminder must be scheduled in the future.');
    const notification = await this.notificationsService.create({ userId: ownerUserId, type: NotificationType.REMINDER, title: `Medication reminder: ${medicationName}`, body: `It is time to take ${medicationName}${medication.dosage ? ` (${medication.dosage})` : ''}. Follow the instructions provided by your healthcare professional.`, channel: dto.channel ?? NotificationChannel.IN_APP, status: NotificationStatus.PENDING, priority: NotificationPriority.NORMAL, actionUrl: '/medications', actionLabel: 'View medication', scheduledFor: scheduledFor.toISOString() });
    await this.notificationQueueService.create({ notificationId: notification.id, scheduledFor: scheduledFor.toISOString() });
    return { reminder: notification, scheduledFor: scheduledFor.toISOString() };
  }

  async remove(id: string, authenticatedUserId: string) {
    const medication = await this.findOne(id);
    const ownerUserId = medication.healthPassport.patient.userId;
    if (!authenticatedUserId || ownerUserId !== authenticatedUserId) {
      throw new NotFoundException('Patient medication not found.');
    }
    await this.prisma.patientMedication.delete({ where: { id } });
    return { message: 'Patient medication deleted successfully.' };
  }
}
