"use client";

import Link from "next/link";
import { ArrowRight, Dumbbell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";

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
  const statusMessage = overTarget
    ? `${weekTotal - targetMinutes} minutes above your weekly goal.`
    : targetReached
      ? "Your weekly exercise goal is reached."
      : `${remainingMinutes} minutes to go this week.`;

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
        <div className="relative overflow-hidden rounded-[28px] bg-[#0b2d54] px-5 py-6 text-white shadow-[0_16px_34px_rgba(11,45,84,.18)] sm:px-6 sm:py-7">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#24c1c4]/18 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/4 h-52 w-52 rounded-full bg-[#24c1c4]/10 blur-3xl" />

          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <div
                className="relative grid h-[154px] w-[154px] place-items-center rounded-full"
                style={{ background: `conic-gradient(#24c1c4 0 ${progressPercent}%, rgba(255,255,255,.13) ${progressPercent}% 100%)` }}
              >
                <div className="absolute inset-[10px] rounded-full bg-[#0b2d54] ring-1 ring-white/10" />
                <div className="relative z-10 text-center">
                  <p className="text-[42px] font-black leading-none tracking-[-.08em]">{loading ? "—" : weekTotal}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[.16em] text-white/55">minutes</p>
                  <p className="mt-2 text-[9px] font-bold text-white/45">{progressPercent}% of {targetMinutes} min</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/45">This week</p>
              <p className="mt-2 text-[31px] font-black leading-none tracking-[-.07em]">
                {loading ? "—" : weekTotal}
                <span className="ml-1.5 text-base font-bold tracking-normal text-white/50">/ {targetMinutes} min</span>
              </p>
              <p className="mt-2 text-xs font-semibold text-white/60">{todayMinutes > 0 ? `${todayMinutes} min logged today` : "No exercise logged today"}</p>
              <p className="mt-3 text-[10px] font-black text-[#75e3e3]">{statusMessage}</p>
            </div>
          </div>

          <div className="relative mt-7 border-t border-white/10 pt-5">
            <div className="flex items-start gap-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-white/10 text-[#75e3e3] ring-1 ring-white/10">
                <Dumbbell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">Log exercise in your Daily Health Check-in</p>
                <p className="mt-1.5 text-[11px] leading-5 text-white/55">Saved exercise minutes are added to this weekly goal automatically. This card is read-only.</p>
                <Link href="#daily-health-check-in" className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-[10px] font-black text-[#0b2d54] shadow-[0_8px_18px_rgba(0,0,0,.12)] transition hover:bg-[#effafa]">
                  Go to health check-in <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black text-white/70">Day {journey.journeyDay} · {journey.daysLeft === null ? "Journey active" : journey.daysLeft === 0 ? "Target date today" : `${journey.daysLeft} days left`}</p>
              <p className="mt-1 text-[9px] text-white/40">Target date: {formatDate(journey.targetDate)}</p>
            </div>
            <Link href="/health-goals" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-[10px] font-black text-white ring-1 ring-white/10 transition hover:bg-white/15">
              View goal <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
