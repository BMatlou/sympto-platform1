"use client";

import Link from "next/link";
import { Activity, ArrowRight, Check, Droplets, HeartPulse, Moon, PencilLine, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { healthGoalsService } from "@/services/health-goals.service";
import { healthJournalService } from "@/services/health-journal.service";
import BloodPressureInsights from "@/components/today/blood-pressure-insights";

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
  HEART_RATE: { label: "Heart rate", unit: "bpm", period: "Daily", comparison: "At most", action: "VITALS", helper: "Use Health Vitals to save a resting heart-rate reading, or let supported wearable/clinical readings provide it.", icon: HeartPulse, step: "1", min: "20", max: "260", placeholder: "e.g. 72" },
  OTHER: { label: "Personal goal", unit: "", period: "Journey", comparison: "Stay close to target", action: "MANUAL", helper: "Record a measurable value for your personal goal. The comparison is based on how close the value is to your target.", icon: PencilLine, step: "0.1", min: "0", placeholder: "Enter today's value" },
};

function normaliseCategory(goal: any) {
  return String(goal?.category ?? goal?.metricConfig?.metricType ?? "OTHER").toUpperCase();
}

function metaFor(goal: any) {
  return GOAL_META[normaliseCategory(goal)] ?? GOAL_META.OTHER;
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
  if (category === "BLOOD_PRESSURE" || category === "BLOOD_GLUCOSE" || category === "CHOLESTEROL" || category === "MENTAL_HEALTH" || category === "HEART_RATE") {
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
  const linkedExerciseGoal = activeGoals.find((item: any) => String(item?.category ?? "").toUpperCase() === "EXERCISE");
  const exerciseConnectionHref = linkedExerciseGoal?.id ? "/today#today-goal-" + encodeURIComponent(String(linkedExerciseGoal.id)) : "/health-goals?open=exercise";
  const defaultMetric = DEFAULT_METRICS[category] ?? DEFAULT_METRICS.OTHER;
  const metricType = String(goal?.metricConfig?.metricType ?? defaultMetric.metricType).toUpperCase();
  const metricKey = String(goal?.metricConfig?.metricKey ?? defaultMetric.metricKey);
  const [liveCurrent, setLiveCurrent] = useState<number | null>(null);
  const [bpGoalStats, setBpGoalStats] = useState({ recordedDays: 0, targetDays: 0 });

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
          .filter((event: any) => Number.isFinite(Number(event?.loggedValue)));

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

  const displayCurrent = category === "BLOOD_PRESSURE" && liveCurrent != null ? liveCurrent : current;
  const bpDistance = category === "BLOOD_PRESSURE" && displayCurrent != null && target != null
    ? displayCurrent - target
    : null;
  const bpWithinTarget = category === "BLOOD_PRESSURE" && displayCurrent != null && target != null
    ? displayCurrent <= target
    : null;
  const bpAttainmentPercent = category === "BLOOD_PRESSURE" && bpGoalStats.recordedDays > 0
    ? Math.round((bpGoalStats.targetDays / bpGoalStats.recordedDays) * 100)
    : 0;
  const displayProgress = category === "BLOOD_PRESSURE"
    ? bpAttainmentPercent
    : displayCurrent == null
      ? progress
      : progressPercent({
          ...goal,
          currentValue: displayCurrent,
          progress: [],
          latestProgress: null,
          progressPercent: null,
        });

  const nextStep = goalNextStep(category, displayCurrent, target);

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
    <article className="w-full overflow-hidden rounded-[26px] border border-[#dce9ee] bg-white shadow-[0_12px_32px_rgba(11,45,84,.045)]">
      <header className="flex items-start justify-between gap-3 border-b border-[#edf2f5] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80]"><Icon className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[.16em] text-[#0b7b80]">{meta.label}</p>
            <h3 className="mt-1 truncate text-sm font-black tracking-[-.03em] text-[#0b2d54]">{String(goal?.title || meta.label)}</h3>
            <p className="mt-1 text-[9px] font-semibold text-[#8595a1]">{meta.comparison} · {meta.period} · {meta.unit || "Measured value"}</p>
          </div>
        </div>
        <Link href={"/health-goals#goal-" + encodeURIComponent(goalId)} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-[#dce7eb] bg-white px-2.5 text-[9px] font-black text-[#0b2d54]">Goal <ArrowRight className="h-3 w-3" /></Link>
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
                    : "rounded-full bg-[#24c1c4]/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-[#8ef0ef] ring-1 ring-[#24c1c4]/20]"}>
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
                      : "rounded-[18px] bg-[#24c1c4]/10 p-3.5 ring-1 ring-[#24c1c4]/20]"}>
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
                    : "mt-5 rounded-[20px] bg-[#24c1c4]/10 p-4 ring-1 ring-[#24c1c4]/20]"}>
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
                    <div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: Math.max(0, displayProgress) + "%" }} />
                  </div>
                </div>
              </div>
            </section>
          </>
        )
        ) : (
          <>
          <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[16px] bg-[#f7fbfb] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#95a3ad]">Current</p><p className="mt-1 text-base font-black text-[#0b2d54]">{displayCurrent == null ? "—" : displayCurrent}{meta.unit && displayCurrent != null ? " " + meta.unit : ""}</p></div>
          <div className="rounded-[16px] bg-[#f7fbfb] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#95a3ad]">Target</p><p className="mt-1 text-base font-black text-[#0b2d54]">{target == null ? "—" : target}{meta.unit && target != null ? " " + meta.unit : ""}</p></div>
          <div className="rounded-[16px] bg-[#e9f9fa] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#0b7b80]">Progress</p><p className="mt-1 text-base font-black text-[#0b6f73]">{displayProgress}%</p></div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf3f5]"><div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: Math.max(0, displayProgress) + "%" }} /></div>

        <div className="mt-3 rounded-xl bg-[#e9f9fa] px-3 py-2"><p className="text-[9px] font-bold leading-4 text-[#0b6f73]">{nextStep}</p></div>
          </>
        )}
        {Array.isArray(goal?.connectedGoals) && goal.connectedGoals.length > 0 && (
          <div className="mt-3 rounded-[17px] border border-[#dcebec] bg-[#f7fbfc] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#82939f]">Goal connections</p>
              <span className="text-[8px] font-bold text-[#9aa8b1]">{goal.connectedGoals.length} connected</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {goal.connectedGoals.slice(0, 4).map((relation: any) => {
                const related = relation?.goal;
                const relatedCategory = String(related?.category ?? "").toUpperCase();
                const isExerciseConnection = category === "BLOOD_PRESSURE" || relatedCategory === "EXERCISE";
                const direction = String(relation?.direction ?? "");
                const relationLabel = String(relation?.relationshipType ?? "").toUpperCase() === "SUPPORTS"
                  ? direction === "supportsThisGoal" ? "Supports this" : "Supports another"
                  : "Related";
                const href = isExerciseConnection
                  ? exerciseConnectionHref
                  : related?.id ? "/health-goals#goal-" + encodeURIComponent(String(related.id)) : "/health-goals";
                return (
                  <Link
                    key={String(relation?.id ?? related?.id ?? relatedCategory)}
                    href={href}
                    className="inline-flex min-w-0 items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-[8px] font-bold text-[#0b6f73] ring-1 ring-[#dce8eb]"
                    title={String(relation?.rationale ?? (isExerciseConnection ? (linkedExerciseGoal ? "Open your exercise goal in Today." : "Set an exercise goal to connect it with your blood-pressure goal.") : ""))}
                  >
                    <span className="truncate">{isExerciseConnection ? "Exercise" : String(related?.title ?? related?.category ?? "Connected goal")}</span>
                    <span className="shrink-0 text-[#91a2ad]">· {relationLabel}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

{Array.isArray(goal?.connectedGoals) && goal.connectedGoals.length > 0 && (
          <div className="mt-3 rounded-[17px] border border-[#dcebec] bg-[#f7fbfc] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#82939f]">Goal connections</p>
              <span className="text-[8px] font-bold text-[#9aa8b1]">{goal.connectedGoals.length} connected</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {goal.connectedGoals.slice(0, 4).map((relation: any) => {
                const related = relation?.goal;
                const relatedCategory = String(related?.category ?? "").toUpperCase();
                const isExerciseConnection = category === "BLOOD_PRESSURE" || relatedCategory === "EXERCISE";
                const direction = String(relation?.direction ?? "");
                const relationLabel = String(relation?.relationshipType ?? "").toUpperCase() === "SUPPORTS"
                  ? direction === "supportsThisGoal" ? "Supports this" : "Supports another"
                  : "Related";
                const href = isExerciseConnection
                  ? exerciseConnectionHref
                  : related?.id ? "/health-goals#goal-" + encodeURIComponent(String(related.id)) : "/health-goals";
                return (
                  <Link
                    key={String(relation?.id ?? related?.id ?? relatedCategory)}
                    href={href}
                    className="inline-flex min-w-0 items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-[8px] font-bold text-[#0b6f73] ring-1 ring-[#dce8eb] transition hover:border-[#24c1c4]"
                    title={String(relation?.rationale ?? (isExerciseConnection ? (linkedExerciseGoal ? "Open your exercise goal in Today." : "Set an exercise goal to connect it with your blood-pressure goal.") : ""))}
                  >
                    <span className="truncate">{isExerciseConnection ? "Exercise" : String(related?.title ?? related?.category ?? "Connected goal")}</span>
                    <span className="shrink-0 text-[#91a2ad]">· {relationLabel}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

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

            <BloodPressureInsights target={target} />

            <div className="flex items-center justify-between gap-3 border-t border-[#edf2f4] px-1 pt-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-[#6f818d]">Day {journey.journeyDay} · {journey.daysLeft === null ? "Journey active" : journey.daysLeft === 0 ? "Target date today" : journey.daysLeft + " days left"}</p>
                <p className="mt-1 text-[9px] text-[#9aa8b1]">Target date: {journey.targetDate && !Number.isNaN(journey.targetDate.getTime()) ? formatJourneyDate(journey.targetDate) : "No date set"} · Daily target ≤ {target ?? "—"} mmHg</p>
              </div>
            </div>
          </div>
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
