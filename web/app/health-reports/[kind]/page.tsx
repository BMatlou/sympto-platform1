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
  currentSnapshot?: HealthContextSnapshot | null;
  generatedAt: string;
};

type SeriesPoint = { date: string; value: number; timestamp: number; source?: string };
type DailyValue = { date: string; value: number };
type MeasurementReview = {
  key: string;
  label: string;
  unit: string;
  value: number;
  timestamp: number;
  severity: "urgent" | "review";
  message: string;
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
      value: latestOxygen.value, timestamp: latestOxygen.timestamp, severity: "review",
      message: "This value is outside the valid 0–100% scale. Check the original entry, device and unit before relying on this trend.",
    });
  } else if (latestOxygen && latestOxygen.value <= 88) {
    reviews.push({
      key: "oxygen", label: "Oxygen saturation", unit: "%",
      value: latestOxygen.value, timestamp: latestOxygen.timestamp, severity: "urgent",
      message: "This is a very low saved oxygen reading. For most people, a home reading of 88% or lower needs emergency assessment. If a reading this low is happening now, seek emergency medical help. A device can be inaccurate, but do not delay help if you feel unwell.",
    });
  } else if (lowestOxygen && lowestOxygen.value <= 88) {
    reviews.push({
      key: "oxygen", label: "Oxygen saturation", unit: "%",
      value: lowestOxygen.value, timestamp: lowestOxygen.timestamp, severity: "review",
      message: "This period includes a very low saved oxygen reading. Check the original record and date. If a reading this low is happening now, seek emergency medical help. A device can be inaccurate, but do not delay help if you feel unwell.",
    });
  } else if (lowestOxygen && lowestOxygen.value <= 92) {
    const selected = latestOxygen && latestOxygen.value <= 92 ? latestOxygen : lowestOxygen;
    reviews.push({
      key: "oxygen", label: "Oxygen saturation", unit: "%",
      value: selected.value, timestamp: selected.timestamp, severity: "review",
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
      value: latestTemperature.value, timestamp: latestTemperature.timestamp, severity: "review",
      message: "This is far outside usual body-temperature readings and may be a unit, sensor or typing error. Check the original record promptly. If a temperature this high is current and accurate, seek emergency medical help.",
    });
  } else if (hottest && hottest.value >= 43) {
    reviews.push({
      key: "temperature", label: "Temperature", unit: "°C",
      value: hottest.value, timestamp: hottest.timestamp, severity: "review",
      message: "This saved temperature is far outside usual body-temperature readings and may reflect an entry, device or unit problem. Check the original record. If a temperature around 40°C or higher is current and accurate, seek urgent medical advice; if you feel seriously unwell, seek emergency help.",
    });
  } else if (latestTemperature && latestTemperature.value >= 40) {
    reviews.push({
      key: "temperature", label: "Temperature", unit: "°C",
      value: latestTemperature.value, timestamp: latestTemperature.timestamp, severity: "urgent",
      message: "This is a very high reported temperature. Confirm it promptly with a reliable thermometer and seek urgent medical advice, especially if you feel very unwell.",
    });
  } else if (latestTemperature && latestTemperature.value < 35) {
    reviews.push({
      key: "temperature", label: "Temperature", unit: "°C",
      value: latestTemperature.value, timestamp: latestTemperature.timestamp, severity: "review",
      message: "This is a low reported body temperature. Check the measurement method and repeat the reading. If it is current and accurate, or you feel unwell, seek urgent medical advice.",
    });
  } else if (coldest && coldest.value < 35) {
    reviews.push({
      key: "temperature", label: "Temperature", unit: "°C",
      value: coldest.value, timestamp: coldest.timestamp, severity: "review",
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
  } else if (age !== null && age >= 18 && latestBreathing && latestBreathing.value > 0 && latestBreathing.value < 8) {
    reviews.push({
      key: "respiratory", label: "Breathing rate", unit: "breaths/min",
      value: lowestBreathing?.value ?? latestBreathing.value,
      timestamp: lowestBreathing?.timestamp ?? latestBreathing.timestamp, severity: "review",
      message: "This is lower than the typical adult resting range. Confirm the rate and measurement context; seek urgent medical advice if this is current or you feel unwell.",
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
      timestamp: severeBloodPressure.timestamp, severity: "urgent",
      message: "This blood-pressure reading is very high. Repeat it after sitting quietly and seek prompt medical advice. If you also have chest pain, shortness of breath, weakness, numbness, vision changes or trouble speaking, call local emergency services.",
    });
  }

  return reviews;
}

type VitalStatusAssessment = { label: string; detail: string; tone: StatusTone };

function vitalStatus(report: Report, metric: string, age: number | null): VitalStatusAssessment {
  const points = vitalSeries(report, metric);
  const latest = points[points.length - 1];
  if (!latest) return { label: "No reading", detail: "There is no saved value to assess.", tone: "info" };
  const value = latest.value;

  if (metric === "oxygen") {
    if (value <= 0 || value > 100) return { label: "Check entry", detail: "This is outside the valid 0–100% scale.", tone: "high" };
    if (value <= 88) return { label: "Critical low", detail: "If this is current, seek emergency medical help. Check the original record too.", tone: "critical" };
    if (value <= 92) return { label: "Urgent review", detail: "Repeat the reading and seek urgent medical advice; do not delay help if unwell.", tone: "high" };
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

function StatusCircle({ label, detail, tone }: { label: string; detail: string; tone: StatusTone }) {
  const styles = toneStyles(tone);
  const mark = tone === "good" ? "✓" : tone === "watch" ? "!" : tone === "high" ? "!!" : tone === "critical" ? "SOS" : "?";
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden="true" className={"grid h-11 w-11 shrink-0 place-items-center rounded-full border-[3px] bg-white text-xs font-black " + styles.border + " " + styles.text}>{mark}</span>
      <span className="min-w-0">
        <span className={"block text-xs font-black " + styles.text}>{label}</span>
        <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{detail}</span>
      </span>
    </div>
  );
}

function GoalProgressCard({ goal }: { goal: SnapshotGoal }) {
  const latest = goal.progress?.[0] ?? null;
  const rawPercent = finite(latest?.progressPercent);
  const percent = rawPercent === null
    ? (String(latest?.status ?? "").toUpperCase() === "ACHIEVED" || String(goal.status ?? "").toUpperCase() === "ACHIEVED" ? 100 : null)
    : Math.max(0, Math.min(100, rawPercent));
  const progressStatus = String(latest?.status ?? goal.status ?? "").toUpperCase();
  const tone: StatusTone = progressStatus === "DECLINING" ? "high"
    : progressStatus === "STAGNANT" ? "watch"
    : progressStatus === "ON_TRACK" || progressStatus === "IMPROVING" || progressStatus === "ACHIEVED" ? "good"
    : "info";
  const statusLabel: Record<string, string> = {
    ON_TRACK: "On track",
    IMPROVING: "Improving",
    STAGNANT: "Not changing yet",
    DECLINING: "Moving away from target",
    ACHIEVED: "Goal achieved",
    ACTIVE: "Active goal",
  };
  const statusText = statusLabel[progressStatus] ?? "Progress not rated";
  const targetValue = finite(goal.targetValue);
  const currentValue = finite(latest?.currentValue ?? goal.currentValue);
  const progressLabel = percent === null ? "No percentage saved yet" : Math.round(percent) + "% of goal journey";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <ScoreRing percent={percent} label="Goal progress" tone={tone} size={74} />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#0b7b80]">{human(goal.category)}</p>
          <h3 className="mt-1 text-sm font-black text-[#0b2d54]">{goal.title || "Health goal"}</h3>
          <p className={"mt-1 text-xs font-bold " + toneStyles(tone).text}>{statusText}</p>
          {goal.priority && <p className={"mt-1 inline-flex rounded-full border px-2 py-1 text-[9px] font-black " + (String(goal.priority).toUpperCase() === "CRITICAL" ? "border-rose-200 bg-rose-50 text-rose-900" : String(goal.priority).toUpperCase() === "HIGH" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-600")}>Priority: {human(goal.priority)}</p>}
          <p className="mt-1 text-[10px] leading-4 text-slate-500">{progressLabel}</p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={(goal.title || "Health goal") + " progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent === null ? undefined : Math.round(percent)}>
        {percent !== null && <div className="h-full rounded-full transition-[width] duration-300" style={{ width: String(percent) + "%", backgroundColor: toneStyles(tone).ring }} />}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {currentValue !== null && <span>Latest: <strong className="text-[#0b2d54]">{formatNumber(currentValue, 1)} {goal.unit || ""}</strong></span>}
        {targetValue !== null && <span>Target: <strong className="text-[#0b2d54]">{formatNumber(targetValue, 1)} {goal.unit || ""}</strong></span>}
        {latest?.measuredAt && <span>Updated {dateLabel(latest.measuredAt)}</span>}
        {goal.targetDate && <span>Target date {dateLabel(goal.targetDate)}</span>}
      </div>
      {goal.description && <p className="mt-2 text-xs leading-5 text-slate-500">{goal.description}</p>}
    </article>
  );
}

function HealthContextSection({ report, coveragePercent, daysLogged, totalDays }: { report: Report; coveragePercent: number; daysLogged: number; totalDays: number }) {
  const snapshot = report.currentSnapshot;
  const person = snapshot?.person;
  const profile = snapshot?.profile;
  const baseline = snapshot?.baseline;
  const age = ageAt(person?.dateOfBirth, report.generatedAt);
  const heightCm = finite(profile?.heightCm) ?? finite(baseline?.heightCm);
  const periodWeight = vitalSeries(report, "weight").at(-1)?.value ?? null;
  const weightKg = finite(profile?.weightKg) ?? finite(baseline?.weightKg) ?? periodWeight;
  const bmi = age !== null && age >= 18 && heightCm !== null && heightCm > 0 && weightKg !== null && weightKg > 0
    ? weightKg / Math.pow(heightCm / 100, 2)
    : null;
  const allConditions = snapshot?.conditions ?? [];
  const currentConditions = allConditions.filter((item) => !["RESOLVED"].includes(String(item.status ?? "").toUpperCase()));
  const currentAllergies = (snapshot?.allergies ?? []).filter((item) => !["INACTIVE", "RESOLVED"].includes(String(item.status ?? "").toUpperCase()));
  const currentMedications = (snapshot?.medications ?? []).filter((item) => String(item.status ?? "ACTIVE").toUpperCase() === "ACTIVE");
  const goals = snapshot?.activeGoals ?? [];
  const riskAssessments = snapshot?.riskAssessments ?? [];
  const coverageTone: StatusTone = coveragePercent >= 75 ? "good" : coveragePercent >= 40 ? "watch" : "high";
  const displayName = person?.preferredName || person?.firstName || "Your profile";
  return (
    <div className="mt-5 space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <ScoreRing percent={coveragePercent} label="Data coverage" tone={coverageTone} size={82} />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b7b80]">Monitoring summary</p>
              <h2 className="mt-1 text-lg font-black text-[#0b2d54]">{daysLogged} of {totalDays} days with records</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{coveragePercent}% data coverage in this report. This is a measure of how much was logged—not a score for your overall health.</p>
            </div>
          </div>
          <div className={"rounded-xl border px-3 py-2 text-xs font-bold " + toneStyles(coverageTone).surface + " " + toneStyles(coverageTone).border + " " + toneStyles(coverageTone).text}>
            {coverageTone === "good" ? "Good coverage" : coverageTone === "watch" ? "Moderate coverage" : "Limited coverage"}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b7b80]">Personal context</p>
            <h2 className="mt-1 text-lg font-black text-[#0b2d54]">{displayName}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Current profile and care context used to interpret this report. It may include information updated after the report period.</p>
          </div>
          <Link href="/health-passport" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#dcebed] px-3 py-2 text-[10px] font-black text-[#0b2d54] hover:bg-[#f4fbfb]">Review Health Passport <ArrowRight className="h-3 w-3" /></Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-[#f5fafb] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Age</p><p className="mt-1 text-lg font-black text-[#0b2d54]">{age === null ? "Not recorded" : age === 0 ? "Under 1 year" : String(age) + " years"}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{age === null ? "Add your date of birth for age-aware reference guidance." : age >= 18 ? "Adult reference guidance can be used as a general guide." : "Adult ranges are not applied to this report; age-specific guidance is needed."}</p></div>
          <div className="rounded-xl bg-[#f5fafb] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Height</p><p className="mt-1 text-lg font-black text-[#0b2d54]">{heightCm === null ? "Not recorded" : formatNumber(heightCm, 1) + " cm"}</p></div>
          <div className="rounded-xl bg-[#f5fafb] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Weight</p><p className="mt-1 text-lg font-black text-[#0b2d54]">{weightKg === null ? "Not recorded" : formatNumber(weightKg, 1) + " kg"}</p></div>
          <div className="rounded-xl bg-[#f5fafb] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">BMI · adult screening</p><p className="mt-1 text-lg font-black text-[#0b2d54]">{bmi === null ? "Not calculated" : formatNumber(bmi, 1)}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{bmi === null ? "Needs a recorded age of 18+ plus height and weight." : "A screening measure, not a diagnosis."}</p></div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-black text-[#0b2d54]">Health conditions</h3>
            {currentConditions.length ? <div className="mt-2 flex flex-wrap gap-2">{currentConditions.map((item, index) => <span key={String(item.condition?.name ?? index)} className="rounded-full border border-[#dcebed] bg-[#f5fafb] px-3 py-1.5 text-[10px] font-bold text-[#0b2d54]">{item.condition?.name || "Condition"}{item.status && String(item.status).toUpperCase() !== "ACTIVE" ? " · " + human(item.status) : ""}{item.severity ? " · " + human(item.severity) : ""}</span>)}</div> : <p className="mt-1 text-xs leading-5 text-slate-500">No current conditions are recorded in the Health Passport.</p>}
          </div>
          <div>
            <h3 className="text-xs font-black text-[#0b2d54]">Allergies</h3>
            {currentAllergies.length ? <div className="mt-2 flex flex-wrap gap-2">{currentAllergies.map((item, index) => <span key={String(item.allergy?.name ?? index)} className={"rounded-full border px-3 py-1.5 text-[10px] font-bold " + (["SEVERE", "LIFE_THREATENING"].includes(String(item.severity).toUpperCase()) ? "border-rose-200 bg-rose-50 text-rose-900" : "border-[#dcebed] bg-[#f5fafb] text-[#0b2d54]")}>{item.allergy?.name || "Allergy"}{item.severity ? " · " + human(item.severity) : ""}</span>)}</div> : <p className="mt-1 text-xs leading-5 text-slate-500">No active allergies are recorded in the Health Passport.</p>}
          </div>
          <div>
            <h3 className="text-xs font-black text-[#0b2d54]">Current medicines</h3>
            {currentMedications.length ? <div className="mt-2 space-y-2">{currentMedications.slice(0, 6).map((item, index) => <div key={String(item.medication?.name ?? index)} className="rounded-xl bg-[#f5fafb] px-3 py-2"><p className="text-xs font-bold text-[#0b2d54]">{item.medication?.name || "Medicine"}{item.dosage ? " · " + item.dosage : ""}</p><p className="mt-0.5 text-[10px] leading-4 text-slate-500">{[item.frequency, item.indication].filter(Boolean).join(" · ") || "No schedule or reason recorded"}</p>{item.adherencePercentage != null && <p className="mt-1 text-[10px] font-bold text-[#0b7b80]">Saved adherence: {formatNumber(item.adherencePercentage, 0)}%</p>}</div>)}</div> : <p className="mt-1 text-xs leading-5 text-slate-500">No active medicines are recorded in the Health Passport.</p>}
          </div>
          <div>
            <h3 className="text-xs font-black text-[#0b2d54]">Lifestyle context</h3>
            <div className="mt-2 flex flex-wrap gap-2">{[
              ["Smoking", profile?.smokingStatus],
              ["Alcohol", profile?.alcoholConsumption],
              ["Usual exercise", profile?.exerciseFrequency],
            ].filter((item) => Boolean(item[1])).map(([label, value]) => <span key={String(label)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600">{String(label)}: {human(value)}</span>)}</div>
            {![profile?.smokingStatus, profile?.alcoholConsumption, profile?.exerciseFrequency].some(Boolean) && <p className="mt-1 text-xs leading-5 text-slate-500">Lifestyle details are not fully recorded. The report will not infer them.</p>}
          </div>
        </div>
        {riskAssessments.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-black text-[#0b2d54]">Recorded clinical risk assessments</h3>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">These are scores and risk levels recorded by an assessment in your health record. Sympto is displaying them as saved; it is not recalculating or diagnosing risk here.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {riskAssessments.map((assessment, index) => {
                const level = String(assessment.overallRisk ?? "").toUpperCase();
                const tone: StatusTone = level === "LOW" ? "good" : level === "MODERATE" ? "watch" : level === "HIGH" ? "high" : level === "VERY_HIGH" ? "critical" : "info";
                const score = finite(assessment.score);
                return (
                  <article key={String(assessment.id ?? index)} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-[#0b2d54]">{human(assessment.assessmentType || "Clinical assessment")}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{assessment.assessedAt ? "Assessed " + dateLabel(assessment.assessedAt) : "Assessment date not recorded"}</p>
                      </div>
                      <StatusCircle label={level ? human(level) : "Not rated"} detail="Saved risk level" tone={tone} />
                    </div>
                    {score !== null && <p className="mt-2 text-xs text-slate-600">Recorded score: <strong className="text-[#0b2d54]">{formatNumber(score, 1)}</strong></p>}
                    {assessment.notes && <p className="mt-2 text-xs leading-5 text-slate-600">{assessment.notes}</p>}
                    {(assessment.results ?? []).slice(0, 3).length > 0 && <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">{(assessment.results ?? []).slice(0, 3).map((result, resultIndex) => <p key={String(result.factor ?? resultIndex)} className="text-[10px] leading-4 text-slate-500"><strong className="text-slate-700">{result.factor || "Factor"}:</strong> {result.value ?? (result.score == null ? "Not recorded" : String(result.score))}{result.recommendation ? " — " + result.recommendation : ""}</p>)}</div>}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b7b80]">Your active plan</p><h2 className="mt-1 text-lg font-black text-[#0b2d54]">Health goals and progress</h2><p className="mt-1 text-xs leading-5 text-slate-500">Progress circles use the percentage saved for each goal. If no percentage has been recorded, it is shown as missing rather than guessed.</p></div>
          <Link href="/health-goals" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#dcebed] px-3 py-2 text-[10px] font-black text-[#0b2d54] hover:bg-white">Manage health goals <ArrowRight className="h-3 w-3" /></Link>
        </div>
        {goals.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{goals.map((goal, index) => <GoalProgressCard key={String(goal.id ?? goal.title ?? index)} goal={goal} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-500">No active health goals are linked to this profile yet. Saved goals will appear here with their latest recorded progress.</div>}
      </section>
    </div>
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
}) {
  const currentValues = current.map((item) => item.value);
  const previousValues = previous.map((item) => item.value);
  const average = mean(currentValues);
  const latest = current[current.length - 1];
  const first = current[0];
  const change = latest && first ? latest.value - first.value : null;
  const changeText = change === null
    ? "Not enough readings to compare."
    : Math.abs(change) < 0.05
      ? "The first and most recent readings were very similar."
      : "From the first to the most recent reading: " + (change > 0 ? "+" : "") + formatNumber(change, digits) + " " + unit + ".";
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#0b2d54]">{label}</p>
          <p className="mt-1 text-[11px] text-slate-500">{current.length} {current.length === 1 ? "reading" : "readings"} saved in this period</p>
        </div>
        <HeartPulse className="h-5 w-5 shrink-0 text-[#24c1c4]" />
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
      <div className="mt-3"><StatusCircle label={status.label} detail={status.detail} tone={status.tone} /></div>
      {average === null ? (
        <p className="mt-4 text-sm text-slate-500">No readings were saved for this period.</p>
      ) : (
        <>
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Average for this period</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-[#0b2d54]">
              {formatNumber(average, digits)} <span className="text-sm font-bold text-slate-500">{unit}</span>
            </p>
            {latest && <p className="mt-1 text-xs text-slate-500">Most recent: {formatNumber(latest.value, digits)} {unit} · {dateLabel(new Date(latest.timestamp).toISOString())}</p>}
          </div>
          <MiniTrend values={currentValues} label={label + " trend"} />
          {review ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
              Check these saved values before interpreting the trend. See “Readings to double-check” above.
            </p>
          ) : (
            <p className="mt-3 text-xs leading-5 text-slate-600">{changeText}</p>
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
      current: vitalSeries(report, config.key),
      previous: vitalSeries(previousReport, config.key),
      review: measurementReviews.find((review) => review.key === config.key) ?? null,
      status: vitalStatus(report, config.key, age),
    }))
    .filter((config) => config.current.length > 0);
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
  const noAnalysisData = activeVitals.length === 0 && routines.length === 0 && symptomCount === 0 && sleepSessions.length === 0 && workouts.length === 0 && clinicalCount === 0;
  const moodPattern = lowMood.total > 0
    ? lowMood.low + " of " + lowMood.total + " mood check-ins were marked low or very low."
    : "";
  const symptomPattern = repeated.find((item) => item.count > 1);
  const activityDelta = previousReport ? workouts.length - previousReport.activity.workouts.length : null;
  const sleepDelta = previousReport ? sleepSessions.length - previousReport.activity.sleepSessions.length : null;
  const goalFollowUps = (report.currentSnapshot?.activeGoals ?? []).filter((goal) =>
    ["DECLINING", "STAGNANT"].includes(String(goal.progress?.[0]?.status ?? "").toUpperCase()),
  );
  const nextSteps: { title: string; detail: string; href: string; linkLabel: string; tone: StatusTone }[] = [];
  if (measurementReviews.length > 0) {
    nextSteps.push({
      title: "Check the flagged readings first",
      detail: "Start with the warning cards above. Check the saved date, unit and source; repeat a current measurement when safe. Follow any urgent medical advice in the warning instead of waiting for the next report.",
      href: "/today",
      linkLabel: "Review Health Vitals",
      tone: measurementReviews.some((item) => item.severity === "urgent") ? "critical" : "watch",
    });
  }
  if (goalFollowUps.length > 0) {
    const decliningGoals = goalFollowUps.filter((goal) => String(goal.progress?.[0]?.status ?? "").toUpperCase() === "DECLINING");
    const titles = goalFollowUps.slice(0, 2).map((goal) => String(goal.title || human(goal.category))).join(" and ");
    nextSteps.push({
      title: "Review goals that need attention",
      detail: titles + (goalFollowUps.length > 2 ? " and " + String(goalFollowUps.length - 2) + " more" : "") + (goalFollowUps.length === 1 ? " has" : " have") + " a latest saved status of " + (decliningGoals.length > 0 ? "declining or stagnant" : "stagnant") + ". Review the latest entry and target; do not change medicines or treatment based on this report alone.",
      href: "/health-goals",
      linkLabel: "Review health goals",
      tone: decliningGoals.length > 0 ? "high" : "watch",
    });
  }
  if (daysLogged < totalDays) {
    nextSteps.push({
      title: "Build a clearer picture next period",
      detail: "You have saved records on " + daysLogged + " of " + totalDays + " days. Record check-ins when you can, and only enter values you actually know. Empty days remain unknown—not zero.",
      href: "/today",
      linkLabel: "Open Today",
      tone: "info",
    });
  }
  if (nextSteps.length === 0) {
    nextSteps.push({
      title: "Keep tracking against your saved goals",
      detail: "Continue recording the measurements and daily routines that relate to your goals. Sympto will compare future periods as more dated records become available.",
      href: "/health-goals",
      linkLabel: "View health goals",
      tone: "good",
    });
  }

  return (
    <div className="mt-5 space-y-6">
      <HealthContextSection report={report} coveragePercent={coveragePercent} daysLogged={daysLogged} totalDays={totalDays} />
      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24c1c4]">Period overview</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">The bigger picture</h2></div><span className="text-xs text-slate-400">{totalDays} days</span></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile icon={CalendarDays} label="Days with entries" value={String(daysLogged) + "/" + String(totalDays)} detail={daysLogged === 0 ? "No dated health records were found for these days." : "You saved at least one health record on " + daysLogged + " of " + totalDays + " days. Days without an entry are not counted as zero."} />
          <SummaryTile icon={Activity} label="Symptom records" value={String(symptomCount)} detail={symptomComparison} />
          <SummaryTile icon={HeartPulse} label="Vital readings" value={String(activeVitals.reduce((sum, item) => sum + item.current.length, 0))} detail={activeVitals.length ? "Readings across " + activeVitals.length + " measurement types." : "No dated vital readings were found for this period."} />
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
        {activeVitals.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{activeVitals.map((item) => <VitalTrendCard key={item.key} label={item.label} description={item.description} unit={item.unit} digits={item.digits} current={item.current} previous={item.previous} previousLoading={previousLoading} review={item.review} status={item.status} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-500">No dated vital readings were found for this period. Once you save blood pressure, heart rate, weight or other measurements, they will appear here.</div>}
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
            <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-[#24c1c4]" /><h3 className="font-bold text-[#0b2d54]">Symptoms that came back</h3></div>
            {symptomPattern ? <><p className="mt-3 text-lg font-black text-[#0b2d54]">{symptomPattern.label}</p><p className="mt-1 text-sm leading-6 text-slate-600">You logged this symptom {symptomPattern.count} times during this period. You may want to note when it happens and any possible triggers to discuss with your healthcare professional.</p></> : <p className="mt-3 text-sm leading-6 text-slate-500">{symptomCount === 0 ? "You did not log any symptoms during this period. This does not tell us whether you felt well on days without a log." : "No symptom name appeared more than once in the records available for this period."}</p>}
            {repeated.length > 1 && <p className="mt-2 text-xs text-slate-500">Other repeated labels: {repeated.filter((item) => item.count > 1 && item.label !== symptomPattern?.label).slice(0, 2).map((item) => item.label + " (" + item.count + ")").join(" · ") || "None"}</p>}
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-[#24c1c4]" /><h3 className="font-bold text-[#0b2d54]">Logging consistency</h3></div>
            <p className="mt-3 text-lg font-black text-[#0b2d54]">{daysLogged} of {totalDays} days</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{daysLogged === 0 ? "No dated records were available for this period." : "Records appear on " + daysLogged + " of " + totalDays + " days. There are " + (totalDays - daysLogged) + " days without a saved record. That does not mean something was wrong or right on those days; it only means there is no entry to compare."}</p>
          </article>
          {moodPattern && <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-[#24c1c4]" /><h3 className="font-bold text-[#0b2d54]">Mood check-ins</h3></div><p className="mt-3 text-sm leading-6 text-slate-600">{moodPattern} These are the mood ratings you entered in your check-ins; they are not a diagnosis.</p></article>}
          {association && <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Moon className="h-5 w-5 text-[#24c1c4]" /><h3 className="font-bold text-[#0b2d54]">Sleep and stress on the same days</h3></div><p className="mt-3 text-sm leading-6 text-slate-600">On your {association.shorterDays} days with shorter logged sleep, your average stress rating was {formatNumber(association.shortStress, 1)}/10. On your {association.longerDays} days with longer logged sleep, it was {formatNumber(association.longStress, 1)}/10.</p><p className="mt-2 text-xs leading-5 text-slate-500">These ratings happened on the same days; this small pattern does not show that sleep caused the stress ratings.</p></article>}
        </div>
      </section>

      <section>
        <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24c1c4]">Next steps</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">What to do next</h2><p className="mt-1 text-sm leading-6 text-slate-500">These suggestions use saved warnings, recorded goal status and data coverage. They do not replace your care plan or a clinician's advice.</p></div>
        <div className="grid gap-3 md:grid-cols-2">
          {nextSteps.map((step) => (
            <article key={step.title} className={"rounded-2xl border bg-white p-4 " + toneStyles(step.tone).border}>
              <div className="flex items-start gap-3">
                <span className={"grid h-9 w-9 shrink-0 place-items-center rounded-full " + toneStyles(step.tone).surface + " " + toneStyles(step.tone).text}><span className="text-sm font-black">{step.tone === "good" ? "✓" : step.tone === "info" ? "i" : "!"}</span></span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-[#0b2d54]">{step.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{step.detail}</p>
                  <Link href={step.href} className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3 py-2 text-[10px] font-black text-white">{step.linkLabel} <ArrowRight className="h-3 w-3 text-[#24c1c4]" /></Link>
                </div>
              </div>
            </article>
          ))}
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

      <p className="rounded-2xl bg-slate-100 p-4 text-xs leading-5 text-slate-500">Report generated {dateLabel(report.generatedAt)}. This summary uses dated information saved for the selected period. Open the Health Journal to see individual entries, and ask your healthcare professional how the results apply to you.</p>
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
              <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#24c1c4]"><ShieldCheck className="h-4 w-4" />Sympto health intelligence</div><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 text-sm leading-6 text-white/75">{report.period.label}</p><p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">See how your saved measurements and daily routines changed, which symptoms appeared more than once, and where records are missing. This is a summary of your records, not a diagnosis.</p></div>
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
              <p><strong className="text-[#0b2d54]">Goal ring:</strong> uses the progress percentage recorded for that goal. If no score was saved, it stays blank rather than guessing.</p>
            </div>
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">The data-coverage score measures how much was logged, not your health. Sympto does not combine different measurements into one unvalidated overall health score. General adult reference ranges are guides, not personal targets; age, long-term conditions and clinician advice can change the interpretation.</p>
          </section>
          <HealthReportInsights report={report} previousReport={previousReport} previousLoading={previousLoading} />
        </div>
      </main>
    </ProtectedRoute>
  );
}
