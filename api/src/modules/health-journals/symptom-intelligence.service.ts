import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ClinicalEpisodeStatus,
  ClinicalEpisodeType,
  SymptomLogStatus,
  SymptomSeverity,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProcessSymptomDto } from './dto/process-symptom.dto';

export interface SymptomIntelligenceAction {
  label: string;
  href: string;
}

export interface SymptomIntelligenceResult {
  symptomLogId: string;
  episodeId: string;
  observationId: string;
  assessment: {
    tone: 'calm' | 'watch' | 'urgent';
    title: string;
    message: string;
  };
  insights: string[];
  actions: SymptomIntelligenceAction[];
  context: {
    activeMedicationCount: number;
    activeMedicationNames: string[];
    conditionCount: number;
    activeConditionNames: string[];
    allergyCount: number;
    activeAllergyNames: string[];
    activeGoalCount: number;
    activeGoalTitles: string[];
    recentSymptomCount: number;
    recentSymptoms: Array<{ title: string; severity: string | null; startedAt: Date }>;
    recentJournalCount: number;
    recentVitals: Array<{ type: string; value: number; measuredAt: Date }>;
    wearableHeartRate: Array<{ value: number; measuredAt: Date }>;
    upcomingAppointment: Date | null;
    recentLabOrderCount: number;
    recentImagingCount: number;
    recentAiAssessmentCount: number;
  };
}

@Injectable()
export class SymptomIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async processSymptomLog(
    userId: string,
    dto: ProcessSymptomDto,
  ): Promise<SymptomIntelligenceResult> {
    const patient = await this.getPatient(userId);
    const symptomName = dto.symptomName.trim();
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    if (Number.isNaN(startedAt.getTime())) {
      throw new NotFoundException('Symptom start date is invalid.');
    }
    const normalizedInput = `${symptomName} ${dto.details ?? ''}`.toLowerCase();
    const urgentWarningSign = /chest pain|cannot breathe|can't breathe|difficulty breathing|fainting|unconscious|severe bleeding|stroke/.test(normalizedInput);
    const severeSymptom = dto.severity === SymptomSeverity.SEVERE || dto.severity === SymptomSeverity.VERY_SEVERE;
    const episodePriority = urgentWarningSign ? 'URGENT' : severeSymptom ? 'HIGH' : 'ROUTINE';

    let episode = await this.prisma.clinicalEpisode.findFirst({
      where: {
        patientId: patient.id,
        status: ClinicalEpisodeStatus.ACTIVE,
        type: ClinicalEpisodeType.ACUTE,
        symptomLogs: {
          some: {
            title: {
              equals: symptomName,
              mode: 'insensitive',
            },
            startedAt: {
              gte: new Date(startedAt.getTime() - 7 * 86400000),
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!episode) {
      episode = await this.prisma.clinicalEpisode.create({
        data: {
          patientId: patient.id,
          title: `Symptom: ${symptomName}`,
          description:
            'Patient symptom tracking episode. Sympto links related observations and health information over time.',
          type: ClinicalEpisodeType.ACUTE,
          priority: episodePriority,
          startedAt,
        },
      });
    }

    let symptom = await this.prisma.symptom.findFirst({
      where: {
        name: {
          equals: symptomName,
          mode: 'insensitive',
        },
      },
    });

    if (!symptom) {
      symptom = await this.prisma.symptom.create({
        data: { name: symptomName },
      });
    }

    const context = await this.buildContext(patient.id);
    const analysis = this.evaluateContext(symptomName, dto.severity, dto.details, context);

    const symptomLog = await this.prisma.$transaction(async (tx) => {
      const log = await tx.symptomLog.create({
        data: {
          clinicalEpisodeId: episode.id,
          title: symptomName,
          notes: dto.details?.trim() || undefined,
          status: SymptomLogStatus.ACTIVE,
          overallSeverity: dto.severity,
          startedAt,
        },
      });

      await tx.symptomLogItem.create({
        data: {
          symptomLogId: log.id,
          symptomId: symptom.id,
          severity: dto.severity,
          onsetAt: startedAt,
        },
      });

      const observation = await tx.aIObservation.create({
        data: {
          symptomLogId: log.id,
          observation: [
            `Symptom recorded: ${symptomName}.`,
            `Severity: ${dto.severity.toLowerCase().replaceAll('_', ' ')}.`,
            analysis.assessment.message,
            analysis.insights.slice(0, 3).join(' '),
          ].filter(Boolean).join(' '),
          recommendation: analysis.actions.map((action) => action.label).join(' · ') || null,
          requiresAttention: urgentWarningSign || severeSymptom,
        },
      });

      return { log, observation };
    });

    return {
      symptomLogId: symptomLog.log.id,
      episodeId: episode.id,
      observationId: symptomLog.observation.id,
      assessment: analysis.assessment,
      insights: analysis.insights,
      actions: analysis.actions,
      context: {
        activeMedicationCount: context.activeMedicationCount,
        activeMedicationNames: context.activeMedicationNames,
        conditionCount: context.conditionCount,
        activeConditionNames: context.activeConditionNames,
        allergyCount: context.allergyCount,
        activeAllergyNames: context.activeAllergyNames,
        activeGoalCount: context.activeGoalCount,
        activeGoalTitles: context.activeGoalTitles,
        recentSymptomCount: context.recentSymptomCount,
        recentSymptoms: context.recentSymptoms,
        recentJournalCount: context.recentJournalCount,
        recentVitals: context.recentVitals,
        wearableHeartRate: context.wearableHeartRate,
        upcomingAppointment: context.upcomingAppointment,
        recentLabOrderCount: context.recentLabOrderCount,
        recentImagingCount: context.recentImagingCount,
        recentAiAssessmentCount: context.recentAiAssessmentCount,
      },
    };
  }

  async analyzeTalkUpdate(userId: string, message: string) {
    const patient = await this.getPatient(userId);
    const context = await this.buildContext(patient.id);
    const normalized = message.trim().toLowerCase();

    const urgent = /chest pain|cannot breathe|can't breathe|difficulty breathing|fainting|unconscious|severe bleeding|stroke/.test(normalized);
    const symptomMentioned = /headache|pain|fever|vomit|vomiting|dizzy|dizziness|breathless|shortness of breath|cough|rash|fatigue|tired|nausea|diarrhea|stomach|abdominal/.test(normalized);

    const insights: string[] = [];
    const actions: SymptomIntelligenceAction[] = [];

    if (urgent) {
      insights.push('Your message includes a symptom that can require urgent medical attention. If it is severe, sudden, or getting worse, seek emergency care now.');
      actions.push({ label: 'Get urgent help', href: 'tel:112' });
    } else if (symptomMentioned) {
      insights.push('I can connect this update with your recorded health information instead of treating it as an isolated note.');
    }

    if (context.recentSymptomCount > 0) {
      insights.push(`You have ${context.recentSymptomCount} recent symptom tracking point${context.recentSymptomCount === 1 ? '' : 's'} available for comparison.`);
    }
    if (context.activeMedicationCount > 0) {
      insights.push('Your active medication record is available when looking at this update.');
    }
    if (context.recentVitals.length > 0 || context.wearableHeartRate.length > 0) {
      insights.push('Recent vital and wearable measurements are available to help put this update in context.');
    }

    if (actions.length === 0) {
      actions.push({ label: 'Log as symptom', href: '/log-symptom' });
    }
    actions.push({ label: 'Open My Health Record', href: '/health-journal' });

    return {
      assessment: {
        tone: urgent ? ('urgent' as const) : symptomMentioned ? ('watch' as const) : ('calm' as const),
        title: urgent ? 'Please get urgent help' : symptomMentioned ? 'Sympto has connected the context' : 'Health update noted',
        message: urgent
          ? 'This is safety guidance, not a diagnosis. Please seek appropriate medical care now if the symptom is severe or worsening.'
          : 'Your update stays connected to your health record so future symptoms, measurements, medicines and care events can be considered together.',
      },
      insights,
      actions,
      context: {
        activeMedicationCount: context.activeMedicationCount,
        activeMedicationNames: context.activeMedicationNames,
        conditionCount: context.conditionCount,
        activeConditionNames: context.activeConditionNames,
        allergyCount: context.allergyCount,
        activeAllergyNames: context.activeAllergyNames,
        activeGoalCount: context.activeGoalCount,
        activeGoalTitles: context.activeGoalTitles,
        recentSymptomCount: context.recentSymptomCount,
        recentSymptoms: context.recentSymptoms,
        recentJournalCount: context.recentJournalCount,
        recentVitals: context.recentVitals,
        wearableHeartRate: context.wearableHeartRate,
        upcomingAppointment: context.upcomingAppointment,
        recentLabOrderCount: context.recentLabOrderCount,
        recentImagingCount: context.recentImagingCount,
        recentAiAssessmentCount: context.recentAiAssessmentCount,
      },
    };
  }

  private async getPatient(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found.');
    }

    return patient;
  }

  private async buildContext(patientId: string) {
    const now = new Date();
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        healthPassport: {
          include: {
            medications: {
              where: { status: { in: ['ACTIVE', 'PAUSED'] } },
              include: { medication: true },
            },
            conditions: { include: { condition: true } },
            allergies: { include: { allergy: true } },
          },
        },
        medicalRecord: true,
        clinicalEpisodes: {
          where: { status: ClinicalEpisodeStatus.ACTIVE },
          include: {
            symptomLogs: {
              orderBy: { startedAt: 'desc' },
              take: 10,
            },
          },
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
        appointments: {
          where: { scheduledStart: { gte: now } },
          orderBy: { scheduledStart: 'asc' },
          take: 1,
        },
        labOrders: {
          orderBy: { orderedAt: 'desc' },
          take: 5,
        },
        imagingStudies: {
          orderBy: { performedAt: 'desc' },
          take: 5,
        },
        wearableDevices: {
          where: { status: 'ACTIVE' },
          include: {
            measurements: {
              orderBy: { measuredAt: 'desc' },
              take: 5,
            },
          },
          take: 5,
        },
        aiSymptomAssessments: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        healthJournals: {
          orderBy: { createdAt: 'desc' },
          take: 7,
        },
        healthGoals: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            title: true,
            category: true,
            targetValue: true,
            unit: true,
            targetDate: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found.');
    }

    const encounters = patient.medicalRecord
      ? await this.prisma.encounter.findMany({
          where: { medicalRecordId: patient.medicalRecord.id },
          orderBy: { startedAt: 'desc' },
          take: 5,
          select: { id: true },
        })
      : [];

    const recentVitals = encounters.length
      ? await this.prisma.clinicalVital.findMany({
          where: { encounterId: { in: encounters.map((encounter) => encounter.id) } },
          orderBy: { measuredAt: 'desc' },
          take: 8,
          include: { vitalType: true },
        })
      : [];

    const recentSymptomCount = patient.clinicalEpisodes.reduce(
      (count, episode) => count + episode.symptomLogs.length,
      0,
    );

    const wearableHeartRate = patient.wearableDevices
      .flatMap((device) => device.measurements)
      .filter((measurement) => String(measurement.measurementType).includes('HEART_RATE'))
      .sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())
      .slice(0, 5)
      .map((measurement) => ({ value: Number(measurement.value), measuredAt: measurement.measuredAt }));

    const activeMedicationNames = (patient.healthPassport?.medications ?? [])
      .map((item) => item.medication?.name ?? item.medication?.genericName ?? item.medication?.brandName)
      .filter(Boolean)
      .map(String);

    const activeConditionNames = (patient.healthPassport?.conditions ?? [])
      .map((item) => item.condition?.name)
      .filter(Boolean)
      .map(String);

    const activeAllergyNames = (patient.healthPassport?.allergies ?? [])
      .map((item) => item.allergy?.name)
      .filter(Boolean)
      .map(String);

    const recentSymptoms = patient.clinicalEpisodes
      .flatMap((episode) => episode.symptomLogs)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, 10)
      .map((log) => ({
        title: log.title ?? 'Symptom recorded',
        severity: log.overallSeverity,
        startedAt: log.startedAt,
      }));

    const journalVitals = patient.healthJournals.flatMap((journal) => {
      const rows: Array<{ type: string; value: number; measuredAt: Date }> = [];
      if (journal.bloodPressureSystolic != null) rows.push({ type: 'BLOOD_PRESSURE_SYSTOLIC', value: Number(journal.bloodPressureSystolic), measuredAt: journal.createdAt });
      if (journal.bloodPressureDiastolic != null) rows.push({ type: 'BLOOD_PRESSURE_DIASTOLIC', value: Number(journal.bloodPressureDiastolic), measuredAt: journal.createdAt });
      if (journal.heartRate != null) rows.push({ type: 'HEART_RATE', value: Number(journal.heartRate), measuredAt: journal.createdAt });
      if (journal.oxygenSaturation != null) rows.push({ type: 'OXYGEN_SATURATION', value: Number(journal.oxygenSaturation), measuredAt: journal.createdAt });
      if (journal.respiratoryRate != null) rows.push({ type: 'RESPIRATORY_RATE', value: Number(journal.respiratoryRate), measuredAt: journal.createdAt });
      if (journal.temperature != null) rows.push({ type: 'BODY_TEMPERATURE', value: Number(journal.temperature), measuredAt: journal.createdAt });
      return rows;
    });

    const combinedVitals = [...recentVitals.map((vital) => ({
      type: vital.vitalType.name,
      value: Number(vital.value),
      measuredAt: vital.measuredAt,
    })), ...journalVitals]
      .sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())
      .slice(0, 12);

    return {
      activeMedicationCount: patient.healthPassport?.medications.length ?? 0,
      activeMedicationNames,
      conditionCount: patient.healthPassport?.conditions.length ?? 0,
      activeConditionNames,
      allergyCount: patient.healthPassport?.allergies.length ?? 0,
      activeAllergyNames,
      activeGoalCount: patient.healthGoals.length,
      activeGoalTitles: patient.healthGoals.map((goal) => String(goal.title)),
      recentSymptomCount: Math.max(recentSymptomCount, 1),
      recentSymptoms,
      recentJournalCount: patient.healthJournals.length,
      recentVitals: combinedVitals,
      wearableHeartRate,
      upcomingAppointment: patient.appointments[0]?.scheduledStart ?? null,
      recentLabOrderCount: patient.labOrders.length,
      recentImagingCount: patient.imagingStudies.length,
      recentAiAssessmentCount: patient.aiSymptomAssessments.length,
    };
  }

  private evaluateContext(
    symptomName: string,
    severity: SymptomSeverity,
    details: string | undefined,
    context: Awaited<ReturnType<SymptomIntelligenceService['buildContext']>>,
  ) {
    const normalized = `${symptomName} ${details ?? ''}`.toLowerCase();
    const urgent = /chest pain|cannot breathe|can't breathe|difficulty breathing|fainting|unconscious|severe bleeding|stroke/.test(normalized);
    const severe = severity === SymptomSeverity.SEVERE || severity === SymptomSeverity.VERY_SEVERE;

    const insights: string[] = [];
    const actions: SymptomIntelligenceAction[] = [];

    if (urgent) {
      insights.push('This symptom description includes a possible urgent warning sign. Sympto cannot diagnose you; seek urgent medical care if it is severe, sudden, or worsening.');
      actions.push({ label: 'Get urgent help', href: 'tel:112' });
    }

    if (context.recentSymptomCount > 1) {
      insights.push(`There are ${context.recentSymptomCount} recent symptom tracking points across your active health episodes, so Sympto can compare this entry over time.`);
      actions.push({ label: 'Review symptom history', href: '/health-journal' });
    }

    const highBp = context.recentVitals.some((vital) =>
      /systolic/i.test(vital.type) && vital.value >= 140,
    );
    if (highBp) {
      insights.push('A recent blood-pressure measurement is in a range worth rechecking and discussing with your healthcare professional, especially if symptoms continue.');
      actions.push({ label: 'Check my vitals', href: '/health-journal' });
    }

    if (context.wearableHeartRate.length > 0) {
      insights.push('Recent wearable heart-rate readings are available and remain linked to your health context.');
    }

    if (context.activeMedicationCount > 0) {
      insights.push(`Your ${context.activeMedicationCount} active medication record${context.activeMedicationCount === 1 ? '' : 's'} is part of the context available for follow-up.`);
    }

    if (context.conditionCount > 0 || context.allergyCount > 0) {
      insights.push('Your recorded conditions and allergies remain available as part of the clinical context.');
    }

    if (context.activeGoalCount > 0) {
      insights.push(`Your ${context.activeGoalCount} active health goal${context.activeGoalCount === 1 ? '' : 's'} remain connected so symptom trends can be reviewed alongside the goals you are working on.`);
    }

    if (context.recentJournalCount > 0) {
      insights.push(`Your recent journal entries are also available for longitudinal comparison.`);
    }

    if (context.upcomingAppointment) {
      insights.push(`You have an upcoming appointment on ${context.upcomingAppointment.toLocaleDateString('en-ZA')}.`);
      actions.push({ label: 'View my appointment', href: '/appointments' });
    }

    if (context.recentLabOrderCount > 0 || context.recentImagingCount > 0) {
      insights.push('Recent laboratory and imaging activity is also available in your health record for longitudinal review.');
    }

    if (context.recentAiAssessmentCount > 0) {
      insights.push('Previous AI symptom assessments are available for continuity; Sympto does not treat them as a diagnosis.');
    }

    if (!urgent && (severe || insights.length === 0)) {
      insights.push('Keep tracking this symptom. The value of the log is that future entries can be compared with your other health information.');
    }

    if (!urgent && actions.length === 0) {
      actions.push({ label: 'Keep tracking', href: '/health-journal' });
    }

    return {
      assessment: {
        tone: urgent ? ('urgent' as const) : severe || insights.length > 1 ? ('watch' as const) : ('calm' as const),
        title: urgent ? 'Please get urgent help' : severe ? 'Symptom recorded — keep a closer watch' : 'Symptom connected to your health context',
        message: urgent
          ? 'This is safety guidance, not a diagnosis. Please seek appropriate medical care when needed.'
          : 'Your symptom is now part of a longitudinal record that Sympto can compare with your other health information.',
      },
      insights,
      actions: actions.slice(0, 4),
    };
  }
}
