import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AllergyStatus,
  AuditAction,
  CarePlanGoalStatus,
  CarePlanStatus,
  CarePlanTaskStatus,
  ConditionStatus,
  DiagnosisSeverity,
  DiagnosisStatus,
  ImagingOrderStatus,
  ImagingPriority,
  ImmunizationStatus,
  LabOrderStatus,
  MedicationStatus,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  Prisma,
  ProcedureStatus,
  ReferralPriority,
  ReferralStatus,
  SymptomFrequency,
  SymptomLogStatus,
  SymptomProgression,
  SymptomSeverity,
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

type AnyData = Record<string, unknown>;

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
        tx,
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
          entityId: this.entityId(value, dto.id),
          newValues: this.auditValue(dto.data),
          success: true,
        },
      });

      return value;
    });

    const notice = this.notificationFor(
      dto.section,
      dto.action,
      practitioner.person.firstName + ' ' + practitioner.person.lastName,
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
      ...result,
      smartFile: 'updated',
      patientVisible: true,
    };
  }

  private async applyWrite(
    tx: Prisma.TransactionClient,
    consent: any,
    patient: { id: string; userId: string },
    practitioner: {
      id: string;
      userId: string;
      person: { firstName: string; lastName: string };
    },
    dto: SmartFileClinicalWriteDto,
  ) {
    const data = dto.data as AnyData;

    switch (dto.section) {
      case SmartFileClinicalWriteSection.ENCOUNTER:
        return this.writeEncounter(tx, consent, patient.id, practitioner.id, dto, data);
      case SmartFileClinicalWriteSection.DIAGNOSIS:
        return this.writeDiagnosis(tx, patient.id, practitioner, dto, data);
      case SmartFileClinicalWriteSection.PROCEDURE:
        return this.writeProcedure(tx, patient.id, practitioner, dto, data);
      case SmartFileClinicalWriteSection.VITAL:
        return this.writeVital(tx, consent, patient.id, practitioner.id, dto, data);
      case SmartFileClinicalWriteSection.SYMPTOM_EPISODE:
        return this.writeSymptomEpisode(tx, consent, patient.id, practitioner.id, dto, data);
      case SmartFileClinicalWriteSection.SYMPTOM_LOG:
        return this.writeSymptomLog(tx, patient.id, dto, data);
      case SmartFileClinicalWriteSection.SYMPTOM_ITEM:
        return this.writeSymptomItem(tx, patient.id, dto, data);
      case SmartFileClinicalWriteSection.PRESCRIPTION:
        return this.writePrescription(tx, patient.id, practitioner, dto, data);
      case SmartFileClinicalWriteSection.PRESCRIPTION_ITEM:
        return this.writePrescriptionItem(tx, patient.id, dto, data);
      case SmartFileClinicalWriteSection.PATIENT_MEDICATION:
        return this.writePatientMedication(tx, patient.id, practitioner, dto, data);
      case SmartFileClinicalWriteSection.HEALTH_PASSPORT:
        return this.writeHealthPassport(tx, patient.id, dto, data);
      case SmartFileClinicalWriteSection.MEDICAL_RECORD:
        return this.writeMedicalRecord(tx, patient.id, dto, data);
      case SmartFileClinicalWriteSection.CONDITION:
        return this.writeCondition(tx, patient.id, practitioner, dto, data);
      case SmartFileClinicalWriteSection.ALLERGY:
        return this.writeAllergy(tx, patient.id, practitioner, dto, data);
      case SmartFileClinicalWriteSection.IMMUNIZATION:
        return this.writeImmunization(tx, patient.id, practitioner, dto, data);
      case SmartFileClinicalWriteSection.CARE_PLAN:
        return this.writeCarePlan(tx, patient.id, practitioner.id, dto, data);
      case SmartFileClinicalWriteSection.CARE_PLAN_GOAL:
        return this.writeCarePlanGoal(tx, patient.id, dto, data);
      case SmartFileClinicalWriteSection.CARE_PLAN_TASK:
        return this.writeCarePlanTask(tx, patient.id, dto, data);
      case SmartFileClinicalWriteSection.CARE_PLAN_NOTE:
        return this.writeCarePlanNote(tx, patient.id, practitioner.userId, dto, data);
      case SmartFileClinicalWriteSection.REFERRAL:
        return this.writeReferral(tx, consent, patient.id, practitioner.id, dto, data);
      case SmartFileClinicalWriteSection.REFERRAL_NOTE:
        return this.writeReferralNote(tx, patient.id, practitioner.userId, dto, data);
      case SmartFileClinicalWriteSection.LAB_ORDER:
        return this.writeLabOrder(tx, consent, patient.id, practitioner.id, dto, data);
      case SmartFileClinicalWriteSection.IMAGING_ORDER:
        return this.writeImagingOrder(tx, consent, patient.id, practitioner.id, dto, data);
      case SmartFileClinicalWriteSection.IMAGING_REPORT:
        return this.writeImagingReport(tx, patient.id, practitioner.id, dto, data);
      case SmartFileClinicalWriteSection.HEALTH_JOURNAL:
        return this.writeHealthJournal(tx, patient.id, practitioner.id, dto, data);
      default:
        throw new BadRequestException('Unsupported Smart File clinical update.');
    }
  }

  private async writeEncounter(
    tx: Prisma.TransactionClient,
    consent: any,
    patientId: string,
    practitionerId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const medicalRecord = await tx.medicalRecord.upsert({
      where: { patientId },
      update: {},
      create: { patientId },
      select: { id: true },
    });

    const encounterTypeId =
      typeof data.encounterTypeId === 'string'
        ? data.encounterTypeId
        : (
            await tx.encounterType.upsert({
              where: { name: 'Clinical consultation' },
              update: {},
              create: {
                name: 'Clinical consultation',
                description: 'Clinical consultation recorded through Smart File.',
              },
              select: { id: true },
            })
          ).id;

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Encounter id is required for an update.');
      const existing = await tx.encounter.findFirst({
        where: {
          id: dto.id,
          medicalRecord: { patientId },
        },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Encounter not found for this patient.');

      return tx.encounter.update({
        where: { id: dto.id },
        data: {
          encounterTypeId,
          startedAt: this.dateOrUndefined(data.startedAt),
          endedAt: this.dateOrNull(data.endedAt),
          chiefComplaint: this.stringOrUndefined(data.chiefComplaint),
          assessment: this.stringOrUndefined(data.assessment),
          plan: this.stringOrUndefined(data.plan),
          notes: this.stringOrUndefined(data.notes),
        },
        include: {
          encounterType: true,
          practitioner: { include: { person: true } },
          clinicalNotes: true,
        },
      });
    }

    const appointmentId = consent.appointmentId ?? undefined;
    let startedAt = this.dateOrUndefined(data.startedAt) ?? new Date();

    if (appointmentId) {
      const appointment = await tx.appointment.findFirst({
        where: {
          id: appointmentId,
          patientId,
          practitionerId,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        select: { id: true, encounterId: true },
      });
      if (!appointment) {
        throw new ForbiddenException('This Smart File share is not assigned to this appointment.');
      }
      if (appointment.encounterId) {
        return tx.encounter.update({
          where: { id: appointment.encounterId },
          data: {
            startedAt,
            endedAt: this.dateOrNull(data.endedAt),
            chiefComplaint: this.stringOrUndefined(data.chiefComplaint),
            assessment: this.stringOrUndefined(data.assessment),
            plan: this.stringOrUndefined(data.plan),
            notes: this.stringOrUndefined(data.notes),
          },
          include: {
            encounterType: true,
            practitioner: { include: { person: true } },
            clinicalNotes: true,
          },
        });
      }
    }

    const encounter = await tx.encounter.create({
      data: {
        medicalRecordId: medicalRecord.id,
        practitionerId,
        encounterTypeId,
        startedAt,
        endedAt: this.dateOrUndefined(data.endedAt),
        chiefComplaint: this.stringOrUndefined(data.chiefComplaint),
        assessment: this.stringOrUndefined(data.assessment),
        plan: this.stringOrUndefined(data.plan),
        notes: this.stringOrUndefined(data.notes),
      },
      include: {
        encounterType: true,
        practitioner: { include: { person: true } },
        clinicalNotes: true,
      },
    });

    if (appointmentId) {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { encounterId: encounter.id },
      });
    }

    const clinicalNote = this.stringOrUndefined(data.clinicalNote);
    if (clinicalNote) {
      await tx.clinicalNote.create({
        data: {
          encounterId: encounter.id,
          title: this.stringOrNull(data.clinicalNoteTitle),
          note: clinicalNote,
        },
      });
    }

    return tx.encounter.findUnique({
      where: { id: encounter.id },
      include: {
        encounterType: true,
        practitioner: { include: { person: true } },
        clinicalNotes: true,
      },
    });
  }

  private async writeDiagnosis(
    tx: Prisma.TransactionClient,
    patientId: string,
    practitioner: any,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const healthPassport = await this.ensureHealthPassport(tx, patientId);
    const diagnosisId = this.requiredString(data.diagnosisId, 'diagnosisId');

    await this.assertExists(tx.diagnosis, diagnosisId, 'Diagnosis');

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Diagnosis id is required for an update.');
      const existing = await tx.patientDiagnosis.findFirst({
        where: { id: dto.id, healthPassport: { patientId } },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Diagnosis not found for this patient.');

      return tx.patientDiagnosis.update({
        where: { id: dto.id },
        data: {
          diagnosisId,
          diagnosedAt: this.dateOrNull(data.diagnosedAt),
          resolvedAt: this.dateOrNull(data.resolvedAt),
          status: this.enumOrUndefined(data.status, Object.values(DiagnosisStatus)),
          severity: this.enumOrUndefined(data.severity, Object.values(DiagnosisSeverity)),
          stage: this.stringOrNull(data.stage),
          primaryDiagnosis: this.booleanOrUndefined(data.primaryDiagnosis),
          confirmed: this.booleanOrUndefined(data.confirmed),
          diagnosedBy: this.stringOrNull(
            data.diagnosedBy ?? this.displayName(practitioner.person),
          ),
          treatmentPlan: this.stringOrNull(data.treatmentPlan),
          outcome: this.stringOrNull(data.outcome),
          notes: this.stringOrNull(data.notes),
        },
        include: { diagnosis: true, encounter: true },
      });
    }

    return tx.patientDiagnosis.create({
      data: {
        healthPassportId: healthPassport.id,
        diagnosisId,
        diagnosedAt: this.dateOrUndefined(data.diagnosedAt) ?? new Date(),
        resolvedAt: this.dateOrUndefined(data.resolvedAt),
        status:
          (this.enumOrUndefined(
            data.status,
            Object.values(DiagnosisStatus),
          ) as DiagnosisStatus | undefined) ?? DiagnosisStatus.ACTIVE,
        severity: this.enumOrUndefined(
          data.severity,
          Object.values(DiagnosisSeverity),
        ) as DiagnosisSeverity | undefined,
        stage: this.stringOrUndefined(data.stage),
        primaryDiagnosis: this.booleanOrUndefined(data.primaryDiagnosis) ?? false,
        confirmed: this.booleanOrUndefined(data.confirmed) ?? true,
        diagnosedBy: this.stringOrUndefined(
          data.diagnosedBy ?? this.displayName(practitioner.person),
        ),
        encounterId: this.stringOrUndefined(data.encounterId),
        treatmentPlan: this.stringOrUndefined(data.treatmentPlan),
        outcome: this.stringOrUndefined(data.outcome),
        notes: this.stringOrUndefined(data.notes),
      },
      include: { diagnosis: true, encounter: true },
    });
  }

  private async writeProcedure(
    tx: Prisma.TransactionClient,
    patientId: string,
    practitioner: any,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const healthPassport = await this.ensureHealthPassport(tx, patientId);
    const procedureId = this.requiredString(data.procedureId, 'procedureId');
    await this.assertExists(tx.procedure, procedureId, 'Procedure');

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Procedure id is required for an update.');
      const existing = await tx.patientProcedure.findFirst({
        where: { id: dto.id, healthPassport: { patientId } },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Procedure not found for this patient.');

      return tx.patientProcedure.update({
        where: { id: dto.id },
        data: {
          procedureId,
          performedAt: this.dateOrNull(data.performedAt),
          status: this.enumOrUndefined(data.status, Object.values(ProcedureStatus)),
          outcome: this.stringOrNull(data.outcome),
          performer: this.stringOrNull(
            data.performer ?? this.displayName(practitioner.person),
          ),
          facility: this.stringOrNull(data.facility),
          complications: this.stringOrNull(data.complications),
          followUpRequired: this.booleanOrUndefined(data.followUpRequired),
          followUpDate: this.dateOrNull(data.followUpDate),
          notes: this.stringOrNull(data.notes),
        },
        include: { procedure: true, encounter: true },
      });
    }

    return tx.patientProcedure.create({
      data: {
        healthPassportId: healthPassport.id,
        procedureId,
        performedAt: this.dateOrUndefined(data.performedAt) ?? new Date(),
        status:
          (this.enumOrUndefined(
            data.status,
            Object.values(ProcedureStatus),
          ) as ProcedureStatus | undefined) ?? ProcedureStatus.COMPLETED,
        outcome: this.stringOrUndefined(data.outcome),
        performer: this.stringOrUndefined(
          data.performer ?? this.displayName(practitioner.person),
        ),
        facility: this.stringOrUndefined(data.facility),
        encounterId: this.stringOrUndefined(data.encounterId),
        complications: this.stringOrUndefined(data.complications),
        followUpRequired: this.booleanOrUndefined(data.followUpRequired) ?? false,
        followUpDate: this.dateOrUndefined(data.followUpDate),
        notes: this.stringOrUndefined(data.notes),
      },
      include: { procedure: true, encounter: true },
    });
  }

  private async writeVital(
    tx: Prisma.TransactionClient,
    consent: any,
    patientId: string,
    practitionerId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    let encounterId = this.stringOrUndefined(data.encounterId);

    if (encounterId) {
      await this.assertEncounterForPatient(tx, encounterId, patientId);
    } else {
      const encounter = await this.findOrCreateEncounter(tx, consent, patientId, practitionerId, {});
      encounterId = encounter.id;
    }

    const vitalTypeId = this.requiredString(data.vitalTypeId, 'vitalTypeId');
    await this.assertExists(tx.vitalType, vitalTypeId, 'Vital type');

    const value = this.numberValue(data.value, 'value');
    const measuredAt = this.dateOrUndefined(data.measuredAt) ?? new Date();

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Vital id is required for an update.');
      const existing = await tx.clinicalVital.findFirst({
        where: {
          id: dto.id,
          encounter: { medicalRecord: { patientId } },
        },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Vital not found for this patient.');

      return tx.clinicalVital.update({
        where: { id: dto.id },
        data: { encounterId, vitalTypeId, value, measuredAt },
        include: { vitalType: true, encounter: true },
      });
    }

    return tx.clinicalVital.create({
      data: { encounterId, vitalTypeId, value, measuredAt },
      include: { vitalType: true, encounter: true },
    });
  }

  private async writeSymptomEpisode(
    tx: Prisma.TransactionClient,
    consent: any,
    patientId: string,
    practitionerId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const payload: any = {
      title: this.requiredString(data.title, 'title'),
      description: this.stringOrUndefined(data.description),
      type: this.enumString(data.type, [
        'ACUTE','CHRONIC','FOLLOW_UP','EMERGENCY','SURGICAL','MATERNITY','MENTAL_HEALTH','TELEMEDICINE','PREVENTIVE','WELLNESS','REHABILITATION','OTHER',
      ], 'type'),
      status: this.enumString(data.status, Object.values(SymptomLogStatus).concat([]), 'status', true),
    };

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Symptom episode id is required for an update.');
      const existing = await tx.clinicalEpisode.findFirst({
        where: { id: dto.id, patientId },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Clinical episode not found for this patient.');

      return tx.clinicalEpisode.update({
        where: { id: dto.id },
        data: {
          title: payload.title,
          description: payload.description,
          type: payload.type,
          status: this.enumOrUndefined(data.status, ['ACTIVE','ONGOING','RESOLVED','CANCELLED','CLOSED']),
          priority: this.enumOrUndefined(data.priority, ['ROUTINE','LOW','MEDIUM','HIGH','URGENT','CRITICAL']),
          startedAt: this.dateOrUndefined(data.startedAt),
          endedAt: this.dateOrNull(data.endedAt),
          resolvedAt: this.dateOrNull(data.resolvedAt),
        },
      });
    }

    const encounter = await this.findOrCreateEncounter(tx, consent, patientId, practitionerId, {});
    return tx.clinicalEpisode.create({
      data: {
        patientId,
        encounterId: encounter.id,
        appointmentId: consent.appointmentId ?? undefined,
        practitionerId,
        title: payload.title,
        description: payload.description,
        type: payload.type,
        status: this.enumOrUndefined(data.status, ['ACTIVE','ONGOING','RESOLVED','CANCELLED','CLOSED']) ?? 'ACTIVE',
        priority: this.enumOrUndefined(data.priority, ['ROUTINE','LOW','MEDIUM','HIGH','URGENT','CRITICAL']) ?? 'ROUTINE',
        startedAt: this.dateOrUndefined(data.startedAt) ?? new Date(),
        endedAt: this.dateOrUndefined(data.endedAt),
        resolvedAt: this.dateOrUndefined(data.resolvedAt),
      },
    });
  }

  private async writeSymptomLog(
    tx: Prisma.TransactionClient,
    patientId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const episodeId = this.requiredString(data.clinicalEpisodeId, 'clinicalEpisodeId');
    await this.assertEpisodeForPatient(tx, episodeId, patientId);

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Symptom log id is required for an update.');
      const existing = await tx.symptomLog.findFirst({
        where: { id: dto.id, clinicalEpisode: { patientId } },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Symptom log not found for this patient.');
      return tx.symptomLog.update({
        where: { id: dto.id },
        data: {
          title: this.stringOrUndefined(data.title),
          notes: this.stringOrUndefined(data.notes),
          status: this.enumOrUndefined(data.status, Object.values(SymptomLogStatus)),
          overallSeverity: this.enumOrUndefined(data.overallSeverity, Object.values(SymptomSeverity)),
          progression: this.enumOrUndefined(data.progression, Object.values(SymptomProgression)),
          startedAt: this.dateOrUndefined(data.startedAt),
          resolvedAt: this.dateOrNull(data.resolvedAt),
        },
      });
    }

    return tx.symptomLog.create({
      data: {
        clinicalEpisodeId: episodeId,
        title: this.stringOrUndefined(data.title),
        notes: this.stringOrUndefined(data.notes),
        status: (this.enumOrUndefined(data.status, Object.values(SymptomLogStatus)) as SymptomLogStatus | undefined) ?? SymptomLogStatus.ACTIVE,
        overallSeverity: this.enumOrUndefined(data.overallSeverity, Object.values(SymptomSeverity)) as SymptomSeverity | undefined,
        progression: this.enumOrUndefined(data.progression, Object.values(SymptomProgression)) as SymptomProgression | undefined,
        startedAt: this.dateOrUndefined(data.startedAt) ?? new Date(),
        resolvedAt: this.dateOrUndefined(data.resolvedAt),
      },
    });
  }

  private async writeSymptomItem(
    tx: Prisma.TransactionClient,
    patientId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const symptomLogId = this.requiredString(data.symptomLogId, 'symptomLogId');
    const symptomId = this.requiredString(data.symptomId, 'symptomId');
    await this.assertExists(tx.symptom, symptomId, 'Symptom');

    const log = await tx.symptomLog.findFirst({
      where: { id: symptomLogId, clinicalEpisode: { patientId } },
      select: { id: true },
    });
    if (!log) throw new NotFoundException('Symptom log not found for this patient.');

    const itemData: any = {
      symptomId,
      aISymptomId: this.stringOrUndefined(data.aISymptomId),
      severity: this.enumOrUndefined(data.severity, Object.values(SymptomSeverity)) ?? SymptomSeverity.MILD,
      progression: this.enumOrUndefined(data.progression, Object.values(SymptomProgression)),
      frequency: this.enumOrUndefined(data.frequency, Object.values(SymptomFrequency)),
      painCharacter: this.enumOrUndefined(data.painCharacter, ['SHARP','DULL','THROBBING','STABBING','BURNING','CRAMPING','PRESSURE','TIGHTNESS','ACHING','OTHER']),
      painScore: this.intOrUndefined(data.painScore),
      durationMinutes: this.intOrUndefined(data.durationMinutes),
      onsetAt: this.dateOrUndefined(data.onsetAt),
      resolvedAt: this.dateOrUndefined(data.resolvedAt),
      intermittent: this.booleanOrUndefined(data.intermittent) ?? false,
      recurring: this.booleanOrUndefined(data.recurring) ?? false,
      suspectedTrigger: this.stringOrUndefined(data.suspectedTrigger),
      aggravatingFactors: this.stringOrUndefined(data.aggravatingFactors),
      relievingFactors: this.stringOrUndefined(data.relievingFactors),
      notes: this.stringOrUndefined(data.notes),
    };

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Symptom item id is required for an update.');
      const existing = await tx.symptomLogItem.findFirst({
        where: { id: dto.id, symptomLog: { clinicalEpisode: { patientId } } },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Symptom item not found for this patient.');
      return tx.symptomLogItem.update({ where: { id: dto.id }, data: itemData, include: { symptom: true, symptomLog: true } });
    }

    return tx.symptomLogItem.create({
      data: { symptomLogId, ...itemData },
      include: { symptom: true, symptomLog: true },
    });
  }

  private async writePrescription(
    tx: Prisma.TransactionClient,
    patientId: string,
    practitioner: any,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const encounter = await this.findOrCreateEncounter(
      tx,
      null,
      patientId,
      practitioner.id,
      {
        encounterId: this.stringOrUndefined(data.encounterId),
      },
    );

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Prescription id is required for an update.');
      const existing = await tx.prescription.findFirst({
        where: { id: dto.id, patientId },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Prescription not found for this patient.');
      return tx.prescription.update({
        where: { id: dto.id },
        data: {
          status: this.enumOrUndefined(data.status, ['DRAFT','ACTIVE','DISPENSED','COMPLETED','CANCELLED','EXPIRED']),
          expiresAt: this.dateOrNull(data.expiresAt),
          notes: this.stringOrNull(data.notes),
        },
        include: { items: { include: { medication: true } }, practitioner: { include: { person: true } }, encounter: true },
      });
    }

    const medicationId = this.requiredString(data.medicationId, 'medicationId');
    const medication = await tx.medication.findUnique({ where: { id: medicationId }, select: { id: true, name: true, genericName: true, brandName: true } });
    if (!medication) throw new NotFoundException('Medication not found.');

    const prescription = await tx.prescription.create({
      data: {
        encounterId: encounter.id,
        patientId,
        practitionerId: practitioner.id,
        status: 'ACTIVE',
        expiresAt: this.dateOrUndefined(data.expiresAt),
        notes: this.stringOrUndefined(data.notes),
        items: {
          create: {
            medicationId,
            dosage: this.requiredString(data.dosage, 'dosage'),
            frequency: this.enumOrValue(data.frequency, ['ONCE_DAILY','TWICE_DAILY','THREE_TIMES_DAILY','FOUR_TIMES_DAILY','EVERY_4_HOURS','EVERY_6_HOURS','EVERY_8_HOURS','EVERY_12_HOURS','WEEKLY','MONTHLY','AS_NEEDED']),
            route: this.enumOrValue(data.route, ['ORAL','TOPICAL','INTRAVENOUS','INTRAMUSCULAR','SUBCUTANEOUS','INHALATION','RECTAL','NASAL','OPHTHALMIC','OTIC','OTHER']),
            durationDays: this.intOrUndefined(data.durationDays),
            quantity: this.numberOrUndefined(data.quantity),
            refills: this.intOrUndefined(data.refills) ?? 0,
            instructions: this.stringOrUndefined(data.instructions),
          },
        },
      },
      include: { items: { include: { medication: true } }, practitioner: { include: { person: true } }, encounter: true },
    });

    await this.syncPatientMedicationFromPrescription(tx, patientId, practitioner, prescription);

    return prescription;
  }

  private async writePrescriptionItem(
    tx: Prisma.TransactionClient,
    patientId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    if (!dto.id) throw new BadRequestException('Prescription item id is required.');
    const existing = await tx.prescriptionItem.findFirst({
      where: { id: dto.id, prescription: { patientId } },
      include: { medication: true, prescription: true },
    });
    if (!existing) throw new NotFoundException('Prescription item not found for this patient.');

    if (dto.action !== SmartFileClinicalWriteAction.UPDATE) {
      throw new BadRequestException('Prescription items are updated in place; create a new prescription instead.');
    }

    const updated = await tx.prescriptionItem.update({
      where: { id: dto.id },
      data: {
        medicationId: this.stringOrUndefined(data.medicationId),
        dosage: this.stringOrUndefined(data.dosage),
        frequency: this.enumOrUndefined(data.frequency, ['ONCE_DAILY','TWICE_DAILY','THREE_TIMES_DAILY','FOUR_TIMES_DAILY','EVERY_4_HOURS','EVERY_6_HOURS','EVERY_8_HOURS','EVERY_12_HOURS','WEEKLY','MONTHLY','AS_NEEDED']),
        route: this.enumOrUndefined(data.route, ['ORAL','TOPICAL','INTRAVENOUS','INTRAMUSCULAR','SUBCUTANEOUS','INHALATION','RECTAL','NASAL','OPHTHALMIC','OTIC','OTHER']),
        durationDays: this.intOrUndefined(data.durationDays),
        quantity: this.numberOrUndefined(data.quantity),
        refills: this.intOrUndefined(data.refills),
        instructions: this.stringOrUndefined(data.instructions),
      },
      include: { medication: true, prescription: true },
    });

    const prescription = await tx.prescription.findUnique({
      where: { id: updated.prescriptionId },
      include: { items: { include: { medication: true } }, practitioner: { include: { person: true } } },
    });
    if (prescription) {
      await this.syncPatientMedicationFromPrescription(tx, patientId, prescription.practitioner, prescription);
    }

    return updated;
  }

  private async writePatientMedication(
    tx: Prisma.TransactionClient,
    patientId: string,
    practitioner: any,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const passport = await this.ensureHealthPassport(tx, patientId);
    const medicationId = this.requiredString(data.medicationId, 'medicationId');
    await this.assertExists(tx.medication, medicationId, 'Medication');

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Patient medication id is required for an update.');
      const existing = await tx.patientMedication.findFirst({
        where: { id: dto.id, healthPassport: { patientId } },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Patient medication not found.');
      return tx.patientMedication.update({
        where: { id: dto.id },
        data: this.patientMedicationData(data, practitioner),
        include: { medication: true, healthPassport: { include: { patient: { include: { person: true } } } } },
      });
    }

    return tx.patientMedication.upsert({
      where: {
        healthPassportId_medicationId: {
          healthPassportId: passport.id,
          medicationId,
        },
      },
      update: this.patientMedicationData(data, practitioner),
      create: {
        healthPassportId: passport.id,
        medicationId,
        ...this.patientMedicationData(data, practitioner),
      },
      include: { medication: true, healthPassport: { include: { patient: { include: { person: true } } } } },
    });
  }

  private async writeHealthPassport(
    tx: Prisma.TransactionClient,
    patientId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const existing = await tx.healthPassport.findUnique({ where: { patientId } });
    if (dto.action === SmartFileClinicalWriteAction.UPDATE && !existing) {
      throw new NotFoundException('Health passport not found.');
    }

    const payload: any = {
      bloodType: this.stringOrUndefined(data.bloodType),
      rhesusFactor: this.stringOrUndefined(data.rhesusFactor),
      organDonor: this.booleanOrUndefined(data.organDonor),
      emergencyNotes: this.stringOrUndefined(data.emergencyNotes),
    };

    return existing
      ? tx.healthPassport.update({ where: { id: existing.id }, data: payload })
      : tx.healthPassport.create({ data: { patientId, ...payload } });
  }

  private async writeMedicalRecord(
    tx: Prisma.TransactionClient,
    patientId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    if (dto.action === SmartFileClinicalWriteAction.UPDATE || dto.action === SmartFileClinicalWriteAction.CREATE) {
      return tx.medicalRecord.upsert({
        where: { patientId },
        update: {
          bloodType: this.stringOrUndefined(data.bloodType),
          allergies: this.stringOrUndefined(data.allergies),
          chronicConditions: this.stringOrUndefined(data.chronicConditions),
          pastMedicalHistory: this.stringOrUndefined(data.pastMedicalHistory),
          surgicalHistory: this.stringOrUndefined(data.surgicalHistory),
          familyHistory: this.stringOrUndefined(data.familyHistory),
          socialHistory: this.stringOrUndefined(data.socialHistory),
          currentMedications: this.stringOrUndefined(data.currentMedications),
          immunizationNotes: this.stringOrUndefined(data.immunizationNotes),
          organDonor: this.booleanOrUndefined(data.organDonor),
        },
        create: {
          patientId,
          bloodType: this.stringOrUndefined(data.bloodType),
          allergies: this.stringOrUndefined(data.allergies),
          chronicConditions: this.stringOrUndefined(data.chronicConditions),
          pastMedicalHistory: this.stringOrUndefined(data.pastMedicalHistory),
          surgicalHistory: this.stringOrUndefined(data.surgicalHistory),
          familyHistory: this.stringOrUndefined(data.familyHistory),
          socialHistory: this.stringOrUndefined(data.socialHistory),
          currentMedications: this.stringOrUndefined(data.currentMedications),
          immunizationNotes: this.stringOrUndefined(data.immunizationNotes),
          organDonor: this.booleanOrUndefined(data.organDonor),
        },
      });
    }
    throw new BadRequestException('Medical record write is invalid.');
  }

  private async writeCondition(
    tx: Prisma.TransactionClient,
    patientId: string,
    practitioner: any,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const passport = await this.ensureHealthPassport(tx, patientId);
    const conditionId = this.requiredString(data.conditionId, 'conditionId');
    await this.assertExists(tx.condition, conditionId, 'Condition');

    const payload: any = {
      diagnosedAt: this.dateOrUndefined(data.diagnosedAt) ?? new Date(),
      resolvedAt: this.dateOrUndefined(data.resolvedAt),
      status: this.enumOrUndefined(data.status, Object.values(ConditionStatus)) ?? ConditionStatus.ACTIVE,
      severity: this.enumOrUndefined(data.severity, ['MILD','MODERATE','SEVERE','CRITICAL']),
      stage: this.stringOrUndefined(data.stage),
      chronic: this.booleanOrUndefined(data.chronic) ?? false,
      primaryCondition: this.booleanOrUndefined(data.primaryCondition) ?? false,
      diagnosedBy: this.stringOrUndefined(data.diagnosedBy ?? this.displayName(practitioner.person)),
      treatmentPlan: this.stringOrUndefined(data.treatmentPlan),
      outcome: this.stringOrUndefined(data.outcome),
      notes: this.stringOrUndefined(data.notes),
    };

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Condition id is required for an update.');
      const existing = await tx.patientCondition.findFirst({
        where: { id: dto.id, healthPassport: { patientId } },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Condition not found for this patient.');
      return tx.patientCondition.update({
        where: { id: dto.id },
        data: { conditionId, ...payload },
        include: { condition: true },
      });
    }

    return tx.patientCondition.upsert({
      where: {
        healthPassportId_conditionId: { healthPassportId: passport.id, conditionId },
      },
      update: payload,
      create: { healthPassportId: passport.id, conditionId, ...payload },
      include: { condition: true },
    });
  }

  private async writeAllergy(
    tx: Prisma.TransactionClient,
    patientId: string,
    practitioner: any,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const passport = await this.ensureHealthPassport(tx, patientId);
    const allergyId = this.requiredString(data.allergyId, 'allergyId');
    await this.assertExists(tx.allergy, allergyId, 'Allergy');

    const payload: any = {
      severity: this.enumOrUndefined(data.severity, ['MILD','MODERATE','SEVERE']) ?? 'MILD',
      reaction: this.stringOrUndefined(data.reaction),
      reactionNotes: this.stringOrUndefined(data.reactionNotes),
      onsetDate: this.dateOrUndefined(data.onsetDate),
      lastReaction: this.dateOrUndefined(data.lastReaction),
      verified: this.booleanOrUndefined(data.verified) ?? true,
      verifiedBy: this.stringOrUndefined(data.verifiedBy ?? this.displayName(practitioner.person)),
      status: this.enumOrUndefined(data.status, Object.values(AllergyStatus)) ?? AllergyStatus.ACTIVE,
      notes: this.stringOrUndefined(data.notes),
    };

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Allergy id is required for an update.');
      const existing = await tx.patientAllergy.findFirst({
        where: { id: dto.id, healthPassport: { patientId } },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Allergy not found for this patient.');
      return tx.patientAllergy.update({ where: { id: dto.id }, data: { allergyId, ...payload }, include: { allergy: true } });
    }

    return tx.patientAllergy.upsert({
      where: { healthPassportId_allergyId: { healthPassportId: passport.id, allergyId } },
      update: payload,
      create: { healthPassportId: passport.id, allergyId, ...payload },
      include: { allergy: true },
    });
  }

  private async writeImmunization(
    tx: Prisma.TransactionClient,
    patientId: string,
    practitioner: any,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const passport = await this.ensureHealthPassport(tx, patientId);
    const immunizationId = this.requiredString(data.immunizationId, 'immunizationId');
    await this.assertExists(tx.immunization, immunizationId, 'Immunization');
    const doseNumber = this.intOrUndefined(data.doseNumber);

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Immunisation id is required for an update.');
      const existing = await tx.patientImmunization.findFirst({
        where: { id: dto.id, healthPassport: { patientId } },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Immunisation not found for this patient.');
      return tx.patientImmunization.update({
        where: { id: dto.id },
        data: this.immunizationData(data, practitioner),
        include: { immunization: true },
      });
    }

    return tx.patientImmunization.create({
      data: {
        healthPassportId: passport.id,
        immunizationId,
        doseNumber,
        ...this.immunizationData(data, practitioner),
      },
      include: { immunization: true },
    });
  }

  private async writeCarePlan(
    tx: Prisma.TransactionClient,
    patientId: string,
    practitionerId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Care plan id is required for an update.');
      const existing = await tx.carePlan.findFirst({ where: { id: dto.id, patientId }, select: { id: true } });
      if (!existing) throw new NotFoundException('Care plan not found for this patient.');
      return tx.carePlan.update({
        where: { id: dto.id },
        data: {
          practitionerId,
          encounterId: this.stringOrUndefined(data.encounterId),
          title: this.requiredString(data.title, 'title'),
          description: this.stringOrUndefined(data.description),
          status: this.enumOrUndefined(data.status, Object.values(CarePlanStatus)),
          startDate: this.dateOrUndefined(data.startDate) ?? new Date(),
          endDate: this.dateOrNull(data.endDate),
        },
        include: { goals: true, notes: true, tasks: true, practitioner: { include: { person: true } } },
      });
    }

    return tx.carePlan.create({
      data: {
        patientId,
        practitionerId,
        encounterId: this.stringOrUndefined(data.encounterId),
        title: this.requiredString(data.title, 'title'),
        description: this.stringOrUndefined(data.description),
        status: this.enumOrUndefined(data.status, Object.values(CarePlanStatus)) ?? CarePlanStatus.ACTIVE,
        startDate: this.dateOrUndefined(data.startDate) ?? new Date(),
        endDate: this.dateOrUndefined(data.endDate),
      },
      include: { goals: true, notes: true, tasks: true, practitioner: { include: { person: true } } },
    });
  }

  private async writeCarePlanGoal(
    tx: Prisma.TransactionClient,
    patientId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const carePlanId = this.requiredString(data.carePlanId, 'carePlanId');
    await this.assertCarePlanForPatient(tx, carePlanId, patientId);

    const payload: any = {
      title: this.requiredString(data.title, 'title'),
      description: this.stringOrUndefined(data.description),
      targetValue: this.stringOrUndefined(data.targetValue),
      currentValue: this.stringOrUndefined(data.currentValue),
      dueDate: this.dateOrUndefined(data.dueDate),
      status: this.enumOrUndefined(data.status, Object.values(CarePlanGoalStatus)),
    };

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Care-plan goal id is required for an update.');
      const existing = await tx.carePlanGoal.findFirst({ where: { id: dto.id, carePlan: { patientId } }, select: { id: true } });
      if (!existing) throw new NotFoundException('Care-plan goal not found for this patient.');
      return tx.carePlanGoal.update({ where: { id: dto.id }, data: payload });
    }

    return tx.carePlanGoal.create({ data: { carePlanId, ...payload } });
  }

  private async writeCarePlanTask(
    tx: Prisma.TransactionClient,
    patientId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const carePlanId = this.requiredString(data.carePlanId, 'carePlanId');
    await this.assertCarePlanForPatient(tx, carePlanId, patientId);

    const payload: any = {
      assignedToId: this.stringOrUndefined(data.assignedToId),
      type: this.requiredString(data.type, 'type'),
      title: this.requiredString(data.title, 'title'),
      description: this.stringOrUndefined(data.description),
      dueDate: this.dateOrUndefined(data.dueDate),
      completedAt: this.dateOrNull(data.completedAt),
      status: this.enumOrUndefined(data.status, Object.values(CarePlanTaskStatus)) ?? CarePlanTaskStatus.PENDING,
    };

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Care-plan task id is required for an update.');
      const existing = await tx.carePlanTask.findFirst({ where: { id: dto.id, carePlan: { patientId } }, select: { id: true } });
      if (!existing) throw new NotFoundException('Care-plan task not found for this patient.');
      return tx.carePlanTask.update({ where: { id: dto.id }, data: payload });
    }

    return tx.carePlanTask.create({ data: { carePlanId, ...payload } });
  }

  private async writeCarePlanNote(
    tx: Prisma.TransactionClient,
    patientId: string,
    authorId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const carePlanId = this.requiredString(data.carePlanId, 'carePlanId');
    await this.assertCarePlanForPatient(tx, carePlanId, patientId);

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Care-plan note id is required for an update.');
      const existing = await tx.carePlanNote.findFirst({ where: { id: dto.id, carePlan: { patientId } }, select: { id: true } });
      if (!existing) throw new NotFoundException('Care-plan note not found for this patient.');
      return tx.carePlanNote.update({
        where: { id: dto.id },
        data: { note: this.requiredString(data.note, 'note') },
      });
    }

    return tx.carePlanNote.create({
      data: { carePlanId, authorId, note: this.requiredString(data.note, 'note') },
    });
  }

  private async writeReferral(
    tx: Prisma.TransactionClient,
    consent: any,
    patientId: string,
    practitionerId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const payload: any = {
      receivingPractitionerId: this.stringOrUndefined(data.receivingPractitionerId),
      referringPracticeId: this.stringOrUndefined(data.referringPracticeId),
      receivingPracticeId: this.stringOrUndefined(data.receivingPracticeId),
      encounterId: this.stringOrUndefined(data.encounterId),
      type: this.requiredString(data.type, 'type'),
      priority: this.enumOrUndefined(data.priority, Object.values(ReferralPriority)) ?? ReferralPriority.ROUTINE,
      status: this.enumOrUndefined(data.status, Object.values(ReferralStatus)) ?? ReferralStatus.PENDING,
      specialty: this.stringOrUndefined(data.specialty),
      reason: this.requiredString(data.reason, 'reason'),
      clinicalSummary: this.stringOrUndefined(data.clinicalSummary),
      requestedDate: this.dateOrUndefined(data.requestedDate) ?? new Date(),
    };

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Referral id is required for an update.');
      const existing = await tx.referral.findFirst({ where: { id: dto.id, patientId }, select: { id: true } });
      if (!existing) throw new NotFoundException('Referral not found for this patient.');
      return tx.referral.update({ where: { id: dto.id }, data: payload, include: { receivingPractitioner: { include: { person: true } }, referringPractitioner: { include: { person: true } } } });
    }

    if (payload.receivingPractitionerId) {
      await this.assertExists(tx.practitioner, payload.receivingPractitionerId, 'Receiving practitioner');
    }

    return tx.referral.create({
      data: {
        patientId,
        referringPractitionerId: practitionerId,
        referralNumber: `SF-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        ...payload,
        appointmentId: consent.appointmentId ?? undefined,
      },
      include: {
        receivingPractitioner: { include: { person: true } },
        referringPractitioner: { include: { person: true } },
      },
    });
  }

  private async writeReferralNote(
    tx: Prisma.TransactionClient,
    patientId: string,
    authorId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const referralId = this.requiredString(data.referralId, 'referralId');
    const referral = await tx.referral.findFirst({ where: { id: referralId, patientId }, select: { id: true } });
    if (!referral) throw new NotFoundException('Referral not found for this patient.');

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Referral note id is required for an update.');
      const existing = await tx.referralNote.findFirst({ where: { id: dto.id, referralId }, select: { id: true } });
      if (!existing) throw new NotFoundException('Referral note not found.');
      return tx.referralNote.update({ where: { id: dto.id }, data: { note: this.requiredString(data.note, 'note') } });
    }

    return tx.referralNote.create({
      data: { referralId, authorId, note: this.requiredString(data.note, 'note') },
    });
  }

  private async writeLabOrder(
    tx: Prisma.TransactionClient,
    consent: any,
    patientId: string,
    practitionerId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Lab order id is required for an update.');
      const existing = await tx.labOrder.findFirst({ where: { id: dto.id, patientId }, select: { id: true } });
      if (!existing) throw new NotFoundException('Lab order not found for this patient.');

      const updated = await tx.labOrder.update({
        where: { id: dto.id },
        data: {
          practitionerId,
          encounterId: this.stringOrUndefined(data.encounterId),
          laboratoryId: this.stringOrUndefined(data.laboratoryId),
          status: this.enumOrUndefined(data.status, Object.values(LabOrderStatus)),
          clinicalNotes: this.stringOrUndefined(data.clinicalNotes),
          orderedAt: this.dateOrUndefined(data.orderedAt),
        },
        include: { items: { include: { test: true } }, practitioner: { include: { person: true } }, laboratory: true },
      });

      await this.addLabTests(tx, updated.id, data.testIds);
      return tx.labOrder.findUnique({ where: { id: updated.id }, include: { items: { include: { test: true } }, practitioner: { include: { person: true } }, laboratory: true } });
    }

    const testIds = this.stringArray(data.testIds);
    if (!testIds.length) throw new BadRequestException('At least one lab test is required.');

    for (const testId of testIds) await this.assertExists(tx.labTest, testId, 'Lab test');

    const order = await tx.labOrder.create({
      data: {
        patientId,
        encounterId: this.stringOrUndefined(data.encounterId),
        appointmentId: consent?.appointmentId ?? undefined,
        practitionerId,
        laboratoryId: this.stringOrUndefined(data.laboratoryId),
        orderNumber: `SF-LAB-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        status: this.enumOrUndefined(data.status, Object.values(LabOrderStatus)) ?? LabOrderStatus.ORDERED,
        clinicalNotes: this.stringOrUndefined(data.clinicalNotes),
        orderedAt: this.dateOrUndefined(data.orderedAt) ?? new Date(),
        items: { create: testIds.map((testId) => ({ testId })) },
      },
      include: { items: { include: { test: true } }, practitioner: { include: { person: true } }, laboratory: true },
    });

    return order;
  }

  private async writeImagingOrder(
    tx: Prisma.TransactionClient,
    consent: any,
    patientId: string,
    practitionerId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Imaging order id is required for an update.');
      const existing = await tx.imagingOrder.findFirst({ where: { id: dto.id, patientId }, select: { id: true } });
      if (!existing) throw new NotFoundException('Imaging order not found for this patient.');

      const updated = await tx.imagingOrder.update({
        where: { id: dto.id },
        data: {
          practitionerId,
          encounterId: this.stringOrUndefined(data.encounterId),
          imagingCenterId: this.stringOrUndefined(data.imagingCenterId),
          priority: this.enumOrUndefined(data.priority, Object.values(ImagingPriority)),
          status: this.enumOrUndefined(data.status, Object.values(ImagingOrderStatus)),
          clinicalIndication: this.stringOrUndefined(data.clinicalIndication),
        },
        include: { items: { include: { procedure: true } }, practitioner: { include: { person: true } }, imagingCenter: true },
      });

      await this.addImagingProcedures(tx, updated.id, data.procedureIds);
      return tx.imagingOrder.findUnique({ where: { id: updated.id }, include: { items: { include: { procedure: true } }, practitioner: { include: { person: true } }, imagingCenter: true } });
    }

    const procedureIds = this.stringArray(data.procedureIds);
    if (!procedureIds.length) throw new BadRequestException('At least one imaging procedure is required.');
    for (const procedureId of procedureIds) await this.assertExists(tx.imagingProcedure, procedureId, 'Imaging procedure');

    return tx.imagingOrder.create({
      data: {
        patientId,
        practitionerId,
        encounterId: this.stringOrUndefined(data.encounterId),
        appointmentId: consent?.appointmentId ?? undefined,
        imagingCenterId: this.stringOrUndefined(data.imagingCenterId),
        orderNumber: `SF-IMG-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        priority: this.enumOrUndefined(data.priority, Object.values(ImagingPriority)) ?? ImagingPriority.ROUTINE,
        status: this.enumOrUndefined(data.status, Object.values(ImagingOrderStatus)) ?? ImagingOrderStatus.ORDERED,
        clinicalIndication: this.stringOrUndefined(data.clinicalIndication),
        items: { create: procedureIds.map((procedureId) => ({ procedureId })) },
      },
      include: { items: { include: { procedure: true } }, practitioner: { include: { person: true } }, imagingCenter: true },
    });
  }

  private async writeImagingReport(
    tx: Prisma.TransactionClient,
    patientId: string,
    practitionerId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const studyId = this.requiredString(data.studyId, 'studyId');
    const study = await tx.imagingStudy.findFirst({ where: { id: studyId, patientId }, select: { id: true } });
    if (!study) throw new NotFoundException('Imaging study not found for this patient.');

    const payload = {
      practitionerId,
      findings: this.requiredString(data.findings, 'findings'),
      impression: this.stringOrUndefined(data.impression),
      recommendations: this.stringOrUndefined(data.recommendations),
    };

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Imaging report id is required for an update.');
      const existing = await tx.imagingReport.findFirst({ where: { id: dto.id, study: { patientId } }, select: { id: true } });
      if (!existing) throw new NotFoundException('Imaging report not found for this patient.');
      return tx.imagingReport.update({ where: { id: dto.id }, data: payload });
    }

    return tx.imagingReport.create({ data: { studyId, ...payload } });
  }

  private async writeHealthJournal(
    tx: Prisma.TransactionClient,
    patientId: string,
    practitionerId: string,
    dto: SmartFileClinicalWriteDto,
    data: AnyData,
  ) {
    const payload: any = {
      patientId,
      practitionerId,
      encounterId: this.stringOrUndefined(data.encounterId),
      title: this.stringOrUndefined(data.title),
      journal: this.requiredString(data.journal, 'journal'),
      mood: this.stringOrUndefined(data.mood),
      sleepQuality: this.stringOrUndefined(data.sleepQuality),
      sleepHours: this.decimalOrUndefined(data.sleepHours),
      energyLevel: this.stringOrUndefined(data.energyLevel),
      stressLevel: this.intOrUndefined(data.stressLevel),
      exerciseMinutes: this.intOrUndefined(data.exerciseMinutes),
      waterIntakeMl: this.intOrUndefined(data.waterIntakeMl),
      weightKg: this.decimalOrUndefined(data.weightKg),
      temperature: this.decimalOrUndefined(data.temperature),
      bloodPressureSystolic: this.intOrUndefined(data.bloodPressureSystolic),
      bloodPressureDiastolic: this.intOrUndefined(data.bloodPressureDiastolic),
      heartRate: this.intOrUndefined(data.heartRate),
      oxygenSaturation: this.decimalOrUndefined(data.oxygenSaturation),
      respiratoryRate: this.intOrUndefined(data.respiratoryRate),
      notes: this.stringOrUndefined(data.notes),
    };

    if (dto.action === SmartFileClinicalWriteAction.UPDATE) {
      if (!dto.id) throw new BadRequestException('Health Journal id is required for an update.');
      const existing = await tx.healthJournal.findFirst({ where: { id: dto.id, patientId }, select: { id: true } });
      if (!existing) throw new NotFoundException('Health Journal entry not found for this patient.');
      return tx.healthJournal.update({ where: { id: dto.id }, data: payload, include: { practitioner: { include: { person: true } }, encounter: true } });
    }

    return tx.healthJournal.create({ data: payload, include: { practitioner: { include: { person: true } }, encounter: true } });
  }

  private async syncPatientMedicationFromPrescription(
    tx: Prisma.TransactionClient,
    patientId: string,
    practitioner: any,
    prescription: any,
  ) {
    const passport = await this.ensureHealthPassport(tx, patientId);
    const practitionerName = this.displayName(practitioner.person);
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
          startedAt: prescription.issuedAt ?? new Date(),
          ongoing: true,
          status: MedicationStatus.ACTIVE,
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
          startedAt: prescription.issuedAt ?? new Date(),
          ongoing: true,
          status: MedicationStatus.ACTIVE,
          notes: prescription.notes ?? undefined,
        },
      });
    }
  }

  private patientMedicationData(data: AnyData, practitioner: any) {
    return {
      dosage: this.stringOrUndefined(data.dosage),
      frequency: this.stringOrUndefined(data.frequency),
      route: this.stringOrUndefined(data.route),
      indication: this.stringOrUndefined(data.indication),
      instructions: this.stringOrUndefined(data.instructions),
      prescribedBy: this.stringOrUndefined(data.prescribedBy ?? this.displayName(practitioner.person)),
      startedAt: this.dateOrUndefined(data.startedAt),
      endedAt: this.dateOrUndefined(data.endedAt),
      ongoing: this.booleanOrUndefined(data.ongoing),
      sideEffects: this.stringOrUndefined(data.sideEffects),
      effectiveness: this.stringOrUndefined(data.effectiveness),
      status: this.enumOrUndefined(data.status, Object.values(MedicationStatus)),
      notes: this.stringOrUndefined(data.notes),
    };
  }

  private immunizationData(data: AnyData, practitioner: any) {
    return {
      administeredAt: this.dateOrUndefined(data.administeredAt),
      doseNumber: this.intOrUndefined(data.doseNumber),
      batchNumber: this.stringOrUndefined(data.batchNumber),
      manufacturer: this.stringOrUndefined(data.manufacturer),
      administeredBy: this.stringOrUndefined(data.administeredBy ?? this.displayName(practitioner.person)),
      facility: this.stringOrUndefined(data.facility),
      route: this.stringOrUndefined(data.route),
      site: this.stringOrUndefined(data.site),
      adverseReaction: this.booleanOrUndefined(data.adverseReaction) ?? false,
      adverseReactionNotes: this.stringOrUndefined(data.adverseReactionNotes),
      nextDueDate: this.dateOrUndefined(data.nextDueDate),
      status: this.enumOrUndefined(data.status, Object.values(ImmunizationStatus)) ?? ImmunizationStatus.COMPLETED,
      notes: this.stringOrUndefined(data.notes),
    };
  }

  private async findOrCreateEncounter(
    tx: Prisma.TransactionClient,
    consent: any,
    patientId: string,
    practitionerId: string,
    options: { encounterId?: string },
  ) {
    if (options.encounterId) {
      await this.assertEncounterForPatient(tx, options.encounterId, patientId);
      return tx.encounter.findUniqueOrThrow({ where: { id: options.encounterId } });
    }

    const medicalRecord = await tx.medicalRecord.upsert({
      where: { patientId },
      update: {},
      create: { patientId },
      select: { id: true },
    });

    const encounterType = await tx.encounterType.upsert({
      where: { name: 'Clinical consultation' },
      update: {},
      create: {
        name: 'Clinical consultation',
        description: 'Clinical consultation recorded through Smart File.',
      },
      select: { id: true },
    });

    if (consent?.appointmentId) {
      const appointment = await tx.appointment.findFirst({
        where: {
          id: consent.appointmentId,
          patientId,
          practitionerId,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        select: { id: true, encounterId: true },
      });
      if (!appointment) throw new ForbiddenException('This Smart File share is not assigned to this appointment.');
      if (appointment.encounterId) {
        return tx.encounter.findUniqueOrThrow({ where: { id: appointment.encounterId } });
      }
      const encounter = await tx.encounter.create({
        data: {
          medicalRecordId: medicalRecord.id,
          practitionerId,
          encounterTypeId: encounterType.id,
          startedAt: new Date(),
        },
      });
      await tx.appointment.update({ where: { id: appointment.id }, data: { encounterId: encounter.id } });
      return encounter;
    }

    return tx.encounter.create({
      data: {
        medicalRecordId: medicalRecord.id,
        practitionerId,
        encounterTypeId: encounterType.id,
        startedAt: new Date(),
      },
    });
  }

  private async ensureHealthPassport(
    tx: Prisma.TransactionClient,
    patientId: string,
  ) {
    return tx.healthPassport.upsert({
      where: { patientId },
      update: {},
      create: { patientId },
      select: { id: true },
    });
  }

  private async addLabTests(tx: Prisma.TransactionClient, orderId: string, values: unknown) {
    for (const testId of this.stringArray(values)) {
      const exists = await tx.labOrderItem.findFirst({ where: { orderId, testId }, select: { id: true } });
      if (!exists) {
        await this.assertExists(tx.labTest, testId, 'Lab test');
        await tx.labOrderItem.create({ data: { orderId, testId } });
      }
    }
  }

  private async addImagingProcedures(tx: Prisma.TransactionClient, orderId: string, values: unknown) {
    for (const procedureId of this.stringArray(values)) {
      const exists = await tx.imagingOrderItem.findFirst({ where: { orderId, procedureId }, select: { id: true } });
      if (!exists) {
        await this.assertExists(tx.imagingProcedure, procedureId, 'Imaging procedure');
        await tx.imagingOrderItem.create({ data: { orderId, procedureId } });
      }
    }
  }

  private async assertEncounterForPatient(
    tx: Prisma.TransactionClient,
    encounterId: string,
    patientId: string,
  ) {
    const encounter = await tx.encounter.findFirst({
      where: { id: encounterId, medicalRecord: { patientId } },
      select: { id: true },
    });
    if (!encounter) throw new NotFoundException('Encounter not found for this patient.');
  }

  private async assertEpisodeForPatient(
    tx: Prisma.TransactionClient,
    episodeId: string,
    patientId: string,
  ) {
    const episode = await tx.clinicalEpisode.findFirst({
      where: { id: episodeId, patientId },
      select: { id: true },
    });
    if (!episode) throw new NotFoundException('Clinical episode not found for this patient.');
  }

  private async assertCarePlanForPatient(
    tx: Prisma.TransactionClient,
    carePlanId: string,
    patientId: string,
  ) {
    const carePlan = await tx.carePlan.findFirst({
      where: { id: carePlanId, patientId },
      select: { id: true },
    });
    if (!carePlan) throw new NotFoundException('Care plan not found for this patient.');
  }

  private async assertExists(
    delegate: any,
    id: string,
    label: string,
  ) {
    const row = await delegate.findUnique({ where: { id }, select: { id: true } });
    if (!row) throw new NotFoundException(`${label} not found.`);
  }

  private entityId(value: any, id?: string) {
    return id ?? value?.id ?? randomUUID();
  }

  private auditValue(data: AnyData) {
    const copy: AnyData = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.length > 2000) {
        copy[key] = value.slice(0, 2000);
      } else {
        copy[key] = value;
      }
    }
    return copy;
  }

  private notificationFor(
    section: SmartFileClinicalWriteSection,
    action: SmartFileClinicalWriteAction,
    practitionerName: string,
    result: any,
  ) {
    const verb = action === SmartFileClinicalWriteAction.UPDATE ? 'updated' : 'added';
    switch (section) {
      case SmartFileClinicalWriteSection.PRESCRIPTION: {
        const item = result?.items?.[0];
        const medication = item?.medication?.name ?? item?.medication?.genericName ?? 'a medication';
        return {
          type: NotificationType.PRESCRIPTION,
          title: `${practitionerName} ${verb} a prescription`,
          body: `${practitionerName} ${verb} 1 prescription for ${medication}. Your medications have been updated.`,
          actionUrl: '/medications',
          actionLabel: 'View medications',
        };
      }
      case SmartFileClinicalWriteSection.DIAGNOSIS:
        return {
          type: NotificationType.MESSAGE,
          title: `${practitionerName} recorded a diagnosis`,
          body: `${practitionerName} ${verb} the diagnosis ${result?.diagnosis?.name ?? 'in your clinical record'}.`,
          actionUrl: '/health-passport',
          actionLabel: 'View health passport',
        };
      case SmartFileClinicalWriteSection.PROCEDURE:
        return {
          type: NotificationType.MESSAGE,
          title: `${practitionerName} recorded a procedure`,
          body: `${practitionerName} ${verb} ${result?.procedure?.name ?? 'a procedure'} in your clinical record.`,
          actionUrl: '/health-passport',
          actionLabel: 'View health passport',
        };
      case SmartFileClinicalWriteSection.REFERRAL:
        return {
          type: NotificationType.MESSAGE,
          title: `${practitionerName} created a referral`,
          body: `${practitionerName} created a referral${result?.specialty ? ` to ${result.specialty}` : ''} for you.`,
          actionUrl: '/referrals',
          actionLabel: 'View referrals',
        };
      case SmartFileClinicalWriteSection.CARE_PLAN:
        return {
          type: NotificationType.MESSAGE,
          title: `${practitionerName} updated your care plan`,
          body: `${practitionerName} ${verb} a care plan in your clinical record.`,
          actionUrl: '/care-plans',
          actionLabel: 'View care plans',
        };
      default:
        return {
          type: NotificationType.MESSAGE,
          title: `${practitionerName} updated your clinical record`,
          body: `${practitionerName} ${verb} information in your Sympto Smart File.`,
          actionUrl: '/health-passport',
          actionLabel: 'View health record',
        };
    }
  }

  private displayName(person: { firstName: string; lastName: string }) {
    return `Dr ${person.firstName} ${person.lastName}`.trim();
  }

  private requiredString(value: unknown, field: string) {
    const result = this.stringOrUndefined(value);
    if (!result) throw new BadRequestException(`${field} is required.`);
    return result;
  }

  private stringOrUndefined(value: unknown) {
    if (value === null || value === undefined) return undefined;
    const result = String(value).trim();
    return result || undefined;
  }

  private stringOrNull(value: unknown) {
    return this.stringOrUndefined(value) ?? null;
  }

  private booleanOrUndefined(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new BadRequestException('Boolean value is invalid.');
  }

  private intOrUndefined(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    const result = Number(value);
    if (!Number.isInteger(result)) throw new BadRequestException('Integer value is invalid.');
    return result;
  }

  private numberValue(value: unknown, field: string) {
    const result = this.numberOrUndefined(value);
    if (result === undefined) throw new BadRequestException(`${field} is required.`);
    return result;
  }

  private numberOrUndefined(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    const result = Number(value);
    if (!Number.isFinite(result)) throw new BadRequestException('Numeric value is invalid.');
    return result;
  }

  private decimalOrUndefined(value: unknown) {
    return this.numberOrUndefined(value);
  }

  private dateOrUndefined(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    const result = new Date(String(value));
    if (Number.isNaN(result.getTime())) throw new BadRequestException('Date value is invalid.');
    return result;
  }

  private dateOrNull(value: unknown) {
    return this.dateOrUndefined(value) ?? null;
  }

  private enumOrUndefined<T extends string>(value: unknown, values: readonly T[]): T | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const result = String(value) as T;
    if (!values.includes(result)) throw new BadRequestException(`Value "${result}" is invalid.`);
    return result;
  }

  private enumOrValue(value: unknown, values: readonly string[]) {
    const result = this.stringOrUndefined(value);
    if (!result || !values.includes(result)) {
      throw new BadRequestException('Enum value is invalid.');
    }
    return result;
  }

  private enumString(
    value: unknown,
    values: readonly string[],
    field: string,
    optional = false,
  ) {
    if (optional && (value === undefined || value === null || value === '')) return undefined;
    const result = this.stringOrUndefined(value);
    if (!result || !values.includes(result)) throw new BadRequestException(`${field} is invalid.`);
    return result;
  }

  private dateOrUndefinedWithDefault(value: unknown, fallback: Date) {
    return this.dateOrUndefined(value) ?? fallback;
  }

  private stringArray(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  private auditValueSafe(value: unknown) {
    return value;
  }
}
