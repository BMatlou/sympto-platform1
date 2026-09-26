"use client";

import Link from "next/link";
import { Activity, ArrowRight, Check, Droplets, HeartPulse, Moon, PencilLine, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { healthGoalsService } from "@/services/health-goals.service";
import { healthJournalService } from "@/services/health-journal.service";

type SupportedGoalCardProps = {
  goal: any;
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
  NUTRITION: { label: "Nutrition", unit: "calories/day", period: "Daily", comparison: "At most", action: "MANUAL", helper: "Record your total calories for today. Your nutrition goal is evaluated from the daily total.", icon: Activity, step: "50", min: "0", max: "10000", placeholder: "e.g. 2000" },
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
  if (category === "WEIGHT" || category === "BLOOD_PRESSURE" || category === "HEART_RATE") return { label: "Open Health Vitals", href: "/health-vitals" };
  return { label: "Open health goal", href: "/health-goals" };
}

function goalNextStep(category: string, current: number | null, target: number | null) {
  if (current == null || target == null) return "Record a measure to start meaningful progress tracking.";
  if (category === "NUTRITION" || category === "BLOOD_PRESSURE" || category === "BLOOD_GLUCOSE" || category === "CHOLESTEROL" || category === "MENTAL_HEALTH" || category === "HEART_RATE") {
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

export default function TodaySupportedGoalCard({ goal, onUpdated }: SupportedGoalCardProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const category = normaliseCategory(goal);
  const meta = metaFor(goal);
  const Icon = meta.icon;
  const current = currentValue(goal);
  const target = targetValue(goal);
  const progress = progressPercent(goal);
  const source = sourceAction(category);
  const nextStep = goalNextStep(category, current, target);
  const goalId = String(goal?.id ?? "");
  const defaultMetric = DEFAULT_METRICS[category] ?? DEFAULT_METRICS.OTHER;
  const metricType = String(goal?.metricConfig?.metricType ?? defaultMetric.metricType).toUpperCase();
  const metricKey = String(goal?.metricConfig?.metricKey ?? defaultMetric.metricKey);

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
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[16px] bg-[#f7fbfb] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#95a3ad]">Current</p><p className="mt-1 text-base font-black text-[#0b2d54]">{current == null ? "—" : current}{meta.unit && current != null ? " " + meta.unit : ""}</p></div>
          <div className="rounded-[16px] bg-[#f7fbfb] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#95a3ad]">Target</p><p className="mt-1 text-base font-black text-[#0b2d54]">{target == null ? "—" : target}{meta.unit && target != null ? " " + meta.unit : ""}</p></div>
          <div className="rounded-[16px] bg-[#e9f9fa] p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#0b7b80]">Progress</p><p className="mt-1 text-base font-black text-[#0b6f73]">{progress}%</p></div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf3f5]"><div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: Math.max(0, progress) + "%" }} /></div>

        {Array.isArray(goal?.connectedGoals) && goal.connectedGoals.length > 0 && (
          <div className="mt-3 rounded-[17px] border border-[#dcebec] bg-[#f7fbfc] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#82939f]">Goal connections</p>
              <span className="text-[8px] font-bold text-[#9aa8b1]">{goal.connectedGoals.length} connected</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {goal.connectedGoals.slice(0, 4).map((relation: any) => {
                const related = relation?.goal;
                const relatedId = String(related?.id ?? "");
                const direction = String(relation?.direction ?? "");
                const relationLabel =
                  String(relation?.relationshipType ?? "").toUpperCase() === "SUPPORTS"
                    ? direction === "supportsThisGoal"
                      ? "Supports this"
                      : "Supports another"
                    : "Related";
                return (
                  <Link
                    key={String(relation?.id ?? relatedId)}
                    href={relatedId ? "/health-goals#goal-" + encodeURIComponent(relatedId) : "/health-goals"}
                    className="inline-flex min-w-0 items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-[8px] font-bold text-[#0b6f73] ring-1 ring-[#dce8eb]"
                    title={String(relation?.rationale ?? "")}
                  >
                    <span className="truncate">{String(related?.title ?? related?.category ?? "Connected goal")}</span>
                    <span className="shrink-0 text-[#91a2ad]">· {relationLabel}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-3 rounded-[17px] bg-[#fbfdfd] p-3.5 ring-1 ring-[#e4edef]">
          <p className="text-[10px] leading-5 text-[#758896]">{meta.helper}</p>
          <div className="mt-2 rounded-xl bg-[#e9f9fa] px-3 py-2"><p className="text-[9px] font-bold leading-4 text-[#0b6f73]">{nextStep}</p></div>
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
      </div>
    </article>
  );
}
