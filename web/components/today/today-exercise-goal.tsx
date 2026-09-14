"use client";

import Link from "next/link";
import { ArrowRight, Dumbbell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { healthGoalsService } from "@/services/health-goals.service";
import {
  TODAY_GOAL_BODY_CLASS,
  TODAY_GOAL_CARD_CLASS,
  TODAY_GOAL_FOOTER_CLASS,
  TODAY_GOAL_HEADER_CLASS,
} from "@/components/today/today-goal-card-styles";

type Props = { goal: any; onUpdated?: () => Promise<void> | void };

type ExerciseEvent = { loggedValue: number; occurredAt: string; sourceId?: string | null };

const MINUTE_OPTIONS = [15, 30, 45, 60, 90];

function startOfLocalWeek(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysFromMonday);
  return start;
}

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  return { startDate, targetDate, journeyDay, daysLeft };
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export default function TodayExerciseGoal({ goal, onUpdated }: Props) {
  const [events, setEvents] = useState<ExerciseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);

  const targetMinutes = numberValue(goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue) ?? 0;
  const journey = useMemo(() => journeyFor(goal), [goal]);
  const weekStart = useMemo(() => startOfLocalWeek(), []);

  async function loadWeekEvents() {
    try {
      const response = await healthGoalsService.getMetricEvents("EXERCISE", "exercise.minutes", weekStart, new Date(), "today-exercise-log");
      setEvents((response.events ?? []).map((event) => ({ loggedValue: Number(event.loggedValue), occurredAt: String(event.occurredAt), sourceId: event.sourceId ?? null })));
    } catch {
      // Preserve the current UI when event history is unavailable.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const response = await healthGoalsService.getMetricEvents("EXERCISE", "exercise.minutes", weekStart, new Date(), "today-exercise-log");
        if (!active) return;
        setEvents((response.events ?? []).map((event) => ({ loggedValue: Number(event.loggedValue), occurredAt: String(event.occurredAt), sourceId: event.sourceId ?? null })));
      } catch {
        if (active) setEvents([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [goal?.id, goal?.createdAt, weekStart.getTime()]);

  const weekTotal = events.reduce((total, event) => total + (Number.isFinite(event.loggedValue) ? event.loggedValue : 0), 0);
  const progressPercent = targetMinutes > 0 ? Math.min(100, Math.round((weekTotal / targetMinutes) * 100)) : 0;
  const targetReached = targetMinutes > 0 && weekTotal >= targetMinutes;
  const todayKey = localDayKey();
  const todayEvent = events.find((event) => event.sourceId === `${String(goal?.id)}:${todayKey}`);
  const todayMinutes = todayEvent ? todayEvent.loggedValue : 0;

  async function saveExercise() {
    if (!goal?.id || selectedMinutes == null || saving) return;
    try {
      setSaving(true);
      await healthGoalsService.syncMetricEvent({
        metricType: "EXERCISE",
        metricKey: "exercise.minutes",
        loggedValue: selectedMinutes,
        occurredAt: new Date().toISOString(),
        source: "today-exercise-log",
        sourceId: `${String(goal.id)}:${todayKey}`,
      });
      await loadWeekEvents();
      setSelectedMinutes(null);
      toast.success("Exercise logged", { description: `${selectedMinutes} minutes added to this week’s movement.` });
      await onUpdated?.();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      toast.error("Exercise update failed", { description: Array.isArray(message) ? message.join(" ") : message || "We could not save this exercise entry." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={TODAY_GOAL_CARD_CLASS}>
      <div className={TODAY_GOAL_HEADER_CLASS}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e5f7f6] text-[#0b6f73]"><Dumbbell className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0b6f73]">Exercise</p>
              <h3 className="truncate text-lg font-black tracking-[-.04em] text-[#0b2d54]">{String(goal?.title ?? "Exercise more")}</h3>
            </div>
          </div>
          <div className="shrink-0 text-right"><p className="text-sm font-black leading-none text-[#0b2d54]">{progressPercent}%</p><p className="mt-1 text-[9px] font-bold text-[#7d8f9e]">of goal</p></div>
        </div>
      </div>

      <div className={TODAY_GOAL_BODY_CLASS}>
        <div className="rounded-[18px] border border-[#e7eef1] bg-[#fbfdfd] p-4">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-3xl font-black leading-none tracking-[-.06em] text-[#0b2d54]">{loading ? "—" : weekTotal} <span className="text-base font-bold text-[#74859a]">minutes</span></p><p className="mt-1 text-sm font-bold text-[#74859a]">{todayMinutes > 0 ? `${todayMinutes} min logged today` : "Ready when you are"}</p></div>
            <div className="text-right"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#8a99a6]">Target</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{targetMinutes} mins/week</p></div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#edf2f5]"><div className="h-full rounded-full bg-gradient-to-r from-[#0b6f73] to-[#24c1c4] transition-[width] duration-500" style={{ width: `${progressPercent}%` }} /></div>
          <p className="mt-2 text-right text-[9px] font-semibold text-[#8795a0]">{progressPercent}% of goal</p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#74859a]">Log today’s movement</p><span className="text-[10px] font-semibold text-[#8a99a6]">{todayMinutes} min today</span></div>
          <div className="mt-3 flex flex-wrap gap-2">
            {MINUTE_OPTIONS.map((minutes) => <button key={minutes} type="button" onClick={() => setSelectedMinutes(minutes)} className={`min-h-10 rounded-xl border px-3 py-2 text-[10px] font-black transition ${selectedMinutes === minutes ? "border-[#0b6f73] bg-[#e5f7f6] text-[#0b6f73]" : "border-[#d7e4e8] bg-white text-[#526779] hover:bg-[#f3f8f9]"}`}>{minutes} min</button>)}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[#74859a]">Choose the time that matches your day. Sympto turns it into measurable progress against your exercise goal.</p>
          <button type="button" disabled={selectedMinutes == null || saving || targetReached} onClick={() => void saveExercise()} className="mt-4 min-h-10 w-full rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[10px] font-black text-white transition hover:bg-[#123e66] disabled:cursor-not-allowed disabled:bg-[#e9eff2] disabled:text-[#95a3ad]">{saving ? "Saving…" : targetReached ? "Weekly goal reached" : selectedMinutes == null ? "Select your minutes" : `Log ${selectedMinutes} minutes`}</button>
        </div>
      </div>

      <div className={TODAY_GOAL_FOOTER_CLASS}>
        <div className="mb-3 flex items-center justify-between gap-3 text-[10px] text-[#74859a]"><span>Day {journey.journeyDay} of your journey</span>{journey.daysLeft !== null && <span>{journey.daysLeft === 0 ? "Target date is today" : `${journey.daysLeft} days left`}</span>}</div>
        <div className="flex items-center justify-between gap-3"><p className="text-[9px] leading-4 text-[#8a99a6]">Target date: {formatDate(journey.targetDate)}</p><Link href="/health-goals" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2 text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link></div>
      </div>
    </article>
  );
}
