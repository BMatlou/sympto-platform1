"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, Save, Dumbbell, Moon, Sparkles, Droplets, Target } from "lucide-react";
import { healthJournalService } from "@/services/health-journal.service";
import { healthGoalsService } from "@/services/health-goals.service";
import type { HealthJournal, HealthJournalMood, SleepQuality } from "@/types/health-journal";

const moodOptions: Array<{ value: HealthJournalMood; label: string; tone: string }> = [
  { value: "VERY_BAD", label: "Very low", tone: "very-low" },
  { value: "BAD", label: "Low", tone: "low" },
  { value: "NEUTRAL", label: "Okay", tone: "okay" },
  { value: "GOOD", label: "Good", tone: "good" },
  { value: "VERY_GOOD", label: "Great", tone: "great" },
];

const sleepOptions: Array<{ value: SleepQuality; label: string }> = [
  { value: "VERY_POOR", label: "Very poor" },
  { value: "POOR", label: "Poor" },
  { value: "FAIR", label: "Fair" },
  { value: "GOOD", label: "Good" },
  { value: "EXCELLENT", label: "Excellent" },
];

const exerciseOptions = [0, 15, 30, 45, 60, 90];
const EXERCISE_STEP_MINUTES = 15;
const MAX_EXERCISE_MINUTES = 300;
const WATER_STEP_ML = 250;
const DEFAULT_WATER_GOAL_ML = 2000;
const DEFAULT_EXERCISE_GOAL_MINUTES = 90;
const DEFAULT_SLEEP_GOAL_HOURS = 8;

type Goal = {
  id: string;
  title?: string;
  category?: string;
  targetValue?: number | string | null;
  currentValue?: number | string | null;
  unit?: string | null;
  metricConfig?: { frequencyTarget?: number | string | null } | null;
};

type ExerciseEvent = { loggedValue: number; occurredAt: string };

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

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function moodLabel(value?: HealthJournalMood) {
  return moodOptions.find((option) => option.value === value)?.label ?? "";
}

function sleepLabel(value?: SleepQuality) {
  return sleepOptions.find((option) => option.value === value)?.label ?? "";
}

function sleepQualityForHours(hours: number): SleepQuality {
  if (hours <= 4) return "VERY_POOR";
  if (hours < 6) return "POOR";
  if (hours < 7) return "FAIR";
  if (hours < 8) return "GOOD";
  return "EXCELLENT";
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normaliseUnit(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function hydrationTarget(goal?: Goal) {
  if (!goal || goal.targetValue == null) return DEFAULT_WATER_GOAL_ML;
  const target = numberValue(goal.targetValue, DEFAULT_WATER_GOAL_ML);
  const unit = normaliseUnit(goal.unit);
  return ["l", "liter", "litre", "liters", "litres"].includes(unit) ? target * 1000 : target;
}

function exerciseTarget(goal?: Goal) {
  if (!goal) return DEFAULT_EXERCISE_GOAL_MINUTES;
  const configuredTarget = goal.metricConfig?.frequencyTarget;
  if (configuredTarget != null) {
    const target = numberValue(configuredTarget, DEFAULT_EXERCISE_GOAL_MINUTES);
    return target > 0 ? target : DEFAULT_EXERCISE_GOAL_MINUTES;
  }
  if (goal.targetValue == null) return DEFAULT_EXERCISE_GOAL_MINUTES;
  const target = numberValue(goal.targetValue, DEFAULT_EXERCISE_GOAL_MINUTES);
  const unit = normaliseUnit(goal.unit);
  return ["h", "hr", "hour", "hours"].includes(unit) ? target * 60 : target;
}

function sleepTarget(goal?: Goal) {
  if (!goal || goal.targetValue == null) return DEFAULT_SLEEP_GOAL_HOURS;
  const target = numberValue(goal.targetValue, DEFAULT_SLEEP_GOAL_HOURS);
  const unit = normaliseUnit(goal.unit);
  return ["min", "minute", "minutes"].includes(unit) ? target / 60 : target;
}

function goalMatches(goal: Goal, category: string, keywords: string[]) {
  const goalCategory = String(goal.category ?? "").toUpperCase();
  const title = String(goal.title ?? "").toLowerCase();
  return goalCategory === category || keywords.some((keyword) => title.includes(keyword));
}

function buildJournalText(values: { mood: HealthJournalMood | null; sleepQuality: SleepQuality | null; sleepHours: number; stressLevel: number; exerciseMinutes: number; waterIntakeMl: number; stressTouched: boolean }) {
  const parts = [
    values.mood ? `Mood: ${moodLabel(values.mood)}.` : null,
    values.sleepQuality && values.sleepHours > 0
      ? `Sleep: ${sleepLabel(values.sleepQuality)}, ${values.sleepHours} hours.`
      : values.sleepQuality
        ? `Sleep quality: ${sleepLabel(values.sleepQuality)}.`
        : values.sleepHours > 0
          ? `Sleep: ${values.sleepHours} hours.`
          : null,
    values.stressTouched ? `Stress: ${values.stressLevel}/10.` : null,
    values.exerciseMinutes > 0 ? `Exercise: ${values.exerciseMinutes} minutes.` : null,
    values.waterIntakeMl > 0 ? `Water: ${values.waterIntakeMl} ml.` : null,
  ].filter(Boolean);
  return parts.join(" ") || "Daily health check-in recorded.";
}

function sameCheckIn(journal: HealthJournal) {
  return journal.title === "Daily Health Check-in" && isToday(journal.createdAt);
}

function MoodFace({ tone }: { tone: string }) {
  const mouth = {
    "very-low": "M 16 33 C 20 29 28 29 32 33",
    low: "M 18 31 C 22 29 26 29 30 31",
    okay: "M 18 31 L 30 31",
    good: "M 16 29 C 20 34 28 34 32 29",
    great: "M 14 27 C 20 36 28 36 34 27",
  }[tone] ?? "M 18 31 L 30 31";

  return (
    <svg viewBox="0 0 48 48" className="h-6 w-6 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.2]" aria-hidden="true">
      <circle cx="24" cy="24" r="16" />
      <path d="M17 20h.01M31 20h.01" />
      <path d={mouth} />
      {tone === "very-low" && <path d="M16 12l-3-4M32 12l3-4" />}
      {tone === "great" && <path d="M10 14l-4-2M38 14l4-2M24 5V1" />}
    </svg>
  );
}

export default function DailyHealthCheckIn({ embedded = false, goals = [], medicationGoalHref = null }: { embedded?: boolean; goals?: Goal[]; medicationGoalHref?: string | null }) {
  const [mood, setMood] = useState<HealthJournalMood | null>(null);
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>(null);
  const [sleepHours, setSleepHours] = useState(0);
  const [stressLevel, setStressLevel] = useState(5);
  const [exerciseMinutes, setExerciseMinutes] = useState(0);
  const [waterIntakeMl, setWaterIntakeMl] = useState(0);
  const [weeklyExerciseEvents, setWeeklyExerciseEvents] = useState<ExerciseEvent[]>([]);
  const [savedJournal, setSavedJournal] = useState<HealthJournal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stressTouched, setStressTouched] = useState(false);
  const [sleepTouched, setSleepTouched] = useState(false);
  const [exerciseTouched, setExerciseTouched] = useState(false);
  const [waterTouched, setWaterTouched] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const hasLoaded = useRef(false);

  const hydrationGoal = useMemo(() => goals.find((goal) => goalMatches(goal, "HYDRATION", ["water", "hydration", "hydrate"])), [goals]);
  const exerciseGoal = useMemo(() => goals.find((goal) => goalMatches(goal, "EXERCISE", ["exercise", "movement", "activity", "walk", "steps"])), [goals]);
  const sleepGoal = useMemo(() => goals.find((goal) => goalMatches(goal, "SLEEP", ["sleep", "rest", "recovery"])), [goals]);

  const waterGoalMl = hydrationTarget(hydrationGoal);
  const exerciseGoalMinutes = exerciseTarget(exerciseGoal);
  const sleepGoalHours = sleepTarget(sleepGoal);
  const waterPercent = Math.min(100, Math.round((waterIntakeMl / waterGoalMl) * 100));
  const waterRemaining = Math.max(0, waterGoalMl - waterIntakeMl);
  const persistedWeekMinutes = weeklyExerciseEvents.reduce((total, event) => total + (Number.isFinite(event.loggedValue) ? event.loggedValue : 0), 0);
  const persistedTodayMinutes = weeklyExerciseEvents.filter((event) => {
    const date = new Date(event.occurredAt);
    return !Number.isNaN(date.getTime()) && localDayKey(date) === localDayKey();
  }).reduce((total, event) => total + (Number.isFinite(event.loggedValue) ? event.loggedValue : 0), 0);
  const projectedWeekMinutes = Math.max(0, persistedWeekMinutes - persistedTodayMinutes + exerciseMinutes);
  const movementProgress = exerciseGoalMinutes > 0 ? Math.min(100, Math.round((projectedWeekMinutes / exerciseGoalMinutes) * 100)) : 0;
  const sleepProgress = Math.min(100, Math.round((sleepHours / sleepGoalHours) * 100));
  const derivedSleepQuality = sleepHours > 0 ? sleepQualityForHours(sleepHours) : null;
  const effectiveSleepQuality = derivedSleepQuality ?? sleepQuality;
  const movementRemaining = Math.max(0, exerciseGoalMinutes - projectedWeekMinutes);

  const hasInput = useMemo(
    () => Boolean(savedJournal || mood || sleepQuality || sleepHours > 0 || exerciseMinutes > 0 || waterIntakeMl > 0 || stressTouched || sleepTouched || exerciseTouched || waterTouched),
    [savedJournal, mood, sleepQuality, sleepHours, exerciseMinutes, waterIntakeMl, stressTouched, sleepTouched, exerciseTouched, waterTouched],
  );

  const movementTitle = projectedWeekMinutes >= exerciseGoalMinutes && projectedWeekMinutes > 0
    ? ["Weekly goal reached", `You’ve reached your ${exerciseGoalMinutes}-minute weekly exercise goal.`]
    : projectedWeekMinutes === 0
      ? ["Ready when you are", `Your weekly exercise goal is ${exerciseGoalMinutes} minutes.`]
      : ["Nice rhythm", `${movementRemaining} more minutes this week to reach your ${exerciseGoalMinutes}-minute goal.`];

  useEffect(() => {
    let active = true;
    async function loadToday() {
      try {
        const response = await healthJournalService.getAll({ limit: 100 });
        const existing = response.data.find(sameCheckIn);
        if (!active) return;
        if (existing) {
          setSavedJournal(existing);
          setMood(existing.mood ?? null);
          setSleepQuality(existing.sleepQuality ?? null);
          setSleepHours(existing.sleepHours != null ? Number(existing.sleepHours) : 0);
          setSleepTouched(existing.sleepHours != null);
          setStressLevel(existing.stressLevel ?? 5);
          setStressTouched(existing.stressLevel != null);
          setExerciseMinutes(existing.exerciseMinutes != null ? existing.exerciseMinutes : 0);
          setWaterIntakeMl(existing.waterIntakeMl != null ? existing.waterIntakeMl : 0);
          setExerciseTouched(existing.exerciseMinutes != null);
          setWaterTouched(existing.waterIntakeMl != null);
        }
      } catch {
      } finally {
        if (active) { hasLoaded.current = true; setLoading(false); }
      }
    }
    loadToday();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const weekStart = startOfLocalWeek();
    async function loadWeekExercise() {
      try {
        const response = await healthGoalsService.getMetricEvents("EXERCISE", "exercise.minutes", weekStart, new Date(), "health-journal");
        if (!active) return;
        setWeeklyExerciseEvents((response.events ?? []).map((event) => ({ loggedValue: Number(event.loggedValue), occurredAt: String(event.occurredAt) })));
      } catch {
        if (active) setWeeklyExerciseEvents([]);
      }
    }
    void loadWeekExercise();
    const handleUpdated = () => void loadWeekExercise();
    const interval = window.setInterval(() => void loadWeekExercise(), 5000);
    window.addEventListener("sympto:health-checkin-updated", handleUpdated);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("sympto:health-checkin-updated", handleUpdated); };
  }, [exerciseGoal?.id]);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    const journal = buildJournalText({ mood, sleepQuality: effectiveSleepQuality, sleepHours, stressLevel, exerciseMinutes, waterIntakeMl, stressTouched });
    try {
      const payload = {
        title: "Daily Health Check-in",
        journal,
        mood: mood ?? undefined,
        sleepQuality: effectiveSleepQuality ?? undefined,
        sleepHours: sleepTouched ? String(sleepHours) : undefined,
        stressLevel: stressTouched ? stressLevel : undefined,
        exerciseMinutes: exerciseTouched ? exerciseMinutes : undefined,
        waterIntakeMl: waterTouched ? waterIntakeMl : undefined,
      };
      const saved = savedJournal ? await healthJournalService.update(savedJournal.id, payload) : await healthJournalService.create({ ...payload, notes: "Captured from the What do I do today? health check-in." });
      setSavedJournal(saved);
      setSleepQuality(saved.sleepQuality ?? effectiveSleepQuality);
      window.dispatchEvent(new Event("sympto:health-checkin-updated"));
      setMessage("Today’s health check-in and linked goal progress are saved.");
    } catch {
      setError("We couldn't save today's check-in. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={embedded ? "rounded-[30px] bg-white/70 p-4" : "mt-5 rounded-[30px] bg-white/70 p-4"} aria-busy="true"><div className="h-[520px] animate-pulse rounded-[26px] bg-[#edf5f6]" /></div>;
  }

  const outer = embedded ? "" : "rounded-[30px] border border-[#e4edef] bg-white shadow-[0_18px_50px_rgba(11,45,84,.055)]";

  return (
    <div className={outer}>
      {!embedded && (
        <div className="flex items-center justify-between gap-4 border-b border-[#eef3f4] px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#24c1c4]"><Sparkles className="h-4.5 w-4.5" /></span>
            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#7d909e]">Daily health check-in</p><h2 className="mt-1 truncate text-[19px] font-black tracking-[-.045em] text-[#0b2d54]">A few calm minutes for you</h2></div>
          </div>
          {savedJournal && <span className="shrink-0 rounded-full bg-[#edf8f3] px-3 py-1.5 text-[9px] font-black text-[#168660]">Saved today</span>}
        </div>
      )}

      <div className={embedded ? "grid gap-3.5 lg:grid-cols-[1.08fr_.92fr]" : "grid gap-3.5 p-3.5 lg:grid-cols-[1.08fr_.92fr] sm:p-5"}>
        <article className="rounded-[27px] bg-[#f8fbfb] p-4 ring-1 ring-[#e6eff1] sm:p-5 lg:row-span-2">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#7b8e9d]">How are you feeling?</p><p className="mt-1 text-[12px] font-medium text-[#8a9aa6]">Choose what feels closest today.</p></div>
            {mood && <span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-black text-[#0b7b80] ring-1 ring-[#deeaec]">{moodLabel(mood)}</span>}
          </div>

          <div className="mt-4 grid grid-cols-5 gap-1.5">
            {moodOptions.map((option) => {
              const selected = mood === option.value;
              const iconTone = { "very-low": "bg-[#f1eefe] text-[#7356b2]", low: "bg-[#edf4ff] text-[#3f75bd]", okay: "bg-[#eef8f4] text-[#168660]", good: "bg-[#e8f8f7] text-[#0b7b80]", great: "bg-[#eef2ff] text-[#5265a9]" }[option.tone];
              return <button key={option.value} type="button" aria-pressed={selected} onClick={() => setMood(option.value)} className={`rounded-[18px] px-1.5 py-2.5 text-center transition ${selected ? "bg-[#0b2d54] text-white shadow-[0_10px_22px_rgba(11,45,84,.13)]" : "bg-white text-[#708493] ring-1 ring-[#e1ecef] hover:bg-[#f4f9f9]"}`}><span className={`mx-auto grid h-9 w-9 place-items-center rounded-[13px] ${selected ? "bg-[#24c1c4] text-[#0b2d54]" : iconTone}`}><MoodFace tone={option.tone} /></span><span className="mt-1.5 block text-[9px] font-black">{option.label}</span></button>;
            })}
          </div>

          <div className="mt-5 rounded-[22px] bg-white p-4 ring-1 ring-[#e4edef]">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#82939f]">Stress</p><p className="mt-1 text-[10px] text-[#9aa6af]">Move gently between calm and very stressed.</p></div><strong className="text-[25px] font-black tracking-[-.06em] text-[#0b2d54]">{stressLevel}<span className="text-sm text-[#8a9aa6]">/10</span></strong></div>
            <div className="relative mt-4 h-2.5 rounded-full bg-[#e8eff1]"><div className="absolute inset-y-0 left-0 rounded-full bg-[#24c1c4]" style={{ width: `${((stressLevel - 1) / 9) * 100}%` }} /><input aria-label="Stress level" type="range" min={1} max={10} value={stressLevel} onChange={(event) => { setStressLevel(Number(event.target.value)); setStressTouched(true); }} className="absolute inset-0 h-2.5 w-full cursor-pointer opacity-0" /><span className="pointer-events-none absolute top-1/2 h-5 w-5 rounded-full border-[4px] border-[#0b2d54] bg-white shadow-[0_2px_8px_rgba(11,45,84,.18)]" style={{ left: `${((stressLevel - 1) / 9) * 100}%`, transform: "translate(-50%,-50%)" }} /></div>
            <div className="mt-2 flex justify-between text-[9px] font-bold text-[#8999a5]"><span>Calm</span><span>Very stressed</span></div>
          </div>

          <div className="mt-3 rounded-[22px] bg-white p-4 ring-1 ring-[#e4edef]">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#eef2ff] text-[#5265a9]"><Moon className="h-4 w-4" /></span><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#8999a5]">Rest & recovery</p><p className="mt-0.5 text-[20px] font-black tracking-[-.05em] text-[#0b2d54]">{sleepHours}h</p></div></div><span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[9px] font-black text-[#5265a9]">{sleepProgress}%</span></div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[17px] bg-[#f8f9ff] px-3 py-2.5"><span className="text-[9px] font-black text-[#66779b]">{effectiveSleepQuality ? sleepLabel(effectiveSleepQuality) : "Sleep hours not selected"}</span>{sleepGoal && <span className="text-[9px] font-bold text-[#8996b8]">Goal {sleepGoalHours}h</span>}</div>
            <div className="mt-3 flex items-center justify-between rounded-[17px] bg-[#fbfdfe] px-3 py-2 ring-1 ring-[#e4edef]"><span className="text-[9px] font-black uppercase tracking-[.13em] text-[#8796a2]">Hours slept</span><div className="flex items-center gap-2"><button type="button" aria-label="Decrease sleep hours" onClick={() => { const next = Math.max(0, Number((sleepHours - .5).toFixed(1))); setSleepHours(next); setSleepTouched(true); if (next === 0) setSleepQuality(null); }} className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#f0f5f6] text-[#0b2d54]"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-10 text-center text-sm font-black text-[#0b2d54]">{sleepHours}h</span><button type="button" aria-label="Increase sleep hours" onClick={() => { const next = Math.min(24, Number((sleepHours + .5).toFixed(1))); setSleepHours(next); setSleepTouched(true); }} className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#e8f8f7] text-[#0b7b80]"><Plus className="h-3.5 w-3.5" /></button></div></div>
          </div>
        </article>

        <article className="rounded-[27px] bg-white p-4 ring-1 ring-[#e3edef] shadow-[0_7px_22px_rgba(11,45,84,.025)] sm:p-5">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#e8f8f7] text-[#0b7b80]"><Droplets className="h-4 w-4" /></span><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#82939f]">Hydration</p><p className="mt-0.5 text-[11px] text-[#8b9aa5]">Fill your glass as you go</p></div></div><strong className="text-[20px] font-black tracking-[-.05em] text-[#0b2d54]">{waterPercent}%</strong></div>
          <div className="mt-4 flex items-center gap-4"><div className="relative h-[92px] w-[66px] shrink-0 overflow-hidden rounded-[8px_8px_18px_18px] border-2 border-[#b5dfe4] bg-[#f8ffff]"><div className="absolute inset-x-0 bottom-0 bg-[#24c1c4] transition-all duration-500" style={{ height: `${waterPercent}%` }} /><div className="absolute inset-x-0 top-0 h-3 rounded-full border-2 border-[#b5dfe4] bg-white/70" /></div><div className="min-w-0"><p className="text-[27px] font-black leading-none tracking-[-.06em] text-[#0b2d54]">{waterIntakeMl.toLocaleString("en-ZA")} <span className="text-sm tracking-normal text-[#82939f]">ml</span></p><p className="mt-1 text-[10px] text-[#8796a2]">of {waterGoalMl >= 1000 ? `${waterGoalMl / 1000} L` : `${waterGoalMl} ml`} goal</p><p className="mt-1 text-[10px] font-bold text-[#0b7b80]">{waterRemaining > 0 ? `${waterRemaining.toLocaleString("en-ZA")} ml remaining` : "Goal reached"}</p></div></div>
          <div className="mt-4 flex items-center justify-between rounded-[17px] bg-[#f8fbfb] px-3 py-2.5 ring-1 ring-[#e4edef]"><span className="text-[9px] font-black uppercase tracking-[.13em] text-[#83939e]">Per tap</span><span className="text-[11px] font-black text-[#0b2d54]">250 ml</span><div className="flex gap-1.5"><button type="button" aria-label="Decrease water intake" disabled={waterIntakeMl <= 0} onClick={() => { const next = Math.max(0, waterIntakeMl - WATER_STEP_ML); setWaterIntakeMl(next); setWaterTouched(true); }} className="grid h-8 w-8 place-items-center rounded-[10px] bg-white text-[#0b2d54] ring-1 ring-[#dde9ec] disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button><button type="button" aria-label="Increase water intake" onClick={() => { const next = waterIntakeMl + WATER_STEP_ML; setWaterIntakeMl(next); setWaterTouched(true); }} className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#e8f8f7] text-[#0b7b80]"><Plus className="h-3.5 w-3.5" /></button></div></div>
          <button type="button" onClick={() => { setWaterIntakeMl(0); setWaterTouched(true); }} className="mt-2 text-[9px] font-black text-[#8a99a4]">Reset water</button>
        </article>

        <article className="rounded-[27px] bg-white p-4 ring-1 ring-[#e3edef] shadow-[0_7px_22px_rgba(11,45,84,.025)] sm:p-5">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#edf4ff] text-[#3f75bd]"><Dumbbell className="h-4 w-4" /></span><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#82939f]">Exercise</p><p className="mt-0.5 text-[11px] text-[#8b9aa5]">Move toward your weekly goal</p></div></div><strong className="text-[20px] font-black tracking-[-.05em] text-[#0b2d54]">{movementProgress}%</strong></div>
          {exerciseGoal && <p className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-[#3f75bd]"><Target className="h-3 w-3" />{exerciseGoal.title ?? "Exercise goal"} · {exerciseGoalMinutes} min/week</p>}
          <div className="mt-3 rounded-[20px] bg-[#f7fbff] p-3.5 ring-1 ring-[#e2ebf2]"><div className="flex items-center gap-3"><div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#24c1c4 0 ${movementProgress}%, #dfeef1 ${movementProgress}% 100%)` }}><div className="absolute inset-[9px] rounded-full bg-white" /><div className="relative z-10 text-center"><b className="block text-[20px] font-black leading-none text-[#0b2d54]">{exerciseMinutes}</b><span className="text-[9px] font-black text-[#82929e]">today</span></div></div><div className="min-w-0"><p className="text-[12px] font-black text-[#0b2d54]">{movementTitle[0]}</p><p className="mt-1 text-[10px] leading-4 text-[#82929e]">{movementTitle[1]}</p><p className="mt-2 text-[10px] font-black text-[#0b7b80]">{projectedWeekMinutes} / {exerciseGoalMinutes} min this week</p></div></div></div>
          <div className="mt-3 flex items-center justify-between rounded-[17px] bg-[#f8fbfb] px-3 py-2.5 ring-1 ring-[#e4edef]"><span className="text-[9px] font-black uppercase tracking-[.13em] text-[#83939e]">Per tap</span><span className="text-[11px] font-black text-[#0b2d54]">15 min</span><div className="flex gap-1.5"><button type="button" aria-label="Decrease exercise minutes" disabled={exerciseMinutes <= 0} onClick={() => { setExerciseMinutes(Math.max(0, exerciseMinutes - EXERCISE_STEP_MINUTES)); setExerciseTouched(true); }} className="grid h-8 w-8 place-items-center rounded-[10px] bg-white text-[#0b2d54] ring-1 ring-[#dde9ec] disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button><button type="button" aria-label="Increase exercise minutes" disabled={exerciseMinutes >= MAX_EXERCISE_MINUTES} onClick={() => { setExerciseMinutes(Math.min(MAX_EXERCISE_MINUTES, exerciseMinutes + EXERCISE_STEP_MINUTES)); setExerciseTouched(true); }} className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#e8f8f7] text-[#0b7b80] disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button></div></div>
          <div className="mt-2 flex flex-wrap gap-1.5">{exerciseOptions.map((value) => <button key={value} type="button" onClick={() => { setExerciseMinutes(value); setExerciseTouched(true); }} className={`rounded-[10px] border px-2.5 py-1.5 text-[9px] font-black ${exerciseMinutes === value ? "border-[#0b2d54] bg-[#0b2d54] text-white" : "border-[#d9e6ea] bg-white text-[#7a8c98]"}`}>{value === 0 ? "None" : `${value} min`}</button>)}</div>
          {medicationGoalHref && <a href={medicationGoalHref} className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-[13px] border border-[#cfe1e6] bg-[#f8fbfb] px-3 py-2 text-[9px] font-black text-[#0b2d54] shadow-[0_6px_16px_rgba(11,45,84,.035)] transition hover:bg-[#eef8f8]">Medication goal <Target className="h-3.5 w-3.5 text-[#24c1c4]" /></a>}
        </article>
      </div>

      {message && <div className="mt-3 flex items-center gap-2 rounded-[18px] bg-[#edf9f3] px-4 py-3 text-[10px] font-black text-[#168660]"><span className="grid h-6 w-6 place-items-center rounded-full bg-white"><Check className="h-3.5 w-3.5" /></span>{message}</div>}
      {error && <div className="mt-3 rounded-[18px] bg-[#fff3f2] px-4 py-3 text-[10px] font-black text-[#b94a43]">{error}</div>}

      <div className={`${embedded ? "mt-3" : "mt-3 px-3.5 pb-3.5 sm:px-5 sm:pb-5"} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <p className="max-w-xl text-[9px] leading-4 text-[#99a6af]">Mood, sleep, stress, hydration and exercise are stored in your Health Journal. Goal-linked measures also update their progress history.</p>
        <button type="button" disabled={saving || !hasInput} onClick={save} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[#0b2d54] px-5 py-3 text-[10px] font-black text-white shadow-[0_9px_22px_rgba(11,45,84,.14)] disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-4 w-4 text-[#24c1c4]" />{saving ? "Saving…" : savedJournal ? "Update today’s check-in" : "Save today’s check-in"}</button>
      </div>
    </div>
  );
}
