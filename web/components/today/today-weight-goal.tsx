"use client";

import Link from "next/link";
import { ArrowRight, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { TODAY_GOAL_CARD_CLASS, TODAY_GOAL_FOOTER_CLASS, TODAY_GOAL_HEADER_CLASS } from "@/components/today/today-goal-card-styles";

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatKg(value: number | null) {
  return value == null ? "—" : Number(value).toFixed(1);
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function journeyFor(goal: any) {
  const startDate = new Date(String(goal?.createdAt ?? ""));
  const targetDate = new Date(String(goal?.targetDate ?? ""));
  const now = Date.now();
  const journeyDay = Number.isNaN(startDate.getTime()) ? 1 : Math.max(1, Math.floor((now - startDate.getTime()) / 86400000) + 1);
  const daysLeft = Number.isNaN(targetDate.getTime()) ? null : Math.max(0, Math.ceil((targetDate.getTime() - now) / 86400000));
  const totalDays = !Number.isNaN(startDate.getTime()) && !Number.isNaN(targetDate.getTime()) ? Math.max(1, Math.ceil((targetDate.getTime() - startDate.getTime()) / 86400000)) : null;
  return { startDate, targetDate, journeyDay, daysLeft, totalDays };
}

function calculateProgress(start: number | null, current: number | null, target: number | null, comparison: string) {
  if (start == null || current == null || target == null) return 0;
  if (comparison === "INCREASE_TO") {
    const denominator = target - start;
    return denominator <= 0 ? (current >= target ? 100 : 0) : Math.min(100, Math.max(0, ((current - start) / denominator) * 100));
  }
  const denominator = start - target;
  return denominator <= 0 ? (current <= target ? 100 : 0) : Math.min(100, Math.max(0, ((start - current) / denominator) * 100));
}

type Props = { goal: any; fallbackWeight?: number | string | null };
type WeightEvent = { loggedValue: number; occurredAt: string };

export default function TodayWeightGoal({ goal, fallbackWeight }: Props) {
  const [events, setEvents] = useState<WeightEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const createdAt = new Date(String(goal?.createdAt ?? ""));
      const from = Number.isNaN(createdAt.getTime()) ? new Date(0) : createdAt;
      setLoading(true);
      try {
        const response = await healthGoalsService.getMetricEvents("WEIGHT", "weight.kg", from, new Date());
        if (!active) return;
        const next = (response.events ?? [])
          .map((event) => ({ loggedValue: Number(event.loggedValue), occurredAt: String(event.occurredAt) }))
          .filter((event) => Number.isFinite(event.loggedValue) && !Number.isNaN(new Date(event.occurredAt).getTime()))
          .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
        setEvents(next);
      } catch {
        if (active) setEvents([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const onWeightUpdated = () => { void load(); };
    window.addEventListener("sympto:weight-updated", onWeightUpdated);
    return () => { active = false; window.removeEventListener("sympto:weight-updated", onWeightUpdated); };
  }, [goal?.id, goal?.createdAt]);

  const journey = useMemo(() => journeyFor(goal), [goal]);
  const comparison = String(goal?.metricConfig?.comparison ?? goal?.comparison ?? "DECREASE_TO").toUpperCase();
  const targetWeight = numberValue(goal?.metricConfig?.frequencyTarget ?? goal?.targetValue);
  const fallback = numberValue(fallbackWeight);
  const currentEvent = events[events.length - 1] ?? null;
  const startEvent = events[0] ?? null;
  const currentWeight = currentEvent?.loggedValue ?? fallback;
  const startingWeight = startEvent?.loggedValue ?? currentWeight;
  const progress = Math.round(calculateProgress(startingWeight, currentWeight, targetWeight, comparison));
  const targetReached = targetWeight != null && currentWeight != null && (comparison === "INCREASE_TO" ? currentWeight >= targetWeight : currentWeight <= targetWeight);
  const changeKg = startingWeight != null && currentWeight != null ? currentWeight - startingWeight : null;
  const lostKg = comparison === "INCREASE_TO" || startingWeight == null || currentWeight == null ? null : Math.max(startingWeight - currentWeight, 0);
  const remainingKg = targetWeight != null && currentWeight != null ? comparison === "INCREASE_TO" ? Math.max(targetWeight - currentWeight, 0) : Math.max(currentWeight - targetWeight, 0) : null;
  const weekAgo = Date.now() - 7 * 86400000;
  const olderThanWeek = [...events].reverse().find((event) => new Date(event.occurredAt).getTime() <= weekAgo);
  const weeklyChangeKg = olderThanWeek && currentWeight != null ? currentWeight - olderThanWeek.loggedValue : null;
  const expectedProgress = journey.totalDays != null && journey.totalDays > 0 ? Math.min(100, Math.max(0, ((journey.journeyDay - 1) / journey.totalDays) * 100)) : null;
  const onTrack = targetReached || expectedProgress == null || progress >= expectedProgress - 10;
  const weeksLeft = journey.daysLeft != null ? journey.daysLeft / 7 : null;
  const requiredWeeklyChange = remainingKg != null && weeksLeft && weeksLeft > 0 ? remainingKg / weeksLeft : null;
  const ChangeIcon = comparison === "INCREASE_TO" ? TrendingUp : TrendingDown;

  return (
    <article className={`${TODAY_GOAL_CARD_CLASS} flex h-full min-w-0 flex-col`}>
      <div className={TODAY_GOAL_HEADER_CLASS}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e5f7f6] text-[#0b6f73]"><Scale className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0b6f73]">Weight goal</p>
              <h3 className="truncate text-lg font-black tracking-[-.04em] text-[#0b2d54]">{String(goal?.title ?? "Reach your target weight")}</h3>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${targetReached ? "bg-emerald-50 text-emerald-700" : onTrack ? "bg-[#e5f7f6] text-[#0b6f73]" : "bg-amber-50 text-amber-800"}`}>
            {targetReached ? "Target reached" : onTrack ? "On track" : "Needs attention"}
          </span>
        </div>
      </div>

      <div className="flex-1 p-5 sm:p-6">
        {loading ? (
          <div className="h-[170px] animate-pulse rounded-[18px] bg-[#f7fafb]" />
        ) : currentWeight == null || targetWeight == null ? (
          <div className="rounded-[18px] border border-[#e7eef1] bg-[#f8fbfc] p-4">
            <p className="text-lg font-black tracking-[-.03em] text-[#0b2d54]">Weight progress will update automatically</p>
            <p className="mt-1.5 text-[11px] leading-5 text-[#74859a]">Record your weight in Vitals &amp; Measurements. Sympto will use that measurement here — there is no separate progress value to enter.</p>
          </div>
        ) : (
          <div className="rounded-[18px] border border-[#e7eef1] bg-[#fbfdfd] p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-black leading-none tracking-[-.06em] text-[#0b2d54]">{formatKg(currentWeight)} <span className="text-base font-bold text-[#74859a]">kg</span></p>
                <p className="mt-1 text-sm font-bold text-[#74859a]">latest recorded weight</p>
              </div>
              <div className="text-right"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#8a99a6]">Target</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{formatKg(targetWeight)} kg</p></div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#edf2f5]"><div className="h-full rounded-full bg-gradient-to-r from-[#0b6f73] to-[#24c1c4] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[9px]"><span className="font-black text-[#0b2d54]">{progress}% progress</span><span className="font-semibold text-[#8795a0]">{targetReached ? "Goal reached" : `${formatKg(lostKg)} kg lost from ${formatKg(startingWeight)} kg`}</span></div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-[#f7fafb] p-3"><p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#8a99a6]">Starting</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{formatKg(startingWeight)} kg</p></div>
              <div className="rounded-xl bg-[#f7fafb] p-3"><p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#8a99a6]">Change</p><p className="mt-1 inline-flex items-center gap-1 text-sm font-black text-[#0b2d54]"><ChangeIcon className="h-3.5 w-3.5 text-[#0b6f73]" />{changeKg == null ? "—" : `${changeKg > 0 ? "+" : ""}${formatKg(changeKg)} kg`}</p></div>
              <div className="rounded-xl bg-[#f7fafb] p-3"><p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#8a99a6]">Last recorded</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{formatDate(currentEvent?.occurredAt)}</p></div>
              <div className="rounded-xl bg-[#f7fafb] p-3"><p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#8a99a6]">7-day change</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{weeklyChangeKg == null ? "Not enough history" : `${weeklyChangeKg > 0 ? "+" : ""}${formatKg(weeklyChangeKg)} kg`}</p></div>
            </div>
            {requiredWeeklyChange != null && !targetReached && <p className="mt-4 text-[10px] font-semibold text-[#74859a]">About {formatKg(requiredWeeklyChange)} kg/week needed to reach your target by {formatDate(journey.targetDate)}.</p>}
          </div>
        )}
      </div>

      <div className={`${TODAY_GOAL_FOOTER_CLASS} px-4`}>
        <div className="mb-3 flex items-center justify-between gap-3 text-[10px] text-[#74859a]"><span>Day {journey.journeyDay} of your journey</span>{journey.daysLeft !== null && <span>{journey.daysLeft === 0 ? "Target date is today" : `${journey.daysLeft} days left`}</span>}</div>
        <div className="flex items-center justify-between gap-3"><p className="text-[9px] leading-4 text-[#8a99a6]">Progress is calculated from your recorded weight measurements.</p><Link href="/health-goals" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2 text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link></div>
      </div>
    </article>
  );
}
