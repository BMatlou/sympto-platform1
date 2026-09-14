"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Dumbbell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { TODAY_GOAL_FOOTER_CLASS } from "@/components/today/today-goal-card-styles";

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
    const interval = window.setInterval(() => void loadWeekEvents(), 5000);
    window.addEventListener("sympto:health-checkin-updated", handleUpdated);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("sympto:health-checkin-updated", handleUpdated);
    };
  }, [goal?.id, weekStart.getTime()]);

  const weekTotal = events.reduce((total, event) => total + (Number.isFinite(event.loggedValue) ? event.loggedValue : 0), 0);
  const progressPercent = targetMinutes > 0 ? Math.min(100, Math.round((weekTotal / targetMinutes) * 100)) : 0;
  const todayKey = localDayKey();
  const todayMinutes = events.filter((event) => {
    const date = new Date(event.occurredAt);
    return !Number.isNaN(date.getTime()) && localDayKey(date) === todayKey;
  }).reduce((total, event) => total + (Number.isFinite(event.loggedValue) ? event.loggedValue : 0), 0);
  const targetReached = targetMinutes > 0 && weekTotal >= targetMinutes;
  const overTarget = targetMinutes > 0 && weekTotal > targetMinutes;
  const remainingMinutes = Math.max(0, targetMinutes - weekTotal);

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[30px] border border-[#dfeaec] bg-white shadow-[0_18px_48px_rgba(11,45,84,.065)]">
      <div className="flex items-center gap-3 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80] ring-1 ring-[#d8efed]"><Dumbbell className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="truncate text-base font-black tracking-[-.035em] text-[#0b2d54]">{String(goal?.title ?? "Exercise")}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#84969e]">Your weekly movement goal</p>
        </div>
      </div>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="relative overflow-hidden rounded-[27px] bg-[#0b2d54] p-5 text-white shadow-[0_14px_30px_rgba(11,45,84,.16)] sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#24c1c4]/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-[#24c1c4]/10 blur-3xl" />

          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <div
                className="relative grid h-[154px] w-[154px] place-items-center rounded-full"
                style={{ background: `conic-gradient(#24c1c4 0 ${progressPercent}%, rgba(255,255,255,.13) ${progressPercent}% 100%)` }}
              >
                <div className="absolute inset-[10px] rounded-full bg-[#0b2d54] ring-1 ring-white/10" />
                <div className="relative z-10 text-center">
                  <p className="text-[40px] font-black leading-none tracking-[-.075em]">{loading ? "—" : weekTotal}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[.16em] text-white/55">minutes</p>
                  <p className="mt-2 text-[9px] font-bold text-white/45">{progressPercent}% of {targetMinutes} min</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/50">This week</p>
              <p className="mt-2 text-[30px] font-black leading-none tracking-[-.065em]">
                {loading ? "—" : weekTotal}
                <span className="ml-1.5 text-base font-bold tracking-normal text-white/55">/ {targetMinutes} min</span>
              </p>
              <p className="mt-2 text-xs font-semibold text-white/65">{todayMinutes > 0 ? `${todayMinutes} min logged today` : "No exercise logged today"}</p>
              <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black text-white/80 ring-1 ring-white/10">
                {overTarget ? `${weekTotal - targetMinutes} min above goal` : targetReached ? "Weekly goal reached" : `${remainingMinutes} min to go this week`}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-[#e2ecef] bg-[#fbfdfd] p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8f8f7] text-[#0b7b80]"><CheckCircle2 className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-[#0b2d54]">Log exercise in your Daily Health Check-in</p>
              <p className="mt-1 text-[11px] leading-5 text-[#74859a]">Saved exercise minutes are added to this weekly goal automatically. This card is read-only.</p>
              <Link href="#daily-health-check-in" className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3.5 py-2 text-[10px] font-black text-white shadow-[0_7px_16px_rgba(11,45,84,.14)]">Go to health check-in <ArrowRight className="h-3 w-3" /></Link>
            </div>
          </div>
        </div>
      </div>

      <div className={`${TODAY_GOAL_FOOTER_CLASS} bg-[#fbfdfd]`}>
        <div className="flex items-center justify-between gap-3 text-[10px] font-semibold text-[#74859a]">
          <span>Day {journey.journeyDay} · {journey.daysLeft === null ? "Journey active" : journey.daysLeft === 0 ? "Target date today" : `${journey.daysLeft} days left`}</span>
          <Link href="/health-goals" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[10px] font-black text-[#0b2d54] hover:bg-white">View goal <ArrowRight className="h-3 w-3" /></Link>
        </div>
        <p className="mt-2 text-[9px] text-[#9aa8b1]">Target date: {formatDate(journey.targetDate)}</p>
      </div>
    </article>
  );
}
