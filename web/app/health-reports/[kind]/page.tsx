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
type SymptomRecord = {
  id?: string;
  title?: string | null;
  description?: string | null;
  startedAt?: string | null;
  createdAt?: string | null;
  symptoms?: SymptomName[] | null;
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
  measuredAt?: string | null;
  vitalType?: { name?: string | null } | null;
};
type ClinicalVitalRecord = {
  value?: number | string | null;
  measuredAt?: string | null;
  recordedAt?: string | null;
  vitalType?: { code?: string | null; name?: string | null } | null;
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
type LabResultItem = {
  id?: string;
  test?: { name?: string | null } | null;
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
  orderItem?: { test?: { name?: string | null } | null } | null;
  items?: LabResultItem[] | null;
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
  generatedAt: string;
};

type SeriesPoint = { date: string; value: number; timestamp: number; source?: string };
type DailyValue = { date: string; value: number };

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
  report.activity.sleepSessions.forEach((item) => add(item.startedAt || item.endedAt));
  report.activity.workouts.forEach((item) => add(item.startedAt || item.endedAt));

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
) {
  const numeric = finite(value);
  const day = dateKey(at);
  const timestamp = at ? new Date(String(at)).getTime() : Number.NaN;
  if (numeric === null || !day || !Number.isFinite(timestamp)) return;
  output.push({ date: day, value: numeric, timestamp, source });
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
) {
  const name = normaliseVitalName(nameValue);
  const rawValue = String(value ?? "").trim();
  const bloodPressurePair = rawValue.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);

  // Some devices and clinical records store blood pressure as one "120/80" value.
  // Split it into the requested series so systolic values never pollute diastolic averages.
  if (/blood pressure|bloodpressure|\bbp\b/.test(name) && bloodPressurePair) {
    if (metric === "systolic") addVital(output, bloodPressurePair[1], at, source);
    if (metric === "diastolic") addVital(output, bloodPressurePair[2], at, source);
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

  if (matchesMetric) addVital(output, value, at, source);
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
    );
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
    return "Average " + formatNumber(current, digits) + (unit ? " " + unit : "") + " — broadly unchanged from the previous period.";
  }
  return "Average " + (delta > 0 ? "rose " : "fell ") + formatNumber(Math.abs(delta), digits) + (unit ? " " + unit : "") + " compared with the previous period.";
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
      <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>Earlier</span><span>Latest</span></div>
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
          <div className="mt-4 flex items-baseline gap-2"><p className="text-2xl font-black tracking-tight text-[#0b2d54]">{formatNumber(currentMean, digits)} <span className="text-sm font-bold text-slate-500">{unit}</span></p><span className="text-[10px] text-slate-400">{current.length} {current.length === 1 ? "day" : "days"}</span></div>
          <MiniTrend values={values} label={title + " daily trend"} />
          <p className="mt-3 text-xs leading-5 text-slate-500">{compareText(values, previous.map((item) => item.value), unit, digits, previousLoading)}</p>
        </>
      )}
    </article>
  );
}

function VitalTrendCard({
  label,
  unit,
  digits,
  current,
  previous,
  previousLoading,
}: {
  label: string;
  unit: string;
  digits: number;
  current: SeriesPoint[];
  previous: SeriesPoint[];
  previousLoading: boolean;
}) {
  const currentValues = current.map((item) => item.value);
  const previousValues = previous.map((item) => item.value);
  const average = mean(currentValues);
  const latest = current[current.length - 1];
  const first = current[0];
  const withinPeriod = current.length > 1
    ? Math.abs(latest.value - first.value) < 0.05
      ? "Little change between first and latest readings."
      : "First-to-latest change: " + (latest.value > first.value ? "+" : "") + formatNumber(latest.value - first.value, digits) + " " + unit + "."
    : "One reading is available; more readings are needed to show a trend.";
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#0b2d54]">{label}</p><p className="mt-1 text-[11px] text-slate-500">{current.length} readings in this period</p></div><HeartPulse className="h-5 w-5 shrink-0 text-[#24c1c4]" /></div>
      {average === null ? <p className="mt-4 text-sm text-slate-500">No readings in this period.</p> : (
        <>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1"><p className="text-2xl font-black tracking-tight text-[#0b2d54]">{formatNumber(average, digits)} <span className="text-sm font-bold text-slate-500">{unit}</span></p>{latest && <p className="text-xs text-slate-500">Latest {formatNumber(latest.value, digits)} {unit}</p>}</div>
          <MiniTrend values={currentValues} label={label + " trend"} />
          <p className="mt-3 text-xs leading-5 text-slate-500">{withinPeriod}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{compareText(currentValues, previousValues, unit, digits, previousLoading)}</p>
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
  const repeated = recurringSymptoms(report);
  const association = routineAssociation(report);
  const flaggedLabs = flaggedLabItems(report);
  const clinicalCount = clinicalEvents(report);
  const previousSymptomCount = previousReport?.activity.symptoms.length ?? 0;
  const symptomDifference = previousReport
    ? symptomCount - previousSymptomCount
    : null;
  const vitalConfigs = [
    { key: "systolic", label: "Systolic blood pressure", unit: "mmHg", digits: 0 },
    { key: "diastolic", label: "Diastolic blood pressure", unit: "mmHg", digits: 0 },
    { key: "heartRate", label: "Heart rate", unit: "bpm", digits: 0 },
    { key: "weight", label: "Weight", unit: "kg", digits: 1 },
    { key: "oxygen", label: "Oxygen saturation", unit: "%", digits: 1 },
    { key: "temperature", label: "Temperature", unit: "°C", digits: 1 },
    { key: "respiratory", label: "Respiratory rate", unit: "/min", digits: 0 },
  ];
  const activeVitals = vitalConfigs
    .map((config) => ({
      ...config,
      current: vitalSeries(report, config.key),
      previous: vitalSeries(previousReport, config.key),
    }))
    .filter((config) => config.current.length > 0);
  const routineConfigs = [
    { field: "sleepHours", label: "Self-reported sleep", subtitle: "Average sleep duration from your daily check-ins.", unit: "h", digits: 1, icon: Moon },
    { field: "stressLevel", label: "Stress level", subtitle: "Your average self-reported stress score.", unit: "/10", digits: 1, icon: Activity },
    { field: "waterIntakeMl", label: "Water intake", subtitle: "Average water logged per day.", unit: "ml", digits: 0, icon: Droplets },
    { field: "exerciseMinutes", label: "Exercise logged", subtitle: "Average exercise minutes per day in your check-ins.", unit: "min", digits: 0, icon: Footprints },
  ];
  const routines = routineConfigs.map((config) => ({
    ...config,
    current: dailyMetric(report, config.field),
    previous: dailyMetric(previousReport, config.field),
  })).filter((config) => config.current.length > 0);
  const noAnalysisData = activeVitals.length === 0 && routines.length === 0 && symptomCount === 0 && sleepSessions.length === 0 && workouts.length === 0 && clinicalCount === 0;
  const moodPattern = lowMood.total > 0
    ? lowMood.low + " of " + lowMood.total + " mood check-ins were marked low or very low."
    : "";
  const symptomPattern = repeated.find((item) => item.count > 1);
  const activityDelta = previousReport ? workouts.length - previousReport.activity.workouts.length : null;
  const sleepDelta = previousReport ? sleepSessions.length - previousReport.activity.sleepSessions.length : null;

  return (
    <div className="mt-5 space-y-6">
      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24c1c4]">Period overview</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">The bigger picture</h2></div><span className="text-xs text-slate-400">{totalDays} days</span></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile icon={CalendarDays} label="Days with entries" value={String(daysLogged) + "/" + String(totalDays)} detail={daysLogged === 0 ? "No dated health activity found." : Math.round(daysLogged / totalDays * 100) + "% of the period has at least one dated record."} />
          <SummaryTile icon={Activity} label="Symptom records" value={String(symptomCount)} detail={symptomDifference === null ? "A comparison will appear when prior data loads." : symptomDifference === 0 ? "Same number as the previous period." : String(Math.abs(symptomDifference)) + " " + (symptomDifference > 0 ? "more" : "fewer") + " than the previous period."} />
          <SummaryTile icon={HeartPulse} label="Measurement readings" value={String(activeVitals.reduce((sum, item) => sum + item.current.length, 0))} detail={activeVitals.length ? activeVitals.length + " measurement types have enough records to summarise." : "No comparable vital readings were found."} />
          <SummaryTile icon={Footprints} label="Workout sessions" value={String(workouts.length)} detail={workouts.length ? formatNumber(workoutMinutes, 0) + " minutes logged in total." : "No workout sessions were recorded."} />
        </div>
      </section>

      <section>
        <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24c1c4]">Change over time</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">Measurement trends</h2><p className="mt-1 text-sm leading-6 text-slate-500">Averages and direction of change come from the readings saved in this period. They describe the data, not a diagnosis or a judgement that a change is good or bad.</p></div>
        {activeVitals.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{activeVitals.map((item) => <VitalTrendCard key={item.key} label={item.label} unit={item.unit} digits={item.digits} current={item.current} previous={item.previous} previousLoading={previousLoading} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-500">No dated vital readings were found for this period. Blood pressure, heart rate, weight and other measurements will appear here after they have been recorded in Health Vitals or received from a connected device.</div>}
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

      <section>
        <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24c1c4]">Patterns to review</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">What stands out</h2><p className="mt-1 text-sm leading-6 text-slate-500">These are observations from the records you saved, not proof of what caused a symptom.</p></div>
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-[#24c1c4]" /><h3 className="font-bold text-[#0b2d54]">Symptom recurrence</h3></div>
            {symptomPattern ? <><p className="mt-3 text-lg font-black text-[#0b2d54]">{symptomPattern.label}</p><p className="mt-1 text-sm leading-6 text-slate-600">Recorded {symptomPattern.count} times in this period. Consider whether timing, triggers or severity are worth discussing with your healthcare professional.</p></> : <p className="mt-3 text-sm leading-6 text-slate-500">{symptomCount === 0 ? "No symptom logs were found in this period." : "No symptom label was repeated in the available records for this period."}</p>}
            {repeated.length > 1 && <p className="mt-2 text-xs text-slate-500">Other repeated labels: {repeated.filter((item) => item.count > 1 && item.label !== symptomPattern?.label).slice(0, 2).map((item) => item.label + " (" + item.count + ")").join(" · ") || "None"}</p>}
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-[#24c1c4]" /><h3 className="font-bold text-[#0b2d54]">Logging consistency</h3></div>
            <p className="mt-3 text-lg font-black text-[#0b2d54]">{daysLogged} of {totalDays} days</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{daysLogged === 0 ? "No dated entries were available to review." : daysLogged / totalDays < 0.5 ? "There are gaps in the available records. More regular check-ins can make comparisons more useful." : daysLogged / totalDays < 0.85 ? "There is a useful amount of data, with some days missing. Consistent entries will make future trends easier to interpret." : "Records cover most of the period, giving a clearer view of changes across days."}</p>
          </article>
          {moodPattern && <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-[#24c1c4]" /><h3 className="font-bold text-[#0b2d54]">Mood check-ins</h3></div><p className="mt-3 text-sm leading-6 text-slate-600">{moodPattern} This is a self-reported signal, not a mental-health assessment.</p></article>}
          {association && <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Moon className="h-5 w-5 text-[#24c1c4]" /><h3 className="font-bold text-[#0b2d54]">Sleep and stress together</h3></div><p className="mt-3 text-sm leading-6 text-slate-600">On days with shorter logged sleep, average stress was {formatNumber(association.shortStress, 1)}/10 versus {formatNumber(association.longStress, 1)}/10 on days with longer logged sleep ({association.shorterDays} and {association.longerDays} days respectively).</p><p className="mt-2 text-xs leading-5 text-slate-500">This is a pattern of records that occurred together, not evidence that one caused the other.</p></article>}
        </div>
      </section>

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

      <p className="rounded-2xl bg-slate-100 p-4 text-xs leading-5 text-slate-500">Report generated {dateLabel(report.generatedAt)}. Trends use only dated values available for the selected period. Missing records are not treated as zero. Use the Health Journal for individual entries and your clinician for medical interpretation.</p>
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

  const title = useMemo(() => kind === "weekly" ? "Weekly health report" : kind === "monthly" ? "Monthly health report" : "Health report", [kind]);

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
              <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#24c1c4]"><ShieldCheck className="h-4 w-4" />Sympto health intelligence</div><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 text-sm leading-6 text-white/75">{report.period.label}</p><p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">A view of changes, recurring patterns and consistency across your health data—not a duplicate timeline of journal entries.</p></div>
              <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3"><CalendarDays className="h-5 w-5 text-[#24c1c4]" /><div><p className="text-[10px] font-bold uppercase tracking-wide text-white/60">Report period</p><p className="mt-1 text-sm font-bold">{report.type === "WEEKLY" ? "7-day view" : "Monthly view"}</p></div></div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">Generated {dateLabel(report.generatedAt)}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{previousLoading ? "Comparing with prior period…" : previousReport ? "Compared with previous period" : previousFailed ? "Prior-period data unavailable" : "Current-period insights"}</span></div>
          </section>

          {previousFailed && <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><Info className="mt-0.5 h-4 w-4 shrink-0" />The current report is available, but the prior-period comparison could not be loaded. Current-period trends remain available; comparison labels will appear when historical data is accessible.</div>}

          <HealthReportInsights report={report} previousReport={previousReport} previousLoading={previousLoading} />
        </div>
      </main>
    </ProtectedRoute>
  );
}
