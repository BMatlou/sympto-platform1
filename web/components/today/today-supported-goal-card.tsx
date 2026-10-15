"use client";

import Link from "next/link";
import { Activity, ArrowRight, Check, Droplets, HeartPulse, Moon, PencilLine, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { healthGoalsService } from "@/services/health-goals.service";
import { healthJournalService } from "@/services/health-journal.service";

type SupportedGoalCardProps = {
  goal: any;
  activeGoals?: any[];
  onUpdated?: () => Promise<void> | void;
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
  HEART_RATE: { label: "Resting heart rate", unit: "bpm", period: "Daily", comparison: "At most", action: "VITALS", helper: "Record a resting reading in Health Vitals after sitting quietly for a few minutes. Wearable or clinical readings count only when the source identifies them as resting; exercise readings are not compared with this target.", icon: HeartPulse, step: "1", min: "20", max: "260", placeholder: "e.g. 72" },
  OTHER: { label: "Personal goal", unit: "", period: "Journey", comparison: "Stay close to target", action: "MANUAL", helper: "Record a measurable value for your personal goal. The comparison is based on how close the value is to your target.", icon: PencilLine, step: "0.1", min: "0", placeholder: "Enter today's value" },
};

function normaliseCategory(goal: any) {
  return String(goal?.category ?? goal?.metricConfig?.metricType ?? "OTHER").toUpperCase();
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
    OTHER: "Personal goal",
  };
  return labels[category] ?? category.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metaFor(goal: any) {
  return GOAL_META[normaliseCategory(goal)] ?? GOAL_META.OTHER;
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

function progressPercent(goal: any) {
  const progress = numberOrNull(goal?.latestProgress?.progressPercent ?? goal?.progress?.[0]?.progressPercent ?? goal?.progressPercent);
  if (progress != null) return Math.max(-100, Math.min(100, Math.round(progress)));
  const current = currentValue(goal);
  const target = targetValue(goal);
  if (current == null || target == null) return 0;
  const comparison = String(goal?.metricConfig?.comparison ?? "").toUpperCase();
  if (comparison === "AT_LEAST") return target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : 100;
  if (comparison === "AT_MOST") return target <= 0 ? current <= 0 ? 100 : 0 : current <= target ? 100 : Math.max(0, Math.min(100, Math.round((target / current) * 100)));
  return target <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((1 - Math.abs(current - target) / Math.max(Math.abs(target), 1)) * 100)));
}

function sourceAction(category: string) {
  if (category === "EXERCISE" || category === "SLEEP" || category === "MENTAL_HEALTH" || category === "HYDRATION") return { label: "Update Daily Health Check-in", href: "#daily-health-check-in" };
  if (category === "BLOOD_PRESSURE") return { label: "Open Today’s Vitals", href: "/today#current-health" };
  if (category === "WEIGHT" || category === "HEART_RATE") return { label: "Open Health Vitals", href: "/health-vitals" };
  return { label: "Open health goal", href: "/health-goals" };
}


function journeyFor(goal: any) {
  const startDate = new Date(String(goal?.createdAt ?? ""));
  const targetDate = new Date(String(goal?.targetDate ?? ""));
  const now = Date.now();
  return {
    journeyDay: Number.isNaN(startDate.getTime()) ? 1 : Math.max(1, Math.floor((now - startDate.getTime()) / 86400000) + 1),
    daysLeft: Number.isNaN(targetDate.getTime()) ? null : Math.max(0, Math.ceil((targetDate.getTime() - now) / 86400000)),
    targetDate,
  };
}

function formatJourneyDate(value: Date | null) {
  if (!value || Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

function nutritionTargetReview(target: number | null) {
  if (target == null || !Number.isFinite(target) || target <= 0 || target > 1200) return null;
  if (target < 800) {
    return "This calorie target is below 800 calories/day. Sympto is flagging it for clinical review rather than recommending it; very-low-energy diets should only be used with specialist supervision for appropriate clinical circumstances.";
  }
  return "This calorie target is within the 800–1,200 calories/day low-energy range. Current NICE guidance recommends this range only within a specialist-supported, multicomponent approach for eligible adults. Review the target with a dietitian or other qualified healthcare professional.";
}

function goalNextStep(category: string, current: number | null, target: number | null) {
  if (current == null || target == null) {
    if (category === "HEART_RATE") {
      return "No resting heart-rate reading has been recorded today. Sit quietly for a few minutes, then record your resting pulse in Health Vitals.";
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
    if (Math.abs(current - target) <= Math.max(0.5, Math.abs(target) * 0.05)) return "Your current value is close to the target.";
    return current < target ? "Continue moving toward the target." : "Your current value is above the target; keep tracking the direction.";
  }
  return "Keep tracking this goal.";
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

export default function TodaySupportedGoalCard({ goal, activeGoals = [], onUpdated }: SupportedGoalCardProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const category = normaliseCategory(goal);
  const meta = metaFor(goal);
  const Icon = meta.icon;
  const current = currentValue(goal);
  const target = targetValue(goal);
  const progress = progressPercent(goal);
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
  const metricType = String(goal?.metricConfig?.metricType ?? defaultMetric.metricType).toUpperCase();
  const metricKey = String(goal?.metricConfig?.metricKey ?? defaultMetric.metricKey);
  const [liveCurrent, setLiveCurrent] = useState<number | null>(null);
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
      setBpGoalStats({ recordedDays: 0, targetDays: 0 });

      return;
    }

    let active = true;
    const now = new Date();
    const createdAt = new Date(String(goal?.createdAt ?? ""));
    const from = Number.isNaN(createdAt.getTime()) ? new Date(0) : createdAt;

    healthGoalsService
      .getMetricEvents(metricType, metricKey, from, now)
      .then((result) => {
        if (!active) return;

        const events = (Array.isArray(result?.events) ? result.events : [])
          .filter((event: any) => Number.isFinite(Number(event?.loggedValue)))
          .map((event: any) => ({
            loggedValue: Number(event.loggedValue),
            occurredAt: String(event.occurredAt),
          }));

        const latest = [...events]
          .sort((a: any, b: any) => new Date(String(a?.occurredAt ?? 0)).getTime() - new Date(String(b?.occurredAt ?? 0)).getTime())
          .at(-1);

        setLiveCurrent(latest ? Number(latest.loggedValue) : null);

        const latestByDay = new Map<string, { value: number; occurredAt: number }>();
        for (const event of events) {
          const occurredAt = new Date(String(event?.occurredAt ?? ""));
          if (Number.isNaN(occurredAt.getTime())) continue;

          const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Africa/Johannesburg",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).formatToParts(occurredAt);
          const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
          const dayKey = String(values.year) + "-" + String(values.month) + "-" + String(values.day);
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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    // Health Vitals can be saved before a goal is created. Read the recent
    // history independently of the goal's creation date, including legacy
    // entries backfilled from the Health Journal.
    const from = thirtyDaysAgo;
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

  const heartRateHasTodayReading = heartRateStats.todayCurrent != null;
  const heartRateDisplayAt = heartRateHasTodayReading ? heartRateStats.todayAt : heartRateStats.latestAt;
  const displayCurrent = category === "HEART_RATE"
    ? heartRateStats.todayCurrent ?? heartRateStats.latestCurrent
    : category === "BLOOD_PRESSURE" && liveCurrent != null
      ? liveCurrent
      : current;
  const bpDistance = category === "BLOOD_PRESSURE" && displayCurrent != null && target != null
    ? displayCurrent - target
    : null;
  const bpWithinTarget = category === "BLOOD_PRESSURE" && displayCurrent != null && target != null
    ? displayCurrent <= target
    : null;
  const bpAttainmentPercent = category === "BLOOD_PRESSURE" && bpGoalStats.recordedDays > 0
    ? Math.round((bpGoalStats.targetDays / bpGoalStats.recordedDays) * 100)
    : 0;
  const heartRateTodayScore = category === "HEART_RATE" && displayCurrent != null && target != null
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
  const displayProgress = category === "BLOOD_PRESSURE"
    ? bpGoalStats.recordedDays > 0 ? bpAttainmentPercent : null
    : category === "HEART_RATE"
      ? heartRateTodayScore
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
    : goalNextStep(category, displayCurrent, target);

  async function recordValue() {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) { toast.error("Enter a valid measurement."); return; }
    if (meta.min != null && numeric < Number(meta.min)) { toast.error(meta.label + " is below the supported input range."); return; }
    if (meta.max != null && numeric > Number(meta.max)) { toast.error(meta.label + " is above the supported input range."); return; }
    if (!goalId) return;

    setSaving(true);
    try {
      const occurredAt = new Date().toISOString();
      await healthGoalsService.syncMetricEvent({
        metricType,
        metricKey,
        loggedValue: numeric,
        occurredAt,
        source: "goal-manual",
        sourceId: "goal-" + goalId + "-" + Date.now(),
      });

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
    <article id={"today-goal-" + encodeURIComponent(goalId)} className="w-full overflow-hidden rounded-[26px] border border-[#dce9ee] bg-white shadow-[0_12px_32px_rgba(11,45,84,.045)]">
      <header className="flex items-start justify-between gap-3 border-b border-[#edf2f5] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80]"><Icon className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[.16em] text-[#0b7b80]">{meta.label}</p>
            <h3 className="mt-1 truncate text-sm font-black tracking-[-.03em] text-[#0b2d54]">{String(goal?.title || meta.label)}</h3>
            <p className="mt-1 text-[9px] font-semibold text-[#8595a1]">{meta.comparison} · {meta.period} · {meta.unit || "Measured value"}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-[#eef8f8] px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[.1em] text-[#0b7b80]">{category === "HEART_RATE" ? (heartRateHasTodayReading ? "Reading saved" : heartRateStats.latestCurrent != null ? "Latest saved reading" : "No reading") : "Today"}</span>
      </header>

      <div className="px-4 pb-4 pt-4 sm:px-5">
        {category === "BLOOD_PRESSURE" ? (
          <>
            <section className="relative overflow-hidden rounded-[28px] bg-[#0b2d54] px-5 py-6 text-white shadow-[0_16px_34px_rgba(11,45,84,.16)] sm:px-6 sm:py-7">
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#24c1c4]/10 blur-3xl" aria-hidden="true" />
              <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-[#0f5a62]/35 blur-3xl" aria-hidden="true" />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.17em] text-[#24c1c4]">Blood pressure · Daily target</p>
                    <p className="mt-1 text-[10px] font-semibold text-white/55">
                      {bpGoalStats.recordedDays > 0
                        ? `${bpGoalStats.targetDays} of ${bpGoalStats.recordedDays} recorded days at target`
                        : "Start recording readings to build your trend"}
                    </p>
                  </div>
                  <span className={bpWithinTarget === false
                    ? "rounded-full bg-red-400/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-red-200 ring-1 ring-red-300/20"
                    : "rounded-full bg-[#24c1c4]/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-[#8ef0ef] ring-1 ring-[#24c1c4]/20"}>
                    {displayCurrent == null || target == null ? "No reading" : bpWithinTarget ? "Within target" : "Above target"}
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
                      ? (heartRateHasTodayReading ? "Recorded today at " : "Last recorded ") + new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: heartRateHasTodayReading ? undefined : "medium", hour: "2-digit", minute: "2-digit" }).format(new Date(heartRateDisplayAt))
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
              <p className="mt-3 text-[10px] leading-5 text-white/55">Heart rate changes with activity, stress, illness and medicines. Only readings clearly identified as resting are compared with this goal. The 80 bpm target is your saved goal, not a diagnosis or a universal threshold.</p>
            </div>
          </section>
        ) : (
          <>
          <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[16px] bg-[#f7fbfb] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#95a3ad]">Current</p><p className="mt-1 text-base font-black text-[#0b2d54]">{displayCurrent == null ? "—" : displayCurrent}{meta.unit && displayCurrent != null ? " " + meta.unit : ""}</p></div>
          <div className="rounded-[16px] bg-[#f7fbfb] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#95a3ad]">Target</p><p className="mt-1 text-base font-black text-[#0b2d54]">{target == null ? "—" : target}{meta.unit && target != null ? " " + meta.unit : ""}</p></div>
          <div className="rounded-[16px] bg-[#e9f9fa] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#0b7b80]">Progress</p><p className="mt-1 text-base font-black text-[#0b6f73]">{displayProgress == null ? "—" : displayProgress + "%"}</p></div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf3f5]"><div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: Math.max(0, displayProgress ?? 0) + "%" }} /></div>

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

        {category === "BLOOD_PRESSURE" ? (
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
          <section className="mt-4 rounded-[22px] border border-[#dce9ec] bg-[#f7fbfc] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.15em] text-[#0b7b80]">Record a resting reading</p>
                <p className="mt-1 text-sm font-black text-[#0b2d54]">Build a reliable trend</p>
                <p className="mt-1 text-[11px] leading-5 text-[#758896]">{meta.helper}</p>
              </div>
              <Link href={source.href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-3 text-[11px] font-black text-white transition hover:bg-[#0f5a62]">
                {source.label} <ArrowRight className="h-4 w-4 text-[#24c1c4]" />
              </Link>
            </div>
          </section>
        ) : (
          <div className="mt-3 rounded-[17px] bg-[#fbfdfd] p-3.5 ring-1 ring-[#e4edef]">
            <p className="text-[10px] leading-5 text-[#758896]">{meta.helper}</p>
            {category === "NUTRITION" && nutritionTargetReview(target) && <div className="mt-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2.5"><p className="text-[9px] font-black uppercase tracking-[.12em] text-amber-900">Target review</p><p className="mt-1 text-[10px] leading-5 text-amber-900/85">{nutritionTargetReview(target)}</p></div>}
            {meta.action === "MANUAL" ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input type="number" inputMode="decimal" step={meta.step} min={meta.min} max={meta.max} value={value} onChange={(event) => setValue(event.target.value)} placeholder={meta.placeholder} aria-label={"Record " + meta.label + " value"} className="min-h-10 w-full rounded-xl border border-[#d8e5e9] bg-white px-3 text-xs font-bold text-[#0b2d54] outline-none placeholder:text-[#a2afb8] focus:border-[#24c1c4]" />
                <button type="button" onClick={() => void recordValue()} disabled={saving || value.trim() === ""} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0b2d54] px-4 py-2 text-[9px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><Check className="h-3.5 w-3.5 text-[#24c1c4]" />{saving ? "Saving…" : "Record value"}</button>
              </div>
            ) : (
              <Link href={source.href} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#0b2d54] px-4 py-2 text-[9px] font-black text-white"><ArrowRight className="h-3.5 w-3.5 text-[#24c1c4]" />{source.label}</Link>
            )}
            {meta.action === "MANUAL" && (category === "BLOOD_GLUCOSE" || category === "CHOLESTEROL") && <Link href="/tests-results" className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#dce7eb] bg-white px-3 py-2 text-[9px] font-black text-[#0b2d54]">View recorded results <ArrowRight className="h-3.5 w-3.5" /></Link>}
          </div>
        )}
      </div>
    </article>
  );
}
