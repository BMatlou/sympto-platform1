import { Injectable } from '@nestjs/common';
import type { MedicationReportAdherenceSummary } from '../health-goals/medication-insight.service';

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

export interface PersonalisedHealthInsight {
  key: string;
  group: 'CONDITION' | 'GOAL' | 'BASELINE' | 'ALLERGY' | 'TREATMENT' | 'PROFILE' | 'PREVENTIVE_CARE';
  title: string;
  headline: string;
  detail: string;
  status: 'INFO' | 'WATCH' | 'REVIEW';
}

export interface PersonalisedHealthTrend {
  key: string;
  metric: string;
  label: string;
  unit: string;
  direction: 'RISING' | 'FALLING';
  earlierAverage: number;
  laterAverage: number;
  change: number;
  changePercent: number | null;
  daysCompared: number;
  readingCount: number;
  firstDay: string;
  lastDay: string;
  usesFallbackTime: boolean;
  relatedGoals: string[];
  relatedConditions: string[];
  interpretation: string;
}

export interface HealthReportNarrativeFinding {
  key: string;
  priority: 'SAFETY' | 'REVIEW' | 'WATCH' | 'INSIGHT';
  title: string;
  change: string;
  pattern: string;
  personalContext: string;
  whyItMatters: string;
  nextStep: string;
  confidence: 'HIGH' | 'MODERATE' | 'LIMITED';
  evidence: string[];
  sourceRecordIds: string[];
}

export interface HealthReportPeriodComparison {
  key: string;
  metric: string;
  label: string;
  unit: string;
  previousAverage: number;
  currentAverage: number;
  change: number;
  changePercent: number | null;
  previousDays: number;
  currentDays: number;
  previousReadings: number;
  currentReadings: number;
  previousStart: string;
  previousEnd: string;
  currentStart: string;
  currentEnd: string;
  relatedGoals: string[];
  relatedGoalTargets: string[];
  relatedConditions: string[];
  sourceRecordIds: string[];
  interpretation: string;
}

export interface HealthReportIntelligence {
  version: 'shadow-v2';
  findings: HealthReportNarrativeFinding[];
  periodComparisons: HealthReportPeriodComparison[];
  personalisedContext: {
    insights: PersonalisedHealthInsight[];
  };
  withinPeriodTrends: PersonalisedHealthTrend[];
  generatedAt: string;
  medicationAdherence?: MedicationReportAdherenceSummary | null;
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

type TrendDefinition = { metric: string; label: string; unit: string; minimumChange: number; digits: number };

const TREND_DEFINITIONS: TrendDefinition[] = [
  { metric: 'bp.systolic', label: 'Systolic blood pressure', unit: 'mmHg', minimumChange: 3, digits: 0 },
  { metric: 'bp.diastolic', label: 'Diastolic blood pressure', unit: 'mmHg', minimumChange: 3, digits: 0 },
  { metric: 'heart_rate', label: 'Heart rate', unit: 'bpm', minimumChange: 3, digits: 0 },
  { metric: 'oxygen_saturation', label: 'Oxygen saturation', unit: '%', minimumChange: 2, digits: 1 },
  { metric: 'respiratory_rate', label: 'Breathing rate', unit: 'breaths/min', minimumChange: 2, digits: 0 },
  { metric: 'body_temperature', label: 'Body temperature', unit: '°C', minimumChange: 0.3, digits: 1 },
  { metric: 'weight', label: 'Weight', unit: 'kg', minimumChange: 0.5, digits: 1 },
  { metric: 'blood_glucose', label: 'Blood glucose', unit: 'mmol/L', minimumChange: 0.4, digits: 1 },
  { metric: 'lab.hba1c', label: 'HbA1c', unit: '%', minimumChange: 0.2, digits: 1 },
  { metric: 'cholesterol.total', label: 'Total cholesterol', unit: 'mmol/L', minimumChange: 0.3, digits: 1 },
  { metric: 'cholesterol.ldl', label: 'LDL cholesterol', unit: 'mmol/L', minimumChange: 0.3, digits: 1 },
  { metric: 'sleep.duration', label: 'Sleep duration', unit: 'hours', minimumChange: 1, digits: 1 },
  { metric: 'stress.score', label: 'Stress rating', unit: '/10', minimumChange: 1, digits: 1 },
  { metric: 'hydration.volume', label: 'Water intake', unit: 'mL', minimumChange: 250, digits: 0 },
  { metric: 'exercise.duration', label: 'Exercise time', unit: 'minutes', minimumChange: 15, digits: 0 },
  { metric: 'smoking.cigarettes', label: 'Cigarettes logged', unit: 'cigarettes', minimumChange: 2, digits: 0 },
  { metric: 'alcohol.units', label: 'Alcohol logged', unit: 'standard drinks', minimumChange: 1, digits: 1 },
  { metric: 'nutrition.calories', label: 'Calories logged', unit: 'kcal', minimumChange: 150, digits: 0 },
  { metric: 'symptom.pain_score', label: 'Symptom pain score', unit: '/10', minimumChange: 1, digits: 1 },
];

function detectWithinPeriodTrends(observations: HealthObservation[]): Array<Omit<PersonalisedHealthTrend, 'relatedGoals' | 'relatedConditions' | 'interpretation'>> {
  const trends: Array<Omit<PersonalisedHealthTrend, 'relatedGoals' | 'relatedConditions' | 'interpretation'>> = [];
  for (const definition of TREND_DEFINITIONS) {
    const matching = observations.filter((item) =>
      item.metric === definition.metric && item.value !== null && item.observedAt !== null &&
      item.quality.status === 'ACCEPTED' && item.quality.safetySignals.length === 0,
    );
    const observationsByDay = new Map<string, HealthObservation[]>();
    for (const observation of matching) {
      const day = localDay(observation.observedAt);
      if (!day) continue;
      const items = observationsByDay.get(day) ?? [];
      items.push(observation);
      observationsByDay.set(day, items);
    }

    const series: Array<{ day: string; value: number; count: number; hasFallback: boolean }> = [];
    let contributingReadings = 0;
    const sourcePreference: ObservationSourceType[] =
      definition.metric === 'sleep.duration'
        ? ['DAILY_CHECK_IN', 'SLEEP_SESSION', 'WELLNESS_METRIC', 'WEARABLE_DEVICE', 'GOAL_METRIC']
        : definition.metric === 'exercise.duration'
          ? ['DAILY_CHECK_IN', 'GOAL_METRIC', 'WORKOUT_SESSION', 'WELLNESS_METRIC', 'WEARABLE_DEVICE']
          : definition.metric === 'hydration.volume'
            ? ['DAILY_CHECK_IN', 'GOAL_METRIC', 'WELLNESS_METRIC', 'WEARABLE_DEVICE']
            : [];
    for (const [day, dayItems] of observationsByDay.entries()) {
      // Prefer the primary daily source used by the report so check-ins and
      // connected sessions on one day are not averaged together.
      const selectedType = sourcePreference.find((type) => dayItems.some((item) => item.source.type === type));
      const selected = selectedType ? dayItems.filter((item) => item.source.type === selectedType) : dayItems;
      const numeric = selected.flatMap((item) => item.value === null ? [] : [item.value]);
      if (!numeric.length) continue;
      series.push({
        day,
        value: numeric.reduce((sum, value) => sum + value, 0) / numeric.length,
        count: selected.length,
        hasFallback: selected.some((item) => item.observedAtBasis !== 'SOURCE_EVENT_TIME'),
      });
      contributingReadings += selected.length;
    }
    series.sort((a, b) => a.day.localeCompare(b.day));
    if (series.length < 4) continue;
    const midpoint = Math.floor(series.length / 2);
    const earlier = series.slice(0, midpoint);
    const later = series.slice(midpoint);
    if (earlier.length < 2 || later.length < 2) continue;
    const average = (items: typeof series) => items.reduce((sum, item) => sum + item.value, 0) / items.length;
    const earlierAverage = average(earlier);
    const laterAverage = average(later);
    const change = laterAverage - earlierAverage;
    if (Math.abs(change) < definition.minimumChange) continue;
    trends.push({
      key: 'trend:' + definition.metric,
      metric: definition.metric,
      label: definition.label,
      unit: definition.unit,
      direction: change > 0 ? 'RISING' : 'FALLING',
      earlierAverage: Number(earlierAverage.toFixed(definition.digits)),
      laterAverage: Number(laterAverage.toFixed(definition.digits)),
      change: Number(change.toFixed(definition.digits)),
      changePercent: Math.abs(earlierAverage) > 0.000001
        ? Number((change / Math.abs(earlierAverage) * 100).toFixed(1))
        : null,
      daysCompared: series.length,
      readingCount: contributingReadings,
      firstDay: series[0].day,
      lastDay: series[series.length - 1].day,
      usesFallbackTime: series.some((item) => item.hasFallback),
    });
  }
  return trends.sort((a, b) => {
    const left = Math.abs(a.change) / (TREND_DEFINITIONS.find((item) => item.metric === a.metric)?.minimumChange ?? 1);
    const right = Math.abs(b.change) / (TREND_DEFINITIONS.find((item) => item.metric === b.metric)?.minimumChange ?? 1);
    return right - left;
  });
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
      // The existing manual-vitals writer uses updatedAt to store the measuredAt
      // value when it reuses today's single journal row. Only that known source gets
      // this compatibility rule; ordinary journal edits do not become new observations.
      const isManualVitals = /today.s measurements/i.test(title);
      const observedAt = item.observedAt ?? item.recordedAt ??
        (isManualVitals ? item.updatedAt ?? item.createdAt : item.createdAt);
      // HealthJournal has no immutable observedAt column. Even when this known
      // manual-vitals writer puts measuredAt into updatedAt, that field is mutable
      // and may represent the latest update to several measurements; report it only
      // as a fallback until each measurement stores its own event time.
      const basis = item.observedAt || item.recordedAt
        ? 'SOURCE_EVENT_TIME'
        : (isManualVitals && item.updatedAt) || item.createdAt ? 'RECORD_TIME_FALLBACK' : 'UNKNOWN';
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

    // Health Vitals entries are a separate patient-facing source from the
    // dedicated manual-vitals journal. Include them explicitly rather than merely
    // counting them in the report's source ledger.
    for (const item of rows(activity.patientVitals)) {
      const at = item.recordedAt ?? item.createdAt;
      // The report facade currently derives patientVitals.recordedAt from the
      // source row's createdAt, so it is record-time evidence, not a guaranteed
      // clinical measurement time.
      const basis = item.recordedAtBasis === 'SOURCE_EVENT_TIME'
        ? 'SOURCE_EVENT_TIME'
        : at ? 'RECORD_TIME_FALLBACK' : 'UNKNOWN';
      const actor: ObservationActor = String(item.source ?? 'PATIENT').toUpperCase() === 'CLINICAL' ? 'CLINICIAN' : 'PATIENT';
      const fields: Array<[string, unknown, string | null]> = [
        ['bp.systolic', item.bloodPressureSystolic, 'mmHg'],
        ['bp.diastolic', item.bloodPressureDiastolic, 'mmHg'],
        ['heart_rate', item.heartRate, 'bpm'],
        ['weight', item.weightKg, 'kg'],
        ['oxygen_saturation', item.oxygenSaturation, '%'],
        ['body_temperature', item.temperature, '°C'],
        ['respiratory_rate', item.respiratoryRate, 'breaths/min'],
      ];
      for (const [metric, value, unit] of fields) {
        if (numericValue(value) === null) continue;
        add({ metric, value, unit, observedAt: at, capturedAt: item.createdAt,
          sourceType: 'MANUAL_VITAL', sourceId: item.id, metricPath: metric,
          actor, sourceName: 'Health Vitals', observedAtBasis: basis });
      }
    }

    for (const item of rows(activity.deviceMeasurements)) {
      const device = row(item.device);
      const rawType = item.measurementType ?? item.metricKey ?? row(item.vitalType).name;
      const metric = normalizeMetric(rawType, item.metricKey);
      const at = item.measuredAt ?? item.createdAt;
      const common = { observedAt: at, capturedAt: item.receivedAt ?? item.createdAt,
        sourceType: 'WEARABLE_DEVICE' as const, sourceId: item.id, actor: 'DEVICE' as const,
        sourceName: device.model ?? device.manufacturer ?? item.source,
        observedAtBasis: item.measuredAt ? 'SOURCE_EVENT_TIME' as const : item.createdAt ? 'RECORD_TIME_FALLBACK' as const : 'UNKNOWN' as const };
      if (String(rawType ?? '').toUpperCase().includes('BLOOD_PRESSURE') ||
          String(item.metricKey ?? '').toLowerCase().includes('blood_pressure')) {
        add({ ...common, metric: 'bp.systolic', value: item.value, unit: item.unit ?? 'mmHg', metricPath: 'value' });
        if (numericValue(item.secondaryValue) !== null) {
          add({ ...common, metric: 'bp.diastolic', value: item.secondaryValue, unit: item.secondaryUnit ?? item.unit ?? 'mmHg', metricPath: 'secondaryValue' });
        }
      } else if (metric) {
        const unit = item.unit;
        const value = numericValue(item.value);
        // Sleep device records are commonly represented as seconds or minutes; keep
        // device values as provided unless the unit explicitly identifies a conversion.
        add({ ...common, metric, value, unit, metricPath: 'value' });
      }
    }

    for (const item of rows(activity.wellnessMetrics)) {
      const metric = normalizeMetric(item.metricKey, item.metricKey);
      if (!metric || numericValue(item.value) === null) continue;
      const at = item.measuredAt ?? item.createdAt;
      add({ metric, value: item.value, unit: item.unit, observedAt: at,
        capturedAt: item.createdAt, sourceType: 'WELLNESS_METRIC', sourceId: item.id,
        metricPath: 'value', actor: 'DEVICE', sourceName: item.source,
        observedAtBasis: item.measuredAt ? 'SOURCE_EVENT_TIME' : item.createdAt ? 'RECORD_TIME_FALLBACK' : 'UNKNOWN' });
    }

    for (const item of rows(activity.sleepSessions)) {
      if (numericValue(item.durationMinutes) !== null) {
        const at = item.startedAt ?? item.endedAt ?? item.createdAt;
        add({ metric: 'sleep.duration', value: item.durationMinutes, unit: 'minutes', observedAt: at,
          capturedAt: item.createdAt, sourceType: 'SLEEP_SESSION', sourceId: item.id,
          metricPath: 'durationMinutes', actor: 'DEVICE', sourceName: item.source,
          observedAtBasis: item.startedAt || item.endedAt ? 'SOURCE_EVENT_TIME' : item.createdAt ? 'RECORD_TIME_FALLBACK' : 'UNKNOWN' });
      }
    }
    for (const item of rows(activity.workouts)) {
      if (numericValue(item.durationSeconds) !== null) {
        const at = item.startedAt ?? item.endedAt ?? item.createdAt;
        add({ metric: 'exercise.duration', value: item.durationSeconds, unit: 'seconds', observedAt: at,
          capturedAt: item.createdAt, sourceType: 'WORKOUT_SESSION', sourceId: item.id,
          metricPath: 'durationSeconds', actor: item.source ? 'DEVICE' : 'PATIENT', sourceName: item.activityType,
          observedAtBasis: item.startedAt || item.endedAt ? 'SOURCE_EVENT_TIME' : item.createdAt ? 'RECORD_TIME_FALLBACK' : 'UNKNOWN' });
      }
    }

    for (const item of rows(clinical.vitals)) {
      const vitalType = row(item.vitalType);
      const metric = normalizeMetric(vitalType.code ?? vitalType.name, vitalType.code);
      if (!metric || numericValue(item.value) === null) continue;
      add({ metric, value: item.value, unit: vitalType.unit, observedAt: item.measuredAt ?? item.recordedAt ?? item.createdAt,
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
        valueCode: medicationAction ? action : undefined, unit: event.unit,
        observedAt: at, capturedAt: event.createdAt, sourceType: medicationAction ? 'MEDICATION_ACTION' : 'GOAL_METRIC',
        sourceId: event.sourceId, metricPath: event.metricKey, actor: event.source === 'wearable' ? 'DEVICE' : 'PATIENT',
        sourceName: event.source, observedAtBasis: at ? 'SOURCE_EVENT_TIME' : 'UNKNOWN' });
    }

    const seen = new Set<string>();
    return sources.filter((item) => periodIncludes(report, item.observedAt)).filter((item) => {
      // Goal-event projections can mirror their source measurement. Collapse only
      // exact metric/time/value duplicates here; the original records remain in report data.
      const key = [item.metric, item.observedAt, item.value, item.secondaryValue, item.valueCode].join('|');
      if (item.observedAt && seen.has(key)) return false;
      if (item.observedAt) seen.add(key);
      return true;
    });
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
      const isManualVitals = /today.s measurements/i.test(String(journal.title ?? ''));
      addPatientDay(journal.observedAt ?? journal.recordedAt ??
        (isManualVitals ? journal.updatedAt ?? journal.createdAt : journal.createdAt));
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
      // Sleep/stress are daily check-in values; do not treat edits to manual-vital
      // rows as health-check-in evidence.
      if (/today.s measurements/i.test(String(journal.title ?? ''))) continue;
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
    const isInactive = (item: Row) =>
      Boolean(item.resolvedAt) ||
      /RESOLVED|INACTIVE|CANCELLED|DISCONTINUED|STOPPED|ARCHIVED|COMPLETED/.test(String(item.status ?? '').toUpperCase());
    const currentConditionRows = [
      ...rows(context.conditions).filter((item) => !isInactive(item)).map((item) => {
        const relation = row(item.condition);
        return { name: stringValue(relation.name ?? item.name), status: String(item.status ?? relation.status ?? 'ACTIVE') };
      }),
      ...rows(context.diagnoses).filter((item) => !isInactive(item)).map((item) => {
        const relation = row(item.diagnosis);
        return { name: stringValue(relation.name ?? item.name), status: String(item.status ?? relation.status ?? 'ACTIVE') };
      }),
    ].filter((item): item is { name: string; status: string } => Boolean(item.name))
      .filter((item, index, all) => all.findIndex((other) => other.name.toLowerCase() === item.name.toLowerCase()) === index);
    const resolvedConditionRows = [
      ...rows(context.conditions).filter((item) =>
        Boolean(item.resolvedAt) || /RESOLVED/.test(String(item.status ?? row(item.condition).status ?? '').toUpperCase()),
      ).map((item) => {
        const relation = row(item.condition);
        return { name: stringValue(relation.name ?? item.name), status: 'RESOLVED' };
      }),
      ...rows(context.diagnoses).filter((item) =>
        Boolean(item.resolvedAt) || /RESOLVED/.test(String(item.status ?? row(item.diagnosis).status ?? '').toUpperCase()),
      ).map((item) => {
        const relation = row(item.diagnosis);
        return { name: stringValue(relation.name ?? item.name), status: 'RESOLVED' };
      }),
    ].filter((item): item is { name: string; status: string } => Boolean(item.name))
      .filter((item, index, all) =>
        !currentConditionRows.some((active) => active.name.toLowerCase() === item.name.toLowerCase()) &&
        all.findIndex((other) => other.name.toLowerCase() === item.name.toLowerCase()) === index,
      );
    const contextualConditionRows = [...currentConditionRows, ...resolvedConditionRows];
    const conditionNames = currentConditionRows.map((item) => item.name);
    const activeMedications = rows(context.medications).filter((item) =>
      !isInactive(item) && item.ongoing !== false && !item.endedAt);
    const activeGoals = rows(context.activeGoals).filter((item) => !isInactive(item));
    const referenceDate = isoDate(row(report.period).end) ?? isoDate(report.generatedAt);
    const allergies = rows(context.allergies).filter((item) => !isInactive(item));

    const metricLabel: Record<string, string> = {
      'bp.systolic': 'Systolic blood pressure', 'bp.diastolic': 'Diastolic blood pressure',
      heart_rate: 'Heart rate', weight: 'Weight', oxygen_saturation: 'Oxygen saturation',
      respiratory_rate: 'Breathing rate', body_temperature: 'Temperature',
      blood_glucose: 'Blood glucose', 'lab.hba1c': 'HbA1c', 'cholesterol.total': 'Total cholesterol',
      'cholesterol.ldl': 'LDL cholesterol', 'cholesterol.hdl': 'HDL cholesterol',
      'cholesterol.triglycerides': 'Triglycerides', 'sleep.duration': 'Sleep',
      'sleep.quality': 'Sleep quality', 'stress.score': 'Stress', mood: 'Mood',
      'energy.level': 'Energy', 'hydration.volume': 'Water intake',
      'exercise.duration': 'Exercise', 'activity.steps': 'Steps',
      'smoking.cigarettes': 'Cigarettes', 'smoking.frequency': 'Smoking',
      'alcohol.units': 'Alcohol', 'alcohol.frequency': 'Alcohol frequency',
      'medication.dose_action': 'Medication dose actions',
    };
    const metricUnits = (metric: string, items: HealthObservation[]) =>
      items.find((item) => item.unit)?.unit ?? unitFor(metric) ?? '';
    const formatNumber = (value: number, digits = 1) => Number(value.toFixed(digits)).toString();
    const summarizeMetrics = (metrics: string[]) => {
      const matching = observations.filter((item) =>
        metrics.includes(item.metric) && (item.value !== null || item.valueCode !== null));
      const summaries = metrics.map((metric) => {
        const values = matching.filter((item) => item.metric === metric);
        if (!values.length) return null;
        const accepted = values.filter((item) => item.quality.status === 'ACCEPTED');
        const latest = values.slice().sort((a, b) =>
          String(a.observedAt ?? '').localeCompare(String(b.observedAt ?? ''))).at(-1);
        const flagged = values.length - accepted.length;
        const unit = metricUnits(metric, values);
        const latestValue = latest?.value !== null && latest?.value !== undefined
          ? formatNumber(latest.value, metric === 'heart_rate' || metric.startsWith('bp.') || metric === 'respiratory_rate' ? 0 : 1) + (unit ? ' ' + unit : '')
          : latest?.valueCode
            ? String(latest.valueCode).replace(/[_-]+/g, ' ').toLowerCase()
            : '';
        const latestText = latestValue
          ? '; latest ' + latestValue + (latest?.observedAt ? ' on ' + String(latest.observedAt).slice(0, 10) : '')
          : '';
        return (metricLabel[metric] ?? metric) + ': ' + values.length + ' dated value(s)' + latestText +
          (flagged ? '; ' + flagged + ' require verification and are not treated as reliable trend evidence' : '');
      }).filter((item): item is string => Boolean(item));
      return { matching, summaries, accepted: matching.filter((item) => item.quality.status === 'ACCEPTED') };
    };

    const personalisedInsights: PersonalisedHealthInsight[] = [];
    for (const condition of currentConditionRows.slice(0, 6)) {
      const name = condition.name;
      const token = name.toLowerCase();
      let metrics: string[] = [];
      if (/diabet|prediabet/.test(token)) metrics = ['blood_glucose', 'lab.hba1c'];
      else if (/hypertension|high blood pressure/.test(token)) metrics = ['bp.systolic', 'bp.diastolic'];
      else if (/asthma|copd|chronic obstructive|respiratory condition/.test(token)) metrics = ['oxygen_saturation', 'respiratory_rate'];
      else if (/cardiovascular|heart failure|coronary|ischaemic heart|ischemic heart/.test(token)) metrics = ['bp.systolic', 'bp.diastolic', 'heart_rate'];
      const summary = summarizeMetrics(metrics);
      const relatedSymptomCount = rows(activity.symptoms).filter((item) => {
        const text = [item.title, item.description, ...rows(item.symptoms).map((entry) =>
          stringValue(row(entry.symptom).name ?? entry.name))].filter(Boolean).join(' ').toLowerCase();
        if (/respiratory condition|asthma|copd|chronic obstructive/.test(token)) return /breath|wheez|cough|chest|respirat|asthma/.test(text);
        if (/diabet|prediabet/.test(token)) return /thirst|urination|blurred vision|blood sugar|glucose/.test(text);
        if (/hypertension|high blood pressure/.test(token)) return /blood pressure|headache|dizz|vision/.test(text);
        return text.includes(token);
      }).length;
      const hasDirectMetricRule = metrics.length > 0;
      const reviewCount = summary.matching.filter((item) => item.quality.status !== 'ACCEPTED' || item.quality.safetySignals.length > 0).length;
      personalisedInsights.push({
        key: 'condition:' + token.replace(/[^a-z0-9]+/g, '-'),
        group: 'CONDITION',
        title: name + ' · period context',
        headline: summary.summaries.length
          ? summary.summaries.join(' · ')
          : relatedSymptomCount
            ? relatedSymptomCount + ' potentially related symptom log(s) in this period'
            : 'No directly linked measurements identified in this period',
        detail: hasDirectMetricRule
          ? summary.summaries.length
            ? 'These period records are shown in the context of your saved condition. ' +
              (reviewCount ? reviewCount + ' reading(s) need verification before interpreting a trend. ' : '') +
              'Compare readings and any laboratory results with your personal care plan and clinician-set targets; this summary does not diagnose or infer control.'
            : 'No blood glucose/HbA1c, blood-pressure, or respiratory measurements mapped to this condition were returned for this period. Missing measurements do not mean the condition is stable.'
          : relatedSymptomCount
            ? 'The symptom wording overlaps with your saved condition. This is a record association for review, not proof that the condition caused the symptoms.'
            : 'This condition is saved in your health context, but current report intelligence has no specific measurement mapping for it. No conclusion about condition activity is inferred from missing data.',
        status: summary.matching.some((item) => item.quality.status !== 'ACCEPTED' || item.quality.safetySignals.length > 0) ? 'REVIEW' : 'INFO',
      });
    }

    const goalMetricMap: Record<string, string[]> = {
      WEIGHT: ['weight'], BODY_WEIGHT: ['weight'],
      BLOOD_PRESSURE: ['bp.systolic', 'bp.diastolic'], BP: ['bp.systolic', 'bp.diastolic'],
      HEART_RATE: ['heart_rate'], RESTING_HEART_RATE: ['heart_rate'],
      BLOOD_GLUCOSE: ['blood_glucose', 'lab.hba1c'], GLUCOSE: ['blood_glucose', 'lab.hba1c'],
      CHOLESTEROL: ['cholesterol.total', 'cholesterol.ldl', 'cholesterol.hdl', 'cholesterol.triglycerides'],
      EXERCISE: ['exercise.duration', 'activity.steps'], PHYSICAL_ACTIVITY: ['exercise.duration', 'activity.steps'],
      HYDRATION: ['hydration.volume'], WATER: ['hydration.volume'],
      SLEEP: ['sleep.duration', 'sleep.quality'], MENTAL_HEALTH: ['stress.score', 'mood', 'energy.level'],
      STRESS: ['stress.score'], MOOD: ['mood'],
      SMOKING: ['smoking.cigarettes', 'smoking.frequency'], ALCOHOL: ['alcohol.units', 'alcohol.frequency'],
      NUTRITION: ['nutrition.calories', 'nutrition.protein', 'nutrition.carbohydrates', 'nutrition.fat', 'nutrition.intake'],
      MEDICATION: ['medication.dose_action'],
    };
    const eventRows = rows(report.goalMetricEvents);
    const progressRows = rows(tracking.goalProgress);
    const activeGoalSummaries: Array<PersonalisedHealthInsight & { hasData: boolean; hasExplicitLinks: boolean; hasCategoricalEvidence: boolean }> = activeGoals.map((goal, index) => {
      const id = stringValue(goal.id);
      const category = String(goal.category ?? '').toUpperCase().replace(/[\s-]+/g, '_');
      const metrics = goalMetricMap[category] ?? [];
      const directEvents = eventRows.filter((event) =>
        (id && String(event.goalId ?? '') === id) ||
        rows(event.goalAssociations).some((association) => id && String(association.goalId ?? '') === id));
      const goalProgress = progressRows.filter((item) => {
        const record = row(item);
        return id && String(row(record.healthGoal).id ?? record.healthGoalId ?? record.goalId ?? '') === id;
      });
      const metricSummary = summarizeMetrics(metrics);
      const evidenceCount = metricSummary.matching.length;
      const target = numericValue(goal.targetValue);
      const targetText = target === null ? '' : ' Saved goal target: ' + formatNumber(target, Number.isInteger(target) ? 0 : 1) +
        (stringValue(goal.unit) ? ' ' + stringValue(goal.unit) : '') + '.';
      const summaryText = metricSummary.summaries.length ? metricSummary.summaries.join(' · ') : '';
      const linkedCount = directEvents.length + goalProgress.length;
      const hasExplicitLinks = linkedCount > 0;
      const hasCategoricalEvidence = metricSummary.matching.some((item) => item.valueCode !== null);
      const hasData = evidenceCount > 0 || hasExplicitLinks;
      return {
        key: 'goal:' + (id ?? String(index)),
        group: 'GOAL',
        title: stringValue(goal.title) ?? (category ? category.replace(/_/g, ' ') : 'Saved health goal'),
        headline: summaryText || (linkedCount
          ? linkedCount + ' explicitly linked tracker/progress record(s) in this period'
          : 'No directly matched measurement or linked tracker entry in this period'),
        detail: (targetText ? targetText + ' ' : '') +
          (hasData
            ? 'Period measurements are matched to this goal by category as well as explicit goal links. A measurement is not automatically counted as goal completion unless the goal tracker records it.'
            : 'No matching period evidence was returned. Missing evidence is unknown, not zero progress.'),
        status: metricSummary.matching.some((item) => item.quality.status !== 'ACCEPTED' || item.quality.safetySignals.length > 0) ? 'REVIEW' : 'INFO',
        hasData,
        hasExplicitLinks,
        hasCategoricalEvidence,
      };
    });
    if (activeGoalSummaries.length) {
      const goalsWithEvidence = activeGoalSummaries.filter((item) => item.hasData);
      const goalsWithoutEvidence = activeGoalSummaries.filter((item) => !item.hasData);
      personalisedInsights.push({
        key: 'goals:period-summary',
        group: 'GOAL',
        title: 'Progress against your saved goals',
        headline: goalsWithEvidence.length + ' of ' + activeGoalSummaries.length + ' active goals have relevant period evidence',
        detail: (goalsWithEvidence.length ? 'Relevant readings or explicitly linked tracker entries were found for ' +
          goalsWithEvidence.length + ' goal(s). ' : 'No matching period evidence was found for the active goals. ') +
          (goalsWithoutEvidence.length
            ? goalsWithoutEvidence.length + ' goal(s) have no direct evidence in this period. Missing evidence is not zero progress; measurements are supporting context, not automatic goal completion.'
            : 'The matching records provide context, not automatic proof of goal completion.'),
        status: 'INFO',
      });
      // Category-matched measurements are surfaced in trend/measurement analysis;
      // this section only expands goals that have explicitly linked tracker events or progress.
      personalisedInsights.push(...goalsWithEvidence.filter((item) => item.hasExplicitLinks || item.hasCategoricalEvidence).slice(0, 5).map((item) => ({
        key: item.key,
        group: item.group,
        title: item.title,
        headline: item.headline,
        detail: item.detail,
        status: item.status,
      })));
    }

    // Surface allergy and medication context only when a dated symptom/side-effect
    // record actually references a saved allergen or medicine label. A name match
    // is a review prompt, never a claim of causation or an interaction check.
    const symptomRows = rows(activity.symptoms);
    const symptomText = (symptom: Row) => [
      symptom.title, symptom.description, symptom.notes, symptom.suspectedTrigger,
      symptom.aggravatingFactors, symptom.relievingFactors,
      ...rows(symptom.triggers).flatMap((trigger) => [
        trigger.trigger, trigger.name, trigger.description, trigger.type,
      ]),
      ...rows(symptom.medicationEffects).flatMap((effect) => [
        effect.reportedMedicationName, row(effect.medication).name,
        row(effect.medication).genericName, effect.sideEffects,
      ]),
    ].map((value) => stringValue(value) ?? '').join(' ').toLowerCase();
    const containsSavedLabel = (text: string, label: string) => {
      const normalizedText = ' ' + text.replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
      const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      return normalizedLabel.length >= 3 && normalizedText.includes(' ' + normalizedLabel + ' ');
    };

    const activeAllergenNames = allergies.map((item) =>
      stringValue(row(item.allergy).name ?? item.name ?? item.allergenName),
    ).filter((name): name is string => typeof name === 'string' && name.length >= 3);
    for (const allergen of activeAllergenNames) {
      const matchedSymptoms = symptomRows.filter((symptom) => containsSavedLabel(symptomText(symptom), allergen));
      if (!matchedSymptoms.length) continue;
      personalisedInsights.push({
        key: 'allergy:' + allergen.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        group: 'ALLERGY',
        title: 'Saved allergy mentioned in symptom records',
        headline: '“' + allergen + '” appears in ' + matchedSymptoms.length + ' dated symptom record(s)',
        detail: 'The wording overlaps with an allergen saved in your health record. This is a possible record connection, not proof of exposure or cause. A text match does not assess allergy severity or medication interactions.',
        status: 'WATCH',
      });
    }

    const savedMedicationNames = activeMedications.flatMap((item) => [
      stringValue(row(item.medication).name),
      stringValue(row(item.medication).genericName),
      stringValue(row(item.medication).brandName),
    ].filter((name): name is string => Boolean(name) && name.length >= 3));
    const medicationEffectMatches = savedMedicationNames.map((name) => ({
      name,
      symptoms: symptomRows.filter((symptom) =>
        rows(symptom.medicationEffects).some((effect) => {
          const effectName = stringValue(effect.reportedMedicationName ??
            row(effect.medication).name ?? row(effect.medication).genericName);
          return Boolean(effectName && effectName.toLowerCase() === name.toLowerCase() &&
            (stringValue(effect.sideEffects) || effect.improved !== undefined || effect.effectiveness !== undefined));
        }),
      ),
    })).filter((item) => item.symptoms.length > 0)
      .filter((item, index, all) => all.findIndex((other) =>
        other.name.toLowerCase() === item.name.toLowerCase()) === index);
    for (const medication of medicationEffectMatches) {
      personalisedInsights.push({
        key: 'treatment-effect:' + medication.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        group: 'TREATMENT',
        title: 'Saved medicine appears in reported effects',
        headline: medication.name + ' is referenced in ' + medication.symptoms.length + ' symptom record(s)',
        detail: 'These are patient-recorded medication-effect notes. They do not establish that the medicine caused the symptom. Discuss persistent side effects or concerns with the prescriber or pharmacist; do not change a prescription based only on this report.',
        status: 'WATCH',
      });
    }

    const profile = row(context.profile);
    const profileSignals: Array<{ field: string; label: string; metrics: string[]; activityLabel: string }> = [
      { field: 'smokingStatus', label: 'Usual smoking pattern', metrics: ['smoking.cigarettes', 'smoking.frequency'], activityLabel: 'smoking' },
      { field: 'alcoholConsumption', label: 'Usual alcohol pattern', metrics: ['alcohol.units', 'alcohol.frequency'], activityLabel: 'alcohol' },
      { field: 'exerciseFrequency', label: 'Usual exercise pattern', metrics: ['exercise.duration', 'activity.steps'], activityLabel: 'exercise' },
    ];
    for (const signal of profileSignals) {
      const savedValue = stringValue(profile[signal.field]);
      if (!savedValue) continue;
      const summary = summarizeMetrics(signal.metrics);
      if (!summary.matching.length) continue;
      const hasPositiveEvidence = summary.accepted.some((item) => (item.value ?? 0) > 0);
      const profileSaysNone = /(^|\b)(none|never|no|non[- ]?smoker|not active)(\b|$)/i.test(savedValue);
      const mayHaveChanged = profileSaysNone && hasPositiveEvidence;
      personalisedInsights.push({
        key: 'profile:' + signal.field,
        group: 'PROFILE',
        title: signal.label,
        headline: 'Saved profile: ' + savedValue + ' · ' + summary.summaries.join(' · '),
        detail: mayHaveChanged
          ? 'Your saved profile describes ' + signal.activityLabel + ' as absent, while dated logs contain a recorded value. This may reflect a change or an older profile answer; review the difference rather than treating either source as proof of a usual pattern.'
          : 'The profile describes your usual pattern, while the dated values describe activity recorded during this report period. The profile may pre-date these entries and is not substituted for the period data.',
        status: mayHaveChanged ? 'WATCH' : 'INFO',
      });
    }

    const reportReference = isoDate(report.generatedAt) ?? referenceDate;
    const reportReferenceTime = reportReference ? new Date(reportReference).getTime() : Number.NaN;
    const immunisationFollowUps = rows(context.immunizations).flatMap((item) => {
      const status = String(item.status ?? '').toUpperCase();
      const dueDate = isoDate(item.nextDueDate);
      const dueTime = dueDate ? new Date(dueDate).getTime() : Number.NaN;
      const datePassed = Number.isFinite(reportReferenceTime) && Number.isFinite(dueTime) && dueTime <= reportReferenceTime;
      const explicitlyMissed = status === 'MISSED';
      const pastFollowUpDate = datePassed && ['SCHEDULED', 'COMPLETED'].includes(status);
      if (!explicitlyMissed && !pastFollowUpDate) return [];
      const vaccineName = stringValue(row(item.immunization).name ?? item.name) ?? 'Immunisation';
      return [{
        name: vaccineName,
        status,
        dueDate,
        explicitlyMissed,
      }];
    });
    if (immunisationFollowUps.length) {
      const followUpNames = immunisationFollowUps.slice(0, 4).map((item) =>
        item.name + (item.explicitlyMissed ? ' (marked missed)' : item.dueDate ? ' (next due ' + item.dueDate.slice(0, 10) + ')' : ''),
      );
      personalisedInsights.push({
        key: 'preventive-care:immunisation-follow-up',
        group: 'PREVENTIVE_CARE',
        title: 'Immunisation follow-up in your saved record',
        headline: immunisationFollowUps.length + ' saved immunisation record(s) are marked missed or have a past next-due date',
        detail: followUpNames.join(' · ') + (immunisationFollowUps.length > followUpNames.length ? ' · +' + (immunisationFollowUps.length - followUpNames.length) + ' more' : '') +
          '. This is based on saved status and dates, not an assessment of protection or whether another dose is needed. Confirm the record and next step with your clinic.',
        status: 'REVIEW',
      });
    }

    const baseline = row(context.baseline);
    const baselineFields: Array<{ key: string; metric: string; label: string; field: string; unit: string }> = [
      { key: 'weight', metric: 'weight', label: 'Weight', field: 'weightKg', unit: 'kg' },
      { key: 'systolic', metric: 'bp.systolic', label: 'Systolic blood pressure', field: 'systolicPressure', unit: 'mmHg' },
      { key: 'diastolic', metric: 'bp.diastolic', label: 'Diastolic blood pressure', field: 'diastolicPressure', unit: 'mmHg' },
      { key: 'heart-rate', metric: 'heart_rate', label: 'Resting heart rate', field: 'restingHeartRate', unit: 'bpm' },
      { key: 'oxygen', metric: 'oxygen_saturation', label: 'Oxygen saturation', field: 'oxygenSaturation', unit: '%' },
      { key: 'temperature', metric: 'body_temperature', label: 'Temperature', field: 'bodyTemperature', unit: '°C' },
      { key: 'respiratory', metric: 'respiratory_rate', label: 'Breathing rate', field: 'respiratoryRate', unit: 'breaths/min' },
      { key: 'glucose', metric: 'blood_glucose', label: 'Blood glucose', field: 'bloodGlucose', unit: 'mmol/L' },
      { key: 'cholesterol', metric: 'cholesterol.total', label: 'Total cholesterol', field: 'cholesterol', unit: 'mmol/L' },
    ];
    for (const field of baselineFields) {
      const baselineValue = numericValue(baseline[field.field]);
      if (baselineValue === null) continue;
      const values = observations.filter((item) => item.metric === field.metric && item.value !== null);
      if (!values.length) continue;
      const acceptedValues = values.filter((item) => item.quality.status === 'ACCEPTED');
      const comparisonValues = acceptedValues.length ? acceptedValues : [];
      const latest = values.slice().sort((a, b) => String(a.observedAt ?? '').localeCompare(String(b.observedAt ?? ''))).at(-1);
      if (!comparisonValues.length) {
        personalisedInsights.push({
          key: 'baseline:' + field.key,
          group: 'BASELINE',
          title: field.label + ' · saved baseline',
          headline: latest ? 'Period reading(s) require verification before comparison' : 'No usable period value',
          detail: 'Saved baseline: ' + formatNumber(baselineValue, 1) + ' ' + field.unit + '. Flagged readings are not used to calculate a baseline difference.',
          status: 'REVIEW',
        });
        continue;
      }
      const average = comparisonValues.reduce((sum, item) => sum + (item.value ?? 0), 0) / comparisonValues.length;
      const change = average - baselineValue;
      personalisedInsights.push({
        key: 'baseline:' + field.key,
        group: 'BASELINE',
        title: field.label + ' · compared with your baseline',
        headline: 'Period average ' + formatNumber(average, 1) + ' ' + field.unit + ' · saved baseline ' + formatNumber(baselineValue, 1) + ' ' + field.unit,
        detail: 'Difference from saved baseline: ' + (change > 0 ? '+' : '') + formatNumber(change, 1) + ' ' + field.unit +
          '. This describes change from your recorded starting point, not whether the value is clinically safe or unsafe.',
        status: values.some((item) => item.quality.status !== 'ACCEPTED' || item.quality.safetySignals.length > 0) ? 'REVIEW' : 'INFO',
      });
    }

    const conditionMetricRules: Array<{ pattern: RegExp; metrics: string[] }> = [
      { pattern: /diabet|prediabet/i, metrics: ['blood_glucose', 'lab.hba1c'] },
      { pattern: /hypertension|high blood pressure/i, metrics: ['bp.systolic', 'bp.diastolic'] },
      { pattern: /asthma|copd|chronic obstructive|respiratory condition/i, metrics: ['oxygen_saturation', 'respiratory_rate'] },
      { pattern: /cardiovascular|heart failure|coronary|ischaemic heart|ischemic heart/i, metrics: ['bp.systolic', 'bp.diastolic', 'heart_rate'] },
    ];
    const withinPeriodTrends: PersonalisedHealthTrend[] = detectWithinPeriodTrends(observations).map((trend) => {
      const relatedGoals = activeGoals.filter((goal) => {
        const category = String(goal.category ?? '').toUpperCase().replace(/[\s-]+/g, '_');
        return (goalMetricMap[category] ?? []).includes(trend.metric);
      }).map((goal) => stringValue(goal.title)).filter((title): title is string => Boolean(title));
      const relatedConditions = contextualConditionRows.filter((condition) =>
        conditionMetricRules.some((rule) => rule.pattern.test(condition.name) && rule.metrics.includes(trend.metric)),
      ).map((condition) => condition.status === 'RESOLVED'
        ? condition.name + ' (recorded as resolved)' : condition.name);
      const formatValue = (value: number) => formatNumber(value, TREND_DEFINITIONS.find((item) => item.metric === trend.metric)?.digits ?? 1);
      const deltaText = (trend.change > 0 ? '+' : '') + formatValue(trend.change) + ' ' + trend.unit;
      const contextLines: string[] = [];
      if (relatedConditions.length) {
        contextLines.push('Relevant to your saved condition' + (relatedConditions.length > 1 ? 's' : '') + ': ' + relatedConditions.join(', ') + '. Compare this pattern with your clinician-set targets and care plan.');
      }
      if (relatedGoals.length) {
        contextLines.push('Related saved goal' + (relatedGoals.length > 1 ? 's' : '') + ': ' + relatedGoals.join(', ') + '. The direction of change does not by itself establish goal success or failure.');
      }
      if (!contextLines.length) {
        contextLines.push('The direction alone does not mean improvement or deterioration. Interpret it against your own target, symptoms and relevant clinical advice.');
      }
      if (trend.usesFallbackTime) {
        contextLines.push('At least one contributing reading uses record-time fallback rather than a dedicated measurement timestamp, so timing may be approximate.');
      }
      return {
        ...trend,
        interpretation: contextLines.join(' '),
        relatedGoals,
        relatedConditions,
      };
    });

    const periodStart = isoDate(row(report.period).start);
    const longitudinal = row(report.longitudinal);
    const priorPeriod = row(longitudinal.period);
    const hasPriorWindow = Boolean(isoDate(priorPeriod.start) && isoDate(priorPeriod.end));
    const priorReport = hasPriorWindow ? {
      ...report,
      period: { start: priorPeriod.start, end: priorPeriod.end },
      activity: row(longitudinal.activity),
      clinical: row(longitudinal.clinical),
      goalMetricEvents: rows(longitudinal.goalMetricEvents),
    } : null;
    const priorObservations = priorReport ? this.normalize(priorReport, patientId) : [];
    const longTermStart = isoDate(longitudinal.historyStart);
    const longTermReport = longTermStart && periodStart ? {
      ...report,
      period: { start: longTermStart, end: periodStart },
      activity: row(longitudinal.activity),
      clinical: row(longitudinal.clinical),
      goalMetricEvents: rows(longitudinal.goalMetricEvents),
    } : null;
    const longTermObservations = longTermReport ? this.normalize(longTermReport, patientId) : [];
    const meanOf = (values: number[]) => values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
    const dailyMetricValues = (source: HealthObservation[], metric: string) => {
      const daily = new Map<string, HealthObservation[]>();
      for (const item of source) {
        if (item.metric !== metric || item.value === null || !item.observedAt ||
            item.quality.status !== 'ACCEPTED' || item.quality.safetySignals.length) continue;
        const day = localDay(item.observedAt);
        if (!day) continue;
        const values = daily.get(day) ?? [];
        values.push(item);
        daily.set(day, values);
      }
      // Prefer one source family per day for cumulative metrics so a check-in and
      // its mirrored wearable or goal event are not treated as independent evidence.
      const sourcePreference: Record<string, ObservationSourceType[]> = {
        'sleep.duration': ['DAILY_CHECK_IN', 'SLEEP_SESSION', 'WELLNESS_METRIC', 'WEARABLE_DEVICE', 'GOAL_METRIC'],
        'exercise.duration': ['DAILY_CHECK_IN', 'GOAL_METRIC', 'WORKOUT_SESSION', 'WELLNESS_METRIC', 'WEARABLE_DEVICE'],
        'hydration.volume': ['DAILY_CHECK_IN', 'GOAL_METRIC', 'WELLNESS_METRIC', 'WEARABLE_DEVICE'],
      };
      return Array.from(daily.entries()).flatMap(([day, items]) => {
        const preferred = sourcePreference[metric]?.find((type) => items.some((item) => item.source.type === type));
        const selected = preferred ? items.filter((item) => item.source.type === preferred) : items;
        const average = meanOf(selected.flatMap((item) => item.value === null ? [] : [item.value]));
        return average === null ? [] : [{ day, value: average }];
      }).sort((a, b) => a.day.localeCompare(b.day));
    };
    const periodComparisons: HealthReportPeriodComparison[] = [];
    const activeGoalRows = rows(snapshot.activeGoals).filter((goal) =>
      !Boolean(goal.resolvedAt) && !/RESOLVED|INACTIVE|CANCELLED|DISCONTINUED|STOPPED|ARCHIVED|COMPLETED/.test(String(goal.status ?? '').toUpperCase()),
    );
    for (const definition of TREND_DEFINITIONS) {
      const before = dailyMetricValues(priorObservations, definition.metric);
      const current = dailyMetricValues(observations, definition.metric);
      if (before.length < 2 || current.length < 2) continue;
      const previousAverage = meanOf(before.map((item) => item.value));
      const currentAverage = meanOf(current.map((item) => item.value));
      if (previousAverage === null || currentAverage === null) continue;
      const change = currentAverage - previousAverage;
      if (Math.abs(change) < definition.minimumChange) continue;
      const metricMap: Record<string, string[]> = {
        WEIGHT: ['weight'], BODY_WEIGHT: ['weight'],
        BLOOD_PRESSURE: ['bp.systolic', 'bp.diastolic'], BP: ['bp.systolic', 'bp.diastolic'],
        HEART_RATE: ['heart_rate'], RESTING_HEART_RATE: ['heart_rate'],
        BLOOD_GLUCOSE: ['blood_glucose', 'lab.hba1c'], GLUCOSE: ['blood_glucose', 'lab.hba1c'],
        CHOLESTEROL: ['cholesterol.total', 'cholesterol.ldl', 'cholesterol.hdl', 'cholesterol.triglycerides'],
        EXERCISE: ['exercise.duration', 'activity.steps'], PHYSICAL_ACTIVITY: ['exercise.duration', 'activity.steps'],
        HYDRATION: ['hydration.volume'], WATER: ['hydration.volume'],
        SLEEP: ['sleep.duration', 'sleep.quality'], MENTAL_HEALTH: ['stress.score', 'mood', 'energy.level'],
        STRESS: ['stress.score'], MOOD: ['mood'],
        SMOKING: ['smoking.cigarettes', 'smoking.frequency'], ALCOHOL: ['alcohol.units', 'alcohol.frequency'],
        MEDICATION: ['medication.dose_action'],
      };
      const matchingGoalRows = activeGoalRows.filter((goal) => {
        const category = String(goal.category ?? '').toUpperCase().replace(/[\s-]+/g, '_');
        return (metricMap[category] ?? []).includes(definition.metric);
      });
      const relatedGoals = matchingGoalRows.map((goal) => stringValue(goal.title)).filter((title): title is string => Boolean(title));
      const relatedGoalTargets = matchingGoalRows.flatMap((goal) => {
        const title = stringValue(goal.title);
        const target = numericValue(goal.targetValue);
        if (!title || target === null) return [];
        const savedUnit = stringValue(goal.unit);
        const targetText = formatNumber(target, Number.isInteger(target) ? 0 : 1) + (savedUnit ? ' ' + savedUnit : '');
        if (!savedUnit) {
          return [title + ': saved target ' + targetText + '; the goal does not record a unit, so a numerical difference was not calculated.'];
        }
        const comparableUnit = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
        if (comparableUnit(savedUnit) !== comparableUnit(definition.unit)) {
          return [title + ': saved target ' + targetText + '; observed unit is ' + definition.unit + ', so a numerical difference was not calculated because the units do not match.'];
        }
        const digits = definition.digits;
        const formatDelta = (value: number) => formatNumber(Math.abs(value), digits) + ' ' + definition.unit + (value > 0 ? ' above' : value < 0 ? ' below' : ' equal to') + ' the saved target value';
        const currentDelta = currentAverage - target;
        const previousDelta = previousAverage - target;
        return [title + ': saved target ' + targetText + '; current average ' +
          formatNumber(currentAverage, digits) + ' ' + definition.unit + ' is ' + formatDelta(currentDelta) +
          '; previous-period average ' + formatNumber(previousAverage, digits) + ' ' + definition.unit +
          ' was ' + formatDelta(previousDelta) + '. This is a numeric comparison only, not a pass/fail judgement.'];
      });
      const relatedConditions = contextualConditionRows.filter((condition) =>
        conditionMetricRules.some((rule) => rule.pattern.test(condition.name) && rule.metrics.includes(definition.metric)),
      ).map((condition) => condition.status === 'RESOLVED'
        ? condition.name + ' (recorded as resolved)' : condition.name);
      const digits = definition.digits;
      periodComparisons.push({
        key: 'period:' + definition.metric,
        metric: definition.metric,
        label: definition.label,
        unit: definition.unit,
        previousAverage: Number(previousAverage.toFixed(digits + 2)),
        currentAverage: Number(currentAverage.toFixed(digits + 2)),
        change: Number(change.toFixed(digits + 2)),
        changePercent: previousAverage !== 0 ? Number((change / Math.abs(previousAverage) * 100).toFixed(1)) : null,
        previousDays: before.length,
        currentDays: current.length,
        previousReadings: priorObservations.filter((item) => item.metric === definition.metric &&
          item.value !== null && item.quality.status === 'ACCEPTED' && item.quality.safetySignals.length === 0).length,
        currentReadings: observations.filter((item) => item.metric === definition.metric &&
          item.value !== null && item.quality.status === 'ACCEPTED' && item.quality.safetySignals.length === 0).length,
        previousStart: before[0].day,
        previousEnd: before[before.length - 1].day,
        currentStart: current[0].day,
        currentEnd: current[current.length - 1].day,
        relatedGoals,
        relatedGoalTargets,
        relatedConditions,
        sourceRecordIds: Array.from(new Set([
          ...priorObservations.filter((item) => item.metric === definition.metric && item.value !== null &&
            item.quality.status === 'ACCEPTED' && item.quality.safetySignals.length === 0)
            .map((item) => item.source.recordId),
          ...observations.filter((item) => item.metric === definition.metric && item.value !== null &&
            item.quality.status === 'ACCEPTED' && item.quality.safetySignals.length === 0)
            .map((item) => item.source.recordId),
        ].filter((id): id is string => Boolean(id)))).slice(0, 20),
        interpretation: (relatedConditions.length
          ? 'Relevant to your saved condition' + (relatedConditions.length > 1 ? 's' : '') + ': ' + relatedConditions.join(', ') + '. '
          : '') +
          (relatedGoals.length
            ? 'Related saved goal' + (relatedGoals.length > 1 ? 's' : '') + ': ' + relatedGoals.join(', ') + '. '
            : '') +
          (relatedGoalTargets.length
            ? 'Saved numeric target(s) for reference: ' + relatedGoalTargets.join('; ') + '. The goal record does not supply a universal pass/fail rule for this measure, so the target is shown for context rather than assigning success or failure. '
            : '') +
          'This comparison uses accepted dated readings and daily averages across matched reporting windows. A rise or fall is not automatically better or worse; compare it with your saved target, baseline, symptoms and care plan.',
      });
    }

    const findings: HealthReportNarrativeFinding[] = [];
    const addFinding = (finding: HealthReportNarrativeFinding) => {
      if (findings.some((item) => item.key === finding.key)) return;
      findings.push(finding);
    };
    const formatObservation = (item: HealthObservation) =>
      (item.value === null ? (item.valueCode ?? 'Categorical entry') : formatNumber(item.value, 1) + (item.unit ? ' ' + item.unit : '')) +
      (item.observedAt ? ' on ' + (localDay(item.observedAt) ?? item.observedAt.slice(0, 10)) : ' (date unavailable)');
    const confidenceFor = (items: HealthObservation[]): 'HIGH' | 'MODERATE' | 'LIMITED' =>
      items.some((item) => item.observedAtBasis !== 'SOURCE_EVENT_TIME') ? 'MODERATE' : 'HIGH';

    // Match only an explicitly saved medication indication to a saved condition label.
    // Unmatched/free-text indications are not guessed from a drug name.
    for (const medication of activeMedications) {
      const medicineName = stringValue(row(medication.medication).name ?? medication.name);
      const indication = stringValue(medication.indication);
      if (!medicineName || !indication) continue;
      const matchingConditions = currentConditionRows.filter((condition) =>
        containsSavedLabel(indication, condition.name),
      );
      if (!matchingConditions.length) continue;
      addFinding({
        key: 'medication-indication:' + String(medication.id ?? medicineName).toLowerCase(),
        priority: 'INSIGHT',
        title: 'A saved medication indication matches your health context',
        change: medicineName + ' has a saved indication that mentions ' + matchingConditions.map((item) => item.name).join(', ') + '.',
        pattern: 'The indication text saved with this medication explicitly overlaps with the label of an active condition or diagnosis.',
        personalContext: 'Medicine: ' + medicineName + '. Saved indication: ' + indication + '. Matching saved condition(s): ' + matchingConditions.map((item) => item.name).join(', ') + '.',
        whyItMatters: 'The indication helps contextualise the treatment record, but saved text may be incomplete or outdated and is not independent proof of the current clinical indication.',
        nextStep: 'Confirm the medicine, indication and instructions against your current prescription or care plan. Do not change treatment based on this text match.',
        confidence: 'MODERATE',
        evidence: ['Saved medicine indication: ' + indication, 'Matching saved condition(s): ' + matchingConditions.map((item) => item.name).join(', ')],
        sourceRecordIds: [stringValue(medication.id)].filter((id): id is string => Boolean(id)),
      });
    }

    // Elevate explicit allergy/medicine-to-symptom text matches into the health story.
    // These are contextual review signals only, never causal conclusions.
    for (const allergen of activeAllergenNames) {
      const matched = symptomRows.filter((symptom) => containsSavedLabel(symptomText(symptom), allergen));
      if (!matched.length) continue;
      const evidence = matched.slice(0, 4).map((symptom) => {
        const at = isoDate(symptom.startedAt ?? symptom.createdAt);
        return (stringValue(symptom.title) ?? 'Symptom record') +
          (at ? ' (' + (localDay(at) ?? at.slice(0, 10)) + ')' : '') +
          ' — wording overlaps with saved allergy: ' + allergen;
      });
      addFinding({
        key: 'allergy-context:' + allergen.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        priority: 'WATCH',
        title: 'A saved allergy is mentioned in symptom records',
        change: allergen + ' appears in ' + matched.length + ' dated symptom record(s).',
        pattern: 'Saved allergen wording was matched against the symptom description, trigger and reported-effect text.',
        personalContext: 'The allergy is present in your saved health record. The matched text does not confirm exposure, the severity of a reaction or a medication interaction.',
        whyItMatters: 'An allergy mention is worth checking in context, but a text match alone cannot verify an allergic reaction or its cause.',
        nextStep: 'Confirm the details and timing of any suspected reaction with your clinician. Seek urgent help for severe or rapidly worsening allergic symptoms.',
        confidence: 'LIMITED',
        evidence,
        sourceRecordIds: matched.slice(0, 4).map((symptom) => stringValue(symptom.id)).filter((id): id is string => Boolean(id)),
      });
    }

    for (const medication of medicationEffectMatches) {
      const evidence = medication.symptoms.slice(0, 4).flatMap((symptom) => {
        const at = isoDate(symptom.startedAt ?? symptom.createdAt);
        return rows(symptom.medicationEffects).filter((effect) => {
          const name = stringValue(effect.reportedMedicationName ?? row(effect.medication).name ?? row(effect.medication).genericName);
          return Boolean(name && name.toLowerCase() === medication.name.toLowerCase());
        }).map((effect) => {
          const effectText = stringValue(effect.sideEffects) ??
            (effect.improved !== undefined ? 'reported improvement: ' + String(effect.improved) :
              effect.effectiveness !== undefined ? 'reported effectiveness: ' + String(effect.effectiveness) : 'effect noted');
          return (stringValue(symptom.title) ?? 'Symptom record') +
            (at ? ' (' + (localDay(at) ?? at.slice(0, 10)) + ')' : '') +
            ' — ' + effectText;
        });
      });
      addFinding({
        key: 'medication-effect:' + medication.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        priority: 'WATCH',
        title: 'Patient-reported effects are recorded alongside a saved medicine',
        change: medication.name + ' is explicitly referenced in ' + medication.symptoms.length + ' symptom record(s).',
        pattern: evidence.length ? evidence.join('; ') : 'The medicine label is explicitly linked to a symptom-effect entry.',
        personalContext: 'This is based on the medicine label and patient-recorded effect fields saved in Sympto, not a verified pharmacological assessment.',
        whyItMatters: 'The notes may capture reported relief or side effects, but they do not establish that the medicine caused the symptom or outcome.',
        nextStep: 'Discuss persistent side effects, lack of relief or concerns with your prescriber or pharmacist. Do not stop or change a prescribed medicine based only on this report.',
        confidence: 'LIMITED',
        evidence,
        sourceRecordIds: Array.from(new Set(medication.symptoms.map((symptom) => stringValue(symptom.id)).filter((id): id is string => Boolean(id)))),
      });
    }

    // Test for repeated same-day co-occurrence between symptom records and explicit
    // medication dose actions. This is a chronology signal, not proof the medicine
    // treats the symptom or that a skipped dose caused an outcome.
    const daySymptoms = new Map<string, Set<string>>();
    for (const symptom of symptomRows) {
      const label = stringValue(symptom.title) ??
        rows(symptom.symptoms).map((entry) => stringValue(row(entry.symptom).name ?? entry.name)).filter(Boolean).join(', ') ??
        'Symptom record';
      const times = [symptom.startedAt ?? symptom.createdAt, ...rows(symptom.monitorings).map((monitor) => monitor.observedAt ?? monitor.createdAt)];
      for (const at of times) {
        if (!at || !periodIncludes(report, at)) continue;
        const day = localDay(at);
        if (!day) continue;
        const labels = daySymptoms.get(day) ?? new Set<string>();
        labels.add(label);
        daySymptoms.set(day, labels);
      }
    }
    const doseActionsByDay = new Map<string, { taken: Set<string>; skipped: Set<string> }>();
    for (const event of rows(report.goalMetricEvents)) {
      if (event.source !== 'medication-adherence' || !event.occurredAt || !periodIncludes(report, event.occurredAt)) continue;
      const meta = row(event.metadata);
      const action = stringValue(meta.action)?.toUpperCase();
      if (action !== 'TAKEN' && action !== 'SKIPPED') continue;
      const day = localDay(event.occurredAt);
      if (!day || !daySymptoms.has(day)) continue;
      const medicationId = stringValue(meta.patientMedicationId) ??
        stringValue(event.sourceId)?.split(':')[0] ??
        '';
      const medication = activeMedications.find((item) => String(item.id ?? '') === medicationId);
      const medicationName = stringValue(row(medication?.medication).name ?? medication?.name) ?? 'A saved medication';
      const actions = doseActionsByDay.get(day) ?? { taken: new Set<string>(), skipped: new Set<string>() };
      (action === 'TAKEN' ? actions.taken : actions.skipped).add(medicationName);
      doseActionsByDay.set(day, actions);
    }
    const skippedSymptomDays = Array.from(doseActionsByDay.entries()).filter(([, actions]) => actions.skipped.size > 0);
    const takenSymptomDays = Array.from(doseActionsByDay.entries()).filter(([, actions]) => actions.taken.size > 0);
    if (skippedSymptomDays.length >= 2) {
      const skippedNames = Array.from(new Set(skippedSymptomDays.flatMap(([, actions]) => Array.from(actions.skipped))));
      const takenNames = Array.from(new Set(takenSymptomDays.flatMap(([, actions]) => Array.from(actions.taken))));
      const evidence = [
        ...skippedSymptomDays.slice(0, 4).map(([day, actions]) =>
          day + ': symptom record(s) ' + Array.from(daySymptoms.get(day) ?? []).join(', ') +
          '; explicitly skipped: ' + Array.from(actions.skipped).join(', ')),
        ...takenSymptomDays.slice(0, 2).map(([day, actions]) =>
          day + ': symptom record(s) ' + Array.from(daySymptoms.get(day) ?? []).join(', ') +
          '; explicitly taken: ' + Array.from(actions.taken).join(', ')),
      ];
      addFinding({
        key: 'cross:symptoms-medication-actions',
        priority: 'WATCH',
        title: 'Symptom entries overlapped with explicitly skipped medication doses',
        change: 'Symptoms and skipped-dose actions were recorded on ' + skippedSymptomDays.length +
          ' separate day(s)' + (takenSymptomDays.length
            ? '; symptoms and taken-dose actions also overlapped on ' + takenSymptomDays.length + ' day(s).' : '.'),
        pattern: 'The overlap is based on the local calendar date of symptom starts/follow-ups and explicit TAKEN/SKIPPED medication actions. ' +
          (skippedNames.length ? 'Medicines marked skipped on overlap days: ' + skippedNames.join(', ') + '. ' : '') +
          (takenNames.length ? 'Medicines marked taken on overlap days: ' + takenNames.join(', ') + '. ' : ''),
        personalContext: 'Only dose actions explicitly saved in the medication log were used. Unrecorded scheduled doses are not treated as skipped, and the records do not establish that a medicine was prescribed for the symptom.',
        whyItMatters: 'This chronology may be worth reviewing with the actual prescription instructions and symptom timeline, but same-day co-occurrence does not show that skipped doses caused symptoms or that taken doses relieved them.',
        nextStep: 'Check the specific medicine instructions and note why a dose was skipped, if known. Discuss recurring symptoms or difficulty taking medication as prescribed with your prescriber or pharmacist; do not change or double a dose based on this pattern.',
        confidence: skippedSymptomDays.length >= 4 && takenSymptomDays.length >= 2 ? 'MODERATE' : 'LIMITED',
        evidence,
        sourceRecordIds: Array.from(new Set([
          ...skippedSymptomDays.flatMap(([day]) => symptomRows.filter((symptom) =>
            [symptom.startedAt ?? symptom.createdAt, ...rows(symptom.monitorings).map((monitor) => monitor.observedAt ?? monitor.createdAt)]
              .some((at) => at && localDay(at) === day)).map((symptom) => stringValue(symptom.id))),
          ...rows(report.goalMetricEvents).filter((event) =>
            event.source === 'medication-adherence' && event.occurredAt && skippedSymptomDays.some(([day]) => day === localDay(event.occurredAt)) &&
            String(row(event.metadata).action ?? '').toUpperCase() === 'SKIPPED',
          ).map((event) => stringValue(event.sourceId)),
        ].filter((id): id is string => Boolean(id)))),
      });
    }

    // Surface observations carrying explicit safety signals before general trends.
    const urgentSignals = new Map<string, HealthObservation[]>();
    for (const item of observations.filter((observation) => observation.quality.safetySignals.length)) {
      for (const signal of item.quality.safetySignals) {
        const key = item.metric + ':' + signal;
        const group = urgentSignals.get(key) ?? [];
        group.push(item);
        urgentSignals.set(key, group);
      }
    }
    for (const [key, items] of urgentSignals) {
      const latest = items.slice().sort((a, b) => String(a.observedAt ?? '').localeCompare(String(b.observedAt ?? ''))).at(-1);
      if (!latest) continue;
      const signal = latest.quality.safetySignals[0];
      const title = latest.metric === 'oxygen_saturation' ? 'Low oxygen reading needs prompt verification'
        : latest.metric === 'body_temperature' ? 'High temperature reading needs prompt review'
          : latest.metric === 'heart_rate' ? 'Heart-rate reading needs prompt review'
            : latest.metric === 'respiratory_rate' ? 'Breathing-rate reading needs prompt review'
              : 'A reading carries a safety flag';
      const nextStep = signal === 'LOW_OXYGEN_REQUIRES_URGENT_RECHECK'
        ? 'If this reading is current, recheck promptly. If it remains low, or you have breathing difficulty or feel seriously unwell, seek urgent medical assessment.'
        : signal === 'HIGH_TEMPERATURE_REQUIRES_URGENT_REVIEW'
          ? 'Verify promptly with a reliable thermometer. If this is current and accurate, or you feel seriously unwell, seek urgent medical assessment.'
          : 'Verify the measurement, timestamp and unit. If it is current and you have concerning symptoms, seek prompt clinical advice.';
      addFinding({
        key: 'safety:' + key,
        priority: 'SAFETY',
        title,
        change: 'A dated observation triggered a predefined safety-review rule.',
        pattern: items.length > 1 ? items.length + ' flagged observations were recorded; the latest was ' + formatObservation(latest) + '.' : 'The flagged observation was ' + formatObservation(latest) + '.',
        personalContext: currentConditionRows.length
          ? 'Saved health context includes ' + currentConditionRows.map((item) => item.name).slice(0, 3).join(', ') + '.'
          : 'No matching active condition was needed to trigger this data-quality/safety check.',
        whyItMatters: 'This is a prompt to verify a potentially important reading, not a diagnosis. Its meaning depends on whether it is current, the measurement method, symptoms and clinical history.',
        nextStep,
        confidence: confidenceFor(items),
        evidence: items.slice(-3).map(formatObservation),
        sourceRecordIds: Array.from(new Set(items.map((item) => item.source.recordId).filter((id): id is string => Boolean(id)))),
      });
    }

    const reviewObservations = observations.filter((item) =>
      item.quality.status !== 'ACCEPTED' || item.quality.flags.length > 0,
    );
    if (reviewObservations.length) {
      const preview = reviewObservations.slice(0, 3);
      addFinding({
        key: 'quality:readings-to-verify',
        priority: 'REVIEW',
        title: 'Some readings need verification before interpretation',
        change: reviewObservations.length + ' observation(s) carry unit, timestamp or plausibility flags.',
        pattern: preview.map((item) => item.metric + ': ' + formatObservation(item)).join('; '),
        personalContext: 'These readings are kept separate from accepted evidence and are not used to calculate reliable trends when flagged.',
        whyItMatters: 'A unit mismatch, uncertain timestamp or implausible value can make an apparent health change misleading.',
        nextStep: 'Check the original record, unit and measurement time. Keep the source entry unchanged until it has been verified.',
        confidence: 'HIGH',
        evidence: preview.flatMap((item) => item.quality.flags.slice(0, 2)),
        sourceRecordIds: Array.from(new Set(preview.map((item) => item.source.recordId).filter((id): id is string => Boolean(id)))),
      });
    }

    // Compare symptom severity with the latest dated follow-up, retaining symptom-level identity.
    const severityName = (rank: number) => Object.keys(SEVERITY_RANK).find((name) => SEVERITY_RANK[name] === rank) ?? 'UNKNOWN';
    for (const symptom of symptomRows) {
      const title = stringValue(symptom.title) ??
        rows(symptom.symptoms).map((entry) => stringValue(row(entry.symptom).name ?? entry.name)).filter(Boolean).join(', ') ??
        'Recorded symptom';
      const initialRank = SEVERITY_RANK[String(symptom.overallSeverity ?? '').toUpperCase()];
      if (initialRank === undefined) continue;
      const followUps = rows(symptom.monitorings).flatMap((monitor) => {
        const rank = SEVERITY_RANK[String(monitor.severity ?? '').toUpperCase()];
        const at = isoDate(monitor.observedAt ?? monitor.createdAt);
        return rank === undefined || !at || !periodIncludes(report, at) ? [] : [{ rank, at, recordId: stringValue(monitor.id) }];
      }).sort((a, b) => a.at.localeCompare(b.at));
      const latest = followUps.at(-1);
      if (!latest || latest.rank <= initialRank) continue;
      const initialAt = isoDate(symptom.startedAt ?? symptom.createdAt);
      const evidence = ['Initial severity ' + severityName(initialRank).toLowerCase() +
        (initialAt ? ' on ' + (localDay(initialAt) ?? initialAt.slice(0, 10)) : ''),
      'Latest follow-up severity ' + severityName(latest.rank).toLowerCase() +
        ' on ' + (localDay(latest.at) ?? latest.at.slice(0, 10))];
      addFinding({
        key: 'symptom-worsening:' + String(symptom.id ?? title),
        priority: latest.rank >= SEVERITY_RANK.SEVERE ? 'REVIEW' : 'WATCH',
        title: title + ' worsened in a recorded follow-up',
        change: 'Recorded severity increased from ' + severityName(initialRank).toLowerCase() + ' to ' + severityName(latest.rank).toLowerCase() + '.',
        pattern: 'The change is based on the same symptom record, comparing its initial severity with the latest dated follow-up in this reporting period.',
        personalContext: 'This finding uses the symptom-specific timeline rather than averaging different symptoms together.',
        whyItMatters: 'A worsening symptom may warrant attention, but this record alone does not establish the cause or whether a medicine or behaviour contributed.',
        nextStep: 'Continue any monitoring specified in your care plan and seek clinical advice if the symptom is persistent, worsening or concerning.',
        confidence: initialAt && symptom.startedAt ? 'HIGH' : 'MODERATE',
        evidence,
        sourceRecordIds: [stringValue(symptom.id), latest.recordId].filter((id): id is string => Boolean(id)),
      });
    }

    if (sleepStress.status === 'SUPPORTED_PATTERN') {
      addFinding({
        key: 'cross:sleep-stress',
        priority: 'WATCH',
        title: 'Sleep duration and stress ratings differed across recorded days',
        change: 'Average stress was ' + formatNumber(sleepStress.meanStressOnShorterSleepDays, 1) +
          '/10 on shorter-sleep days versus ' + formatNumber(sleepStress.meanStressOnLongerSleepDays, 1) + '/10 on longer-sleep days.',
        pattern: sleepStress.statement,
        personalContext: 'This pattern comes from ' + sleepStress.overlappingDays + ' overlapping days in your daily records.',
        whyItMatters: 'Repeated co-occurrence may be useful context for your wellbeing, but the observations do not establish cause and effect.',
        nextStep: 'Track sleep and stress together over additional days and discuss a persistent or distressing pattern with a clinician.',
        confidence: sleepStress.overlappingDays >= 6 ? 'MODERATE' : 'LIMITED',
        evidence: [sleepStress.shorterSleepDays + ' shorter-sleep days; ' + sleepStress.longerSleepDays + ' longer-sleep days'],
        sourceRecordIds: [],
      });
    }

    for (const comparison of periodComparisons) {
      addFinding({
        key: 'comparison:' + comparison.metric,
        priority: comparison.relatedConditions.length ? 'WATCH' : 'INSIGHT',
        title: comparison.label + ' changed versus the previous reporting window',
        change: formatNumber(comparison.previousAverage, TREND_DEFINITIONS.find((item) => item.metric === comparison.metric)?.digits ?? 1) +
          ' ' + comparison.unit + ' previously → ' +
          formatNumber(comparison.currentAverage, TREND_DEFINITIONS.find((item) => item.metric === comparison.metric)?.digits ?? 1) +
          ' ' + comparison.unit + ' now (' + (comparison.change > 0 ? '+' : '') + formatNumber(comparison.change, TREND_DEFINITIONS.find((item) => item.metric === comparison.metric)?.digits ?? 1) + ' ' + comparison.unit + ').',
        pattern: 'The comparison uses daily averages from ' + comparison.previousDays + ' previous recorded day(s) and ' + comparison.currentDays + ' current recorded day(s), not missing days treated as zero.',
        personalContext: [
          comparison.relatedConditions.length ? 'Relevant saved condition(s): ' + comparison.relatedConditions.join(', ') + '.' : '',
          comparison.relatedGoals.length ? 'Related active goal(s): ' + comparison.relatedGoals.join(', ') + '.' : '',
        ].filter(Boolean).join(' ') || 'No direct active-condition or goal mapping was found for this measure.',
        whyItMatters: comparison.interpretation,
        nextStep: comparison.relatedConditions.length || comparison.relatedGoals.length
          ? 'Compare this change with your saved baseline, applicable clinician-set target and care plan; continue recording comparable measurements.'
          : 'Continue recording comparable measurements. A change in either direction is not, by itself, evidence of improvement or deterioration.',
        confidence: comparison.previousDays >= 4 && comparison.currentDays >= 4 ? 'MODERATE' : 'LIMITED',
        evidence: [
          'Previous window: ' + comparison.previousStart + ' to ' + comparison.previousEnd + '; ' + comparison.previousReadings + ' accepted reading(s).',
          'Current window: ' + comparison.currentStart + ' to ' + comparison.currentEnd + '; ' + comparison.currentReadings + ' accepted reading(s).',
        ],
        sourceRecordIds: [],
      });
    }

    for (const trend of withinPeriodTrends) {
      addFinding({
        key: 'trend:' + trend.metric,
        priority: trend.relatedConditions.length ? 'WATCH' : 'INSIGHT',
        title: trend.label + ' shifted within this reporting period',
        change: formatNumber(trend.earlierAverage, TREND_DEFINITIONS.find((item) => item.metric === trend.metric)?.digits ?? 1) +
          ' ' + trend.unit + ' → ' +
          formatNumber(trend.laterAverage, TREND_DEFINITIONS.find((item) => item.metric === trend.metric)?.digits ?? 1) +
          ' ' + trend.unit + ' across ' + trend.daysCompared + ' recorded days.',
        pattern: trend.direction === 'RISING' ? 'Later daily averages were higher than earlier daily averages.' : 'Later daily averages were lower than earlier daily averages.',
        personalContext: [
          trend.relatedConditions.length ? 'Relevant saved condition(s): ' + trend.relatedConditions.join(', ') + '.' : '',
          trend.relatedGoals.length ? 'Related active goal(s): ' + trend.relatedGoals.join(', ') + '.' : '',
        ].filter(Boolean).join(' ') || 'No direct active-condition or active-goal mapping was found.',
        whyItMatters: trend.interpretation,
        nextStep: trend.relatedConditions.length || trend.relatedGoals.length
          ? 'Review the direction against your actual saved target and care plan; do not infer treatment failure or success from direction alone.'
          : 'Keep recording comparable measurements so future reports can distinguish a lasting shift from normal variation.',
        confidence: trend.daysCompared >= 5 && trend.readingCount >= 5 ? 'MODERATE' : 'LIMITED',
        evidence: [trend.firstDay + ' to ' + trend.lastDay + '; ' + trend.readingCount + ' accepted dated reading(s).'],
        sourceRecordIds: [],
      });
    }


    // Compare the older and newer halves of the preceding 90-day record window.
    // This supplies a longer-term anchor without treating unrecorded days as measurements.
    if (longTermStart && periodStart) {
      const midpoint = (new Date(longTermStart).getTime() + new Date(periodStart).getTime()) / 2;
      const midpointDay = localDay(new Date(midpoint));
      const midpointOrdinal = midpointDay ? dayOrdinal(midpointDay) : Number.NaN;
      for (const definition of TREND_DEFINITIONS) {
        const longSeries = dailyMetricValues(longTermObservations, definition.metric);
        if (longSeries.length < 6 || !Number.isFinite(midpointOrdinal)) continue;
        const older = longSeries.filter((item) => dayOrdinal(item.day) < midpointOrdinal);
        const recent = longSeries.filter((item) => dayOrdinal(item.day) >= midpointOrdinal);
        if (older.length < 2 || recent.length < 2) continue;
        const olderAverage = meanOf(older.map((item) => item.value));
        const recentAverage = meanOf(recent.map((item) => item.value));
        if (olderAverage === null || recentAverage === null) continue;
        const change = recentAverage - olderAverage;
        if (Math.abs(change) < definition.minimumChange) continue;
        const relatedGoals = activeGoalRows.filter((goal) => {
          const category = String(goal.category ?? '').toUpperCase().replace(/[\s-]+/g, '_');
          const metricMap: Record<string, string[]> = {
            WEIGHT: ['weight'], BODY_WEIGHT: ['weight'],
            BLOOD_PRESSURE: ['bp.systolic', 'bp.diastolic'], BP: ['bp.systolic', 'bp.diastolic'],
            HEART_RATE: ['heart_rate'], RESTING_HEART_RATE: ['heart_rate'],
            BLOOD_GLUCOSE: ['blood_glucose', 'lab.hba1c'], GLUCOSE: ['blood_glucose', 'lab.hba1c'],
            CHOLESTEROL: ['cholesterol.total', 'cholesterol.ldl', 'cholesterol.hdl', 'cholesterol.triglycerides'],
            EXERCISE: ['exercise.duration', 'activity.steps'], PHYSICAL_ACTIVITY: ['exercise.duration', 'activity.steps'],
            HYDRATION: ['hydration.volume'], WATER: ['hydration.volume'],
            SLEEP: ['sleep.duration', 'sleep.quality'], MENTAL_HEALTH: ['stress.score', 'mood', 'energy.level'],
            STRESS: ['stress.score'], MOOD: ['mood'],
            SMOKING: ['smoking.cigarettes', 'smoking.frequency'], ALCOHOL: ['alcohol.units', 'alcohol.frequency'],
            MEDICATION: ['medication.dose_action'],
          };
          return (metricMap[category] ?? []).includes(definition.metric);
        }).map((goal) => stringValue(goal.title)).filter((title): title is string => Boolean(title));
        const relatedConditions = contextualConditionRows.filter((condition) =>
          conditionMetricRules.some((rule) => rule.pattern.test(condition.name) && rule.metrics.includes(definition.metric)),
        ).map((condition) => condition.status === 'RESOLVED'
          ? condition.name + ' (recorded as resolved)' : condition.name);
        const reportPeriodValues = dailyMetricValues(observations, definition.metric);
        const reportPeriodAverage = meanOf(reportPeriodValues.map((item) => item.value));
        const digits = definition.digits;
        const valueText = (value: number) => formatNumber(value, digits) + ' ' + definition.unit;
        addFinding({
          key: 'long-term:' + definition.metric,
          priority: relatedConditions.length ? 'WATCH' : 'INSIGHT',
          title: definition.label + ' showed a longer-term shift',
          change: valueText(olderAverage) + ' in the older part of the 90-day record window → ' +
            valueText(recentAverage) + ' in the more recent part' +
            (reportPeriodAverage === null ? '.' : '; current report-period average ' + valueText(reportPeriodAverage) + '.'),
          pattern: 'Accepted daily averages from ' + older[0].day + ' to ' + older[older.length - 1].day +
            ' (' + older.length + ' recorded day(s)) were compared with ' + recent[0].day + ' to ' +
            recent[recent.length - 1].day + ' (' + recent.length + ' recorded day(s)). Days without a reading were excluded.',
          personalContext: [
            relatedConditions.length ? 'Relevant saved condition(s): ' + relatedConditions.join(', ') + '.' : '',
            relatedGoals.length ? 'Related active goal(s): ' + relatedGoals.join(', ') + '.' : '',
          ].filter(Boolean).join(' ') || 'This is a comparison with the person’s own dated record, not a universal clinical assessment.',
          whyItMatters: 'The measure changed over a longer span rather than only between adjacent reports. Whether that direction is beneficial or concerning depends on this measure, saved baseline, applicable clinician-set targets, symptoms and care plan.',
          nextStep: relatedConditions.length || relatedGoals.length
            ? 'Review this longer-term movement alongside the current period, your saved target and care plan. Seek clinical advice for persistent or concerning changes.'
            : 'Continue recording comparable measurements. Do not infer improvement or deterioration from direction alone.',
          confidence: older.length >= 5 && recent.length >= 5 ? 'MODERATE' : 'LIMITED',
          evidence: [
            'Older window: ' + older[0].day + ' to ' + older[older.length - 1].day + '; ' + older.length + ' accepted recorded day(s).',
            'More recent window: ' + recent[0].day + ' to ' + recent[recent.length - 1].day + '; ' + recent.length + ' accepted recorded day(s).',
          ],
          sourceRecordIds: [],
        });
      }
    }

    // Record explicit condition and medication updates as contextual evidence.
    // Dates help explain chronology, but are never treated as proof of causation.
    const healthChanges = row(tracking.healthPassportChanges);
    const conditionChanges = rows(healthChanges.conditions).flatMap((item) => {
      const name = stringValue(row(item.condition).name ?? item.name);
      if (!name) return [];
      const resolved = isoDate(item.resolvedAt);
      const diagnosed = isoDate(item.diagnosedAt);
      const updated = isoDate(item.updatedAt);
      const created = isoDate(item.createdAt);
      const relevant = [resolved, diagnosed, updated, created].find((at) => Boolean(at && periodIncludes(report, at)));
      if (!relevant) return [];
      return [{
        id: stringValue(item.id),
        label: name + ' — ' + (resolved && periodIncludes(report, resolved) ? 'marked resolved'
          : diagnosed && periodIncludes(report, diagnosed) ? 'diagnosis date recorded'
            : updated && periodIncludes(report, updated) ? 'record updated' : 'record added'),
        date: localDay(relevant) ?? relevant.slice(0, 10),
        resolved: Boolean(resolved && periodIncludes(report, resolved)),
      }];
    });
    const medicationChanges = rows(healthChanges.medications).flatMap((item) => {
      const name = stringValue(row(item.medication).name ?? item.name);
      if (!name) return [];
      const ended = isoDate(item.endedAt);
      const started = isoDate(item.startedAt);
      const updated = isoDate(item.updatedAt);
      const created = isoDate(item.createdAt);
      const relevant = [ended, started, updated, created].find((at) => Boolean(at && periodIncludes(report, at)));
      if (!relevant) return [];
      return [{
        id: stringValue(item.id),
        label: name + ' — ' + (ended && periodIncludes(report, ended) ? 'end date recorded'
          : started && periodIncludes(report, started) ? 'start date recorded'
            : updated && periodIncludes(report, updated) ? 'record updated' : 'record added'),
        date: localDay(relevant) ?? relevant.slice(0, 10),
        ended: Boolean(ended && periodIncludes(report, ended)),
      }];
    });
    if (conditionChanges.length || medicationChanges.length) {
      const evidence = [
        ...conditionChanges.slice(0, 3).map((item) => item.label + ' (' + item.date + ')'),
        ...medicationChanges.slice(0, 3).map((item) => item.label + ' (' + item.date + ')'),
      ];
      addFinding({
        key: 'context:health-record-changes',
        priority: 'INSIGHT',
        title: 'Saved health-record changes provide context for this period',
        change: conditionChanges.length + ' condition record change(s) and ' + medicationChanges.length + ' medication record change(s) have relevant dates in this period.',
        pattern: evidence.join('; '),
        personalContext: 'These changes come from your saved Health Passport and medication records and are interpreted alongside dated symptoms and measurements.',
        whyItMatters: 'A condition or treatment record change may affect interpretation of later observations, but chronology alone does not show that it caused a symptom or measurement change. A resolved status is a record status, not proof that all symptoms have ended.',
        nextStep: conditionChanges.some((item) => item.resolved) || medicationChanges.some((item) => item.ended)
          ? 'Check that the saved resolution and medication end dates reflect your clinician’s plan. Discuss uncertainty about ongoing symptoms or treatment with your care team.'
          : 'Keep the records aligned with your current care plan and continue recording comparable symptoms and measurements.',
        confidence: 'MODERATE',
        evidence,
        sourceRecordIds: [
          ...conditionChanges.map((item) => item.id),
          ...medicationChanges.map((item) => item.id),
        ].filter((id): id is string => Boolean(id)),
      });
    }

    // Compare newly-started symptoms across the two matched windows. Older symptom
    // records that are merely followed up in the current window are not counted as new.
    const labelForSymptom = (item: Row) => {
      const linkedNames = rows(item.symptoms)
        .map((entry) => stringValue(row(entry.symptom).name ?? entry.name))
        .filter((name): name is string => Boolean(name));
      return stringValue(item.title) ?? (linkedNames.join(', ') || 'Recorded symptom');
    };
    const countSymptomStarts = (items: Row[], fromValue: string | null, toValue: string | null) => {
      const counts = new Map<string, { label: string; dates: string[]; ids: string[] }>();
      for (const item of items) {
        const at = isoDate(item.startedAt ?? item.createdAt);
        if (!at || !fromValue || !toValue) continue;
        const timestamp = new Date(at).getTime();
        if (timestamp < new Date(fromValue).getTime() || timestamp >= new Date(toValue).getTime()) continue;
        const label = labelForSymptom(item);
        const key = label.toLowerCase().replace(/\\s+/g, ' ').trim();
        const current = counts.get(key) ?? { label, dates: [], ids: [] };
        current.dates.push(localDay(at) ?? at.slice(0, 10));
        const id = stringValue(item.id);
        if (id) current.ids.push(id);
        counts.set(key, current);
      }
      return counts;
    };
    if (hasPriorWindow) {
      const priorSymptomRows = rows(row(longitudinal.activity).symptoms);
      const priorStarts = countSymptomStarts(priorSymptomRows, isoDate(priorPeriod.start), isoDate(priorPeriod.end));
      const currentStarts = countSymptomStarts(symptomRows, periodStart, periodEnd);
      for (const [key, current] of currentStarts) {
        const previous = priorStarts.get(key);
        const currentCount = current.dates.length;
        const previousCount = previous?.dates.length ?? 0;
        if (currentCount < 2 || currentCount <= previousCount) continue;
        addFinding({
          key: 'symptom-frequency:' + key.replace(/[^a-z0-9]+/g, '-'),
          priority: 'WATCH',
          title: current.label + ' was recorded more often this period',
          change: currentCount + ' newly-started symptom record(s) this period versus ' + previousCount + ' in the matched previous window.',
          pattern: 'The comparison counts new symptom starts with the same saved label across equal-length periods. Follow-up edits to older symptoms are not treated as new starts.',
          personalContext: 'More entries may represent increased symptoms or more consistent logging; the count alone cannot distinguish between them.',
          whyItMatters: 'Repeated records are useful to review alongside severity, duration, recorded triggers, medicines and any reported relief or side effects. The count does not establish a cause.',
          nextStep: 'Continue recording severity, duration and relevant context. Discuss a persistent, worsening or concerning symptom pattern with your clinician.',
          confidence: currentCount >= 3 && previousCount > 0 ? 'MODERATE' : 'LIMITED',
          evidence: [
            'Current window: ' + current.dates.sort().join(', '),
            'Previous window: ' + (previous?.dates.sort().join(', ') || 'no matching symptom starts recorded'),
          ],
          sourceRecordIds: current.ids.slice(0, 5),
        });
      }
    }
    findings.sort((a, b) => {
      const rank: Record<HealthReportNarrativeFinding['priority'], number> = { SAFETY: 0, REVIEW: 1, WATCH: 2, INSIGHT: 3 };
      return rank[a.priority] - rank[b.priority];
    });

    const start = isoDate(row(report.period).start);
    const end = isoDate(row(report.period).end);
    const eligibleDays = eligibleDayCount(start, end);
    const loggedDays = Array.from(loggingDays).sort();

    return {
      version: 'shadow-v2',
      findings: findings.slice(0, 8),
      periodComparisons,
      personalisedContext: {
        insights: personalisedInsights,
      },
      withinPeriodTrends,
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
        note: 'Saved conditions, goals and baselines contextualise dated observations. Condition- and demographic-specific clinical thresholds are not overridden until an approved, versioned clinical policy is configured.',
      },
    };
  }
}
