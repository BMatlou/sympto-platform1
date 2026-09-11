"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, Save, Droplets, Dumbbell, Moon, Brain, Sparkles } from "lucide-react";
import { healthJournalService } from "@/services/health-journal.service";
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
const DAILY_WATER_GOAL = 2000;

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

function buildJournalText(values: {
  mood: HealthJournalMood | null;
  sleepQuality: SleepQuality | null;
  sleepHours: number;
  stressLevel: number;
  exerciseMinutes: number;
  waterIntakeMl: number;
  stressTouched: boolean;
}) {
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
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="16" />
      <path d="M17 20h.01M31 20h.01" />
      <path d={mouth} />
      {tone === "very-low" && <path d="M16 12l-3-4M32 12l3-4" />}
      {tone === "great" && <path d="M10 14l-4-2M38 14l4-2M24 5V1" />}
    </svg>
  );
}

export default function DailyHealthCheckIn({ embedded = false }: { embedded?: boolean }) {
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

  const hasInput = useMemo(
    () => Boolean(mood || sleepQuality || sleepHours > 0 || exerciseMinutes > 0 || waterIntakeMl > 0 || stressTouched),
    [mood, sleepQuality, sleepHours, exerciseMinutes, waterIntakeMl, stressTouched],
  );

  const waterPercent = Math.min(100, Math.round((waterIntakeMl / DAILY_WATER_GOAL) * 100));
  const waterRemaining = Math.max(0, DAILY_WATER_GOAL - waterIntakeMl);
  const movementProgress = Math.min(100, Math.round((exerciseMinutes / 90) * 100));
  const movementTitle = {
    0: ["Ready when you are", "Even a little movement counts."],
    15: ["A gentle start", "You created a little momentum."],
    30: ["Nice rhythm", "You’re building momentum, one step at a time."],
    45: ["Strong flow", "That is a beautiful amount of movement today."],
    60: ["Brilliant energy", "You gave your body a generous hour."],
    90: ["Outstanding", "A powerful movement day — remember to recover."],
  }[exerciseMinutes] ?? ["Nice rhythm", "Keep your movement story going."];

  useEffect(() => {
    let active = true;

    async function loadToday() {
      try {
        const response = await healthJournalService.getAll({ limit: 100 });
        const existing = response.data.find(sameCheckIn);
        if (!active || !existing) return;

        setSavedJournal(existing);
        setMood(existing.mood ?? null);
        setSleepQuality(existing.sleepQuality ?? null);
        setSleepHours(existing.sleepHours ? Number(existing.sleepHours) : 0);
        setStressLevel(existing.stressLevel ?? 5);
        setStressTouched(existing.stressLevel != null);
        setExerciseMinutes(existing.exerciseMinutes ?? 0);
        setWaterIntakeMl(existing.waterIntakeMl ?? 0);
      } catch {
        // Keep the check-in usable when today's entry cannot be loaded.
      } finally {
        if (active) setLoading(false);
      }
    }

    loadToday();
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    const journal = buildJournalText({
      mood,
      sleepQuality,
      sleepHours,
      stressLevel,
      exerciseMinutes,
      waterIntakeMl,
      stressTouched,
    });

    try {
      const payload = {
        title: "Daily Health Check-in",
        journal,
        mood: mood ?? undefined,
        sleepQuality: sleepQuality ?? undefined,
        sleepHours: sleepHours > 0 ? String(sleepHours) : undefined,
        stressLevel: stressTouched ? stressLevel : undefined,
        exerciseMinutes,
        waterIntakeMl,
      };

      const saved = savedJournal
        ? await healthJournalService.update(savedJournal.id, payload)
        : await healthJournalService.create({
            ...payload,
            notes: "Captured from the What do I do today? health check-in.",
          });

      setSavedJournal(saved);
      setMessage("Today's health check-in is saved.");
    } catch {
      setError("We couldn't save today's check-in. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={embedded ? "grid gap-4 lg:grid-cols-[1.05fr_.95fr]" : "mt-5 grid gap-4 lg:grid-cols-[1.05fr_.95fr]"}>
      <div className="h-[520px] animate-pulse rounded-[27px] bg-white" />
      <div className="space-y-4"><div className="h-[250px] animate-pulse rounded-[27px] bg-white" /><div className="h-[250px] animate-pulse rounded-[27px] bg-white" /></div>
    </div>;
  }

  const largeClass = embedded
    ? "checkin-card"
    : "checkin-card mt-5";

  return (
    <div className={embedded ? "" : "rounded-[27px] border border-[#dfebef] bg-white p-0 shadow-[0_16px_42px_rgba(11,45,84,.06)]"}>
      {!embedded && (
        <div className="border-b border-[#edf2f5] px-6 py-6 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5f7f6] text-[#0b2d54]"><Sparkles className="h-4 w-4" /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#71839a]">Daily health check-in</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.04em] text-[#0b2d54]">How are you feeling today?</h2>
            </div>
          </div>
        </div>
      )}

      <div className={embedded ? "grid gap-[15px] lg:grid-cols-[1.05fr_.95fr]" : "grid gap-[15px] p-4 lg:grid-cols-[1.05fr_.95fr]"}>
        <article className={`${largeClass} rounded-[27px] border border-[#dfebef] bg-white p-5 shadow-[0_6px_20px_rgba(11,45,84,.035)] sm:p-[23px] lg:row-span-2`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[17px] font-black tracking-[-.035em] text-[#0b2d54]">How are you feeling today?</h3>
              <p className="mt-1 text-xs leading-5 text-[#74859a]">A few quick taps — never health homework.</p>
            </div>
            {savedJournal && <span className="whitespace-nowrap rounded-[11px] bg-[#e9f8f1] px-2.5 py-2 text-[10px] font-black text-[#168660]">✓ Saved today</span>}
          </div>

          <div className="mb-3 mt-5 text-sm font-black text-[#0b2d54]">Mood</div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {moodOptions.map((option) => {
              const selected = mood === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMood(option.value)}
                  className={`min-w-0 rounded-2xl border bg-[#fbfdfe] px-1.5 py-2.5 text-center text-[10px] font-black transition ${selected ? "border-[#24c1c4] bg-[#e8f9f8] text-[#0b2d54] shadow-[0_0_0_3px_rgba(36,193,196,.10)]" : "border-[#dfebef] text-[#74859a] hover:-translate-y-0.5"}`}
                >
                  <span className={`mood-art mood-${option.tone}`}>
                    <MoodFace tone={option.tone} />
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-end justify-between gap-4">
            <strong className="text-sm font-black text-[#0b2d54]">Stress</strong>
            <span className="text-[24px] font-black tracking-[-.06em] text-[#0b2d54]">{stressLevel}/10</span>
          </div>
          <input
            aria-label="Stress level"
            type="range"
            min={1}
            max={10}
            value={stressLevel}
            onChange={(event) => {
              setStressLevel(Number(event.target.value));
              setStressTouched(true);
            }}
            className="mt-2.5 h-2.5 w-full cursor-pointer accent-[#0b2d54]"
            style={{ background: "linear-gradient(90deg,#83d6c0 0 70%,#f4d993 70% 84%,#f09a92 84% 100%)" }}
          />
          <div className="mt-2 flex justify-between text-[10px] font-extrabold text-[#74859a]"><span>Calm</span><span>Very stressed</span></div>

          <div className="mt-5 flex flex-col justify-between gap-3 border-t border-[#eef3f4] pt-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f2efff] text-[#7356b2]"><Moon className="h-4 w-4" /></span>
              <div><b className="block text-[18px] font-black tracking-[-.05em] text-[#0b2d54]">{sleepHours}h</b><span className="text-[11px] text-[#74859a]">Rest and recovery</span></div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sleepOptions.map((option) => (
                <button key={option.value} type="button" onClick={() => setSleepQuality(option.value)} className={`rounded-[11px] border px-2 py-1.5 text-[9px] font-black ${sleepQuality === option.value ? "border-[#b9e6e6] bg-[#eef7f8] text-[#0b2d54]" : "border-[#dfebef] bg-white text-[#74859a]"}`}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-col justify-between gap-3 border-t border-[#eef3f4] pt-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf4ff] text-[#3f75bd]"><Dumbbell className="h-4 w-4" /></span>
              <div><b className="block text-[18px] font-black tracking-[-.05em] text-[#0b2d54]">{exerciseMinutes} min</b><span className="text-[11px] text-[#74859a]">Exercise today</span></div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {exerciseOptions.slice(0, 5).map((value) => (
                <button key={value} type="button" onClick={() => setExerciseMinutes(value)} className={`rounded-[11px] border px-2.5 py-1.5 text-[9px] font-black ${exerciseMinutes === value ? "border-[#b9e6e6] bg-[#eef7f8] text-[#0b2d54]" : "border-[#dfebef] bg-white text-[#74859a]"}`}>
                  {value === 0 ? "None" : value}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <div className="flex items-center gap-2"><button type="button" aria-label="Decrease sleep hours" onClick={() => setSleepHours((value) => Math.max(0, Number((value - .5).toFixed(1))))} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f5f8fb] text-[#0b2d54]"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-9 text-center text-xs font-black text-[#0b2d54]">{sleepHours}h</span><button type="button" aria-label="Increase sleep hours" onClick={() => setSleepHours((value) => Math.min(24, Number((value + .5).toFixed(1))))} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f5f8fb] text-[#0b2d54]"><Plus className="h-3.5 w-3.5" /></button></div>
          </div>
        </article>

        <article className="rounded-[27px] border border-[#dfebef] bg-white p-5 shadow-[0_6px_20px_rgba(11,45,84,.035)] sm:p-[23px]">
          <div className="flex items-start justify-between gap-4"><div><h3 className="text-[17px] font-black tracking-[-.035em] text-[#0b2d54]">Hydration</h3><p className="mt-1 text-xs text-[#74859a]">Fill your glass as you go</p></div><span className="whitespace-nowrap rounded-[11px] bg-[#e9f8f1] px-2.5 py-2 text-[10px] font-black text-[#168660]">{waterPercent}%</span></div>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-[116px] w-[82px] overflow-hidden rounded-[7px] rounded-b-[19px] border-[3px] border-b-[3px] border-[#acd8e3] bg-gradient-to-br from-white/90 to-[#e0f7fa]/40 shadow-[inset_8px_0_13px_rgba(255,255,255,.58),inset_-8px_0_13px_rgba(55,132,164,.08),0_8px_20px_rgba(39,133,167,.12)]">
              <div className="absolute -left-1 -right-1 -top-1 z-10 h-3 rounded-[50%] border-[3px] border-[#acd8e3] bg-white/50" />
              <div className="absolute bottom-0 left-0 right-0 transition-all duration-500" style={{ height: `${Math.max(3, waterPercent)}%`, background: "linear-gradient(180deg,#74d8dc,#24aeb9)", boxShadow: "inset 0 5px 9px rgba(255,255,255,.28)" }}>
                <span className="absolute -left-[10%] -right-[10%] -top-1.5 h-[17px] rounded-[50%] bg-[#b4f6f7]/80" />
                <span className="absolute bottom-5 left-[18px] h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" />
                <span className="absolute bottom-9 left-[53px] h-1 w-1 animate-pulse rounded-full bg-white/70" />
                <span className="absolute bottom-3.5 left-[34px] h-[3px] w-[3px] animate-pulse rounded-full bg-white/70" />
              </div>
              <div className="absolute left-[10px] top-[14px] z-20 h-[71px] w-2 -rotate-[5deg] rounded-full bg-white/70" />
            </div>
            <div className="min-w-0"><strong className="block text-[24px] font-black tracking-[-.06em] text-[#0b2d54]">{waterIntakeMl.toLocaleString("en-ZA")} ml</strong><span className="mt-1 block text-[11px] text-[#74859a]">of a 2 L daily goal</span><small className="mt-1 block text-[10px] text-[#74859a]">{waterRemaining > 0 ? `${waterRemaining.toLocaleString("en-ZA")} ml left` : "Goal reached"}</small></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {waterOptions.map((amount) => <button key={amount} type="button" onClick={() => setWaterIntakeMl((value) => value + amount)} className="rounded-[10px] border border-[#dfebef] bg-white px-2.5 py-1.5 text-[10px] font-black text-[#0b2d54] hover:bg-[#f7fcfc]">+{amount} ml</button>)}
            <button type="button" onClick={() => setWaterIntakeMl(0)} className="rounded-[10px] border-0 bg-transparent px-1 py-1.5 text-[10px] font-extrabold text-[#74859a]">Reset</button>
          </div>
        </article>

        <article className="rounded-[27px] border border-[#dfebef] bg-white p-5 shadow-[0_6px_20px_rgba(11,45,84,.035)] sm:p-[23px]">
          <div className="flex items-start justify-between gap-4"><div><h3 className="text-[17px] font-black tracking-[-.035em] text-[#0b2d54]">Movement</h3><p className="mt-1 text-xs text-[#74859a]">Make progress feel visible</p></div><span className="whitespace-nowrap rounded-[11px] bg-[#e9f8f1] px-2.5 py-2 text-[10px] font-black text-[#168660]">Today</span></div>
          <div className="mt-4 rounded-[21px] border border-[#dcecf0] bg-gradient-to-br from-[#f1f7ff] to-[#eefbfa] p-4">
            <div className="flex items-center gap-4">
              <div className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#24c1c4 0 ${movementProgress}%,#dfeef1 ${movementProgress}% 100%)`, boxShadow: "0 7px 16px rgba(36,193,196,.14)" }}>
                <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-[#f7fcfc] text-center"><b className="block text-[21px] font-black tracking-[-.06em] text-[#0b2d54]">{exerciseMinutes}</b><span className="text-[10px] font-extrabold text-[#74859a]">minutes</span></div>
              </div>
              <div><b className="block text-sm font-black text-[#0b2d54]">{movementTitle[0]}</b><span className="mt-1 block text-[11px] leading-5 text-[#74859a]">{movementTitle[1]}</span></div>
            </div>
            <div className="mt-4 flex items-center px-1">
              {Array.from({ length: 5 }).map((_, index) => {
                const threshold = (index + 1) * 22.5;
                const active = movementProgress >= threshold;
                return <span key={`trail-${index}`} className="flex flex-1 items-center last:flex-none">{index > 0 && <span className={`h-[3px] w-full ${active ? "bg-gradient-to-r from-[#24c1c4] to-[#9be5e0]" : "bg-[#d9e9ed]"}`} />}<span className={`relative z-10 h-2.5 w-2.5 shrink-0 rounded-full border-[3px] border-[#f2f9fa] shadow-[0_0_0_1px_#cfe3e7] ${active ? "bg-[#24c1c4] shadow-[0_0_0_1px_#24c1c4,0_3px_8px_rgba(36,193,196,.25)]" : "bg-[#d9e9ed]"}`} /></span>;
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {exerciseOptions.map((value) => <button key={value} type="button" onClick={() => setExerciseMinutes(value)} className={`rounded-[10px] border px-2.5 py-1.5 text-[10px] font-black ${exerciseMinutes === value ? "border-[#0b2d54] bg-[#0b2d54] text-white" : "border-[#d6e6ea] bg-white text-[#74859a]"}`}>{value === 0 ? "None" : `${value} min`}</button>)}
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[#74859a]">Choose the time that matches your day. Sympto will turn it into a simple progress story.</p>
        </article>
      </div>

      {(message || error || hasInput) && (
        <div className={embedded ? "mt-4 border-t border-[#edf2f5] pt-4" : "border-t border-[#edf2f5] px-5 py-5 sm:px-6"}>
          {message && <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[#e9f8f1] px-4 py-3 text-xs font-semibold text-[#168660]"><Check className="h-4 w-4" />{message}</div>}
          {error && <div className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-4 text-[#9aa8b7]">Your answers become structured Health Journal data.</p>
            <button type="button" disabled={saving || !hasInput} onClick={save} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[13px] bg-[#0b2d54] px-4 py-2.5 text-xs font-black text-white shadow-[0_8px_22px_rgba(11,45,84,.16)] disabled:cursor-not-allowed disabled:opacity-45"><Save className="h-4 w-4" />{saving ? "Saving…" : savedJournal ? "Update check-in" : "Save check-in"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
