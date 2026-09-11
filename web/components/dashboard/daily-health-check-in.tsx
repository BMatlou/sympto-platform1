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
const waterOptions = [250, 500, 750];
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
};

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
  if (!goal || goal.targetValue == null) return DEFAULT_EXERCISE_GOAL_MINUTES;
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
    <svg viewBox="0 0 48 48" className="h-[27px] w-[27px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.2]" aria-hidden="true">
      <circle cx="24" cy="24" r="16" />
      <path d="M17 20h.01M31 20h.01" />
      <path d={mouth} />
      {tone === "very-low" && <path d="M16 12l-3-4M32 12l3-4" />}
      {tone === "great" && <path d="M10 14l-4-2M38 14l4-2M24 5V1" />}
    </svg>
  );
}

export default function DailyHealthCheckIn({ embedded = false, goals = [] }: { embedded?: boolean; goals?: Goal[] }) {
  const [mood, setMood] = useState<HealthJournalMood | null>(null);
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>(null);
  const [sleepHours, setSleepHours] = useState(0);
  const [stressLevel, setStressLevel] = useState(5);
  const [exerciseMinutes, setExerciseMinutes] = useState(0);
  const [waterIntakeMl, setWaterIntakeMl] = useState(0);
  const [savedJournal, setSavedJournal] = useState<HealthJournal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stressTouched, setStressTouched] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const hasLoaded = useRef(false);
  const syncingGoalIds = useRef(new Set<string>());

  const hydrationGoal = useMemo(() => goals.find((goal) => goalMatches(goal, "HYDRATION", ["water", "hydration", "hydrate"])), [goals]);
  const exerciseGoal = useMemo(() => goals.find((goal) => goalMatches(goal, "EXERCISE", ["exercise", "movement", "activity", "walk", "steps"])), [goals]);
  const sleepGoal = useMemo(() => goals.find((goal) => goalMatches(goal, "SLEEP", ["sleep", "rest", "recovery"])), [goals]);

  const waterGoalMl = hydrationTarget(hydrationGoal);
  const exerciseGoalMinutes = exerciseTarget(exerciseGoal);
  const sleepGoalHours = sleepTarget(sleepGoal);
  const waterPercent = Math.min(100, Math.round((waterIntakeMl / waterGoalMl) * 100));
  const waterRemaining = Math.max(0, waterGoalMl - waterIntakeMl);
  const movementProgress = Math.min(100, Math.round((exerciseMinutes / exerciseGoalMinutes) * 100));
  const sleepProgress = Math.min(100, Math.round((sleepHours / sleepGoalHours) * 100));
  const derivedSleepQuality = sleepHours > 0 ? sleepQualityForHours(sleepHours) : null;
  const effectiveSleepQuality = derivedSleepQuality ?? sleepQuality;

  const hasInput = useMemo(
    () => Boolean(mood || sleepQuality || sleepHours > 0 || exerciseMinutes > 0 || waterIntakeMl > 0 || stressTouched),
    [mood, sleepQuality, sleepHours, exerciseMinutes, waterIntakeMl, stressTouched],
  );

  const movementTitle = exerciseMinutes === 0
    ? ["Ready when you are", "Even a little movement counts."]
    : exerciseMinutes < exerciseGoalMinutes
      ? ["Nice rhythm", `${Math.max(0, exerciseGoalMinutes - exerciseMinutes)} more minutes to your movement goal.`]
      : ["Goal reached", "You have reached today’s movement target."];

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
          setSleepHours(existing.sleepHours ? Number(existing.sleepHours) : 0);
          setStressLevel(existing.stressLevel ?? 5);
          setStressTouched(existing.stressLevel != null);
          setExerciseMinutes(existing.exerciseMinutes ?? 0);
          setWaterIntakeMl(existing.waterIntakeMl ?? 0);
        }
      } catch {
        // Keep the check-in usable when today's entry cannot be loaded.
      } finally {
        if (active) {
          hasLoaded.current = true;
          setLoading(false);
        }
      }
    }

    loadToday();
    return () => {
      active = false;
    };
  }, []);

  async function syncGoal(goal: Goal | undefined, category: "HYDRATION" | "EXERCISE" | "SLEEP", currentValue: number) {
    if (!hasLoaded.current || !goal?.id || syncingGoalIds.current.has(goal.id)) return;
    syncingGoalIds.current.add(goal.id);
    try {
      await healthGoalsService.recordProgress(goal.id, currentValue, `Daily check-in ${category.toLowerCase()} update.`);
    } catch {
      setError("Today’s check-in changed, but the linked health goal could not be updated.");
    } finally {
      syncingGoalIds.current.delete(goal.id);
    }
  }

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
        sleepHours: sleepHours > 0 ? String(sleepHours) : undefined,
        stressLevel: stressTouched ? stressLevel : undefined,
        exerciseMinutes,
        waterIntakeMl,
      };

      const saved = savedJournal
        ? await healthJournalService.update(savedJournal.id, payload)
        : await healthJournalService.create({ ...payload, notes: "Captured from the What do I do today? health check-in." });

      setSavedJournal(saved);
      setSleepQuality(saved.sleepQuality ?? effectiveSleepQuality);
      setMessage("Today’s health check-in and linked goal progress are saved.");
    } catch {
      setError("We couldn't save today's check-in. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={embedded ? "grid gap-4 lg:grid-cols-[1.05fr_.95fr]" : "mt-5 grid gap-4 lg:grid-cols-[1.05fr_.95fr]"}>
        <div className="h-[520px] animate-pulse rounded-[27px] bg-white" />
        <div className="space-y-4"><div className="h-[250px] animate-pulse rounded-[27px] bg-white" /><div className="h-[250px] animate-pulse rounded-[27px] bg-white" /></div>
      </div>
    );
  }

  const surface = embedded ? "" : "rounded-[27px] border border-[#dfebef] bg-white shadow-[0_16px_42px_rgba(11,45,84,.06)]";

  return (
    <div className={surface}>
      {!embedded && (
        <div className="border-b border-[#edf2f5] px-6 py-6 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5f7f6] text-[#0b2d54]"><Sparkles className="h-4 w-4" /></span>
            <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#71839a]">Daily health check-in</p><h2 className="mt-1 text-xl font-black tracking-[-.04em] text-[#0b2d54]">How are you feeling today?</h2></div>
          </div>
        </div>
      )}

      <div className={embedded ? "grid gap-[15px] lg:grid-cols-[1.05fr_.95fr]" : "grid gap-[15px] p-4 lg:grid-cols-[1.05fr_.95fr]"}>
        <article className="rounded-[27px] border border-[#dfebef] bg-white p-5 shadow-[0_6px_20px_rgba(11,45,84,.035)] sm:p-[23px] lg:row-span-2">
          <div className="flex items-start justify-between gap-4">
            <div><h3 className="text-[17px] font-black tracking-[-.035em] text-[#0b2d54]">How are you feeling today?</h3><p className="mt-1 text-xs leading-5 text-[#74859a]">A few quick taps — never health homework.</p></div>
            {savedJournal && <span className="whitespace-nowrap rounded-[11px] bg-[#e9f8f1] px-2.5 py-2 text-[10px] font-black text-[#168660]">✓ Saved today</span>}
          </div>

          <div className="mb-3 mt-5 text-sm font-black text-[#0b2d54]">Mood</div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {moodOptions.map((option) => {
              const selected = mood === option.value;
              const iconTone = { "very-low": "bg-[#f1eefe] text-[#7356b2]", low: "bg-[#edf4ff] text-[#3f75bd]", okay: "bg-[#eef8f4] text-[#168660]", good: "bg-[#e5f7f6] text-[#148e92]", great: "bg-[#fff5df] text-[#a26204]" }[option.tone];
              return <button key={option.value} type="button" aria-pressed={selected} onClick={() => setMood(option.value)} className={`group min-w-0 rounded-2xl border bg-[#fbfdfe] px-1.5 py-2.5 text-center text-[10px] font-black transition ${selected ? "border-[#24c1c4] bg-[#e8f9f8] text-[#0b2d54] shadow-[0_0_0_3px_rgba(36,193,196,.10)]" : "border-[#dfebef] text-[#74859a] hover:-translate-y-0.5"}`}><span className={`mx-auto mb-2 grid h-[38px] w-[38px] place-items-center rounded-[14px] transition group-hover:-translate-y-0.5 ${selected ? "bg-[#24c1c4] text-[#0b2d54]" : iconTone}`}><MoodFace tone={option.tone} /></span>{option.label}</button>;
            })}
          </div>

          <div className="mt-6 flex items-end justify-between gap-4"><strong className="text-sm font-black text-[#0b2d54]">Stress</strong><span className="text-[24px] font-black tracking-[-.06em] text-[#0b2d54]">{stressLevel}/10</span></div>
          <div className="relative mt-2.5 h-2.5 overflow-visible rounded-full bg-[#dfeef1]"><div className="absolute inset-y-0 left-0 w-[70%] rounded-full bg-[#83d6c0]" /><div className="absolute inset-y-0 left-[70%] w-[14%] bg-[#f4d993]" /><div className="absolute inset-y-0 left-[84%] right-0 rounded-r-full bg-[#f09a92]" /><input aria-label="Stress level" type="range" min={1} max={10} value={stressLevel} onChange={(event) => { setStressLevel(Number(event.target.value)); setStressTouched(true); }} className="absolute inset-0 h-2.5 w-full cursor-pointer opacity-0" /><span className="pointer-events-none absolute top-1/2 h-[19px] w-[19px] rounded-full border-4 border-[#0b2d54] bg-white shadow-[0_2px_6px_rgba(11,45,84,.2)]" style={{ left: `${((stressLevel - 1) / 9) * 100}%`, transform: "translate(-50%,-50%)" }} /></div>
          <div className="mt-2 flex justify-between text-[10px] font-extrabold text-[#74859a]"><span>Calm</span><span>Very stressed</span></div>

          <div className="mt-5 border-t border-[#eef3f4] pt-4">
            <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f2efff] text-[#7356b2]"><Moon className="h-4 w-4" /></span><div><b className="block text-[18px] font-black tracking-[-.05em] text-[#0b2d54]">{sleepHours}h</b><span className="text-[11px] text-[#74859a]">Rest and recovery</span></div></div><span className="text-xs font-black text-[#7356b2]">{sleepProgress}%</span></div>
            {sleepGoal && <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-[#7356b2]"><Target className="h-3 w-3" />{sleepGoal.title ?? "Sleep goal"} · {sleepGoalHours}h target</p>}
            <div className="mt-3 flex items-center justify-between gap-1.5" aria-label={`Sleep recovery level: ${effectiveSleepQuality ? sleepLabel(effectiveSleepQuality) : "Not set"}`}>
              {sleepOptions.map((option) => {
                const selected = effectiveSleepQuality === option.value;
                return <span key={option.value} className={`flex-1 rounded-xl border px-1.5 py-1.5 text-center text-[9px] font-black transition ${selected ? "border-[#bdaee9] bg-[#f2efff] text-[#7356b2] shadow-[0_0_0_2px_rgba(115,86,178,.08)]" : "border-[#edf1f4] bg-[#fbfdfe] text-[#a0adba]"}`}>{option.label}</span>;
              })}
            </div>
            <p className="mt-2 text-[10px] font-semibold text-[#8a97a6]">Your recovery level updates automatically as you change your hours.</p>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#fbfdfe] px-3 py-2.5 ring-1 ring-[#e4edf0]"><span className="text-[9px] font-black uppercase tracking-[.14em] text-[#8797a8]">Hours slept</span><div className="flex items-center gap-2"><button type="button" aria-label="Decrease sleep hours" onClick={() => { const next = Math.max(0, Number((sleepHours - 0.5).toFixed(1))); const nextQuality = next > 0 ? sleepQualityForHours(next) : null; setSleepHours(next); setSleepQuality(nextQuality); void syncGoal(sleepGoal, "SLEEP", next); }} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f5f8fb] text-[#0b2d54]"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-10 text-center text-sm font-black text-[#0b2d54]">{sleepHours}h</span><button type="button" aria-label="Increase sleep hours" onClick={() => { const next = Math.min(24, Number((sleepHours + 0.5).toFixed(1))); const nextQuality = sleepQualityForHours(next); setSleepHours(next); setSleepQuality(nextQuality); void syncGoal(sleepGoal, "SLEEP", next); }} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f5f8fb] text-[#0b2d54]"><Plus className="h-3.5 w-3.5" /></button></div></div>
          </div>
        </article>

        <article className="rounded-[27px] border border-[#dfebef] bg-white p-5 shadow-[0_6px_20px_rgba(11,45,84,.035)] sm:p-[23px]">
          <div className="flex items-start justify-between gap-4"><div><h3 className="text-[17px] font-black text-[#0b2d54]">Hydration</h3><p className="mt-1 text-xs text-[#74859a]">Fill your glass as you go</p></div><span className="rounded-[11px] bg-[#e9f8f1] px-2.5 py-2 text-[10px] font-black text-[#168660]">{waterPercent}%</span></div>
          {hydrationGoal && <p className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-[#0b7b80]"><Target className="h-3 w-3" />{hydrationGoal.title ?? "Hydration goal"} · {waterGoalMl >= 1000 ? `${(waterGoalMl / 1000).toFixed(1).replace(/\.0$/, "")} L` : `${waterGoalMl} ml`} target</p>}
          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-[116px] w-[82px] overflow-hidden rounded-[7px_7px_19px_19px] border-[3px] border-[#acd8e3] bg-gradient-to-br from-white/85 to-[#e0f7fa]/40 shadow-[inset_8px_0_13px_rgba(255,255,255,.58),inset_-8px_0_13px_rgba(55,132,164,.08),0_8px_20px_rgba(39,133,167,.12)]"><div className="absolute inset-0 overflow-hidden"><div className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-[#74d8dc] to-[#24aeb9] transition-all duration-500" style={{ height: `${Math.max(0, waterPercent)}%` }} /><span className="absolute bottom-5 left-[18px] h-1.5 w-1.5 rounded-full bg-white/70 motion-safe:animate-bounce" /><span className="absolute bottom-9 left-[53px] h-1 w-1 rounded-full bg-white/70" /></div><div className="absolute -left-[5px] -right-[5px] -top-[5px] h-3 rounded-[50%] border-[3px] border-[#acd8e3] bg-white/45" /><div className="absolute left-[10px] top-[14px] h-[71px] w-2 rotate-[5deg] rounded-full bg-white/70" /></div>
            <div className="min-w-0"><strong className="block text-[24px] font-black tracking-[-.06em] text-[#0b2d54]">{waterIntakeMl.toLocaleString("en-ZA")} ml</strong><span className="mt-1 block text-[11px] text-[#74859a]">of {waterGoalMl >= 1000 ? `${waterGoalMl / 1000} L` : `${waterGoalMl} ml`} goal</span><small className="mt-1 block text-[10px] text-[#74859a]">{waterRemaining > 0 ? `${waterRemaining.toLocaleString("en-ZA")} ml left` : "Goal reached"}</small></div>
          </div>
          <div className="mt-3 flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5 text-[#2583bc]" /><span className="text-[10px] font-semibold text-[#74859a]">{hydrationGoal ? "Counts directly toward your hydration goal." : "Daily hydration tracking."}</span></div>
          <div className="mt-3 flex flex-wrap gap-1.5">{waterOptions.map((amount) => <button key={amount} type="button" onClick={() => { const next = waterIntakeMl + amount; setWaterIntakeMl(next); void syncGoal(hydrationGoal, "HYDRATION", next); }} className="rounded-[10px] border border-[#dfebef] bg-white px-2.5 py-2 text-[10px] font-black text-[#0b2d54]">+{amount} ml</button>)}<button type="button" onClick={() => { setWaterIntakeMl(0); void syncGoal(hydrationGoal, "HYDRATION", 0); }} className="rounded-[10px] border-0 bg-transparent px-2 py-2 text-[10px] font-black text-[#74859a]">Reset</button></div>
        </article>

        <article className="rounded-[27px] border border-[#dfebef] bg-white p-5 shadow-[0_6px_20px_rgba(11,45,84,.035)] sm:p-[23px]">
          <div className="flex items-start justify-between gap-4"><div><h3 className="text-[17px] font-black text-[#0b2d54]">Exercise</h3><p className="mt-1 text-xs text-[#74859a]">Track movement toward your goal</p></div><span className="rounded-[11px] bg-[#e9f8f1] px-2.5 py-2 text-[10px] font-black text-[#168660]">{movementProgress}%</span></div>
          <div className="mt-4 rounded-[21px] border border-[#dcecf0] bg-gradient-to-br from-[#f1f7ff] to-[#eefbfa] p-4">
            <div className="flex items-center gap-4"><div className="relative grid h-[88px] w-[88px] shrink-0 place-items-center rounded-full shadow-[0_7px_16px_rgba(36,193,196,.14)]" style={{ background: `conic-gradient(#24c1c4 0 ${movementProgress}%, #dfeef1 ${movementProgress}% 100%)` }}><div className="absolute inset-[10px] rounded-full bg-[#f7fcfc]" /><div className="relative z-10 text-center"><b className="block text-[21px] font-black tracking-[-.06em] text-[#0b2d54]">{exerciseMinutes}</b><span className="text-[10px] font-black text-[#74859a]">minutes</span></div></div><div><b className="block text-sm text-[#0b2d54]">{movementTitle[0]}</b><span className="mt-1 block text-[11px] leading-[1.45] text-[#74859a]">{movementTitle[1]}</span>{exerciseGoal && <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-[#3f75bd]"><Target className="h-3 w-3" />{movementProgress}% of goal</span>}</div></div>
            <div className="my-4 flex items-center">{[0,1,2,3,4].map((index) => <span key={index} className="contents">{index > 0 && <span className={`h-[3px] flex-1 ${exerciseMinutes >= Math.ceil(index * exerciseGoalMinutes / 4) ? "bg-[#24c1c4]" : "bg-[#d9e9ed]"}`} />}<span className={`h-[11px] w-[11px] rounded-full border-2 border-[#f2f9fa] ${exerciseMinutes >= Math.ceil(index * exerciseGoalMinutes / 4) ? "bg-[#24c1c4] shadow-[0_0_0_1px_#24c1c4]" : "bg-[#d9e9ed] shadow-[0_0_0_1px_#cfe3e7]"}`} /></span>)}</div>
            <div className="flex flex-wrap gap-1.5">{exerciseOptions.map((value) => <button key={value} type="button" onClick={() => { setExerciseMinutes(value); void syncGoal(exerciseGoal, "EXERCISE", value); }} className={`rounded-[10px] border px-2.5 py-2 text-[10px] font-black ${exerciseMinutes === value ? "border-[#0b2d54] bg-[#0b2d54] text-white" : "border-[#d6e6ea] bg-white text-[#74859a]"}`}>{value === 0 ? "None" : `${value} min`}</button>)}</div>
          </div>
          <p className="mt-3 text-[11px] leading-[1.55] text-[#74859a]">Choose the time that matches your day. Sympto turns it into measurable progress against your exercise goal.</p>
        </article>
      </div>

      {message && <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#edf9f2] px-4 py-3 text-xs font-semibold text-[#168660]"><Check className="h-4 w-4" />{message}</div>}
      {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}

      <div className={`${embedded ? "mt-4" : "mt-4 px-4 pb-4"} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <p className="max-w-xl text-[10px] leading-4 text-[#9aa8b7]">Mood, sleep, stress, hydration and exercise are stored in your Health Journal. Goal-linked measures also update their progress history.</p>
        <button type="button" disabled={saving || !hasInput} onClick={save} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-xs font-black text-white shadow-[0_8px_22px_rgba(11,45,84,.16)] disabled:cursor-not-allowed disabled:opacity-45"><Save className="h-4 w-4" />{saving ? "Saving…" : savedJournal ? "Update check-in" : "Save today’s check-in"}</button>
      </div>
    </div>
  );
}
