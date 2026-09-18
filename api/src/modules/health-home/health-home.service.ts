import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GoalsEngineService } from '../health-goals/goals-engine-v3.service';
import { HealthGoalIntelligenceService } from '../health-goals/health-goal-intelligence.service';

const ACTIVE_APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] as const;
const ACTIVE_MEDICATION_STATUSES = ['ACTIVE', 'PAUSED'] as const;

function calculateBmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  return Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
}

function getBmiCategory(bmi: number | null): string | null {
  if (bmi == null || Number.isNaN(bmi)) return null;
  if (bmi < 18.5) return 'UNDERWEIGHT';
  if (bmi < 25) return 'HEALTHY_WEIGHT';
  if (bmi < 30) return 'OVERWEIGHT';
  if (bmi < 35) return 'OBESITY_CLASS_1';
  if (bmi < 40) return 'OBESITY_CLASS_2';
  return 'OBESITY_CLASS_3';
}

function optionalNumber(name: string, value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new BadRequestException(`${name} must be a valid number.`);
  }
  return parsed;
}

function normalizeBodyTemperatureCelsius(value: unknown): number | undefined {
  const parsed = optionalNumber('Body temperature', value);
  if (parsed === undefined) return undefined;
  // Store temperature in Celsius. Also accept a common Fahrenheit body-temperature
  // entry such as 98.6 and normalize it before validation/storage.
  if (parsed >= 90 && parsed <= 113) {
    return Number(((parsed - 32) * 5 / 9).toFixed(2));
  }
  return parsed;
}

function assertRange(name: string, value: number | undefined, min: number, max: number) {
  if (value == null) return;
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new BadRequestException(`${name} is outside the supported range.`);
  }
}
function southAfricaDayBounds(value: Date) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
  const start = new Date(`${date}T00:00:00+02:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

@Injectable()
export class HealthHomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsEngine: GoalsEngineService,
    private readonly healthGoalIntelligence: HealthGoalIntelligenceService,
  ) {}

  private async patientForWrite(userId: string, requestedPatientId?: string) {
    const patient = await this.prisma.patient.findUnique({ where: { userId }, include: { baseline: true } });
    if (!patient) throw new NotFoundException('Patient health profile not found.');
    if (requestedPatientId && requestedPatientId !== patient.id) {
      throw new BadRequestException('Measurements can only be recorded for the signed-in patient.');
    }
    return patient;
  }

  async updateWeight(userId: string, weightKg: number, heightCm?: number, requestedPatientId?: string) {
    const patient = await this.patientForWrite(userId, requestedPatientId);
    assertRange('Weight', weightKg, 1, 500);
    assertRange('Height', heightCm, 50, 250);

    const nextHeightCm = heightCm ?? (patient.heightCm != null ? Number(patient.heightCm) : patient.baseline?.heightCm != null ? Number(patient.baseline.heightCm) : null);
    const bmi = calculateBmi(weightKg, nextHeightCm);
    const recordedAt = new Date();

    await this.prisma.patient.update({ where: { id: patient.id }, data: { weightKg, ...(heightCm !== undefined ? { heightCm } : {}) } });

    await this.prisma.patientBaseline.upsert({
      where: { patientId: patient.id },
      update: { weightKg: String(weightKg), ...(heightCm !== undefined ? { heightCm: String(heightCm) } : {}), ...(bmi != null ? { bmi: String(bmi) } : {}), establishedAt: recordedAt },
      create: { patientId: patient.id, weightKg: String(weightKg), ...(heightCm !== undefined ? { heightCm: String(heightCm) } : nextHeightCm != null ? { heightCm: String(nextHeightCm) } : {}), ...(bmi != null ? { bmi: String(bmi) } : {}), establishedAt: recordedAt },
    });

    await this.goalsEngine.recordMetricEvent({
      patientId: patient.id,
      metricType: 'WEIGHT',
      metricKey: 'weight.kg',
      loggedValue: weightKg,
      occurredAt: recordedAt,
      source: 'patient-profile',
      sourceId: 'profile',
    });

    return { weightKg, heightCm: nextHeightCm, bmi, bmiCategory: getBmiCategory(bmi), recordedAt: recordedAt.toISOString() };
  }

  async recordManualVitals(userId: string, input: { systolicPressure?: number | string; diastolicPressure?: number | string; restingHeartRate?: number | string; respiratoryRate?: number | string; oxygenSaturation?: number | string; bodyTemperature?: number | string; weightKg?: number | string; heightCm?: number | string; measuredAt?: string }, requestedPatientId?: string) {
    const patient = await this.patientForWrite(userId, requestedPatientId);

    // Normalize at the API boundary so HTML number fields and JSON numeric
    // strings are handled consistently rather than being rejected as strings.
    const systolicPressure = optionalNumber('Systolic pressure', input.systolicPressure);
    const diastolicPressure = optionalNumber('Diastolic pressure', input.diastolicPressure);
    const restingHeartRate = optionalNumber('Heart rate', input.restingHeartRate);
    const respiratoryRate = optionalNumber('Respiratory rate', input.respiratoryRate);
    const oxygenSaturation = optionalNumber('Oxygen saturation', input.oxygenSaturation);
    const bodyTemperature = normalizeBodyTemperatureCelsius(input.bodyTemperature);
    const weightKg = optionalNumber('Weight', input.weightKg);
    const heightCm = optionalNumber('Height', input.heightCm);

    if ([systolicPressure, diastolicPressure, restingHeartRate, respiratoryRate, oxygenSaturation, bodyTemperature, weightKg, heightCm].every((value) => value === undefined)) {
      throw new BadRequestException('At least one vital must be entered.');
    }

    assertRange('Systolic pressure', systolicPressure, 40, 300);
    assertRange('Diastolic pressure', diastolicPressure, 20, 200);
    assertRange('Heart rate', restingHeartRate, 20, 260);
    assertRange('Respiratory rate', respiratoryRate, 2, 80);
    assertRange('Oxygen saturation', oxygenSaturation, 50, 100);
    assertRange('Body temperature', bodyTemperature, 25, 45);
    assertRange('Weight', weightKg, 1, 500);
    assertRange('Height', heightCm, 50, 250);
    if ((systolicPressure != null && diastolicPressure == null) || (systolicPressure == null && diastolicPressure != null)) throw new BadRequestException('Enter both systolic and diastolic blood pressure.');

    const measuredAt = input.measuredAt ? new Date(input.measuredAt) : new Date();
    if (Number.isNaN(measuredAt.getTime())) throw new BadRequestException('Measurement date is invalid.');

    const currentHeight = heightCm ?? (patient.heightCm != null ? Number(patient.heightCm) : patient.baseline?.heightCm != null ? Number(patient.baseline.heightCm) : null);
    const currentWeight = weightKg ?? (patient.weightKg != null ? Number(patient.weightKg) : patient.baseline?.weightKg != null ? Number(patient.baseline.weightKg) : null);
    const bmi = calculateBmi(currentWeight, currentHeight);
    const bmiCategory = getBmiCategory(bmi);

    await this.prisma.patient.update({ where: { id: patient.id }, data: { ...(weightKg !== undefined ? { weightKg: weightKg } : {}), ...(heightCm !== undefined ? { heightCm: heightCm } : {}) } });
    const baseline = await this.prisma.patientBaseline.upsert({
      where: { patientId: patient.id },
      update: {
        ...(weightKg !== undefined ? { weightKg: String(weightKg) } : {}), ...(heightCm !== undefined ? { heightCm: String(heightCm) } : {}), ...(bmi != null ? { bmi: String(bmi) } : {}),
        ...(systolicPressure !== undefined ? { systolicPressure: systolicPressure } : {}), ...(diastolicPressure !== undefined ? { diastolicPressure: diastolicPressure } : {}), ...(restingHeartRate !== undefined ? { restingHeartRate: restingHeartRate } : {}), ...(respiratoryRate !== undefined ? { respiratoryRate: respiratoryRate } : {}), ...(oxygenSaturation !== undefined ? { oxygenSaturation: String(oxygenSaturation) } : {}), ...(bodyTemperature !== undefined ? { bodyTemperature: String(bodyTemperature) } : {}), establishedAt: measuredAt,
      },
      create: {
        patientId: patient.id,
        ...(weightKg !== undefined ? { weightKg: String(weightKg) } : currentWeight != null ? { weightKg: String(currentWeight) } : {}), ...(heightCm !== undefined ? { heightCm: String(heightCm) } : currentHeight != null ? { heightCm: String(currentHeight) } : {}), ...(bmi != null ? { bmi: String(bmi) } : {}),
        ...(systolicPressure !== undefined ? { systolicPressure: systolicPressure } : {}), ...(diastolicPressure !== undefined ? { diastolicPressure: diastolicPressure } : {}), ...(restingHeartRate !== undefined ? { restingHeartRate: restingHeartRate } : {}), ...(respiratoryRate !== undefined ? { respiratoryRate: respiratoryRate } : {}), ...(oxygenSaturation !== undefined ? { oxygenSaturation: String(oxygenSaturation) } : {}), ...(bodyTemperature !== undefined ? { bodyTemperature: String(bodyTemperature) } : {}), establishedAt: measuredAt,
      },
    });

    if (weightKg !== undefined) {
      await this.goalsEngine.recordMetricEvent({
        patientId: patient.id,
        metricType: 'WEIGHT',
        metricKey: 'weight.kg',
        loggedValue: weightKg,
        occurredAt: measuredAt,
        source: 'patient-profile',
        sourceId: 'profile',
      });
    }

    const { start, end } = southAfricaDayBounds(measuredAt);
    const parts = [
      weightKg != null ? `Weight: ${Number(weightKg).toFixed(1)} kg.` : null,
      heightCm != null ? `Height: ${Number(heightCm).toFixed(0)} cm.` : null,
      weightKg != null && heightCm != null && bmi != null ? `BMI: ${Number(bmi).toFixed(1)}${bmiCategory ? ` (${bmiCategory.replaceAll('_', ' ').toLowerCase()})` : ''}.` : null,
      systolicPressure != null && diastolicPressure != null ? `Blood pressure: ${systolicPressure}/${diastolicPressure} mmHg.` : null,
      restingHeartRate != null ? `Heart rate: ${restingHeartRate} bpm.` : null,
      oxygenSaturation != null ? `Oxygen saturation: ${oxygenSaturation}%.` : null,
      bodyTemperature != null ? `Temperature: ${bodyTemperature} °C.` : null,
      respiratoryRate != null ? `Respiratory rate: ${respiratoryRate}/min.` : null,
    ].filter(Boolean) as string[];
    const journalText = [`Today’s measurements recorded in Sympto.`, ...parts].join('\n');

    const existingJournal = await this.prisma.healthJournal.findFirst({
      where: {
        patientId: patient.id,
        title: '[Sympto] Today\'s measurements',
        createdAt: { gte: start, lt: end },
      },
      orderBy: { createdAt: 'desc' },
    });

    const journalData = {
      title: '[Sympto] Today\'s measurements',
      journal: journalText,
      weightKg: weightKg ?? undefined,
      temperature: bodyTemperature ?? undefined,
      bloodPressureSystolic: systolicPressure ?? undefined,
      bloodPressureDiastolic: diastolicPressure ?? undefined,
      heartRate: restingHeartRate ?? undefined,
      oxygenSaturation: oxygenSaturation ?? undefined,
      respiratoryRate: respiratoryRate ?? undefined,
      notes: [
        heightCm != null ? `Height: ${Number(heightCm).toFixed(0)} cm.` : null,
        weightKg != null && heightCm != null && bmi != null ? `BMI: ${Number(bmi).toFixed(1)}.` : null,
      ].filter(Boolean).join(' ') || undefined,
      updatedAt: measuredAt,
    };

    if (existingJournal) {
      await this.prisma.healthJournal.update({ where: { id: existingJournal.id }, data: journalData });
    } else {
      await this.prisma.healthJournal.create({ data: { ...journalData, patientId: patient.id, createdAt: measuredAt } });
    }

    return { recordedAt: measuredAt.toISOString(), bmi, bmiCategory, baseline };
  }

  async getHealthHome(userId: string, requestedPatientId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { person: true, patient: { include: { healthPassport: { include: { immunizations: { include: { immunization: true }, orderBy: { administeredAt: 'desc' } } } }, baseline: true, healthJournalSettings: true, emergencyContacts: true, medicalRecord: true, person: true } } } });
    if (!user?.patient) throw new NotFoundException('Patient health profile not found.');
    const ownerPatient = user.patient;
    let patient = ownerPatient;
    let selectedUserId = userId;
    if (requestedPatientId && requestedPatientId !== ownerPatient.id) {
      const familyLink = await this.prisma.familyMember.findFirst({ where: { ownerPatientId: ownerPatient.id, memberPatientId: requestedPatientId, canViewRecords: true } });
      if (!familyLink) throw new NotFoundException('You are not authorised to view this family member.');
      const familyPatient = await this.prisma.patient.findUnique({ where: { id: requestedPatientId }, include: { healthPassport: { include: { immunizations: { include: { immunization: true }, orderBy: { administeredAt: 'desc' } } } }, baseline: true, healthJournalSettings: true, emergencyContacts: true, medicalRecord: true, person: true } });
      if (!familyPatient) throw new NotFoundException('Family member health profile not found.');
      patient = familyPatient;
      selectedUserId = familyPatient.userId;
    }
    const patientId = patient.id;

    if (patient.weightKg != null) {
      await this.goalsEngine.recordMetricEvent({
        patientId,
        metricType: 'WEIGHT',
        metricKey: 'weight.kg',
        loggedValue: Number(patient.weightKg),
        source: 'patient-profile',
        sourceId: 'profile',
      });
    }

    const healthPassportId = patient.healthPassport?.id;
    const now = new Date();
    const immunizations = patient.healthPassport?.immunizations ?? [];
    const medicalRecord = patient.medicalRecord;
    const [allergies, conditions, medications, goals, family, appointments, notifications, devices, measurements, symptomLogs, aiObservations, labOrders, imagingStudies, carePlans, encounters, prescriptions, patientInsurances] = await Promise.all([
      this.prisma.patientAllergy.findMany({ where: { healthPassportId: healthPassportId ?? '' }, include: { allergy: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.patientCondition.findMany({ where: { healthPassportId: healthPassportId ?? '' }, include: { condition: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.patientMedication.findMany({ where: { healthPassportId: healthPassportId ?? '', status: { in: [...ACTIVE_MEDICATION_STATUSES] } }, include: { medication: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.healthGoal.findMany({ where: { patientId, status: { in: ['ACTIVE', 'ACHIEVED'] } }, include: { progress: { orderBy: { measuredAt: 'desc' }, take: 1 } }, orderBy: [{ priority: 'desc' }, { targetDate: 'asc' }] }),
      this.prisma.familyMember.findMany({ where: { ownerPatientId: ownerPatient.id }, include: { memberPatient: { include: { person: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.appointment.findMany({ where: { patientId, status: { in: [...ACTIVE_APPOINTMENT_STATUSES] }, scheduledStart: { gte: now } }, include: { practitioner: { include: { person: true } }, practice: true, telemedicineSession: true }, orderBy: { scheduledStart: 'asc' }, take: 10 }),
      this.prisma.notification.findMany({ where: { userId: selectedUserId, readAt: null, status: { in: ['PENDING', 'QUEUED', 'SENT', 'DELIVERED'] } }, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], take: 10 }),
      this.prisma.wearableDevice.findMany({ where: { patientId }, orderBy: { lastSyncAt: 'desc' }, include: { _count: { select: { measurements: true } } } }),
      this.prisma.deviceMeasurement.findMany({ where: { device: { patientId } }, orderBy: { measuredAt: 'desc' }, take: 100 }),
      this.prisma.symptomLog.findMany({ where: { clinicalEpisode: { patientId }, status: { in: ['ACTIVE', 'COMPLETED'] } }, include: { clinicalEpisode: true, symptoms: { include: { symptom: true } }, triggers: true }, orderBy: { startedAt: 'desc' }, take: 20 }),
      this.prisma.aIObservation.findMany({ where: { symptomLog: { clinicalEpisode: { patientId } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.labOrder.findMany({ where: { patientId }, include: { laboratory: true, items: { include: { test: true, labResults: { orderBy: { createdAt: 'desc' }, take: 1, include: { items: { include: { test: true } } } } } } }, orderBy: { orderedAt: 'desc' }, take: 20 }),
      this.prisma.imagingStudy.findMany({ where: { patientId }, include: { imagingCenter: true, reports: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.carePlan.findMany({ where: { patientId, status: { in: ['ACTIVE', 'DRAFT'] } }, include: { practitioner: { include: { person: true } }, goals: true, tasks: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.encounter.findMany({ where: { medicalRecord: { patientId } }, orderBy: { startedAt: 'desc' }, take: 50 }),
      this.prisma.prescription.findMany({ where: { patientId }, orderBy: { issuedAt: 'desc' }, take: 50 }),
      this.prisma.patientInsurance.findMany({ where: { patientId }, include: { insurancePolicy: { include: { provider: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    const encounterIds = encounters.map((encounter) => encounter.id);
    const [attachments, clinicalVitals] = await Promise.all([
      encounterIds.length ? this.prisma.attachment.findMany({ where: { encounterId: { in: encounterIds } }, orderBy: { uploadedAt: 'desc' }, take: 100 }) : Promise.resolve([]),
      encounterIds.length ? this.prisma.clinicalVital.findMany({ where: { encounterId: { in: encounterIds } }, orderBy: { measuredAt: 'desc' }, include: { vitalType: true }, take: 50 }) : Promise.resolve([]),
    ]);
    const latestMeasurements = new Map<string, (typeof measurements)[number]>();
    for (const measurement of measurements) if (!latestMeasurements.has(measurement.measurementType)) latestMeasurements.set(measurement.measurementType, measurement);
    const latest = (type: string) => latestMeasurements.get(type as never) ?? null;
    const latestWeight = latest('WEIGHT');
    const latestBmiMeasurement = latest('BMI');

    const latestClinicalVitals = new Map<string, (typeof clinicalVitals)[number]>();
    for (const vital of clinicalVitals) {
      const code = String(vital.vitalType?.code ?? vital.vitalType?.name ?? '').toUpperCase();
      if (code && !latestClinicalVitals.has(code)) latestClinicalVitals.set(code, vital);
    }

    const baselineRecordedAt = patient.baseline?.establishedAt ?? patient.baseline?.updatedAt ?? null;
    const { start: todayStart, end: todayEnd } = southAfricaDayBounds(now);
    const baselineRecordedToday = baselineRecordedAt != null && baselineRecordedAt >= todayStart && baselineRecordedAt < todayEnd;
    const manualVitals = [
      baselineRecordedToday && patient.baseline?.weightKg != null ? { type: 'WEIGHT', name: 'Weight', value: Number(patient.baseline.weightKg), unit: 'kg', measuredAt: baselineRecordedAt, source: 'MANUAL_ENTRY' } : null,
      baselineRecordedToday && patient.baseline?.heightCm != null ? { type: 'HEIGHT', name: 'Height', value: Number(patient.baseline.heightCm), unit: 'cm', measuredAt: baselineRecordedAt, source: 'MANUAL_ENTRY' } : null,
      patient.baseline?.systolicPressure != null && patient.baseline?.diastolicPressure != null ? { type: 'BLOOD_PRESSURE', name: 'Blood pressure', value: `${patient.baseline.systolicPressure}/${patient.baseline.diastolicPressure}`, unit: 'mmHg', measuredAt: baselineRecordedAt, source: 'MANUAL_ENTRY' } : null,
      patient.baseline?.restingHeartRate != null ? { type: 'HEART_RATE', name: 'Heart rate', value: Number(patient.baseline.restingHeartRate), unit: 'bpm', measuredAt: baselineRecordedAt, source: 'MANUAL_ENTRY' } : null,
      patient.baseline?.oxygenSaturation != null ? { type: 'OXYGEN_SATURATION', name: 'Oxygen saturation', value: Number(patient.baseline.oxygenSaturation), unit: '%', measuredAt: baselineRecordedAt, source: 'MANUAL_ENTRY' } : null,
      patient.baseline?.bodyTemperature != null ? { type: 'BODY_TEMPERATURE', name: 'Body temperature', value: Number(patient.baseline.bodyTemperature), unit: '°C', measuredAt: baselineRecordedAt, source: 'MANUAL_ENTRY' } : null,
      patient.baseline?.respiratoryRate != null ? { type: 'RESPIRATORY_RATE', name: 'Respiratory rate', value: Number(patient.baseline.respiratoryRate), unit: '/min', measuredAt: baselineRecordedAt, source: 'MANUAL_ENTRY' } : null,
    ].filter(Boolean) as Array<{ type: string; name: string; value: number | string; unit: string; measuredAt: Date | null; source: string }>;

    const normalizedVitals = [
      latestClinicalVitals.get('BLOOD_PRESSURE'),
      latestClinicalVitals.get('HEART_RATE'),
      latestClinicalVitals.get('OXYGEN_SATURATION'),
      latestClinicalVitals.get('BODY_TEMPERATURE'),
      latestClinicalVitals.get('RESPIRATORY_RATE'),
      latestClinicalVitals.get('WEIGHT'),
    ].filter(Boolean).map((vital: any) => ({ type: String(vital.vitalType?.code ?? vital.vitalType?.name ?? '').toUpperCase(), name: vital.vitalType?.name ?? vital.vitalType?.code ?? 'Vital sign', value: Number(vital.value), unit: vital.vitalType?.unit ?? '', measuredAt: vital.measuredAt, source: 'CLINICAL_RECORD' }));

    const deviceSignals = ['SLEEP', 'STEPS', 'HEART_RATE', 'BLOOD_PRESSURE', 'OXYGEN_SATURATION', 'BODY_TEMPERATURE', 'RESPIRATORY_RATE', 'WEIGHT'].map(latest).filter(Boolean).map((m) => ({ type: m!.measurementType, value: Number(m!.value), unit: m!.unit, measuredAt: m!.measuredAt, source: m!.source }));
    const signalMap = new Map<string, any>();
    for (const signal of [...deviceSignals, ...manualVitals.map((vital) => ({ ...vital, measuredAt: vital.measuredAt }))]) {
      const existing = signalMap.get(signal.type);
      if (!existing || new Date(signal.measuredAt ?? 0).getTime() > new Date(existing.measuredAt ?? 0).getTime()) signalMap.set(signal.type, signal);
    }
    const journalSignals = {
      generatedAt: now.toISOString(),
      sourceCount: measurements.length + appointments.length + symptomLogs.length + notifications.length + goals.length + encounters.length + labOrders.length + imagingStudies.length + prescriptions.length,
      signals: Array.from(signalMap.values()),
      recentSymptoms: symptomLogs.slice(0, 10).map((log) => ({ id: log.id, title: log.title, severity: log.overallSeverity, progression: log.progression, startedAt: log.startedAt, symptoms: log.symptoms.map((item) => item.symptom.name) })),
      medicationCount: medications.length,
      upcomingAppointmentCount: appointments.length,
    };

    const normalizedMap = new Map<string, any>();
    for (const vital of [...normalizedVitals, ...manualVitals.map((vital) => ({ ...vital, measuredAt: vital.measuredAt?.toISOString() ?? null }))]) {
      const existing = normalizedMap.get(vital.type);
      if (!existing || new Date(vital.measuredAt ?? 0).getTime() > new Date(existing.measuredAt ?? 0).getTime()) normalizedMap.set(vital.type, vital);
    }

    const attention = [
      ...notifications.filter((n) => n.priority === 'HIGH' || n.priority === 'URGENT').map((n) => ({ type: 'NOTIFICATION', severity: n.priority, title: n.title, description: n.body, actionUrl: n.actionUrl })),
      ...aiObservations.filter((o) => o.requiresAttention && !o.reviewed).map((o) => ({ type: 'AI_OBSERVATION', severity: 'HIGH', title: 'Sympto noticed something worth reviewing', description: o.observation, actionUrl: '/health-journal' })),
      ...labOrders.flatMap((order) => order.items.flatMap((item) => item.labResults.flatMap((result) => result.items.filter((ri) => ri.abnormal || ri.critical).map((ri) => ({ type: ri.critical ? 'CRITICAL_RESULT' : 'ABNORMAL_RESULT', severity: ri.critical ? 'URGENT' : 'HIGH', title: `${ri.test.name} result needs review`, description: ri.comments ?? 'A recent laboratory result is outside the expected range.', actionUrl: '/health-journal' }))))),
    ].slice(0, 10);
    const goalsWithProgress = goals.map((goal) => ({ ...goal, latestProgress: goal.progress[0] ?? null }));
    const goalsWithRelationships = await this.healthGoalIntelligence.attachRelationships(goalsWithProgress as any[]);
    const activeAllergies = allergies.filter((item) => item.status === 'ACTIVE' || !item.status);
    const activeConditions = conditions.filter((item) => item.status === 'ACTIVE' && !item.resolvedAt);
    const bloodType = patient.healthPassport?.bloodType ?? medicalRecord?.bloodType ?? null;
    const organDonor = patient.healthPassport?.organDonor ?? medicalRecord?.organDonor ?? false;
    const emergencyNotes = patient.healthPassport?.emergencyNotes ?? null;
    const heightCm = patient.heightCm != null ? Number(patient.heightCm) : patient.baseline?.heightCm != null ? Number(patient.baseline.heightCm) : null;
    const weightKg = patient.weightKg != null ? Number(patient.weightKg) : latestWeight ? Number(latestWeight.value) : patient.baseline?.weightKg != null ? Number(patient.baseline.weightKg) : null;
    const finalBmi = calculateBmi(weightKg, heightCm) ?? (latestBmiMeasurement ? Number(latestBmiMeasurement.value) : patient.baseline?.bmi != null ? Number(patient.baseline.bmi) : null);
    const finalBmiCategory = getBmiCategory(finalBmi);
    return {
      generatedAt: now.toISOString(), profile: patient.person,
      patient: { id: patientId, patientNumber: patient.patientNumber, firstName: patient.person?.firstName ?? '', lastName: patient.person?.lastName ?? '', name: [patient.person?.firstName, patient.person?.lastName].filter(Boolean).join(' '), heightCm, weightKg, bmi: finalBmi, bmiCategory: finalBmiCategory, deceased: patient.deceased },
      healthPassport: patient.healthPassport ? { ...patient.healthPassport, bloodType, organDonor, emergencyNotes } : medicalRecord ? { bloodType, organDonor, emergencyNotes, source: 'MEDICAL_RECORD' } : null,
      healthSnapshot: { baseline: patient.baseline, activeConditions, activeAllergies, allergies: activeAllergies, immunizations, bloodType, rhesusFactor: patient.healthPassport?.rhesusFactor ?? null, heightCm, weightKg, bmi: finalBmi, bmiCategory: finalBmiCategory, latestMeasurements: journalSignals.signals, normalizedVitals: Array.from(normalizedMap.values()), connectedDevices: devices.map((device) => ({ id: device.id, manufacturer: device.manufacturer, model: device.model, deviceType: device.deviceType, status: device.status, lastSyncAt: device.lastSyncAt, measurementCount: device._count.measurements })) },
      attention, today: { notifications, upcomingAppointments: appointments.slice(0, 5), activeMedications: medications, activeMedicationCount: medications.length, activeGoalCount: goals.length },
      medications, appointments, goals: goalsWithRelationships, healthGoals: goalsWithRelationships, family, allergies, conditions, immunizations, emergencyContacts: patient.emergencyContacts,
      wearables: { devices: devices.map((device) => ({ id: device.id, manufacturer: device.manufacturer, model: device.model, deviceType: device.deviceType, status: device.status, lastSyncAt: device.lastSyncAt, measurementCount: device._count.measurements })), latestMeasurements: journalSignals.signals },
      symptoms: symptomLogs, recentResults: { laboratory: labOrders, imaging: imagingStudies }, carePlans, encounters, prescriptions, attachments, clinicalVitals, patientInsurances, medicalRecord, journal: journalSignals, ai: { recentObservations: aiObservations }, settings: patient.healthJournalSettings, healthJournalSettings: patient.healthJournalSettings,
    };
  }
}