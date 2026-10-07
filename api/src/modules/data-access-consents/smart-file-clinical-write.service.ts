import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmartFileClinicalService } from './smart-file-clinical.service';
import {
  SmartFileClinicalWriteAction,
  SmartFileClinicalWriteDto,
  SmartFileClinicalWriteSection,
} from './dto/smart-file-clinical-write.dto';

type Data = Record<string, unknown>;

const VALUES = {
  clinicalEpisodeType: [
    'ACUTE','CHRONIC','FOLLOW_UP','EMERGENCY','SURGICAL','MATERNITY',
    'MENTAL_HEALTH','TELEMEDICINE','PREVENTIVE','WELLNESS','REHABILITATION','OTHER',
  ],
  clinicalEpisodeStatus: ['ACTIVE','ONGOING','RESOLVED','CANCELLED','CLOSED'],
  episodePriority: ['ROUTINE','LOW','MEDIUM','HIGH','URGENT','CRITICAL'],
  symptomLogStatus: ['DRAFT','ACTIVE','COMPLETED','CANCELLED'],
  symptomSeverity: ['NONE','MILD','MODERATE','SEVERE','VERY_SEVERE'],
  symptomProgression: ['IMPROVING','STABLE','WORSENING','FLUCTUATING','RESOLVED'],
  symptomFrequency: ['CONSTANT','INTERMITTENT','OCCASIONAL','RARE','UNKNOWN'],
  painCharacter: ['SHARP','DULL','THROBBING','STABBING','BURNING','CRAMPING','PRESSURE','TIGHTNESS','ACHING','OTHER'],
  diagnosisStatus: ['ACTIVE','RESOLVED','REMISSION','RECURRENT'],
  diagnosisSeverity: ['MILD','MODERATE','SEVERE','CRITICAL'],
  conditionStatus: ['ACTIVE','RESOLVED','REMISSION','RECURRENT'],
  allergyStatus: ['ACTIVE','INACTIVE','RESOLVED'],
  allergySeverity: ['MILD','MODERATE','SEVERE'],
  immunizationStatus: ['SCHEDULED','COMPLETED','MISSED','DECLINED'],
  medicationStatus: ['ACTIVE','PAUSED','COMPLETED','DISCONTINUED'],
  procedureStatus: ['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'],
  carePlanStatus: ['DRAFT','ACTIVE','ON_HOLD','COMPLETED','CANCELLED'],
  carePlanGoalStatus: ['NOT_STARTED','IN_PROGRESS','ACHIEVED','CANCELLED'],
  carePlanTaskStatus: ['PENDING','IN_PROGRESS','COMPLETED','CANCELLED'],
  referralType: ['INTERNAL','EXTERNAL'],
  referralPriority: ['ROUTINE','URGENT','STAT'],
  referralStatus: ['DRAFT','PENDING','ACCEPTED','REJECTED','SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'],
  labOrderStatus: ['DRAFT','ORDERED','COLLECTED','IN_PROGRESS','COMPLETED','CANCELLED'],
  imagingOrderStatus: ['ORDERED','SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'],
  imagingPriority: ['ROUTINE','URGENT','STAT'],
  prescriptionStatus: ['DRAFT','ACTIVE','COMPLETED','CANCELLED','EXPIRED'],
  prescriptionFrequency: ['ONCE_DAILY','TWICE_DAILY','THREE_TIMES_DAILY','FOUR_TIMES_DAILY','EVERY_4_HOURS','EVERY_6_HOURS','EVERY_8_HOURS','EVERY_12_HOURS','WEEKLY','MONTHLY','AS_NEEDED'],
  prescriptionRoute: ['ORAL','TOPICAL','INTRAVENOUS','INTRAMUSCULAR','SUBCUTANEOUS','INHALATION','RECTAL','NASAL','OPHTHALMIC','OTIC','OTHER'],
};

@Injectable()
export class SmartFileClinicalWriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly smartFileClinical: SmartFileClinicalService,
  ) {}

  async write(
    practitionerUserId: string,
    consentId: string,
    dto: SmartFileClinicalWriteDto,
  ) {
    const { consent, patient, practitioner } =
      await this.smartFileClinical.requireClinicalWriteAccess(
        practitionerUserId,
        consentId,
      );

    const result = await this.prisma.$transaction(async (tx) => {
      const value = await this.applyWrite(
        tx as any,
        consent,
        patient,
        practitioner,
        dto,
      );

      await tx.auditLog.create({
        data: {
          userId: practitionerUserId,
          action:
            dto.action === SmartFileClinicalWriteAction.UPDATE
              ? AuditAction.UPDATE
              : AuditAction.CREATE,
          entityType: `SmartFileClinical/${dto.section}`,
          entityId: String(dto.id ?? value?.id ?? randomUUID()),
          newValues: this.sanitizeForAudit(dto.data) as any,
          success: true,
        },
      });

      return value;
    });

    const notice = this.buildPatientNotice(
      dto.section,
      dto.action,
      this.practitionerName(practitioner),
      result,
    );

    if (notice) {
      await this.notifications.create({
        userId: patient.userId,
        type: notice.type,
        title: notice.title,
        body: notice.body,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        priority: NotificationPriority.NORMAL,
        actionUrl: notice.actionUrl,
        actionLabel: notice.actionLabel,
      });
    }

    return {
      data: result,
      smartFile: 'updated',
      patientVisible: true,
    };
  }

  async searchReferences(
    practitionerUserId: string,
    consentId: string,
    type: string,
    search?: string,
  ) {
    await this.smartFileClinical.requireClinicalWriteAccess(
      practitionerUserId,
      consentId,
    );
    const q = search?.trim() || undefined;
    const db = this.prisma as any;

    switch (type) {
      case 'diagnoses':
        return db.diagnosis.findMany({
          where: {
            active: true,
            searchable: true,
            ...(q
              ? { OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { icd10Code: { contains: q, mode: 'insensitive' } },
                  { snomedCode: { contains: q, mode: 'insensitive' } },
                ] }
              : {}),
          },
          select: { id: true, name: true, icd10Code: true, snomedCode: true },
          orderBy: { name: 'asc' },
          take: 30,
        });
      case 'procedures':
        return db.procedure.findMany({
          where: {
            active: true,
            searchable: true,
            ...(q
              ? { OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { cptCode: { contains: q, mode: 'insensitive' } },
                  { snomedCode: { contains: q, mode: 'insensitive' } },
                ] }
              : {}),
          },
          select: { id: true, name: true, cptCode: true, snomedCode: true },
          orderBy: { name: 'asc' },
          take: 30,
        });
      case 'conditions':
        return db.condition.findMany({
          where: {
            active: true,
            searchable: true,
            ...(q
              ? { OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { icd10Code: { contains: q, mode: 'insensitive' } },
                  { snomedCode: { contains: q, mode: 'insensitive' } },
                ] }
              : {}),
          },
          select: { id: true, name: true, icd10Code: true, snomedCode: true },
          orderBy: { name: 'asc' },
          take: 30,
        });
      case 'allergies':
        return db.allergy.findMany({
          where: {
            active: true,
            searchable: true,
            ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
          },
          select: { id: true, name: true, category: true },
          orderBy: { name: 'asc' },
          take: 30,
        });
      case 'symptoms':
        return db.symptom.findMany({
          where: {
            active: true,
            searchable: true,
            ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
          },
          select: { id: true, name: true, description: true, category: true, bodySystem: true },
          orderBy: { name: 'asc' },
          take: 30,
        });
      case 'immunisations':
        return db.immunization.findMany({
          where: {
            active: true,
            searchable: true,
            ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
          },
          select: { id: true, name: true, manufacturer: true },
          orderBy: { name: 'asc' },
          take: 30,
        });
      case 'medications':
        return db.medication.findMany({
          where: {
            active: true,
            searchable: true,
            ...(q
              ? { OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { genericName: { contains: q, mode: 'insensitive' } },
                  { brandName: { contains: q, mode: 'insensitive' } },
                ] }
              : {}),
          },
          select: { id: true, name: true, genericName: true, brandName: true },
          orderBy: [{ genericName: 'asc' }, { name: 'asc' }],
          take: 30,
        });
      case 'vitals':
        return db.vitalType.findMany({
          where: {
            active: true,
            searchable: true,
            ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
          },
          select: { id: true, code: true, name: true, unit: true },
          orderBy: { name: 'asc' },
          take: 30,
        });
      case 'lab-tests':
        return db.labTest.findMany({
          where: {
            active: true,
            searchable: true,
            ...(q
              ? { OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { code: { contains: q, mode: 'insensitive' } },
                  { loincCode: { contains: q, mode: 'insensitive' } },
                ] }
              : {}),
          },
          select: { id: true, name: true, code: true, loincCode: true },
          orderBy: { name: 'asc' },
          take: 30,
        });
      case 'imaging-procedures':
        return db.imagingProcedure.findMany({
          where: {
            active: true,
            searchable: true,
            ...(q
              ? { OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { code: { contains: q, mode: 'insensitive' } },
                  { snomedCode: { contains: q, mode: 'insensitive' } },
                ] }
              : {}),
          },
          select: { id: true, name: true, code: true, modality: true, bodyPart: true },
          orderBy: { name: 'asc' },
          take: 30,
        });
      case 'practitioners': {
        const rows = await db.practitioner.findMany({
          where: {
            status: 'ACTIVE',
            verified: true,
            ...(q
              ? { OR: [
                  { registrationNumber: { contains: q, mode: 'insensitive' } },
                  { person: {
                      OR: [
                        { firstName: { contains: q, mode: 'insensitive' } },
                        { lastName: { contains: q, mode: 'insensitive' } },
                      ],
                    } },
                ] }
              : {}),
          },
          select: {
            id: true,
            registrationNumber: true,
            practitionerType: true,
            person: { select: { firstName: true, lastName: true } },
          },
          orderBy: { registrationNumber: 'asc' },
          take: 30,
        });
        return rows.map((x: any) => ({
          id: x.id,
          name: `${x.person.firstName} ${x.person.lastName}`.trim(),
          registrationNumber: x.registrationNumber,
          practitionerType: x.practitionerType,
        }));
      }
      case 'laboratories':
        return db.laboratory.findMany({
          where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
          take: 30,
        });
      case 'imaging-centers':
        return db.imagingCenter.findMany({
          where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
          take: 30,
        });
      default:
        throw new BadRequestException('Unsupported Smart File reference type.');
    }
  }

  private async applyWrite(
    tx: any,
    consent: any,
    patient: { id: string; userId: string },
    practitioner: any,
    dto: SmartFileClinicalWriteDto,
  ) {
    switch (dto.section) {
      case SmartFileClinicalWriteSection.ENCOUNTER:
        return this.writeEncounter(tx, consent, patient.id, practitioner.id, dto);
      case SmartFileClinicalWriteSection.CLINICAL_NOTE:
        return this.writeClinicalNoteRecord(tx, patient.id, dto);
      case SmartFileClinicalWriteSection.DIAGNOSIS:
        return this.writeDiagnosis(tx, patient.id, practitioner, dto);
      case SmartFileClinicalWriteSection.PROCEDURE:
        return this.writeProcedure(tx, patient.id, practitioner, dto);
      case SmartFileClinicalWriteSection.VITAL:
        return this.writeVital(tx, consent, patient.id, practitioner.id, dto);
      case SmartFileClinicalWriteSection.SYMPTOM_EPISODE:
        return this.writeSymptomEpisode(tx, consent, patient.id, practitioner.id, dto);
      case SmartFileClinicalWriteSection.SYMPTOM_LOG:
        return this.writeSymptomLog(tx, patient.id, dto);
      case SmartFileClinicalWriteSection.SYMPTOM_ITEM:
        return this.writeSymptomItem(tx, patient.id, dto);
      case SmartFileClinicalWriteSection.PRESCRIPTION:
        return this.writePrescription(tx, patient.id, practitioner, consent, dto);
      case SmartFileClinicalWriteSection.PRESCRIPTION_ITEM:
        return this.writePrescriptionItem(tx, patient.id, dto);
      case SmartFileClinicalWriteSection.PATIENT_MEDICATION:
        return this.writePatientMedication(tx, patient.id, practitioner, dto);
      case SmartFileClinicalWriteSection.HEALTH_PASSPORT:
        return this.writeHealthPassport(tx, patient.id, dto);
      case SmartFileClinicalWriteSection.MEDICAL_RECORD:
        return this.writeMedicalRecord(tx, patient.id, dto);
      case SmartFileClinicalWriteSection.CONDITION:
        return this.writeCondition(tx, patient.id, practitioner, dto);
      case SmartFileClinicalWriteSection.ALLERGY:
        return this.writeAllergy(tx, patient.id, practitioner, dto);
      case SmartFileClinicalWriteSection.IMMUNIZATION:
        return this.writeImmunization(tx, patient.id, practitioner, dto);
      case SmartFileClinicalWriteSection.CARE_PLAN:
        return this.writeCarePlan(tx, patient.id, practitioner.id, dto);
      case SmartFileClinicalWriteSection.CARE_PLAN_GOAL:
        return this.writeCarePlanGoal(tx, patient.id, dto);
      case SmartFileClinicalWriteSection.CARE_PLAN_TASK:
        return this.writeCarePlanTask(tx, patient.id, dto);
      case SmartFileClinicalWriteSection.CARE_PLAN_NOTE:
        return this.writeCarePlanNote(tx, patient.id, practitioner.userId, dto);
      case SmartFileClinicalWriteSection.REFERRAL:
        return this.writeReferral(tx, consent, patient.id, practitioner.id, dto);
      case SmartFileClinicalWriteSection.REFERRAL_NOTE:
        return this.writeReferralNote(tx, patient.id, practitioner.userId, dto);
      case SmartFileClinicalWriteSection.LAB_ORDER:
        return this.writeLabOrder(tx, consent, patient.id, practitioner.id, dto);
      case SmartFileClinicalWriteSection.IMAGING_ORDER:
        return this.writeImagingOrder(tx, consent, patient.id, practitioner.id, dto);
      case SmartFileClinicalWriteSection.IMAGING_REPORT:
        return this.writeImagingReport(tx, patient.id, practitioner.id, dto);
      case SmartFileClinicalWriteSection.HEALTH_JOURNAL:
        return this.writeHealthJournal(tx, patient.id, practitioner.id, dto);
      default:
        throw new BadRequestException('Unsupported Smart File clinical update.');
    }
  }

  private async writeEncounter(tx: any, consent: any, patientId: string, practitionerId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const medicalRecord = await tx.medicalRecord.upsert({
      where: { patientId },
      update: {},
      create: { patientId },
      select: { id: true },
    });
    const encounterTypeId = await this.encounterTypeId(tx, d.encounterTypeId);

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'encounter id');
      await this.assertPatientEncounter(tx, id, patientId);
      const updated = await tx.encounter.update({
        where: { id },
        data: this.encounterData(d, encounterTypeId),
        include: { encounterType: true, practitioner: { include: { person: true } }, clinicalNotes: true },
      });
      await this.writeClinicalNote(tx, id, d);
      return tx.encounter.findUnique({ where: { id }, include: { encounterType: true, practitioner: { include: { person: true } }, clinicalNotes: true } });
    }

    const encounterId = await this.findOrCreateEncounter(tx, consent, patientId, practitionerId, {
      encounterTypeId,
      startedAt: this.date(d.startedAt) ?? new Date(),
      endedAt: this.date(d.endedAt),
      chiefComplaint: this.string(d.chiefComplaint),
      assessment: this.string(d.assessment),
      plan: this.string(d.plan),
      notes: this.string(d.notes),
    });

    await this.writeClinicalNote(tx, encounterId, d);
    return tx.encounter.findUnique({
      where: { id: encounterId },
      include: { encounterType: true, practitioner: { include: { person: true } }, clinicalNotes: true },
    });
  }

  private async writeClinicalNoteRecord(tx: any, patientId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const encounterId = this.requiredId(d.encounterId, 'encounterId');
    await this.assertPatientEncounter(tx, encounterId, patientId);
    const note = this.required(d.note ?? d.clinicalNote, 'note');
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'clinical note id');
      const found = await tx.clinicalNote.findFirst({
        where: { id, encounter: { medicalRecord: { patientId } } },
        select: { id: true },
      });
      if (!found) throw new NotFoundException('Clinical note not found for this patient.');
      return tx.clinicalNote.update({
        where: { id },
        data: { title: this.string(d.title ?? d.clinicalNoteTitle), note },
      });
    }
    return tx.clinicalNote.create({
      data: { encounterId, title: this.string(d.title ?? d.clinicalNoteTitle), note },
    });
  }

  private async writeDiagnosis(tx: any, patientId: string, practitioner: any, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const passport = await this.ensureHealthPassport(tx, patientId);
    const diagnosisId = this.requiredId(d.diagnosisId, 'diagnosisId');
    await this.assertExists(tx.diagnosis, diagnosisId, 'Diagnosis');

    const data = {
      diagnosisId,
      diagnosedAt: this.date(d.diagnosedAt),
      resolvedAt: this.date(d.resolvedAt),
      status: this.enum(d.status, VALUES.diagnosisStatus, 'diagnosis status') ?? 'ACTIVE',
      severity: this.enum(d.severity, VALUES.diagnosisSeverity, 'diagnosis severity'),
      stage: this.string(d.stage),
      primaryDiagnosis: this.bool(d.primaryDiagnosis),
      confirmed: this.bool(d.confirmed) ?? true,
      diagnosedBy: this.string(d.diagnosedBy) ?? this.practitionerName(practitioner),
      encounterId: this.string(d.encounterId),
      treatmentPlan: this.string(d.treatmentPlan),
      outcome: this.string(d.outcome),
      notes: this.string(d.notes),
    };

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'diagnosis id');
      await this.assertPatientDiagnosis(tx, id, patientId);
      return tx.patientDiagnosis.update({
        where: { id },
        data,
        include: { diagnosis: true, encounter: true },
      });
    }

    return tx.patientDiagnosis.create({
      data: { healthPassportId: passport.id, ...data, diagnosedAt: data.diagnosedAt ?? new Date() },
      include: { diagnosis: true, encounter: true },
    });
  }

  private async writeProcedure(tx: any, patientId: string, practitioner: any, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const passport = await this.ensureHealthPassport(tx, patientId);
    const procedureId = this.requiredId(d.procedureId, 'procedureId');
    await this.assertExists(tx.procedure, procedureId, 'Procedure');
    const data = {
      procedureId,
      performedAt: this.date(d.performedAt),
      status: this.enum(d.status, VALUES.procedureStatus, 'procedure status') ?? 'COMPLETED',
      outcome: this.string(d.outcome),
      performer: this.string(d.performer) ?? this.practitionerName(practitioner),
      facility: this.string(d.facility),
      complications: this.string(d.complications),
      followUpRequired: this.bool(d.followUpRequired) ?? false,
      followUpDate: this.date(d.followUpDate),
      notes: this.string(d.notes),
      encounterId: this.string(d.encounterId),
    };

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'procedure id');
      await this.assertPatientProcedure(tx, id, patientId);
      return tx.patientProcedure.update({ where: { id }, data, include: { procedure: true, encounter: true } });
    }

    return tx.patientProcedure.create({
      data: { healthPassportId: passport.id, ...data, performedAt: data.performedAt ?? new Date() },
      include: { procedure: true, encounter: true },
    });
  }

  private async writeVital(tx: any, consent: any, patientId: string, practitionerId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const encounterId = await this.resolveEncounterId(tx, consent, patientId, practitionerId, this.string(d.encounterId));
    const vitalTypeId = this.requiredId(d.vitalTypeId, 'vitalTypeId');
    await this.assertExists(tx.vitalType, vitalTypeId, 'Vital type');
    const data = {
      encounterId,
      vitalTypeId,
      value: this.number(d.value, 'value'),
      measuredAt: this.date(d.measuredAt) ?? new Date(),
    };

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'vital id');
      const existing = await tx.clinicalVital.findFirst({
        where: { id, encounter: { medicalRecord: { patientId } } },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Vital not found for this patient.');
      return tx.clinicalVital.update({ where: { id }, data, include: { vitalType: true, encounter: true } });
    }

    return tx.clinicalVital.create({ data, include: { vitalType: true, encounter: true } });
  }

  private async writeSymptomEpisode(tx: any, consent: any, patientId: string, practitionerId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const data = {
      title: this.required(d.title, 'title'),
      description: this.string(d.description),
      type: this.enum(d.type, VALUES.clinicalEpisodeType, 'episode type') ?? 'ACUTE',
      status: this.enum(d.status, VALUES.clinicalEpisodeStatus, 'episode status') ?? 'ACTIVE',
      priority: this.enum(d.priority, VALUES.episodePriority, 'episode priority') ?? 'ROUTINE',
      startedAt: this.date(d.startedAt) ?? new Date(),
      endedAt: this.date(d.endedAt),
      resolvedAt: this.date(d.resolvedAt),
      practitionerId,
    };

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'episode id');
      await this.assertPatientEpisode(tx, id, patientId);
      return tx.clinicalEpisode.update({ where: { id }, data });
    }

    const encounterId = await this.resolveEncounterId(tx, consent, patientId, practitionerId, this.string(d.encounterId));
    const episode = await tx.clinicalEpisode.create({
      data: {
        patientId,
        encounterId,
        appointmentId: consent.appointmentId ?? undefined,
        ...data,
      },
    });

    if (d.symptomLog && typeof d.symptomLog === 'object') {
      const log = await tx.symptomLog.create({
        data: {
          clinicalEpisodeId: episode.id,
          title: this.string((d.symptomLog as Data).title),
          notes: this.string((d.symptomLog as Data).notes),
          status: this.enum((d.symptomLog as Data).status, VALUES.symptomLogStatus, 'symptom log status') ?? 'ACTIVE',
          overallSeverity: this.enum((d.symptomLog as Data).overallSeverity, VALUES.symptomSeverity, 'symptom severity'),
          progression: this.enum((d.symptomLog as Data).progression, VALUES.symptomProgression, 'symptom progression'),
          startedAt: this.date((d.symptomLog as Data).startedAt) ?? data.startedAt,
          resolvedAt: this.date((d.symptomLog as Data).resolvedAt),
        },
      });
      const item = (d.symptomLog as Data).item;
      if (item && typeof item === 'object') {
        await this.createSymptomItem(tx, patientId, log.id, item as Data);
      }
    }

    return tx.clinicalEpisode.findUnique({
      where: { id: episode.id },
      include: { symptomLogs: { include: { symptoms: { include: { symptom: true } } } } },
    });
  }

  private async writeSymptomLog(tx: any, patientId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const episodeId = this.requiredId(d.clinicalEpisodeId, 'clinicalEpisodeId');
    await this.assertPatientEpisode(tx, episodeId, patientId);
    const data = {
      clinicalEpisodeId: episodeId,
      title: this.string(d.title),
      notes: this.string(d.notes),
      status: this.enum(d.status, VALUES.symptomLogStatus, 'symptom log status') ?? 'ACTIVE',
      overallSeverity: this.enum(d.overallSeverity, VALUES.symptomSeverity, 'symptom severity'),
      progression: this.enum(d.progression, VALUES.symptomProgression, 'symptom progression'),
      startedAt: this.date(d.startedAt) ?? new Date(),
      resolvedAt: this.date(d.resolvedAt),
    };
    const id = dto.action === SmartFileClinicalWriteAction.UPDATE
      ? this.requiredId(dto.id, 'symptom log id')
      : undefined;
    if (id) {
      const found = await tx.symptomLog.findFirst({ where: { id, clinicalEpisode: { patientId } }, select: { id: true } });
      if (!found) throw new NotFoundException('Symptom log not found for this patient.');
      return tx.symptomLog.update({ where: { id }, data });
    }
    return tx.symptomLog.create({ data });
  }

  private async writeSymptomItem(tx: any, patientId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const symptomLogId = this.requiredId(d.symptomLogId, 'symptomLogId');
    await tx.symptomLog.findFirstOrThrow({
      where: { id: symptomLogId, clinicalEpisode: { patientId } },
      select: { id: true },
    });
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'symptom item id');
      const found = await tx.symptomLogItem.findFirst({ where: { id, symptomLog: { clinicalEpisode: { patientId } } }, select: { id: true } });
      if (!found) throw new NotFoundException('Symptom item not found for this patient.');
      return tx.symptomLogItem.update({
        where: { id },
        data: this.symptomItemData(d),
        include: { symptom: true, symptomLog: true },
      });
    }
    return tx.symptomLogItem.create({
      data: { symptomLogId, ...this.symptomItemData(d, true) },
      include: { symptom: true, symptomLog: true },
    });
  }

  private async createSymptomItem(tx: any, patientId: string, symptomLogId: string, d: Data) {
    const symptomId = this.requiredId(d.symptomId, 'symptomId');
    await this.assertExists(tx.symptom, symptomId, 'Symptom');
    return tx.symptomLogItem.create({
      data: { symptomLogId, ...this.symptomItemData({ ...d, symptomId }, true) },
    });
  }

  private symptomItemData(d: Data, creating = false) {
    const data = {
      symptomId: this.required(d.symptomId, 'symptomId'),
      aISymptomId: this.string(d.aISymptomId),
      severity: this.enum(d.severity, VALUES.symptomSeverity, 'symptom severity') ?? 'MILD',
      progression: this.enum(d.progression, VALUES.symptomProgression, 'symptom progression'),
      frequency: this.enum(d.frequency, VALUES.symptomFrequency, 'symptom frequency'),
      painCharacter: this.enum(d.painCharacter, VALUES.painCharacter, 'pain character'),
      painScore: this.integer(d.painScore),
      durationMinutes: this.integer(d.durationMinutes),
      onsetAt: this.date(d.onsetAt),
      resolvedAt: this.date(d.resolvedAt),
      intermittent: this.bool(d.intermittent) ?? false,
      recurring: this.bool(d.recurring) ?? false,
      suspectedTrigger: this.string(d.suspectedTrigger),
      aggravatingFactors: this.string(d.aggravatingFactors),
      relievingFactors: this.string(d.relievingFactors),
      notes: this.string(d.notes),
    };
    return creating ? data : data;
  }

  private async writePrescription(tx: any, patientId: string, practitioner: any, consent: any, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const encounterId = await this.resolveEncounterId(tx, consent, patientId, practitioner.id, this.string(d.encounterId));

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'prescription id');
      const found = await tx.prescription.findFirst({ where: { id, patientId }, select: { id: true } });
      if (!found) throw new NotFoundException('Prescription not found for this patient.');
      const updated = await tx.prescription.update({
        where: { id },
        data: {
          status: this.enum(d.status, VALUES.prescriptionStatus, 'prescription status'),
          expiresAt: this.date(d.expiresAt),
          notes: this.string(d.notes),
        },
        include: { items: { include: { medication: true } }, practitioner: { include: { person: true } }, encounter: true },
      });
      await this.syncPatientMedication(tx, patientId, updated.practitioner, updated);
      return updated;
    }

    const medicationId = this.requiredId(d.medicationId, 'medicationId');
    await this.assertExists(tx.medication, medicationId, 'Medication');
    const prescription = await tx.prescription.create({
      data: {
        encounterId,
        patientId,
        practitionerId: practitioner.id,
        status: this.enum(d.status, VALUES.prescriptionStatus, 'prescription status') ?? 'ACTIVE',
        issuedAt: this.date(d.issuedAt) ?? new Date(),
        expiresAt: this.date(d.expiresAt),
        notes: this.string(d.notes),
        items: {
          create: {
            medicationId,
            dosage: this.required(d.dosage, 'dosage'),
            frequency: this.enum(d.frequency, VALUES.prescriptionFrequency, 'prescription frequency'),
            route: this.enum(d.route, VALUES.prescriptionRoute, 'prescription route'),
            durationDays: this.integer(d.durationDays),
            quantity: this.number(d.quantity, 'quantity', true),
            refills: this.integer(d.refills) ?? 0,
            instructions: this.string(d.instructions),
          },
        },
      },
      include: {
        items: { include: { medication: true } },
        practitioner: { include: { person: true } },
        encounter: true,
      },
    });

    await this.syncPatientMedication(tx, patientId, practitioner, prescription);
    return prescription;
  }

  private async writePrescriptionItem(tx: any, patientId: string, dto: SmartFileClinicalWriteDto) {
    if (dto.action !== SmartFileClinicalWriteAction.UPDATE) {
      throw new BadRequestException('Create a new prescription instead of creating a prescription item directly.');
    }
    const id = this.requiredId(dto.id, 'prescription item id');
    const found = await tx.prescriptionItem.findFirst({
      where: { id, prescription: { patientId } },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Prescription item not found for this patient.');
    const d = dto.data;
    const updated = await tx.prescriptionItem.update({
      where: { id },
      data: {
        medicationId: this.string(d.medicationId),
        dosage: this.string(d.dosage),
        frequency: this.enum(d.frequency, VALUES.prescriptionFrequency, 'prescription frequency'),
        route: this.enum(d.route, VALUES.prescriptionRoute, 'prescription route'),
        durationDays: this.integer(d.durationDays),
        quantity: this.number(d.quantity, 'quantity', true),
        refills: this.integer(d.refills),
        instructions: this.string(d.instructions),
      },
      include: { medication: true, prescription: true },
    });
    const prescription = await tx.prescription.findUnique({
      where: { id: updated.prescriptionId },
      include: { items: { include: { medication: true } }, practitioner: { include: { person: true } } },
    });
    if (prescription) await this.syncPatientMedication(tx, patientId, prescription.practitioner, prescription);
    return updated;
  }

  private async writePatientMedication(tx: any, patientId: string, practitioner: any, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const passport = await this.ensureHealthPassport(tx, patientId);
    const medicationId = this.requiredId(d.medicationId, 'medicationId');
    await this.assertExists(tx.medication, medicationId, 'Medication');
    const data = this.patientMedicationData(d, practitioner);
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'patient medication id');
      const found = await tx.patientMedication.findFirst({ where: { id, healthPassport: { patientId } }, select: { id: true } });
      if (!found) throw new NotFoundException('Patient medication not found.');
      return tx.patientMedication.update({ where: { id }, data, include: { medication: true } });
    }
    return tx.patientMedication.upsert({
      where: { healthPassportId_medicationId: { healthPassportId: passport.id, medicationId } },
      update: data,
      create: { healthPassportId: passport.id, medicationId, ...data },
      include: { medication: true },
    });
  }

  private async syncPatientMedication(tx: any, patientId: string, practitioner: any, prescription: any) {
    const status = String(prescription.status ?? 'ACTIVE');
    if (status === 'DRAFT') return;

    const passport = await this.ensureHealthPassport(tx, patientId);
    const practitionerName = this.practitionerName(practitioner.person, practitioner.practitionerType);
    const active = status === 'ACTIVE';

    for (const item of prescription.items ?? []) {
      await tx.patientMedication.upsert({
        where: {
          healthPassportId_medicationId: {
            healthPassportId: passport.id,
            medicationId: item.medicationId,
          },
        },
        update: {
          dosage: item.dosage,
          frequency: item.frequency,
          route: item.route,
          instructions: item.instructions,
          prescribedBy: practitionerName,
          startedAt: active ? (prescription.issuedAt ?? new Date()) : undefined,
          endedAt: active ? null : (prescription.expiresAt ?? new Date()),
          ongoing: active,
          status: active ? 'ACTIVE' : status === 'COMPLETED' ? 'COMPLETED' : 'DISCONTINUED',
          notes: prescription.notes ?? undefined,
        },
        create: {
          healthPassportId: passport.id,
          medicationId: item.medicationId,
          dosage: item.dosage,
          frequency: item.frequency,
          route: item.route,
          instructions: item.instructions,
          prescribedBy: practitionerName,
          startedAt: active ? (prescription.issuedAt ?? new Date()) : undefined,
          endedAt: active ? null : (prescription.expiresAt ?? new Date()),
          ongoing: active,
          status: active ? 'ACTIVE' : status === 'COMPLETED' ? 'COMPLETED' : 'DISCONTINUED',
          notes: prescription.notes ?? undefined,
        },
      });
    }
  }
  private patientMedicationData(d: Data, practitioner: any) {
    return {
      dosage: this.string(d.dosage),
      frequency: this.string(d.frequency),
      route: this.string(d.route),
      indication: this.string(d.indication),
      instructions: this.string(d.instructions),
      prescribedBy: this.string(d.prescribedBy) ?? this.practitionerName(practitioner.person),
      startedAt: this.date(d.startedAt),
      endedAt: this.date(d.endedAt),
      ongoing: this.bool(d.ongoing),
      sideEffects: this.string(d.sideEffects),
      effectiveness: this.string(d.effectiveness),
      status: this.enum(d.status, VALUES.medicationStatus, 'medication status'),
      notes: this.string(d.notes),
    };
  }

  private async writeHealthPassport(tx: any, patientId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const existing = await tx.healthPassport.findUnique({ where: { patientId } });
    const data = {
      bloodType: this.string(d.bloodType),
      rhesusFactor: this.string(d.rhesusFactor),
      organDonor: this.bool(d.organDonor),
      emergencyNotes: this.string(d.emergencyNotes),
    };
    if (existing) return tx.healthPassport.update({ where: { id: existing.id }, data });
    return tx.healthPassport.create({ data: { patientId, ...data } });
  }

  private async writeMedicalRecord(tx: any, patientId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    return tx.medicalRecord.upsert({
      where: { patientId },
      update: {
        bloodType: this.string(d.bloodType),
        allergies: this.string(d.allergies),
        chronicConditions: this.string(d.chronicConditions),
        pastMedicalHistory: this.string(d.pastMedicalHistory),
        surgicalHistory: this.string(d.surgicalHistory),
        familyHistory: this.string(d.familyHistory),
        socialHistory: this.string(d.socialHistory),
        currentMedications: this.string(d.currentMedications),
        immunizationNotes: this.string(d.immunizationNotes),
        organDonor: this.bool(d.organDonor),
      },
      create: {
        patientId,
        bloodType: this.string(d.bloodType),
        allergies: this.string(d.allergies),
        chronicConditions: this.string(d.chronicConditions),
        pastMedicalHistory: this.string(d.pastMedicalHistory),
        surgicalHistory: this.string(d.surgicalHistory),
        familyHistory: this.string(d.familyHistory),
        socialHistory: this.string(d.socialHistory),
        currentMedications: this.string(d.currentMedications),
        immunizationNotes: this.string(d.immunizationNotes),
        organDonor: this.bool(d.organDonor) ?? false,
      },
    });
  }

  private async writeCondition(tx: any, patientId: string, practitioner: any, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const passport = await this.ensureHealthPassport(tx, patientId);
    const conditionId = this.requiredId(d.conditionId, 'conditionId');
    await this.assertExists(tx.condition, conditionId, 'Condition');
    const data = {
      diagnosedAt: this.date(d.diagnosedAt) ?? new Date(),
      resolvedAt: this.date(d.resolvedAt),
      status: this.enum(d.status, VALUES.conditionStatus, 'condition status') ?? 'ACTIVE',
      severity: this.enum(d.severity, ['MILD','MODERATE','SEVERE','CRITICAL'], 'condition severity'),
      stage: this.string(d.stage),
      chronic: this.bool(d.chronic) ?? false,
      primaryCondition: this.bool(d.primaryCondition) ?? false,
      diagnosedBy: this.string(d.diagnosedBy) ?? this.practitionerName(practitioner.person),
      treatmentPlan: this.string(d.treatmentPlan),
      outcome: this.string(d.outcome),
      notes: this.string(d.notes),
    };
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'condition id');
      await this.assertPatientCondition(tx, id, patientId);
      return tx.patientCondition.update({ where: { id }, data: { conditionId, ...data }, include: { condition: true } });
    }
    return tx.patientCondition.upsert({
      where: { healthPassportId_conditionId: { healthPassportId: passport.id, conditionId } },
      update: data,
      create: { healthPassportId: passport.id, conditionId, ...data },
      include: { condition: true },
    });
  }

  private async writeAllergy(tx: any, patientId: string, practitioner: any, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const passport = await this.ensureHealthPassport(tx, patientId);
    const allergyId = this.requiredId(d.allergyId, 'allergyId');
    await this.assertExists(tx.allergy, allergyId, 'Allergy');
    const data = {
      severity: this.enum(d.severity, VALUES.allergySeverity, 'allergy severity') ?? 'MILD',
      reaction: this.string(d.reaction),
      reactionNotes: this.string(d.reactionNotes),
      onsetDate: this.date(d.onsetDate),
      lastReaction: this.date(d.lastReaction),
      verified: this.bool(d.verified) ?? true,
      verifiedBy: this.string(d.verifiedBy) ?? this.practitionerName(practitioner.person),
      status: this.enum(d.status, VALUES.allergyStatus, 'allergy status') ?? 'ACTIVE',
      notes: this.string(d.notes),
    };
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'allergy id');
      await this.assertPatientAllergy(tx, id, patientId);
      return tx.patientAllergy.update({ where: { id }, data: { allergyId, ...data }, include: { allergy: true } });
    }
    return tx.patientAllergy.upsert({
      where: { healthPassportId_allergyId: { healthPassportId: passport.id, allergyId } },
      update: data,
      create: { healthPassportId: passport.id, allergyId, ...data },
      include: { allergy: true },
    });
  }

  private async writeImmunization(tx: any, patientId: string, practitioner: any, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const passport = await this.ensureHealthPassport(tx, patientId);
    const immunizationId = this.requiredId(d.immunizationId, 'immunizationId');
    await this.assertExists(tx.immunization, immunizationId, 'Immunisation');
    const data = {
      administeredAt: this.date(d.administeredAt),
      doseNumber: this.integer(d.doseNumber),
      batchNumber: this.string(d.batchNumber),
      manufacturer: this.string(d.manufacturer),
      administeredBy: this.string(d.administeredBy) ?? this.practitionerName(practitioner.person),
      facility: this.string(d.facility),
      route: this.string(d.route),
      site: this.string(d.site),
      adverseReaction: this.bool(d.adverseReaction) ?? false,
      adverseReactionNotes: this.string(d.adverseReactionNotes),
      nextDueDate: this.date(d.nextDueDate),
      status: this.enum(d.status, VALUES.immunizationStatus, 'immunisation status') ?? 'COMPLETED',
      notes: this.string(d.notes),
    };
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'immunisation id');
      await this.assertPatientImmunization(tx, id, patientId);
      return tx.patientImmunization.update({ where: { id }, data, include: { immunization: true } });
    }
    return tx.patientImmunization.create({ data: { healthPassportId: passport.id, immunizationId, ...data }, include: { immunization: true } });
  }

  private async writeCarePlan(tx: any, patientId: string, practitionerId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const data = {
      practitionerId,
      encounterId: this.string(d.encounterId),
      title: this.required(d.title, 'title'),
      description: this.string(d.description),
      status: this.enum(d.status, VALUES.carePlanStatus, 'care plan status') ?? 'ACTIVE',
      startDate: this.date(d.startDate) ?? new Date(),
      endDate: this.date(d.endDate),
    };
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'care plan id');
      await this.assertPatientCarePlan(tx, id, patientId);
      return tx.carePlan.update({ where: { id }, data, include: { goals: true, tasks: true, notes: true } });
    }
    return tx.carePlan.create({ data: { patientId, ...data }, include: { goals: true, tasks: true, notes: true } });
  }

  private async writeCarePlanGoal(tx: any, patientId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const carePlanId = this.requiredId(d.carePlanId, 'carePlanId');
    await this.assertPatientCarePlan(tx, carePlanId, patientId);
    const data = {
      title: this.required(d.title, 'title'),
      description: this.string(d.description),
      targetValue: this.string(d.targetValue),
      currentValue: this.string(d.currentValue),
      dueDate: this.date(d.dueDate),
      status: this.enum(d.status, VALUES.carePlanGoalStatus, 'care-plan goal status'),
    };
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'care-plan goal id');
      const found = await tx.carePlanGoal.findFirst({ where: { id, carePlan: { patientId } }, select: { id: true } });
      if (!found) throw new NotFoundException('Care-plan goal not found.');
      return tx.carePlanGoal.update({ where: { id }, data });
    }
    return tx.carePlanGoal.create({ data: { carePlanId, ...data } });
  }

  private async writeCarePlanTask(tx: any, patientId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const carePlanId = this.requiredId(d.carePlanId, 'carePlanId');
    await this.assertPatientCarePlan(tx, carePlanId, patientId);
    const data = {
      assignedToId: this.string(d.assignedToId),
      type: this.required(d.type, 'type'),
      title: this.required(d.title, 'title'),
      description: this.string(d.description),
      dueDate: this.date(d.dueDate),
      completedAt: this.date(d.completedAt),
      status: this.enum(d.status, VALUES.carePlanTaskStatus, 'care-plan task status') ?? 'PENDING',
    };
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'care-plan task id');
      const found = await tx.carePlanTask.findFirst({ where: { id, carePlan: { patientId } }, select: { id: true } });
      if (!found) throw new NotFoundException('Care-plan task not found.');
      return tx.carePlanTask.update({ where: { id }, data });
    }
    return tx.carePlanTask.create({ data: { carePlanId, ...data } });
  }

  private async writeCarePlanNote(tx: any, patientId: string, authorId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const carePlanId = this.requiredId(d.carePlanId, 'carePlanId');
    await this.assertPatientCarePlan(tx, carePlanId, patientId);
    const data = { note: this.required(d.note, 'note') };
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'care-plan note id');
      const found = await tx.carePlanNote.findFirst({ where: { id, carePlan: { patientId } }, select: { id: true } });
      if (!found) throw new NotFoundException('Care-plan note not found.');
      return tx.carePlanNote.update({ where: { id }, data });
    }
    return tx.carePlanNote.create({ data: { carePlanId, authorId, ...data } });
  }

  private async writeReferral(tx: any, consent: any, patientId: string, practitionerId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const data = {
      receivingPractitionerId: this.string(d.receivingPractitionerId),
      referringPracticeId: this.string(d.referringPracticeId),
      receivingPracticeId: this.string(d.receivingPracticeId),
      encounterId: this.string(d.encounterId),
      type: this.enum(d.type, VALUES.referralType, 'referral type') ?? 'EXTERNAL',
      priority: this.enum(d.priority, VALUES.referralPriority, 'referral priority') ?? 'ROUTINE',
      status: this.enum(d.status, VALUES.referralStatus, 'referral status') ?? 'PENDING',
      specialty: this.string(d.specialty),
      reason: this.required(d.reason, 'reason'),
      clinicalSummary: this.string(d.clinicalSummary),
      requestedDate: this.date(d.requestedDate) ?? new Date(),
    };
    if (data.receivingPractitionerId) await this.assertExists(tx.practitioner, data.receivingPractitionerId, 'Receiving practitioner');

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'referral id');
      const found = await tx.referral.findFirst({ where: { id, patientId }, select: { id: true } });
      if (!found) throw new NotFoundException('Referral not found for this patient.');
      return tx.referral.update({ where: { id }, data });
    }

    return tx.referral.create({
      data: {
        patientId,
        referringPractitionerId: practitionerId,
        referralNumber: `SF-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0,8).toUpperCase()}`,
        appointmentId: consent.appointmentId ?? undefined,
        ...data,
      },
      include: { receivingPractitioner: { include: { person: true } }, referringPractitioner: { include: { person: true } } },
    });
  }

  private async writeReferralNote(tx: any, patientId: string, authorId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const referralId = this.requiredId(d.referralId, 'referralId');
    const foundReferral = await tx.referral.findFirst({ where: { id: referralId, patientId }, select: { id: true } });
    if (!foundReferral) throw new NotFoundException('Referral not found for this patient.');
    const data = { note: this.required(d.note, 'note') };
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'referral note id');
      const found = await tx.referralNote.findFirst({ where: { id, referralId }, select: { id: true } });
      if (!found) throw new NotFoundException('Referral note not found.');
      return tx.referralNote.update({ where: { id }, data });
    }
    return tx.referralNote.create({ data: { referralId, authorId, ...data } });
  }

  private async writeLabOrder(tx: any, consent: any, patientId: string, practitionerId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const testIds = this.strings(d.testIds);
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'lab order id');
      const found = await tx.labOrder.findFirst({ where: { id, patientId }, select: { id: true } });
      if (!found) throw new NotFoundException('Lab order not found for this patient.');
      const updated = await tx.labOrder.update({
        where: { id },
        data: {
          practitionerId,
          encounterId: this.string(d.encounterId),
          laboratoryId: this.string(d.laboratoryId),
          status: this.enum(d.status, VALUES.labOrderStatus, 'lab order status'),
          clinicalNotes: this.string(d.clinicalNotes),
          orderedAt: this.date(d.orderedAt),
        },
        include: { items: { include: { test: true } }, laboratory: true, practitioner: { include: { person: true } } },
      });
      await this.addLabTests(tx, id, testIds);
      return tx.labOrder.findUnique({ where: { id: updated.id }, include: { items: { include: { test: true } }, laboratory: true, practitioner: { include: { person: true } } } });
    }

    if (!testIds.length) throw new BadRequestException('At least one lab test is required.');
    for (const testId of testIds) await this.assertExists(tx.labTest, testId, 'Lab test');

    return tx.labOrder.create({
      data: {
        patientId,
        practitionerId,
        encounterId: this.string(d.encounterId),
        appointmentId: consent.appointmentId ?? undefined,
        laboratoryId: this.string(d.laboratoryId),
        orderNumber: `SF-LAB-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0,8).toUpperCase()}`,
        status: this.enum(d.status, VALUES.labOrderStatus, 'lab order status') ?? 'ORDERED',
        clinicalNotes: this.string(d.clinicalNotes),
        orderedAt: this.date(d.orderedAt) ?? new Date(),
        items: { create: testIds.map((testId) => ({ testId })) },
      },
      include: { items: { include: { test: true } }, laboratory: true, practitioner: { include: { person: true } } },
    });
  }

  private async writeImagingOrder(tx: any, consent: any, patientId: string, practitionerId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const procedureIds = this.strings(d.procedureIds);
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'imaging order id');
      const found = await tx.imagingOrder.findFirst({ where: { id, patientId }, select: { id: true } });
      if (!found) throw new NotFoundException('Imaging order not found for this patient.');
      const updated = await tx.imagingOrder.update({
        where: { id },
        data: {
          practitionerId,
          encounterId: this.string(d.encounterId),
          imagingCenterId: this.string(d.imagingCenterId),
          priority: this.enum(d.priority, VALUES.imagingPriority, 'imaging priority'),
          status: this.enum(d.status, VALUES.imagingOrderStatus, 'imaging order status'),
          clinicalIndication: this.string(d.clinicalIndication),
        },
        include: { items: { include: { procedure: true } }, imagingCenter: true, practitioner: { include: { person: true } } },
      });
      await this.addImagingProcedures(tx, id, procedureIds);
      return tx.imagingOrder.findUnique({ where: { id }, include: { items: { include: { procedure: true } }, imagingCenter: true, practitioner: { include: { person: true } } } });
    }

    if (!procedureIds.length) throw new BadRequestException('At least one imaging procedure is required.');
    for (const procedureId of procedureIds) await this.assertExists(tx.imagingProcedure, procedureId, 'Imaging procedure');

    return tx.imagingOrder.create({
      data: {
        patientId,
        practitionerId,
        encounterId: this.string(d.encounterId),
        appointmentId: consent.appointmentId ?? undefined,
        imagingCenterId: this.string(d.imagingCenterId),
        orderNumber: `SF-IMG-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0,8).toUpperCase()}`,
        priority: this.enum(d.priority, VALUES.imagingPriority, 'imaging priority') ?? 'ROUTINE',
        status: this.enum(d.status, VALUES.imagingOrderStatus, 'imaging order status') ?? 'ORDERED',
        clinicalIndication: this.string(d.clinicalIndication),
        items: { create: procedureIds.map((procedureId) => ({ procedureId })) },
      },
      include: { items: { include: { procedure: true } }, imagingCenter: true, practitioner: { include: { person: true } } },
    });
  }

  private async writeImagingReport(tx: any, patientId: string, practitionerId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const studyId = this.requiredId(d.studyId, 'studyId');
    const study = await tx.imagingStudy.findFirst({ where: { id: studyId, patientId }, select: { id: true } });
    if (!study) throw new NotFoundException('Imaging study not found for this patient.');
    const data = {
      practitionerId,
      findings: this.required(d.findings, 'findings'),
      impression: this.string(d.impression),
      recommendations: this.string(d.recommendations),
    };
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'imaging report id');
      const found = await tx.imagingReport.findFirst({ where: { id, study: { patientId } }, select: { id: true } });
      if (!found) throw new NotFoundException('Imaging report not found for this patient.');
      return tx.imagingReport.update({ where: { id }, data });
    }
    return tx.imagingReport.create({ data: { studyId, ...data } });
  }

  private async writeHealthJournal(tx: any, patientId: string, practitionerId: string, dto: SmartFileClinicalWriteDto) {
    const d = dto.data;
    const data = {
      patientId,
      practitionerId,
      encounterId: this.string(d.encounterId),
      title: this.string(d.title),
      journal: this.required(d.journal, 'journal'),
      mood: this.string(d.mood),
      sleepQuality: this.string(d.sleepQuality),
      sleepHours: this.decimal(d.sleepHours),
      energyLevel: this.string(d.energyLevel),
      stressLevel: this.integer(d.stressLevel),
      exerciseMinutes: this.integer(d.exerciseMinutes),
      waterIntakeMl: this.integer(d.waterIntakeMl),
      weightKg: this.decimal(d.weightKg),
      temperature: this.decimal(d.temperature),
      bloodPressureSystolic: this.integer(d.bloodPressureSystolic),
      bloodPressureDiastolic: this.integer(d.bloodPressureDiastolic),
      heartRate: this.integer(d.heartRate),
      oxygenSaturation: this.decimal(d.oxygenSaturation),
      respiratoryRate: this.integer(d.respiratoryRate),
      notes: this.string(d.notes),
    };
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      const id = this.requiredId(dto.id, 'Health Journal id');
      const found = await tx.healthJournal.findFirst({ where: { id, patientId }, select: { id: true } });
      if (!found) throw new NotFoundException('Health Journal entry not found for this patient.');
      return tx.healthJournal.update({ where: { id }, data });
    }
    return tx.healthJournal.create({ data });
  }

  private async findOrCreateEncounter(
    tx: any,
    consent: any,
    patientId: string,
    practitionerId: string,
    input: Data,
  ) {
    if (consent?.appointmentId) {
      const appointment = await tx.appointment.findFirst({
        where: {
          id: consent.appointmentId,
          patientId,
          practitionerId,
          status: { notIn: ['CANCELLED','NO_SHOW'] },
        },
        select: { id: true, encounterId: true },
      });
      if (!appointment) {
        throw new ForbiddenException('This Smart File share is not assigned to this appointment.');
      }
      if (appointment.encounterId) return appointment.encounterId;
      const encounter = await tx.encounter.create({
        data: {
          medicalRecordId: (await this.ensureMedicalRecord(tx, patientId)).id,
          practitionerId,
          encounterTypeId: input.encounterTypeId,
          startedAt: input.startedAt ?? new Date(),
          endedAt: input.endedAt,
          chiefComplaint: input.chiefComplaint,
          assessment: input.assessment,
          plan: input.plan,
          notes: input.notes,
        },
        select: { id: true },
      });
      await tx.appointment.update({ where: { id: appointment.id }, data: { encounterId: encounter.id } });
      return encounter.id;
    }

    const encounter = await tx.encounter.create({
      data: {
        medicalRecordId: (await this.ensureMedicalRecord(tx, patientId)).id,
        practitionerId,
        encounterTypeId: input.encounterTypeId,
        startedAt: input.startedAt ?? new Date(),
        endedAt: input.endedAt,
        chiefComplaint: input.chiefComplaint,
        assessment: input.assessment,
        plan: input.plan,
        notes: input.notes,
      },
      select: { id: true },
    });
    return encounter.id;
  }

  private async resolveEncounterId(tx: any, consent: any, patientId: string, practitionerId: string, encounterId?: string) {
    if (encounterId) {
      await this.assertPatientEncounter(tx, encounterId, patientId);
      return encounterId;
    }
    return this.findOrCreateEncounter(tx, consent, patientId, practitionerId, {
      encounterTypeId: await this.encounterTypeId(tx, undefined),
    });
  }

  private async encounterTypeId(tx: any, value: unknown) {
    if (value) {
      await this.assertExists(tx.encounterType, String(value), 'Encounter type');
      return String(value);
    }
    return (await tx.encounterType.upsert({
      where: { name: 'Clinical consultation' },
      update: {},
      create: {
        name: 'Clinical consultation',
        description: 'Clinical consultation recorded through Smart File.',
      },
      select: { id: true },
    })).id;
  }

  private encounterData(d: Data, encounterTypeId: string) {
    return {
      encounterTypeId,
      startedAt: this.date(d.startedAt),
      endedAt: this.date(d.endedAt),
      chiefComplaint: this.string(d.chiefComplaint),
      assessment: this.string(d.assessment),
      plan: this.string(d.plan),
      notes: this.string(d.notes),
    };
  }

  private async writeClinicalNote(tx: any, encounterId: string, d: Data) {
    const clinicalNote = this.string(d.clinicalNote);
    if (!clinicalNote) return;
    if (d.clinicalNoteId) {
      const found = await tx.clinicalNote.findFirst({ where: { id: String(d.clinicalNoteId), encounterId } });
      if (!found) throw new NotFoundException('Clinical note not found for this encounter.');
      await tx.clinicalNote.update({
        where: { id: String(d.clinicalNoteId) },
        data: { title: this.string(d.clinicalNoteTitle), note: clinicalNote },
      });
      return;
    }
    await tx.clinicalNote.create({
      data: { encounterId, title: this.string(d.clinicalNoteTitle), note: clinicalNote },
    });
  }

  private async addLabTests(tx: any, orderId: string, testIds: string[]) {
    for (const testId of testIds) {
      await this.assertExists(tx.labTest, testId, 'Lab test');
      const exists = await tx.labOrderItem.findFirst({ where: { orderId, testId }, select: { id: true } });
      if (!exists) await tx.labOrderItem.create({ data: { orderId, testId } });
    }
  }

  private async addImagingProcedures(tx: any, orderId: string, procedureIds: string[]) {
    for (const procedureId of procedureIds) {
      await this.assertExists(tx.imagingProcedure, procedureId, 'Imaging procedure');
      const exists = await tx.imagingOrderItem.findFirst({ where: { orderId, procedureId }, select: { id: true } });
      if (!exists) await tx.imagingOrderItem.create({ data: { orderId, procedureId } });
    }
  }

  private async ensureMedicalRecord(tx: any, patientId: string) {
    return tx.medicalRecord.upsert({
      where: { patientId },
      update: {},
      create: { patientId },
      select: { id: true },
    });
  }

  private async ensureHealthPassport(tx: any, patientId: string) {
    return tx.healthPassport.upsert({
      where: { patientId },
      update: {},
      create: { patientId },
      select: { id: true },
    });
  }

  private async assertPatientEncounter(tx: any, id: string, patientId: string) {
    const row = await tx.encounter.findFirst({ where: { id, medicalRecord: { patientId } }, select: { id: true } });
    if (!row) throw new NotFoundException('Encounter not found for this patient.');
  }
  private async assertPatientDiagnosis(tx: any, id: string, patientId: string) {
    const row = await tx.patientDiagnosis.findFirst({ where: { id, healthPassport: { patientId } }, select: { id: true } });
    if (!row) throw new NotFoundException('Diagnosis not found for this patient.');
  }
  private async assertPatientProcedure(tx: any, id: string, patientId: string) {
    const row = await tx.patientProcedure.findFirst({ where: { id, healthPassport: { patientId } }, select: { id: true } });
    if (!row) throw new NotFoundException('Procedure not found for this patient.');
  }
  private async assertPatientEpisode(tx: any, id: string, patientId: string) {
    const row = await tx.clinicalEpisode.findFirst({ where: { id, patientId }, select: { id: true } });
    if (!row) throw new NotFoundException('Clinical episode not found for this patient.');
  }
  private async assertPatientCondition(tx: any, id: string, patientId: string) {
    const row = await tx.patientCondition.findFirst({ where: { id, healthPassport: { patientId } }, select: { id: true } });
    if (!row) throw new NotFoundException('Condition not found for this patient.');
  }
  private async assertPatientAllergy(tx: any, id: string, patientId: string) {
    const row = await tx.patientAllergy.findFirst({ where: { id, healthPassport: { patientId } }, select: { id: true } });
    if (!row) throw new NotFoundException('Allergy not found for this patient.');
  }
  private async assertPatientImmunization(tx: any, id: string, patientId: string) {
    const row = await tx.patientImmunization.findFirst({ where: { id, healthPassport: { patientId } }, select: { id: true } });
    if (!row) throw new NotFoundException('Immunisation not found for this patient.');
  }
  private async assertPatientCarePlan(tx: any, id: string, patientId: string) {
    const row = await tx.carePlan.findFirst({ where: { id, patientId }, select: { id: true } });
    if (!row) throw new NotFoundException('Care plan not found for this patient.');
  }
  private async assertExists(delegate: any, id: string, label: string) {
    const row = await delegate.findUnique({ where: { id }, select: { id: true } });
    if (!row) throw new NotFoundException(`${label} not found.`);
  }

  private buildPatientNotice(section: SmartFileClinicalWriteSection, action: SmartFileClinicalWriteAction, practitionerName: string, result: any) {
    const verb = action === SmartFileClinicalWriteAction.UPDATE ? 'updated' : 'added';
    if (section === SmartFileClinicalWriteSection.PRESCRIPTION) {
      const items = Array.isArray(result?.items) ? result.items : [];
      const names = items.map((x: any) => x.medication?.name || x.medication?.genericName).filter(Boolean);
      const label = names.length === 1 ? `1 prescription for ${names[0]}` : `${names.length || 1} prescription medication${names.length === 1 ? '' : 's'}`;
      return {
        type: NotificationType.PRESCRIPTION,
        title: `${practitionerName} ${verb} a prescription`,
        body: `${practitionerName} ${verb} ${label}. Your medications have been updated.`,
        actionUrl: '/medications',
        actionLabel: 'View medications',
      };
    }
    const sectionLabel: Record<string, string> = {
      [SmartFileClinicalWriteSection.DIAGNOSIS]: 'a diagnosis',
      [SmartFileClinicalWriteSection.PROCEDURE]: 'a procedure',
      [SmartFileClinicalWriteSection.CONDITION]: 'a condition',
      [SmartFileClinicalWriteSection.ALLERGY]: 'an allergy record',
      [SmartFileClinicalWriteSection.IMMUNIZATION]: 'an immunisation record',
      [SmartFileClinicalWriteSection.REFERRAL]: 'a referral',
      [SmartFileClinicalWriteSection.CARE_PLAN]: 'a care plan',
      [SmartFileClinicalWriteSection.LAB_ORDER]: 'a laboratory order',
      [SmartFileClinicalWriteSection.IMAGING_ORDER]: 'an imaging order',
      [SmartFileClinicalWriteSection.IMAGING_REPORT]: 'an imaging report',
      [SmartFileClinicalWriteSection.ENCOUNTER]: 'a clinical encounter',
    };
    const noun = sectionLabel[section] || 'clinical information';
    return {
      type: NotificationType.MESSAGE,
      title: `${practitionerName} ${verb} ${noun}`,
      body: `${practitionerName} ${verb} ${noun} in your Sympto clinical record. The update is now visible in your account.`,
      actionUrl: '/health-passport',
      actionLabel: 'View health record',
    };
  }

  private practitionerName(practitionerPerson: { firstName: string; lastName: string }) {
    return `Dr ${practitionerPerson.firstName} ${practitionerPerson.lastName}`.replace(/\\s+/g, ' ').trim();
  }

  private required(value: unknown, field: string) {
    const valueString = this.string(value);
    if (!valueString) throw new BadRequestException(`${field} is required.`);
    return valueString;
  }

  private requiredId(value: unknown, field: string) {
    return this.required(value, field);
  }

  private string(value: unknown) {
    if (value === undefined || value === null) return undefined;
    const result = String(value).trim();
    return result || undefined;
  }

  private bool(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new BadRequestException('Boolean value is invalid.');
  }

  private number(value: unknown, field: string, optional = false) {
    if (value === undefined || value === null || value === '') {
      if (optional) return undefined;
      throw new BadRequestException(`${field} is required.`);
    }
    const n = Number(value);
    if (!Number.isFinite(n)) throw new BadRequestException(`${field} must be numeric.`);
    return n;
  }

  private integer(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    if (!Number.isInteger(n)) throw new BadRequestException('Integer value is invalid.');
    return n;
  }

  private decimal(value: unknown) {
    return this.number(value, 'Decimal', true);
  }

  private date(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Date value is invalid.');
    return d;
  }

  private enum(value: unknown, allowed: readonly string[], field: string) {
    const v = this.string(value);
    if (!v) return undefined;
    if (!allowed.includes(v)) throw new BadRequestException(`${field} is invalid.`);
    return v;
  }

  private strings(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value.map((x) => String(x).trim()).filter(Boolean);
  }

  private sanitizeForAudit(value: Data) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        typeof item === 'string' && item.length > 2000
          ? item.slice(0, 2000)
          : item,
      ]),
    );
  }
}
