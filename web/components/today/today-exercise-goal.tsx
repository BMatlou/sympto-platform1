"use client";

import Link from "next/link";
import { ArrowRight, Dumbbell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { TODAY_GOAL_BODY_CLASS, TODAY_GOAL_CARD_CLASS, TODAY_GOAL_FOOTER_CLASS, TODAY_GOAL_HEADER_CLASS } from "@/components/today/today-goal-card-styles";

type Props = { goal: any };
type ExerciseEvent = { loggedValue: number; occurredAt: string; sourceId?: string | null };

function startOfLocalWeek(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysFromMonday);
  return start;
}

function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function journeyFor(goal: any) {
  const startDate = new Date(String(goal?.createdAt ?? ""));
  const targetDate = new Date(String(goal?.targetDate ?? ""));
  const now = Date.now();
  return {
    targetDate,
    journeyDay: Number.isNaN(startDate.getTime()) ? 1 : Math.max(1, Math.floor((now - startDate.getTime()) / 86400000) + 1),
    daysLeft: Number.isNaN(targetDate.getTime()) ? null : Math.max(0, Math.ceil((targetDate.getTime() - now) / 86400000)),
  };
}

export default function TodayExerciseGoal({ goal }: Props) {
  const [events, setEvents] = useState<ExerciseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const targetMinutes = Number(goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue ?? 0) || 0;
  const journey = useMemo(() => journeyFor(goal), [goal]);
  const weekStart = useMemo(() => startOfLocalWeek(), []);

  async function loadWeekEvents() {
    try {
      const response = await healthGoalsService.getMetricEvents("EXERCISE", "exercise.minutes", weekStart, new Date(), "health-journal");
      setEvents((response.events ?? []).map((event) => ({ loggedValue: Number(event.loggedValue), occurredAt: String(event.occurredAt), sourceId: event.sourceId ?? null })));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWeekEvents();
    const handleUpdated = () => void loadWeekEvents();
    window.addEventListener("sympto:health-checkin-updated", handleUpdated);
    return () => window.removeEventListener("sympto:health-checkin-updated", handleUpdated);
  }, [goal?.id, weekStart.getTime()]);

  const weekTotal = events.reduce((total, event) => total + (Number.isFinite(event.loggedValue) ? event.loggedValue : 0), 0);
  const progressPercent = targetMinutes > 0 ? Math.min(100, Math.round((weekTotal / targetMinutes) * 100)) : 0;
  const todayKey = localDayKey();
  const todayMinutes = events.filter((event) => { const date = new Date(event.occurredAt); return !Number.isNaN(date.getTime()) && localDayKey(date) === todayKey; }).reduce((total, event) => total + (Number.isFinite(event.loggedValue) ? event.loggedValue : 0), 0);
  const targetReached = targetMinutes > 0 && weekTotal >= targetMinutes;

  return (
    <article className={`${TODAY_GOAL_CARD_CLASS} flex h-full min-w-0 flex-col`}>
      <div className={TODAY_GOAL_HEADER_CLASS}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e5f7f6] text-[#0b6f73]"><Dumbbell className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0b6f73]">Exercise</p><h3 className="truncate text-lg font-black tracking-[-.04em] text-[#0b2d54]">{String(goal?.title ?? "Exercise goal")}</h3></div>
          </div>
          <div className="shrink-0 text-right"><p className="text-sm font-black leading-none text-[#0b2d54]">{progressPercent}%</p><p className="mt-1 text-[9px] font-bold text-[#7d8f9e]">of goal</p></div>
        </div>
      </div>

      <div className={TODAY_GOAL_BODY_CLASS}>
        <div className="rounded-[18px] border border-[#e7eef1] bg-[#fbfdfd] p-4">
          <div className="flex items-end justify-between gap-4"><div><p className="text-3xl font-black leading-none tracking-[-.06em] text-[#0b2d54]">{loading ? "—" : `${weekTotal} minutes`}</p><p className="mt-1 text-sm font-bold text-[#74859a]">{todayMinutes > 0 ? `${todayMinutes} min logged today` : "No exercise logged today"}</p></div><div className="text-right"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#8a99a6]">Target</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{targetMinutes} mins/week</p></div></div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#edf2f5]"><div className="h-full rounded-full bg-gradient-to-r from-[#0b6f73] to-[#24c1c4] transition-[width] duration-500" style={{ width: `${progressPercent}%` }} /></div>
          <p className="mt-2 text-right text-[9px] font-semibold text-[#8795a0]">{targetReached ? "Weekly goal reached" : `${progressPercent}% of goal`}</p>
        </div>

        <div className="mt-4 rounded-[18px] border border-[#e7eef1] bg-[#f8fbfc] p-4"><p className="text-sm font-black text-[#0b2d54]">Log exercise in your Daily Health Check-in</p><p className="mt-1.5 text-[11px] leading-5 text-[#74859a]">Sympto uses the exercise minutes saved there to calculate this weekly goal automatically. This card is read-only.</p><Link href="#daily-health-check-in" className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-xl bg-[#0b2d54] px-3 py-2 text-[10px] font-black text-white">Go to health check-in <ArrowRight className="h-3 w-3" /></Link></div>
      </div>

      <div className={TODAY_GOAL_FOOTER_CLASS}><div className="mb-3 flex items-center justify-between gap-3 text-[10px] text-[#74859a]"><span>Day {journey.journeyDay} of your journey</span>{journey.daysLeft !== null && <span>{journey.daysLeft === 0 ? "Target date is today" : `${journey.daysLeft} days left`}</span>}</div><div className="flex items-center justify-between gap-3"><p className="text-[9px] leading-4 text-[#8a99a6]">Target date: {formatDate(journey.targetDate)}</p><Link href="/health-goals" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2 text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link></div></div>
    </article>
  );
}
