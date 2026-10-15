"use client";

import Link from "next/link";
import { Activity, ArrowRight, Check, ChevronDown, Droplets, HeartPulse, Moon, PencilLine, Pill, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { healthGoalsService } from "@/services/health-goals.service";
import { healthJournalService } from "@/services/health-journal.service";
import GoalCardDisclosureButton from "@/components/today/goal-card-disclosure-button";

type SupportedGoalCardProps = {
  goal: any;
  activeGoals?: any[];
  healthContext?: {
    patient?: any;
    profile?: any;
    conditions?: any[];
    medications?: any[];
    symptoms?: any[];
    measurements?: any[];
    journal?: any;
  };
  onUpdated?: () => Promise<void> | void;
  detailsExpanded?: boolean;
  onToggleDetails?: () => void;
};

type GoalMeta = {
  label: string;
  unit: string;
  period: string;
  comparison: string;
  action: "CHECK_IN" | "VITALS" | "MANUAL";
  helper: string;
  icon: typeof Target;
  step?: string;
  min?: string;
  max?: string;
  placeholder?: string;
};

const GOAL_META: Record<string, GoalMeta> = {
  NUTRITION: { label: "Nutrition", unit: "calories/day", period: "Daily", comparison: "At most", action: "MANUAL", helper: "Keep today's total calorie intake at or below your target. Add up the calories from meals and snacks, then record the day's total.", icon: Activity, step: "50", min: "0", max: "10000", placeholder: "e.g. 2000" },
  BLOOD_PRESSURE: { label: "Blood pressure", unit: "mmHg", period: "Daily", comparison: "At most", action: "VITALS", helper: "Use Health Vitals to save a complete blood-pressure reading; the systolic value is then used by this goal.", icon: HeartPulse, step: "1", min: "40", max: "300", placeholder: "e.g. 130" },
  BLOOD_GLUCOSE: { label: "Blood glucose", unit: "mmol/L", period: "Daily", comparison: "At most", action: "MANUAL", helper: "Record the glucose value you want this goal to monitor.", icon: Activity, step: "0.1", min: "0.1", max: "50", placeholder: "e.g. 7.0" },
  CHOLESTEROL: { label: "Cholesterol", unit: "mmol/L", period: "Journey", comparison: "At most", action: "MANUAL", helper: "Record your total cholesterol result when you have a measured result available.", icon: Activity, step: "0.1", min: "0.1", max: "30", placeholder: "e.g. 5.0" },
  SLEEP: { label: "Sleep", unit: "hours/night", period: "Daily", comparison: "At least", action: "CHECK_IN", helper: "Sleep is recorded through your Daily Health Check-in so the goal stays connected to your health journal.", icon: Moon },
  MENTAL_HEALTH: { label: "Mental health", unit: "score", period: "Daily", comparison: "At most", action: "CHECK_IN", helper: "Your stress score is recorded through the Daily Health Check-in, where 1 is calm and 10 is very stressed.", icon: Activity },
  HYDRATION: { label: "Hydration", unit: "ml/day", period: "Daily", comparison: "At least", action: "CHECK_IN", helper: "Water intake is recorded through the Daily Health Check-in and compared with your daily target.", icon: Droplets },
  MEDICATION: { label: "Medication", unit: "adherence %", period: "Journey", comparison: "At least", action: "VITALS", helper: "This goal needs to be linked to an active prescribed medicine before dose adherence can be calculated. Review your medicines and reconnect this goal to the correct prescription.", icon: Pill },
  HEART_RATE: { label: "Resting heart rate", unit: "bpm", period: "Daily", comparison: "At most", action: "VITALS", helper: "Record your resting heart rate in Today’s Current health section after sitting quietly for a few minutes. Wearable or clinical readings count only when the source identifies them as resting; exercise readings are not compared with this target.", icon: HeartPulse, step: "1", min: "20", max: "260", placeholder: "e.g. 72" },
  OTHER: { label: "Custom health goal", unit: "", period: "Journey", comparison: "Configured measure", action: "MANUAL", helper: "Record the actual value defined by this goal’s measurement instructions. Use the stated source and unit each time; do not guess or reuse readings already tracked by another health category.", icon: PencilLine, step: "0.1", min: "0", placeholder: "Enter the measured value" },
};

function normaliseCategory(goal: any) {
  const category = String(goal?.category ?? goal?.metricType ?? goal?.metricConfig?.metricType ?? "OTHER")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  // PERSONAL uses the same measurement-driven workflow as a configured custom goal.
  return category === "PERSONAL" ? "OTHER" : category;
}

function goalCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    WEIGHT: "Weight",
    EXERCISE: "Exercise",
    NUTRITION: "Nutrition",
    BLOOD_PRESSURE: "Blood pressure",
    BLOOD_GLUCOSE: "Blood glucose",
    CHOLESTEROL: "Cholesterol",
    MEDICATION: "Medication",
    SLEEP: "Sleep",
    MENTAL_HEALTH: "Mental health",
    HYDRATION: "Hydration",
    SMOKING: "Smoking",
    ALCOHOL: "Alcohol",
    HEART_RATE: "Heart rate",
    OTHER: "Custom health goal",
  };
  return labels[category] ?? category.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metaFor(goal: any) {
  return GOAL_META[normaliseCategory(goal)] ?? GOAL_META.OTHER;
}

type ExistingGoalCategoryMatch = { value: string; label: string; measurement: string };

const EXISTING_GOAL_CATEGORY_MATCHERS: Array<ExistingGoalCategoryMatch & { patterns: RegExp[] }> = [
  { value: "WEIGHT", label: "Weight", measurement: "body-weight change or maintenance", patterns: [/\bweight\b/, /\blose weight\b/, /\bgain weight\b/, /\bweight loss\b/, /\bweight gain\b/, /\bmaintain weight\b/, /\bbody weight\b/] },
  { value: "EXERCISE", label: "Exercise", measurement: "weekly exercise minutes", patterns: [/\bexercise\b/, /\bworkouts?\b/, /\bphysical activity\b/, /\bactive minutes?\b/, /\bexercise minutes?\b/, /\bminutes of exercise\b/, /\b(weight training|strength training)\b/] },
  { value: "NUTRITION", label: "Nutrition", measurement: "daily calorie intake", patterns: [/\bcalories?\b/, /\bkcal\b/, /\bcalorie intake\b/, /\benergy intake\b/] },
  { value: "BLOOD_PRESSURE", label: "Blood pressure", measurement: "systolic blood pressure readings", patterns: [/\bblood pressure\b/, /\bsystolic\b/, /\bdiastolic\b/, /\bbp\b/] },
  { value: "BLOOD_GLUCOSE", label: "Blood glucose", measurement: "recorded blood-glucose values", patterns: [/\bblood glucose\b/, /\bblood sugar\b/, /\bglucose\b/] },
  { value: "CHOLESTEROL", label: "Cholesterol", measurement: "total cholesterol results", patterns: [/\bcholesterol\b/] },
  { value: "MEDICATION", label: "Medication", measurement: "adherence to a saved prescribed medication", patterns: [/\bmedication adherence\b/, /\bmedicine adherence\b/, /\bmedication\b/, /\bmedicines?\b/, /\bmeds?\b/, /\bpills?\b/, /\bmissed doses?\b/, /\bprescription adherence\b/] },
  { value: "SLEEP", label: "Sleep", measurement: "recorded sleep duration in hours per night", patterns: [/\bsleep\b/, /\bhours of sleep\b/, /\bsleep duration\b/] },
  { value: "MENTAL_HEALTH", label: "Mental health", measurement: "the daily stress score", patterns: [/\bstress score\b/, /\bstress level\b/, /\bdaily stress\b/, /\bstress rating\b/] },
  { value: "HYDRATION", label: "Hydration", measurement: "daily water intake", patterns: [/\bhydrat\w*\b/, /\bwater intake\b/, /\bdaily water\b/, /\bdrink( more)? water\b/, /\bstay hydrated\b/, /\bwater consumption\b/, /\bwater goal\b/, /\bfluid intake\b/] },
  { value: "SMOKING", label: "Smoking", measurement: "daily cigarette count", patterns: [/\bsmoking\b/, /\bcigarettes?\b/, /\bsmoke free\b/, /\bquit smoking\b/] },
  { value: "ALCOHOL", label: "Alcohol", measurement: "weekly alcohol-drink count", patterns: [/\balcohol\b/, /\bdrinks? per week\b/, /\bdrinks per week\b/] },
  { value: "HEART_RATE", label: "Heart rate", measurement: "resting heart-rate readings", patterns: [/\bheart rate\b/, /\bresting pulse\b/, /\bpulse rate\b/] },
];

function matchExistingGoalCategory(title: string): ExistingGoalCategoryMatch | null {
  const normalized = String(title ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!normalized) return null;
  // Allow distinct measures that the current dedicated category does not track.
  if (/\b(sleep quality|sleep score|deep sleep|rem sleep|sleep apnea|sleep stages?)\b/.test(normalized)) return null;
  if (/\bdiastolic\b/.test(normalized) && !/\bsystolic\b/.test(normalized)) return null;
  if (/\b(ldl|hdl|non hdl)\b/.test(normalized)) return null;
  if (/\b(smoke free days?|cigarette free days?|days without smoking|days without cigarettes|smoking abstinence days?)\b/.test(normalized)) return null;
  if (/\b(alcohol free days?|sober days?|days sober|sobriety streak)\b/.test(normalized)) return null;
  if (/\b(step count|steps per (day|week)|daily steps|walking distance|running distance|workout sessions?|exercise sessions?|number of workouts|reps? per|weights? lifted|calories burned|active calories|heart rate variability|hrv|exercise heart rate|heart rate during exercise|medication side effects?|medicine side effects?|drug side effects?|adverse drug reactions?)\b/.test(normalized)) return null;
  if (/\b(weight training|strength training)\b/.test(normalized)) {
    return EXISTING_GOAL_CATEGORY_MATCHERS.find((item) => item.value === "EXERCISE") ?? null;
  }
  return EXISTING_GOAL_CATEGORY_MATCHERS.find((item) => item.patterns.some((pattern) => pattern.test(normalized))) ?? null;
}



type HeartRateDayPoint = { dateKey: string; label: string; value: number | null; measuredAt: string | null; isFuture: boolean };

function southAfricaDayKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return String(fields.year) + "-" + String(fields.month) + "-" + String(fields.day);
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function currentValue(goal: any) {
  return numberOrNull(goal?.latestProgress?.currentValue ?? goal?.progress?.[0]?.currentValue ?? goal?.currentValue);
}

function targetValue(goal: any) {
  return numberOrNull(goal?.targetValue ?? goal?.metricConfig?.frequencyTarget);
}

type ContextMetricReading = { value: number; at: string | null };

function latestContextMetricReading(
  healthContext: SupportedGoalCardProps["healthContext"],
  category: "BLOOD_PRESSURE" | "HEART_RATE",
): ContextMetricReading | null {
  const measurements = [
    ...(Array.isArray(healthContext?.measurements) ? healthContext.measurements : []),
    ...(Array.isArray(healthContext?.journal?.signals) ? healthContext.journal.signals : []),
  ];
  const eligibleRestingSources = new Set([
    "manual-vitals",
    "manual-entry",
    "manual-vital",
    "patient-baseline",
    "clinical-vital",
    "clinical-record",
    "wearable-resting",
    "health-journal",
  ]);

  const candidates = measurements.flatMap((item: any) => {
    const type = String(item?.type ?? item?.metricType ?? item?.measurementType ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
    const name = String(item?.name ?? item?.label ?? item?.title ?? "").trim();
    const searchable = type + " " + name.toUpperCase();
    const isBloodPressure = category === "BLOOD_PRESSURE" && (
      /BLOOD_PRESSURE|SYSTOLIC_PRESSURE|\bBP\b/.test(searchable) ||
      /blood pressure|systolic/i.test(name) ||
      item?.systolicPressure != null ||
      item?.bloodPressureSystolic != null
    );
    const isHeartRate = category === "HEART_RATE" && (
      /HEART_RATE|HEARTRATE|RESTING_HEART_RATE|PULSE_RATE/.test(searchable) ||
      /heart rate|resting pulse/i.test(name) ||
      item?.restingHeartRate != null ||
      item?.heartRate != null
    );
    if (!isBloodPressure && !isHeartRate) return [];

    const source = String(item?.source ?? item?.origin ?? "").trim().toLowerCase().replace(/_/g, "-");
    const explicitlyResting = item?.isResting === true ||
      item?.metadata?.resting === true ||
      /resting/i.test(type + " " + name);
    if (isHeartRate && !explicitlyResting && !eligibleRestingSources.has(source)) return [];

    const values = category === "BLOOD_PRESSURE"
      ? [item?.systolicPressure, item?.bloodPressureSystolic, item?.systolic, item?.loggedValue, item?.value]
      : [item?.restingHeartRate, item?.heartRate, item?.bpm, item?.loggedValue, item?.value];
    let value: number | null = null;
    for (const candidate of values) {
      value = numberOrNull(candidate);
      if (value == null && category === "BLOOD_PRESSURE") {
        const match = String(candidate ?? "").match(/^\s*(\d{2,3})(?:\s*\/\s*\d{2,3})?/);
        if (match) value = numberOrNull(match[1]);
      }
      if (value == null && category === "HEART_RATE") {
        const match = String(candidate ?? "").trim().match(/^(-?\d+(?:\.\d+)?)/);
        if (match) value = numberOrNull(match[1]);
      }
      if (value != null) break;
    }
    const atValue = item?.measuredAt ?? item?.occurredAt ?? item?.recordedAt ?? item?.createdAt ?? item?.updatedAt ?? null;
    const at = atValue == null ? null : String(atValue);
    const time = at == null ? 0 : new Date(at).getTime();
    if (value == null || !Number.isFinite(value) || (at != null && Number.isNaN(time))) return [];
    if (category === "BLOOD_PRESSURE" && (value < 40 || value > 300)) return [];
    if (category === "HEART_RATE" && (value < 20 || value > 260)) return [];
    return [{ value, at, time }];
  });

  candidates.sort((a, b) => a.time - b.time);
  const latest = candidates.at(-1);
  return latest ? { value: latest.value, at: latest.at } : null;
}

function progressPercent(goal: any) {
  const progress = numberOrNull(goal?.latestProgress?.progressPercent ?? goal?.progress?.[0]?.progressPercent ?? goal?.progressPercent);
  if (progress != null) return Math.max(-100, Math.min(100, Math.round(progress)));
  const current = currentValue(goal);
  const target = targetValue(goal);
  if (current == null || target == null) return 0;
  const comparison = String(goal?.metricConfig?.comparison ?? "").toUpperCase();
  if (comparison === "AT_LEAST") return target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : current >= target ? 100 : 0;
  if (comparison === "AT_MOST") return target <= 0 ? current <= target ? 100 : 0 : current <= target ? 100 : Math.max(0, Math.min(100, Math.round((target / current) * 100)));
  return target <= 0 ? current === 0 ? 100 : 0 : Math.max(0, Math.min(100, Math.round((1 - Math.abs(current - target) / Math.max(Math.abs(target), 1)) * 100)));
}

function sourceAction(category: string) {
  if (category === "MEDICATION") return { label: "Review prescribed medicines", href: "/medications" };
  if (category === "EXERCISE" || category === "SLEEP" || category === "MENTAL_HEALTH" || category === "HYDRATION") return { label: "Update Daily Health Check-in", href: "#daily-health-check-in" };
  if (category === "BLOOD_PRESSURE") return { label: "Open Today’s Vitals", href: "/today#current-health" };
  if (category === "HEART_RATE") return { label: "Open Today's Current health", href: "/today#current-health" };
  if (category === "WEIGHT") return { label: "Open Health Vitals", href: "/health-vitals" };
  return { label: "Open health goal", href: "/health-goals" };
}


function dateKeyOrdinal(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

function journeyFor(goal: any) {
  const startDate = goal?.createdAt ? new Date(String(goal.createdAt)) : null;
  const targetDate = goal?.targetDate ? new Date(String(goal.targetDate)) : null;
  const todayKey = southAfricaDayKey(new Date());
  const startKey = startDate && !Number.isNaN(startDate.getTime()) ? southAfricaDayKey(startDate) : todayKey;
  const targetKey = targetDate && !Number.isNaN(targetDate.getTime()) ? southAfricaDayKey(targetDate) : null;
  const targetDayDelta = targetKey == null ? null : dateKeyOrdinal(targetKey) - dateKeyOrdinal(todayKey);
  return {
    journeyDay: Math.max(1, dateKeyOrdinal(todayKey) - dateKeyOrdinal(startKey) + 1),
    daysLeft: targetDayDelta == null ? null : Math.max(0, targetDayDelta),
    isPastDue: targetDayDelta != null && targetDayDelta < 0,
    targetDate,
  };
}

function formatJourneyDate(value: Date | null) {
  if (!value || Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", day: "2-digit", month: "short", year: "numeric" }).format(value);
}

function nutritionTargetReview(target: number | null) {
  if (target == null || !Number.isFinite(target) || target <= 0 || target > 1200) return null;
  if (target < 800) {
    return "This calorie target is below 800 calories/day. Sympto is flagging it for clinical review rather than recommending it; very-low-energy diets should only be used with specialist supervision for appropriate clinical circumstances.";
  }
  return "This calorie target is within the 800–1,200 calories/day low-energy range. Current NICE guidance recommends this range only within a specialist-supported, multicomponent approach for eligible adults. Review the target with a dietitian or other qualified healthcare professional.";
}

function goalNextStep(category: string, current: number | null, target: number | null, comparison = "CLOSEST") {
  if (current == null || target == null) {
    if (category === "HEART_RATE") {
      return "No resting heart-rate reading has been recorded today. Sit quietly for a few minutes, then record your resting pulse in Today’s Current health section.";
    }
    return category === "NUTRITION"
      ? "Add up today's meals and snacks, then record the total calorie intake."
      : "Record a measure to start meaningful progress tracking.";
  }
  if (category === "NUTRITION") {
    if (current <= target) {
      return "You are within today's calorie target. Keep logging meals and snacks and keep the daily total at or below the target.";
    }
    return "You are above today's calorie target. Keep recording your intake and review the next meal choices so the daily total stays at or below the target.";
  }
  if (category === "HEART_RATE") {
    if (current <= target) return "Today's resting reading is at or below your personal ceiling. Continue tracking resting readings consistently.";
    return "Today's resting reading is above your personal ceiling. Recheck after resting and review repeated high readings with a healthcare professional.";
  }
  if (category === "BLOOD_PRESSURE" || category === "BLOOD_GLUCOSE" || category === "CHOLESTEROL" || category === "MENTAL_HEALTH") {
    if (current <= target) return "You are currently within your ceiling. Keep tracking the next reading.";
    return "You are above the goal ceiling. Review the next reading and keep tracking the trend.";
  }
  if (category === "SLEEP" || category === "HYDRATION" || category === "EXERCISE") {
    if (current >= target) return "Target met for the current period. Keep the routine consistent.";
    return "Keep building toward the target in the current period.";
  }
  if (category === "OTHER") {
    const rule = String(comparison ?? "CLOSEST").toUpperCase();
    if (rule === "AT_LEAST") {
      if (current >= target) return "Target reached. Keep the recorded total up to date as your journey continues.";
      return `You are ${Number((target - current).toFixed(2))} below your target. Keep recording progress toward it.`;
    }
    if (rule === "AT_MOST") {
      if (current <= target) return "Your latest value is within the maximum you set.";
      return `Your latest value is ${Number((current - target).toFixed(2))} above your maximum target.`;
    }
    const distance = Math.abs(current - target);
    if (distance <= Math.max(0.5, Math.abs(target) * 0.05)) return "Your latest value is close to the target you set.";
    return current < target
      ? `Your latest value is ${Number((target - current).toFixed(2))} below the target. Keep tracking how it changes.`
      : `Your latest value is ${Number((current - target).toFixed(2))} above the target. Keep tracking how it changes.`;
  }
  return "Keep tracking this goal.";
}


function formatInsightDateTime(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type HeartRateInsightResult = {
  summary: string;
  status: "NO_DATA" | "NO_TARGET" | "WITHIN_TARGET" | "ABOVE_TARGET";
  trend: null | {
    fromLabel: string;
    fromValue: number;
    toLabel: string;
    toValue: number;
    delta: number;
    bothWithinTarget: boolean | null;
    recordedDays: number;
  };
  context: string[];
};

function buildHeartRateInsight(
  stats: {
    todayCurrent: number | null;
    todayAt: string | null;
    latestCurrent: number | null;
    latestAt: string | null;
    recordedDays: number;
    targetDays: number;
    days: HeartRateDayPoint[];
  },
  target: number | null,
  hasTodayReading: boolean,
  connectedGoalRelations: any[],
  activeGoals: any[],
  healthContext?: SupportedGoalCardProps["healthContext"],
): HeartRateInsightResult {
  const fmt = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
  const latest = stats.todayCurrent ?? stats.latestCurrent;
  const weeklyReadings = stats.days
    .filter((point) => point.value != null && !point.isFuture)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  let summary: string;
  let status: HeartRateInsightResult["status"];

  if (latest == null) {
    summary = "Record a resting reading to start your trend.";
    status = "NO_DATA";
  } else if (target == null) {
    summary = `Your latest reading is ${fmt(latest)} bpm. Add a personal ceiling to assess it against this goal.`;
    status = "NO_TARGET";
  } else if (latest < target) {
    summary = `${fmt(latest)} bpm is ${fmt(target - latest)} bpm below your ${fmt(target)} bpm ceiling.`;
    status = "WITHIN_TARGET";
  } else if (latest === target) {
    summary = `${fmt(latest)} bpm is exactly at your ${fmt(target)} bpm ceiling.`;
    status = "WITHIN_TARGET";
  } else {
    summary = `${fmt(latest)} bpm is ${fmt(latest - target)} bpm above your saved ceiling.`;
    status = "ABOVE_TARGET";
  }

  const previous = weeklyReadings.length >= 2 ? weeklyReadings[weeklyReadings.length - 2] : null;
  const recent = weeklyReadings.length >= 2 ? weeklyReadings[weeklyReadings.length - 1] : null;
  const delta = previous && recent ? Number(recent.value) - Number(previous.value) : null;
  const trend = previous && recent && previous.value != null && recent.value != null
    ? {
        fromLabel: previous.label,
        fromValue: previous.value,
        toLabel: recent.label,
        toValue: recent.value,
        delta: delta ?? 0,
        bothWithinTarget: target == null ? null : previous.value <= target && recent.value <= target,
        recordedDays: weeklyReadings.length,
      }
    : null;

  const context: string[] = [];
  const measurements = [
    ...(Array.isArray(healthContext?.measurements) ? healthContext!.measurements! : []),
    ...(Array.isArray(healthContext?.journal?.signals) ? healthContext!.journal!.signals : []),
  ];
  const patient = healthContext?.patient ?? healthContext?.profile ?? {};
  const relations = Array.isArray(connectedGoalRelations) ? connectedGoalRelations : [];

  const bloodPressureRelation = relations.find((relation) => String(relation?.goal?.category ?? "").toUpperCase() === "BLOOD_PRESSURE");
  if (bloodPressureRelation) {
    const bpVital = measurements.find((measurement: any) =>
      /BLOOD[_ ]?PRESSURE|SYSTOLIC/i.test(String(measurement?.type ?? measurement?.name ?? "")),
    );
    const match = bpVital ? String(bpVital.value ?? "").match(/^\s*(\d+(?:\.\d+)?)/) : null;
    const systolic = match ? Number(match[1]) : null;
    const relatedTarget = numberOrNull(bloodPressureRelation?.goal?.targetValue);
    if (systolic != null && Number.isFinite(systolic)) {
      const targetNote = relatedTarget == null
        ? ""
        : systolic <= relatedTarget
          ? ` · within the saved ${fmt(relatedTarget)} mmHg target`
          : ` · ${fmt(systolic - relatedTarget)} mmHg above its saved target`;
      context.push(`Blood pressure: ${fmt(systolic)} mmHg${targetNote}${formatInsightDateTime(bpVital?.measuredAt) ? ` · ${formatInsightDateTime(bpVital?.measuredAt)}` : ""}. Related context, not a cause of the pulse reading.`);
    } else {
      context.push("Blood pressure goal is connected, but no recent comparable reading is available.");
    }
  }

  const exerciseRelation = relations.find((relation) => String(relation?.goal?.category ?? "").toUpperCase() === "EXERCISE");
  if (exerciseRelation) {
    const relationGoal = exerciseRelation.goal;
    const linkedGoal = activeGoals.find((item: any) => String(item?.id ?? "") === String(relationGoal?.id ?? "")) ??
      activeGoals.find((item: any) => String(item?.category ?? "").toUpperCase() === "EXERCISE");
    const latestExercise = linkedGoal ? currentValue(linkedGoal) : null;
    const exerciseTarget = linkedGoal ? targetValue(linkedGoal) : numberOrNull(relationGoal?.targetValue);
    const exerciseUnit = String(linkedGoal?.unit ?? relationGoal?.unit ?? "minutes").trim();
    const exerciseAt = linkedGoal?.latestProgress?.measuredAt ?? linkedGoal?.progress?.[0]?.measuredAt ?? null;
    const exerciseWhen = formatInsightDateTime(exerciseAt);
    context.push(latestExercise != null
      ? `Exercise goal: ${fmt(latestExercise)}${exerciseUnit ? ` ${exerciseUnit}` : ""}${exerciseTarget == null ? "" : ` of ${fmt(exerciseTarget)}${exerciseUnit ? ` ${exerciseUnit}` : ""}`}${exerciseWhen ? ` · updated ${exerciseWhen}` : ""}. Activity-related pulse readings are not counted as resting.`
      : "Exercise goal is connected; no comparable exercise value is available yet.");
  }

  const symptomRecords = Array.isArray(healthContext?.symptoms) && healthContext!.symptoms!.length
    ? healthContext!.symptoms!
    : Array.isArray(healthContext?.journal?.recentSymptoms)
      ? healthContext!.journal!.recentSymptoms
      : [];
  const relevantSymptom = symptomRecords.find((symptom: any) =>
    /palpitation|chest pain|chest tightness|shortness of breath|breathless|faint|dizz|light.?headed/i.test(
      [symptom?.title, symptom?.name, ...(Array.isArray(symptom?.symptoms) ? symptom.symptoms.map((item: any) => item?.name ?? item) : [])].filter(Boolean).join(" "),
    ),
  );
  if (relevantSymptom) {
    const name = String(relevantSymptom?.title ?? relevantSymptom?.name ?? "related symptoms");
    context.unshift(`Symptom to review: ${name}${relevantSymptom?.overallSeverity ? ` · ${String(relevantSymptom.overallSeverity).toLowerCase().replaceAll("_", " ")}` : ""}. If chest pain, severe breathlessness or fainting is happening now, seek urgent medical care.`);
  }

  const needsClinicalContext = status === "ABOVE_TARGET" || (delta != null && Math.abs(delta) >= 5);
  if (needsClinicalContext) {
    const conditionNames = (Array.isArray(healthContext?.conditions) ? healthContext!.conditions! : [])
      .filter((item: any) => !item?.status || String(item.status).toUpperCase() === "ACTIVE")
      .map((item: any) => String(item?.condition?.name ?? item?.name ?? item?.title ?? "").trim())
      .filter(Boolean)
      .filter((name: string, index: number, all: string[]) => all.indexOf(name) === index)
      .slice(0, 2);
    const medicationNames = (Array.isArray(healthContext?.medications) ? healthContext!.medications! : [])
      .filter((item: any) => !item?.status || ["ACTIVE", "PAUSED", "ONGOING"].includes(String(item.status).toUpperCase()))
      .map((item: any) => String(item?.medication?.name ?? item?.name ?? item?.genericName ?? "").trim())
      .filter(Boolean)
      .filter((name: string, index: number, all: string[]) => all.indexOf(name) === index)
      .slice(0, 2);
    const profileFactors = [
      patient?.smokingStatus ? `smoking recorded as ${String(patient.smokingStatus).toLowerCase().replaceAll("_", " ")}` : "",
      patient?.alcoholConsumption ? `alcohol use recorded as ${String(patient.alcoholConsumption).toLowerCase().replaceAll("_", " ")}` : "",
    ].filter(Boolean);
    const items = [
      conditionNames.length ? `conditions on file: ${conditionNames.join(", ")}` : "",
      medicationNames.length ? `medicines on file: ${medicationNames.join(", ")}` : "",
      profileFactors.join("; "),
    ].filter(Boolean);
    if (items.length) {
      context.push(`${items.join(" · ")}. These are review prompts, not an explanation of what caused the pulse reading. If the change persists, discuss the trend and medicines with a healthcare professional.`);
    }
  }

  if (!context.length) {
    context.push("No additional linked measurement or relevant symptom is available. The summary is based on dated resting readings and your saved ceiling.");
  }

  return { summary, status, trend, context: context.slice(0, 4) };
}

const DEFAULT_METRICS: Record<string, { metricType: string; metricKey: string }> = {
  NUTRITION: { metricType: "NUTRITION", metricKey: "nutrition.calories" },
  BLOOD_PRESSURE: { metricType: "BLOOD_PRESSURE", metricKey: "blood_pressure.systolic" },
  BLOOD_GLUCOSE: { metricType: "BLOOD_GLUCOSE", metricKey: "blood_glucose.value" },
  CHOLESTEROL: { metricType: "CHOLESTEROL", metricKey: "cholesterol.total" },
  SLEEP: { metricType: "SLEEP", metricKey: "sleep.hours" },
  MENTAL_HEALTH: { metricType: "MENTAL_HEALTH", metricKey: "mental.stress" },
  HYDRATION: { metricType: "HYDRATION", metricKey: "hydration.ml" },
  HEART_RATE: { metricType: "HEART_RATE", metricKey: "heart_rate.bpm" },
  OTHER: { metricType: "OTHER", metricKey: "other.value" },
};

export default function TodaySupportedGoalCard({ goal, activeGoals = [], healthContext, onUpdated, detailsExpanded, onToggleDetails }: SupportedGoalCardProps) {
  const [value, setValue] = useState("");
  const [measurementNote, setMeasurementNote] = useState("");
  const [saving, setSaving] = useState(false);
  const category = normaliseCategory(goal);
  const meta = metaFor(goal);
  const Icon = meta.icon;
  const current = currentValue(goal);
  const target = targetValue(goal);
  const progress = progressPercent(goal);
  const displayUnit = category === "OTHER" ? String(goal?.unit ?? "").trim() : meta.unit;
  const personalGoalTitle = String(goal?.title ?? "").trim();
  const customGoalTitle = personalGoalTitle.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const separateCustomHealthOutcome = /\b(symptoms?|asthma|pain|rash|cough|breathing|allerg(y|ies)|side effects?|adverse reactions?|drug interactions?)\b/.test(customGoalTitle);
  const explicitMedicationUseIntent = /\b(adherence|adherent|missed doses?|dose schedule|prescription schedule|on time|medication routine|medicine routine|taking as prescribed|take .{0,60}(daily|every day|on time|as prescribed)|taking .{0,60}(daily|every day|on time|as prescribed))\b/.test(customGoalTitle);
  const simplifiedCustomTitle = customGoalTitle.replace(/\b(custom|health|goal|target|my|track|tracking|monitor|measure|record)\b/g, " ").trim();
  const medicationGoalMention = category === "OTHER" && !(separateCustomHealthOutcome && !explicitMedicationUseIntent)
    ? (Array.isArray(healthContext?.medications) ? healthContext.medications : []).find((medication: any) => {
        const names = [
          medication?.medication?.name,
          medication?.medication?.genericName,
          medication?.medication?.brandName,
          medication?.name,
          medication?.genericName,
          medication?.brandName,
        ];
        return names.some((name) => {
          const normalizedName = String(name ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
          if (!normalizedName) return false;
          const aliases = [normalizedName, ...normalizedName.split(" ").filter((part) => part.length >= 4)].filter((alias) => alias.length >= 4);
          const titleMentionsMedicine = aliases.some((alias) => (" " + customGoalTitle + " ").includes(" " + alias + " "));
          const titleIsMedicineLabel = aliases.some((alias) => customGoalTitle === alias || simplifiedCustomTitle === alias);
          return titleMentionsMedicine && (explicitMedicationUseIntent || titleIsMedicineLabel);
        });
      })
    : null;
  const customGoalCategoryMatch = category === "OTHER"
    ? matchExistingGoalCategory(personalGoalTitle) ?? (medicationGoalMention ? {
        value: "MEDICATION",
        label: "Medication",
        measurement: "adherence to your saved prescribed medicine",
      } : null)
    : null;
  const customGoalMeasurementInstructions = String(goal?.description ?? "").trim();
  const personalGoalNeedsSetup = category === "OTHER" && (
    !personalGoalTitle || ["personal goal", "custom health goal"].includes(personalGoalTitle.toLowerCase()) ||
    !displayUnit || target == null || !customGoalMeasurementInstructions || Boolean(customGoalCategoryMatch)
  );
  const personalComparison = String(goal?.metricConfig?.comparison ?? "CLOSEST").toUpperCase();
  const personalComparisonLabel = personalComparison === "AT_LEAST" ? "At least target" : personalComparison === "AT_MOST" ? "At most target" : "Stay close to target";
  const source = sourceAction(category);
  const goalId = String(goal?.id ?? "");
  const journey = useMemo(() => journeyFor(goal), [goal]);
  const connectedGoalRelations = useMemo(() => {
    const relations = Array.isArray(goal?.connectedGoals) ? goal.connectedGoals : [];
    const byGoalId = new Map<string, any>();
    for (const relation of relations) {
      const related = relation?.goal;
      const relatedId = String(related?.id ?? "");
      if (!relatedId) continue;
      const previous = byGoalId.get(relatedId);
      const relationType = String(relation?.relationshipType ?? "").toUpperCase();
      const previousType = String(previous?.relationshipType ?? "").toUpperCase();
      // The backend can return reciprocal relationship rows. Show each goal
      // once, preferring the supporting relationship when both are present.
      if (!previous || (relationType === "SUPPORTS" && previousType !== "SUPPORTS")) {
        byGoalId.set(relatedId, relation);
      }
    }
    return Array.from(byGoalId.values());
  }, [goal?.connectedGoals]);
  const connectedExerciseGoal = Array.isArray(goal?.connectedGoals)
    ? goal.connectedGoals
        .map((relation: any) => relation?.goal)
        .find((item: any) => String(item?.category ?? "").toUpperCase() === "EXERCISE")
    : null;
  const linkedExerciseGoal = connectedExerciseGoal ?? activeGoals.find((item: any) => String(item?.category ?? "").toUpperCase() === "EXERCISE");
  const exerciseConnectionHref = linkedExerciseGoal?.id
    ? "/today#today-goal-" + encodeURIComponent(String(linkedExerciseGoal.id))
    : "/health-goals?open=exercise";
  const defaultMetric = DEFAULT_METRICS[category] ?? DEFAULT_METRICS.OTHER;
  const canonicalVitalMetric = category === "BLOOD_PRESSURE" || category === "HEART_RATE";
  const metricType = canonicalVitalMetric ? defaultMetric.metricType : String(goal?.metricConfig?.metricType ?? defaultMetric.metricType).toUpperCase();
  const metricKey = canonicalVitalMetric ? defaultMetric.metricKey : String(goal?.metricConfig?.metricKey ?? defaultMetric.metricKey);
  const [liveCurrent, setLiveCurrent] = useState<number | null>(null);
  const [bpLatestAt, setBpLatestAt] = useState<string | null>(null);
  const [bpGoalStats, setBpGoalStats] = useState({ recordedDays: 0, targetDays: 0 });
  const [heartRateStats, setHeartRateStats] = useState<{
    todayCurrent: number | null;
    todayAt: string | null;
    latestCurrent: number | null;
    latestAt: string | null;
    recordedDays: number;
    targetDays: number;
    days: HeartRateDayPoint[];
  }>({ todayCurrent: null, todayAt: null, latestCurrent: null, latestAt: null, recordedDays: 0, targetDays: 0, days: [] });

  useEffect(() => {
    if (category !== "BLOOD_PRESSURE" || metricType !== "BLOOD_PRESSURE" || metricKey !== "blood_pressure.systolic") {
      setLiveCurrent(null);
      setBpLatestAt(null);
      setBpGoalStats({ recordedDays: 0, targetDays: 0 });

      return;
    }

    let active = true;
    const now = new Date();
    const createdAt = new Date(String(goal?.createdAt ?? ""));
    const goalStartDayKey = Number.isNaN(createdAt.getTime()) ? "0000-01-01" : southAfricaDayKey(createdAt);
    // Fetch the full history for the latest reading, but count attainment only
    // from the goal's local calendar start date.
    const from = new Date(0);

    healthGoalsService
      .getMetricEvents(metricType, metricKey, from, now)
      .then((result) => {
        if (!active) return;

        const events = (Array.isArray(result?.events) ? result.events : [])
          .filter((event: any) => {
            const occurredAt = new Date(String(event?.occurredAt ?? ""));
            return Number.isFinite(Number(event?.loggedValue)) && !Number.isNaN(occurredAt.getTime());
          })
          .map((event: any) => ({
            loggedValue: Number(event.loggedValue),
            occurredAt: String(event.occurredAt),
          }))
          .sort((a: any, b: any) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

        const latest = events.at(-1);
        setLiveCurrent(latest ? Number(latest.loggedValue) : null);
        setBpLatestAt(latest?.occurredAt ?? null);

        const latestByDay = new Map<string, { value: number; occurredAt: number }>();
        for (const event of events) {
          const occurredAt = new Date(event.occurredAt);
          const dayKey = southAfricaDayKey(occurredAt);
          // A reading earlier on the goal's first local calendar day still
          // belongs to that day's tracking window.
          if (dayKey < goalStartDayKey) continue;
          const value = Number(event.loggedValue);
          const existing = latestByDay.get(dayKey);

          if (!existing || occurredAt.getTime() >= existing.occurredAt) {
            latestByDay.set(dayKey, { value, occurredAt: occurredAt.getTime() });
          }
        }

        const daily = Array.from(latestByDay.values());
        const targetDays = target == null
          ? 0
          : daily.filter((entry) => entry.value <= target).length;

        setBpGoalStats({
          recordedDays: daily.length,
          targetDays,
        });
      })
      .catch(() => {
        if (active) {
          setLiveCurrent(null);
          setBpLatestAt(null);
          setBpGoalStats({ recordedDays: 0, targetDays: 0 });

        }
      });

    return () => {
      active = false;
    };
  }, [category, metricType, metricKey, goalId, goal?.createdAt, goal?.updatedAt, target]);

  useEffect(() => {
    if (category !== "HEART_RATE" || metricType !== "HEART_RATE" || metricKey !== "heart_rate.bpm") {
      setHeartRateStats({ todayCurrent: null, todayAt: null, latestCurrent: null, latestAt: null, recordedDays: 0, targetDays: 0, days: [] });
      return;
    }

    let active = true;
    const now = new Date();
    const todayKey = southAfricaDayKey(now);
    // Health Vitals can be saved long before a goal is created. Fetch the
    // goal-eligible source history so the latest known reading remains visible.
    const from = new Date(0);
    const eligibleSources = new Set(["manual-vitals", "patient-baseline", "clinical-vital", "wearable-resting", "health-journal"]);

    healthGoalsService
      .getMetricEvents(metricType, metricKey, from, now)
      .then((result) => {
        if (!active) return;

        const latestByDay = new Map<string, { value: number; at: Date }>();
        let latestKnown: { value: number; at: Date } | null = null;
        for (const event of Array.isArray(result?.events) ? result.events : []) {
          const sourceName = String(event?.source ?? "").toLowerCase();
          const value = Number(event?.loggedValue);
          const at = new Date(String(event?.occurredAt ?? ""));
          if (!eligibleSources.has(sourceName) || !Number.isFinite(value) || value < 20 || value > 260 || Number.isNaN(at.getTime())) continue;

          if (!latestKnown || at.getTime() > latestKnown.at.getTime()) latestKnown = { value, at };

          const dayKey = southAfricaDayKey(at);
          const existing = latestByDay.get(dayKey);
          if (!existing || at.getTime() >= existing.at.getTime()) {
            latestByDay.set(dayKey, { value, at });
          }
        }

        // Anchor the trend to the current calendar week: Monday through Sunday.
        // Future days remain empty rather than shifting the chart to a rolling week.
        const [year, month, day] = todayKey.split("-").map(Number);
        const todayDate = new Date(Date.UTC(year, month - 1, day));
        const daysSinceMonday = (todayDate.getUTCDay() + 6) % 7;
        const monday = new Date(todayDate);
        monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
        const dayPoints: HeartRateDayPoint[] = [];
        for (let offset = 0; offset < 7; offset += 1) {
          const date = new Date(monday);
          date.setUTCDate(monday.getUTCDate() + offset);
          const dateKey = date.toISOString().slice(0, 10);
          const entry = latestByDay.get(dateKey);
          const displayDate = new Date(dateKey + "T12:00:00+02:00");
          dayPoints.push({
            dateKey,
            label: new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "short" }).format(displayDate),
            value: entry?.value ?? null,
            measuredAt: entry?.at.toISOString() ?? null,
            isFuture: dateKey > todayKey,
          });
        }

        const recorded = dayPoints.filter((point) => point.value != null);
        const targetDays = target == null
          ? 0
          : recorded.filter((point) => Number(point.value) <= target).length;
        const todayEntry = latestByDay.get(todayKey);
        setHeartRateStats({
          todayCurrent: todayEntry?.value ?? null,
          todayAt: todayEntry?.at.toISOString() ?? null,
          latestCurrent: latestKnown?.value ?? null,
          latestAt: latestKnown?.at.toISOString() ?? null,
          recordedDays: recorded.length,
          targetDays,
          days: dayPoints,
        });
      })
      .catch(() => {
        if (active) {
          setHeartRateStats({ todayCurrent: null, todayAt: null, latestCurrent: null, latestAt: null, recordedDays: 0, targetDays: 0, days: [] });
        }
      });

    return () => {
      active = false;
    };
  }, [category, metricType, metricKey, goalId, goal?.createdAt, goal?.updatedAt, target]);

  const bloodPressureContextReading = category === "BLOOD_PRESSURE"
    ? latestContextMetricReading(healthContext, "BLOOD_PRESSURE")
    : null;
  const heartRateContextReading = category === "HEART_RATE"
    ? latestContextMetricReading(healthContext, "HEART_RATE")
    : null;
  const contextBloodPressureIsNewer = Boolean(
    bloodPressureContextReading &&
    (liveCurrent == null || !bpLatestAt ||
      (bloodPressureContextReading.at != null &&
       new Date(bloodPressureContextReading.at).getTime() > new Date(bpLatestAt).getTime())),
  );
  const contextHeartRateIsNewer = Boolean(
    heartRateContextReading &&
    (heartRateStats.latestCurrent == null || !heartRateStats.latestAt ||
      (heartRateContextReading.at != null &&
       new Date(heartRateContextReading.at).getTime() > new Date(heartRateStats.latestAt).getTime())),
  );
  const heartRateLatestCurrent = contextHeartRateIsNewer
    ? heartRateContextReading!.value
    : heartRateStats.latestCurrent ?? heartRateContextReading?.value ?? null;
  const heartRateLatestAt = contextHeartRateIsNewer
    ? heartRateContextReading?.at ?? null
    : heartRateStats.latestAt ?? heartRateContextReading?.at ?? null;
  const heartRateContextIsToday = Boolean(
    contextHeartRateIsNewer &&
    heartRateContextReading?.at &&
    southAfricaDayKey(new Date(heartRateContextReading.at)) === southAfricaDayKey(new Date()),
  );
  const heartRateTodayCurrent = heartRateStats.todayCurrent ?? (heartRateContextIsToday ? heartRateContextReading?.value ?? null : null);
  const heartRateTodayAt = heartRateStats.todayAt ?? (heartRateContextIsToday ? heartRateContextReading?.at ?? null : null);
  const heartRateHasTodayReading = heartRateTodayCurrent != null;
  const heartRateDisplayAt = heartRateHasTodayReading ? heartRateTodayAt : heartRateLatestAt;
  const bpDisplayAt = contextBloodPressureIsNewer
    ? bloodPressureContextReading?.at ?? null
    : bpLatestAt ?? bloodPressureContextReading?.at ?? null;
  const displayCurrent = category === "MEDICATION"
    ? null
    : category === "HEART_RATE"
      ? heartRateTodayCurrent ?? heartRateLatestCurrent
      : category === "BLOOD_PRESSURE"
        ? contextBloodPressureIsNewer
          ? bloodPressureContextReading?.value ?? liveCurrent ?? current
          : liveCurrent ?? bloodPressureContextReading?.value ?? current
        : current;
  const bpDistance = category === "BLOOD_PRESSURE" && displayCurrent != null && target != null
    ? displayCurrent - target
    : null;
  const bpWithinTarget = category === "BLOOD_PRESSURE" && displayCurrent != null && target != null
    ? displayCurrent <= target
    : null;
  const bpAttainmentPercent = category === "BLOOD_PRESSURE" && target != null && bpGoalStats.recordedDays > 0
    ? Math.round((bpGoalStats.targetDays / bpGoalStats.recordedDays) * 100)
    : 0;
  const heartRateTodayScore = category === "HEART_RATE" && heartRateHasTodayReading && displayCurrent != null && target != null
    ? progressPercent({
        ...goal,
        currentValue: displayCurrent,
        targetValue: target,
        metricConfig: { ...goal?.metricConfig, comparison: "AT_MOST" },
        progress: [],
        latestProgress: null,
        progressPercent: null,
      })
    : null;
  const displayProgress = category === "MEDICATION"
    ? null
    : category === "BLOOD_PRESSURE"
      ? target != null && bpGoalStats.recordedDays > 0 ? bpAttainmentPercent : null
    : category === "HEART_RATE"
      ? heartRateTodayScore
      : category === "OTHER" && displayCurrent == null
        ? null
        : displayCurrent == null
          ? progress
          : progressPercent({
          ...goal,
          currentValue: displayCurrent,
          progress: [],
          latestProgress: null,
          progressPercent: null,
        });

  const nextStep = category === "HEART_RATE" && !heartRateHasTodayReading && heartRateStats.latestAt
    ? "Your latest saved resting reading is from " + new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium" }).format(new Date(heartRateStats.latestAt)) + ". Record a new resting reading today to update the daily goal."
    : goalNextStep(category, displayCurrent, target, personalComparison);
  const heartRateInsight = category === "HEART_RATE"
    ? buildHeartRateInsight({
        ...heartRateStats,
        todayCurrent: heartRateTodayCurrent,
        todayAt: heartRateTodayAt,
        latestCurrent: heartRateLatestCurrent,
        latestAt: heartRateLatestAt,
      }, target, heartRateHasTodayReading, connectedGoalRelations, activeGoals, healthContext)
    : null;
  const bloodPressureInsight = category === "BLOOD_PRESSURE"
    ? displayCurrent == null
      ? "No blood-pressure reading is linked to this goal yet. Record a complete systolic/diastolic reading in Current health; Sympto will show the latest systolic value here."
      : target == null
        ? "Your latest systolic reading is " + displayCurrent + " mmHg. Add a personal target to measure goal attainment."
        : bpWithinTarget
          ? "Latest systolic reading: " + displayCurrent + " mmHg, " + (bpDistance === 0 ? "exactly at" : Math.abs(bpDistance ?? 0) + " mmHg below") + " your " + target + " mmHg ceiling."
          : "Latest systolic reading: " + displayCurrent + " mmHg, " + Math.abs(bpDistance ?? 0) + " mmHg above your " + target + " mmHg ceiling."
    : null;
  const compactInsight = category === "MEDICATION"
    ? meta.helper
    : category === "BLOOD_PRESSURE"
      ? bloodPressureInsight
      : category === "HEART_RATE"
        ? heartRateInsight?.summary ?? nextStep
        : nextStep;

  async function recordValue() {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) { toast.error("Enter a valid measurement."); return; }
    if (meta.min != null && numeric < Number(meta.min)) { toast.error(meta.label + " is below the supported input range."); return; }
    if (meta.max != null && numeric > Number(meta.max)) { toast.error(meta.label + " is above the supported input range."); return; }
    if (!goalId) return;

    setSaving(true);
    try {
      if (category === "OTHER") {
        await healthGoalsService.recordProgress(goalId, numeric, measurementNote.trim() || undefined);
      } else {
        const occurredAt = new Date().toISOString();
        await healthGoalsService.syncMetricEvent({
          metricType,
          metricKey,
          loggedValue: numeric,
          occurredAt,
          source: "goal-manual",
          sourceId: "goal-" + goalId + "-" + Date.now(),
        });
      }

      if (["NUTRITION", "BLOOD_GLUCOSE", "CHOLESTEROL"].includes(category)) {
        try {
          await healthJournalService.create({
            title: "Goal measurement · " + meta.label,
            journal: meta.label + ": " + numeric + (meta.unit ? " " + meta.unit : "") + ".",
            notes: "Recorded from Today.",
          });
        } catch {
          toast.warning(meta.label + " saved", {
            description: "The goal record was saved, but the Health Journal entry could not be added.",
          });
        }
      }

      setValue("");
      if (category === "OTHER") setMeasurementNote("");
      toast.success(meta.label + " value recorded.");
      await onUpdated?.();
    } catch (error: any) {
      const message = error?.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join(" ") : String(message || "We could not record this goal measurement."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article id={"today-goal-" + encodeURIComponent(goalId)} className={detailsExpanded ? "w-full overflow-visible rounded-[26px] border border-[#dce9ee] bg-white shadow-[0_12px_32px_rgba(11,45,84,.045)]" : "w-full overflow-hidden rounded-[26px] border border-[#dce9ee] bg-white shadow-[0_12px_32px_rgba(11,45,84,.045)]"}>
      <header className="flex items-start justify-between gap-3 border-b border-[#edf2f5] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80]"><Icon className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[.16em] text-[#0b7b80]">{meta.label}</p>
            <h3 className="mt-1 truncate text-sm font-black tracking-[-.03em] text-[#0b2d54]">{customGoalCategoryMatch ? "Use " + customGoalCategoryMatch.label + " category" : personalGoalNeedsSetup ? "Finish goal setup" : String(goal?.title || meta.label)}</h3>
            <p className="mt-1 text-[9px] font-semibold text-[#8595a1]">{personalGoalNeedsSetup ? "Setup required · define measure and unit" : `${category === "OTHER" ? personalComparisonLabel : meta.comparison} · ${meta.period} · ${displayUnit || "Measured value"}`}</p>
            {category === "OTHER" && customGoalMeasurementInstructions && <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#71839a]"><span className="font-bold">Measurement method: </span>{customGoalMeasurementInstructions}</p>}
          </div>
        </div>
        <span className={((category === "BLOOD_PRESSURE" && bpWithinTarget === false) || (category === "HEART_RATE" && displayCurrent != null && target != null && displayCurrent > target)) ? "shrink-0 rounded-full bg-amber-50 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[.1em] text-amber-800 ring-1 ring-amber-100" : "shrink-0 rounded-full bg-[#eef8f8] px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[.1em] text-[#0b7b80]"}>{category === "MEDICATION" ? "Medicine not linked" : category === "BLOOD_PRESSURE" ? displayCurrent == null ? "No reading" : target == null ? "Target needed" : bpWithinTarget ? "Within target" : "Above target" : category === "HEART_RATE" ? (heartRateHasTodayReading ? (target != null && displayCurrent != null && displayCurrent > target ? "Above target" : "Reading saved") : heartRateLatestCurrent != null ? "Latest saved reading" : "No reading") : category === "OTHER" ? customGoalCategoryMatch ? "Use category" : personalGoalNeedsSetup ? "Setup required" : journey.isPastDue ? "Past due" : displayCurrent == null ? "Not started" : journey.daysLeft === 0 && journey.targetDate ? "Due today" : "Journey active" : "Today"}</span>
      </header>

      {(detailsExpanded || personalGoalNeedsSetup) && (
      <div className="px-4 pb-4 pt-4 sm:px-5">
        {detailsExpanded && onToggleDetails && <div className="mb-3 flex justify-end"><GoalCardDisclosureButton expanded onToggle={onToggleDetails} label="Show less" /></div>}
        {personalGoalNeedsSetup ? (
          <section className="mt-3 rounded-[20px] border border-[#dce9ec] bg-[#f7fbfc] p-4">
            <p className="text-[9px] font-black uppercase tracking-[.14em] text-[#0b7b80]">{customGoalCategoryMatch ? "Dedicated category already exists" : "Measurement setup required"}</p>
            <p className="mt-2 text-[11px] leading-5 text-[#506b7a]">
              {customGoalCategoryMatch
                ? "This goal overlaps Sympto’s " + customGoalCategoryMatch.label + " category, which already tracks " + customGoalCategoryMatch.measurement + ". Do not record the same health measurement here; create the dedicated category goal instead."
                : !personalGoalTitle || ["personal goal", "custom health goal"].includes(personalGoalTitle.toLowerCase())
                  ? "Give this goal a specific measurement name so you know what the number represents. "
                  : ""}
              {!displayUnit ? "Add a unit that describes the health measurement, such as sessions/week or symptom-free days. " : ""}
              {!customGoalMeasurementInstructions ? "Explain how you will obtain each value, for example by counting completed physiotherapy sessions during the week. " : ""}
              {target == null
                ? "Enter a target after defining the measure and its unit."
                : "The saved target is " + target + (displayUnit ? " " + displayUnit : " (unit not set)") + "; it cannot be interpreted until the missing setup details are added."}
            </p>
            <Link href={customGoalCategoryMatch ? "/health-goals" : "/health-goals?edit=" + encodeURIComponent(goalId)} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[10px] font-black text-white">
              <PencilLine className="h-3.5 w-3.5 text-[#24c1c4]" />{customGoalCategoryMatch ? "Open health-goal categories" : "Finish goal setup"}
            </Link>
          </section>
        ) : category === "BLOOD_PRESSURE" ? (
          <>
            <section className="relative overflow-hidden rounded-[28px] bg-[#0b2d54] px-5 py-6 text-white shadow-[0_16px_34px_rgba(11,45,84,.16)] sm:px-6 sm:py-7">
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#24c1c4]/10 blur-3xl" aria-hidden="true" />
              <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-[#0f5a62]/35 blur-3xl" aria-hidden="true" />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.17em] text-[#24c1c4]">Blood pressure · Daily target</p>
                    <p className="mt-1 text-[10px] font-semibold text-white/55">
                      {target == null
                        ? "Add a personal systolic ceiling to measure goal attainment"
                        : bpGoalStats.recordedDays > 0
                          ? `${bpGoalStats.targetDays} of ${bpGoalStats.recordedDays} recorded days at target`
                          : "Start recording readings to build your trend"}
                    </p>
                  </div>
                  <span className={bpWithinTarget === false
                    ? "rounded-full bg-red-400/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-red-200 ring-1 ring-red-300/20"
                    : "rounded-full bg-[#24c1c4]/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-[#8ef0ef] ring-1 ring-[#24c1c4]/20"}>
                    {displayCurrent == null ? "No reading" : target == null ? "Target needed" : bpWithinTarget ? "Within target" : "Above target"}
                  </span>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-[1.15fr_.85fr] sm:items-end">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.16em] text-white/40">Current</p>
                    <div className="mt-1 flex items-end gap-2">
                      <p className="text-[48px] font-black leading-none tracking-[-.085em]">
                        {displayCurrent == null ? "—" : displayCurrent}
                      </p>
                      <span className="mb-1.5 text-sm font-bold text-white/45">mmHg</span>
                    </div>
                    <p className="mt-3 text-[10px] font-semibold leading-5 text-white/55">Latest systolic reading recorded in Health Vitals.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-[18px] bg-white/[.06] p-3.5 ring-1 ring-white/10">
                      <p className="text-[8px] font-black uppercase tracking-[.13em] text-white/35">Target</p>
                      <p className="mt-1 text-lg font-black tracking-[-.04em]">{target == null ? "—" : "≤" + target}</p>
                      <p className="mt-0.5 text-[8px] font-bold text-white/35">mmHg systolic</p>
                    </div>
                    <div className={bpWithinTarget === false
                      ? "rounded-[18px] bg-red-400/10 p-3.5 ring-1 ring-red-300/20"
                      : "rounded-[18px] bg-[#24c1c4]/10 p-3.5 ring-1 ring-[#24c1c4]/20"}>
                      <p className={bpWithinTarget === false
                        ? "text-[8px] font-black uppercase tracking-[.13em] text-red-200"
                        : "text-[8px] font-black uppercase tracking-[.13em] text-[#8ef0ef]"}>Distance</p>
                      <p className={bpWithinTarget === false
                        ? "mt-1 text-lg font-black tracking-[-.04em] text-red-100"
                        : "mt-1 text-lg font-black tracking-[-.04em] text-white"}>
                        {displayCurrent == null || target == null
                          ? "—"
                          : bpWithinTarget
                            ? Math.abs(bpDistance ?? 0) === 0 ? "At target" : Math.abs(bpDistance ?? 0) + " below"
                            : "+" + Math.abs(bpDistance ?? 0)}
                      </p>
                      <p className={bpWithinTarget === false ? "mt-0.5 text-[8px] font-bold text-red-200/65" : "mt-0.5 text-[8px] font-bold text-white/35"}>
                        {displayCurrent == null || target == null || bpWithinTarget === true ? "target" : "mmHg above target"}
                      </p>
                    </div>
                  </div>
                </div>

                {displayCurrent != null && target != null && (
                  <div className={bpWithinTarget === false
                    ? "mt-5 rounded-[20px] bg-red-400/10 p-4 ring-1 ring-red-300/20"
                    : "mt-5 rounded-[20px] bg-[#24c1c4]/10 p-4 ring-1 ring-[#24c1c4]/20"}>
                    <div className="flex items-start gap-3">
                      <span className={bpWithinTarget === false
                        ? "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-red-400/10 text-red-200"
                        : "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-[#24c1c4]/10 text-[#8ef0ef]"}>
                        <HeartPulse className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className={bpWithinTarget === false
                          ? "text-[9px] font-black uppercase tracking-[.15em] text-red-200"
                          : "text-[9px] font-black uppercase tracking-[.15em] text-[#8ef0ef]"}>
                          {bpWithinTarget ? "At target today" : "Above target today"}
                        </p>
                        <p className="mt-1 text-sm font-black text-white">
                          {bpWithinTarget
                            ? (bpDistance ?? 0) === 0
                              ? "Your reading is at your target."
                              : Math.abs(bpDistance ?? 0) + " mmHg below your target."
                            : Math.abs(bpDistance ?? 0) + " mmHg above your target."}
                        </p>
                        <p className="mt-1 text-[10px] leading-5 text-white/55">
                          {bpWithinTarget
                            ? "Keep tracking daily readings so Sympto can measure how consistently you stay within your target."
                            : "Your reading is above the target. Keep recording readings so Sympto can show whether your trend is moving toward it."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[.15em] text-white/35">Goal attainment</p>
                      <p className="mt-1 text-[10px] font-semibold text-white/55">Based on days with a recorded latest reading at or below target.</p>
                    </div>
                    <span className="text-lg font-black tracking-[-.04em] text-white">{displayProgress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: Math.max(0, displayProgress ?? 0) + "%" }} />
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : category === "HEART_RATE" ? (
          <>
          <section className="relative overflow-hidden rounded-[25px] bg-[#0b2d54] px-4 py-5 text-white shadow-[0_16px_34px_rgba(11,45,84,.15)] sm:px-5">
            <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#24c1c4]/10 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#24c1c4]">Resting heart rate · Daily goal</p>
                  <p className="mt-1 text-[11px] text-white/60">Use readings taken after sitting quietly for a few minutes.</p>
                </div>
                <span className={displayCurrent == null
                  ? "rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white/75 ring-1 ring-white/10"
                  : displayCurrent <= (target ?? 0)
                    ? "rounded-full bg-[#24c1c4]/15 px-3 py-1.5 text-[10px] font-bold text-[#9af0ef] ring-1 ring-[#24c1c4]/20"
                    : "rounded-full bg-amber-400/10 px-3 py-1.5 text-[10px] font-bold text-amber-100 ring-1 ring-amber-200/20"}>
                  {displayCurrent == null || target == null
                    ? "No reading available"
                    : !heartRateHasTodayReading
                      ? displayCurrent <= target ? "Latest reading within target" : "Latest reading above target"
                      : displayCurrent <= target ? "Within personal target" : "Above personal target"}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1.15fr_.85fr]">
                <div className="rounded-[20px] bg-white/[.06] p-4 ring-1 ring-white/10">
                  <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/50">{heartRateHasTodayReading ? "Today's resting reading" : "Latest saved resting reading"}</p>
                  <div className="mt-2 flex items-end gap-2">
                    <p className="text-[46px] font-black leading-none tracking-[-.07em]">{displayCurrent == null ? "—" : displayCurrent}</p>
                    <span className="mb-1 text-sm font-bold text-white/55">bpm</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-white/55">
                    {heartRateDisplayAt
                      ? (heartRateHasTodayReading
                          ? "Recorded today at " + new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit" }).format(new Date(heartRateDisplayAt))
                          : "Last recorded " + new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" }).format(new Date(heartRateDisplayAt)))
                      : "No resting heart-rate reading has been saved yet."}
                  </p>
                  {!heartRateHasTodayReading && heartRateStats.latestAt && (
                    <p className="mt-1 text-[10px] text-amber-100/80">There is no reading for today yet.</p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-rows-2">
                  <div className="rounded-[20px] bg-[#24c1c4]/10 p-4 ring-1 ring-[#24c1c4]/20">
                    <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9af0ef]">Personal ceiling</p>
                    <p className="mt-2 text-2xl font-black tracking-[-.04em]">{target == null ? "—" : "≤ " + target}</p>
                    <p className="mt-1 text-[10px] font-semibold text-white/55">beats per minute</p>
                  </div>
                  <div className="rounded-[20px] bg-white/[.06] p-4 ring-1 ring-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/50">Reading vs target</p>
                    <p className="mt-2 text-xl font-black">{displayProgress == null ? "Not measured" : displayProgress + "%"}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: Math.max(0, displayProgress ?? 0) + "%" }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[20px] bg-white/[.06] p-4 ring-1 ring-white/10">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/55">This calendar week</p>
                    <p className="mt-1 text-sm font-bold">
                      {heartRateStats.recordedDays > 0
                        ? heartRateStats.targetDays + " of " + heartRateStats.recordedDays + " recorded days at target"
                        : "No resting readings recorded yet"}
                    </p>
                  </div>
                  <p className="text-[10px] text-white/50">Mon–Sun · latest eligible reading per day</p>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-2" role="img" aria-label="Latest resting heart-rate reading for each of the last seven days">
                  {heartRateStats.days.map((point) => (
                    <div key={point.dateKey} className="flex min-w-0 flex-col items-center gap-1.5" title={point.value == null ? point.label + (point.isFuture ? ": not yet" : ": no reading") : point.label + ": " + point.value + " bpm"}>
                      <div className="flex h-16 w-full items-end justify-center rounded-lg bg-white/[.04] px-1 pt-1">
                        <div
                          className={point.value == null
                            ? "w-full rounded-md bg-white/10"
                            : target != null && point.value <= target
                              ? "w-full rounded-md bg-[#24c1c4]"
                              : "w-full rounded-md bg-amber-300"}
                          style={{ height: point.value == null ? (point.isFuture ? "3%" : "8%") : Math.max(12, Math.min(100, ((point.value - 35) / 115) * 100)) + "%" }}
                        />
                      </div>
                      <span className="text-[9px] font-semibold text-white/50">{point.label}</span>
                      <span className="text-[9px] font-bold text-white/75">{point.value == null ? "—" : point.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-5 text-white/55">Heart rate changes with activity, stress, illness and medicines. Only readings clearly identified as resting are compared with this goal. The target shown above is your saved goal, not a diagnosis or a universal threshold.</p>
            </div>
          </section>
          <section className="mt-3 rounded-[22px] border border-[#dce9ec] bg-white p-4 shadow-[0_5px_18px_rgba(11,45,84,.025)] sm:p-5" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[10px] bg-[#e8f8f7] text-[#0b7b80]"><Sparkles className="h-3.5 w-3.5" /></span>
                  <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#0b7b80]">Sympto insight</p>
                </div>
                <p className="mt-3 text-sm font-bold leading-6 text-[#0b2d54]">{heartRateInsight?.summary}</p>
              </div>
              <span className={heartRateInsight?.status === "WITHIN_TARGET"
                ? "shrink-0 rounded-full bg-[#e8f8f7] px-2.5 py-1.5 text-[9px] font-black text-[#0b7b80]"
                : heartRateInsight?.status === "ABOVE_TARGET"
                  ? "shrink-0 rounded-full bg-amber-50 px-2.5 py-1.5 text-[9px] font-black text-amber-800"
                  : "shrink-0 rounded-full bg-slate-100 px-2.5 py-1.5 text-[9px] font-black text-slate-600"}>
                {heartRateInsight?.status === "WITHIN_TARGET" ? "Within goal" : heartRateInsight?.status === "ABOVE_TARGET" ? "Above goal" : heartRateInsight?.status === "NO_TARGET" ? "Set target" : "Needs reading"}
              </span>
            </div>

            {heartRateInsight?.trend ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[15px] bg-[#f6fafb] px-3.5 py-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#82939f]">This week</p>
                  <p className="mt-1 text-[11px] font-bold text-[#0b2d54]">
                    {heartRateInsight.trend.fromLabel} {heartRateInsight.trend.fromValue}
                    <ArrowRight className="mx-1 inline h-3 w-3 text-[#8da0aa]" />
                    {heartRateInsight.trend.toLabel} {heartRateInsight.trend.toValue} bpm
                  </p>
                </div>
                <div className="text-right">
                  <p className={heartRateInsight.trend.delta > 0 ? "text-sm font-black text-[#0b2d54]" : "text-sm font-black text-[#0b7b80]"}>
                    {heartRateInsight.trend.delta > 0 ? "+" : ""}{heartRateInsight.trend.delta} bpm
                  </p>
                  <p className="text-[9px] text-[#82939f]">{heartRateInsight.trend.recordedDays} days logged</p>
                </div>
                <p className="mt-2 basis-full text-[9px] leading-4 text-[#82939f]">
                  {heartRateInsight.trend.bothWithinTarget === true ? "Both readings are within your ceiling." : heartRateInsight.trend.bothWithinTarget === false ? "At least one reading is above your ceiling." : "Trend reflects recorded resting readings only."}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-[10px] leading-5 text-[#82939f]">
                {heartRateStats.recordedDays === 1 ? "One day logged this week. Another reading will help build the trend." : heartRateStats.recordedDays === 0 ? "No readings logged this calendar week yet." : "Keep logging resting readings to build your weekly trend."}
              </p>
            )}

            {!heartRateHasTodayReading && heartRateStats.latestAt && (
              <p className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-[#71839a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b4c3ca]" />
                No reading today
                <span className="font-normal">· Add one to update today's status.</span>
              </p>
            )}

            <details className="group mt-3 border-t border-[#edf2f4] pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[10px] font-bold text-[#617583]">
                <span>Related health context</span>
                <span className="flex items-center gap-2 text-[9px] font-semibold text-[#82939f]">
                  {connectedGoalRelations.length ? connectedGoalRelations.length + " linked goals" : "Health record"}
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <div className="mt-3 space-y-2">
                {(heartRateInsight?.context ?? []).map((note, index) => (
                  <p key={index} className="text-[10px] leading-5 text-[#617583]">{note}</p>
                ))}
              </div>
            </details>
          </section>
          </>
        ) : (
          <>
          <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[16px] bg-[#f7fbfb] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#95a3ad]">Current</p><p className="mt-1 text-base font-black text-[#0b2d54]">{displayCurrent == null ? "—" : displayCurrent}{displayUnit && displayCurrent != null ? " " + displayUnit : ""}</p></div>
          <div className="rounded-[16px] bg-[#f7fbfb] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#95a3ad]">Target</p><p className="mt-1 text-base font-black text-[#0b2d54]">{target == null ? "—" : target}{displayUnit && target != null ? " " + displayUnit : ""}</p></div>
          <div className="rounded-[16px] bg-[#e9f9fa] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#0b7b80]">Progress</p><p className="mt-1 text-base font-black text-[#0b6f73]">{displayProgress == null ? "—" : displayProgress + "%"}</p></div>
        </div>

        {displayProgress != null && <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf3f5]"><div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: Math.max(0, displayProgress) + "%" }} /></div>}

        <div className="mt-3 rounded-xl bg-[#e9f9fa] px-3 py-2"><p className="text-[9px] font-bold leading-4 text-[#0b6f73]">{nextStep}</p></div>
          </>
        )}
        {category === "BLOOD_PRESSURE" ? (
          <div className="mt-3 rounded-[17px] border border-[#dcebec] bg-[#f7fbfc] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#82939f]">Goal connections</p>
              <span className="text-[8px] font-bold text-[#9aa8b1]">{linkedExerciseGoal ? "1 connected" : "Not set"}</span>
            </div>
            <div className="mt-2">
              <Link
                href={exerciseConnectionHref}
                className="inline-flex min-w-0 items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-[8px] font-bold text-[#0b6f73] ring-1 ring-[#dce8eb] transition hover:border-[#24c1c4]"
                title={linkedExerciseGoal
                  ? "Open the connected Exercise goal in Today."
                  : "Set an Exercise goal to support this blood-pressure goal."}
              >
                <span className="truncate">Exercise</span>
                <span className="shrink-0 text-[#91a2ad]">· {linkedExerciseGoal ? "Supports this" : "Add goal"}</span>
              </Link>
            </div>
          </div>
        ) : connectedGoalRelations.length > 0 ? (
          <div className="mt-3 rounded-[17px] border border-[#dcebec] bg-[#f7fbfc] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#82939f]">Goal connections</p>
              <span className="text-[8px] font-bold text-[#9aa8b1]">{connectedGoalRelations.length} connected</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {connectedGoalRelations.map((relation: any) => {
                const related = relation?.goal;
                const relatedCategory = String(related?.category ?? "").toUpperCase();
                const direction = String(relation?.direction ?? "");
                const relationLabel = String(relation?.relationshipType ?? "").toUpperCase() === "SUPPORTS"
                  ? direction === "supportsThisGoal" ? "Supports this" : "Supports another"
                  : "Related";
                return (
                  <Link
                    key={String(relation?.id ?? related?.id ?? relatedCategory)}
                    href="/today#today-goals"
                    className="inline-flex min-w-0 items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-[8px] font-bold text-[#0b6f73] ring-1 ring-[#dce8eb] transition hover:border-[#24c1c4]"
                    title={String(relation?.rationale ?? "")}
                  >
                    <span className="truncate">{goalCategoryLabel(relatedCategory || "OTHER")}</span>
                    <span className="shrink-0 text-[#91a2ad]">· {relationLabel}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {category === "OTHER" && (
          <section className="mt-3 rounded-[20px] border border-[#dce9ec] bg-[#f7fbfc] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#82939f]">Goal journey</p>
                <p className="mt-1 text-[12px] font-black text-[#0b2d54]">Day {journey.journeyDay}<span className="mx-1.5 text-[#a2b2ba]">·</span>{journey.isPastDue ? "Past target date" : journey.daysLeft === null ? "Ongoing" : journey.daysLeft === 0 ? "Due today" : journey.daysLeft + (journey.daysLeft === 1 ? " day left" : " days left")}</p>
                <p className="mt-1 text-[9px] text-[#82939f]">{journey.targetDate && !Number.isNaN(journey.targetDate.getTime()) ? "Target date " + formatJourneyDate(journey.targetDate) : "No target date set"}{current != null ? " · Latest value " + current + (displayUnit ? " " + displayUnit : "") : " · No measurement recorded yet"}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1.5 text-[8px] font-black text-[#0b7b80] ring-1 ring-[#dce8eb]">{personalComparisonLabel}</span>
            </div>
            {Array.isArray(goal?.progress) && goal.progress.length > 0 && (
              <details className="group mt-3 border-t border-[#e3edef] pt-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[10px] font-bold text-[#617583]">
                  <span>Measurement history</span>
                  <span className="flex items-center gap-2 text-[9px] font-semibold text-[#82939f]">{goal.progress.length} saved <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" /></span>
                </summary>
                <div className="mt-3 space-y-2">
                  {goal.progress.slice(0, 5).map((entry: any, index: number) => (
                    <div key={String(entry?.id ?? entry?.measuredAt ?? index)} className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-[#0b2d54]">{entry?.currentValue == null ? "—" : String(entry.currentValue) + (displayUnit ? " " + displayUnit : "")}</p>
                        <p className="mt-0.5 text-[9px] leading-4 text-[#82939f]">{formatInsightDateTime(entry?.measuredAt ?? entry?.createdAt) ?? "Date unavailable"}</p>
                        {String(entry?.notes ?? "").trim() && <p className="mt-1 text-[9px] leading-4 text-[#71839a]">{String(entry.notes).trim()}</p>}
                      </div>
                      <span className="shrink-0 text-[8px] font-bold text-[#82939f]">{entry?.progressPercent == null ? "Recorded" : Math.round(Number(entry.progressPercent)) + "%"}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>
        )}

        {personalGoalNeedsSetup ? null : category === "BLOOD_PRESSURE" ? (
          <div className="mt-4 space-y-3">
            <section className="rounded-[22px] border border-[#dfeaec] bg-[#f8fbfb] p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[.15em] text-[#0b7b80]">Record your reading</p>
                  <p className="mt-1 text-sm font-black text-[#0b2d54]">Keep Health Vitals up to date</p>
                  <p className="mt-1 text-[10px] leading-5 text-[#758896]">{meta.helper}</p>
                </div>
                <Link href={source.href} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0b2d54] px-3.5 py-2.5 text-[9px] font-black text-white transition hover:bg-[#0f5a62]">
                  {source.label} <ArrowRight className="h-3.5 w-3.5 text-[#24c1c4]" />
                </Link>
              </div>
            </section>

            <div className="flex items-center justify-between gap-3 border-t border-[#edf2f4] px-1 pt-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-[#6f818d]">Day {journey.journeyDay} · {journey.daysLeft === null ? "Journey active" : journey.daysLeft === 0 ? "Target date today" : journey.daysLeft + " days left"}</p>
                <p className="mt-1 text-[9px] text-[#9aa8b1]">Target date: {journey.targetDate && !Number.isNaN(journey.targetDate.getTime()) ? formatJourneyDate(journey.targetDate) : "No date set"} · Daily target ≤ {target ?? "—"} mmHg</p>
              </div>
            </div>
          </div>
        ) : category === "HEART_RATE" ? (
          <section className="mt-3 rounded-[20px] border border-[#dce9ec] bg-[#f7fbfc] p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[.15em] text-[#82939f]">Goal journey</p>
                <p className="mt-1 text-[12px] font-black text-[#0b2d54]">Day {journey.journeyDay}<span className="mx-1.5 text-[#a2b2ba]">·</span>{journey.daysLeft === null ? "Ongoing" : journey.daysLeft === 0 ? "Due today" : journey.daysLeft + (journey.daysLeft === 1 ? " day left" : " days left")}</p>
                <p className="mt-1 text-[9px] text-[#82939f]">{journey.targetDate && !Number.isNaN(journey.targetDate.getTime()) ? "Target date " + formatJourneyDate(journey.targetDate) : "No target date set"}</p>
              </div>
              <Link href={source.href} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[10px] font-black text-white transition hover:bg-[#0f5a62]">
                Record a reading <ArrowRight className="h-3.5 w-3.5 text-[#24c1c4]" />
              </Link>
            </div>
            <p className="mt-3 border-t border-[#e3edef] pt-3 text-[10px] leading-5 text-[#758896]">Sit quietly for a few minutes first. Only readings identified as resting count toward this goal.</p>
          </section>
        ) : (
          <div className="mt-3 rounded-[17px] bg-[#fbfdfd] p-3.5 ring-1 ring-[#e4edef]">
            <p className="text-[10px] leading-5 text-[#758896]">{meta.helper}</p>
            {category === "NUTRITION" && nutritionTargetReview(target) && <div className="mt-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2.5"><p className="text-[9px] font-black uppercase tracking-[.12em] text-amber-900">Target review</p><p className="mt-1 text-[10px] leading-5 text-amber-900/85">{nutritionTargetReview(target)}</p></div>}
            {meta.action === "MANUAL" ? (
              <>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input type="number" inputMode="decimal" step={meta.step} min={meta.min} max={meta.max} value={value} onChange={(event) => setValue(event.target.value)} placeholder={meta.placeholder} aria-label={"Record " + meta.label + " value"} className="min-h-10 w-full rounded-xl border border-[#d8e5e9] bg-white px-3 text-xs font-bold text-[#0b2d54] outline-none placeholder:text-[#a2afb8] focus:border-[#24c1c4]" />
                <button type="button" onClick={() => void recordValue()} disabled={saving || value.trim() === ""} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0b2d54] px-4 py-2 text-[9px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><Check className="h-3.5 w-3.5 text-[#24c1c4]" />{saving ? "Saving…" : "Record value"}</button>
              </div>
              {category === "OTHER" && <input type="text" maxLength={240} value={measurementNote} onChange={(event) => setMeasurementNote(event.target.value)} placeholder="Optional note about this measurement" aria-label="Personal goal measurement note" className="mt-2 min-h-10 w-full rounded-xl border border-[#d8e5e9] bg-white px-3 text-[11px] font-medium text-[#0b2d54] outline-none placeholder:text-[#a2afb8] focus:border-[#24c1c4]" />}
              </>
            ) : (
              <Link href={source.href} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#0b2d54] px-4 py-2 text-[9px] font-black text-white"><ArrowRight className="h-3.5 w-3.5 text-[#24c1c4]" />{source.label}</Link>
            )}
            {meta.action === "MANUAL" && (category === "BLOOD_GLUCOSE" || category === "CHOLESTEROL") && <Link href="/tests-results" className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#dce7eb] bg-white px-3 py-2 text-[9px] font-black text-[#0b2d54]">View recorded results <ArrowRight className="h-3.5 w-3.5" /></Link>}
          </div>
        )}
      </div>
      )}
      {!detailsExpanded && !personalGoalNeedsSetup && (
        <div className="px-4 pb-4 pt-4 sm:px-5">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[16px] bg-[#f7fbfb] p-3">
              <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#95a3ad]">{category === "HEART_RATE" ? "Latest reading" : category === "BLOOD_PRESSURE" ? "Latest systolic" : category === "MEDICATION" ? "Current adherence" : "Current"}</p>
              <p className="mt-1 break-words text-base font-black text-[#0b2d54]">{displayCurrent == null ? "—" : displayCurrent}{displayUnit && displayCurrent != null ? " " + displayUnit : ""}</p>
            </div>
            <div className="rounded-[16px] bg-[#f7fbfb] p-3">
              <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#95a3ad]">{category === "HEART_RATE" ? "Personal ceiling" : category === "BLOOD_PRESSURE" ? "Systolic ceiling" : category === "MEDICATION" ? "Adherence target" : "Target"}</p>
              <p className="mt-1 break-words text-base font-black text-[#0b2d54]">{target == null ? "—" : (category === "BLOOD_PRESSURE" || category === "HEART_RATE" ? "≤ " : "") + target}{displayUnit && target != null ? " " + displayUnit : ""}</p>
            </div>
            <div className="rounded-[16px] bg-[#e9f9fa] p-3">
              <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#0b7b80]">{category === "HEART_RATE" ? "Today's progress" : "Progress"}</p>
              <p className="mt-1 text-base font-black text-[#0b6f73]">{category === "HEART_RATE" && !heartRateHasTodayReading ? "No reading today" : displayProgress == null ? "—" : displayProgress + "%"}</p>
            </div>
          </div>
          {displayProgress != null && <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf3f5]"><div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: Math.max(0, displayProgress) + "%" }} /></div>}
          <p className="mt-3 rounded-xl bg-[#e9f9fa] px-3 py-2 text-[9px] font-semibold leading-4 text-[#0b6f73]">{compactInsight || meta.helper}</p>
          {category === "BLOOD_PRESSURE" && bpDisplayAt && <p className="mt-2 text-[9px] leading-4 text-[#74859a]">Latest reading recorded {formatInsightDateTime(bpDisplayAt) ?? "at an unknown time"}. Only systolic pressure is compared with this target.</p>}
          {category === "HEART_RATE" && <p className="mt-2 text-[9px] leading-4 text-[#74859a]">{heartRateDisplayAt ? (heartRateHasTodayReading ? "Recorded today at " : "Latest resting reading · ") + (heartRateHasTodayReading ? new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit" }).format(new Date(heartRateDisplayAt)) : formatInsightDateTime(heartRateDisplayAt)) : "Only resting readings are shown here. Record one after sitting quietly for a few minutes."} Only readings clearly identified as resting are compared with this saved target.</p>}
          {category === "HEART_RATE" && heartRateInsight?.trend && <p className="mt-2 text-[9px] leading-4 text-[#74859a]">Recent trend: {heartRateInsight.trend.fromValue} → {heartRateInsight.trend.toValue} bpm ({heartRateInsight.trend.delta > 0 ? "+" : ""}{heartRateInsight.trend.delta} bpm).</p>}
          {category === "BLOOD_PRESSURE" && <p className="mt-2 text-[9px] leading-4 text-[#74859a]">This goal compares systolic readings recorded in Health Vitals. Use your clinician-confirmed target.</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {meta.action === "MANUAL" ? (
              <div className="flex min-w-0 flex-1 gap-2">
                <input type="number" inputMode="decimal" step={meta.step} min={meta.min} max={meta.max} value={value} onChange={(event) => setValue(event.target.value)} placeholder={meta.placeholder} aria-label={"Record " + meta.label + " value"} className="min-h-9 min-w-0 flex-1 rounded-xl border border-[#d8e5e9] bg-white px-3 text-[10px] font-bold text-[#0b2d54] outline-none placeholder:text-[#a2afb8] focus:border-[#24c1c4]" />
                <button type="button" onClick={() => void recordValue()} disabled={saving || value.trim() === ""} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-xl bg-[#0b2d54] px-3 py-2 text-[9px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Saving…" : "Record"}</button>
              </div>
            ) : (
              <Link href={source.href} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[#0b2d54] px-3.5 py-2 text-[9px] font-black text-white">{source.label} <ArrowRight className="h-3 w-3 text-[#24c1c4]" /></Link>
            )}
            {onToggleDetails && <GoalCardDisclosureButton expanded={false} onToggle={onToggleDetails} label={category === "HEART_RATE" ? "Show insights" : "Show details"} />}
          </div>
          {category === "OTHER" && (
            <p className="mt-2 text-[8px] leading-4 text-[#82939f]">Measurement method: {customGoalMeasurementInstructions || "Use the measurement method saved with this goal."}</p>
          )}
        </div>
      )}
    </article>
  );
}
