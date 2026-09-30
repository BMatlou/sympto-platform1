"use client";

import Link from "next/link";
import { ArrowRight, Check, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { healthGoalsService } from "@/services/health-goals.service";

type Props = {
  goal: any;
  onUpdated?: () => Promise<void> | void;
};

type NutritionEvent = {
  id: string;
  loggedValue: number;
  occurredAt: string;
  source: string;
  sourceId?: string | null;
};

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function targetFor(goal: any) {
  return numberOrNull(goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue);
}

function formatCalories(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function nutritionTargetReview(target: number | null) {
  if (target == null || !Number.isFinite(target) || target <= 0 || target > 1200) return null;
  if (target < 800) {
    return {
      tone: "strong",
      title: "Target review",
      text: "This target is below 800 calories/day. Sympto is flagging it for clinical review rather than recommending it. Current NICE guidance limits very-low-energy diets to specialist-supported clinical circumstances.",
    };
  }
  return {
    tone: "review",
    title: "Target review",
    text: "This target is within the 800–1,200 calories/day low-energy range. Current NICE guidance recommends this range only within a specialist-supported, multicomponent approach for eligible adults.",
  };
}

export default function TodayNutritionGoal({ goal, onUpdated }: Props) {
  const [events, setEvents] = useState<NutritionEvent[]>([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const goalId = String(goal?.id ?? "");
  const target = targetFor(goal);

  const todayTotal = useMemo(
    () => events.reduce((sum, event) => sum + Number(event.loggedValue || 0), 0),
    [events],
  );

  const remaining = target == null ? null : target - todayTotal;
  const overTarget = target != null && todayTotal > target;
  const targetReached = target != null && todayTotal >= target;
  const usagePercent =
    target != null && target > 0
      ? Math.min(100, Math.round((todayTotal / target) * 100))
      : 0;

  async function loadToday() {
    if (!goalId) return;

    try {
      const { start, end } = todayBounds();
      const response = await healthGoalsService.getMetricEvents(
        "NUTRITION",
        "nutrition.calories",
        start,
        end,
        "goal-manual",
      );

      const nextEvents = (response?.events ?? [])
        .map((event) => ({
          id: String(event.id),
          loggedValue: Number(event.loggedValue),
          occurredAt: String(event.occurredAt),
          source: String(event.source ?? ""),
          sourceId: event.sourceId ?? null,
        }))
        .filter((event) => Number.isFinite(event.loggedValue) && event.loggedValue >= 0);

      setEvents(nextEvents);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadToday();

    const handleUpdated = () => void loadToday();
    window.addEventListener("sympto:health-goal-updated", handleUpdated);
    window.addEventListener("sympto:today-action-updated", handleUpdated);

    return () => {
      window.removeEventListener("sympto:health-goal-updated", handleUpdated);
      window.removeEventListener("sympto:today-action-updated", handleUpdated);
    };
  }, [goalId]);

  async function addCalories() {
    const calories = Number(value);

    if (!Number.isFinite(calories) || calories <= 0) {
      toast.error("Enter the calories to add.");
      return;
    }

    if (!goalId) return;

    setSaving(true);
    try {
      await healthGoalsService.syncMetricEvent({
        metricType: "NUTRITION",
        metricKey: "nutrition.calories",
        loggedValue: calories,
        occurredAt: new Date().toISOString(),
        source: "goal-manual",
        sourceId: "goal-" + goalId + "-nutrition-" + Date.now(),
      });

      setValue("");
      toast.success("Calories added to today's nutrition total.");
      await loadToday();
      await onUpdated?.();
    } catch (error: any) {
      const message = error?.response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(" ")
          : String(message || "We could not add this nutrition entry."),
      );
    } finally {
      setSaving(false);
    }
  }

  const review = nutritionTargetReview(target);

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[26px] border border-[#dce9ee] bg-white shadow-[0_12px_32px_rgba(11,45,84,.045)]">
      <header className="flex items-start justify-between gap-3 border-b border-[#edf2f5] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80]">
            <Utensils className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[.16em] text-[#0b7b80]">Nutrition</p>
            <h3 className="mt-1 truncate text-sm font-black tracking-[-.03em] text-[#0b2d54]">Daily nutrition</h3>
            <p className="mt-1 text-[9px] font-semibold text-[#8595a1]">At most · Daily · calories/day</p>
          </div>
        </div>
        <Link
          href={"/health-goals#goal-" + encodeURIComponent(goalId)}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-[#dce7eb] bg-white px-2.5 text-[9px] font-black text-[#0b2d54]"
        >
          Goal <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-4 sm:px-5">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[16px] bg-[#f7fbfb] p-3">
            <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#95a3ad]">Today</p>
            <p className="mt-1 text-base font-black text-[#0b2d54]">
              {loading ? "—" : todayTotal > 0 ? formatCalories(todayTotal) : "Not logged"}
            </p>
            <p className="mt-0.5 text-[8px] font-bold text-[#8c9ba5]">{todayTotal > 0 ? "calories" : "no entries yet"}</p>
          </div>

          <div className="rounded-[16px] bg-[#f7fbfb] p-3">
            <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#95a3ad]">Target</p>
            <p className="mt-1 text-base font-black text-[#0b2d54]">
              {target == null ? "—" : formatCalories(target)}
            </p>
            <p className="mt-0.5 text-[8px] font-bold text-[#8c9ba5]">calories/day</p>
          </div>

          <div className={"rounded-[16px] p-3 " + (overTarget ? "bg-red-50" : "bg-[#e9f9fa]")}>
            <p className={"text-[8px] font-black uppercase tracking-[.12em] " + (overTarget ? "text-red-700" : "text-[#0b7b80]")}>
              {overTarget ? "Over" : "Remaining"}
            </p>
            <p className={"mt-1 text-base font-black " + (overTarget ? "text-red-800" : "text-[#0b6f73]")}>
              {remaining == null ? "—" : formatCalories(Math.abs(remaining))}
            </p>
            <p className={"mt-0.5 text-[8px] font-bold " + (overTarget ? "text-red-700/70" : "text-[#6d8d90]")}>
              {overTarget ? "above target" : "calories"}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="text-[9px] font-black uppercase tracking-[.13em] text-[#82939f]">Daily target use</span>
            <span className={"text-[9px] font-black " + (overTarget ? "text-red-700" : "text-[#0b6f73]")}>
              {target == null ? "No target" : overTarget ? "Over target" : targetReached ? "At target" : usagePercent + "% used"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#edf3f5]">
            <div
              className={"h-full rounded-full transition-all " + (overTarget ? "bg-red-500" : "bg-[#24c1c4]")}
              style={{ width: Math.max(0, usagePercent) + "%" }}
            />
          </div>
        </div>

        <div className="mt-3 rounded-[17px] bg-[#fbfdfd] p-3.5 ring-1 ring-[#e4edef]">
          <p className="text-[10px] leading-5 text-[#758896]">
            Log calories as you eat. Each meal or snack entry is added to today's total, so you can see where you are against the daily target.
          </p>

          {overTarget ? (
            <div className="mt-2 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-[.12em] text-red-800">Above target</p>
              <p className="mt-1 text-[10px] leading-5 text-red-900/85">
                Today's logged intake is {formatCalories(todayTotal)} calories against a {formatCalories(target ?? 0)} calorie target.
              </p>
            </div>
          ) : targetReached ? (
            <div className="mt-2 rounded-[14px] border border-[#cfe8e8] bg-[#eefafa] px-3 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-[.12em] text-[#0b6f73]">Target reached</p>
              <p className="mt-1 text-[10px] leading-5 text-[#0b6f73]/85">
                You have reached today's calorie target. Continue logging intake so the daily total remains accurate.
              </p>
            </div>
          ) : (
            <div className="mt-2 rounded-[14px] border border-[#dcebec] bg-[#f7fbfc] px-3 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-[.12em] text-[#0b6f73]">Next step</p>
              <p className="mt-1 text-[10px] leading-5 text-[#0b6f73]/85">
                {todayTotal > 0
                  ? "Keep logging meals and snacks as you go."
                  : "Start with your next meal or snack and add its calories here."}
              </p>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="1"
              step="1"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Calories for meal or snack"
              aria-label="Calories for meal or snack"
              className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#d8e5e9] bg-white px-3 text-xs font-bold text-[#0b2d54] outline-none placeholder:text-[#a2afb8] focus:border-[#24c1c4]"
            />
            <button
              type="button"
              onClick={() => void addCalories()}
              disabled={saving || value.trim() === ""}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0b2d54] px-4 py-2 text-[9px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5 text-[#24c1c4]" />
              {saving ? "Adding…" : "Add calories"}
            </button>
          </div>

          {review && (
            <div className={"mt-3 rounded-[14px] border px-3 py-2.5 " + (review.tone === "strong" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50")}>
              <p className={"text-[9px] font-black uppercase tracking-[.12em] " + (review.tone === "strong" ? "text-red-800" : "text-amber-900")}>
                {review.title}
              </p>
              <p className={"mt-1 text-[10px] leading-5 " + (review.tone === "strong" ? "text-red-900/85" : "text-amber-900/85")}>
                {review.text}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
