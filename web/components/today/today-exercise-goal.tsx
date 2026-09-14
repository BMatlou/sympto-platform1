"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Dumbbell, Footprints, Target } from "lucide-react";
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
  const todayMinutes = events.filter((event) => { const date = new Date(event.occurredAt); return !Number.isNaN(date.getTime()) && localDayKey(date) === todayKey; }).reduce((total, event) => total + (Number.isFinite(event.loggedValue) ? event.loggedValue : 0), 0);
  const targetReached = targetMinutes > 0 && weekTotal >= targetMinutes;
  const overTarget = targetMinutes > 0 && weekTotal > targetMinutes;

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[30px] border border-[#dfeaec] bg-white shadow-[0_14px_34px_rgba(11,45,84,.055)]">
      <div className="border-b border-[#edf2f4] px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#e9f8f7] text-[#0b7b80] ring-1 ring-[#d8efed]">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0b7b80]">Exercise goal</p>
              <h3 className="mt-1 truncate text-[19px] font-black tracking-[-.04em] text-[#0b2d54]">{String(goal?.title ?? "Exercise")}</h3>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl bg-[#f3faf9] px-3 py-2 text-center ring-1 ring-[#e2efed]">
            <p className="text-[20px] font-black leading-none tracking-[-.05em] text-[#0b6f73]">{progressPercent}%</p>
            <p className="mt-1 text-[8px] font-black uppercase tracking-[.12em] text-[#8a9ba3]">of goal</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-5 sm:px-6 sm:py-6">
        <div className="rounded-[24px] bg-[#f5fbfa] p-5 ring-1 ring-[#e3efed] sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="mx-auto shrink-0 sm:mx-0">
              <div className="relative grid h-[138px] w-[138px] place-items-center rounded-full" style={{ background: `conic-gradient(#24c1c4 0 ${progressPercent}%, #dcebea ${progressPercent}% 100%)` }}>
                <div className="absolute inset-[9px] rounded-full bg-[#f5fbfa]" />
                <div className="relative z-10 text-center">
                  <p className="text-[34px] font-black leading-none tracking-[-.07em] text-[#0b2d54]">{loading ? "—" : weekTotal}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[.12em] text-[#74859a]">minutes</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-[.15em] text-[#7e919a]">This week</p>
              <div className="mt-2 flex items-baseline justify-center gap-1.5 sm:justify-start">
                <span className="text-2xl font-black tracking-[-.05em] text-[#0b2d54]">{loading ? "—" : weekTotal}</span>
                <span className="text-sm font-bold text-[#7d8f9e]">/ {targetMinutes} min</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#74859a]">{todayMinutes > 0 ? `${todayMinutes} min logged today` : "No exercise logged today"}</p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#dfeceb]">
                <div className="h-full rounded-full bg-[#24c1c4] transition-[width] duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-[9px] font-bold text-[#8a9aa2]">
                <span>{progressPercent}% of weekly goal</span>
                <span>{targetMinutes} mins/week</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-white px-3.5 py-3.5 ring-1 ring-[#e3efed]">
              <div className="flex items-center gap-2 text-[#0b7b80]"><Target className="h-3.5 w-3.5" /><span className="text-[9px] font-black uppercase tracking-[.12em]">Weekly goal</span></div>
              <p className="mt-2 text-sm font-black text-[#0b2d54]">{targetMinutes} mins/week</p>
            </div>
            <div className="rounded-[18px] bg-white px-3.5 py-3.5 ring-1 ring-[#e3efed]">
              <div className="flex items-center gap-2 text-[#0b7b80]"><Footprints className="h-3.5 w-3.5" /><span className="text-[9px] font-black uppercase tracking-[.12em]">Today</span></div>
              <p className="mt-2 text-sm font-black text-[#0b2d54]">{todayMinutes} min logged</p>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] bg-white px-4 py-4 ring-1 ring-[#e3efed]">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8f7f6] text-[#0b7b80]"><Dumbbell className="h-4 w-4" /></span>
              <div className="min-w-0">
                <p className="text-sm font-black text-[#0b2d54]">Log exercise in your Daily Health Check-in</p>
                <p className="mt-1.5 text-[11px] leading-5 text-[#74859a]">Sympto uses the exercise minutes saved there to calculate this weekly goal automatically. This card is read-only.</p>
                <Link href="#daily-health-check-in" className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3.5 py-2 text-[10px] font-black text-white shadow-[0_6px_14px_rgba(11,45,84,.12)]">Go to health check-in <ArrowRight className="h-3 w-3" /></Link>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-[18px] bg-[#f8fbfb] px-3.5 py-3 ring-1 ring-[#e5eeee]">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e6f7f3] text-[#168660]"><CheckCircle2 className="h-4 w-4" /></span>
            <p className="text-[10px] font-bold leading-4 text-[#74859a]">
              {overTarget ? `${weekTotal - targetMinutes} minutes above your weekly goal.` : targetReached ? "Your weekly exercise goal is reached." : `${Math.max(0, targetMinutes - weekTotal)} minutes to go this week.`}
            </p>
          </div>
        </div>
      </div>

      <div className={`${TODAY_GOAL_FOOTER_CLASS} border-t-0 bg-[#fbfdfd]`}>
        <div className="mb-3 flex items-center justify-between gap-3 text-[10px] font-semibold text-[#74859a]">
          <span>Day {journey.journeyDay} of your journey</span>
          {journey.daysLeft !== null && <span>{journey.daysLeft === 0 ? "Target date is today" : `${journey.daysLeft} days left`}</span>}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] leading-4 text-[#8a99a6]">Target date: {formatDate(journey.targetDate)}</p>
          <Link href="/health-goals" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#d6e5e8] bg-white px-3.5 py-2 text-[10px] font-black text-[#0b2d54] shadow-sm">View goal <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </div>
    </article>
  );
}
