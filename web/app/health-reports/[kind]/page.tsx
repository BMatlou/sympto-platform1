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
  FileText,
  Footprints,
  HeartPulse,
  Info,
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
  sleepScore?: number | string | null;
  source?: string | null;
  stages?: Array<{ stage?: string | null; startedAt?: string | null; endedAt?: string | null; durationMinutes?: number | string | null }>;
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
  immunizations?: unknown[];
  activeGoals?: SnapshotGoal[];
};

type GoalMetricEventRecord = {
  goalId?: string | null;
  goalTitle?: string | null;
  goalCategory?: string | null;
  unit?: string | null;
  targetValue?: number | string | null;
  aggregation?: string | null;
  frequency?: string | null;
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
    clinicalEpisodes?: unknown[];
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
  tracking?: {
    goalProgress?: unknown[];
    goalHistory?: unknown[];
    riskAssessments?: unknown[];
  };
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
  return new Intl.NumberFormat("en-GB", {
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

function withinReportPeriod(report: Report | null, value: unknown) {
  if (!report || value === null || value === undefined || value === "") return false;
  const timestamp = typeof value === "number" ? value : new Date(String(value)).getTime();
  const start = new Date(report.period.start).getTime();
  const end = new Date(report.period.end).getTime();
  return Number.isFinite(timestamp) && Number.isFinite(start) && Number.isFinite(end) &&
    timestamp >= start && timestamp < end;
}

// Water intake is cumulative by day. Keep the latest saved total rather than
// averaging intermediate updates made on the same calendar day.
function dailyLatestMetric(report: Report | null, field: string): DailyValue[] {
  if (!report) return [];
  const latestByDate = new Map<string, { date: string; value: number; timestamp: number }>();
  report.activity.journalEntries.forEach((entry) => {
    // A daily cumulative check-in may be edited many times; prefer its latest
    // modification timestamp so we do not report the original, stale total.
    const at = entry.updatedAt || entry.recordedAt || entry.createdAt;
    if (!withinReportPeriod(report, at)) return;
    const date = dateKey(at);
    const value = finite(entry[field]);
    const timestamp = new Date(String(at)).getTime();
    if (!date || value === null || !Number.isFinite(timestamp)) return;
    const current = latestByDate.get(date);
    if (!current || timestamp >= current.timestamp) latestByDate.set(date, { date, value, timestamp });
  });
  return Array.from(latestByDate.values())
    .map(({ date, value }) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function dailyMetric(report: Report | null, field: string): DailyValue[] {
  if (!report) return [];
  const grouped = new Map<string, { total: number; count: number }>();
  report.activity.journalEntries.forEach((entry) => {
    const at = entry.createdAt || entry.recordedAt || entry.updatedAt;
    if (!withinReportPeriod(report, at)) return;
    const key = dateKey(at);
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

function preferPrimaryByDate(
  primary: Array<{ date: string; value: number; unit?: string }>,
  secondary: Array<{ date: string; value: number; unit?: string }>,
) {
  const byDate = new Map<string, { date: string; value: number; unit?: string }>();
  primary.forEach((item) => byDate.set(item.date, item));
  secondary.forEach((item) => {
    if (!byDate.has(item.date)) byDate.set(item.date, item);
  });
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function dailyCategoricalMetric(
  report: Report | null,
  field: "mood" | "energyLevel" | "sleepQuality",
  scores: Record<string, number>,
): DailyValue[] {
  if (!report) return [];
  const grouped = new Map<string, { total: number; count: number }>();
  report.activity.journalEntries.forEach((entry) => {
    const at = entry.createdAt || entry.recordedAt || entry.updatedAt;
    if (!withinReportPeriod(report, at)) return;
    const date = dateKey(at);
    const raw = String(entry[field] ?? "").toUpperCase();
    const score = scores[raw];
    if (!date || score === undefined) return;
    const current = grouped.get(date) ?? { total: 0, count: 0 };
    current.total += score;
    current.count += 1;
    grouped.set(date, current);
  });
  return Array.from(grouped.entries())
    .map(([date, group]) => ({ date, value: group.total / group.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function dailyAppointmentSeries(report: Report | null): DailyValue[] {
  if (!report) return [];
  const grouped = new Map<string, number>();
  report.activity.appointments.forEach((value) => {
    if (!value || typeof value !== "object") return;
    const item = value as Record<string, unknown>;
    if (!withinReportPeriod(report, item.scheduledStart)) return;
    const date = dateKey(item.scheduledStart);
    if (!date) return;
    grouped.set(date, (grouped.get(date) ?? 0) + 1);
  });
  return Array.from(grouped.entries())
    .map(([date, value]) => ({ date, value }))
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
  source: "metric-event" | "goal-progress";
};

function goalProgressTrendItems(report: Report, previousReport: Report | null): GoalProgressTrendItem[] {
  const inPeriod = (timestamp: number, periodReport: Report | null) => {
    if (!periodReport) return false;
    const start = new Date(periodReport.period.start).getTime();
    const end = new Date(periodReport.period.end).getTime();
    return Number.isFinite(timestamp) && timestamp >= start && timestamp < end;
  };
  const previousGoals = previousReport?.currentSnapshot?.activeGoals ?? [];
  const aggregatedMetricEvents = (targetReport: Report | null, goalId: string) => {
    if (!targetReport) return [];
    const byDate = new Map<string, Array<{ date: string; timestamp: number; value: number; unit: string; aggregation: string }>>();
    (targetReport.goalMetricEvents ?? [])
      .filter((event) => event.goalId === goalId && event.source !== "goal-baseline")
      .forEach((event) => {
        const timestamp = new Date(event.occurredAt).getTime();
        const value = finite(event.loggedValue);
        const date = dateKey(event.occurredAt);
        if (!inPeriod(timestamp, targetReport) || value === null || !date) return;
        const point = {
          date,
          timestamp,
          value,
          unit: String(event.unit ?? ""),
          aggregation: String(event.aggregation ?? (
          /hydration|water|exercise.minutes|nutrition.calories/.test(String(event.metricKey ?? "").toLowerCase())
            ? "SUM"
            : "LATEST"
        )).toUpperCase(),
        };
        const dayPoints = byDate.get(date) ?? [];
        dayPoints.push(point);
        byDate.set(date, dayPoints);
      });
    return Array.from(byDate.values()).map((dayPoints) => {
      const ordered = dayPoints.sort((a, b) => a.timestamp - b.timestamp);
      const latest = ordered[ordered.length - 1];
      const values = ordered.map((item) => item.value);
      const aggregate = latest.aggregation === "SUM" ? values.reduce((sum, value) => sum + value, 0)
        : latest.aggregation === "AVERAGE" ? mean(values) ?? latest.value
        : latest.aggregation === "MIN" ? Math.min(...values)
        : latest.aggregation === "MAX" ? Math.max(...values)
        : latest.value;
      return { date: latest.date, timestamp: latest.timestamp, value: aggregate, unit: latest.unit, valueKind: "current" as const, status: "" };
    }).sort((a, b) => a.timestamp - b.timestamp);
  };

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

    const eventPoints = aggregatedMetricEvents(report, String(goal.id ?? ""));

    // Metric events are authoritative for metric-configured goals. Don't merge
    // them with progress projections, which can represent the same saved check-in.
    const current = eventPoints.length ? eventPoints : progressPoints;
    if (!current.length) return [];

    const previousGoal = previousGoals.find((item) => item.id === goal.id) ??
      previousGoals.find((item) => String(item.category ?? "") === String(goal.category ?? "") &&
        String(item.title ?? "") === String(goal.title ?? ""));
    const previousEvents = aggregatedMetricEvents(previousReport, String(goal.id ?? ""));

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
      source: eventPoints.length ? "metric-event" as const : "goal-progress" as const,
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
    if (withinReportPeriod(report, point.timestamp) && !deduped.has(key)) deduped.set(key, point);
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
      return { label: "Elevated range", detail: "Your paired reading has a top number of 120–129 mmHg and a bottom number below 80 mmHg. This is an elevated adult category; compare repeated readings with your clinician.", tone: "watch" };
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
  const safePercent = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const text = percent === null ? "—" : String(Math.round(safePercent)) + "%";
  const ringColour = toneStyles(tone).ring;
  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full p-[5px]"
      style={{
        width: size,
        height: size,
        background: "conic-gradient(" + ringColour + " " + safePercent + "%, #dbe5ec " + safePercent + "% 100%)",
      }}
      role="img"
      aria-label={percent === null ? label + ": not scored yet" : label + ": " + Math.round(safePercent) + " percent"}
      title={label}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-[#effafa] text-base font-black tabular-nums text-[#0b2d54]">
        {text}
      </div>
    </div>
  );
}

function goalMetricSeries(report: Report | null, pattern: RegExp): SeriesPoint[] {
  const events = (report?.goalMetricEvents ?? [])
    .filter((event) => event.source !== "goal-baseline" && pattern.test([
      event.goalCategory, event.goalTitle, event.metricType, event.metricKey,
    ].filter(Boolean).join(" ").toLowerCase()))
    .flatMap((event) => {
      const value = finite(event.loggedValue);
      const timestamp = new Date(event.occurredAt).getTime();
      const date = dateKey(event.occurredAt);
      if (value === null || !Number.isFinite(timestamp) || !date || !withinReportPeriod(report, timestamp)) return [];
      return [{
        value,
        timestamp,
        date,
        source: "Health goal log",
        unit: String(event.unit ?? ""),
        goalKey: String(event.goalId ?? event.metricType + ":" + event.metricKey),
        metricKey: String(event.metricKey ?? ""),
        aggregation: String(event.aggregation ?? "LATEST").toUpperCase(),
      }];
    });

  // Apply the goal's saved aggregation to each date: e.g. water and exercise
  // session amounts add up within a day, while weight/glucose use the latest value.
  const grouped = new Map<string, typeof events>();
  events.forEach((point) => {
    const key = [point.goalKey, point.metricKey, point.date, point.unit.toLowerCase()].join("|");
    const list = grouped.get(key) ?? [];
    list.push(point);
    grouped.set(key, list);
  });
  return Array.from(grouped.values()).map((points) => {
    const ordered = points.slice().sort((a, b) => a.timestamp - b.timestamp);
    const aggregation = ordered[ordered.length - 1].aggregation;
    const values = ordered.map((point) => point.value);
    const value = aggregation === "SUM" ? values.reduce((sum, entry) => sum + entry, 0)
      : aggregation === "AVERAGE" ? mean(values) ?? values[values.length - 1]
      : aggregation === "MIN" ? Math.min(...values)
      : aggregation === "MAX" ? Math.max(...values)
      : values[values.length - 1];
    const latest = ordered[ordered.length - 1];
    return { value, timestamp: latest.timestamp, date: latest.date, source: latest.source, unit: latest.unit };
  }).sort((a, b) => a.timestamp - b.timestamp);
}
type LabSeriesPoint = SeriesPoint & { testName: string };

type MedicationDoseAction = {
  date: string;
  action: "TAKEN" | "SKIPPED";
  source: "event" | "journal";
  timestamp?: number;
  medicationName?: string;
  patientMedicationId?: string;
};

type MedicationInsightBucket = {
  day: string;
  expectedDoses?: number | string;
  takenDoses?: number | string;
  skippedDoses?: number | string;
  recordedActions?: number | string;
  unrecordedDoses?: number | string;
  adherencePercent?: number | string;
};

type MedicationInsightPayload = {
  unified?: {
    goalConfig?: { healthGoalId?: string; targetAdherence?: number | string | null; status?: string | null };
    medicationSchedule?: {
      patientMedicationId?: string | null;
      name?: string | null;
      dosage?: string | null;
      frequency?: string | null;
      dosesPerDay?: number | string | null;
      reminderSlots?: string[];
      scheduleSource?: string | null;
      status?: string | null;
    };
    adherenceStream?: Array<{ timestamp: string; action: "TAKEN" | "SKIPPED"; sourceId?: string | null }>;
  };
  analysis?: {
    dailyBuckets?: MedicationInsightBucket[];
    todayStatus?: { expectedDoses?: number; takenDoses?: number; skippedDoses?: number; remainingDoses?: number; status?: string };
    journeyAdherence?: { takenDoses?: number; expectedScheduledDoses?: number; adherencePercent?: number; scheduledDays?: number };
    trend?: { state?: string; daysAnalyzed?: number; daysWithExplicitActions?: number; baselinePercent?: number | null; recentPercent?: number | null; deltaPercentagePoints?: number | null };
    goalIntelligence?: { status?: string; targetAdherencePercent?: number; currentAdherencePercent?: number; skippedDoses?: number; unrecordedDoses?: number; completedDays?: number; targetDays?: number; partialDays?: number; missedDays?: number; insight?: string | null };
    clinicalIntelligence?: {
      headline?: string | null;
      secondaryInsights?: string[];
      chronologicalInterference?: { label?: string; failureRatePercent?: number; failedDoses?: number; expectedDoses?: number; statement?: string | null } | null;
      crossGoalAssociations?: Array<{ goalName?: string; goalCategory?: string; meaningful?: boolean; statement?: string | null; deltaPercentagePoints?: number | null }>;
      behavioralClusters?: Array<{ statement?: string | null; goalNames?: string[] }>;
      clinicalNarrative?: { pattern?: string | null; statisticalAssociationNote?: string | null; routineAnchor?: { statement?: string | null; actionStatement?: string | null } | null };
    };
  };
};

function medicationDoseTotals(report: Report | null) {
  if (!report) return { eventActions: [] as MedicationDoseAction[], legacyActions: [] as MedicationDoseAction[], eventTaken: 0, eventSkipped: 0, eventTotal: 0, eventAdherencePercent: null as number | null, legacyTaken: 0, legacySkipped: 0, legacyTotal: 0 };
  const eventActions: MedicationDoseAction[] = [];
  const legacyActions: MedicationDoseAction[] = [];

  (report.goalMetricEvents ?? [])
    .filter((event) => String(event.metricType ?? "").toUpperCase() === "MEDICATION" &&
      String(event.metricKey ?? "").toLowerCase() === "medication.adherence" &&
      event.source === "medication-adherence" &&
      withinReportPeriod(report, event.occurredAt))
    .forEach((event) => {
      let metadata: Record<string, unknown> | null = null;
      if (event.metadata && typeof event.metadata === "object") {
        metadata = event.metadata as Record<string, unknown>;
      } else if (typeof event.metadata === "string") {
        try { metadata = JSON.parse(event.metadata) as Record<string, unknown>; } catch { metadata = null; }
      }
      const action = String(metadata?.action ?? "").toUpperCase();
      const date = dateKey(event.occurredAt);
      const timestamp = new Date(event.occurredAt).getTime();
      if (!date || !withinReportPeriod(report, timestamp) || (action !== "TAKEN" && action !== "SKIPPED")) return;
      eventActions.push({
        date,
        timestamp,
        action,
        source: "event",
        medicationName: String(metadata?.medicationName ?? "").trim() || undefined,
        patientMedicationId: String(metadata?.patientMedicationId ?? "").trim() || undefined,
      });
    });

  // Older journal projections hold the last status for a medication/day, not one
  // row per dose. Keep these separate from the complete dose-level event counts.
  report.activity.journalEntries.forEach((entry) => {
    const text = [entry.title, entry.journal, entry.notes].map((value) => String(value ?? "")).join(" ").toLowerCase();
    if (!/medication adherence|dose marked (taken|skipped)/.test(text)) return;
    const actionMatch = text.match(/dose marked (taken|skipped)/);
    if (!actionMatch) return;
    const at = entry.createdAt || entry.recordedAt || entry.updatedAt;
    if (!withinReportPeriod(report, at)) return;
    const date = dateKey(at);
    if (!date) return;
    const titleMatch = String(entry.title ?? "").match(/medication adherence\s*[·:–-]\s*(.*?)\s*[·:–-]\s*\d{4}-\d{2}-\d{2}/i);
    const timestamp = new Date(String(at)).getTime();
    legacyActions.push({
      date,
      timestamp: Number.isFinite(timestamp) ? timestamp : undefined,
      action: actionMatch[1].toUpperCase() as "TAKEN" | "SKIPPED",
      source: "journal",
      medicationName: titleMatch?.[1]?.trim() || undefined,
    });
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
    if (!date || !Number.isFinite(timestamp) || !withinReportPeriod(report, timestamp)) return [];
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
    if (value === null || !date || !Number.isFinite(timestamp) || !withinReportPeriod(report, timestamp)) return;
    points.push({ value, timestamp, date, source: "Connected device", unit: String(item.unit || item.vitalType?.unit || "") });
  });
  report.clinical.vitals.forEach((item) => {
    const name = [item.vitalType?.code, item.vitalType?.name].filter(Boolean).join(" ").toLowerCase();
    if (!pattern.test(name) || (exclude && exclude.test(name))) return;
    const value = finite(item.value);
    const measuredAt = item.measuredAt || item.recordedAt;
    const timestamp = measuredAt ? new Date(measuredAt).getTime() : Number.NaN;
    const date = dateKey(measuredAt);
    if (value === null || !date || !Number.isFinite(timestamp) || !withinReportPeriod(report, timestamp)) return;
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
      if (value === null || !date || !Number.isFinite(timestamp) || !withinReportPeriod(report, timestamp)) return [];
      return [{ value, timestamp, date, source: item.source ?? "Connected wellness metric", unit: String(item.unit ?? "") }];
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

function deviceMetricSeries(report: Report | null, metricKey: string): SeriesPoint[] {
  if (!report) return [];
  const normalise = (value: unknown) => String(value ?? "").trim().toLowerCase();
  return report.activity.deviceMeasurements
    .filter((item) => normalise(item.metricKey || item.measurementType || item.vitalType?.name) === normalise(metricKey))
    .flatMap((item) => {
      const value = finite(item.value);
      const timestamp = item.measuredAt ? new Date(item.measuredAt).getTime() : Number.NaN;
      const date = dateKey(item.measuredAt);
      if (value === null || !date || !Number.isFinite(timestamp) || !withinReportPeriod(report, timestamp)) return [];
      return [{ value, timestamp, date, source: "Connected device", unit: String(item.unit || item.vitalType?.unit || "") }];
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
      const at = session.startedAt || session.endedAt;
      if (!withinReportPeriod(report, at)) return;
      const key = dateKey(at);
      const minutes = finite(session.durationMinutes);
      if (!key || minutes === null || minutes <= 0) return;
      grouped.set(key, (grouped.get(key) ?? 0) + minutes / 60);
    });
  } else {
    report.activity.workouts.forEach((session) => {
      const at = session.startedAt || session.endedAt;
      if (!withinReportPeriod(report, at)) return;
      const key = dateKey(at);
      const seconds = finite(session.durationSeconds);
      if (!key || seconds === null || seconds <= 0) return;
      grouped.set(key, (grouped.get(key) ?? 0) + seconds / 60);
    });
  }
  return Array.from(grouped, ([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function latestValuesPerDay(points: SeriesPoint[]): DailyValue[] {
  const latest = new Map<string, SeriesPoint>();
  points.slice().sort((a, b) => a.timestamp - b.timestamp).forEach((point) => {
    if (!point.date || !Number.isFinite(point.value)) return;
    latest.set(point.date, point);
  });
  return Array.from(latest.values())
    .map((point) => ({ date: point.date, value: point.value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function symptomLogAnalytics(report: Report | null) {
  const logs = report?.activity.symptoms ?? [];
  const rank: Record<string, number> = { NONE: 0, MILD: 1, MODERATE: 2, SEVERE: 3, VERY_SEVERE: 4 };
  const severityValues = logs.flatMap((log) => {
    const recorded = [
      log.overallSeverity,
      ...(log.observations ?? []).map((item) => item.severity),
    ].map((value) => rank[String(value ?? "").toUpperCase()]).filter((value): value is number => value !== undefined);
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

function symptomSeverityTimeline(report: Report | null): DailyValue[] {
  if (!report) return [];
  const rank: Record<string, number> = { NONE: 0, MILD: 1, MODERATE: 2, SEVERE: 3, VERY_SEVERE: 4 };
  const daily = new Map<string, { total: number; count: number }>();
  const add = (date: string, value: number) => {
    if (!date || !Number.isFinite(value)) return;
    const current = daily.get(date) ?? { total: 0, count: 0 };
    current.total += value;
    current.count += 1;
    daily.set(date, current);
  };

  report.activity.symptoms.forEach((log) => {
    const perLogDate = new Map<string, number>();
    (log.observations ?? []).forEach((observation) => {
      if (!withinReportPeriod(report, observation.observedAt)) return;
      const date = dateKey(observation.observedAt);
      const severity = rank[String(observation.severity ?? "").toUpperCase()];
      if (!date || severity === undefined) return;
      perLogDate.set(date, Math.max(perLogDate.get(date) ?? severity, severity));
    });
    if (perLogDate.size) {
      perLogDate.forEach((severity, date) => add(date, severity));
      return;
    }
    const at = log.startedAt || log.createdAt;
    if (!withinReportPeriod(report, at)) return;
    const date = dateKey(at);
    const severity = rank[String(log.overallSeverity ?? "").toUpperCase()];
    if (date && severity !== undefined) add(date, severity);
  });

  return Array.from(daily.entries())
    .map(([date, group]) => ({ date, value: group.total / group.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function dailySymptomSeries(report: Report | null): DailyValue[] {
  if (!report) return [];
  const grouped = new Map<string, number>();
  report.activity.symptoms.forEach((item) => {
    const at = item.startedAt || item.createdAt;
    if (!withinReportPeriod(report, at)) return;
    const key = dateKey(at);
    if (!key) return;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  });
  return Array.from(grouped, ([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function signalDigits(key: string, unit: string) {
  const normalizedKey = key.toLowerCase();
  const normalizedUnit = unit.trim().toLowerCase();
  if (
    ["ml", "min", "minutes", "steps", "cigarettes", "drinks", "kcal", "kilocalories", "mmhg", "bpm", "per day", "logs/day", "breaths/min"].includes(normalizedUnit) ||
    /appointments|symptoms|steps/.test(normalizedKey)
  ) return 0;
  return 1;
}

function periodMovement(currentValues: number[], previousValues: number[], unit: string, digits = 1) {
  const current = mean(currentValues);
  const previous = mean(previousValues);
  const suffix = unit ? (unit.startsWith("/") ? unit : " " + unit) : " (unit not saved)";
  const display = (value: number) => formatNumber(value, digits) + suffix;
  if (current === null) return { state: "missing" as const, label: "No readings", detail: "No usable readings were saved for this period.", current, previous };
  if (previous === null) return { state: "new" as const, label: "No prior comparison", detail: "There are no comparable readings from the previous period.", current, previous };
  const delta = current - previous;
  const tolerance = digits === 0 ? 0.5 : 0.05;
  if (Math.abs(delta) < tolerance) return { state: "steady" as const, label: "About the same", detail: "Average: " + display(previous) + " previously → " + display(current) + " this period.", current, previous };
  const up = delta > 0;
  const arrow = up ? "↑" : "↓";
  const state = up ? "up" as const : "down" as const;
  if (unit === "/5" || unit === "/10") {
    const points = formatNumber(Math.abs(delta), digits);
    const pointWord = Math.abs(Math.abs(delta) - 1) < 0.000001 ? "point" : "points";
    return { state, label: arrow + " " + points + " " + pointWord, detail: "Average rating: " + display(previous) + " previously → " + display(current) + " this period.", current, previous };
  }
  if (Math.abs(previous) < 0.000001) return { state, label: up ? "Up from zero" : "Down from zero", detail: "Average changed from " + display(previous) + " to " + display(current) + ". A percentage cannot be calculated from zero.", current, previous };
  const pct = Math.abs(delta / Math.abs(previous) * 100);
  const pctDigits = pct >= 100 ? 0 : 1;
  const absolute = formatNumber(Math.abs(delta), digits) + suffix;
  return { state, label: arrow + " " + formatNumber(pct, pctDigits) + "%", detail: "Average changed by " + absolute + ": " + display(previous) + " previously → " + display(current) + " this period.", current, previous };
}
function PersonalisedInsights({
  report,
  previousReport,
  previousLoading,
}: {
  report: Report;
  previousReport: Report | null;
  previousLoading: boolean;
}) {
  const goals = report.currentSnapshot?.activeGoals ?? [];
  const manualGoalTrends = goalProgressTrendItems(report, previousReport).filter((item) => item.source === "goal-progress");
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
  const a1cMeasuredCurrent = combineDatedSeries(
    namedClinicalDeviceSeries(report, /hba1c|\ba1c\b|glycat|glycosylat/i),
    wellnessMetricSeriesMatching(report, /hba1c|\ba1c\b|glycat|glycosylat/i),
  );
  const a1cMeasuredPrevious = combineDatedSeries(
    namedClinicalDeviceSeries(previousReport, /hba1c|\ba1c\b|glycat|glycosylat/i),
    wellnessMetricSeriesMatching(previousReport, /hba1c|\ba1c\b|glycat|glycosylat/i),
  );
  const a1cEventsCurrent = event(report, /hba1c|\ba1c\b|glycat|glycosylat/);
  const a1cEventsPrevious = event(previousReport, /hba1c|\ba1c\b|glycat|glycosylat/);
  const a1cCurrent = a1cLabCurrent.length ? a1cLabCurrent : a1cMeasuredCurrent.length ? a1cMeasuredCurrent : a1cEventsCurrent;
  const a1cPrevious = a1cLabPrevious.length ? a1cLabPrevious : a1cMeasuredPrevious.length ? a1cMeasuredPrevious : a1cEventsPrevious;
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
  const totalCholesterolGoalCurrent = event(report, /cholesterol|lipid/);
  const totalCholesterolGoalPrevious = event(previousReport, /cholesterol|lipid/);
  const totalCholesterolCurrent = totalCholesterolLabCurrent.length ? totalCholesterolLabCurrent : totalCholesterolMeasuredCurrent.length ? totalCholesterolMeasuredCurrent : totalCholesterolGoalCurrent;
  const totalCholesterolPrevious = totalCholesterolLabPrevious.length ? totalCholesterolLabPrevious : totalCholesterolMeasuredPrevious.length ? totalCholesterolMeasuredPrevious : totalCholesterolGoalPrevious;

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
  const anyLipidSeries = totalCholesterolCurrent.length + totalCholesterolPrevious.length + ldlCurrent.length + ldlPrevious.length + hdlCurrent.length + hdlPrevious.length + triglyceridesCurrent.length + triglyceridesPrevious.length > 0;
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
  const moodScores: Record<string, number> = { VERY_BAD: 1, BAD: 2, NEUTRAL: 3, GOOD: 4, VERY_GOOD: 5 };
  const energyScores: Record<string, number> = { VERY_LOW: 1, LOW: 2, NORMAL: 3, HIGH: 4, VERY_HIGH: 5 };
  const sleepQualityScores: Record<string, number> = { VERY_POOR: 1, POOR: 2, FAIR: 3, GOOD: 4, EXCELLENT: 5 };
  const moodRatingsCurrent = dailyCategoricalMetric(report, "mood", moodScores);
  const moodRatingsPrevious = dailyCategoricalMetric(previousReport, "mood", moodScores);
  const energyCurrent = dailyCategoricalMetric(report, "energyLevel", energyScores);
  const energyPrevious = dailyCategoricalMetric(previousReport, "energyLevel", energyScores);
  const sleepQualityCurrent = dailyCategoricalMetric(report, "sleepQuality", sleepQualityScores);
  const sleepQualityPrevious = dailyCategoricalMetric(previousReport, "sleepQuality", sleepQualityScores);
  const appointmentsCurrent = dailyAppointmentSeries(report);
  const appointmentsPrevious = dailyAppointmentSeries(previousReport);
  const hydrationChecksCurrent = dailyLatestMetric(report, "waterIntakeMl");
  const hydrationChecksPrevious = dailyLatestMetric(previousReport, "waterIntakeMl");

  type SignalPoint = { date: string; value: number; unit?: string };
  const goalCategoryForSignal: Record<string, string[]> = {
    weight: ["WEIGHT"],
    glucose: ["BLOOD_GLUCOSE", "GLUCOSE"],
    "total-cholesterol": ["CHOLESTEROL"],
    "cholesterol-goal": ["CHOLESTEROL"],
    smoking: ["SMOKING"],
    alcohol: ["ALCOHOL"],
    nutrition: ["NUTRITION"],
    hydration: ["HYDRATION"],
    exercise: ["EXERCISE"],
    workouts: ["EXERCISE"],
    "sleep-checkin": ["SLEEP"],
    "sleep-session": ["SLEEP"],
    stress: ["MENTAL_HEALTH"],
    mood: ["MENTAL_HEALTH"],
  };
  const signal = (key: string, label: string, currentPoints: SignalPoint[], previousPoints: SignalPoint[], fallbackUnit = "") => {
    const unit = String(currentPoints.at(-1)?.unit || fallbackUnit || previousPoints.at(-1)?.unit || "").trim();
    const currentHasSourceUnits = currentPoints.some((point) => Boolean(point.unit?.trim()));
    const previousHasSourceUnits = previousPoints.some((point) => Boolean(point.unit?.trim()));
    const normalizeComparableUnit = (value: unknown) => {
      const normalized = String(value ?? "").trim().toLowerCase();
      if (/^(ml|millilit(er|re)s?)$/.test(normalized)) return "ml";
      if (/^(min|mins|minute|minutes)$/.test(normalized)) return "min";
      return normalized;
    };
    const filterComparableUnit = (points: SignalPoint[]) => {
      if (!unit || (!currentHasSourceUnits && !previousHasSourceUnits)) return points;
      return points.filter((point) => {
        const pointUnit = String(point.unit ?? "").trim();
        // Journal hydration/exercise fields have implicit units in their field names.
        if (!pointUnit && (key === "hydration" || key === "exercise")) return true;
        return normalizeComparableUnit(pointUnit) === normalizeComparableUnit(unit);
      });
    };
    const categoryCandidates = goalCategoryForSignal[key] ?? [];
    const normalizedCategory = (value: unknown) => String(value ?? "").toUpperCase().replace(/[\s-]+/g, "_");
    const categoryAllowed =
      !((key === "workouts" && (exerciseChecksCurrent.length > 0 || exerciseEventsCurrent.length > 0)) ||
        (key === "sleep-session" && sleepChecksCurrent.length > 0) ||
        ((key === "mood" || key === "energy") && stressCurrent.length > 0) ||
        (key === "mood" && energyCurrent.length > 0));
    const savedGoal = categoryAllowed && categoryCandidates.length
      ? goals.find((goal) => categoryCandidates.includes(normalizedCategory(goal.category)))
      : undefined;
    return {
      key,
      label,
      unit,
      current: toDaily(filterComparableUnit(currentPoints)),
      previous: toDaily(filterComparableUnit(previousPoints)),
      targetValue: finite(savedGoal?.targetValue),
      targetTitle: savedGoal?.title || undefined,
      targetUnit: savedGoal?.unit || unit,
      goalCategory: savedGoal?.category || undefined,
    };
  };
  const baseSignals: Array<{ key: string; label: string; unit: string; current: DailyValue[]; previous: DailyValue[]; targetValue?: number | null; targetTitle?: string; targetUnit?: string; goalCategory?: string }> = [
    signal("weight", "Weight", weightCurrent, weightPrevious, "kg"),
    signal("glucose", "Blood glucose", glucoseCurrent, glucosePrevious, glucoseLabCurrentSpecific.at(-1)?.unit || glucoseLabPreviousSpecific.at(-1)?.unit || "mmol/L"),
    ...(a1cCurrent.length || a1cPrevious.length ? [
      signal("hba1c", "HbA1c", a1cCurrent, a1cPrevious, a1cCurrent.at(-1)?.unit || a1cPrevious.at(-1)?.unit || "%"),
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
    ...(!anyLipidSeries && !anyLipidLab && (cholesterolEventsCurrent.length || cholesterolEventsPrevious.length) ? [
      signal("cholesterol-goal", "Cholesterol goal log", cholesterolEventsCurrent, cholesterolEventsPrevious, "mmol/L"),
    ] : []),
    signal("smoking", "Cigarettes logged", smokingCurrent, smokingPrevious, "cigarettes"),
    signal("alcohol", "Alcohol logged", alcoholCurrent, alcoholPrevious, "drinks"),
    signal("nutrition", "Nutrition / calories", nutritionCurrent, nutritionPrevious, "kcal"),
    signal("hydration", "Water intake", preferPrimaryByDate(hydrationChecksCurrent, hydrationEventsCurrent), preferPrimaryByDate(hydrationChecksPrevious, hydrationEventsPrevious), "ml"),
    signal("exercise", "Exercise logged", preferPrimaryByDate(exerciseChecksCurrent, exerciseEventsCurrent), preferPrimaryByDate(exerciseChecksPrevious, exerciseEventsPrevious), "min"),
    signal("workouts", "Workout sessions", workoutsCurrent, workoutsPrevious, "min/day"),
    signal("sleep-checkin", "Sleep check-ins", sleepChecksCurrent, sleepChecksPrevious, "hours"),
    signal("sleep-session", "Connected sleep", sleepSessionsCurrent, sleepSessionsPrevious, "hours/day"),
    signal("stress", "Stress rating", stressCurrent, stressPrevious, "/10"),
    signal("mood", "Mood rating", moodRatingsCurrent, moodRatingsPrevious, "/5"),
    signal("energy", "Energy level", energyCurrent, energyPrevious, "/5"),
    signal("sleep-quality", "Sleep quality", sleepQualityCurrent, sleepQualityPrevious, "/5"),
    signal("appointments", "Appointments", appointmentsCurrent, appointmentsPrevious, "per day"),
    signal("symptoms", "Symptom logs", dailySymptomSeries(report), dailySymptomSeries(previousReport), "logs/day"),
  ].filter((item) => item.current.length > 0 || item.previous.length > 0);

  const wellnessKeyAlreadyRepresented = (key: string) => {
    const normalized = key.toLowerCase();
    const has = (...series: Array<{ length: number }>) => series.some((item) => item.length > 0);
    if (/weight|body.?mass/.test(normalized)) return has(weightCurrent, weightPrevious);
    if (/hba1c|a1c|glycat|glycosylat/.test(normalized)) return has(a1cCurrent, a1cPrevious);
    if (/mood/.test(normalized)) return has(moodRatingsCurrent, moodRatingsPrevious);
    if (/energy/.test(normalized)) return has(energyCurrent, energyPrevious);
    if (/sleep.?quality|sleepquality/.test(normalized)) return has(sleepQualityCurrent, sleepQualityPrevious);
    if (/glucose/.test(normalized)) return has(glucoseCurrent, glucosePrevious);
    if (/\bldl\b|low.density.lipoprotein/.test(normalized)) return has(ldlCurrent, ldlPrevious);
    if (/\bhdl\b|high.density.lipoprotein/.test(normalized)) return has(hdlCurrent, hdlPrevious);
    if (/triglyceride/.test(normalized)) return has(triglyceridesCurrent, triglyceridesPrevious);
    if (/total.cholesterol|cholesterol.total|serum.cholesterol|^cholesterol$/.test(normalized)) return has(totalCholesterolCurrent, totalCholesterolPrevious);
    if (/cholesterol|lipid/.test(normalized)) return anyLipidLab || has(cholesterolEventsCurrent, cholesterolEventsPrevious);
    if (/smoking|tobacco|cigarette/.test(normalized)) return has(smokingCurrent, smokingPrevious);
    if (/alcohol|drink/.test(normalized)) return has(alcoholCurrent, alcoholPrevious);
    if (/medication|adherence/.test(normalized)) return doseCurrent.eventTotal > 0 || doseCurrent.legacyTotal > 0;
    if (/nutrition|calorie|energy.intake/.test(normalized)) return has(nutritionCurrent, nutritionPrevious);
    if (/hydration|water/.test(normalized)) return has(hydrationEventsCurrent, hydrationEventsPrevious, hydrationChecksCurrent, hydrationChecksPrevious);
    if (/exercise|workout|fitness|active.minutes/.test(normalized)) return has(exerciseEventsCurrent, exerciseEventsPrevious, exerciseChecksCurrent, exerciseChecksPrevious, workoutsCurrent, workoutsPrevious);
    if (/sleep/.test(normalized)) return has(sleepChecksCurrent, sleepChecksPrevious, sleepSessionsCurrent, sleepSessionsPrevious);
    if (/stress/.test(normalized)) return has(stressCurrent, stressPrevious);
    if (/heart.?rate|pulse|\bbpm\b/.test(normalized)) return has(vitalSeries(report, "heartRate"), vitalSeries(previousReport, "heartRate"));
    if (/blood.?pressure|systolic|diastolic|\bsbp\b|\bdbp\b/.test(normalized)) return has(vitalSeries(report, "systolic"), vitalSeries(report, "diastolic"), vitalSeries(previousReport, "systolic"), vitalSeries(previousReport, "diastolic"));
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
    ...(report.activity.deviceMeasurements ?? []).map((item) => String(item.metricKey || item.measurementType || item.vitalType?.name || "").trim()).filter(Boolean),
    ...(previousReport?.activity.deviceMeasurements ?? []).map((item) => String(item.metricKey || item.measurementType || item.vitalType?.name || "").trim()).filter(Boolean),
  ])).filter((key) => key && !wellnessKeyAlreadyRepresented(key));
  const wearableSignals = wellnessKeys.map((key) => {
    const current = combineDatedSeries(wellnessMetricSeries(report, key), deviceMetricSeries(report, key));
    const previous = combineDatedSeries(wellnessMetricSeries(previousReport, key), deviceMetricSeries(previousReport, key));
    return signal("wearable:" + key, human(key), current, previous, current.at(-1)?.unit || previous.at(-1)?.unit || "");
  }).filter((item) => item.current.length > 0 || item.previous.length > 0);

  const knownLabAnalyte = /glucose|hba1c|\ba1c\b|glycat|glycosylat|total cholesterol|cholesterol total|serum cholesterol|^cholesterol$|\bldl\b|low[- ]density lipoprotein|\bhdl\b|high[- ]density lipoprotein|triglyceride/i;
  const allLabCurrent = clinicalLabSeries(report, /.+/i).filter((point) => !knownLabAnalyte.test(point.testName));
  const allLabPrevious = clinicalLabSeries(previousReport, /.+/i).filter((point) => !knownLabAnalyte.test(point.testName));
  const genericLabKeys = Array.from(new Set([
    ...allLabCurrent.map((point) => point.testName.trim().toLowerCase() + "|" + point.unit.trim().toLowerCase()),
    ...allLabPrevious.map((point) => point.testName.trim().toLowerCase() + "|" + point.unit.trim().toLowerCase()),
  ]));
  const genericLabSignals = genericLabKeys.map((key) => {
    const [name, unit] = key.split("|");
    const current = allLabCurrent.filter((point) => point.testName.trim().toLowerCase() + "|" + point.unit.trim().toLowerCase() === key);
    const previous = allLabPrevious.filter((point) => point.testName.trim().toLowerCase() + "|" + point.unit.trim().toLowerCase() === key);
    const label = current[0]?.testName || previous[0]?.testName || human(name);
    return signal("lab:" + key, label, current, previous, unit);
  }).filter((item) => item.current.length > 0 || item.previous.length > 0);
  const hasDates = (...series: Array<{ length: number }>) => series.some((seriesItem) => seriesItem.length > 0);
  const manualGoalSignals = manualGoalTrends.filter((item) => {
    const category = item.category.toUpperCase().replace(/[\s-]+/g, "_");
    if (category === "WEIGHT") return !hasDates(weightCurrent, weightPrevious);
    if (category === "BLOOD_GLUCOSE" || category === "GLUCOSE") return !hasDates(glucoseCurrent, glucosePrevious);
    if (category === "CHOLESTEROL") return !hasDates(totalCholesterolCurrent, totalCholesterolPrevious, ldlCurrent, ldlPrevious, hdlCurrent, hdlPrevious, triglyceridesCurrent, triglyceridesPrevious);
    if (category === "SMOKING") return !hasDates(smokingCurrent, smokingPrevious);
    if (category === "ALCOHOL") return !hasDates(alcoholCurrent, alcoholPrevious);
    if (category === "MEDICATION") return doseCurrent.eventTotal === 0 && doseCurrent.legacyTotal === 0;
    if (category === "HYDRATION") return !hasDates(hydrationChecksCurrent, hydrationChecksPrevious, hydrationEventsCurrent, hydrationEventsPrevious);
    if (category === "EXERCISE") return !hasDates(exerciseChecksCurrent, exerciseChecksPrevious, exerciseEventsCurrent, exerciseEventsPrevious, workoutsCurrent, workoutsPrevious);
    if (category === "SLEEP") return !hasDates(sleepChecksCurrent, sleepChecksPrevious, sleepSessionsCurrent, sleepSessionsPrevious);
    if (category === "MENTAL_HEALTH") return !hasDates(stressCurrent, stressPrevious, moodRatingsCurrent, moodRatingsPrevious);
    if (category === "BLOOD_PRESSURE") return !hasDates(vitalSeries(report, "systolic"), vitalSeries(report, "diastolic"), vitalSeries(previousReport, "systolic"), vitalSeries(previousReport, "diastolic"));
    if (category === "HEART_RATE") return !hasDates(vitalSeries(report, "heartRate"), vitalSeries(previousReport, "heartRate"));
    if (category === "NUTRITION") return !hasDates(nutritionCurrent, nutritionPrevious);
    return true;
  }).map((item) => ({
    key: "goal-progress:" + item.key,
    label: item.title,
    unit: item.valueKind === "percent" ? "%" : item.unit,
    current: item.current,
    previous: item.previous,
    targetValue: item.targetValue,
    targetTitle: item.title,
    targetUnit: item.unit,
    goalCategory: item.category,
  }));
  const hasWeightVitalHistory = vitalSeries(report, "weight").length > 0 || vitalSeries(previousReport, "weight").length > 0;
  const signals: Array<{ key: string; label: string; unit: string; current: DailyValue[]; previous: DailyValue[]; targetValue?: number | null; targetTitle?: string; targetUnit?: string; goalCategory?: string }> = [
    ...baseSignals,
    ...wearableSignals,
    ...genericLabSignals,
    ...manualGoalSignals,
  ].filter((item) => item.key !== "weight" || !hasWeightVitalHistory);

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
  const moodAverage = mean(moodRatingsCurrent.map((item) => item.value));
  const previousMoodAverage = mean(moodRatingsPrevious.map((item) => item.value));
  if (moodAverage !== null && (moodAverage <= 2.2 || (previousMoodAverage !== null && moodAverage <= previousMoodAverage - 0.8))) {
    recommendations.push({
      title: "Mood ratings are low or have declined",
      evidence: "Current average " + formatNumber(moodAverage, 1) + "/5" + (previousMoodAverage === null ? "" : " · previous " + formatNumber(previousMoodAverage, 1) + "/5"),
      action: "Check in with yourself and reach out to someone you trust or a health professional if low mood persists or feels hard to manage.",
      tone: "watch",
      href: "/today",
      linkLabel: "Review wellbeing check-in",
    });
  }
  const energyAverage = mean(energyCurrent.map((item) => item.value));
  if (energyAverage !== null && energyAverage <= 2) {
    recommendations.push({
      title: "Low energy ratings",
      evidence: "Average energy rating " + formatNumber(energyAverage, 1) + "/5 on days with entries.",
      action: "Review this alongside sleep and symptoms; discuss persistent or unexplained fatigue with a healthcare professional.",
      tone: "watch",
      href: "/health-journal",
      linkLabel: "Review daily logs",
    });
  }
  const sleepQualityAverage = mean(sleepQualityCurrent.map((item) => item.value));
  if (sleepQualityAverage !== null && sleepQualityAverage <= 2) {
    recommendations.push({
      title: "Poor sleep quality reported",
      evidence: "Average sleep-quality rating " + formatNumber(sleepQualityAverage, 1) + "/5.",
      action: "Compare sleep-quality ratings with logged sleep duration and stress; seek support if problems persist.",
      tone: "watch",
      href: "/today",
      linkLabel: "Review sleep check-in",
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

  const reportSignals = signals.filter((item) => {
    if (item.key === "appointments" || item.key === "symptoms") return false;
    if (item.key === "workouts" && signals.some((candidate) => candidate.key === "exercise" && candidate.current.length > 0)) return false;
    if (item.key === "sleep-session" && signals.some((candidate) => candidate.key === "sleep-checkin" && candidate.current.length > 0)) return false;
    return true;
  });
  const signalPriority = (item: typeof reportSignals[number]) => {
    const currentAverage = mean(item.current.map((entry) => entry.value));
    const previousAverage = mean(item.previous.map((entry) => entry.value));
    const hasTarget = item.targetValue !== null && item.targetValue !== undefined ? 100 : 0;
    if (currentAverage === null || previousAverage === null) return hasTarget;
    const delta = Math.abs(currentAverage - previousAverage);
    const isRating = item.unit === "/5" || item.unit === "/10";
    const changeScore = isRating ? delta * 5 : Math.abs(previousAverage) > 0.000001 ? Math.min(40, delta / Math.abs(previousAverage) * 100) : Math.min(40, delta);
    return hasTarget + changeScore;
  };
  const rankedSignals = reportSignals.slice().sort((left, right) => signalPriority(right) - signalPriority(left));
  const featuredSignals = rankedSignals.slice(0, 6);
  const remainingSignals = rankedSignals.slice(6);
  const movementCounts = featuredSignals.reduce((counts, item) => {
    const movement = periodMovement(item.current.map((entry) => entry.value), item.previous.map((entry) => entry.value), item.unit, signalDigits(item.key, item.unit));
    if (movement.state === "up") counts.up += 1;
    else if (movement.state === "down") counts.down += 1;
    else if (movement.state === "steady") counts.steady += 1;
    return counts;
  }, { up: 0, down: 0, steady: 0 });
  const hasComparableSignals = movementCounts.up + movementCounts.down + movementCounts.steady > 0;
  const followUpRecommendations = recommendations.filter((item) => ![
    "Urgent measurement needs review",
    "Follow up flagged laboratory results",
    "Symptom logging increased",
    "Worsening or severe symptoms recorded",
    "Medication side effects recorded",
    "High stress check-ins",
    "Mood ratings are low or have declined",
    "Poor sleep quality reported",
    "Short sleep recorded",
    "Medication dose records need review",
  ].includes(item.title)).slice(0, 3);
  const noPrior = previousReport === null;

  return (
    <section aria-label="Health trends and recommendations" className="space-y-5">
      <section className="rounded-2xl border border-[#dcebed] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b7b80]">Period comparison</p>
            <h2 className="mt-1 text-lg font-black text-[#0b2d54]">What changed</h2>
            <p className="mt-1 text-xs text-slate-500">{previousLoading ? "Comparing with the previous period…" : noPrior ? "No previous-period report available" : "Compared with the previous period"}</p>
          </div>
        </div>
        {previousLoading ? (
          <p className="mt-3 rounded-xl bg-[#f5fafb] px-3 py-2.5 text-xs font-semibold text-slate-600">Comparing this period with the previous one…</p>
        ) : hasComparableSignals ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600"><span className="rounded-full bg-[#e8f8f8] px-2.5 py-1 text-[#0b5a62]">{movementCounts.up} up</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">{movementCounts.down} down</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{movementCounts.steady} steady</span></div>
        ) : null}
        {featuredSignals.length ? (
          <>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {featuredSignals.map((signal, index) => {
                const currentAverage = mean(signal.current.map((item) => item.value));
                const previousAverage = mean(signal.previous.map((item) => item.value));
                const digits = signalDigits(signal.key, signal.unit);
                const unitSuffix = signal.unit ? (signal.unit.startsWith("/") ? signal.unit : " " + signal.unit) : "";
                const targetValue = finite(signal.targetValue);
                const targetUnit = String(signal.targetUnit || signal.unit || "");
                const movement = previousLoading ? null : periodMovement(signal.current.map((item) => item.value), signal.previous.map((item) => item.value), signal.unit, digits);
                const isDailyHydrationGoal = signal.key === "hydration" && targetValue !== null && targetValue > 0 &&
                  /^(ml|millilit(er|re)s?)$/i.test(signal.unit.trim()) &&
                  (/^(ml|millilit(er|re)s?)$/i.test(targetUnit.trim()) || /^glasses?(\s*\/\s*day)?$/i.test(targetUnit.trim()));
                const hydrationPercent = isDailyHydrationGoal && currentAverage !== null ? currentAverage / targetValue * 100 : null;
                const hydrationDaysMet = isDailyHydrationGoal ? signal.current.filter((item) => item.value >= targetValue).length : 0;
                const higherUsuallyHelps = /^(hydration|exercise|workouts|sleep-checkin|sleep-session|mood|energy|sleep-quality)$/.test(signal.key) || /steps/i.test(signal.key);
                const lowerUsuallyHelps = /^(smoking|alcohol|stress|symptoms)$/.test(signal.key);
                const directionImproves = Boolean(movement && (
                  (higherUsuallyHelps && movement.state === "up") ||
                  (lowerUsuallyHelps && movement.state === "down")
                ));
                const directionWorsens = Boolean(movement && (
                  (higherUsuallyHelps && movement.state === "down") ||
                  (lowerUsuallyHelps && movement.state === "up")
                ));
                const pillTone = directionImproves
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : directionWorsens
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-slate-200 bg-slate-50 text-slate-700";
                return (
                  <div key={signal.key} className={"grid gap-2 px-4 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-center " + (index < featuredSignals.length - 1 ? "border-b border-slate-100" : "")}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="text-sm font-bold text-[#0b2d54]">{signal.label}</p>
                        <p className="text-lg font-black tracking-tight text-[#0b2d54]">{currentAverage === null ? "—" : formatNumber(currentAverage, digits)}{unitSuffix}</p>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">Average across {signal.current.length} logged day{signal.current.length === 1 ? "" : "s"}</p>
                    </div>
                    <div className="min-w-0 sm:text-right">
                      <span className={"inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold " + pillTone}>{movement?.label ?? (previousLoading ? "Comparing…" : "No comparison")}</span>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">{previousAverage === null ? "No comparable previous-period average." : "Previous average " + formatNumber(previousAverage, digits) + unitSuffix + "."}</p>
                      {targetValue !== null && <p className="mt-1 text-[11px] font-semibold leading-5 text-[#0b7b80]">{isDailyHydrationGoal ? "Drink more water · target " + formatNumber(targetValue / 1000, 1) + " L/day" : (signal.targetTitle || "Saved goal") + " · target " + formatNumber(targetValue, Number.isInteger(targetValue) ? 0 : signalDigits(signal.key, targetUnit)) + (targetUnit ? (targetUnit.startsWith("/") ? targetUnit : " " + targetUnit) : "")}</p>}
                      {isDailyHydrationGoal && hydrationPercent !== null && currentAverage !== null && (
                        <div className="mt-2 sm:ml-auto sm:max-w-xs">
                          <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-600">
                            <span>{formatNumber(hydrationPercent, 0)}% of daily target</span>
                            <span>{hydrationDaysMet}/{signal.current.length} days met</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-[#24c1c4]" style={{ width: String(Math.max(0, Math.min(100, hydrationPercent))) + "%" }} />
                          </div>
                          <p className="mt-1 text-[10px] leading-4 text-slate-500">Recorded days only; missing days are not treated as zero.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {remainingSignals.length > 0 && (
              <details className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold text-[#0b2d54]">
                  <span>Other tracked measures</span><span className="text-[10px] font-semibold text-slate-500">{remainingSignals.length} more</span>
                </summary>
                <div className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
                  {remainingSignals.map((signal) => {
                    const currentAverage = mean(signal.current.map((item) => item.value));
                    const previousAverage = mean(signal.previous.map((item) => item.value));
                    const digits = signalDigits(signal.key, signal.unit);
                    const unitSuffix = signal.unit ? (signal.unit.startsWith("/") ? signal.unit : " " + signal.unit) : "";
                    const movement = previousLoading ? null : periodMovement(signal.current.map((item) => item.value), signal.previous.map((item) => item.value), signal.unit, digits);
                    return (
                      <div key={signal.key} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4">
                        <p className="text-xs font-semibold text-[#0b2d54]">{signal.label}<span className="ml-2 text-[10px] font-normal text-slate-400">{signal.current.length} day(s)</span></p>
                        <p className="text-xs font-bold text-[#0b2d54]">{currentAverage === null ? "No current-period readings" : formatNumber(currentAverage, digits) + unitSuffix}</p>
                        <p className="text-[10px] font-semibold text-slate-500">{movement?.label ?? (previousLoading ? "Comparing…" : previousAverage === null ? "No prior comparison" : "Previous " + formatNumber(previousAverage, digits) + unitSuffix)}</p>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </>
        ) : (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No comparable numeric logs were returned for this period.</p>
        )}
      </section>

      {followUpRecommendations.length > 0 && (
        <section className="rounded-2xl border border-[#dcebed] bg-white p-4 sm:p-5" aria-label="Recommended follow-up">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b7b80]">Next steps</p>
          <h2 className="mt-1 text-lg font-black text-[#0b2d54]">What deserves attention</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {followUpRecommendations.map((item) => (
              <div key={item.title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className={"mt-1 h-2.5 w-2.5 shrink-0 rounded-full " + (item.tone === "critical" ? "bg-rose-600" : item.tone === "high" ? "bg-orange-500" : item.tone === "watch" ? "bg-amber-500" : "bg-teal-500")} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[#0b2d54]">{item.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-600">{item.evidence}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.action}</p>
                  <Link href={item.href} className="mt-2 inline-flex min-h-8 items-center gap-1 text-[11px] font-bold text-[#0b7b80]">{item.linkLabel} <ArrowRight className="h-3 w-3" /></Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}


type MedicationActionGroup = {
  key: string;
  name: string;
  patientMedicationId?: string;
  source: "event" | "journal";
  actions: MedicationDoseAction[];
  taken: number;
  skipped: number;
  total: number;
  recordedDays: number;
};

function groupMedicationActions(actions: MedicationDoseAction[]) {
  const groups = new Map<string, MedicationActionGroup & { dates: Set<string> }>();
  actions.forEach((action) => {
    const id = String(action.patientMedicationId ?? "").trim();
    const name = String(action.medicationName ?? "").trim() || "Medication (name unavailable)";
    const key = id ? "id:" + id : "name:" + name.toLowerCase();
    const existing = groups.get(key) ?? {
      key,
      name,
      patientMedicationId: id || undefined,
      source: action.source,
      actions: [],
      taken: 0,
      skipped: 0,
      total: 0,
      recordedDays: 0,
      dates: new Set<string>(),
    };
    existing.actions.push(action);
    existing.total += 1;
    existing.dates.add(action.date);
    if (action.action === "TAKEN") existing.taken += 1;
    else existing.skipped += 1;
    groups.set(key, existing);
  });
  const result = new Map<string, MedicationActionGroup>();
  groups.forEach((group, key) => {
    result.set(key, { ...group, recordedDays: group.dates.size });
  });
  return result;
}

type MedicationPeriodSummary = {
  scheduledDoses: number;
  takenDoses: number;
  skippedDoses: number;
  unrecordedDoses: number;
  scheduledDays: number;
  daysWithActions: number;
  daysAtTarget: number;
  completeDays: number;
  adherencePercent: number | null;
  todayExcluded: boolean;
};

function medicationPeriodSummary(
  insight: MedicationInsightPayload,
  report: Report | null,
  targetAdherence: number,
): MedicationPeriodSummary {
  const buckets = (insight.analysis?.dailyBuckets ?? []).filter((bucket) => {
    if (!bucket.day) return false;
    const noon = new Date(String(bucket.day).slice(0, 10) + "T12:00:00.000Z").getTime();
    return withinReportPeriod(report, noon);
  });
  const today = dateKey(new Date().toISOString());
  const todayExcluded = buckets.some((bucket) => bucket.day === today);
  const scheduled = buckets.filter((bucket) => bucket.day !== today && (finite(bucket.expectedDoses) ?? 0) > 0);
  const sumField = (items: MedicationInsightBucket[], field: "expectedDoses" | "takenDoses" | "skippedDoses" | "unrecordedDoses" | "recordedActions") =>
    items.reduce((sum, item) => sum + Math.max(0, finite(item[field]) ?? 0), 0);
  const scheduledDoses = sumField(scheduled, "expectedDoses");
  const takenDoses = sumField(scheduled, "takenDoses");
  const skippedDoses = sumField(scheduled, "skippedDoses");
  const unrecordedDoses = sumField(scheduled, "unrecordedDoses");
  const daysWithActions = scheduled.filter((item) => (finite(item.recordedActions) ?? 0) > 0).length;
  const daysAtTarget = scheduled.filter((item) => (finite(item.adherencePercent) ?? 0) >= targetAdherence).length;
  const completeDays = scheduled.filter((item) => (finite(item.takenDoses) ?? 0) >= (finite(item.expectedDoses) ?? 0)).length;
  return {
    scheduledDoses,
    takenDoses,
    skippedDoses,
    unrecordedDoses,
    scheduledDays: scheduled.length,
    daysWithActions,
    daysAtTarget,
    completeDays,
    adherencePercent: scheduledDoses > 0 ? Number(((takenDoses / scheduledDoses) * 100).toFixed(1)) : null,
    todayExcluded,
  };
}

function MedicationPeriodInsights({
  report,
  previousReport,
  previousLoading,
}: {
  report: Report;
  previousReport: Report | null;
  previousLoading: boolean;
}) {
  const medicationGoals = useMemo(
    () => (report.currentSnapshot?.activeGoals ?? []).filter((goal) => {
      const category = String(goal.category ?? "").toUpperCase().replace(/[\s-]+/g, "_");
      const status = String(goal.status ?? "ACTIVE").toUpperCase();
      return category === "MEDICATION" && Boolean(goal.id) && !["ACHIEVED", "COMPLETED", "CANCELLED", "ARCHIVED"].includes(status);
    }),
    [report.currentSnapshot?.activeGoals],
  );
  const [insights, setInsights] = useState<Array<{ goalId: string; goalTitle: string; insight?: MedicationInsightPayload; failed: boolean }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!medicationGoals.length) {
      setInsights([]);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    Promise.all(medicationGoals.map(async (goal) => {
      const goalId = String(goal.id);
      try {
        const response = await api.get("/patient-health-goals/" + encodeURIComponent(goalId) + "/medication-insight");
        const insight = unwrap<MedicationInsightPayload>(response.data);
        return { goalId, goalTitle: String(goal.title || "Medication goal"), insight, failed: false };
      } catch {
        return { goalId, goalTitle: String(goal.title || "Medication goal"), failed: true };
      }
    })).then((results) => {
      if (active) setInsights(results);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [medicationGoals]);

  const currentTotals = medicationDoseTotals(report);
  const previousTotals = medicationDoseTotals(previousReport);
  const currentActions = currentTotals.eventTotal > 0 ? currentTotals.eventActions : currentTotals.legacyActions;
  const previousActions = previousTotals.eventTotal > 0 ? previousTotals.eventActions : previousTotals.legacyActions;
  const currentGroups = groupMedicationActions(currentActions);
  const previousGroups = groupMedicationActions(previousActions);
  const medicationsOnFile = report.currentSnapshot?.medications ?? [];

  type DisplayRow = {
    key: string;
    name: string;
    dosage: string;
    source: "schedule" | "events" | "legacy" | "empty";
    current: MedicationPeriodSummary | null;
    previous: MedicationPeriodSummary | null;
    currentGroup?: MedicationActionGroup;
    previousGroup?: MedicationActionGroup;
    target: number | null;
    currentDayInProgress: boolean;
    engine?: MedicationInsightPayload;
  };

  const displayRows: DisplayRow[] = [];
  const representedActionKeys = new Set<string>();
  const representedNames = new Set<string>();

  insights.forEach((item) => {
    const engine = item.insight;
    const schedule = engine?.unified?.medicationSchedule;
    const name = String(schedule?.name || item.goalTitle || "Medication");
    const patientMedicationId = String(schedule?.patientMedicationId ?? "").trim();
    const normalizedName = name.trim().toLowerCase();
    const actionKey = patientMedicationId ? "id:" + patientMedicationId : "name:" + normalizedName;
    const currentGroup = currentGroups.get(actionKey) ??
      Array.from(currentGroups.values()).find((group) => group.name.trim().toLowerCase() === normalizedName);
    const previousGroup = previousGroups.get(actionKey) ??
      Array.from(previousGroups.values()).find((group) => group.name.trim().toLowerCase() === normalizedName);
    // If a goal is not linked to a PatientMedication record, do not add a
    // duplicate placeholder row when identifiable dose events already supply the medicine name.
    if (!engine && !currentGroup && !previousGroup && (currentGroups.size > 0 || previousGroups.size > 0)) return;
    const target = finite(engine?.unified?.goalConfig?.targetAdherence) ??
      finite(engine?.analysis?.goalIntelligence?.targetAdherencePercent) ??
      finite(medicationGoals.find((goal) => String(goal.id) === item.goalId)?.targetValue);
    const safeTarget = target !== null && target >= 1 && target <= 100 ? target : null;
    const currentSummary = engine ? medicationPeriodSummary(engine, report, safeTarget ?? 90) : null;
    const previousSummary = engine && previousReport ? medicationPeriodSummary(engine, previousReport, safeTarget ?? 90) : null;
    const hasScheduledComparison =
      (currentSummary?.scheduledDoses ?? 0) > 0 || (previousSummary?.scheduledDoses ?? 0) > 0;
    if (currentGroup) representedActionKeys.add(currentGroup.key);
    if (previousGroup) representedActionKeys.add(previousGroup.key);
    representedNames.add(normalizedName);
    displayRows.push({
      key: "goal:" + item.goalId,
      name,
      dosage: [schedule?.dosage, schedule?.frequency || (finite(schedule?.dosesPerDay) !== null ? String(finite(schedule?.dosesPerDay)) + " dose(s)/day" : "")].filter(Boolean).join(" · "),
      source: hasScheduledComparison ? "schedule" : currentGroup?.source === "journal" || previousGroup?.source === "journal" ? "legacy" : currentGroup?.total || previousGroup?.total ? "events" : "empty",
      current: hasScheduledComparison ? currentSummary : null,
      previous: hasScheduledComparison ? previousSummary : null,
      currentGroup,
      previousGroup,
      target: safeTarget,
      currentDayInProgress: Boolean(currentSummary?.todayExcluded),
      engine,
    });
  });

  const actionKeys = new Set([...currentGroups.keys(), ...previousGroups.keys()]);
  actionKeys.forEach((key) => {
    const currentGroup = currentGroups.get(key);
    const previousGroup = previousGroups.get(key);
    const group = currentGroup ?? previousGroup;
    if (!group || representedActionKeys.has(key) || representedNames.has(group.name.trim().toLowerCase())) return;
    const isLegacy = group.source === "journal" || currentGroup?.source === "journal" || previousGroup?.source === "journal";
    displayRows.push({
      key: "actions:" + key,
      name: group.name,
      dosage: "",
      source: isLegacy ? "legacy" : "events",
      current: null,
      previous: null,
      currentGroup,
      previousGroup,
      target: null,
      currentDayInProgress: false,
    });
  });

  const uniqueMedicationNames = Array.from(new Set(medicationsOnFile
    .map((item) => String(item.medication?.name || item.medication?.genericName || item.medication?.brandName || "").trim())
    .filter(Boolean)));

  const patternNotes: Array<{ key: string; title: string; body: string }> = [];
  const seenPatterns = new Set<string>();
  insights.forEach((item) => {
    const intelligence = item.insight?.analysis?.clinicalIntelligence;
    const candidates = [
      ...(intelligence?.secondaryInsights ?? []),
      intelligence?.clinicalNarrative?.pattern ?? "",
      intelligence?.clinicalNarrative?.routineAnchor?.statement ?? "",
      intelligence?.headline ?? "",
      item.insight?.analysis?.goalIntelligence?.insight ?? "",
    ];
    candidates.forEach((candidate) => {
      const body = String(candidate ?? "").trim();
      const normalized = body.toLowerCase();
      if (!body || seenPatterns.has(normalized) || patternNotes.length >= 3) return;
      seenPatterns.add(normalized);
      patternNotes.push({ key: item.goalId + ":" + patternNotes.length, title: item.insight?.unified?.medicationSchedule?.name || item.goalTitle, body });
    });
  });

  const hasReportContent = displayRows.length > 0 || medicationGoals.length > 0 ||
    currentTotals.eventTotal > 0 || currentTotals.legacyTotal > 0 ||
    previousTotals.eventTotal > 0 || previousTotals.legacyTotal > 0 ||
    medicationsOnFile.length > 0 || loading;
  if (!hasReportContent) return null;

  return (
    <section aria-label="Medication trends and patterns" className="overflow-hidden rounded-2xl border border-[#dcebed] bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0b7b80]">Treatment routine</p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-black text-[#0b2d54]">Medication trends and patterns</h2>
          <span className="text-[11px] font-semibold text-slate-500">{report.period.label}</span>
        </div>
      </div>

      {loading && (
        <p className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500 sm:px-5">
          Reading your saved medication schedules and adherence history…
        </p>
      )}

      {displayRows.length > 0 && (
        <div className="divide-y divide-slate-100">
          {displayRows.map((row) => {
            const currentRate = row.current?.adherencePercent ?? (
              row.source === "events" && row.currentGroup?.total
                ? row.currentGroup.taken / row.currentGroup.total * 100
                : null
            );
            const comparableActionSources = row.currentGroup && row.previousGroup &&
              row.currentGroup.source === "event" && row.previousGroup.source === "event";
            const previousRate = row.previous?.adherencePercent ?? (
              row.source === "events" && comparableActionSources && row.previousGroup?.total
                ? row.previousGroup.taken / row.previousGroup.total * 100
                : null
            );
            const currentActionsTotal = row.currentGroup?.total ?? 0;
            const previousActionsTotal = row.previousGroup?.total ?? 0;
            const delta = currentRate !== null && previousRate !== null ? currentRate - previousRate : null;
            const movement = delta === null
              ? row.source === "schedule" && previousLoading ? "Comparing…"
                : currentRate === null ? "No period data"
                  : "New baseline"
              : delta > 1 ? "↑ " + formatNumber(delta, 1) + " percentage points"
                : delta < -1 ? "↓ " + formatNumber(Math.abs(delta), 1) + " percentage points"
                  : "Stable";
            const meetsTarget = row.target !== null && currentRate !== null && currentRate >= row.target;
            const adherenceTone = meetsTarget
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : currentRate === null ? "border-slate-200 bg-slate-50 text-slate-600"
                : "border-amber-200 bg-amber-50 text-amber-900";
            const movementTone = delta !== null && delta > 1
              ? "bg-emerald-50 text-emerald-800"
              : delta !== null && delta < -1
                ? "bg-amber-50 text-amber-900"
                : "bg-slate-50 text-slate-600";
            return (
              <article key={row.key} className="px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-[#0b2d54]">{row.name}</h3>
                      {row.source === "schedule" && row.target !== null && (
                        <span className={"rounded-full border px-2 py-0.5 text-[10px] font-bold " + adherenceTone}>
                          {currentRate === null ? "No completed days" : meetsTarget ? "Within goal" : "Below saved goal"}
                        </span>
                      )}
                    </div>
                    {row.dosage && <p className="mt-1 text-[11px] leading-5 text-slate-500">{row.dosage}</p>}
                  </div>
                  <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{row.source === "schedule" ? "Period adherence" : row.source === "events" ? "Recorded outcomes taken" : row.source === "legacy" ? "Older daily statuses" : "Adherence"}</p>
                      <p className="mt-0.5 text-xl font-black text-[#0b2d54]">
                        {currentRate === null ? "—" : formatNumber(currentRate, 1) + "%"}
                      </p>
                    </div>
                    <div className="max-w-[180px]">
                      <span className={"inline-flex rounded-full px-2 py-1 text-[10px] font-bold " + movementTone}>{movement}</span>
                      {row.target !== null && <p className="mt-1 text-[10px] font-semibold text-[#0b7b80]">Target {formatNumber(row.target, 0)}%</p>}
                    </div>
                  </div>
                </div>

                {row.source === "schedule" && row.current && (
                  <>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={"h-full rounded-full " + (meetsTarget ? "bg-emerald-500" : "bg-amber-400")} style={{ width: String(Math.max(0, Math.min(100, currentRate ?? 0))) + "%" }} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                      <div><p className="text-slate-400">Taken</p><p className="mt-0.5 font-bold text-[#0b2d54]">{row.current.takenDoses}/{row.current.scheduledDoses} scheduled</p></div>
                      <div><p className="text-slate-400">Skipped</p><p className="mt-0.5 font-bold text-[#0b2d54]">{row.current.skippedDoses}</p></div>
                      <div><p className="text-slate-400">Not recorded</p><p className="mt-0.5 font-bold text-[#0b2d54]">{row.current.unrecordedDoses}</p></div>
                      <div><p className="text-slate-400">Days at target</p><p className="mt-0.5 font-bold text-[#0b2d54]">{row.current.daysAtTarget}/{row.current.scheduledDays}</p></div>
                    </div>
                    {row.previous?.adherencePercent !== null && row.previous?.adherencePercent !== undefined && (
                      <p className="mt-2 text-[11px] text-slate-500">Previous period: {formatNumber(row.previous.adherencePercent, 1)}% · {row.previous.takenDoses}/{row.previous.scheduledDoses} scheduled doses taken.</p>
                    )}
                  </>
                )}
                {row.source === "events" && (
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    {currentActionsTotal > 0
                      ? currentGroupSummary(row.currentGroup)
                      : "No explicit taken/skipped outcomes were returned for this period."}
                    {row.previousGroup && comparableActionSources && previousActionsTotal > 0
                      ? " Previous period: " + formatNumber(row.previousGroup.taken / row.previousGroup.total * 100, 1) + "% of explicit outcomes were marked taken."
                      : row.previousGroup && previousActionsTotal > 0 ? " Previous records use a different logging format, so a trend is not calculated." : ""}
                  </p>
                )}
                {row.source === "legacy" && (
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    {currentActionsTotal > 0
                      ? row.currentGroup?.taken + " marked taken and " + row.currentGroup?.skipped + " marked skipped across " + row.currentGroup?.recordedDays + " older daily-status record(s)."
                      : "No older daily-status records were found for this period."}
                    {" These are legacy day statuses, not complete dose-level records; an adherence percentage is not estimated."}
                  </p>
                )}
                {row.source === "empty" && (
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    No scheduled outcomes found. Check the saved medication schedule link.
                  </p>
                )}
                {row.currentDayInProgress && <p className="mt-2 text-[10px] leading-4 text-slate-400">Today is still in progress and is excluded from the period adherence rate.</p>}
              </article>
            );
          })}
        </div>
      )}

      {!displayRows.length && uniqueMedicationNames.length > 0 && (
        <div className="px-4 py-4 sm:px-5">
          <p className="text-sm font-semibold text-[#0b2d54]">{uniqueMedicationNames.length} medication record{uniqueMedicationNames.length === 1 ? "" : "s"} on file</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">No scheduled dose history is available for this period; adherence is not estimated.</p>
          <p className="mt-2 text-xs text-slate-600">{uniqueMedicationNames.join(" · ")}</p>
        </div>
      )}

      {patternNotes.length > 0 && (
        <details className="border-t border-slate-100 bg-[#f4fbfb] px-4 py-3 sm:px-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold text-[#0b2d54]">
            <span className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#0b7b80]" /> Longer-term patterns</span>
            <span className="text-[10px] font-semibold text-[#0b7b80]">View {Math.min(patternNotes.length, 2)} signals</span>
          </summary>
          <div className="mt-3 space-y-3 border-t border-[#dcebed] pt-3">
            {patternNotes.slice(0, 2).map((note) => (
              <div key={note.key}>
                <p className="text-xs font-bold text-[#0b2d54]">{note.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{note.body}</p>
              </div>
            ))}
            <p className="text-[10px] leading-4 text-slate-400">Patterns are associations, not proof of cause. Discuss medicine concerns with your prescriber or pharmacist.</p>
          </div>
        </details>
      )}

    </section>
  );
}

function currentGroupSummary(group?: MedicationActionGroup) {
  if (!group || group.total === 0) return "No explicit dose-level actions were found.";
  return group.taken + " taken · " + group.skipped + " skipped · " + group.total + " outcomes logged. Adherence here covers logged actions only.";
}

function StatusCircle({
  label,
  detail,
  tone,
}: {
  label: string;
  detail: string;
  tone: StatusTone;
}) {
  const styles = toneStyles(tone);
  const mark = tone === "good" ? "✓" : tone === "watch" ? "!" : tone === "high" ? "!!" : tone === "critical" ? "SOS" : "?";
  return (
    <div className="min-w-0 space-y-1.5">
      <span className={"inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold " + styles.border + " " + styles.surface + " " + styles.text} aria-label={label}>
        <span aria-hidden="true">{mark}</span> {label}
      </span>
      {detail && <p title={detail} className={"line-clamp-2 text-[11px] leading-4 " + styles.text}>{detail}</p>}
    </div>
  );
}

function VitalTrendCard({
  label,
  unit,
  digits,
  current,
  previous,
  previousLoading,
  review,
  status,
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
  rawCurrent: SeriesPoint[];
}) {
  const currentValues = current.map((item) => item.value);
  const previousValues = previous.map((item) => item.value);
  const verificationSensitive = Boolean(review && /^(oxygen saturation|temperature|breathing rate)$/i.test(label.trim()));
  const average = verificationSensitive ? null : mean(currentValues);
  const latest = rawCurrent[rawCurrent.length - 1] ?? current[current.length - 1];
  const excludedCount = Math.max(0, rawCurrent.length - current.length);
  const movement = verificationSensitive || previousLoading ? null : periodMovement(currentValues, previousValues, unit, digits);

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-[#0b2d54]">{label}</h3>
          <p className="mt-1 text-[11px] text-slate-500">{rawCurrent.length} {rawCurrent.length === 1 ? "reading" : "readings"} saved</p>
        </div>
        <HeartPulse className="h-5 w-5 shrink-0 text-[#24c1c4]" />
      </div>
      <div className="mt-2"><StatusCircle label={verificationSensitive ? "Review flagged entries" : status.label} detail={verificationSensitive ? "" : /within your saved goal/i.test(status.label) ? (label.toLowerCase().includes("blood pressure") ? "Systolic target only; review both numbers." : "Latest reading is within your saved target.") : /elevated/i.test(status.label) ? "Discuss repeated readings with your clinician." : label === "Weight" ? "Shown against your saved measurements and goals." : status.detail} tone={verificationSensitive ? "watch" : status.tone} /></div>
      {excludedCount > 0 && <p className="mt-2 text-[11px] font-semibold text-amber-800">{excludedCount} {excludedCount === 1 ? "reading needs" : "readings need"} review and {excludedCount === 1 ? "is" : "are"} excluded from averages.</p>}
      {verificationSensitive ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-slate-700">Average withheld</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Review flagged readings first.</p>
          </div>
          <Link href="/today" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#0b2d54] px-3 py-2 text-[11px] font-bold text-white">Review <ArrowRight className="h-3.5 w-3.5 text-[#24c1c4]" /></Link>
        </div>
      ) : average === null ? (
        <p className="mt-3 text-sm text-slate-500">{rawCurrent.length > 0 ? "Review flagged entries before interpreting an average." : "No readings were saved for this period."}</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#f5fafb] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Period average</p>
              <p className="mt-1 text-xl font-black tabular-nums text-[#0b2d54]">{formatNumber(average, digits)} <span className="text-xs font-bold text-slate-500">{unit}</span></p>
            </div>
            <div className="rounded-xl bg-[#f5fafb] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Latest reading</p>
              <p className="mt-1 text-xl font-black tabular-nums text-[#0b2d54]">{latest ? formatNumber(latest.value, digits) : "—"} <span className="text-xs font-bold text-slate-500">{unit}</span></p>
              {latest && <p className="mt-1 text-[10px] text-slate-500">{dateLabel(new Date(latest.timestamp).toISOString())}</p>}
            </div>
          </div>
          {latest?.convertedFrom && <p className="mt-2 text-[10px] leading-4 text-slate-500">Converted from {formatNumber(latest.convertedFrom.value, 1)} {latest.convertedFrom.unit} for consistent reporting.</p>}
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Compared with previous period</p>
              <span className={"rounded-full px-2.5 py-1 text-xs font-extrabold " + (movement?.state === "steady" || movement?.state === "missing" ? "bg-slate-100 text-slate-600" : "bg-[#e8f8f8] text-[#0b5a62]")}>{movement?.label ?? "Comparing…"}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">{review ? "Verify flagged readings first." : movement?.detail ?? "Comparing this period with the previous period."}</p>
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
  const symptomCount = report.activity.symptoms.length;
  const workouts = report.activity.workouts;
  const workoutMinutes = workouts.reduce((sum: number, workout) => {
    const seconds = finite(workout.durationSeconds);
    return sum + (seconds === null ? 0 : seconds / 60);
  }, 0);
  const sleepSessions = report.activity.sleepSessions.filter((session) => finite(session.durationMinutes) !== null && Number(session.durationMinutes) > 0);
  const lowMood = lowMoodCounts(report);
  const goalProgressItems = goalProgressTrendItems(report, previousReport);
  const repeated = recurringSymptoms(report);
  const symptomAnalytics = symptomLogAnalytics(report);
  const previousSymptomAnalytics = symptomLogAnalytics(previousReport);
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
  const hasRoutineCheckIns = ["sleepHours", "stressLevel", "waterIntakeMl", "exerciseMinutes"]
    .some((field) => dailyMetric(report, field).length > 0);
  const symptomSeverityPoints = symptomSeverityTimeline(report);
  const previousSymptomSeverityPoints = symptomSeverityTimeline(previousReport);
  const recurringSymptomsOnly = repeated.filter((item) => item.count > 1).slice(0, 4);
  const highestRecurringSymptomCount = Math.max(1, ...recurringSymptomsOnly.map((item) => item.count));
  const stepPattern = /(^|[._\s-])(steps?|stepcount|step_count)([._\s-]|$)|daily.?steps|step.?count/i;
  const wellnessSteps = wellnessMetricSeriesMatching(report, stepPattern);
  const deviceSteps = namedClinicalDeviceSeries(report, stepPattern);
  const goalSteps = goalMetricSeries(report, stepPattern);
  const currentSteps = latestValuesPerDay(wellnessSteps.length ? wellnessSteps : deviceSteps.length ? deviceSteps : goalSteps);
  const previousWellnessSteps = wellnessMetricSeriesMatching(previousReport, stepPattern);
  const previousDeviceSteps = namedClinicalDeviceSeries(previousReport, stepPattern);
  const previousGoalSteps = goalMetricSeries(previousReport, stepPattern);
  const previousSteps = latestValuesPerDay(previousWellnessSteps.length ? previousWellnessSteps : previousDeviceSteps.length ? previousDeviceSteps : previousGoalSteps);
  const currentStepValues = currentSteps.map((item) => item.value);
  const previousStepValues = previousSteps.map((item) => item.value);
  const medicationsOnFile = report.currentSnapshot?.medications ?? [];
  const doseTotalsCurrent = medicationDoseTotals(report);
  const clinicalCountPrevious = previousReport ? clinicalEvents(previousReport) : null;
  const previousClinicalDetail = previousLoading
    ? "Comparing with the previous period…"
    : clinicalCountPrevious === null
      ? "The previous period is not available for comparison."
      : clinicalCountPrevious === clinicalCount
        ? "Same number of clinical updates as the previous period."
        : String(Math.abs(clinicalCount - clinicalCountPrevious)) + " " + (clinicalCount > clinicalCountPrevious ? "more" : "fewer") + " clinical updates than the previous period.";
  const medicationDetail = doseTotalsCurrent.eventTotal > 0
    ? doseTotalsCurrent.eventTaken + " marked taken · " + doseTotalsCurrent.eventSkipped + " marked skipped · " + formatNumber(doseTotalsCurrent.eventAdherencePercent, 1) + "% of logged dose actions marked taken."
    : doseTotalsCurrent.legacyTotal > 0
      ? doseTotalsCurrent.legacyTaken + " older entries marked taken · " + doseTotalsCurrent.legacySkipped + " marked skipped. These are day-status entries, not complete dose-level counts."
      : medicationsOnFile.length > 0
        ? "Medication records are available, but no dated dose outcomes were found for this period."
        : "No medication records or dated dose outcomes were returned in this report.";
  const hasCategoricalCheckIns = report.activity.journalEntries.some((entry) => Boolean(entry.mood || entry.energyLevel || entry.sleepQuality));
  const noAnalysisData = activeVitals.length === 0 && !hasRoutineCheckIns && currentSteps.length === 0 && goalProgressItems.length === 0 && (report.goalMetricEvents ?? []).length === 0 && (report.activity.wellnessMetrics ?? []).length === 0 && !hasCategoricalCheckIns && symptomCount === 0 && sleepSessions.length === 0 && workouts.length === 0 && clinicalCount === 0;
  const moodPattern = lowMood.total > 0
    ? lowMood.low + " of " + lowMood.total + " mood check-ins were marked low or very low."
    : "";
  const symptomPattern = repeated.find((item) => item.count > 1);
  return (
    <div className="mt-4 space-y-4">
      {measurementReviews.length > 0 && (
        <section aria-label="Critical alerts and data checks" className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><AlertTriangle className="h-4 w-4" /></span>
              <div className="min-w-0">
                <h2 className="text-base font-black text-[#0b2d54]">Readings to review</h2>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{measurementReviews.length} flagged</span>
          </div>
          <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
            {measurementReviews.map((item) => {
              const criticalOxygen = item.key === "oxygen" && item.value > 0 && item.value <= 92;
              const urgentBreathing = item.key === "respiratory" && item.value > 30;
              const temperatureDataWarning = item.key === "temperature" && item.value >= 43;
              const flagTone = criticalOxygen || urgentBreathing
                ? "border-rose-300 bg-rose-50 text-rose-800"
                : "border-amber-200 bg-amber-50 text-amber-900";
              const cardTone = criticalOxygen || urgentBreathing
                ? "border-rose-200 bg-rose-50/40"
                : "border-amber-200 bg-amber-50/30";
              const flagLabel = criticalOxygen
                ? "SOS · Critical low"
                : temperatureDataWarning
                  ? "Verify reading"
                  : item.severity === "urgent"
                    ? "Urgent review"
                    : "Check entry";
              const guidance = criticalOxygen
                ? "If this is a current reading, recheck now. If it remains at or below 92%, seek emergency assessment. Do not delay help if you feel unwell."
                : temperatureDataWarning
                  ? "Likely an entry, device or unit problem. Verify the source; if this is accurate and current, seek emergency medical help."
                  : item.key === "temperature" && item.value >= 40
                    ? "Confirm promptly with a reliable thermometer and seek urgent medical advice, especially if you feel unwell."
                    : item.key === "respiratory" && item.value > 30
                      ? "Typical adult resting rate is 12–18/min. Recheck at rest; seek urgent help if it remains high or breathing is difficult."
                      : item.key === "respiratory" && item.value > 0 && item.value < 8
                        ? "This is below the typical adult resting range. Verify the entry and seek urgent advice if it is current or you feel unwell."
                        : item.message;
              return (
                <article key={item.key} className={"flex min-w-0 flex-col rounded-2xl border p-4 " + cardTone}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-600">{item.label}</h3>
                      <p className="mt-1 text-[1.65rem] font-black leading-tight tracking-tight tabular-nums text-[#0b2d54]">{formatNumber(item.value, item.key === "temperature" || item.key === "oxygen" ? 1 : 0)} <span className="text-sm font-bold text-slate-500">{item.unit}</span></p>
                      <p className="mt-1 text-[10px] font-medium text-slate-500">{dateLabel(new Date(item.timestamp).toISOString())}</p>
                    </div>
                    <span className={"shrink-0 rounded-full border px-2 py-1 text-[9px] font-extrabold " + flagTone}>{flagLabel}</span>
                  </div>
                  {item.originalValue !== undefined && item.originalUnit && <p className="mt-2 text-[10px] text-slate-500">Source: {formatNumber(item.originalValue, 1)} {item.originalUnit}</p>}
                  <p className="mt-3 flex-1 text-xs leading-5 text-slate-700">{guidance}</p>
                  <Link href="/today" className="mt-3 inline-flex min-h-9 items-center gap-1.5 self-start rounded-lg px-2 text-[11px] font-bold text-[#0b2d54] hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]">Review reading <ArrowRight className="h-3.5 w-3.5 text-[#0b7b80]" /></Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <ContextualHealthInsights report={report} />
      <MedicationPeriodInsights report={report} previousReport={previousReport} previousLoading={previousLoading} />
      <PersonalisedInsights report={report} previousReport={previousReport} previousLoading={previousLoading} />
      <section>
        <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24c1c4]">Reading history</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">Your measurements</h2><p className="mt-1 text-sm leading-6 text-slate-500">Period average, latest reading and change from last period.</p></div>
        {activeVitals.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{activeVitals.map((item) => <VitalTrendCard key={item.key} label={item.label} description={item.description} unit={item.unit} digits={item.digits} current={item.current} previous={item.previous} previousLoading={previousLoading} review={item.review} status={item.status} rawCurrent={item.rawCurrent} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-500">No dated vital readings were found for this period. Once you save blood pressure, heart rate, weight or other measurements, they will appear here.</div>}
      </section>

      {(symptomCount > 0 || lowMood.total > 0 || association !== null || repeated.some((item) => item.count > 1) || symptomAnalytics.repeatedTriggers.length > 0 || symptomAnalytics.medicationEffects > 0 || symptomAnalytics.averageSeverityRank !== null || symptomAnalytics.worseningCount > 0 || symptomAnalytics.severeCount > 0) && (
        <section className="rounded-2xl border border-[#dcebed] bg-white p-4 sm:p-5" aria-label="Health patterns">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0b7b80]">Patterns</p>
          <h2 className="mt-1 text-lg font-black text-[#0b2d54]">Patterns across your logs</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {symptomCount > 0 && (
              <div className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="text-sm font-bold text-[#0b2d54]">Symptoms</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{symptomCount} record{symptomCount === 1 ? "" : "s"} this period{previousReport ? (symptomDifference === 0 ? " · unchanged from the previous period" : " · " + Math.abs(symptomDifference ?? 0) + (symptomDifference > 0 ? " more than" : " fewer than") + " the previous period") : " · no previous-period comparison"}.</p>
                </div>
                {symptomPattern && <p className="text-xs font-semibold text-slate-600">Most repeated: {symptomPattern.label} ({symptomPattern.count})</p>}
              </div>
            )}
            {(symptomAnalytics.averageSeverityRank !== null || symptomAnalytics.worseningCount > 0 || symptomAnalytics.severeCount > 0) && (
              <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="text-sm font-bold text-[#0b2d54]">Severity and progression</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{symptomAnalytics.averageSeverityRank === null ? "No severity scale was available." : "Average severity rank " + formatNumber(symptomAnalytics.averageSeverityRank, 1) + "/4"} · {symptomAnalytics.worseningCount} worsening · {symptomAnalytics.severeCount} severe or very severe.</p>
                </div>
                <Link href="/health-journal" className="text-xs font-bold text-[#0b7b80]">Review symptom history <ArrowRight className="ml-1 inline h-3 w-3" /></Link>
              </div>
            )}
            {lowMood.total > 0 && (
              <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="text-sm font-bold text-[#0b2d54]">Mood check-ins</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{lowMood.low} of {lowMood.total} entries were marked low or very low.</p>
                </div>
                <Link href="/today" className="text-xs font-bold text-[#0b7b80]">Open check-in <ArrowRight className="ml-1 inline h-3 w-3" /></Link>
              </div>
            )}
            {association && (
              <div className="py-3">
                <p className="text-sm font-bold text-[#0b2d54]">Sleep and stress on the same days</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">On {association.shorterDays} shorter-sleep day{association.shorterDays === 1 ? "" : "s"}, stress averaged {formatNumber(association.shortStress, 1)}/10; on {association.longerDays} longer-sleep day{association.longerDays === 1 ? "" : "s"}, it averaged {formatNumber(association.longStress, 1)}/10.</p>
              </div>
            )}
            {symptomAnalytics.repeatedTriggers.length > 0 && (
              <div className="py-3">
                <p className="text-sm font-bold text-[#0b2d54]">Repeated trigger label</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{symptomAnalytics.repeatedTriggers[0].label} appeared in {symptomAnalytics.repeatedTriggers[0].count} records ({symptomAnalytics.repeatedTriggers[0].confirmed} confirmed).</p>
              </div>
            )}
            {symptomAnalytics.medicationEffects > 0 && (
              <div className="py-3">
                <p className="text-sm font-bold text-[#0b2d54]">Medication effects recorded</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{symptomAnalytics.improvedEffects} reported improvement(s) and {symptomAnalytics.sideEffectReports} side-effect report(s) in symptom logs.</p>
              </div>
            )}
          </div>
          <p className="mt-2 border-t border-slate-100 pt-3 text-[10px] leading-4 text-slate-400">These are patterns in your records, not proof of cause or a diagnosis. Seek clinical advice for persistent or worsening symptoms.</p>
        </section>
      )}

      {(clinicalCount > 0 || flaggedLabs.length > 0) && (
        <section>
          <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24c1c4]">Clinical context</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">Updates worth keeping in view</h2><p className="mt-1 text-sm leading-6 text-slate-500">This is a concise overview of clinical activity, not a repeat of your full clinical record.</p></div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:divide-x sm:divide-slate-100">
              <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Visits</p><p className="mt-1 text-lg font-black text-[#0b2d54]">{report.clinical.encounters.length}</p></div>
              <div className="sm:pl-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Lab reports</p><p className="mt-1 text-lg font-black text-[#0b2d54]">{report.clinical.labResults.length}</p></div>
              <div className="sm:pl-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Care plans</p><p className="mt-1 text-lg font-black text-[#0b2d54]">{report.clinical.carePlans.length}</p></div>
              <div className="sm:pl-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Other updates</p><p className="mt-1 text-lg font-black text-[#0b2d54]">{report.clinical.diagnoses.length + report.clinical.prescriptions.length + report.clinical.referrals.length + report.clinical.procedures.length}</p></div>
            </div>
          </div>
          {flaggedLabs.length > 0 && <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div className="min-w-0"><h3 className="font-bold text-amber-950">Results marked for review in the clinical record</h3><p className="mt-1 text-xs leading-5 text-amber-900">These items were marked abnormal or critical by the source record. Sympto is not re-interpreting them here; review the report with your clinician.</p><div className="mt-3 space-y-2">{flaggedLabs.slice(0, 4).map((item) => <div key={item.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-white/80 p-3"><div><p className="text-sm font-bold text-[#0b2d54]">{item.name}</p><p className="mt-1 text-[11px] text-slate-500">{dateLabel(item.date)}</p></div><div className="flex items-center gap-2"><span className="text-sm font-bold text-[#0b2d54]">{String(item.value)}</span>{item.critical && <span className="rounded-full bg-rose-100 px-2 py-1 text-[9px] font-black uppercase text-rose-800">Critical</span>}{!item.critical && <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase text-amber-800">Abnormal</span>}</div></div>)}</div><Link href="/health-records" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2 text-xs font-bold text-white">Review clinical records <ArrowRight className="h-4 w-4" /></Link></div></div></div>}
        </section>
      )}

      {noAnalysisData && <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6"><div className="flex items-start gap-3"><Info className="mt-0.5 h-5 w-5 shrink-0 text-[#24c1c4]" /><div><h2 className="font-bold text-[#0b2d54]">More records are needed to uncover patterns</h2><p className="mt-1 text-sm leading-6 text-slate-500">As you record Health Vitals, daily check-ins, symptoms or connected-device sessions, future reports can compare these values across periods. This report intentionally avoids repeating individual journal entries.</p><Link href="/today" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2 text-xs font-bold text-white">Record today’s health <ArrowRight className="h-4 w-4" /></Link></div></div></section>}

      <CompleteReportData report={report} />

      <p className="rounded-2xl bg-slate-100 p-3 text-[11px] text-slate-500">Generated {dateLabel(report.generatedAt)} · Based on dated records · Not a diagnosis</p>
    </div>
  );
}


type ReportLedgerObject = Record<string, unknown>;
type ReportLedgerGroup = { key: string; title: string; description: string; rows: unknown[] };

function ledgerObject(value: unknown): ReportLedgerObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ReportLedgerObject : {};
}
function ledgerArray(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function ledgerHasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
function ledgerScalar(value: unknown, key = ""): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return "";
    if (/(At|Date|date|started|ended|resolved|reported|issued|scheduled)$/i.test(key) && /^\d{4}-\d{2}-\d{2}T/.test(raw)) {
      const date = new Date(raw);
      return Number.isNaN(date.getTime()) ? raw : date.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });
    }
    return /^[A-Z][A-Z0-9_ -]{2,}$/.test(raw) ? human(raw) : raw;
  }
  if (value instanceof Date) return value.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });
  if (Array.isArray(value)) return value.map((item) => ledgerScalar(item)).filter(Boolean).join(" · ");
  const object = ledgerObject(value);
  for (const field of ["name", "title", "displayName", "label", "code", "status", "description", "value"]) {
    if (ledgerHasValue(object[field]) && (typeof object[field] === "string" || typeof object[field] === "number")) return String(object[field]);
  }
  return "";
}
function ledgerDate(record: ReportLedgerObject): string {
  for (const field of ["measuredAt", "recordedAt", "occurredAt", "startedAt", "resolvedAt", "reportedAt", "releasedAt", "administeredAt", "issuedAt", "requestedDate", "scheduledStart", "performedAt", "assessedAt", "observedAt", "createdAt", "updatedAt", "date", "at"]) {
    if (!ledgerHasValue(record[field])) continue;
    const date = record[field] instanceof Date ? record[field] as Date : new Date(String(record[field]));
    if (!Number.isNaN(date.getTime())) return date.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });
  }
  return "Date not recorded";
}
function ledgerTitle(record: ReportLedgerObject, fallback: string): string {
  for (const field of ["title", "name", "activityType", "metricKey", "measurementType", "goalTitle", "testName", "assessmentType", "type", "chiefComplaint", "reason", "specialty"]) {
    const label = ledgerScalar(record[field], field);
    if (label) return label;
  }
  for (const field of ["medication", "symptom", "vitalType", "test", "diagnosis", "procedure", "immunization", "encounterType"]) {
    const label = ledgerScalar(record[field], field);
    if (label) return label;
  }
  return fallback;
}
function ledgerSummary(record: ReportLedgerObject): string {
  const fields = ["status", "severity", "progression", "mood", "sleepQuality", "durationMinutes", "value", "unit", "secondaryValue", "secondaryUnit", "numericValue", "textValue", "booleanValue", "abnormal", "critical", "dosage", "frequency", "currentValue", "targetValue", "progressPercent", "overallRisk", "score", "source"];
  return fields.filter((field) => ledgerHasValue(record[field])).map((field) => {
    const value = ledgerScalar(record[field], field);
    return value ? (["value", "numericValue", "textValue"].includes(field) ? value : human(field) + ": " + value) : "";
  }).filter(Boolean).slice(0, 5).join(" · ");
}
function LedgerFieldTree({ value }: { value: unknown }) {
  if (!ledgerHasValue(value)) return null;
  if (Array.isArray(value)) {
    return <div className="space-y-2">{value.map((entry, index) => {
      const object = ledgerObject(entry);
      return <div key={String(object.id ?? object.createdAt ?? object.measuredAt ?? index)} className="rounded-lg border border-slate-100 bg-white p-3"><LedgerFieldTree value={entry} /></div>;
    })}</div>;
  }
  if (typeof value !== "object") return <p className="break-words text-xs leading-5 text-slate-700">{ledgerScalar(value)}</p>;
  const record = ledgerObject(value);
  const internal = /^(id|.*Id|.*Ids|patient|user|healthPassport|medicalRecord|connection|createdByUserId|practitionerId)$/i;
  const entries = Object.entries(record).filter(([key, fieldValue]) => !internal.test(key) && ledgerHasValue(fieldValue));
  return <dl className="grid min-w-0 gap-2 sm:grid-cols-2">{entries.map(([key, fieldValue]) => {
    const label = human(key);
    const complex = typeof fieldValue === "object" && fieldValue !== null;
    if (complex) {
      const count = Array.isArray(fieldValue) ? fieldValue.length : null;
      const heading = ledgerScalar(fieldValue);
      return <div key={key} className="min-w-0 rounded-lg border border-slate-100 bg-white px-3 py-2 sm:col-span-2"><details><summary className="cursor-pointer text-xs font-bold text-[#0b2d54]">{label}{count !== null ? " (" + count + ")" : heading ? " · " + heading : ""}</summary><div className="mt-2 border-t border-slate-100 pt-2"><LedgerFieldTree value={fieldValue} /></div></details></div>;
    }
    return <div key={key} className="min-w-0"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-0.5 break-words text-xs leading-5 text-slate-700">{ledgerScalar(fieldValue, key)}</dd></div>;
  })}</dl>;
}
function LedgerGroup({ group }: { group: ReportLedgerGroup }) {
  if (!group.rows.length) return null;
  const latest = ledgerObject(group.rows[group.rows.length - 1]);
  return <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 transition hover:bg-[#f7fbfc] sm:px-5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eafafa] text-xs font-black tabular-nums text-[#0b5a62]">{group.rows.length}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#0b2d54]">{group.title}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{group.description} · Latest: {ledgerTitle(latest, "Record")}</span></span>
      <span className="shrink-0 text-xs font-bold text-[#0b7b80] group-open:hidden">View records</span><span className="hidden shrink-0 text-xs font-bold text-[#0b7b80] group-open:inline">Hide</span>
    </summary>
    <div className="space-y-2 border-t border-slate-100 bg-[#f8fbfc] p-3 sm:p-4">
      {group.rows.map((item, index) => {
        const record = ledgerObject(item);
        const title = ledgerTitle(record, group.title.replace(/s$/, "") + " " + (index + 1));
        const summary = ledgerSummary(record);
        const date = ledgerDate(record);
        const key = String(record.id ?? record.externalRecordId ?? record.sourceId ?? (group.key + "-" + index));
        return <article key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-white"><details>
          <summary className="flex cursor-pointer list-none items-start gap-3 px-3 py-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#24c1c4]" /><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-[#0b2d54]">{title}</span><span className="mt-1 block text-[10px] text-slate-500">{date}</span>{summary && <span className="mt-1 block break-words text-[11px] leading-4 text-slate-600">{summary}</span>}</span><span className="shrink-0 text-[10px] font-semibold text-slate-400">Details</span></summary>
          <div className="border-t border-slate-100 bg-[#fbfdfd] p-3"><LedgerFieldTree value={record} /></div>
        </details></article>;
      })}
    </div>
  </details>;
}
function CompleteReportData({ report }: { report: Report }) {
  const activity = report.activity as unknown as ReportLedgerObject;
  const clinical = report.clinical as unknown as ReportLedgerObject;
  const events = report.goalMetricEvents ?? [];
  const medicationEvents = events.filter((event) => /MEDICATION|medication|adherence/i.test([event.metricType, event.metricKey, event.source, event.goalCategory, event.goalTitle].filter(Boolean).join(" ")));
  const otherGoalEvents = events.filter((event) => !medicationEvents.includes(event));
  const snapshot: HealthContextSnapshot = report.currentSnapshot ?? {};
  const contextGroups: ReportLedgerGroup[] = [
    { key: "conditions", title: "Current conditions", description: "Saved conditions used to personalize this report", rows: ledgerArray(snapshot.conditions) },
    { key: "diagnoses-on-file", title: "Diagnoses on file", description: "Patient diagnosis history", rows: ledgerArray(snapshot.diagnoses) },
    { key: "allergies", title: "Allergies", description: "Saved allergens and reactions", rows: ledgerArray(snapshot.allergies) },
    { key: "medicines-on-file", title: "Current medicines", description: "Saved medicines and instructions", rows: ledgerArray(snapshot.medications) },
    { key: "immunizations", title: "Immunisations", description: "Immunisation history on file", rows: ledgerArray(snapshot.immunizations) },
    { key: "goals-on-file", title: "Active health goals", description: "Saved targets and latest goal progress", rows: ledgerArray(snapshot.activeGoals) },
    { key: "risk-context", title: "Risk assessments on file", description: "Available risk-assessment context", rows: ledgerArray(snapshot.riskAssessments) },
    { key: "baseline-context", title: "Baseline and profile", description: "Profile and baseline values used when interpreting trends", rows: [snapshot.profile, snapshot.baseline, snapshot.medicalRecord].filter(ledgerHasValue) },
  ];
  const groups: ReportLedgerGroup[] = [
    { key: "check-ins", title: "Daily health check-ins", description: "Mood, stress, sleep, energy, water, exercise, notes and patient-recorded vitals", rows: ledgerArray(activity.journalEntries) },
    { key: "symptoms", title: "Symptoms and follow-ups", description: "Severity, progression, observations, triggers, attachments and medicine effects", rows: ledgerArray(activity.symptoms) },
    { key: "clinical-episodes", title: "Clinical episodes", description: "Episodes associated with the selected period", rows: ledgerArray(activity.clinicalEpisodes) },
    { key: "medication-events", title: "Medication log events", description: "Dose outcomes and medication tracker logs", rows: medicationEvents },
    { key: "goal-events", title: "Goal tracker entries", description: "Individual metrics recorded against goals", rows: otherGoalEvents },
    { key: "appointments", title: "Appointments", description: "Appointments scheduled, created or changed in the period", rows: ledgerArray(activity.appointments) },
    { key: "device-measurements", title: "Connected-device readings", description: "Dated readings imported from connected devices", rows: ledgerArray(activity.deviceMeasurements) },
    { key: "wellness-metrics", title: "Wellness metrics", description: "Dated wellness values with their source", rows: ledgerArray(activity.wellnessMetrics) },
    { key: "sleep-sessions", title: "Sleep sessions", description: "Connected sleep records and sleep stages", rows: ledgerArray(activity.sleepSessions) },
    { key: "workouts", title: "Exercise and workout sessions", description: "Activity, duration, distance, calories and heart rate", rows: ledgerArray(activity.workouts) },
    { key: "encounters", title: "Clinical encounters", description: "Consultations, assessments, notes and plans", rows: ledgerArray(clinical.encounters) },
    { key: "clinical-diagnoses", title: "Clinical diagnoses", description: "Diagnosis records created or addressed in this period", rows: ledgerArray(clinical.diagnoses) },
    { key: "prescriptions", title: "Prescriptions", description: "Medicine and prescription instructions", rows: ledgerArray(clinical.prescriptions) },
    { key: "clinical-notes", title: "Clinical notes", description: "Notes authored during this period or linked to period encounters", rows: ledgerArray(clinical.notes) },
    { key: "clinical-vitals", title: "Clinical vital readings", description: "Measurements captured in clinical encounters", rows: ledgerArray(clinical.vitals) },
    { key: "lab-results", title: "Laboratory results", description: "Results, units, comments and abnormal/critical flags", rows: ledgerArray(clinical.labResults) },
    { key: "imaging", title: "Imaging studies and reports", description: "Studies, findings, impressions and recommendations", rows: ledgerArray(clinical.imaging) },
    { key: "procedures", title: "Procedures", description: "Procedures recorded in the clinical record", rows: ledgerArray(clinical.procedures) },
    { key: "care-plans", title: "Care plans", description: "Plans, goals, tasks and notes", rows: ledgerArray(clinical.carePlans) },
    { key: "referrals", title: "Referrals", description: "Reasons, status and follow-up information", rows: ledgerArray(clinical.referrals) },
    { key: "goal-progress", title: "Goal progress updates", description: "Progress submissions saved against health goals", rows: ledgerArray(report.tracking?.goalProgress) },
    { key: "goal-history", title: "Goals created or changed", description: "Goal creation, targets, statuses and completion dates", rows: ledgerArray(report.tracking?.goalHistory) },
    { key: "risk-history", title: "Risk assessments recorded this period", description: "Risk assessment results dated within the report range", rows: ledgerArray(report.tracking?.riskAssessments) },
  ].filter((group) => group.rows.length > 0);
  const context = contextGroups.filter((group) => group.rows.length > 0);
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  if (!total && !context.length) return null;
  return <section aria-label="All health data in the report period" className="space-y-4">
    <div className="overflow-hidden rounded-[24px] border border-[#cfe5e8] bg-white shadow-sm">
      <div className="bg-gradient-to-r from-[#f0fbfb] to-white p-4 sm:p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0b7b80]">Full record · {report.period.label}</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black tracking-tight text-[#0b2d54]">Everything you logged</h2><p className="mt-1 text-xs leading-5 text-slate-600">Open a category to review each returned record and its underlying detail fields.</p></div>
          <div className="flex gap-2"><div className="rounded-xl border border-[#dcebed] bg-white px-3 py-2"><p className="text-xl font-black tabular-nums text-[#0b2d54]">{total}</p><p className="text-[10px] font-semibold text-slate-500">entries shown</p></div><div className="rounded-xl border border-[#dcebed] bg-white px-3 py-2"><p className="text-xl font-black tabular-nums text-[#0b2d54]">{groups.length}</p><p className="text-[10px] font-semibold text-slate-500">data categories</p></div></div>
        </div>
      </div>
      <div className="space-y-2 p-3 sm:p-4">{groups.length ? groups.map((group) => <LedgerGroup key={group.key} group={group} />) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No dated activity records were returned for this period.</p>}</div>
    </div>
    {context.length > 0 && <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-4 py-4 sm:px-5"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0b7b80]">Personalisation context</p><h2 className="mt-1 text-lg font-black tracking-tight text-[#0b2d54]">Your health context</h2><p className="mt-1 text-xs leading-5 text-slate-500">Saved context can pre-date the selected period and is shown separately from that period’s activity.</p></div><div className="space-y-2 p-3 sm:p-4">{context.map((group) => <LedgerGroup key={group.key} group={group} />)}</div></div>}
  </section>;
}


function ContextualHealthInsights({ report }: { report: Report }) {
  const snapshot = report.currentSnapshot ?? {};
  const conditions = [
    ...ledgerArray(snapshot.conditions),
    ...ledgerArray(snapshot.diagnoses),
  ].map((item) => {
    const record = ledgerObject(item);
    const relation = ledgerObject(record.condition ?? record.diagnosis);
    return {
      name: ledgerScalar(relation.name ?? record.name, "name"),
      status: String(record.status ?? "ACTIVE").toUpperCase(),
      resolved: Boolean(record.resolvedAt),
    };
  }).filter((item) => item.name && !item.resolved && !/RESOLVED|INACTIVE|CANCELLED/.test(item.status));
  const conditionNames = conditions.map((item) => item.name.toLowerCase()).join(" ");
  const events = report.goalMetricEvents ?? [];
  const medicationEvents = events.filter((item) => /MEDICATION|medication|adherence/i.test([item.metricType, item.metricKey, item.source, item.goalTitle].filter(Boolean).join(" ")));
  const glucoseEvents = events.filter((item) => /glucose|blood.sugar|glycaemia|glycemia|hba1c|a1c/i.test([item.metricType, item.metricKey, item.goalTitle].filter(Boolean).join(" ")));
  const glucoseLabs = clinicalLabSeries(report, /glucose|hba1c|\ba1c\b|glycat|glycosylat/i).length;
  const systolic = vitalSeries(report, "systolic");
  const diastolic = vitalSeries(report, "diastolic");
  const oxygen = vitalSeries(report, "oxygen");
  const breathing = vitalSeries(report, "respiratory");
  const symptoms = report.activity.symptoms ?? [];
  const respiratorySymptoms = symptoms.filter((item) => /asthma|breath|wheez|cough|chest|respirat|shortness of breath/i.test([
    item.title, item.description, ...(item.symptoms ?? []).map((entry) => entry.name ?? entry.symptom?.name),
  ].filter(Boolean).join(" ")));
  const goals = snapshot.activeGoals ?? [];
  const trackedGoalIds = new Set<string>([
    ...events.map((event) => String(event.goalId ?? "")).filter(Boolean),
    ...ledgerArray(report.tracking?.goalProgress).map((item) => String(ledgerObject(ledgerObject(item).healthGoal).id ?? "" )).filter(Boolean),
  ]);
  const trackedGoals = goals.filter((goal) => goal.id && trackedGoalIds.has(String(goal.id)));
  const insights: Array<{ title: string; headline: string; detail: string; href?: string }> = [];
  if (/diabet|prediabet/.test(conditionNames)) {
    insights.push({
      title: "Diabetes-related tracking",
      headline: glucoseEvents.length + " glucose tracker entries · " + glucoseLabs + " numeric glucose/HbA1c lab values",
      detail: glucoseEvents.length || glucoseLabs
        ? "Review the dated glucose and laboratory records alongside your saved medication routine and your clinician's targets."
        : "No dated glucose tracker entries or numeric glucose/HbA1c lab values were returned for this period. They will not be inferred from other measurements.",
      href: "/today",
    });
  }
  if (/hypertension|high blood pressure/.test(conditionNames)) {
    insights.push({
      title: "Blood-pressure context",
      headline: systolic.length + " systolic · " + diastolic.length + " diastolic readings",
      detail: systolic.length && diastolic.length
        ? "The full record includes the dated pressure values. Compare repeated pairs with your saved target and clinician's advice."
        : "Blood-pressure measurements were sparse or not recorded in this period. Check the full record for readings saved through other sources.",
      href: "/today",
    });
  }
  if (/asthma|copd|chronic obstructive|respiratory condition/.test(conditionNames)) {
    insights.push({
      title: "Breathing and respiratory context",
      headline: oxygen.length + " oxygen readings · " + breathing.length + " breathing-rate readings · " + respiratorySymptoms.length + " related symptom logs",
      detail: "Readings, symptom follow-ups and any verification flags are kept together in this report so you can review the dates and source records.",
      href: "/today",
    });
  }
  if (goals.length) {
    insights.push({
      title: "Progress against your saved goals",
      headline: trackedGoals.length + " of " + goals.length + " active goals have linked tracker entries in this period",
      detail: trackedGoals.length
        ? "The goal history below keeps each dated entry visible; goals without a linked event are not treated as zero progress."
        : "No linked goal-progress events were returned for active goals in this period. Daily check-ins and measurements are shown separately and are not counted as goal completion.",
      href: "/health-goals",
    });
  }
  const distinctContext = new Set(conditions.map((item) => item.name.toLowerCase()));
  if (!insights.length && events.length) {
    insights.push({
      title: "Your recorded health activity",
      headline: events.length + " health-goal tracker entries across " + distinctContext.size + " named condition(s) on file",
      detail: "The report compares dated tracker entries with check-ins, connected readings and clinical records. Expand the record groups below to review each entry.",
      href: "/health-goals",
    });
  }
  if (!insights.length) return null;
  return (
    <section aria-label="Insights personalised to saved health context" className="overflow-hidden rounded-[24px] border border-[#dcebed] bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#0b7b80]">Personalised context</p>
        <h2 className="mt-1 text-lg font-black tracking-tight text-[#0b2d54]">How this period relates to your health</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Based on saved conditions, goals and dated records—not assumptions about missing data.</p>
      </div>
      <div className="divide-y divide-slate-100">
        {insights.map((item) => (
          <article key={item.title} className="grid gap-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#0b2d54]">{item.title}</h3>
              <p className="mt-1 text-xs font-semibold text-[#0b5a62]">{item.headline}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
            </div>
            {item.href && <Link href={item.href} className="inline-flex min-h-8 items-center gap-1 self-start text-[11px] font-bold text-[#0b7b80]">Review records <ArrowRight className="h-3 w-3" /></Link>}
          </article>
        ))}
      </div>
    </section>
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

          <section className="mt-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0b2d54] via-[#0b3e60] to-[#0f5a62] p-5 text-white shadow-[0_18px_55px_-30px_rgba(11,45,84,0.55)] sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#24c1c4]"><ShieldCheck className="h-4 w-4" />Sympto · Health intelligence</div><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 text-sm leading-6 text-white/75">{report.period.label}</p><p className="mt-3 text-sm leading-5 text-white/80">Your health, at a glance.</p></div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 sm:gap-4 sm:p-4">
                <ScoreRing
                  percent={Math.round(recordedDays(report).size / periodDays(report) * 100)}
                  label="Logging consistency"
                  tone={recordedDays(report).size / periodDays(report) >= 0.75 ? "good" : recordedDays(report).size / periodDays(report) >= 0.4 ? "watch" : "high"}
                  size={68}
                />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">Logging consistency</p>
                  <p className="mt-1 text-base font-black text-white">{recordedDays(report).size}/{periodDays(report)} days logged</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/70"><CalendarDays className="h-3.5 w-3.5 text-[#24c1c4]" />{report.type === "WEEKLY" ? "7-day report" : "Monthly report"}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">Generated {dateLabel(report.generatedAt)}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{previousLoading ? "Comparing with prior period…" : previousReport ? "Compared with previous period" : previousFailed ? "Prior-period data unavailable" : "Current-period insights"}</span></div>
          </section>

          {previousFailed && <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><Info className="mt-0.5 h-4 w-4 shrink-0" />The current report is available, but the prior-period comparison could not be loaded. Current-period trends remain available; comparison labels will appear when historical data is accessible.</div>}


          <HealthReportInsights report={report} previousReport={previousReport} previousLoading={previousLoading} />

          <details aria-label="How to read this report" className="mt-4 rounded-2xl border border-[#dcebed] bg-white p-4 sm:p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-[#0b2d54]">
              <span>How to read this report</span>
              <span className="text-xs font-semibold text-[#0b7b80]">Open guide</span>
            </summary>
            <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 text-sm leading-6 text-slate-600 sm:grid-cols-2">
              <p><strong className="text-[#0b2d54]">Average:</strong> average of values recorded, not an estimate for every day.</p>
              <p><strong className="text-[#0b2d54]">Most recent:</strong> the latest dated value available.</p>
              <p><strong className="text-[#0b2d54]">Trend:</strong> arrows and percentages compare this period with the previous one. Rating scales use points because percentages can be misleading.</p>
              <p><strong className="text-[#0b2d54]">Missing entry:</strong> no value was saved. It is not counted as zero.</p>
              <p><strong className="text-[#0b2d54]">Status:</strong> clinical measures use available reference guidance or your saved goal. Other entries show a change, not a diagnosis.</p>
              <p><strong className="text-[#0b2d54]">Colour key:</strong> green = within a common reference; amber = recheck or monitor; orange = high; red = urgent; grey = personal or age-specific guidance needed.</p>
              <p><strong className="text-[#0b2d54]">Goal status:</strong> uses saved goal targets and recorded progress. Missing progress is not guessed.</p>
              <p><strong className="text-[#0b2d54]">Data coverage:</strong> measures how much was logged, not how healthy you are. General reference ranges are not a substitute for personal or clinician guidance.</p>
            </div>
          </details>
        </div>
      </main>
    </ProtectedRoute>
  );
}
