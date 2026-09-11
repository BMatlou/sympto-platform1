import { Injectable, NotFoundException } from '@nestjs/common';
import { SymptomLogStatus, SymptomSeverity, ClinicalEpisodeStatus, ClinicalEpisodeType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProcessSymptomDto } from './dto/process-symptom.dto';

export interface SymptomIntelligenceAction {
  label: string;
  href: string;
}

export interface SymptomIntelligenceResult {
  symptomLogId: string;
  episodeId: string;
  assessment: {
    tone: 'calm' | 'watch' | 'urgent';
    title: string;
    message: string;
  };
  insights: string[];
  actions: SymptomIntelligenceAction[];
  context: {
    activeMedicationCount: number;
    conditionCount: number;
    allergyCount: number;
    recentSymptomCount: number;
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
          description: 'Patient symptom tracking episode. Sympto links related observations and health information over time.',
          type: ClinicalEpisodeType.ACUTE,
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

      return log;
    });

    const context = await this.buildContext(patient.id);
    const analysis = this.evaluateContext(symptomName, dto.severity, dto.details, context);

    return {
      symptomLogId: symptomLog.id,
      episodeId: episode.id,
      assessment: analysis.assessment,
      insights: analysis.insights,
      actions: analysis.actions,
      context: {
        activeMedicationCount: context.activeMedicationCount,
        conditionCount: context.conditionCount,
        allergyCount: context.allergyCount,
        recentSymptomCount: context.recentSymptomCount,
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
      actions.push({ label: 'Get urgent help', href: '/emergency' });
    } else if (symptomMentioned) {
      insights.push(`I can connect this update with your recorded health information instead of treating it as an isolated note.`);
    }

    if (context.recentSymptomCount > 0) {
      insights.push(`You have ${context.recentSymptomCount} recent symptom tracking point${context.recentSymptomCount === 1 ? '' : 's'} available for comparison.`);
    }
    if (context.activeMedicationCount > 0) {
      insights.push(`Your active medication record is available when looking at this update.`);
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
        tone: urgent ? 'urgent' as const : symptomMentioned ? 'watch' as const : 'calm' as const,
        title: urgent ? 'Please get urgent help' : symptomMentioned ? 'Sympto has connected the context' : 'Health update noted',
        message: urgent
          ? 'This is safety guidance, not a diagnosis. Please seek appropriate medical care now if the symptom is severe or worsening.'
          : 'Your update stays connected to your health record so future symptoms, measurements, medicines and care events can be considered together.',
      },
      insights,
      actions,
      context: {
        activeMedicationCount: context.activeMedicationCount,
        conditionCount: context.conditionCount,
        allergyCount: context.allergyCount,
        recentSymptomCount: context.recentSymptomCount,
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
            medications: { where: { active: true }, include: { medication: true } },
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
          where: { scheduledAt: { gte: now } },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
        },
        labOrders: {
          orderBy: { createdAt: 'desc' },
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
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found.');
    }

    const encounterIds = patient.medicalRecord
      ? (await this.prisma.encounter.findMany({
          where: { medicalRecordId: patient.medicalRecord.id },
          orderBy: { startedAt: 'desc' },
          take: 5,
          select: { id: true },
        })).map((encounter) => encounter.id)
      : [];

    const recentVitals = encounterIds.length
      ? await this.prisma.clinicalVital.findMany({
          where: { encounterId: { in: encounterIds } },
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

    return {
      activeMedicationCount: patient.healthPassport?.medications.length ?? 0,
      conditionCount: patient.healthPassport?.conditions.length ?? 0,
      allergyCount: patient.healthPassport?.allergies.length ?? 0,
      recentSymptomCount,
      recentVitals: recentVitals.map((vital) => ({
        type: vital.vitalType.name,
        value: Number(vital.value),
        measuredAt: vital.measuredAt,
      })),
      wearableHeartRate,
      upcomingAppointment: patient.appointments[0]?.scheduledAt ?? null,
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
      actions.push({ label: 'Get urgent help', href: '/emergency' });
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
        tone: urgent ? 'urgent' as const : severe || insights.length > 1 ? 'watch' as const : 'calm' as const,
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
