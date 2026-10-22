import { Injectable } from '@nestjs/common';

/**
 * Read-only report normalisation and deterministic analysis.
 *
 * This initial adapter deliberately does not write to Prisma, alter source records,
 * enqueue notifications, or persist derived observations. It provides a safe shadow
 * pipeline over the detailed report payload while source adapters and policy rules
 * are validated against real fixtures.
 */

export type ObservationActor = 'PATIENT' | 'CLINICIAN' | 'DEVICE' | 'SYSTEM';
export type ObservationSourceType =
  | 'DAILY_CHECK_IN'
  | 'MANUAL_VITAL'
  | 'SYMPTOM_LOG'
  | 'SYMPTOM_FOLLOW_UP'
  | 'WEARABLE_DEVICE'
  | 'WELLNESS_METRIC'
  | 'SLEEP_SESSION'
  | 'WORKOUT_SESSION'
  | 'MEDICATION_ACTION'
  | 'GOAL_METRIC'
  | 'CLINICAL_VITAL'
  | 'LAB_RESULT';

export type ObservationQualityStatus = 'ACCEPTED' | 'NEEDS_REVIEW' | 'INVALID';

export interface HealthObservation {
  patientId: string | null;
  metric: string;
  value: number | null;
  secondaryValue: number | null;
  valueCode: string | null;
  unit: string | null;
  observedAt: string | null;
  observedAtBasis: 'SOURCE_EVENT_TIME' | 'RECORD_TIME_FALLBACK' | 'UNKNOWN';
  capturedAt: string | null;
  source: {
    type: ObservationSourceType;
    recordId: string | null;
    metricPath: string;
    actor: ObservationActor;
    sourceName: string | null;
  };
  quality: {
    status: ObservationQualityStatus;
    flags: string[];
    safetySignals: string[];
    originalValue: number | null;
    originalUnit: string | null;
  };
}

export interface HealthReportIntelligence {
  version: 'shadow-v1';
  generatedAt: string;
  coverage: {
    sourceCounts: Record<string, number>;
    observationCandidateCount: number;
    metricCounts: Record<string, number>;
    unmappedMetricCount: number;
    timestampFallbackCount: number;
    qualityAcceptedCount: number;
    qualityNeedsReviewCount: number;
    qualityInvalidCount: number;
    safetySignalCount: number;
    qualityFlags: Array<{
      metric: string;
      code: string;
      status: ObservationQualityStatus;
      sourceType: ObservationSourceType;
      sourceRecordId: string | null;
      observedAt: string | null;
      value: number | null;
      unit: string | null;
    }>;
  };
  loggingConsistency: {
    loggedDays: number;
    eligibleDays: number;
    percentage: number;
    days: string[];
    policy: string;
  };
  crossSignals: {
    sleepStress: {
      windowDays: 7;
      status: 'SUPPORTED_PATTERN' | 'NO_CLEAR_PATTERN' | 'INSUFFICIENT_DATA';
      overlappingDays: number;
      shorterSleepDays: number;
      longerSleepDays: number;
      meanStressOnShorterSleepDays: number | null;
      meanStressOnLongerSleepDays: number | null;
      difference: number | null;
      statement: string;
    };
  };
  clinicalContext: {
    ageAtReport: number | null;
    gender: string | null;
    conditions: string[];
    activeMedicationCount: number;
    allergiesOnFile: number;
    note: string;
  };
}

type Row = Record<string, any>;

const TZ = 'Africa/Johannesburg';
const SEVERITY_RANK: Record<string, number> = {
  NONE: 0, MILD: 1, MODERATE: 2, SEVERE: 3, VERY_SEVERE: 4,
};

function row(value: unknown): Row {
  return value && typeof value === 'object' ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object').map(row) : [];
}

function stringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result ? result : null;
}

function numericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function localDay(value: unknown): string | null {
  const timestamp = isoDate(value);
  if (!timestamp) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const found = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return found.year && found.month && found.day
    ? String(found.year) + '-' + String(found.month) + '-' + String(found.day)
    : null;
}

function dayOrdinal(day: string): number {
  const parts = day.split('-').map(Number);
  if (parts.length !== 3 || !parts.every(Number.isFinite)) return Number.NaN;
  return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86_400_000);
}

function eligibleDayCount(startValue: unknown, endValue: unknown): number {
  const start = localDay(startValue);
  const endTimestamp = isoDate(endValue);
  const endDate = endTimestamp ? new Date(new Date(endTimestamp).getTime() - 1) : null;
  const end = endDate ? localDay(endDate) : null;
  if (!start || !end) return 0;
  const first = dayOrdinal(start);
  const last = dayOrdinal(end);
  return Number.isFinite(first) && Number.isFinite(last) && last >= first ? last - first + 1 : 0;
}

function periodIncludes(report: Row, value: unknown): boolean {
  const time = isoDate(value);
  const start = isoDate(row(report.period).start);
  const end = isoDate(row(report.period).end);
  if (!time || !start || !end) return false;
  const instant = new Date(time).getTime();
  return instant >= new Date(start).getTime() && instant < new Date(end).getTime();
}

function normalizeMetric(value: unknown, metricKey?: unknown): string | null {
  const raw = String(value ?? '').trim().toUpperCase().replace(/[ -]+/g, '_');
  const key = String(metricKey ?? '').trim().toLowerCase().replace(/[ -]+/g, '_');
  const token = raw + ' ' + key;
  if (/BLOOD_PRESSURE|blood_pressure/.test(token)) {
    if (/diastolic/.test(token)) return 'bp.diastolic';
    if (/systolic/.test(token)) return 'bp.systolic';
    return 'bp.systolic';
  }
  if (/HEART_RATE|heart_rate|pulse/.test(token)) return 'heart_rate';
  if (/OXYGEN_SATURATION|oxygen_saturation|spo2/.test(token)) return 'oxygen_saturation';
  if (/BODY_TEMPERATURE|TEMPERATURE|body_temperature/.test(token)) return 'body_temperature';
  if (/(^|[ _])RESPIRATORY_RATE|respiratory_rate|breathing_rate/.test(token)) return 'respiratory_rate';
  if (/WEIGHT|weight_kg|weight\.kg/.test(token)) return 'weight';
  if (/HEIGHT|height_cm|height\.cm/.test(token)) return 'height';
  if (/BLOOD_GLUCOSE|blood_glucose|glucose|blood_sugar|hba1c|a1c/.test(token)) {
    return /hba1c|a1c/.test(token) ? 'lab.hba1c' : 'blood_glucose';
  }
  if (/CHOLESTEROL|triglyceride|lipid/.test(token)) {
    if (/ldl/.test(token)) return 'cholesterol.ldl';
    if (/hdl/.test(token)) return 'cholesterol.hdl';
    if (/triglyceride/.test(token)) return 'cholesterol.triglycerides';
    return 'cholesterol.total';
  }
  if (/STEPS|step_count|daily_steps/.test(token)) return 'activity.steps';
  if (/SLEEP|sleep_hours|sleep\.duration/.test(token)) return 'sleep.duration';
  if (/smoking/.test(token)) return /cigarette|tobacco.count|smoking.count/.test(token) ? 'smoking.cigarettes' : 'smoking.frequency';
  if (/alcohol/.test(token)) return /unit|drink|quantity|amount/.test(token) ? 'alcohol.units' : 'alcohol.frequency';
  if (/nutrition|calorie|protein|carbohydrate|carbs|fat|meal|food/.test(token)) {
    if (/calorie/.test(token)) return 'nutrition.calories';
    if (/protein/.test(token)) return 'nutrition.protein';
    if (/carbohydrate|carbs/.test(token)) return 'nutrition.carbohydrates';
    if (/fat/.test(token)) return 'nutrition.fat';
    return 'nutrition.intake';
  }
  if (/stress|mental\.stress/.test(token)) return 'stress.score';
  if (/mood/.test(token)) return 'mood';
  if (/energy/.test(token)) return 'energy.level';
  if (/water|hydration/.test(token)) return 'hydration.volume';
  if (/exercise|workout|activity.duration/.test(token)) return 'exercise.duration';
  if (/medication\.adherence|MEDICATION_ADHERENCE/.test(token)) return 'medication.dose_action';
  if (/symptom.*pain|pain_score/.test(token)) return 'symptom.pain_score';
  if (/symptom.*severity/.test(token)) return 'symptom.severity';
  return null;
}

function unitFor(metric: string): string | null {
  const units: Record<string, string> = {
    'bp.systolic': 'mmHg', 'bp.diastolic': 'mmHg',
    heart_rate: 'bpm', oxygen_saturation: '%', body_temperature: '°C',
    respiratory_rate: 'breaths/min', weight: 'kg', height: 'cm',
    blood_glucose: 'mmol/L', 'lab.hba1c': '%',
    'cholesterol.total': 'mmol/L', 'cholesterol.ldl': 'mmol/L',
    'cholesterol.hdl': 'mmol/L', 'cholesterol.triglycerides': 'mmol/L',
    'activity.steps': 'steps', 'sleep.duration': 'hours',
    'stress.score': '/10', mood: null as any, 'energy.level': null as any,
    'hydration.volume': 'mL', 'exercise.duration': 'minutes',
    'medication.dose_action': 'dose action',
    'smoking.cigarettes': 'cigarettes', 'alcohol.units': 'standard drinks',
    'nutrition.calories': 'kcal', 'nutrition.protein': 'g',
    'nutrition.carbohydrates': 'g', 'nutrition.fat': 'g', 'nutrition.intake': null as any,
    'symptom.severity': 'rank/4', 'symptom.pain_score': '/10',
  };
  return Object.prototype.hasOwnProperty.call(units, metric) ? units[metric] : null;
}

function normalizeUnitValue(metric: string, value: number, originalUnit: unknown): {
  value: number; unit: string | null; flags: string[];
} {
  const rawUnit = stringValue(originalUnit);
  const unit = (rawUnit ?? '').toLowerCase().replace(/º/g, '°').replace(/\s+/g, ' ').trim();
  const expected = unitFor(metric);
  let result = value;
  const flags: string[] = [];

  if (metric === 'body_temperature' && (unit.includes('fahrenheit') || /(^|[^a-z])°?f($|[^a-z])/.test(unit))) {
    result = (value - 32) * 5 / 9;
  } else if (metric === 'weight' && /^(lb|lbs|pound|pounds)$/.test(unit)) {
    result = value * 0.45359237;
  } else if ((metric === 'bp.systolic' || metric === 'bp.diastolic') && /kpa/.test(unit)) {
    result = value * 7.50062;
  } else if (metric === 'oxygen_saturation' && (unit.includes('fraction') || unit.includes('ratio')) && value >= 0 && value <= 1) {
    result = value * 100;
  } else if (metric === 'blood_glucose' && /(mg\/dl|mg per dl|mgdl)/.test(unit)) {
    result = value / 18.0182;
  } else if (metric.startsWith('cholesterol.') && /(mg\/dl|mg per dl|mgdl)/.test(unit)) {
    result = value / 38.67;
  } else if (metric === 'height' && !/cm|centimeter/.test(unit) && /(^m$|metre|meter)/.test(unit)) {
    result = value * 100;
  } else if (metric === 'sleep.duration' && /second|seconds|^s$/.test(unit)) {
    result = value / 3600;
  } else if (metric === 'sleep.duration' && /minute|min$|minutes/.test(unit)) {
    result = value / 60;
  } else if (metric === 'exercise.duration' && /second|seconds|^s$/.test(unit)) {
    result = value / 60;
  } else if (metric === 'exercise.duration' && /hour|hours|^h$/.test(unit)) {
    result = value * 60;
  } else if (metric === 'hydration.volume' && /^(l|liter|litre|liters|litres)$/.test(unit)) {
    result = value * 1000;
  } else if (expected && rawUnit && !unitsCompatible(metric, unit)) {
    flags.push('UNIT_REQUIRES_REVIEW');
  } else if (!rawUnit && expected) {
    flags.push('SOURCE_UNIT_NOT_PROVIDED');
  }

  return { value: result, unit: expected ?? rawUnit, flags };
}

function unitsCompatible(metric: string, unit: string): boolean {
  if (!unit) return false;
  if (metric.startsWith('bp.')) return /mmhg|kpa/.test(unit);
  if (metric === 'body_temperature') return /°c|celsius|°f|fahrenheit|^c$|^f$/.test(unit);
  if (metric === 'weight') return /\bkg\b|kilogram|^lb$|^lbs$|pound/.test(unit);
  if (metric === 'height') return /cm|centimeter|metre|meter|\bm\b/.test(unit);
  if (metric === 'oxygen_saturation') return /%|percent|fraction|ratio/.test(unit);
  if (metric === 'heart_rate') return /bpm|beat|\/min|minute/.test(unit);
  if (metric === 'respiratory_rate') return /breath|\/min|minute/.test(unit);
  if (metric === 'blood_glucose' || metric.startsWith('cholesterol.')) return /mmol\/l|mg\/dl|mg per dl/.test(unit);
  if (metric === 'sleep.duration') return /hour|minute|\bh\b|\bmin\b/.test(unit);
  if (metric === 'exercise.duration') return /minute|second|\bmin\b|\bs\b/.test(unit);
  if (metric === 'hydration.volume') return /ml|milliliter|litre|liter|\bl\b/.test(unit);
  if (metric === 'activity.steps') return /step|count/.test(unit);
  if (metric === 'symptom.pain_score' || metric === 'stress.score') return /\/10|10|score|point/.test(unit);
  return true;
}

function observationQuality(metric: string, value: number | null, unitFlags: string[]) {
  const flags = [...unitFlags];
  const safetySignals: string[] = [];
  let status: ObservationQualityStatus = flags.length ? 'NEEDS_REVIEW' : 'ACCEPTED';
  if (value === null) return { status, flags, safetySignals, originalValue: value, originalUnit: null as string | null };
  const markInvalid = (flag: string) => { flags.push(flag); status = 'INVALID'; };
  const markReview = (flag: string) => {
    flags.push(flag);
    if (status !== 'INVALID') status = 'NEEDS_REVIEW';
  };

  switch (metric) {
    case 'body_temperature':
      if (value < 25 || value > 45) markInvalid('TEMPERATURE_OUTSIDE_PLAUSIBILITY_RANGE');
      else {
        if (value < 32 || value >= 43) markReview('TEMPERATURE_VERIFY_ENTRY');
        if (value >= 40) safetySignals.push('HIGH_TEMPERATURE_REQUIRES_URGENT_REVIEW');
      }
      break;
    case 'oxygen_saturation':
      if (value <= 0 || value > 100) markInvalid('OXYGEN_OUTSIDE_PERCENT_SCALE');
      else if (value <= 92) safetySignals.push('LOW_OXYGEN_REQUIRES_URGENT_RECHECK');
      break;
    case 'bp.systolic':
      if (value < 40 || value > 300) markInvalid('SYSTOLIC_OUTSIDE_PLAUSIBILITY_RANGE');
      break;
    case 'bp.diastolic':
      if (value < 20 || value > 200) markInvalid('DIASTOLIC_OUTSIDE_PLAUSIBILITY_RANGE');
      break;
    case 'heart_rate':
      if (value < 20 || value > 260) markInvalid('HEART_RATE_OUTSIDE_PLAUSIBILITY_RANGE');
      break;
    case 'respiratory_rate':
      if (value < 2 || value > 80) markInvalid('RESPIRATORY_RATE_OUTSIDE_PLAUSIBILITY_RANGE');
      break;
    case 'weight':
      if (value < 1 || value > 500) markInvalid('WEIGHT_OUTSIDE_PLAUSIBILITY_RANGE');
      break;
    case 'stress.score':
    case 'symptom.pain_score':
      if (value < 0 || value > 10) markInvalid('SCORE_OUTSIDE_SCALE');
      break;
    case 'symptom.severity':
      if (value < 0 || value > 4) markInvalid('SYMPTOM_SEVERITY_OUTSIDE_SCALE');
      break;
    case 'sleep.duration':
      if (value <= 0 || value > 24) markInvalid('SLEEP_DURATION_OUTSIDE_PLAUSIBILITY_RANGE');
      break;
    case 'activity.steps':
      if (value < 0) markInvalid('NEGATIVE_STEP_COUNT');
      break;
    case 'hydration.volume':
      if (value < 0 || value > 20000) markInvalid('HYDRATION_OUTSIDE_PLAUSIBILITY_RANGE');
      break;
    case 'exercise.duration':
      if (value < 0 || value > 1440) markInvalid('EXERCISE_DURATION_OUTSIDE_PLAUSIBILITY_RANGE');
      break;
    default:
      break;
  }
  return { status, flags, safetySignals, originalValue: value, originalUnit: null as string | null };
}

function ageAt(dobValue: unknown, referenceValue: unknown): number | null {
  const dob = isoDate(dobValue);
  const reference = isoDate(referenceValue);
  if (!dob || !reference) return null;
  const birth = new Date(dob);
  const at = new Date(reference);
  if (birth > at) return null;
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  if (at.getUTCMonth() < birth.getUTCMonth() ||
      (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 && age < 125 ? age : null;
}

@Injectable()
export class HealthReportIntelligenceService {
  normalize(reportInput: unknown, patientId?: string): HealthObservation[] {
    const report = row(reportInput);
    const activity = row(report.activity);
    const clinical = row(report.clinical);
    const currentSnapshot = row(report.currentSnapshot);
    const sources: HealthObservation[] = [];
    const period = row(report.period);

    const add = (input: {
      metric: string;
      value?: unknown;
      secondaryValue?: unknown;
      valueCode?: unknown;
      unit?: unknown;
      observedAt?: unknown;
      capturedAt?: unknown;
      sourceType: ObservationSourceType;
      sourceId?: unknown;
      metricPath: string;
      actor: ObservationActor;
      sourceName?: unknown;
      observedAtBasis?: 'SOURCE_EVENT_TIME' | 'RECORD_TIME_FALLBACK' | 'UNKNOWN';
    }) => {
      const value = numericValue(input.value);
      const rawUnit = stringValue(input.unit);
      const normalized = value === null
        ? { value: null, unit: unitFor(input.metric) ?? rawUnit, flags: [] as string[] }
        : normalizeUnitValue(input.metric, value, rawUnit);
      const quality = observationQuality(input.metric, normalized.value, normalized.flags);
      quality.originalValue = value;
      quality.originalUnit = rawUnit;
      const observedAt = isoDate(input.observedAt);
      const basis = input.observedAtBasis ??
        (observedAt ? 'SOURCE_EVENT_TIME' : 'UNKNOWN');
      if (basis === 'RECORD_TIME_FALLBACK') quality.flags.push('LEGACY_TIMESTAMP_FALLBACK');
      if (!observedAt) quality.flags.push('OBSERVATION_TIME_UNKNOWN');
      sources.push({
        patientId: patientId ?? stringValue(report.patientId),
        metric: input.metric,
        value: normalized.value,
        secondaryValue: numericValue(input.secondaryValue),
        valueCode: stringValue(input.valueCode),
        unit: normalized.unit,
        observedAt,
        observedAtBasis: observedAt ? basis : 'UNKNOWN',
        capturedAt: isoDate(input.capturedAt),
        source: {
          type: input.sourceType,
          recordId: stringValue(input.sourceId),
          metricPath: input.metricPath,
          actor: input.actor,
          sourceName: stringValue(input.sourceName),
        },
        quality,
      });
    };

    for (const item of rows(activity.journalEntries)) {
      const title = String(item.title ?? '');
      const sourceType: ObservationSourceType =
        /today.s measurements/i.test(title) ? 'MANUAL_VITAL' : 'DAILY_CHECK_IN';
      const actor: ObservationActor = item.practitionerId || item.encounterId ? 'CLINICIAN' : 'PATIENT';
      const observedAt = item.observedAt ?? item.recordedAt ?? item.createdAt;
      const basis = item.observedAt || item.recordedAt ? 'SOURCE_EVENT_TIME' : item.createdAt ? 'RECORD_TIME_FALLBACK' : 'UNKNOWN';
      const capturedAt = item.createdAt;
      const journalMetrics: Array<[string, string, unknown, string | null]> = [
        ['sleepHours', 'sleep.duration', item.sleepHours, 'hours'],
        ['stressLevel', 'stress.score', item.stressLevel, '/10'],
        ['weightKg', 'weight', item.weightKg, 'kg'],
        ['bloodPressureSystolic', 'bp.systolic', item.bloodPressureSystolic, 'mmHg'],
        ['bloodPressureDiastolic', 'bp.diastolic', item.bloodPressureDiastolic, 'mmHg'],
        ['heartRate', 'heart_rate', item.heartRate, 'bpm'],
        ['oxygenSaturation', 'oxygen_saturation', item.oxygenSaturation, '%'],
        ['temperature', 'body_temperature', item.temperature, '°C'],
        ['respiratoryRate', 'respiratory_rate', item.respiratoryRate, 'breaths/min'],
        ['waterIntakeMl', 'hydration.volume', item.waterIntakeMl, 'mL'],
        ['exerciseMinutes', 'exercise.duration', item.exerciseMinutes, 'minutes'],
      ];
      for (const [field, metric, value, unit] of journalMetrics) {
        if (numericValue(value) === null) continue;
        add({ metric, value, unit, observedAt, capturedAt, sourceType, sourceId: item.id,
          metricPath: field, actor, sourceName: title || 'Health journal', observedAtBasis: basis });
      }
      for (const [field, value] of [['mood', item.mood], ['sleepQuality', item.sleepQuality], ['energyLevel', item.energyLevel]] as Array<[string, unknown]>) {
        if (stringValue(value) === null) continue;
        const metric = field === 'mood' ? 'mood' : field === 'sleepQuality' ? 'sleep.quality' : 'energy.level';
        add({ metric, valueCode: value, unit: null, observedAt, capturedAt, sourceType, sourceId: item.id,
          metricPath: field, actor, sourceName: title || 'Health journal', observedAtBasis: basis });
      }
    }

    for (const item of rows(activity.symptoms)) {
      const actor: ObservationActor = String(item.source ?? '').toUpperCase() === 'CLINICAL' ? 'CLINICIAN' : 'PATIENT';
      const at = item.startedAt ?? item.createdAt;
      const basis = item.startedAt ? 'SOURCE_EVENT_TIME' : item.createdAt ? 'RECORD_TIME_FALLBACK' : 'UNKNOWN';
      const severity = String(item.overallSeverity ?? '').toUpperCase();
      if (SEVERITY_RANK[severity] !== undefined) {
        add({ metric: 'symptom.severity', value: SEVERITY_RANK[severity], valueCode: severity,
          unit: 'rank/4', observedAt: at, capturedAt: item.createdAt, sourceType: 'SYMPTOM_LOG',
          sourceId: item.id, metricPath: 'overallSeverity', actor, sourceName: item.title, observedAtBasis: basis });
      }
      for (const monitor of rows(item.monitorings)) {
        const monitorSeverity = String(monitor.severity ?? '').toUpperCase();
        const monitorAt = monitor.observedAt ?? monitor.createdAt;
        const monitorBasis = monitor.observedAt ? 'SOURCE_EVENT_TIME' : monitor.createdAt ? 'RECORD_TIME_FALLBACK' : 'UNKNOWN';
        if (SEVERITY_RANK[monitorSeverity] !== undefined) {
          add({ metric: 'symptom.severity', value: SEVERITY_RANK[monitorSeverity], valueCode: monitorSeverity,
            unit: 'rank/4', observedAt: monitorAt, capturedAt: monitor.createdAt, sourceType: 'SYMPTOM_FOLLOW_UP',
            sourceId: monitor.id, metricPath: 'monitorings.severity', actor, sourceName: item.title, observedAtBasis: monitorBasis });
        }
        if (numericValue(monitor.painScore) !== null) {
          add({ metric: 'symptom.pain_score', value: monitor.painScore, unit: '/10', observedAt: monitorAt,
            capturedAt: monitor.createdAt, sourceType: 'SYMPTOM_FOLLOW_UP', sourceId: monitor.id,
            metricPath: 'monitorings.painScore', actor, sourceName: item.title, observedAtBasis: monitorBasis });
        }
      }
    }

    for (const item of rows(activity.deviceMeasurements)) {
      const device = row(item.device);
      const rawType = item.measurementType ?? item.metricKey ?? row(item.vitalType).name;
      const metric = normalizeMetric(rawType, item.metricKey);
      const at = item.measuredAt;
      const common = { observedAt: at, capturedAt: item.receivedAt ?? item.createdAt,
        sourceType: 'WEARABLE_DEVICE' as const, sourceId: item.id, actor: 'DEVICE' as const,
        sourceName: device.model ?? device.manufacturer ?? item.source, observedAtBasis: at ? 'SOURCE_EVENT_TIME' as const : 'UNKNOWN' as const };
      if (String(rawType ?? '').toUpperCase().includes('BLOOD_PRESSURE') ||
          String(item.metricKey ?? '').toLowerCase().includes('blood_pressure')) {
        add({ ...common, metric: 'bp.systolic', value: item.value, unit: item.unit ?? 'mmHg', metricPath: 'value' });
        if (numericValue(item.secondaryValue) !== null) {
          add({ ...common, metric: 'bp.diastolic', value: item.secondaryValue, unit: item.secondaryUnit ?? item.unit ?? 'mmHg', metricPath: 'secondaryValue' });
        }
      } else if (metric) {
        const unit = item.unit ?? unitFor(metric);
        const value = numericValue(item.value);
        // Sleep device records are commonly represented as seconds or minutes; keep
        // device values as provided unless the unit explicitly identifies a conversion.
        add({ ...common, metric, value, unit, metricPath: 'value' });
      }
    }

    for (const item of rows(activity.wellnessMetrics)) {
      const metric = normalizeMetric(item.metricKey, item.metricKey);
      if (!metric || numericValue(item.value) === null) continue;
      add({ metric, value: item.value, unit: item.unit ?? unitFor(metric), observedAt: item.measuredAt,
        capturedAt: item.createdAt, sourceType: 'WELLNESS_METRIC', sourceId: item.id,
        metricPath: 'value', actor: 'DEVICE', sourceName: item.source,
        observedAtBasis: item.measuredAt ? 'SOURCE_EVENT_TIME' : item.createdAt ? 'RECORD_TIME_FALLBACK' : 'UNKNOWN' });
    }

    for (const item of rows(activity.sleepSessions)) {
      if (numericValue(item.durationMinutes) !== null) {
        add({ metric: 'sleep.duration', value: item.durationMinutes, unit: 'minutes', observedAt: item.startedAt,
          capturedAt: item.createdAt, sourceType: 'SLEEP_SESSION', sourceId: item.id,
          metricPath: 'durationMinutes', actor: 'DEVICE', sourceName: item.source,
          observedAtBasis: item.startedAt ? 'SOURCE_EVENT_TIME' : item.createdAt ? 'RECORD_TIME_FALLBACK' : 'UNKNOWN' });
      }
    }
    for (const item of rows(activity.workouts)) {
      if (numericValue(item.durationSeconds) !== null) {
        add({ metric: 'exercise.duration', value: item.durationSeconds, unit: 'seconds', observedAt: item.startedAt,
          capturedAt: item.createdAt, sourceType: 'WORKOUT_SESSION', sourceId: item.id,
          metricPath: 'durationSeconds', actor: item.source ? 'DEVICE' : 'PATIENT', sourceName: item.activityType,
          observedAtBasis: item.startedAt ? 'SOURCE_EVENT_TIME' : item.createdAt ? 'RECORD_TIME_FALLBACK' : 'UNKNOWN' });
      }
    }

    for (const item of rows(clinical.vitals)) {
      const vitalType = row(item.vitalType);
      const metric = normalizeMetric(vitalType.code ?? vitalType.name, vitalType.code);
      if (!metric || numericValue(item.value) === null) continue;
      add({ metric, value: item.value, unit: vitalType.unit ?? unitFor(metric), observedAt: item.measuredAt ?? item.recordedAt,
        capturedAt: item.createdAt, sourceType: 'CLINICAL_VITAL', sourceId: item.id,
        metricPath: 'value', actor: 'CLINICIAN', sourceName: vitalType.name ?? vitalType.code,
        observedAtBasis: item.measuredAt || item.recordedAt ? 'SOURCE_EVENT_TIME' : item.createdAt ? 'RECORD_TIME_FALLBACK' : 'UNKNOWN' });
    }

    for (const result of rows(clinical.labResults)) {
      const resultAt = result.reportedAt ?? result.releasedAt ?? result.createdAt;
      const orderItem = row(result.orderItem);
      const items = rows(result.items);
      for (const labItem of items) {
        const test = row(labItem.test ?? orderItem.test);
        const number = numericValue(labItem.numericValue);
        if (number === null) continue;
        const metric = normalizeMetric(test.name, test.name) ?? 'lab.' + String(test.name ?? 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        const unit = row(test.unit).symbol ?? row(test.unit).name;
        add({ metric, value: number, unit, observedAt: resultAt, capturedAt: result.createdAt,
          sourceType: 'LAB_RESULT', sourceId: labItem.id ?? result.id, metricPath: 'items.numericValue',
          actor: 'CLINICIAN', sourceName: test.name, observedAtBasis: result.reportedAt || result.releasedAt ? 'SOURCE_EVENT_TIME' : result.createdAt ? 'RECORD_TIME_FALLBACK' : 'UNKNOWN' });
      }
    }

    for (const event of rows(report.goalMetricEvents)) {
      const knownMetric = normalizeMetric(event.metricType, event.metricKey);
      const rawKey = stringValue(event.metricKey);
      const metric = knownMetric ?? (rawKey
        ? 'custom.' + rawKey.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
        : null);
      if (!metric) continue;
      const meta = row(event.metadata);
      const medicationAction = event.source === 'medication-adherence';
      const action = stringValue(meta.action)?.toUpperCase();
      if (medicationAction && action !== 'TAKEN' && action !== 'SKIPPED') continue;
      const at = event.occurredAt;
      add({ metric: medicationAction ? 'medication.dose_action' : metric, value: event.loggedValue,
        valueCode: medicationAction ? action : undefined, unit: event.unit ?? unitFor(metric),
        observedAt: at, capturedAt: event.createdAt, sourceType: medicationAction ? 'MEDICATION_ACTION' : 'GOAL_METRIC',
        sourceId: event.sourceId, metricPath: event.metricKey, actor: event.source === 'wearable' ? 'DEVICE' : 'PATIENT',
        sourceName: event.source, observedAtBasis: at ? 'SOURCE_EVENT_TIME' : 'UNKNOWN' });
    }

    return sources.filter((item) => periodIncludes(report, item.observedAt));
  }

  analyze(reportInput: unknown, patientId?: string): HealthReportIntelligence {
    const report = row(reportInput);
    const activity = row(report.activity);
    const clinical = row(report.clinical);
    const tracking = row(report.tracking);
    const snapshot = row(report.currentSnapshot);
    const observations = this.normalize(reportInput, patientId);
    const metricCounts: Record<string, number> = {};
    let timestampFallbackCount = 0;
    let qualityAcceptedCount = 0;
    let qualityNeedsReviewCount = 0;
    let qualityInvalidCount = 0;
    let safetySignalCount = 0;
    const qualityFlags: HealthReportIntelligence['coverage']['qualityFlags'] = [];

    for (const observation of observations) {
      metricCounts[observation.metric] = (metricCounts[observation.metric] ?? 0) + 1;
      if (observation.observedAtBasis === 'RECORD_TIME_FALLBACK') timestampFallbackCount += 1;
      if (observation.quality.status === 'ACCEPTED') qualityAcceptedCount += 1;
      else if (observation.quality.status === 'NEEDS_REVIEW') qualityNeedsReviewCount += 1;
      else qualityInvalidCount += 1;
      safetySignalCount += observation.quality.safetySignals.length;
      for (const code of [...observation.quality.flags, ...observation.quality.safetySignals]) {
        qualityFlags.push({
          metric: observation.metric, code, status: observation.quality.status,
          sourceType: observation.source.type, sourceRecordId: observation.source.recordId,
          observedAt: observation.observedAt, value: observation.value, unit: observation.unit,
        });
      }
    }

    const sourceCounts: Record<string, number> = {
      dailyCheckIns: rows(activity.journalEntries).length,
      symptomLogs: rows(activity.symptoms).length,
      symptomFollowUps: rows(activity.symptoms).reduce((sum, item) => sum + rows(item.monitorings).length, 0),
      patientVitals: rows(activity.patientVitals).length,
      deviceMeasurements: rows(activity.deviceMeasurements).length,
      wellnessMetrics: rows(activity.wellnessMetrics).length,
      sleepSessions: rows(activity.sleepSessions).length,
      workouts: rows(activity.workouts).length,
      medicationMetricEvents: rows(report.goalMetricEvents).filter((item) =>
        /medication|adherence/i.test([item.metricType, item.metricKey, item.source].map(String).join(' '))).length,
      smokingLogs: rows(report.goalMetricEvents).filter((item) =>
        String(item.source ?? '') === 'patient-smoking-log' || /smoking|cigarette|tobacco/i.test(String(item.metricKey ?? ''))).length,
      alcoholLogs: rows(report.goalMetricEvents).filter((item) =>
        /alcohol|drink.units/i.test([item.metricType, item.metricKey, item.source].map(String).join(' '))).length,
      nutritionLogs: rows(report.goalMetricEvents).filter((item) =>
        /nutrition|calorie|protein|carbohydrate|meal|food/i.test([item.metricType, item.metricKey, item.source].map(String).join(' '))).length,
      hydrationLogs: rows(report.goalMetricEvents).filter((item) =>
        /hydration|water/i.test([item.metricType, item.metricKey, item.source].map(String).join(' '))).length,
      goalMetricEvents: rows(report.goalMetricEvents).length,
      clinicalEncounters: rows(clinical.encounters).length,
      clinicalDiagnoses: rows(clinical.diagnoses).length,
      prescriptions: rows(clinical.prescriptions).length,
      clinicalNotes: rows(clinical.notes).length,
      clinicalVitals: rows(clinical.vitals).length,
      labResults: rows(clinical.labResults).length,
      imagingStudies: rows(clinical.imaging).length,
      procedures: rows(clinical.procedures).length,
      carePlans: rows(clinical.carePlans).length,
      referrals: rows(clinical.referrals).length,
      appointments: rows(activity.appointments).length,
      goalProgress: rows(tracking.goalProgress).length,
      riskAssessments: rows(tracking.riskAssessments).length,
    };

    const loggingDays = new Set<string>();
    const addPatientDay = (value: unknown) => {
      if (!periodIncludes(report, value)) return;
      const day = localDay(value);
      if (day) loggingDays.add(day);
    };

    // The event-time field is preferred; updatedAt is deliberately never counted
    // as evidence of a new patient log.
    for (const journal of rows(activity.journalEntries)) {
      if (journal.practitionerId || journal.encounterId) continue;
      addPatientDay(journal.observedAt ?? journal.recordedAt ?? journal.createdAt);
    }
    for (const symptom of rows(activity.symptoms)) {
      if (String(symptom.source ?? '').toUpperCase() !== 'PATIENT') continue;
      addPatientDay(symptom.startedAt ?? symptom.createdAt);
      for (const monitor of rows(symptom.monitorings)) {
        if (String(monitor.source ?? 'MANUAL').toUpperCase() === 'CLINICAL') continue;
        addPatientDay(monitor.observedAt ?? monitor.createdAt);
      }
    }
    for (const vital of rows(activity.patientVitals)) {
      if (String(vital.source ?? 'PATIENT').toUpperCase() !== 'PATIENT') continue;
      addPatientDay(vital.recordedAt ?? vital.createdAt);
    }
    for (const event of rows(report.goalMetricEvents)) {
      const source = String(event.source ?? '');
      if (source === 'manual-vitals' || source === 'patient-smoking-log') addPatientDay(event.occurredAt);
      if (source === 'medication-adherence') {
        const action = stringValue(row(event.metadata).action)?.toUpperCase();
        if (action === 'TAKEN' || action === 'SKIPPED') addPatientDay(event.occurredAt);
      }
    }

    // Use the seven local calendar days ending at the period's exclusive end.
    const periodEnd = isoDate(row(report.period).end);
    const windowStart = periodEnd ? new Date(new Date(periodEnd).getTime() - 7 * 86_400_000) : null;
    const windowStartDay = windowStart ? localDay(windowStart) : null;
    const windowStartOrdinal = windowStartDay ? dayOrdinal(windowStartDay) : Number.NaN;
    const sleepStressDays = new Map<string, { sleepTotal: number; sleepCount: number; stressTotal: number; stressCount: number }>();
    for (const journal of rows(activity.journalEntries)) {
      if (journal.practitionerId || journal.encounterId) continue;
      const at = journal.observedAt ?? journal.recordedAt ?? journal.createdAt;
      if (!periodIncludes(report, at)) continue;
      const day = localDay(at);
      if (!day || !Number.isFinite(windowStartOrdinal) || dayOrdinal(day) < windowStartOrdinal) continue;
      const entry = sleepStressDays.get(day) ?? { sleepTotal: 0, sleepCount: 0, stressTotal: 0, stressCount: 0 };
      const sleep = numericValue(journal.sleepHours);
      const stress = numericValue(journal.stressLevel);
      if (sleep !== null && sleep > 0 && sleep <= 24) { entry.sleepTotal += sleep; entry.sleepCount += 1; }
      if (stress !== null && stress >= 1 && stress <= 10) { entry.stressTotal += stress; entry.stressCount += 1; }
      sleepStressDays.set(day, entry);
    }
    const paired = Array.from(sleepStressDays.entries()).map(([day, entry]) => ({
      day,
      sleep: entry.sleepCount ? entry.sleepTotal / entry.sleepCount : null,
      stress: entry.stressCount ? entry.stressTotal / entry.stressCount : null,
    })).filter((item): item is { day: string; sleep: number; stress: number } => item.sleep !== null && item.stress !== null);
    let sleepStress: HealthReportIntelligence['crossSignals']['sleepStress'];
    if (paired.length < 4) {
      sleepStress = {
        windowDays: 7, status: 'INSUFFICIENT_DATA', overlappingDays: paired.length,
        shorterSleepDays: 0, longerSleepDays: 0, meanStressOnShorterSleepDays: null,
        meanStressOnLongerSleepDays: null, difference: null,
        statement: 'Not enough same-day sleep and stress records in the seven-day window to compare these measures reliably.',
      };
    } else {
      const sortedSleep = paired.map((item) => item.sleep).sort((a, b) => a - b);
      const median = sortedSleep[Math.floor((sortedSleep.length - 1) / 2)];
      const shortDays = paired.filter((item) => item.sleep <= median);
      const longDays = paired.filter((item) => item.sleep > median);
      const mean = (items: typeof paired) => items.length ? items.reduce((sum, item) => sum + item.stress, 0) / items.length : null;
      const shortStress = mean(shortDays);
      const longStress = mean(longDays);
      const difference = shortStress !== null && longStress !== null ? shortStress - longStress : null;
      const supported = difference !== null && Math.abs(difference) >= 1 && shortDays.length >= 2 && longDays.length >= 2;
      sleepStress = {
        windowDays: 7, status: supported ? 'SUPPORTED_PATTERN' : difference === null ? 'INSUFFICIENT_DATA' : 'NO_CLEAR_PATTERN',
        overlappingDays: paired.length, shorterSleepDays: shortDays.length, longerSleepDays: longDays.length,
        meanStressOnShorterSleepDays: shortStress === null ? null : Number(shortStress.toFixed(2)),
        meanStressOnLongerSleepDays: longStress === null ? null : Number(longStress.toFixed(2)),
        difference: difference === null ? null : Number(difference.toFixed(2)),
        statement: supported
          ? difference > 0
            ? 'Higher stress was recorded alongside shorter sleep on these overlapping days; this is an association, not evidence that one caused the other.'
            : 'Lower stress was recorded alongside shorter sleep on these overlapping days; this is an association, not evidence that one caused the other.'
          : 'The available same-day records do not show a clear difference in average stress between shorter- and longer-sleep days.',
      };
    }

    const person = row(snapshot.person);
    const context = row(snapshot);
    const conditionNames = [
      ...rows(context.conditions).map((item) => stringValue(row(item.condition).name ?? item.name)),
      ...rows(context.diagnoses).map((item) => stringValue(row(item.diagnosis).name ?? item.name)),
    ].filter((item): item is string => Boolean(item));
    const activeMedications = rows(context.medications).filter((item) =>
      !/RESOLVED|INACTIVE|CANCELLED|DISCONTINUED|STOPPED/.test(String(item.status ?? '').toUpperCase()) &&
      item.ongoing !== false && !item.endedAt);
    const referenceDate = isoDate(row(report.period).end) ?? isoDate(report.generatedAt);
    const allergies = rows(context.allergies).filter((item) =>
      !/RESOLVED|INACTIVE|CANCELLED/.test(String(item.status ?? '').toUpperCase()) && !item.resolvedAt);

    const start = isoDate(row(report.period).start);
    const end = isoDate(row(report.period).end);
    const eligibleDays = eligibleDayCount(start, end);
    const loggedDays = Array.from(loggingDays).sort();

    return {
      version: 'shadow-v1',
      generatedAt: new Date().toISOString(),
      coverage: {
        sourceCounts,
        observationCandidateCount: observations.length,
        metricCounts,
        unmappedMetricCount: rows(activity.deviceMeasurements).filter((item) => {
          const rawType = item.measurementType ?? item.metricKey ?? row(item.vitalType).name;
          const isBloodPressure = String(rawType ?? '').toUpperCase().includes('BLOOD_PRESSURE') ||
            String(item.metricKey ?? '').toLowerCase().includes('blood_pressure');
          return !isBloodPressure && !normalizeMetric(rawType, item.metricKey);
        }).length + rows(activity.wellnessMetrics).filter((item) => !normalizeMetric(item.metricKey, item.metricKey)).length +
          rows(report.goalMetricEvents).filter((item) => !normalizeMetric(item.metricType, item.metricKey)).length,
        timestampFallbackCount,
        qualityAcceptedCount,
        qualityNeedsReviewCount,
        qualityInvalidCount,
        safetySignalCount,
        qualityFlags: qualityFlags.slice(0, 50),
      },
      loggingConsistency: {
        loggedDays: loggedDays.length,
        eligibleDays,
        percentage: eligibleDays ? Math.round(loggedDays.length / eligibleDays * 100) : 0,
        days: loggedDays,
        policy: 'Counts unique Africa/Johannesburg calendar days with patient-owned check-ins, symptom entries/follow-ups, patient vitals, manual-vital logs, explicit medication actions or patient smoking logs. Excludes updatedAt-only changes, clinician/administrative activity, profile edits and device-only syncs.',
      },
      crossSignals: { sleepStress },
      clinicalContext: {
        ageAtReport: ageAt(person.dateOfBirth, referenceDate),
        gender: stringValue(person.gender),
        conditions: Array.from(new Set(conditionNames)),
        activeMedicationCount: activeMedications.length,
        allergiesOnFile: allergies.length,
        note: 'Context is descriptive in shadow-v1. Condition- and demographic-specific clinical thresholds are not overridden until an approved, versioned clinical policy is configured.',
      },
    };
  }
}
