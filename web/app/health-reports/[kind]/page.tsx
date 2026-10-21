"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Droplets,
  FileText,
  Footprints,
  HeartPulse,
  Info,
  Moon,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { api } from "@/lib/api";

type JournalEntry = {
  id?: string;
  createdAt?: string | null;
  recordedAt?: string | null;
  updatedAt?: string | null;
  mood?: string | null;
  [key: string]: unknown;
};

type SymptomName = { name?: string | null; symptom?: { name?: string | null } | null };
type SymptomObservationRecord = {
  observedAt?: string | null;
  severity?: string | null;
  progression?: string | null;
  stillPresent?: boolean | null;
  painScore?: number | string | null;
};
type SymptomTriggerRecord = {
  trigger?: string | null;
  suspected?: boolean | null;
  confirmed?: boolean | null;
  exposureAt?: string | null;
};
type SymptomMedicationEffectRecord = {
  medication?: { name?: string | null } | null;
  reportedMedicationName?: string | null;
  improved?: boolean | null;
  effectiveness?: number | string | null;
  sideEffects?: string | null;
};
type SymptomRecord = {
  id?: string;
  title?: string | null;
  description?: string | null;
  startedAt?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
  overallSeverity?: string | null;
  progression?: string | null;
  symptoms?: SymptomName[] | null;
  observations?: SymptomObservationRecord[] | null;
  triggers?: SymptomTriggerRecord[] | null;
  medicationEffects?: SymptomMedicationEffectRecord[] | null;
};
type PatientVitalRecord = {
  id?: string;
  recordedAt?: string | null;
  createdAt?: string | null;
  temperature?: number | string | null;
  bloodPressureSystolic?: number | string | null;
  bloodPressureDiastolic?: number | string | null;
  heartRate?: number | string | null;
  oxygenSaturation?: number | string | null;
  respiratoryRate?: number | string | null;
  weightKg?: number | string | null;
};
type DeviceMeasurementRecord = {
  measurementType?: string | null;
  metricKey?: string | null;
  value?: number | string | null;
  unit?: string | null;
  measuredAt?: string | null;
  vitalType?: { name?: string | null; unit?: string | null } | null;
};
type ClinicalVitalRecord = {
  value?: number | string | null;
  measuredAt?: string | null;
  recordedAt?: string | null;
  vitalType?: { code?: string | null; name?: string | null; unit?: string | null } | null;
};
type SleepSessionRecord = {
  id?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  durationMinutes?: number | string | null;
};
type WorkoutRecord = {
  id?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | string | null;
};
type WellnessMetricRecord = {
  metricKey?: string | null;
  value?: number | string | null;
  unit?: string | null;
  measuredAt?: string | null;
  source?: string | null;
  metadata?: unknown;
};
type LabResultItem = {
  id?: string;
  test?: { name?: string | null; unit?: { name?: string | null; symbol?: string | null } | null } | null;
  numericValue?: string | number | boolean | null;
  textValue?: string | number | boolean | null;
  booleanValue?: string | number | boolean | null;
  abnormal?: boolean | null;
  critical?: boolean | null;
};
type LabResultRecord = {
  id?: string;
  reportedAt?: string | null;
  releasedAt?: string | null;
  orderItem?: { test?: { name?: string | null; unit?: { name?: string | null; symbol?: string | null } | null } | null } | null;
  items?: LabResultItem[] | null;
};

type SnapshotPerson = {
  firstName?: string | null;
  preferredName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
};
type SnapshotProfile = {
  heightCm?: number | string | null;
  weightKg?: number | string | null;
  smokingStatus?: string | null;
  alcoholConsumption?: string | null;
  exerciseFrequency?: string | null;
  occupation?: string | null;
};
type SnapshotCondition = {
  status?: string | null;
  severity?: string | null;
  chronic?: boolean | null;
  condition?: { name?: string | null; chronic?: boolean | null } | null;
};
type SnapshotDiagnosis = {
  status?: string | null;
  severity?: string | null;
  stage?: string | null;
  primaryDiagnosis?: boolean | null;
  diagnosedAt?: string | null;
  diagnosis?: { name?: string | null; chronic?: boolean | null } | null;
};
type SnapshotMedicalRecord = {
  allergies?: string | null;
  bloodType?: string | null;
  chronicConditions?: string | null;
  currentMedications?: string | null;
  familyHistory?: string | null;
  immunizationNotes?: string | null;
  pastMedicalHistory?: string | null;
  socialHistory?: string | null;
  surgicalHistory?: string | null;
};
type SnapshotAllergy = {
  status?: string | null;
  severity?: string | null;
  reaction?: string | null;
  allergy?: { name?: string | null } | null;
};
type SnapshotMedication = {
  status?: string | null;
  ongoing?: boolean | null;
  dosage?: string | null;
  frequency?: string | null;
  indication?: string | null;
  adherencePercentage?: number | null;
  missedDoses?: number | null;
  medication?: { name?: string | null; genericName?: string | null; brandName?: string | null } | null;
};
type GoalProgressRecord = {
  progressPercent?: number | string | null;
  status?: string | null;
  currentValue?: number | string | null;
  measuredAt?: string | null;
  notes?: string | null;
};
type SnapshotGoal = {
  id?: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  currentValue?: number | string | null;
  targetValue?: number | string | null;
  unit?: string | null;
  targetDate?: string | null;
  achievedAt?: string | null;
  createdAt?: string | null;
  progress?: GoalProgressRecord[] | null;
};
type SnapshotRiskResult = {
  factor?: string | null;
  value?: string | null;
  score?: number | string | null;
  recommendation?: string | null;
};
type SnapshotRiskAssessment = {
  id?: string;
  assessmentType?: string | null;
  overallRisk?: string | null;
  score?: number | string | null;
  notes?: string | null;
  assessedAt?: string | null;
  results?: SnapshotRiskResult[] | null;
};
type HealthContextSnapshot = {
  person?: SnapshotPerson | null;
  profile?: SnapshotProfile | null;
  baseline?: {
    heightCm?: number | string | null;
    weightKg?: number | string | null;
    bmi?: number | string | null;
    systolicPressure?: number | string | null;
    diastolicPressure?: number | string | null;
    restingHeartRate?: number | string | null;
    respiratoryRate?: number | string | null;
    oxygenSaturation?: number | string | null;
    bodyTemperature?: number | string | null;
    bloodGlucose?: number | string | null;
    cholesterol?: number | string | null;
    establishedAt?: string | null;
  } | null;
  medicalRecord?: SnapshotMedicalRecord | null;
  bloodType?: string | null;
  rhesusFactor?: string | null;
  riskAssessments?: SnapshotRiskAssessment[];
  conditions?: SnapshotCondition[];
  diagnoses?: SnapshotDiagnosis[];
  allergies?: SnapshotAllergy[];
  medications?: SnapshotMedication[];
  activeGoals?: SnapshotGoal[];
};

type GoalMetricEventRecord = {
  goalId?: string | null;
  goalTitle?: string | null;
  goalCategory?: string | null;
  unit?: string | null;
  targetValue?: number | string | null;
  metricType: string;
  metricKey: string;
  loggedValue: number | string;
  occurredAt: string;
  source: string;
  sourceId?: string | null;
  metadata?: unknown;
};

type Report = {
  type: "WEEKLY" | "MONTHLY";
  period: { start: string; end: string; label: string; scheduledFor: string };
  activity: {
    journalEntries: JournalEntry[];
    symptoms: SymptomRecord[];
    appointments: unknown[];
    patientVitals: PatientVitalRecord[];
    deviceMeasurements: DeviceMeasurementRecord[];
    wellnessMetrics: WellnessMetricRecord[];
    sleepSessions: SleepSessionRecord[];
    workouts: WorkoutRecord[];
  };
  clinical: {
    encounters: unknown[];
    diagnoses: unknown[];
    prescriptions: unknown[];
    notes: unknown[];
    vitals: ClinicalVitalRecord[];
    labResults: LabResultRecord[];
    imaging: unknown[];
    procedures: unknown[];
    carePlans: unknown[];
    referrals: unknown[];
  };
  currentSnapshot?: HealthContextSnapshot | null;
  goalMetricEvents?: GoalMetricEventRecord[];
  generatedAt: string;
};

type SeriesPoint = { date: string; value: number; timestamp: number; source?: string; unit?: string; convertedFrom?: { value: number; unit: string } };
type DailyValue = { date: string; value: number };
type MeasurementReview = {
  key: string;
  label: string;
  unit: string;
  value: number;
  timestamp: number;
  severity: "urgent" | "review";
  message: string;
  originalValue?: number;
  originalUnit?: string;
};

function unwrap<T>(value: unknown): T {
  if (value && typeof value === "object" && "data" in value) {
    const payload = (value as { data?: unknown }).data;
    return (payload ?? value) as T;
  }
  return value as T;
}
const finite = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

function ageAt(dateOfBirth: unknown, referenceDate: unknown): number | null {
  if (!dateOfBirth || !referenceDate) return null;
  const birth = new Date(String(dateOfBirth));
  const reference = new Date(String(referenceDate));
  if (!Number.isFinite(birth.getTime()) || !Number.isFinite(reference.getTime()) || birth > reference) return null;
  let age = reference.getFullYear() - birth.getFullYear();
  if (
    reference.getMonth() < birth.getMonth() ||
    (reference.getMonth() === birth.getMonth() && reference.getDate() < birth.getDate())
  ) age -= 1;
  return age >= 0 && age < 125 ? age : null;
}

function baselineVitalValue(metric: string, snapshot: HealthContextSnapshot | null | undefined): number | null {
  const baseline = snapshot?.baseline;
  if (!baseline) return null;
  const fields: Record<string, unknown> = {
    systolic: baseline.systolicPressure,
    diastolic: baseline.diastolicPressure,
    heartRate: baseline.restingHeartRate,
    weight: baseline.weightKg,
    oxygen: baseline.oxygenSaturation,
    temperature: baseline.bodyTemperature,
    respiratory: baseline.respiratoryRate,
  };
  return finite(fields[metric]);
}

type StatusTone = "good" | "watch" | "high" | "critical" | "info";

function toneStyles(tone: StatusTone) {
  switch (tone) {
    case "good": return { ring: "#15803d", track: "#dcfce7", text: "text-emerald-800", surface: "bg-emerald-50", border: "border-emerald-200" };
    case "watch": return { ring: "#d97706", track: "#fef3c7", text: "text-amber-900", surface: "bg-amber-50", border: "border-amber-200" };
    case "high": return { ring: "#ea580c", track: "#ffedd5", text: "text-orange-900", surface: "bg-orange-50", border: "border-orange-200" };
    case "critical": return { ring: "#be123c", track: "#ffe4e6", text: "text-rose-900", surface: "bg-rose-50", border: "border-rose-200" };
    default: return { ring: "#64748b", track: "#e2e8f0", text: "text-slate-700", surface: "bg-slate-50", border: "border-slate-200" };
  }
}

function dateKey(value: unknown) {
  if (!value) return "";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

function dateLabel(value: unknown) {
  if (!value) return "Not recorded";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function human(value: unknown) {
  return String(value ?? "").replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mean(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatNumber(value: number | null, digits = 1) {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-ZA", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function periodDays(report: Report) {
  const start = new Date(report.period.start).getTime();
  const end = new Date(report.period.end).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return report.type === "WEEKLY" ? 7 : 30;
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

function dailyMetric(report: Report | null, field: string): DailyValue[] {
  if (!report) return [];
  const grouped = new Map<string, { total: number; count: number }>();
  report.activity.journalEntries.forEach((entry) => {
    const key = dateKey(entry.createdAt || entry.recordedAt || entry.updatedAt);
    const value = finite(entry[field]);
    if (!key || value === null) return;
    const current = grouped.get(key) ?? { total: 0, count: 0 };
    current.total += value;
    current.count += 1;
    grouped.set(key, current);
  });
  return Array.from(grouped.entries())
    .map(([date, group]) => ({ date, value: group.total / group.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

type GoalProgressTrendItem = {
  key: string;
  title: string;
  category: string;
  unit: string;
  valueKind: "current" | "percent";
  current: DailyValue[];
  previous: DailyValue[];
  latestStatus: string;
  targetValue: number | null;
};

function goalProgressTrendItems(report: Report, previousReport: Report | null): GoalProgressTrendItem[] {
  const inPeriod = (timestamp: number, periodReport: Report | null) => {
    if (!periodReport) return false;
    const start = new Date(periodReport.period.start).getTime();
    const end = new Date(periodReport.period.end).getTime();
    return Number.isFinite(timestamp) && timestamp >= start && timestamp < end;
  };
  const previousGoals = previousReport?.currentSnapshot?.activeGoals ?? [];

  return (report.currentSnapshot?.activeGoals ?? []).flatMap((goal) => {
    const progressPoints = (goal.progress ?? []).flatMap((item) => {
      if (!item.measuredAt) return [];
      const timestamp = new Date(item.measuredAt).getTime();
      const currentValue = finite(item.currentValue);
      const percentValue = finite(item.progressPercent);
      const value = currentValue !== null ? currentValue : percentValue;
      if (!inPeriod(timestamp, report) || value === null) return [];
      const date = dateKey(item.measuredAt);
      if (!date) return [];
      return [{ date, timestamp, value, valueKind: currentValue !== null ? "current" as const : "percent" as const, status: String(item.status ?? "").toUpperCase() }];
    }).sort((a, b) => a.timestamp - b.timestamp);

    const eventPoints = (report.goalMetricEvents ?? [])
      .filter((event) => event.goalId === goal.id && event.source !== "goal-baseline")
      .flatMap((event) => {
        const timestamp = new Date(event.occurredAt).getTime();
        const value = finite(event.loggedValue);
        const date = dateKey(event.occurredAt);
        if (!inPeriod(timestamp, report) || value === null || !date) return [];
        return [{ date, timestamp, value, valueKind: "current" as const, status: "" }];
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    // Metric events are authoritative for metric-configured goals. Don't merge
    // them with progress projections, which can represent the same saved check-in.
    const current = eventPoints.length ? eventPoints : progressPoints;
    if (!current.length) return [];

    const previousGoal = previousGoals.find((item) => item.id === goal.id) ??
      previousGoals.find((item) => String(item.category ?? "") === String(goal.category ?? "") &&
        String(item.title ?? "") === String(goal.title ?? ""));
    const previousEvents = (previousReport?.goalMetricEvents ?? [])
      .filter((event) => event.goalId === goal.id && event.source !== "goal-baseline")
      .flatMap((event) => {
        const timestamp = new Date(event.occurredAt).getTime();
        const value = finite(event.loggedValue);
        const date = dateKey(event.occurredAt);
        if (!inPeriod(timestamp, previousReport) || value === null || !date) return [];
        return [{ date, timestamp, value, valueKind: "current" as const }];
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    const previousProgress = (previousGoal?.progress ?? [])
      .flatMap((item) => {
        if (!item.measuredAt) return [];
        const timestamp = new Date(item.measuredAt).getTime();
        const currentValue = finite(item.currentValue);
        const percentValue = finite(item.progressPercent);
        const value = currentValue !== null ? currentValue : percentValue;
        const date = dateKey(item.measuredAt);
        if (!inPeriod(timestamp, previousReport) || value === null || !date) return [];
        return [{ date, timestamp, value, valueKind: currentValue !== null ? "current" as const : "percent" as const }];
      })
      .filter((item) => item.valueKind === current[0].valueKind)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(({ date, value }) => ({ date, value }));

    return [{
      key: String(goal.id ?? goal.category ?? goal.title ?? "goal"),
      title: String(goal.title || human(goal.category) || "Health goal"),
      category: String(goal.category ?? ""),
      unit: current[0].valueKind === "percent" ? "%" : String(goal.unit ?? (eventPoints.length ? (report.goalMetricEvents ?? []).find((event) => event.goalId === goal.id)?.unit : "") ?? ""),
      valueKind: current[0].valueKind,
      current: current.map(({ date, value }) => ({ date, value })),
      previous: previousEvents.length ? previousEvents.map(({ date, value }) => ({ date, value })) : previousProgress,
      latestStatus: current[current.length - 1].status || String(goal.progress?.[0]?.status ?? ""),
      targetValue: finite(goal.targetValue),
    }];
  });
}
function recordedDays(report: Report) {
  const days = new Set<string>();
  const periodStart = new Date(report.period.start).getTime();
  const periodEnd = new Date(report.period.end).getTime();
  const add = (value: unknown) => {
    if (value === null || value === undefined || value === "") return;
    const timestamp = new Date(String(value)).getTime();
    if (!Number.isFinite(timestamp) || timestamp < periodStart || timestamp >= periodEnd) return;
    const key = dateKey(value);
    if (key) days.add(key);
  };
  const addRecord = (item: unknown, fields: string[]) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    fields.forEach((field) => add(record[field]));
    const encounter = record.encounter;
    if (encounter && typeof encounter === "object") {
      add((encounter as Record<string, unknown>).startedAt);
    }
  };

  report.activity.journalEntries.forEach((item) => {
    addRecord(item, ["createdAt", "recordedAt"]);
  });
  report.activity.symptoms.forEach((item) => {
    add(item.startedAt || item.createdAt);
  });
  report.activity.patientVitals.forEach((item) => {
    add(item.recordedAt || item.createdAt);
  });
  report.activity.deviceMeasurements.forEach((item) => add(item.measuredAt));
  report.activity.wellnessMetrics.forEach((item) => add(item.measuredAt));
  report.activity.sleepSessions.forEach((item) => add(item.startedAt || item.endedAt));
  report.activity.workouts.forEach((item) => add(item.startedAt || item.endedAt));
  (report.currentSnapshot?.activeGoals ?? []).forEach((goal) => {
    (goal.progress ?? []).forEach((item) => add(item.measuredAt));
  });
  (report.goalMetricEvents ?? []).forEach((event) => add(event.occurredAt));

  report.activity.appointments.forEach((item) => addRecord(item, ["scheduledStart", "scheduledEnd"]));
  report.clinical.encounters.forEach((item) => addRecord(item, ["startedAt", "endedAt", "createdAt"]));
  report.clinical.diagnoses.forEach((item) => addRecord(item, ["diagnosedAt", "createdAt"]));
  report.clinical.prescriptions.forEach((item) => addRecord(item, ["issuedAt", "createdAt"]));
  report.clinical.notes.forEach((item) => addRecord(item, ["createdAt", "updatedAt"]));
  report.clinical.vitals.forEach((item) => addRecord(item, ["measuredAt", "recordedAt"]));
  report.clinical.labResults.forEach((item) => addRecord(item, ["reportedAt", "releasedAt"]));
  report.clinical.imaging.forEach((item) => addRecord(item, ["performedAt", "reportedAt", "createdAt"]));
  report.clinical.procedures.forEach((item) => addRecord(item, ["performedAt", "createdAt"]));
  report.clinical.carePlans.forEach((item) => addRecord(item, ["updatedAt", "createdAt"]));
  report.clinical.referrals.forEach((item) => addRecord(item, ["updatedAt", "completedDate", "acceptedDate", "requestedDate"]));

  return days;
}

function addVital(
  output: SeriesPoint[],
  value: unknown,
  at: unknown,
  source: string,
  convertedFrom?: { value: number; unit: string },
) {
  const numeric = finite(value);
  const day = dateKey(at);
  const timestamp = at ? new Date(String(at)).getTime() : Number.NaN;
  if (numeric === null || !day || !Number.isFinite(timestamp)) return;
  output.push({ date: day, value: numeric, timestamp, source, ...(convertedFrom ? { convertedFrom } : {}) });
}

function standardiseMeasurementValue(metric: string, value: unknown, unitValue: unknown): { value: number; convertedFrom?: { value: number; unit: string } } | null {
  const numeric = finite(value);
  if (numeric === null) return null;
  const originalUnit = String(unitValue ?? "").trim();
  const unit = originalUnit.toLowerCase().replace(/º/g, "°");
  let converted = numeric;

  if (metric === "temperature" && (unit.includes("fahrenheit") || /(^|[^a-z])°?f($|[^a-z])/.test(unit))) {
    converted = (numeric - 32) * 5 / 9;
  } else if (metric === "weight" && /(?:^|\s)(?:lb|lbs|pound|pounds)(?:$|\s)/.test(unit)) {
    converted = numeric * 0.45359237;
  } else if ((metric === "systolic" || metric === "diastolic") && /\bkpa\b/.test(unit)) {
    converted = numeric * 7.50062;
  } else if (metric === "oxygen" && (unit.includes("fraction") || unit.includes("ratio")) && numeric >= 0 && numeric <= 1) {
    converted = numeric * 100;
  }

  return {
    value: converted,
    ...(converted !== numeric && originalUnit ? { convertedFrom: { value: numeric, unit: originalUnit } } : {}),
  };
}

function normaliseVitalName(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[_-]+/g, " ").trim();
}

function addNamedVitalForMetric(
  output: SeriesPoint[],
  metric: string,
  nameValue: unknown,
  value: unknown,
  at: unknown,
  source: string,
  unitValue?: unknown,
) {
  const name = normaliseVitalName(nameValue);
  const rawValue = String(value ?? "").trim();
  const bloodPressurePair = rawValue.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);

  // Some devices and clinical records store blood pressure as one "120/80" value.
  // Split it into the requested series so systolic values never pollute diastolic averages.
  if (/blood pressure|bloodpressure|\bbp\b/.test(name) && bloodPressurePair) {
    if (metric === "systolic") {
      const standard = standardiseMeasurementValue(metric, bloodPressurePair[1], unitValue);
      if (standard) addVital(output, standard.value, at, source, standard.convertedFrom);
    }
    if (metric === "diastolic") {
      const standard = standardiseMeasurementValue(metric, bloodPressurePair[2], unitValue);
      if (standard) addVital(output, standard.value, at, source, standard.convertedFrom);
    }
    return;
  }

  const matchesMetric =
    (metric === "systolic" && /systolic|sys bp|sbp/.test(name)) ||
    (metric === "diastolic" && /diastolic|dia bp|dbp/.test(name)) ||
    (metric === "heartRate" && /resting heart|heart rate|heartrate|\bpulse\b|\bhr\b/.test(name)) ||
    (metric === "weight" && /weight|body mass/.test(name)) ||
    (metric === "oxygen" && /oxygen|spo2|o2 saturation/.test(name)) ||
    (metric === "temperature" && /temperature|temp\b/.test(name)) ||
    (metric === "respiratory" && /respiratory|breathing rate/.test(name));

  if (matchesMetric) {
    const standard = standardiseMeasurementValue(metric, value, unitValue);
    if (standard) addVital(output, standard.value, at, source, standard.convertedFrom);
  }
}

function vitalSeries(report: Report | null, metric: string): SeriesPoint[] {
  if (!report) return [];
  const points: SeriesPoint[] = [];

  report.activity.patientVitals.forEach((item) => {
    const at = item.recordedAt || item.createdAt;
    if (metric === "systolic") addVital(points, item.bloodPressureSystolic, at, "Health Vitals");
    if (metric === "diastolic") addVital(points, item.bloodPressureDiastolic, at, "Health Vitals");
    if (metric === "heartRate") addVital(points, item.heartRate, at, "Health Vitals");
    if (metric === "weight") addVital(points, item.weightKg, at, "Health Vitals");
    if (metric === "oxygen") addVital(points, item.oxygenSaturation, at, "Health Vitals");
    if (metric === "temperature") addVital(points, item.temperature, at, "Health Vitals");
    if (metric === "respiratory") addVital(points, item.respiratoryRate, at, "Health Vitals");
  });

  report.activity.deviceMeasurements.forEach((item) => {
    addNamedVitalForMetric(
      points,
      metric,
      item.measurementType || item.metricKey || item.vitalType?.name,
      item.value,
      item.measuredAt,
      "Connected device",
      item.unit || item.vitalType?.unit,
    );
  });

  report.activity.wellnessMetrics.forEach((item) => {
    addNamedVitalForMetric(
      points,
      metric,
      item.metricKey,
      item.value,
      item.measuredAt,
      "Connected wellness metric",
      item.unit,
    );
  });

  report.clinical.vitals.forEach((item) => {
    addNamedVitalForMetric(
      points,
      metric,
      item.vitalType?.code || item.vitalType?.name,
      item.value,
      item.measuredAt || item.recordedAt,
      "Clinical record",
      item.vitalType?.unit,
    );
  });

  // Some goal-card measurements are saved to HealthGoalMetricEvent rather than the
  // HealthJournal/device streams. Bring them into the matching trend series.
  (report.goalMetricEvents ?? []).forEach((event) => {
    if (event.source === "goal-baseline") return;
    const metricType = String(event.metricType ?? "").toUpperCase();
    const metricKey = String(event.metricKey ?? "").toLowerCase();
    const matches =
      (metric === "systolic" && metricType === "BLOOD_PRESSURE" && metricKey === "blood_pressure.systolic") ||
      (metric === "diastolic" && metricType === "BLOOD_PRESSURE" && metricKey === "blood_pressure.diastolic") ||
      (metric === "heartRate" && metricType === "HEART_RATE" && metricKey === "heart_rate.bpm") ||
      (metric === "weight" && metricType === "WEIGHT" && metricKey === "weight.kg");
    if (matches) addVital(points, event.loggedValue, event.occurredAt, "Health goal log");
  });

  const deduped = new Map<string, SeriesPoint>();
  for (const point of points) {
    // Keep separate same-day readings, but collapse exact duplicates when the
    // same measurement arrives through more than one source.
    const key = point.timestamp + "|" + point.value;
    if (!deduped.has(key)) deduped.set(key, point);
  }
  return Array.from(deduped.values()).sort((a, b) => a.timestamp - b.timestamp);
}

function trendVitalSeries(report: Report | null, metric: string, age: number | null): SeriesPoint[] {
  const points = vitalSeries(report, metric);
  return points.filter((point) => {
    const value = point.value;
    // Keep raw values in vitalSeries for visible alerts. Exclude values that the
    // report flags for review from trend averages, but never remove them from the
    // original report data or warning panel.
    if (metric === "oxygen") return value > 92 && value <= 100;
    if (metric === "temperature") return value >= 35 && value < 40;
    if (metric === "respiratory" && age !== null && age >= 18) return value >= 8 && value <= 30;
    if (metric === "heartRate") return value > 0 && value <= 250;
    if (metric === "systolic") return value >= 40 && value <= 300;
    if (metric === "diastolic") return value >= 20 && value <= 200;
    if (metric === "weight") return value > 0 && value < 1000;
    return true;
  });
}

function originalUnitReviewFields(point: SeriesPoint | null | undefined) {
  return point?.convertedFrom
    ? { originalValue: point.convertedFrom.value, originalUnit: point.convertedFrom.unit }
    : {};
}

function reportMeasurementReviews(report: Report, age: number | null): MeasurementReview[] {
  const reviews: MeasurementReview[] = [];

  const oxygen = vitalSeries(report, "oxygen");
  const latestOxygen = oxygen[oxygen.length - 1];
  const lowestOxygen = oxygen.reduce<SeriesPoint | null>(
    (lowest, point) => !lowest || point.value < lowest.value ? point : lowest,
    null,
  );
  if (latestOxygen && (latestOxygen.value <= 0 || latestOxygen.value > 100)) {
    reviews.push({
      key: "oxygen", label: "Oxygen saturation", unit: "%",
      value: latestOxygen.value, timestamp: latestOxygen.timestamp, ...originalUnitReviewFields(latestOxygen), severity: "review",
      message: "This value is outside the valid 0–100% scale. Check the original entry, device and unit before relying on this trend.",
    });
  } else if (latestOxygen && latestOxygen.value <= 92) {
    reviews.push({
      key: "oxygen", label: "Oxygen saturation", unit: "%",
      value: latestOxygen.value, timestamp: latestOxygen.timestamp, ...originalUnitReviewFields(latestOxygen), severity: "urgent",
      message: "For most people, a home oxygen reading of 92% or lower needs emergency assessment. Recheck it immediately; if it remains this low, seek emergency medical help. A device can be inaccurate, but do not delay help if you feel unwell.",
    });
  } else if (lowestOxygen && lowestOxygen.value <= 88) {
    reviews.push({
      key: "oxygen", label: "Oxygen saturation", unit: "%",
      value: lowestOxygen.value, timestamp: lowestOxygen.timestamp, ...originalUnitReviewFields(lowestOxygen), severity: "review",
      message: "This period includes a very low saved oxygen reading. Check the original record and date. If a reading this low is happening now, seek emergency medical help. A device can be inaccurate, but do not delay help if you feel unwell.",
    });
  } else if (lowestOxygen && lowestOxygen.value <= 92) {
    const selected = latestOxygen && latestOxygen.value <= 92 ? latestOxygen : lowestOxygen;
    reviews.push({
      key: "oxygen", label: "Oxygen saturation", unit: "%",
      value: selected.value, timestamp: selected.timestamp, ...originalUnitReviewFields(selected), severity: "review",
      message: "This saved oxygen reading is lower than expected for most people. Confirm it and contact a healthcare professional for advice. Personal targets can differ, especially with some lung conditions.",
    });
  }

  const temperatures = vitalSeries(report, "temperature");
  const latestTemperature = temperatures[temperatures.length - 1];
  const hottest = temperatures.reduce<SeriesPoint | null>(
    (highest, point) => !highest || point.value > highest.value ? point : highest,
    null,
  );
  const coldest = temperatures.reduce<SeriesPoint | null>(
    (lowest, point) => !lowest || point.value < lowest.value ? point : lowest,
    null,
  );
  if (latestTemperature && latestTemperature.value >= 43) {
    reviews.push({
      key: "temperature", label: "Temperature", unit: "°C",
      value: latestTemperature.value, timestamp: latestTemperature.timestamp, ...originalUnitReviewFields(latestTemperature), severity: "review",
      message: "This is far outside usual body-temperature readings and may be a unit, sensor or typing error. Check the original record promptly. If a temperature this high is current and accurate, seek emergency medical help.",
    });
  } else if (hottest && hottest.value >= 43) {
    reviews.push({
      key: "temperature", label: "Temperature", unit: "°C",
      value: hottest.value, timestamp: hottest.timestamp, ...originalUnitReviewFields(hottest), severity: "review",
      message: "This saved temperature is far outside usual body-temperature readings and may reflect an entry, device or unit problem. Check the original record. If a temperature around 40°C or higher is current and accurate, seek urgent medical advice; if you feel seriously unwell, seek emergency help.",
    });
  } else if (latestTemperature && latestTemperature.value >= 40) {
    reviews.push({
      key: "temperature", label: "Temperature", unit: "°C",
      value: latestTemperature.value, timestamp: latestTemperature.timestamp, ...originalUnitReviewFields(latestTemperature), severity: "urgent",
      message: "This is a very high reported temperature. Confirm it promptly with a reliable thermometer and seek urgent medical advice, especially if you feel very unwell.",
    });
  } else if (latestTemperature && latestTemperature.value < 35) {
    reviews.push({
      key: "temperature", label: "Temperature", unit: "°C",
      value: latestTemperature.value, timestamp: latestTemperature.timestamp, ...originalUnitReviewFields(latestTemperature), severity: "review",
      message: "This is a low reported body temperature. Check the measurement method and repeat the reading. If it is current and accurate, or you feel unwell, seek urgent medical advice.",
    });
  } else if (coldest && coldest.value < 35) {
    reviews.push({
      key: "temperature", label: "Temperature", unit: "°C",
      value: coldest.value, timestamp: coldest.timestamp, ...originalUnitReviewFields(coldest), severity: "review",
      message: "A low temperature was saved during this period. Check the date, measurement method and original value before interpreting the trend.",
    });
  }

  const breathing = vitalSeries(report, "respiratory");
  const latestBreathing = breathing[breathing.length - 1];
  const highestBreathing = breathing.reduce<SeriesPoint | null>(
    (highest, point) => !highest || point.value > highest.value ? point : highest,
    null,
  );
  const lowestBreathing = breathing.reduce<SeriesPoint | null>(
    (lowest, point) => !lowest || point.value < lowest.value ? point : lowest,
    null,
  );
  if (age !== null && age >= 18 && latestBreathing && latestBreathing.value > 30) {
    reviews.push({
      key: "respiratory", label: "Breathing rate", unit: "breaths/min",
      value: latestBreathing.value, timestamp: latestBreathing.timestamp, severity: "urgent",
      message: "This is much faster than the typical adult resting range of 12–18 breaths per minute. If this is your current rate, recheck while resting and seek urgent medical advice if it remains this high. Get emergency help for severe breathing difficulty.",
    });
  } else if (age !== null && age >= 18 && highestBreathing && highestBreathing.value > 30) {
    reviews.push({
      key: "respiratory", label: "Breathing rate", unit: "breaths/min",
      value: highestBreathing.value, timestamp: highestBreathing.timestamp, severity: "review",
      message: "This saved rate is much faster than the typical adult resting range of 12–18 breaths per minute. Check whether it was recorded after activity and verify the original entry. If this is happening now, seek urgent medical advice.",
    });
  } else if (age !== null && age >= 18 && lowestBreathing && lowestBreathing.value > 0 && lowestBreathing.value < 8) {
    reviews.push({
      key: "respiratory", label: "Breathing rate", unit: "breaths/min",
      value: lowestBreathing.value,
      timestamp: lowestBreathing.timestamp, severity: "review",
      message: "A breathing rate below the typical adult resting range was saved during this period. Check whether it was measured at rest and verify the original entry; seek urgent advice if this is current or you feel unwell.",
    });
  }

  const heartRateSeries = vitalSeries(report, "heartRate");
  const invalidHeartRate = heartRateSeries.filter((point) => point.value <= 0 || point.value > 250).at(-1);
  if (invalidHeartRate) {
    reviews.push({
      key: "heartRate", label: "Heart rate", unit: "bpm",
      value: invalidHeartRate.value, timestamp: invalidHeartRate.timestamp,
      ...originalUnitReviewFields(invalidHeartRate), severity: "review",
      message: "This saved heart-rate value is outside a plausible measurement scale. Check the original entry, device and unit before using it in a trend.",
    });
  }

  const weightSeries = vitalSeries(report, "weight");
  const invalidWeight = weightSeries.filter((point) => point.value <= 0 || point.value >= 1000).at(-1);
  if (invalidWeight) {
    reviews.push({
      key: "weight", label: "Weight", unit: "kg",
      value: invalidWeight.value, timestamp: invalidWeight.timestamp,
      ...originalUnitReviewFields(invalidWeight), severity: "review",
      message: "This saved weight is outside the range used for this report's trend calculation. Check the original entry and unit before relying on the average.",
    });
  }

  const latestSystolic = vitalSeries(report, "systolic").at(-1);
  const latestDiastolic = vitalSeries(report, "diastolic").at(-1);
  const severeBloodPressure = age !== null && age >= 18
    ? latestSystolic && latestSystolic.value > 180
      ? latestSystolic
      : latestDiastolic && latestDiastolic.value > 120 ? latestDiastolic : null
    : null;
  if (severeBloodPressure) {
    const isSystolic = severeBloodPressure === latestSystolic;
    reviews.push({
      key: isSystolic ? "systolic" : "diastolic",
      label: isSystolic ? "Systolic blood pressure" : "Diastolic blood pressure",
      unit: "mmHg", value: severeBloodPressure.value,
      timestamp: severeBloodPressure.timestamp, ...originalUnitReviewFields(severeBloodPressure), severity: "urgent",
      message: "This blood-pressure reading is very high. Repeat it after sitting quietly and seek prompt medical advice. If you also have chest pain, shortness of breath, weakness, numbness, vision changes or trouble speaking, call local emergency services.",
    });
  }

  const lowSystolic = vitalSeries(report, "systolic").filter((point) => point.value < 40).at(-1);
  const lowDiastolic = vitalSeries(report, "diastolic").filter((point) => point.value < 20).at(-1);
  if (lowSystolic && !(severeBloodPressure && severeBloodPressure === latestSystolic)) {
    reviews.push({
      key: "systolic", label: "Systolic blood pressure", unit: "mmHg",
      value: lowSystolic.value, timestamp: lowSystolic.timestamp,
      ...originalUnitReviewFields(lowSystolic), severity: "review",
      message: "This systolic value is outside the range used for this report's trend calculation. Check the saved unit and original reading.",
    });
  }
  if (lowDiastolic && !(severeBloodPressure && severeBloodPressure === latestDiastolic)) {
    reviews.push({
      key: "diastolic", label: "Diastolic blood pressure", unit: "mmHg",
      value: lowDiastolic.value, timestamp: lowDiastolic.timestamp,
      ...originalUnitReviewFields(lowDiastolic), severity: "review",
      message: "This diastolic value is outside the range used for this report's trend calculation. Check the saved unit and original reading.",
    });
  }

  return reviews;
}

type VitalStatusAssessment = { label: string; detail: string; tone: StatusTone };

function latestGoalCeiling(report: Report, category: string): SnapshotGoal | null {
  const candidates = (report.currentSnapshot?.activeGoals ?? [])
    .filter((goal) =>
      String(goal.category ?? "").toUpperCase() === category &&
      String(goal.status ?? "ACTIVE").toUpperCase() === "ACTIVE" &&
      finite(goal.targetValue) !== null,
    )
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  return candidates[0] ?? null;
}

function vitalStatus(report: Report, metric: string, age: number | null): VitalStatusAssessment {
  const points = vitalSeries(report, metric);
  const latest = points[points.length - 1];
  if (!latest) return { label: "No reading", detail: "There is no saved value to assess.", tone: "info" };
  const value = latest.value;

  if (metric === "oxygen") {
    if (value <= 0 || value > 100) return { label: "Check entry", detail: "This is outside the valid 0–100% scale.", tone: "high" };
    if (value <= 92) return { label: "Critical low", detail: "For most people, a home reading at or below 92% needs emergency assessment. Recheck immediately and seek emergency help if it remains this low; do not delay if unwell.", tone: "critical" };
    if (age === null || age < 18) return { label: "Personal range needed", detail: "Age-specific oxygen guidance is needed; this is not rated against adult ranges.", tone: "info" };
    if (value < 95) return { label: "Recheck", detail: "This is below the common adult guide of 95–100%. Personal targets can differ.", tone: "watch" };
    return { label: "Within common guide", detail: "Within the common adult reference of 95–100%; follow your clinician's personal target.", tone: "good" };
  }

  if (metric === "temperature") {
    if (value >= 43) return { label: "Verify urgently", detail: "This value is far outside usual body-temperature readings. Check the unit and source.", tone: "high" };
    if (value >= 40) return { label: "Very high", detail: "If current and accurate, seek urgent medical advice; emergency symptoms need emergency help.", tone: "critical" };
    if (value < 35) return { label: "Very low", detail: "If current and accurate, seek urgent medical advice.", tone: "high" };
    if (value >= 38) return { label: "Raised", detail: "A raised temperature can need clinical advice, depending on age and symptoms.", tone: "watch" };
    if (age === null || age < 18) return { label: "Personal range needed", detail: "Age-specific temperature guidance is needed for this profile.", tone: "info" };
    if (value < 36.5 || value > 37.5) return { label: "Outside common guide", detail: "Compare with how and when it was measured, and check your personal guidance.", tone: "watch" };
    return { label: "Within common guide", detail: "Within a common adult resting reference; temperature varies by method and time of day.", tone: "good" };
  }

  if (metric === "systolic" || metric === "diastolic") {
    if (age === null || age < 18) return { label: "Age-specific range needed", detail: "Adult blood-pressure categories are not applied without a recorded adult age.", tone: "info" };
    const systolic = vitalSeries(report, "systolic").at(-1);
    const diastolic = vitalSeries(report, "diastolic").at(-1);
    const paired = Boolean(systolic && diastolic && Math.abs(systolic.timestamp - diastolic.timestamp) <= 15 * 60 * 1000);
    const sys = paired && systolic ? systolic.value : metric === "systolic" ? value : null;
    const dia = paired && diastolic ? diastolic.value : metric === "diastolic" ? value : null;
    if ((sys !== null && sys > 180) || (dia !== null && dia > 120)) {
      return { label: "Very high", detail: "Repeat after sitting quietly. Seek prompt medical advice; with chest pain, breathlessness, weakness, vision or speech changes, call emergency services.", tone: "critical" };
    }
    if (metric === "systolic") {
      const bpGoal = latestGoalCeiling(report, "BLOOD_PRESSURE");
      const bpCeiling = finite(bpGoal?.targetValue);
      if (bpCeiling !== null) {
        if (value <= bpCeiling) {
          return { label: "Within your saved goal", detail: "Your latest systolic reading is at or below your saved target of " + formatNumber(bpCeiling, 0) + " mmHg. This checks only the top number; review the full blood-pressure pair and your clinician's advice too.", tone: "good" };
        }
        return { label: "Above your saved goal", detail: "Your latest systolic reading is " + formatNumber(value - bpCeiling, 0) + " mmHg above your saved target of " + formatNumber(bpCeiling, 0) + " mmHg. Recheck readings and discuss repeated results with your clinician.", tone: value >= 140 ? "high" : "watch" };
      }
    }
    if ((sys !== null && sys >= 140) || (dia !== null && dia >= 90)) {
      return { label: "High range", detail: "This is in a high adult reference category. Repeated readings and clinical review matter; one reading is not a diagnosis.", tone: "high" };
    }
    if ((sys !== null && sys >= 130) || (dia !== null && dia >= 80)) {
      return { label: "Stage 1 range", detail: "This is above the normal adult reference. Compare repeated readings with your clinician's goal.", tone: "watch" };
    }
    if (sys !== null && dia !== null && sys >= 120 && dia < 80) {
      return { label: "Elevated range", detail: "The top number is above the normal adult reference, while the bottom number is below 80.", tone: "watch" };
    }
    if ((sys !== null && sys < 90) || (dia !== null && dia < 60)) {
      return { label: "Low reading", detail: "A low reading should be interpreted with symptoms, medicines and your usual baseline.", tone: "watch" };
    }
    return { label: "Within adult guide", detail: "Within common adult categories. Use your saved Health Goal and clinician-set target if different.", tone: "good" };
  }

  if (metric === "heartRate") {
    if (age === null || age < 18) return { label: "Age-specific range needed", detail: "Heart-rate references vary by age and activity; adult ranges are not applied.", tone: "info" };
    if (value < 40 || value > 130) return { label: "Needs prompt review", detail: "Outside the typical adult resting range. Recheck at rest and seek advice if it persists or you feel unwell.", tone: "high" };
    const heartRateGoal = latestGoalCeiling(report, "HEART_RATE");
    const heartRateCeiling = finite(heartRateGoal?.targetValue);
    if (heartRateCeiling !== null) {
      if (value <= heartRateCeiling) {
        return { label: "Within your saved goal", detail: "Your latest heart rate is at or below your saved goal of " + formatNumber(heartRateCeiling, 0) + " bpm. This comparison assumes a resting reading; activity and medicines can affect heart rate.", tone: "good" };
      }
      return { label: "Above your saved goal", detail: "Your latest heart rate is " + formatNumber(value - heartRateCeiling, 0) + " bpm above your saved goal of " + formatNumber(heartRateCeiling, 0) + " bpm. Confirm it at rest and discuss repeated readings with your clinician.", tone: value > 100 ? "high" : "watch" };
    }
    if (value < 60 || value > 100) return { label: "Outside common range", detail: "The typical adult resting pulse range is 60–100 bpm; activity and medicines can affect it.", tone: "watch" };
    return { label: "Within common range", detail: "Within the typical adult resting pulse range of 60–100 bpm.", tone: "good" };
  }

  if (metric === "respiratory") {
    if (age === null || age < 18) return { label: "Age-specific range needed", detail: "Breathing-rate references vary substantially by age; adult ranges are not applied.", tone: "info" };
    if (value > 30) return { label: "Urgent review", detail: "Far above the typical adult resting range of 12–18 breaths/min. If current or accompanied by breathing difficulty, seek urgent help.", tone: "critical" };
    if (value < 8) return { label: "Low rate", detail: "Below the typical adult resting range. Recheck and seek prompt medical advice if current or unwell.", tone: "high" };
    if (value < 12 || value > 18) return { label: "Outside resting range", detail: "The typical adult resting range is 12–18 breaths/min; activity and illness can affect it.", tone: "watch" };
    return { label: "Within resting range", detail: "Within the typical adult resting range of 12–18 breaths/min.", tone: "good" };
  }

  if (metric === "weight") return { label: "Trend only", detail: "Weight is shown against saved measurements and goals; a single value is not labelled healthy or unhealthy.", tone: "info" };
  return { label: "Reference needed", detail: "Use your personal target or clinician guidance for this measure.", tone: "info" };
}


function lowMoodCounts(report: Report | null) {
  const entries = (report?.activity.journalEntries ?? []).filter((entry) => Boolean(entry.mood));
  const low = entries.filter((entry) => ["VERY_BAD", "BAD", "VERY_LOW", "LOW"].includes(String(entry.mood).toUpperCase()));
  return { low: low.length, total: entries.length };
}

function recurringSymptoms(report: Report | null) {
  const counts = new Map<string, { label: string; count: number }>();
  (report?.activity.symptoms ?? []).forEach((item) => {
    const labels = (item.symptoms ?? [])
      .map((symptom) => symptom.symptom?.name || symptom.name)
      .filter((name): name is string => Boolean(name));
    if (!labels.length && item.title && !["symptom recorded", "symptom log"].includes(String(item.title).toLowerCase())) {
      labels.push(item.title);
    }
    const distinct = new Set(labels.map((label: string) => String(label).trim()).filter(Boolean));
    distinct.forEach((label) => {
      const key = String(label).toLowerCase();
      const current = counts.get(key) ?? { label: String(label), count: 0 };
      current.count += 1;
      counts.set(key, current);
    });
  });
  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

function routineAssociation(report: Report | null) {
  if (!report) return null;
  const sleep = dailyMetric(report, "sleepHours");
  const stress = dailyMetric(report, "stressLevel");
  const stressByDay = new Map(stress.map((item) => [item.date, item.value]));
  const matched = sleep
    .filter((item) => stressByDay.has(item.date))
    .map((item) => ({ sleep: item.value, stress: stressByDay.get(item.date)! }));
  if (matched.length < 4) return null;

  const sortedSleep = matched.map((item) => item.sleep).sort((a, b) => a - b);
  const median = sortedSleep[Math.floor(sortedSleep.length / 2)];
  const shorter = matched.filter((item) => item.sleep < median);
  const longer = matched.filter((item) => item.sleep >= median);
  if (shorter.length < 2 || longer.length < 2) return null;
  const shortStress = mean(shorter.map((item) => item.stress));
  const longStress = mean(longer.map((item) => item.stress));
  if (shortStress === null || longStress === null) return null;
  return { shorterDays: shorter.length, longerDays: longer.length, shortStress, longStress, delta: shortStress - longStress };
}

function compareText(
  currentValues: number[],
  previousValues: number[],
  unit: string,
  digits = 1,
  previousLoading = false,
) {
  const current = mean(currentValues);
  if (current === null) return "No usable readings in this period.";
  if (previousLoading) return "Comparing with the previous period…";
  const previous = mean(previousValues);
  if (previous === null) return "No comparable readings were available in the previous period.";
  const delta = current - previous;
  if (Math.abs(delta) < 0.05) {
    return "Your average stayed about the same as the previous period (" + formatNumber(current, digits) + (unit ? " " + unit : "") + ").";
  }
  return "Your average was " + formatNumber(Math.abs(delta), digits) + (unit ? " " + unit : "") + (delta > 0 ? " higher" : " lower") + " than in the previous period.";
}

function MiniTrend({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) {
    return <div className="mt-3 flex h-12 items-center rounded-xl bg-slate-50 px-3 text-[11px] text-slate-400">Add more readings to reveal a trend.</div>;
  }
  const width = 180;
  const height = 42;
  const padding = 4;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const coordinates = values.map((value, index) => {
    const x = padding + index * (width - padding * 2) / (values.length - 1);
    const y = height - padding - ((value - minimum) / range) * (height - padding * 2);
    return String(x) + "," + String(y);
  }).join(" ");
  return (
    <div className="mt-3 rounded-xl bg-[#f5fafb] px-3 py-2">
      <svg viewBox="0 0 180 42" className="h-12 w-full" role="img" aria-label={label}>
        <polyline points={coordinates} fill="none" stroke="#24c1c4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>Earlier in period</span><span>Later in period</span></div>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[#71839a]"><Icon className="h-4 w-4 text-[#24c1c4]" /><span className="text-[10px] font-black uppercase tracking-[0.12em]">{label}</span></div>
      <p className="mt-3 text-2xl font-black tracking-tight text-[#0b2d54]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function ScoreRing({ percent, label, tone, size = 68 }: { percent: number | null; label: string; tone: StatusTone; size?: number }) {
  const styles = toneStyles(tone);
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const safePercent = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <div className="flex shrink-0 flex-col items-center gap-1" role="img" aria-label={percent === null ? label + ": not scored yet" : label + ": " + Math.round(safePercent) + " percent"}>
      <svg width={size} height={size} viewBox="0 0 64 64" className="block">
        <circle cx="32" cy="32" r={radius} fill="none" stroke={styles.track} strokeWidth="6" />
        {percent !== null && <circle cx="32" cy="32" r={radius} fill="none" stroke={styles.ring} strokeWidth="6" strokeLinecap="round" strokeDasharray={String(circumference)} strokeDashoffset={String(circumference * (1 - safePercent / 100))} transform="rotate(-90 32 32)" />}
        <text x="32" y="35" textAnchor="middle" fontSize={percent === null ? "16" : "13"} fontWeight="800" fill={styles.ring}>{percent === null ? "—" : Math.round(safePercent) + "%"}</text>
      </svg>
      <span className="text-center text-[9px] font-bold leading-3 text-slate-500">{label}</span>
    </div>
  );
}

function goalMetricSeries(report: Report | null, pattern: RegExp): SeriesPoint[] {
  return (report?.goalMetricEvents ?? [])
    .filter((event) => event.source !== "goal-baseline" && pattern.test([
      event.goalCategory, event.goalTitle, event.metricType, event.metricKey,
    ].filter(Boolean).join(" ").toLowerCase()))
    .flatMap((event) => {
      const value = finite(event.loggedValue);
      const timestamp = new Date(event.occurredAt).getTime();
      const date = dateKey(event.occurredAt);
      if (value === null || !Number.isFinite(timestamp) || !date) return [];
      return [{ value, timestamp, date, source: "Health goal log", unit: String(event.unit ?? "") }];
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

type LabSeriesPoint = SeriesPoint & { testName: string };

type MedicationDoseAction = { date: string; action: "TAKEN" | "SKIPPED"; source: "event" | "journal" };

function medicationDoseTotals(report: Report | null) {
  if (!report) return { eventActions: [] as MedicationDoseAction[], legacyActions: [] as MedicationDoseAction[], eventTaken: 0, eventSkipped: 0, eventTotal: 0, eventAdherencePercent: null as number | null, legacyTaken: 0, legacySkipped: 0, legacyTotal: 0 };
  const eventActions: MedicationDoseAction[] = [];
  const legacyActions: MedicationDoseAction[] = [];
  const eventDatesWithAction = new Set<string>();

  (report.goalMetricEvents ?? [])
    .filter((event) => String(event.metricType ?? "").toUpperCase() === "MEDICATION" &&
      String(event.metricKey ?? "").toLowerCase() === "medication.adherence" &&
      event.source === "medication-adherence")
    .forEach((event) => {
      let metadata: Record<string, unknown> | null = null;
      if (event.metadata && typeof event.metadata === "object") {
        metadata = event.metadata as Record<string, unknown>;
      } else if (typeof event.metadata === "string") {
        try { metadata = JSON.parse(event.metadata) as Record<string, unknown>; } catch { metadata = null; }
      }
      const action = String(metadata?.action ?? "").toUpperCase();
      const date = dateKey(event.occurredAt);
      if (!date || (action !== "TAKEN" && action !== "SKIPPED")) return;
      eventActions.push({ date, action, source: "event" });
      eventDatesWithAction.add(date);
    });

  // Older journal projections hold the last status for a medication/day, not one
  // row per dose. Keep these separate from the complete dose-level event counts.
  report.activity.journalEntries.forEach((entry) => {
    const text = [entry.title, entry.journal, entry.notes].map((value) => String(value ?? "")).join(" ").toLowerCase();
    if (!/medication adherence|dose marked (taken|skipped)/.test(text)) return;
    const actionMatch = text.match(/dose marked (taken|skipped)/);
    if (!actionMatch) return;
    const date = dateKey(entry.createdAt || entry.recordedAt || entry.updatedAt);
    if (!date || eventDatesWithAction.has(date)) return;
    legacyActions.push({ date, action: actionMatch[1].toUpperCase() as "TAKEN" | "SKIPPED", source: "journal" });
  });

  const eventTaken = eventActions.filter((item) => item.action === "TAKEN").length;
  const eventSkipped = eventActions.filter((item) => item.action === "SKIPPED").length;
  const legacyTaken = legacyActions.filter((item) => item.action === "TAKEN").length;
  const legacySkipped = legacyActions.filter((item) => item.action === "SKIPPED").length;
  const eventTotal = eventTaken + eventSkipped;
  const legacyTotal = legacyTaken + legacySkipped;
  return {
    eventActions, legacyActions,
    eventTaken, eventSkipped, eventTotal,
    eventAdherencePercent: eventTotal ? (eventTaken / eventTotal) * 100 : null,
    legacyTaken, legacySkipped, legacyTotal,
  };
}
function clinicalLabSeries(report: Report | null, pattern: RegExp): LabSeriesPoint[] {
  if (!report) return [];
  return report.clinical.labResults.flatMap((result) => {
    const dateValue = result.reportedAt || result.releasedAt;
    const timestamp = dateValue ? new Date(dateValue).getTime() : Number.NaN;
    const date = dateKey(dateValue);
    if (!date || !Number.isFinite(timestamp)) return [];
    return (result.items ?? []).flatMap((item) => {
      const test = item.test || result.orderItem?.test;
      const name = String(test?.name || "").trim();
      const value = finite(item.numericValue);
      if (!pattern.test(name.toLowerCase()) || value === null) return [];
      const unit = String(test?.unit?.symbol || test?.unit?.name || "");
      return [{ value, timestamp, date, source: "Laboratory result", testName: name, unit }];
    });
  }).sort((a, b) => a.timestamp - b.timestamp);
}

function namedClinicalDeviceSeries(
  report: Report | null,
  pattern: RegExp,
  exclude?: RegExp,
): SeriesPoint[] {
  if (!report) return [];
  const points: SeriesPoint[] = [];
  report.activity.deviceMeasurements.forEach((item) => {
    const name = [item.measurementType, item.metricKey, item.vitalType?.name].filter(Boolean).join(" ").toLowerCase();
    if (!pattern.test(name) || (exclude && exclude.test(name))) return;
    const value = finite(item.value);
    const timestamp = item.measuredAt ? new Date(item.measuredAt).getTime() : Number.NaN;
    const date = dateKey(item.measuredAt);
    if (value === null || !date || !Number.isFinite(timestamp)) return;
    points.push({ value, timestamp, date, source: "Connected device", unit: String(item.unit || item.vitalType?.unit || "") });
  });
  report.clinical.vitals.forEach((item) => {
    const name = [item.vitalType?.code, item.vitalType?.name].filter(Boolean).join(" ").toLowerCase();
    if (!pattern.test(name) || (exclude && exclude.test(name))) return;
    const value = finite(item.value);
    const measuredAt = item.measuredAt || item.recordedAt;
    const timestamp = measuredAt ? new Date(measuredAt).getTime() : Number.NaN;
    const date = dateKey(measuredAt);
    if (value === null || !date || !Number.isFinite(timestamp)) return;
    points.push({ value, timestamp, date, source: "Clinical measurement", unit: String(item.vitalType?.unit || "") });
  });
  return points.sort((a, b) => a.timestamp - b.timestamp);
}

function combineDatedSeries(...series: SeriesPoint[][]): SeriesPoint[] {
  const byIdentity = new Map<string, SeriesPoint>();
  series.flat().forEach((point) => {
    const key = point.timestamp + "|" + point.value + "|" + String(point.unit ?? "").toLowerCase();
    if (!byIdentity.has(key)) byIdentity.set(key, point);
  });
  return Array.from(byIdentity.values()).sort((a, b) => a.timestamp - b.timestamp);
}

function wellnessMetricSeries(report: Report | null, metricKey: string): SeriesPoint[] {
  if (!report) return [];
  return report.activity.wellnessMetrics
    .filter((item) => String(item.metricKey ?? "") === metricKey)
    .flatMap((item) => {
      const value = finite(item.value);
      const timestamp = item.measuredAt ? new Date(item.measuredAt).getTime() : Number.NaN;
      const date = dateKey(item.measuredAt);
      if (value === null || !date || !Number.isFinite(timestamp)) return [];
      return [{ value, timestamp, date, source: item.source ?? "Connected wellness metric", unit: String(item.unit ?? "") }];
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

function wellnessMetricSeriesMatching(report: Report | null, pattern: RegExp): SeriesPoint[] {
  if (!report) return [];
  const keys = Array.from(new Set(
    report.activity.wellnessMetrics
      .map((item) => String(item.metricKey ?? "").trim())
      .filter((key) => key && pattern.test(key.toLowerCase())),
  ));
  return keys.flatMap((key) => wellnessMetricSeries(report, key))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function dailySessionSeries(report: Report | null, field: "sleep" | "workout"): DailyValue[] {
  if (!report) return [];
  const grouped = new Map<string, number>();
  if (field === "sleep") {
    report.activity.sleepSessions.forEach((session) => {
      const key = dateKey(session.startedAt || session.endedAt);
      const minutes = finite(session.durationMinutes);
      if (!key || minutes === null || minutes <= 0) return;
      grouped.set(key, (grouped.get(key) ?? 0) + minutes / 60);
    });
  } else {
    report.activity.workouts.forEach((session) => {
      const key = dateKey(session.startedAt || session.endedAt);
      const seconds = finite(session.durationSeconds);
      if (!key || seconds === null || seconds <= 0) return;
      grouped.set(key, (grouped.get(key) ?? 0) + seconds / 60);
    });
  }
  return Array.from(grouped, ([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function symptomLogAnalytics(report: Report | null) {
  const logs = report?.activity.symptoms ?? [];
  const rank: Record<string, number> = { NONE: 0, MILD: 1, MODERATE: 2, SEVERE: 3, VERY_SEVERE: 4 };
  const severityValues = logs.flatMap((log) => {
    const recorded = [
      log.overallSeverity,
      ...(log.observations ?? []).map((item) => item.severity),
    ].map((value) => rank[String(value ?? "").toUpperCase()]).filter((value) => value !== undefined);
    return recorded.length ? [Math.max(...recorded)] : [];
  });
  const worseningCount = logs.filter((log) =>
    String(log.progression ?? "").toUpperCase() === "WORSENING" ||
    (log.observations ?? []).some((item) => String(item.progression ?? "").toUpperCase() === "WORSENING"),
  ).length;
  const severeCount = logs.filter((log) => {
    const all = [log.overallSeverity, ...(log.observations ?? []).map((item) => item.severity)]
      .map((value) => String(value ?? "").toUpperCase());
    return all.some((value) => value === "SEVERE" || value === "VERY_SEVERE");
  }).length;
  const triggers = new Map<string, { label: string; count: number; confirmed: number }>();
  logs.forEach((log) => (log.triggers ?? []).forEach((trigger) => {
    const label = String(trigger.trigger ?? "").trim();
    if (!label) return;
    const key = label.toLowerCase();
    const existing = triggers.get(key) ?? { label, count: 0, confirmed: 0 };
    existing.count += 1;
    if (trigger.confirmed) existing.confirmed += 1;
    triggers.set(key, existing);
  }));
  const effects = logs.flatMap((log) => log.medicationEffects ?? []);
  return {
    logCount: logs.length,
    averageSeverityRank: mean(severityValues),
    severeCount,
    worseningCount,
    repeatedTriggers: Array.from(triggers.values()).filter((item) => item.count > 1).sort((a, b) => b.count - a.count),
    medicationEffects: effects.length,
    improvedEffects: effects.filter((item) => item.improved === true).length,
    sideEffectReports: effects.filter((item) => Boolean(String(item.sideEffects ?? "").trim())).length,
  };
}

function dailySymptomSeries(report: Report | null): DailyValue[] {
  if (!report) return [];
  const grouped = new Map<string, number>();
  report.activity.symptoms.forEach((item) => {
    const key = dateKey(item.startedAt || item.createdAt);
    if (!key) return;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  });
  return Array.from(grouped, ([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function signalChange(current: DailyValue[], previous: DailyValue[], unit: string) {
  const currentAverage = mean(current.map((item) => item.value));
  const previousAverage = mean(previous.map((item) => item.value));
  if (currentAverage === null) {
    return previousAverage === null
      ? "No dated values"
      : "No current values · previous average " + formatNumber(previousAverage, 1) + (unit ? " " + unit : "");
  }
  if (previousAverage === null) {
    return "Current average " + formatNumber(currentAverage, 1) + (unit ? " " + unit : "") + " · no comparable prior values";
  }
  const delta = currentAverage - previousAverage;
  const relative = previousAverage === 0 ? "" : " (" + (delta > 0 ? "+" : "") + formatNumber(delta / Math.abs(previousAverage) * 100, 1) + "%)";
  return "vs previous average " + formatNumber(previousAverage, 1) + (unit ? " " + unit : "") + ": " +
    (delta > 0 ? "+" : "") + formatNumber(delta, 1) + (unit ? " " + unit : "") + relative;
}

function PersonalisedInsights({
  report,
  previousReport,
  previousLoading,
  coveragePercent,
  daysLogged,
  totalDays,
}: {
  report: Report;
  previousReport: Report | null;
  previousLoading: boolean;
  coveragePercent: number;
  daysLogged: number;
  totalDays: number;
}) {
  const goals = report.currentSnapshot?.activeGoals ?? [];
  const age = ageAt(report.currentSnapshot?.person?.dateOfBirth, report.generatedAt);
  const reviews = reportMeasurementReviews(report, age);
  const flaggedLabs = flaggedLabItems(report);
  const symptomCount = report.activity.symptoms.length;
  const previousSymptomCount = previousReport?.activity.symptoms.length ?? 0;
  const repeated = recurringSymptoms(report);
  const symptomAnalytics = symptomLogAnalytics(report);
  const previousSymptomAnalytics = symptomLogAnalytics(previousReport);

  const event = (reportValue: Report | null, pattern: RegExp) => goalMetricSeries(reportValue, pattern);
  const toDaily = (points: Array<{ date: string; value: number }>) => points.slice().sort((a, b) => a.date.localeCompare(b.date));
  const weightCurrentRaw = vitalSeries(report, "weight");
  const weightPreviousRaw = vitalSeries(previousReport, "weight");
  const weightCurrent = weightCurrentRaw.length ? weightCurrentRaw : event(report, /weight|body mass/);
  const weightPrevious = weightPreviousRaw.length ? weightPreviousRaw : event(previousReport, /weight|body mass/);
  const glucoseLabCurrent = clinicalLabSeries(report, /\bglucose\b/i);
  const glucoseLabPrevious = clinicalLabSeries(previousReport, /\bglucose\b/i);
  const glucoseLabCurrentSpecific = glucoseLabCurrent.filter((item) => !/hba1c|\ba1c\b|glycat|glycosylat/i.test(item.testName));
  const glucoseLabPreviousSpecific = glucoseLabPrevious.filter((item) => !/hba1c|\ba1c\b|glycat|glycosylat/i.test(item.testName));
  const a1cLabCurrent = clinicalLabSeries(report, /hba1c|\ba1c\b|glycat|glycosylat/i);
  const a1cLabPrevious = clinicalLabSeries(previousReport, /hba1c|\ba1c\b|glycat|glycosylat/i);
  const glucoseEventsCurrent = event(report, /blood glucose|glucose/);
  const glucoseEventsPrevious = event(previousReport, /blood glucose|glucose/);
  const glucoseMeasurementCurrent = combineDatedSeries(
    namedClinicalDeviceSeries(report, /glucose|blood.sugar|glycaemia|glycemia/i, /hba1c|\ba1c\b|glycat|glycosylat/i),
    wellnessMetricSeriesMatching(report, /glucose|blood.sugar/i),
  );
  const glucoseMeasurementPrevious = combineDatedSeries(
    namedClinicalDeviceSeries(previousReport, /glucose|blood.sugar|glycaemia|glycemia/i, /hba1c|\ba1c\b|glycat|glycosylat/i),
    wellnessMetricSeriesMatching(previousReport, /glucose|blood.sugar/i),
  );
  const glucoseCurrent = glucoseLabCurrentSpecific.length ? glucoseLabCurrentSpecific : glucoseMeasurementCurrent.length ? glucoseMeasurementCurrent : glucoseEventsCurrent;
  const glucosePrevious = glucoseLabPreviousSpecific.length ? glucoseLabPreviousSpecific : glucoseMeasurementPrevious.length ? glucoseMeasurementPrevious : glucoseEventsPrevious;

  const totalCholesterolLabCurrent = clinicalLabSeries(report, /total cholesterol|cholesterol total|serum cholesterol|^cholesterol$/i);
  const totalCholesterolLabPrevious = clinicalLabSeries(previousReport, /total cholesterol|cholesterol total|serum cholesterol|^cholesterol$/i);
  const totalCholesterolMeasuredCurrent = combineDatedSeries(
    namedClinicalDeviceSeries(report, /total cholesterol|cholesterol total|serum cholesterol|^cholesterol$/i),
    wellnessMetricSeriesMatching(report, /total.cholesterol|cholesterol.total/i),
  );
  const totalCholesterolMeasuredPrevious = combineDatedSeries(
    namedClinicalDeviceSeries(previousReport, /total cholesterol|cholesterol total|serum cholesterol|^cholesterol$/i),
    wellnessMetricSeriesMatching(previousReport, /total.cholesterol|cholesterol.total/i),
  );
  const totalCholesterolCurrent = totalCholesterolLabCurrent.length ? totalCholesterolLabCurrent : totalCholesterolMeasuredCurrent;
  const totalCholesterolPrevious = totalCholesterolLabPrevious.length ? totalCholesterolLabPrevious : totalCholesterolMeasuredPrevious;

  const ldlLabCurrent = clinicalLabSeries(report, /\bldl\b|low[- ]density lipoprotein/i);
  const ldlLabPrevious = clinicalLabSeries(previousReport, /\bldl\b|low[- ]density lipoprotein/i);
  const ldlMeasuredCurrent = combineDatedSeries(namedClinicalDeviceSeries(report, /\bldl\b|low[- ]density lipoprotein/i), wellnessMetricSeriesMatching(report, /\bldl\b|low.density.lipoprotein/i));
  const ldlMeasuredPrevious = combineDatedSeries(namedClinicalDeviceSeries(previousReport, /\bldl\b|low[- ]density lipoprotein/i), wellnessMetricSeriesMatching(previousReport, /\bldl\b|low.density.lipoprotein/i));
  const ldlCurrent = ldlLabCurrent.length ? ldlLabCurrent : ldlMeasuredCurrent;
  const ldlPrevious = ldlLabPrevious.length ? ldlLabPrevious : ldlMeasuredPrevious;

  const hdlLabCurrent = clinicalLabSeries(report, /\bhdl\b|high[- ]density lipoprotein/i);
  const hdlLabPrevious = clinicalLabSeries(previousReport, /\bhdl\b|high[- ]density lipoprotein/i);
  const hdlMeasuredCurrent = combineDatedSeries(namedClinicalDeviceSeries(report, /\bhdl\b|high[- ]density lipoprotein/i), wellnessMetricSeriesMatching(report, /\bhdl\b|high.density.lipoprotein/i));
  const hdlMeasuredPrevious = combineDatedSeries(namedClinicalDeviceSeries(previousReport, /\bhdl\b|high[- ]density lipoprotein/i), wellnessMetricSeriesMatching(previousReport, /\bhdl\b|high.density.lipoprotein/i));
  const hdlCurrent = hdlLabCurrent.length ? hdlLabCurrent : hdlMeasuredCurrent;
  const hdlPrevious = hdlLabPrevious.length ? hdlLabPrevious : hdlMeasuredPrevious;

  const triglyceridesLabCurrent = clinicalLabSeries(report, /triglyceride/i);
  const triglyceridesLabPrevious = clinicalLabSeries(previousReport, /triglyceride/i);
  const triglyceridesMeasuredCurrent = combineDatedSeries(namedClinicalDeviceSeries(report, /triglyceride/i), wellnessMetricSeriesMatching(report, /triglyceride/i));
  const triglyceridesMeasuredPrevious = combineDatedSeries(namedClinicalDeviceSeries(previousReport, /triglyceride/i), wellnessMetricSeriesMatching(previousReport, /triglyceride/i));
  const triglyceridesCurrent = triglyceridesLabCurrent.length ? triglyceridesLabCurrent : triglyceridesMeasuredCurrent;
  const triglyceridesPrevious = triglyceridesLabPrevious.length ? triglyceridesLabPrevious : triglyceridesMeasuredPrevious;
  const anyLipidLab = totalCholesterolLabCurrent.length + totalCholesterolLabPrevious.length + ldlLabCurrent.length + ldlLabPrevious.length + hdlLabCurrent.length + hdlLabPrevious.length + triglyceridesLabCurrent.length + triglyceridesLabPrevious.length > 0;
  const cholesterolEventsCurrent = event(report, /cholesterol|lipid|triglyceride|\bldl\b|\bhdl\b/);
  const cholesterolEventsPrevious = event(previousReport, /cholesterol|lipid|triglyceride|\bldl\b|\bhdl\b/);

  const smokingCurrent = event(report, /smoking|tobacco|cigarette/);
  const smokingPrevious = event(previousReport, /smoking|tobacco|cigarette/);
  const alcoholCurrent = event(report, /alcohol|drinking/);
  const alcoholPrevious = event(previousReport, /alcohol|drinking/);
  const doseCurrent = medicationDoseTotals(report);
  const dosePrevious = medicationDoseTotals(previousReport);
  const nutritionCurrent = event(report, /nutrition|calorie|energy intake/);
  const nutritionPrevious = event(previousReport, /nutrition|calorie|energy intake/);
  const hydrationEventsCurrent = event(report, /hydration|water intake/);
  const hydrationEventsPrevious = event(previousReport, /hydration|water intake/);
  const exerciseEventsCurrent = event(report, /exercise|physical activity|workout|fitness/);
  const exerciseEventsPrevious = event(previousReport, /exercise|physical activity|workout|fitness/);
  const sleepChecksCurrent = dailyMetric(report, "sleepHours");
  const sleepChecksPrevious = dailyMetric(previousReport, "sleepHours");
  const sleepSessionsCurrent = dailySessionSeries(report, "sleep");
  const sleepSessionsPrevious = dailySessionSeries(previousReport, "sleep");
  const exerciseChecksCurrent = dailyMetric(report, "exerciseMinutes");
  const exerciseChecksPrevious = dailyMetric(previousReport, "exerciseMinutes");
  const workoutsCurrent = dailySessionSeries(report, "workout");
  const workoutsPrevious = dailySessionSeries(previousReport, "workout");
  const stressCurrent = dailyMetric(report, "stressLevel");
  const stressPrevious = dailyMetric(previousReport, "stressLevel");
  const hydrationChecksCurrent = dailyMetric(report, "waterIntakeMl");
  const hydrationChecksPrevious = dailyMetric(previousReport, "waterIntakeMl");

  type SignalPoint = { date: string; value: number; unit?: string };
  const signal = (key: string, label: string, currentPoints: SignalPoint[], previousPoints: SignalPoint[], fallbackUnit = "") => {
    const unit = String(currentPoints.at(-1)?.unit || fallbackUnit || previousPoints.at(-1)?.unit || "").trim();
    const currentHasSourceUnits = currentPoints.some((point) => Boolean(point.unit?.trim()));
    const previousHasSourceUnits = previousPoints.some((point) => Boolean(point.unit?.trim()));
    const filterComparableUnit = (points: SignalPoint[]) => {
      if (!unit || (!currentHasSourceUnits && !previousHasSourceUnits)) return points;
      return points.filter((point) => String(point.unit ?? "").trim().toLowerCase() === unit.toLowerCase());
    };
    return {
      key,
      label,
      unit,
      current: toDaily(filterComparableUnit(currentPoints)),
      previous: toDaily(filterComparableUnit(previousPoints)),
    };
  };
  const baseSignals: Array<{ key: string; label: string; unit: string; current: DailyValue[]; previous: DailyValue[] }> = [
    signal("weight", "Weight", weightCurrent, weightPrevious, "kg"),
    signal("glucose", "Blood glucose", glucoseCurrent, glucosePrevious, glucoseLabCurrentSpecific.at(-1)?.unit || glucoseLabPreviousSpecific.at(-1)?.unit || "mmol/L"),
    ...(a1cLabCurrent.length || a1cLabPrevious.length ? [
      signal("hba1c", "HbA1c", a1cLabCurrent, a1cLabPrevious, a1cLabCurrent.at(-1)?.unit || a1cLabPrevious.at(-1)?.unit || "%"),
    ] : []),
    ...(totalCholesterolCurrent.length || totalCholesterolPrevious.length ? [
      signal("total-cholesterol", "Total cholesterol", totalCholesterolCurrent, totalCholesterolPrevious, totalCholesterolCurrent.at(-1)?.unit || totalCholesterolPrevious.at(-1)?.unit || ""),
    ] : []),
    ...(ldlCurrent.length || ldlPrevious.length ? [
      signal("ldl", "LDL cholesterol", ldlCurrent, ldlPrevious, ldlCurrent.at(-1)?.unit || ldlPrevious.at(-1)?.unit || ""),
    ] : []),
    ...(hdlCurrent.length || hdlPrevious.length ? [
      signal("hdl", "HDL cholesterol", hdlCurrent, hdlPrevious, hdlCurrent.at(-1)?.unit || hdlPrevious.at(-1)?.unit || ""),
    ] : []),
    ...(triglyceridesCurrent.length || triglyceridesPrevious.length ? [
      signal("triglycerides", "Triglycerides", triglyceridesCurrent, triglyceridesPrevious, triglyceridesCurrent.at(-1)?.unit || triglyceridesPrevious.at(-1)?.unit || ""),
    ] : []),
    ...(!anyLipidLab && (cholesterolEventsCurrent.length || cholesterolEventsPrevious.length) ? [
      signal("cholesterol-goal", "Cholesterol goal log", cholesterolEventsCurrent, cholesterolEventsPrevious, "mmol/L"),
    ] : []),
    signal("smoking", "Cigarettes logged", smokingCurrent, smokingPrevious, "cigarettes"),
    signal("alcohol", "Alcohol logged", alcoholCurrent, alcoholPrevious, "drinks"),
    signal("nutrition", "Nutrition / calories", nutritionCurrent, nutritionPrevious, ""),
    signal("hydration", "Water intake", hydrationEventsCurrent.length ? hydrationEventsCurrent : hydrationChecksCurrent, hydrationEventsPrevious.length ? hydrationEventsPrevious : hydrationChecksPrevious, "ml"),
    signal("exercise", "Exercise logged", exerciseEventsCurrent.length ? exerciseEventsCurrent : exerciseChecksCurrent, exerciseEventsPrevious.length ? exerciseEventsPrevious : exerciseChecksPrevious, "min"),
    signal("workouts", "Workout sessions", workoutsCurrent, workoutsPrevious, "min/day"),
    signal("sleep-checkin", "Sleep check-ins", sleepChecksCurrent, sleepChecksPrevious, "hours"),
    signal("sleep-session", "Connected sleep", sleepSessionsCurrent, sleepSessionsPrevious, "hours/day"),
    signal("stress", "Stress rating", stressCurrent, stressPrevious, "/10"),
    signal("symptoms", "Symptom logs", dailySymptomSeries(report), dailySymptomSeries(previousReport), "logs/day"),
  ].filter((item) => item.current.length > 0 || item.previous.length > 0);

  const wellnessKeyAlreadyRepresented = (key: string) => {
    const normalized = key.toLowerCase();
    const has = (...series: Array<{ length: number }>) => series.some((item) => item.length > 0);
    if (/weight|body.?mass/.test(normalized)) return has(weightCurrent, weightPrevious);
    if (/hba1c|a1c|glycat|glycosylat/.test(normalized)) return has(a1cLabCurrent, a1cLabPrevious);
    if (/glucose/.test(normalized)) return has(glucoseCurrent, glucosePrevious);
    if (/cholesterol|lipid|triglyceride|\\bldl\\b|\\bhdl\\b/.test(normalized)) return anyLipidLab || has(cholesterolEventsCurrent, cholesterolEventsPrevious);
    if (/smoking|tobacco|cigarette/.test(normalized)) return has(smokingCurrent, smokingPrevious);
    if (/alcohol|drink/.test(normalized)) return has(alcoholCurrent, alcoholPrevious);
    if (/medication|adherence/.test(normalized)) return doseCurrent.eventTotal > 0 || doseCurrent.legacyTotal > 0;
    if (/nutrition|calorie|energy.intake/.test(normalized)) return has(nutritionCurrent, nutritionPrevious);
    if (/hydration|water/.test(normalized)) return has(hydrationEventsCurrent, hydrationEventsPrevious, hydrationChecksCurrent, hydrationChecksPrevious);
    if (/exercise|workout|fitness|active.minutes/.test(normalized)) return has(exerciseEventsCurrent, exerciseEventsPrevious, exerciseChecksCurrent, exerciseChecksPrevious, workoutsCurrent, workoutsPrevious);
    if (/sleep/.test(normalized)) return has(sleepChecksCurrent, sleepChecksPrevious, sleepSessionsCurrent, sleepSessionsPrevious);
    if (/stress/.test(normalized)) return has(stressCurrent, stressPrevious);
    if (/heart.?rate|pulse|\\bbpm\\b/.test(normalized)) return has(vitalSeries(report, "heartRate"), vitalSeries(previousReport, "heartRate"));
    if (/blood.?pressure|systolic|diastolic|\\bsbp\\b|\\bdbp\\b/.test(normalized)) return has(vitalSeries(report, "systolic"), vitalSeries(report, "diastolic"), vitalSeries(previousReport, "systolic"), vitalSeries(previousReport, "diastolic"));
    if (/oxygen|spo2|temperature|respiratory|breathing/.test(normalized)) return has(
      vitalSeries(report, "oxygen"), vitalSeries(previousReport, "oxygen"),
      vitalSeries(report, "temperature"), vitalSeries(previousReport, "temperature"),
      vitalSeries(report, "respiratory"), vitalSeries(previousReport, "respiratory"),
    );
    return false;
  };
  const wellnessKeys = Array.from(new Set([
    ...(report.activity.wellnessMetrics ?? []).map((item) => String(item.metricKey ?? "").trim()).filter(Boolean),
    ...(previousReport?.activity.wellnessMetrics ?? []).map((item) => String(item.metricKey ?? "").trim()).filter(Boolean),
  ])).filter((key) => !wellnessKeyAlreadyRepresented(key));
  const wearableSignals = wellnessKeys.map((key) => {
    const current = wellnessMetricSeries(report, key);
    const previous = wellnessMetricSeries(previousReport, key);
    return signal("wearable:" + key, human(key), current, previous, current.at(-1)?.unit || previous.at(-1)?.unit || "");
  }).filter((item) => item.current.length > 0 || item.previous.length > 0);
  const signals = [...baseSignals, ...wearableSignals];

  const recommendations: Array<{ title: string; evidence: string; action: string; tone: StatusTone; href: string; linkLabel: string }> = [];
  const urgentReviews = reviews.filter((item) => item.severity === "urgent");
  if (urgentReviews.length) {
    const review = urgentReviews[0];
    recommendations.push({
      title: "Urgent measurement needs review",
      evidence: review.label + ": " + formatNumber(review.value, review.key === "temperature" || review.key === "oxygen" ? 1 : 0) + " " + review.unit + " · " + dateLabel(new Date(review.timestamp).toISOString()),
      action: review.key === "oxygen" ? "Recheck immediately and seek emergency help if it remains low; do not delay if unwell." : review.key === "temperature" ? "Verify the unit and measurement; seek urgent medical help if the reading is current and accurate." : review.key === "respiratory" ? "If this is your current resting rate, seek urgent medical advice; severe breathing difficulty needs emergency help." : "Repeat the measurement after resting; get urgent help for severe symptoms.",
      tone: "critical",
      href: "/today",
      linkLabel: "Review measurement",
    });
  }
  if (flaggedLabs.length > 0) {
    recommendations.push({
      title: "Follow up flagged laboratory results",
      evidence: flaggedLabs.length + " result item(s) are marked abnormal or critical in the clinical record.",
      action: "Review the dated result and its clinical interpretation with your healthcare professional.",
      tone: flaggedLabs.some((item) => item.critical) ? "critical" : "watch",
      href: "/health-records",
      linkLabel: "Review lab results",
    });
  }
  const symptomDelta = symptomCount - previousSymptomCount;
  if (symptomCount >= 2 && symptomDelta > 0) {
    const topSymptom = repeated.find((item) => item.count > 1);
    recommendations.push({
      title: "Symptom logging increased",
      evidence: symptomCount + " symptom logs this period · +" + symptomDelta + " vs previous period" + (topSymptom ? " · repeated: " + topSymptom.label + " (" + topSymptom.count + ")" : ""),
      action: "Review whether symptoms are recurring, worsening or affecting daily life, and discuss them with a healthcare professional when appropriate.",
      tone: "watch",
      href: "/health-journal",
      linkLabel: "Review symptom history",
    });
  }
  if (symptomAnalytics.worseningCount > 0 || symptomAnalytics.severeCount > 0) {
    recommendations.push({
      title: "Worsening or severe symptoms recorded",
      evidence: symptomAnalytics.worseningCount + " log(s) with worsening progression · " + symptomAnalytics.severeCount + " log(s) with severe/very severe ratings" +
        (previousReport ? " · previous period: " + previousSymptomAnalytics.worseningCount + " worsening" : ""),
      action: "Review the symptom timeline. Seek prompt medical advice for severe or worsening symptoms; use emergency services for emergency symptoms.",
      tone: symptomAnalytics.severeCount > 0 ? "high" : "watch",
      href: "/health-journal",
      linkLabel: "Review symptom timeline",
    });
  }
  if (symptomAnalytics.sideEffectReports > 0) {
    recommendations.push({
      title: "Medication side effects recorded",
      evidence: symptomAnalytics.sideEffectReports + " symptom log(s) include a reported medication side effect.",
      action: "Discuss these reports with the prescriber or pharmacist before changing a medicine.",
      tone: "watch",
      href: "/health-journal",
      linkLabel: "Review symptom and medication notes",
    });
  }
  const latestGoalIssues = goals.filter((goal) => ["DECLINING", "STAGNANT"].includes(String(goal.progress?.[0]?.status ?? "").toUpperCase()));
  if (latestGoalIssues.length) {
    recommendations.push({
      title: "Goal trend needs a check",
      evidence: latestGoalIssues.length + " active goal(s) have a latest saved status of declining or stagnant.",
      action: "Check the latest recorded values against each goal’s saved target; adjust the plan with your care team where needed.",
      tone: "watch",
      href: "/health-goals",
      linkLabel: "Review goals",
    });
  }
  const stressAverage = mean(stressCurrent.map((item) => item.value));
  const priorStressAverage = mean(stressPrevious.map((item) => item.value));
  if (stressAverage !== null && stressAverage >= 7 && (stressAverage > (priorStressAverage ?? -Infinity) || stressAverage >= 8)) {
    recommendations.push({
      title: "High stress check-ins",
      evidence: "Average stress rating " + formatNumber(stressAverage, 1) + "/10" + (priorStressAverage === null ? "" : " · previous " + formatNumber(priorStressAverage, 1) + "/10"),
      action: "Prioritise a wellbeing check-in and seek support if this level persists or feels difficult to manage.",
      tone: "watch",
      href: "/today",
      linkLabel: "Open check-in",
    });
  }
  const sleepAverage = mean((sleepChecksCurrent.length ? sleepChecksCurrent : sleepSessionsCurrent).map((item) => item.value));
  if (sleepAverage !== null && sleepAverage < 6) {
    recommendations.push({
      title: "Short sleep recorded",
      evidence: "Average recorded sleep " + formatNumber(sleepAverage, 1) + " hours on days with entries.",
      action: "Review sleep consistency and consider discussing persistent sleep difficulties with a healthcare professional.",
      tone: "watch",
      href: "/today",
      linkLabel: "Review check-in",
    });
  }
  const medicineGoal = goals.find((goal) => /MEDICATION/.test(String(goal.category ?? "").toUpperCase()));
  const doseTarget = finite(medicineGoal?.targetValue);
  if (doseCurrent.eventSkipped > 0 || doseCurrent.legacySkipped > 0 ||
      (doseCurrent.eventAdherencePercent !== null && doseTarget !== null && doseCurrent.eventAdherencePercent < doseTarget)) {
    recommendations.push({
      title: "Medication dose records need review",
      evidence: doseCurrent.eventTotal > 0
        ? doseCurrent.eventTaken + " marked taken · " + doseCurrent.eventSkipped + " marked skipped · " + formatNumber(doseCurrent.eventAdherencePercent, 1) + "% of logged doses taken" + (doseTarget !== null ? " · goal " + formatNumber(doseTarget, 1) + "%" : "")
        : doseCurrent.legacyTotal + " older dated status entries · " + doseCurrent.legacyTaken + " marked taken · " + doseCurrent.legacySkipped + " marked skipped",
      action: "Review skipped or difficult-to-log doses with your care team; do not change a prescription based on this report.",
      tone: "watch",
      href: "/today",
      linkLabel: "Review medication logs",
    });
  }

  const noPrior = previousReport === null;
  const coverageTone: StatusTone = coveragePercent >= 75 ? "good" : coveragePercent >= 40 ? "watch" : "high";

  return (
    <section aria-label="Health trends and recommendations" className="space-y-5">
      <section className="rounded-2xl border border-[#dcebed] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ScoreRing percent={coveragePercent} label="Days with records" tone={coverageTone} size={64} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b7b80]">Period comparison</p>
            <h2 className="mt-1 text-lg font-black text-[#0b2d54]">What changed</h2>
            <p className="mt-1 text-xs text-slate-500">{daysLogged}/{totalDays} days with at least one saved record · {previousLoading ? "Comparing…" : noPrior ? "No previous-period report available" : "Current period vs previous period"}</p>
          </div>
        </div>
        {(doseCurrent.eventTotal > 0 || doseCurrent.legacyTotal > 0 || dosePrevious.eventTotal > 0 || dosePrevious.legacyTotal > 0) && (
          <article className="mt-4 rounded-xl border border-slate-200 bg-[#f8fbfc] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[#0b2d54]">Medication dose outcomes</h3>
                <p className="mt-1 text-[11px] text-slate-500">Recorded actions only; this is not an independent check that a dose was taken.</p>
              </div>
              {doseCurrent.eventTotal > 0 && <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0b2d54]">{formatNumber(doseCurrent.eventAdherencePercent, 1)}% taken</span>}
            </div>
            {doseCurrent.eventTotal > 0 ? (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Taken</p><p className="mt-1 text-xl font-black text-emerald-700">{doseCurrent.eventTaken}</p></div>
                  <div className="rounded-lg bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Skipped</p><p className="mt-1 text-xl font-black text-rose-700">{doseCurrent.eventSkipped}</p></div>
                  <div className="rounded-lg bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</p><p className="mt-1 text-xl font-black text-[#0b2d54]">{doseCurrent.eventTotal}</p></div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-rose-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: String(doseCurrent.eventAdherencePercent ?? 0) + "%" }} /></div>
                <p className="mt-2 text-xs font-semibold text-slate-600">{dosePrevious.eventTotal > 0
                  ? "Previous period: " + dosePrevious.eventTaken + " taken / " + dosePrevious.eventSkipped + " skipped (" + formatNumber(dosePrevious.eventAdherencePercent, 1) + "% taken). " + (doseCurrent.eventAdherencePercent !== null && dosePrevious.eventAdherencePercent !== null ? (doseCurrent.eventAdherencePercent - dosePrevious.eventAdherencePercent > 0 ? "+" : "") + formatNumber(doseCurrent.eventAdherencePercent - dosePrevious.eventAdherencePercent, 1) + " percentage points." : "")
                  : "No dose-level action metadata available for the previous period."}</p>
              </>
            ) : (
              <p className="mt-3 text-sm font-semibold text-[#0b2d54]">Older dated statuses: {doseCurrent.legacyTaken} marked taken · {doseCurrent.legacySkipped} marked skipped.</p>
            )}
            {doseCurrent.legacyTotal > 0 && doseCurrent.eventTotal > 0 && <p className="mt-2 text-[10px] text-slate-400">Also found {doseCurrent.legacyTotal} legacy day-status entries; excluded from the dose-level percentage to avoid mixing counting methods.</p>}
          </article>
        )}
        {signals.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {signals.map((signal) => {
              const currentAverage = mean(signal.current.map((item) => item.value));
              const previousAverage = mean(signal.previous.map((item) => item.value));
              const latest = signal.current[signal.current.length - 1];
              const unit = signal.unit ? " " + signal.unit : "";
              return (
                <article key={signal.key} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-black text-[#0b2d54]">{signal.label}</h3>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-2xl font-black text-[#0b2d54]">{currentAverage === null ? "—" : formatNumber(currentAverage, 1)}{unit}</span>
                    <span className="text-[10px] font-semibold text-slate-400">average</span>
                  </div>
                  {latest && <p className="mt-1 text-[11px] text-slate-500">Latest {formatNumber(latest.value, 1)}{unit} · {dateLabel(latest.date)}</p>}
                  <p className="mt-2 text-xs font-semibold text-slate-600">{signalChange(signal.current, signal.previous, signal.unit)}</p>
                  <MiniTrend values={signal.current.map((item) => item.value)} label={signal.label + " current-period trend"} />
                  <p className="mt-2 text-[10px] text-slate-400">{signal.current.length} current value(s){signal.previous.length ? " · " + signal.previous.length + " previous value(s)" : ""}</p>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No comparable numeric logs were returned for this period.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b7b80]">Rule-based intelligence</p>
            <h2 className="mt-1 text-lg font-black text-[#0b2d54]">Recommended actions</h2>
          </div>
          <span className="text-xs text-slate-400">{recommendations.length} signal(s)</span>
        </div>
        {recommendations.length ? (
          <div className="mt-3 divide-y divide-slate-100">
            {recommendations.slice(0, 5).map((item) => (
              <div key={item.title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className={"mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full " + (item.tone === "critical" ? "bg-rose-600" : item.tone === "high" ? "bg-orange-500" : item.tone === "watch" ? "bg-amber-500" : "bg-teal-500")} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[#0b2d54]">{item.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-600">{item.evidence}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.action}</p>
                  <Link href={item.href} className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-lg bg-[#0b2d54] px-3 py-1.5 text-[10px] font-bold text-white">{item.linkLabel} <ArrowRight className="h-3 w-3 text-[#24c1c4]" /></Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No rule-based follow-up was triggered by the available measurements, laboratory flags, symptom counts or goal-status records.</p>
        )}
      </section>
    </section>
  );
}

function GoalProgressTrendCard({ item, previousLoading }: { item: GoalProgressTrendItem; previousLoading: boolean }) {
  const values = item.current.map((entry) => entry.value);
  const currentMean = mean(values);
  const first = item.current[0]?.value ?? null;
  const latest = item.current[item.current.length - 1]?.value ?? null;
  const change = first !== null && latest !== null ? latest - first : null;
  const status = item.latestStatus ? human(item.latestStatus) : "Status not recorded";

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#0b7b80]">{human(item.category || "Health goal")}</p>
          <h3 className="mt-1 font-bold text-[#0b2d54]">{item.title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{item.current.length} dated {item.current.length === 1 ? "update" : "updates"} in this period</p>
        </div>
        <ScoreRing percent={item.valueKind === "percent" ? latest : null} label={item.valueKind === "percent" ? "Latest progress" : "Recorded trend"} tone={item.latestStatus === "DECLINING" ? "watch" : item.latestStatus === "ACHIEVED" || item.latestStatus === "IMPROVING" || item.latestStatus === "ON_TRACK" ? "good" : "info"} size={64} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Latest recorded</p>
          <p className="mt-1 text-xl font-black text-[#0b2d54]">{latest === null ? "—" : formatNumber(latest, 1)} <span className="text-xs font-bold text-slate-500">{item.unit}</span></p>
          <p className="mt-1 text-[10px] text-slate-500">{dateLabel(item.current[item.current.length - 1]?.date)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Period average</p>
          <p className="mt-1 text-xl font-black text-[#0b2d54]">{currentMean === null ? "—" : formatNumber(currentMean, 1)} <span className="text-xs font-bold text-slate-500">{item.unit}</span></p>
          <p className="mt-1 text-[10px] text-slate-500">{status}</p>
        </div>
      </div>
      <MiniTrend values={values} label={item.title + " saved goal progress trend"} />
      <p className="mt-3 text-xs leading-5 text-slate-600">
        {change === null ? "Only one dated value is available, so a within-period change cannot be calculated." :
          "From the first to the latest dated update, the recorded value " + (change === 0 ? "stayed the same" : (change > 0 ? "increased by " : "decreased by ") + formatNumber(Math.abs(change), 1) + (item.unit ? " " + item.unit : "")) + "."}
        {" "}{compareText(values, item.previous.map((entry) => entry.value), item.unit, 1, previousLoading)}
      </p>
      {item.targetValue !== null && item.valueKind === "current" && <p className="mt-2 text-[11px] leading-4 text-slate-500">Saved goal target: {formatNumber(item.targetValue, 1)} {item.unit}. Direction and clinical meaning depend on this goal&apos;s definition.</p>}
    </article>
  );
}

function RoutineTrendCard({
  icon: Icon,
  title,
  subtitle,
  current,
  previous,
  unit,
  digits = 1,
  previousLoading,
}: {
  icon: typeof Activity;
  title: string;
  subtitle: string;
  current: DailyValue[];
  previous: DailyValue[];
  unit: string;
  digits?: number;
  previousLoading: boolean;
}) {
  const currentMean = mean(current.map((item) => item.value));
  const values = current.map((item) => item.value);
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><h3 className="font-bold text-[#0b2d54]">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p></div>
      </div>
      {currentMean === null ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No entries for this measure in the selected period.</div>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-2"><p className="text-2xl font-black tracking-tight text-[#0b2d54]">{formatNumber(currentMean, digits)} <span className="text-sm font-bold text-slate-500">{unit}</span></p><span className="text-[10px] text-slate-400">{current.length} {current.length === 1 ? "day with an entry" : "days with entries"}</span></div>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">Average on days with a saved value. Days without an entry are not counted as zero.</p>
          <MiniTrend values={values} label={title + " daily trend"} />
          <p className="mt-3 text-xs leading-5 text-slate-500">{compareText(values, previous.map((item) => item.value), unit, digits, previousLoading)}</p>
        </>
      )}
    </article>
  );
}

function VitalTrendCard({
  label,
  description,
  unit,
  digits,
  current,
  previous,
  previousLoading,
  review,
  status,
  baselineValue,
  rawCurrent,
}: {
  label: string;
  description: string;
  unit: string;
  digits: number;
  current: SeriesPoint[];
  previous: SeriesPoint[];
  previousLoading: boolean;
  review: MeasurementReview | null;
  status: VitalStatusAssessment;
  baselineValue: number | null;
  rawCurrent: SeriesPoint[];
}) {
  const currentValues = current.map((item) => item.value);
  const previousValues = previous.map((item) => item.value);
  const average = mean(currentValues);
  const latest = rawCurrent[rawCurrent.length - 1] ?? current[current.length - 1];
  const first = current[0];
  const excludedCount = Math.max(0, rawCurrent.length - current.length);
  const change = latest && first ? latest.value - first.value : null;
  const changeText = change === null
    ? "Not enough readings to compare."
    : Math.abs(change) < 0.05
      ? "The first and most recent readings were very similar."
      : "From the first to the most recent reading: " + (change > 0 ? "+" : "") + formatNumber(change, digits) + " " + unit + ".";
  const baselineDelta = latest && baselineValue !== null ? latest.value - baselineValue : null;
  const baselineComparison = baselineDelta === null
    ? null
    : Math.abs(baselineDelta) < (digits === 0 ? 0.5 : 0.05)
      ? "Your most recent reading is close to your recorded baseline of " + formatNumber(baselineValue, digits) + " " + unit + "."
      : "Your most recent reading is " + formatNumber(Math.abs(baselineDelta), digits) + " " + unit + (baselineDelta > 0 ? " above" : " below") + " your recorded baseline of " + formatNumber(baselineValue, digits) + " " + unit + ". This difference alone does not show a cause or diagnosis.";
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#0b2d54]">{label}</p>
          <p className="mt-1 text-[11px] text-slate-500">{rawCurrent.length} {rawCurrent.length === 1 ? "reading" : "readings"} saved in this period</p>
          {excludedCount > 0 && <p className="mt-1 text-[10px] font-bold text-amber-800">{excludedCount} flagged or out-of-scale {excludedCount === 1 ? "value is" : "values are"} excluded from the trend average and shown in the review alerts.</p>}
        </div>
        <HeartPulse className="h-5 w-5 shrink-0 text-[#24c1c4]" />
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
      <div className="mt-3"><StatusCircle label={status.label} detail={status.detail} tone={status.tone} /></div>
      {average === null ? (
        <p className="mt-4 text-sm text-slate-500">{rawCurrent.length > 0 ? "No values from this measure were used in the trend because the saved values need review. See the alert above." : "No readings were saved for this period."}</p>
      ) : (
        <>
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Average for this period</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-[#0b2d54]">
              {formatNumber(average, digits)} <span className="text-sm font-bold text-slate-500">{unit}</span>
            </p>
            {latest && <p className="mt-1 text-xs text-slate-500">Most recent: {formatNumber(latest.value, digits)} {unit} · {dateLabel(new Date(latest.timestamp).toISOString())}</p>}
            {latest?.convertedFrom && <p className="mt-1 text-[10px] leading-4 text-slate-500">Converted for this report from {formatNumber(latest.convertedFrom.value, 1)} {latest.convertedFrom.unit}.</p>}
          </div>
          <MiniTrend values={currentValues} label={label + " trend"} />
          {review ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
              Check these saved values before interpreting the trend. See “Readings to double-check” above.
            </p>
          ) : (
            <p className="mt-3 text-xs leading-5 text-slate-600">{changeText}</p>
          )}
          {baselineValue !== null && (
            <p className="mt-3 rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
              {review ? "Baseline comparison is paused until the flagged saved values are checked." : baselineComparison}
            </p>
          )}
          <div className="mt-3 rounded-xl bg-[#f5fafb] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#71839a]">Compared with the previous period</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{review ? "Please verify these saved values before comparing this period with the previous one." : compareText(currentValues, previousValues, unit, digits, previousLoading)}</p>
          </div>
        </>
      )}
    </article>
  );
}


function clinicalEvents(report: Report) {
  return report.clinical.encounters.length +
    report.clinical.diagnoses.length +
    report.clinical.prescriptions.length +
    report.clinical.notes.length +
    report.clinical.vitals.length +
    report.clinical.labResults.length +
    report.clinical.imaging.length +
    report.clinical.procedures.length +
    report.clinical.carePlans.length +
    report.clinical.referrals.length;
}

function flaggedLabItems(report: Report) {
  return report.clinical.labResults.flatMap((result, resultIndex) =>
    (result.items ?? []).flatMap((item, itemIndex) =>
      item.abnormal || item.critical
        ? [{
            id: String(item.id || `${result.id || "lab-result"}-${resultIndex}-${itemIndex}`),
            name: item.test?.name || result.orderItem?.test?.name || "Laboratory result",
            value: item.numericValue ?? item.textValue ?? item.booleanValue ?? "Value not recorded",
            critical: Boolean(item.critical),
            date: result.reportedAt || result.releasedAt,
          }]
        : [],
    ),
  );
}

function HealthReportInsights({
  report,
  previousReport,
  previousLoading,
}: {
  report: Report;
  previousReport: Report | null;
  previousLoading: boolean;
}) {
  const daysLogged = recordedDays(report).size;
  const totalDays = periodDays(report);
  const symptomCount = report.activity.symptoms.length;
  const workouts = report.activity.workouts;
  const workoutMinutes = workouts.reduce((sum: number, workout) => {
    const seconds = finite(workout.durationSeconds);
    return sum + (seconds === null ? 0 : seconds / 60);
  }, 0);
  const sleepSessions = report.activity.sleepSessions.filter((session) => finite(session.durationMinutes) !== null && Number(session.durationMinutes) > 0);
  const sleepHours = sleepSessions.map((session) => Number(session.durationMinutes) / 60);
  const lowMood = lowMoodCounts(report);
  const goalProgressItems = goalProgressTrendItems(report, previousReport);
  const repeated = recurringSymptoms(report);
  const association = routineAssociation(report);
  const flaggedLabs = flaggedLabItems(report);
  const clinicalCount = clinicalEvents(report);
  const previousSymptomCount = previousReport?.activity.symptoms.length ?? 0;
  const symptomDifference = previousReport
    ? symptomCount - previousSymptomCount
    : null;
  const symptomComparison = previousReport
    ? symptomCount === 0 && previousSymptomCount === 0
      ? "No symptom logs in either period."
      : symptomCount === 0
        ? "No symptoms were logged this period; " + previousSymptomCount + " in the previous period."
        : symptomDifference === 0
          ? "Same number as the previous period: " + symptomCount + "."
          : String(Math.abs(symptomDifference)) + " " + (symptomDifference > 0 ? "more" : "fewer") + " symptom " + (Math.abs(symptomDifference) === 1 ? "record" : "records") + " than the previous period."
    : symptomCount === 0
      ? "No symptom logs were found for this period."
      : "The previous period is not available for comparison.";
  const age = ageAt(report.currentSnapshot?.person?.dateOfBirth, report.generatedAt);
  const coveragePercent = Math.round(daysLogged / totalDays * 100);
  const measurementReviews = reportMeasurementReviews(report, age);
  const vitalConfigs = [
    { key: "systolic", label: "Systolic blood pressure", description: "The top number in a blood pressure reading. It measures pressure when your heart beats.", unit: "mmHg", digits: 0 },
    { key: "diastolic", label: "Diastolic blood pressure", description: "The bottom number in a blood pressure reading. It measures pressure between heartbeats.", unit: "mmHg", digits: 0 },
    { key: "heartRate", label: "Heart rate", description: "How many times your heart beats in one minute. Activity, stress and some medicines can change it.", unit: "bpm", digits: 0 },
    { key: "weight", label: "Weight", description: "Your body weight from measurements saved during this period.", unit: "kg", digits: 1 },
    { key: "oxygen", label: "Oxygen saturation", description: "An estimate of the oxygen in your blood, usually shown as a percentage by a pulse oximeter.", unit: "%", digits: 1 },
    { key: "temperature", label: "Temperature", description: "Your recorded body temperature. The measurement method and time of day can affect the result.", unit: "°C", digits: 1 },
    { key: "respiratory", label: "Breathing rate", description: "How many breaths you take in one minute. Adult reference values generally refer to resting measurements.", unit: "breaths/min", digits: 0 },
  ];
  const activeVitals = vitalConfigs
    .map((config) => ({
      ...config,
      current: trendVitalSeries(report, config.key, age),
      previous: trendVitalSeries(previousReport, config.key, age),
      rawCurrent: vitalSeries(report, config.key),
      review: measurementReviews.find((review) => review.key === config.key) ?? null,
      status: vitalStatus(report, config.key, age),
      baselineValue: baselineVitalValue(config.key, report.currentSnapshot),
    }))
    .filter((config) => config.rawCurrent.length > 0);
  const routineConfigs = [
    { field: "sleepHours", label: "Sleep", subtitle: "Average hours slept on days you completed a check-in.", unit: "hours", digits: 1, icon: Moon },
    { field: "stressLevel", label: "Stress rating", subtitle: "Your average stress rating on check-in days.", unit: "/10", digits: 1, icon: Activity },
    { field: "waterIntakeMl", label: "Water logged", subtitle: "Average water amount entered on check-in days.", unit: "ml", digits: 0, icon: Droplets },
    { field: "exerciseMinutes", label: "Exercise logged", subtitle: "Average exercise minutes entered on check-in days.", unit: "min", digits: 0, icon: Footprints },
  ];
  const routines = routineConfigs.map((config) => ({
    ...config,
    current: dailyMetric(report, config.field),
    previous: dailyMetric(previousReport, config.field),
  })).filter((config) => config.current.length > 0);
  const noAnalysisData = activeVitals.length === 0 && routines.length === 0 && goalProgressItems.length === 0 && (report.goalMetricEvents ?? []).length === 0 && (report.activity.wellnessMetrics ?? []).length === 0 && symptomCount === 0 && sleepSessions.length === 0 && workouts.length === 0 && clinicalCount === 0;
  const moodPattern = lowMood.total > 0
    ? lowMood.low + " of " + lowMood.total + " mood check-ins were marked low or very low."
    : "";
  const symptomPattern = repeated.find((item) => item.count > 1);
  const activityDelta = previousReport ? workouts.length - previousReport.activity.workouts.length : null;
  const sleepDelta = previousReport ? sleepSessions.length - previousReport.activity.sleepSessions.length : null;
  return (
    <div className="mt-5 space-y-6">
      <PersonalisedInsights report={report} previousReport={previousReport} previousLoading={previousLoading} coveragePercent={coveragePercent} daysLogged={daysLogged} totalDays={totalDays} />
      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24c1c4]">Period overview</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">The bigger picture</h2></div><span className="text-xs text-slate-400">{totalDays} days</span></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile icon={CalendarDays} label="Days with entries" value={String(daysLogged) + "/" + String(totalDays)} detail={daysLogged === 0 ? "No dated health records were found for these days." : "You saved at least one health record on " + daysLogged + " of " + totalDays + " days. Days without an entry are not counted as zero."} />
          <SummaryTile icon={Activity} label="Symptom records" value={String(symptomCount)} detail={symptomComparison} />
          <SummaryTile icon={HeartPulse} label="Readings used in trends" value={String(activeVitals.reduce((sum, item) => sum + item.current.length, 0))} detail={activeVitals.length ? "Valid trend values across " + activeVitals.length + " measurement types. Flagged extreme values are shown separately." : "No readings could be used for trend calculations in this period."} />
          <SummaryTile icon={Footprints} label="Workout sessions" value={String(workouts.length)} detail={workouts.length ? formatNumber(workoutMinutes, 0) + " minutes recorded across these workouts." : "No workouts were logged. If you were active but did not record a workout, it will not appear here."} />
        </div>
      </section>

      {measurementReviews.length > 0 && (
        <section aria-label="Readings to double-check" className={"rounded-2xl border p-4 sm:p-5 " + (measurementReviews.some((item) => item.severity === "urgent") ? "border-rose-300 bg-rose-50" : "border-amber-200 bg-amber-50")}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={"mt-0.5 h-5 w-5 shrink-0 " + (measurementReviews.some((item) => item.severity === "urgent") ? "text-rose-700" : "text-amber-700")} />
            <div className="min-w-0 flex-1">
              <h2 className={"font-black " + (measurementReviews.some((item) => item.severity === "urgent") ? "text-rose-950" : "text-amber-950")}>Readings to double-check</h2>
              <p className={"mt-1 text-sm leading-6 " + (measurementReviews.some((item) => item.severity === "urgent") ? "text-rose-900" : "text-amber-900")}>{age !== null && age >= 18 ? "Some saved values are far outside common adult reference ranges." : "Some saved values are outside a valid scale or need to be checked against personal, age-specific guidance."} Check the date, source, unit and original reading. These flags do not diagnose a condition.</p>
              <div className="mt-3 space-y-3">
                {measurementReviews.map((item) => (
                  <div key={item.key} className="rounded-xl border border-black/5 bg-white/85 p-3">
                    <p className="text-sm font-black text-[#0b2d54]">{item.label}: {formatNumber(item.value, item.key === "temperature" || item.key === "oxygen" ? 1 : 0)} {item.unit} · {dateLabel(new Date(item.timestamp).toISOString())}</p>
                    {item.originalValue !== undefined && item.originalUnit && <p className="mt-1 text-xs font-semibold text-slate-600">Source entry: {formatNumber(item.originalValue, 1)} {item.originalUnit}. The value above is converted to the report&apos;s standard unit.</p>}
                    <p className="mt-1 text-sm leading-6 text-slate-700">{item.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24c1c4]">Change over time</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">Measurement trends</h2><p className="mt-1 text-sm leading-6 text-slate-500">Each card explains the measurement, shows the average of saved readings, and tells you how it compares with the previous period. A change by itself does not say what caused it or whether it is right for you.</p></div>
        {activeVitals.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{activeVitals.map((item) => <VitalTrendCard key={item.key} label={item.label} description={item.description} unit={item.unit} digits={item.digits} current={item.current} previous={item.previous} previousLoading={previousLoading} review={item.review} status={item.status} baselineValue={item.baselineValue} rawCurrent={item.rawCurrent} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-500">No dated vital readings were found for this period. Once you save blood pressure, heart rate, weight or other measurements, they will appear here.</div>}
      </section>

      <section>
        <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24c1c4]">Everyday routines</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">Habits and consistency</h2><p className="mt-1 text-sm leading-6 text-slate-500">These cards summarise daily check-ins instead of repeating the text of each journal entry.</p></div>
        {routines.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{routines.map((item) => <RoutineTrendCard key={item.field} icon={item.icon} title={item.label} subtitle={item.subtitle} current={item.current} previous={item.previous} unit={item.unit} digits={item.digits} previousLoading={previousLoading} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-500">Daily sleep, stress, water and exercise trends will appear once those fields have been included in saved check-ins.</div>}
        {(sleepSessions.length > 0 || (previousReport?.activity.sleepSessions.length ?? 0) > 0 || workouts.length > 0 || (previousReport?.activity.workouts.length ?? 0) > 0) && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(sleepSessions.length > 0 || (previousReport?.activity.sleepSessions.length ?? 0) > 0) && <article className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><Moon className="h-5 w-5 text-[#24c1c4]" /><h3 className="font-bold text-[#0b2d54]">Connected sleep</h3></div><p className="mt-3 text-2xl font-black text-[#0b2d54]">{sleepHours.length ? formatNumber(mean(sleepHours), 1) + " h" : "No sleep sessions"}</p><p className="mt-1 text-xs text-slate-500">{sleepSessions.length} recorded sessions in this period{previousLoading ? "; comparing periods…" : sleepDelta === null ? "." : "; " + String(Math.abs(sleepDelta)) + " " + (sleepDelta > 0 ? "more" : sleepDelta < 0 ? "fewer" : "same number of") + " sessions than the previous period."}</p><p className="mt-2 text-xs leading-5 text-slate-500">Average is calculated from wearable sleep sessions with a recorded duration.</p></article>}
            {(workouts.length > 0 || (previousReport?.activity.workouts.length ?? 0) > 0) && <article className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><Footprints className="h-5 w-5 text-[#24c1c4]" /><h3 className="font-bold text-[#0b2d54]">Activity consistency</h3></div><p className="mt-3 text-2xl font-black text-[#0b2d54]">{workouts.length ? formatNumber(workoutMinutes, 0) + " min" : "No workouts"}</p><p className="mt-1 text-xs text-slate-500">{workouts.length} workouts across {new Set(workouts.map((item) => dateKey(item.startedAt || item.endedAt)).filter(Boolean)).size} days{previousLoading ? "; comparing periods…" : activityDelta === null ? "." : "; " + String(Math.abs(activityDelta)) + " " + (activityDelta > 0 ? "more" : activityDelta < 0 ? "fewer" : "same number of") + " sessions than the previous period."}</p><p className="mt-2 text-xs leading-5 text-slate-500">This reflects recorded sessions, not all movement during the day.</p></article>}
          </div>
        )}
      </section>

      {goalProgressItems.length > 0 && (
        <section>
          <div className="mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24c1c4]">Saved goal history</p>
            <h2 className="mt-1 text-xl font-black text-[#0b2d54]">Goal progress over time</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">These cards use dated progress updates saved against your goals. They compare the selected period with the previous period where comparable entries exist; missing dates are not treated as zero.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {goalProgressItems.map((item) => <GoalProgressTrendCard key={item.key} item={item} previousLoading={previousLoading} />)}
          </div>
        </section>
      )}

      {(symptomCount > 0 || lowMood.total > 0 || association !== null || repeated.some((item) => item.count > 1) || symptomAnalytics.repeatedTriggers.length > 0 || symptomAnalytics.medicationEffects > 0 || symptomAnalytics.averageSeverityRank !== null) && (
        <section>
          <div className="mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24c1c4]">Detected patterns</p>
            <h2 className="mt-1 text-xl font-black text-[#0b2d54]">Behaviour and symptom signals</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {symptomCount > 0 && (
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold text-[#0b2d54]">Symptom logs</h3>
                <p className="mt-2 text-2xl font-black text-[#0b2d54]">{symptomCount}</p>
                <p className="mt-1 text-xs text-slate-500">{previousReport ? (symptomDifference === 0 ? "No change vs previous period" : (symptomDifference > 0 ? "+" : "") + symptomDifference + " vs previous period") : "No prior-period comparison"}</p>
                {symptomPattern && <p className="mt-2 text-xs font-semibold text-slate-600">Most repeated: {symptomPattern.label} ({symptomPattern.count})</p>}
              </article>
            )}
            {lowMood.total > 0 && (
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold text-[#0b2d54]">Mood check-ins</h3>
                <p className="mt-2 text-2xl font-black text-[#0b2d54]">{lowMood.low}/{lowMood.total}</p>
                <p className="mt-1 text-xs text-slate-500">Low or very-low ratings / all mood entries</p>
              </article>
            )}
            {(symptomAnalytics.averageSeverityRank !== null || symptomAnalytics.worseningCount > 0 || symptomAnalytics.severeCount > 0) && (
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold text-[#0b2d54]">Symptom severity and progression</h3>
                <p className="mt-2 text-sm font-semibold text-[#0b2d54]">Average severity rank {symptomAnalytics.averageSeverityRank === null ? "—" : formatNumber(symptomAnalytics.averageSeverityRank, 1)}/4</p>
                <p className="mt-1 text-xs text-slate-500">{symptomAnalytics.worseningCount} worsening · {symptomAnalytics.severeCount} severe/very severe</p>
                {previousReport && <p className="mt-1 text-xs text-slate-500">Previous: avg rank {previousSymptomAnalytics.averageSeverityRank === null ? "—" : formatNumber(previousSymptomAnalytics.averageSeverityRank, 1)}/4 · {previousSymptomAnalytics.worseningCount} worsening</p>}
              </article>
            )}
            {symptomAnalytics.repeatedTriggers.slice(0, 2).map((trigger) => (
              <article key={trigger.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold text-[#0b2d54]">Repeated symptom trigger label</h3>
                <p className="mt-2 text-base font-black text-[#0b2d54]">{trigger.label}</p>
                <p className="mt-1 text-xs text-slate-500">{trigger.count} records · {trigger.confirmed} confirmed</p>
                <p className="mt-1 text-[10px] text-slate-400">Logged associations do not establish that a trigger caused a symptom.</p>
              </article>
            ))}
            {symptomAnalytics.medicationEffects > 0 && (
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold text-[#0b2d54]">Medication effects in symptom logs</h3>
                <p className="mt-2 text-sm text-slate-700">{symptomAnalytics.improvedEffects} reported improvement(s) · {symptomAnalytics.sideEffectReports} side-effect report(s) across {symptomAnalytics.medicationEffects} recorded effect(s)</p>
              </article>
            )}
            {association && (
              <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
                <h3 className="text-sm font-bold text-[#0b2d54]">Sleep and stress on the same days</h3>
                <p className="mt-2 text-sm font-semibold text-[#0b2d54]">{association.shorterDays} shorter-sleep days: stress average {formatNumber(association.shortStress, 1)}/10 · {association.longerDays} longer-sleep days: {formatNumber(association.longStress, 1)}/10</p>
                <p className="mt-1 text-[11px] text-slate-500">Same-day association only; this does not establish cause.</p>
              </article>
            )}
          </div>
        </section>
      )}

      {(clinicalCount > 0 || flaggedLabs.length > 0) && (
        <section>
          <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24c1c4]">Clinical context</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">Updates worth keeping in view</h2><p className="mt-1 text-sm leading-6 text-slate-500">This is a concise overview of clinical activity, not a repeat of your full clinical record.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile icon={Stethoscope} label="Clinical visits" value={String(report.clinical.encounters.length)} detail="Encounters dated in this period." />
            <SummaryTile icon={FileText} label="Lab reports" value={String(report.clinical.labResults.length)} detail="Laboratory result records released or reported in this period." />
            <SummaryTile icon={ClipboardList} label="Care plan updates" value={String(report.clinical.carePlans.length)} detail="Care plans created or updated in this period." />
            <SummaryTile icon={ShieldCheck} label="Other clinical updates" value={String(report.clinical.diagnoses.length + report.clinical.prescriptions.length + report.clinical.referrals.length + report.clinical.procedures.length)} detail="Diagnoses, prescriptions, referrals and procedures recorded." />
          </div>
          {flaggedLabs.length > 0 && <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div className="min-w-0"><h3 className="font-bold text-amber-950">Results marked for review in the clinical record</h3><p className="mt-1 text-xs leading-5 text-amber-900">These items were marked abnormal or critical by the source record. Sympto is not re-interpreting them here; review the report with your clinician.</p><div className="mt-3 space-y-2">{flaggedLabs.slice(0, 4).map((item) => <div key={item.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-white/80 p-3"><div><p className="text-sm font-bold text-[#0b2d54]">{item.name}</p><p className="mt-1 text-[11px] text-slate-500">{dateLabel(item.date)}</p></div><div className="flex items-center gap-2"><span className="text-sm font-bold text-[#0b2d54]">{String(item.value)}</span>{item.critical && <span className="rounded-full bg-rose-100 px-2 py-1 text-[9px] font-black uppercase text-rose-800">Critical</span>}{!item.critical && <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase text-amber-800">Abnormal</span>}</div></div>)}</div><Link href="/health-records" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2 text-xs font-bold text-white">Review clinical records <ArrowRight className="h-4 w-4" /></Link></div></div></div>}
        </section>
      )}

      {noAnalysisData && <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6"><div className="flex items-start gap-3"><Info className="mt-0.5 h-5 w-5 shrink-0 text-[#24c1c4]" /><div><h2 className="font-bold text-[#0b2d54]">More records are needed to uncover patterns</h2><p className="mt-1 text-sm leading-6 text-slate-500">As you record Health Vitals, daily check-ins, symptoms or connected-device sessions, future reports can compare these values across periods. This report intentionally avoids repeating individual journal entries.</p><Link href="/today" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2 text-xs font-bold text-white">Record today’s health <ArrowRight className="h-4 w-4" /></Link></div></div></section>}

      <p className="rounded-2xl bg-slate-100 p-3 text-[11px] text-slate-500">Generated {dateLabel(report.generatedAt)} · Based on dated records · Not a diagnosis</p>
    </div>
  );
}

export default function HealthReportPage() {
  const params = useParams<{ kind: string }>();
  const searchParams = useSearchParams();
  const requestedDate = searchParams.get("date");
  const kind = params.kind?.toLowerCase();
  const [report, setReport] = useState<Report | null>(null);
  const [previousReport, setPreviousReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [previousLoading, setPreviousLoading] = useState(false);
  const [previousFailed, setPreviousFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setReport(null);
    setPreviousReport(null);
    setPreviousFailed(false);

    if (kind !== "weekly" && kind !== "monthly") {
      setError("This health report could not be found.");
      setLoading(false);
      return () => { active = false; };
    }

    const url = "/health-reports/" + kind + (requestedDate ? "?date=" + encodeURIComponent(requestedDate) : "");
    api.get(url)
      .then((response) => {
        if (active) setReport(unwrap<Report>(response.data));
      })
      .catch((err) => {
        if (active) setError(err?.response?.data?.message || "This health report is not available.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [kind, requestedDate]);

  useEffect(() => {
    if (!report) return;
    let active = true;
    setPreviousLoading(true);
    setPreviousFailed(false);
    const anchorDate = dateKey(report.period.start);
    if (!anchorDate) {
      setPreviousReport(null);
      setPreviousFailed(true);
      setPreviousLoading(false);
      return () => { active = false; };
    }

    api.get("/health-reports/" + report.type.toLowerCase() + "?date=" + encodeURIComponent(anchorDate))
      .then((response) => {
        if (active) setPreviousReport(unwrap<Report>(response.data));
      })
      .catch(() => {
        if (active) {
          setPreviousReport(null);
          setPreviousFailed(true);
        }
      })
      .finally(() => {
        if (active) setPreviousLoading(false);
      });

    return () => { active = false; };
  }, [report?.type, report?.period.start]);

  const title = useMemo(() => kind === "weekly" ? "Weekly Health Insights" : kind === "monthly" ? "Monthly Health Insights" : "Health Insights", [kind]);

  if (loading) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-5"><div className="mx-auto max-w-6xl space-y-4"><div className="h-44 animate-pulse rounded-[30px] bg-white" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((value) => <div key={value} className="h-32 animate-pulse rounded-2xl bg-white" />)}</div><div className="h-72 animate-pulse rounded-[28px] bg-white" /></div></main></ProtectedRoute>;
  }

  if (error || !report) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-5"><div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><FileText className="mx-auto h-10 w-10 text-slate-300" /><h1 className="mt-4 text-xl font-bold text-[#0b2d54]">Health report unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-500">{error || "We could not load this report."}</p><Link href="/notifications" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-sm font-bold text-white"><ArrowLeft className="h-4 w-4" />Back to notifications</Link></div></main></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb] pb-10 text-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Link href="/notifications" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#0b2d54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to notifications</Link>

          <section className="mt-4 overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0b2d54] to-[#0f5a62] p-6 text-white shadow-lg sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#24c1c4]"><ShieldCheck className="h-4 w-4" />Sympto health intelligence</div><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 text-sm leading-6 text-white/75">{report.period.label}</p><p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">This report reviews the health data saved on {recordedDays(report).size} of {periodDays(report)} days. It compares measurements and daily routines, highlights values that need checking, and shows progress against your saved health goals. It is a summary of your records, not a diagnosis.</p></div>
              <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3"><CalendarDays className="h-5 w-5 text-[#24c1c4]" /><div><p className="text-[10px] font-bold uppercase tracking-wide text-white/60">Report period</p><p className="mt-1 text-sm font-bold">{report.type === "WEEKLY" ? "7-day view" : "Monthly view"}</p></div></div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">Generated {dateLabel(report.generatedAt)}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{previousLoading ? "Comparing with prior period…" : previousReport ? "Compared with previous period" : previousFailed ? "Prior-period data unavailable" : "Current-period insights"}</span></div>
          </section>

          {previousFailed && <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><Info className="mt-0.5 h-4 w-4 shrink-0" />The current report is available, but the prior-period comparison could not be loaded. Current-period trends remain available; comparison labels will appear when historical data is accessible.</div>}

          <section aria-label="How to read this report" className="mt-4 rounded-2xl border border-[#dcebed] bg-white p-4 sm:p-5">
            <h2 className="text-sm font-black text-[#0b2d54]">How to read this report</h2>
            <div className="mt-2 grid gap-2 text-xs leading-5 text-slate-600 sm:grid-cols-2">
              <p><strong className="text-[#0b2d54]">Average:</strong> the average of the readings saved in this period, not a value for every day.</p>
              <p><strong className="text-[#0b2d54]">Most recent:</strong> the latest dated reading available.</p>
              <p><strong className="text-[#0b2d54]">Change:</strong> first-to-most-recent compares two readings. “Previous period” compares this report with the earlier week or month.</p>
              <p><strong className="text-[#0b2d54]">Missing entry:</strong> means no value was saved; it is not counted as zero.</p>
              <p><strong className="text-[#0b2d54]">Colour key:</strong> green = within a common reference; amber = recheck or monitor; orange = high; red = urgent; grey = personal or age-specific guidance needed.</p>
              <p><strong className="text-[#0b2d54]">Saved goal status:</strong> matching targets inform relevant measurement cards, while recorded progress status guides next steps. Missing progress is left unknown rather than guessed.</p>
            </div>
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">The data-coverage score measures how much was logged, not your health. Sympto does not combine different measurements into one unvalidated overall health score. General adult reference ranges are guides, not personal targets; age, long-term conditions and clinician advice can change the interpretation.</p>
          </section>
          <HealthReportInsights report={report} previousReport={previousReport} previousLoading={previousLoading} />
        </div>
      </main>
    </ProtectedRoute>
  );
}
