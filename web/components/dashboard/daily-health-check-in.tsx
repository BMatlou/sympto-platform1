"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, Save, Sparkles, Droplets, Dumbbell, Moon, Brain, Smile } from "lucide-react";
import { healthJournalService } from "@/services/health-journal.service";
import type { HealthJournal, HealthJournalMood, SleepQuality } from "@/types/health-journal";

const moodOptions: Array<{ value: HealthJournalMood; label: string; icon: string; note: string }> = [
  { value: "VERY_BAD", label: "Very low", icon: "😞", note: "Hard day" },
  { value: "BAD", label: "Low", icon: "🙁", note: "Not my best" },
  { value: "NEUTRAL", label: "Okay", icon: "😐", note: "Getting through" },
  { value: "GOOD", label: "Good", icon: "🙂", note: "Feeling well" },
  { value: "VERY_GOOD", label: "Great", icon: "😄", note: "Feeling great" },
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

function buildJournalText(values: { mood: HealthJournalMood | null; sleepQuality: SleepQuality | null; sleepHours: number; stressLevel: number; exerciseMinutes: number; waterIntakeMl: number }) {
  const parts = [
    values.mood ? `Mood: ${moodLabel(values.mood)}.` : null,
    values.sleepQuality && values.sleepHours > 0
      ? `Sleep: ${sleepLabel(values.sleepQuality)}, ${values.sleepHours} hours.`
      : values.sleepQuality
        ? `Sleep quality: ${sleepLabel(values.sleepQuality)}.`
        : values.sleepHours > 0
          ? `Sleep: ${values.sleepHours} hours.`
          : null,
    `Stress: ${values.stressLevel}/10.`,
    values.exerciseMinutes > 0 ? `Exercise: ${values.exerciseMinutes} minutes.` : null,
    values.waterIntakeMl > 0 ? `Water: ${values.waterIntakeMl} ml.` : null,
  ].filter(Boolean);

  return parts.join(" ") || "Daily health check-in recorded.";
}

function sameCheckIn(journal: HealthJournal) {
  return journal.title === "Daily Health Check-in" && isToday(journal.createdAt);
}

export default function DailyHealthCheckIn() {
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
        // Keep the check-in usable even when today's entry cannot be loaded.
      } finally {
        if (active) setLoading(false);
      }
    }

    loadToday();
    return () => { active = false; };
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    const journal = buildJournalText({ mood, sleepQuality, sleepHours, stressLevel, exerciseMinutes, waterIntakeMl });

    try {
      let saved: HealthJournal;

      if (savedJournal) {
        saved = await healthJournalService.update(savedJournal.id, {
          title: "Daily Health Check-in",
          journal,
          mood: mood ?? undefined,
          sleepQuality: sleepQuality ?? undefined,
          sleepHours: sleepHours > 0 ? String(sleepHours) : undefined,
          stressLevel,
          exerciseMinutes,
          waterIntakeMl,
        });
      } else {
        saved = await healthJournalService.create({
          title: "Daily Health Check-in",
          journal,
          mood: mood ?? undefined,
          sleepQuality: sleepQuality ?? undefined,
          sleepHours: sleepHours > 0 ? String(sleepHours) : undefined,
          stressLevel,
          exerciseMinutes,
          waterIntakeMl,
          notes: "Captured from the What do I do today? health check-in.",
        });
      }

      setSavedJournal(saved);
      setMessage("Today's health check-in is saved.");
    } catch {
      setError("We couldn't save today's check-in. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="mt-5 h-[520px] animate-pulse rounded-[30px] border border-[#dfe9ef] bg-white shadow-[0_18px_45px_rgba(11,45,84,0.07)]" />;
  }

  return (
    <section className="mt-5 overflow-hidden rounded-[30px] border border-[#dfe9ef] bg-white shadow-[0_18px_45px_rgba(11,45,84,0.07)]">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#08284a] via-[#0d466f] to-[#20b9ba] px-6 py-7 text-white sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full border border-white/10 shadow-[0_0_0_24px_rgba(255,255,255,0.025)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white/75"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10"><Sparkles className="h-4 w-4" /></span><p className="text-[10px] font-black uppercase tracking-[0.18em]">Daily health check-in</p></div>
            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] sm:text-[29px]">How are you feeling today?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">A few quick taps give Sympto a better picture of your day without turning your health into homework.</p>
          </div>
          {savedJournal && <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white ring-1 ring-white/15"><Check className="h-3.5 w-3.5" />Saved today</span>}
        </div>
      </div>

      <div className="space-y-8 px-5 py-6 sm:px-8 sm:py-8">
        <div>
          <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#8797a8]">Mood</p><p className="mt-1 text-sm font-semibold text-[#0b2d54]">How does today feel?</p></div>{mood && <span className="rounded-full bg-[#e8f8f1] px-3 py-1.5 text-[10px] font-black text-[#168660]">{moodLabel(mood)}</span>}</div>
          <div className="mt-4 grid grid-cols-5 gap-2.5">
            {moodOptions.map((option) => {
              const active = mood === option.value;
              return <button key={option.value} type="button" onClick={() => setMood(option.value)} className={`group rounded-2xl border px-2 py-3.5 text-center transition ${active ? "border-[#24babe] bg-[#e9fafb] shadow-[0_8px_22px_rgba(36,193,196,0.12)] ring-2 ring-[#24babe]/20" : "border-[#e4edf1] bg-white hover:-translate-y-0.5 hover:border-[#cbdde2] hover:shadow-[0_8px_22px_rgba(11,45,84,0.06)]"}`}><span className={`mx-auto grid h-11 w-11 place-items-center rounded-2xl ${active ? "bg-white shadow-sm" : "bg-[#f6f9fa]"}`}><span className="text-xl">{option.icon}</span></span><span className={`mt-2 block text-[10px] font-black ${active ? "text-[#0b6f73]" : "text-[#71839a]"}`}>{option.label}</span><span className={`mt-0.5 block text-[9px] ${active ? "text-[#0b7b80]/70" : "text-[#9aa8b7]"}`}>{option.note}</span></button>;
            })}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[#e5edf1] bg-[#fbfdfe] p-5">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff3e8] text-[#c46b17]"><Brain className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8797a8]">Stress</p><p className="mt-1 text-sm font-bold text-[#0b2d54]">How heavy does today feel?</p></div></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0b2d54] ring-1 ring-[#e1e9ed]">{stressLevel}/10</span></div>
            <input aria-label="Stress level" type="range" min={1} max={10} value={stressLevel} onChange={(event) => { setStressLevel(Number(event.target.value)); setStressTouched(true); }} className="mt-6 w-full accent-[#24babe]" />
            <div className="mt-2 flex justify-between text-[9px] font-bold text-[#9aa8b7]"><span>Calm</span><span>Very stressed</span></div>
          </div>

          <div className="rounded-[24px] border border-[#e5edf1] bg-[#fbfdfe] p-5">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef4ff] text-[#3f75bd]"><Moon className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8797a8]">Sleep</p><p className="mt-1 text-sm font-bold text-[#0b2d54]">Rest and recovery</p></div></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0b2d54] ring-1 ring-[#e1e9ed]">{sleepHours}h</span></div>
            <div className="mt-5 grid grid-cols-5 gap-1.5">{sleepOptions.map((option) => { const active = sleepQuality === option.value; return <button key={option.value} type="button" onClick={() => setSleepQuality(option.value)} className={`rounded-xl border px-1 py-2 text-[9px] font-black transition ${active ? "border-[#5f87c9] bg-[#eef4ff] text-[#3f75bd]" : "border-[#e3eaee] bg-white text-[#71839a] hover:bg-[#f5f8fb]"}`}>{option.label}</button>; })}</div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[#e3eaee]"><span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8797a8]">Hours slept</span><div className="flex items-center gap-2"><button type="button" aria-label="Decrease sleep hours" onClick={() => setSleepHours((value) => Math.max(0, Number((value - 0.5).toFixed(1))))} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f5f8fb] text-[#0b2d54]"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-10 text-center text-sm font-black text-[#0b2d54]">{sleepHours}h</span><button type="button" aria-label="Increase sleep hours" onClick={() => setSleepHours((value) => Math.min(24, Number((value + 0.5).toFixed(1))))} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f5f8fb] text-[#0b2d54]"><Plus className="h-3.5 w-3.5" /></button></div></div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[24px] border border-[#e5edf1] bg-[#fbfdfe] p-5">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef8ef] text-[#168660]"><Dumbbell className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8797a8]">Movement</p><p className="mt-1 text-sm font-bold text-[#0b2d54]">Exercise today</p></div></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0b2d54] ring-1 ring-[#e1e9ed]">{exerciseMinutes} min</span></div>
            <div className="mt-5 flex flex-wrap gap-2">{exerciseOptions.map((value) => <button key={value} type="button" onClick={() => setExerciseMinutes(value)} className={`rounded-full px-3.5 py-2 text-[10px] font-black transition ${exerciseMinutes === value ? "bg-[#0b2d54] text-white shadow-sm" : "bg-white text-[#71839a] ring-1 ring-[#e2eaee] hover:bg-[#f5f8fb]"}`}>{value === 0 ? "None" : `${value} min`}</button>)}</div>
          </div>

          <div className="rounded-[24px] border border-[#d7edf0] bg-gradient-to-br from-[#f8feff] to-[#eefbfc] p-5">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#0b7b80] shadow-sm"><Droplets className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6b8a98]">Hydration</p><p className="mt-1 text-sm font-bold text-[#0b2d54]">Water today</p></div></div><span className="text-sm font-black text-[#0b6f73]">{waterIntakeMl.toLocaleString("en-ZA")} ml</span></div>
            <div className="mt-5 flex items-center gap-4">
              <div className="relative h-40 w-24 shrink-0">
                <div className="absolute inset-x-1 bottom-1 top-1 overflow-hidden rounded-b-[28px] rounded-t-[12px] border-[3px] border-[#8dcbd0] bg-white/70 shadow-[inset_0_0_0_4px_rgba(255,255,255,0.45)]">
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#36cbd0] via-[#5bd8dc] to-[#9be9eb] transition-all duration-500" style={{ height: `${Math.max(4, waterPercent)}%` }} />
                  <div className="absolute inset-x-0 bottom-0 h-6 bg-white/20" />
                </div>
                <div className="absolute left-1/2 top-0 h-4 w-12 -translate-x-1/2 rounded-t-lg border-2 border-b-0 border-[#8dcbd0] bg-white/80" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-end justify-between gap-3"><div><p className="text-2xl font-black tracking-[-0.04em] text-[#0b2d54]">{waterPercent}%</p><p className="text-[10px] font-semibold text-[#71839a]">of a 2 L daily goal</p></div><span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-[#0b7b80] ring-1 ring-[#cfe8eb]">{Math.max(0, DAILY_WATER_GOAL - waterIntakeMl).toLocaleString("en-ZA")} ml left</span></div>
                <div className="mt-4 flex flex-wrap gap-2">{waterOptions.map((amount) => <button key={amount} type="button" onClick={() => setWaterIntakeMl((value) => Math.min(DAILY_WATER_GOAL, value + amount))} className="rounded-full bg-white px-3 py-2 text-[10px] font-black text-[#0b6f73] shadow-sm ring-1 ring-[#d8ecef] transition hover:-translate-y-0.5 hover:bg-[#f6feff]">+{amount} ml</button>)}<button type="button" onClick={() => setWaterIntakeMl(0)} className="rounded-full bg-white/70 px-3 py-2 text-[10px] font-bold text-[#71839a] ring-1 ring-[#dce8eb]">Reset</button></div>
                <p className="mt-3 text-[9px] leading-4 text-[#7e98a3]">Each tap fills your glass and updates today’s total.</p>
              </div>
            </div>
          </div>
        </div>

        {message && <div className="flex items-center gap-2 rounded-2xl bg-[#edf9f2] px-4 py-3 text-xs font-semibold text-[#168660]"><Check className="h-4 w-4" />{message}</div>}
        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}

        <div className="flex flex-col gap-3 border-t border-[#edf2f5] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xl text-[10px] leading-4 text-[#9aa8b7]">Your answers are stored as structured health data and automatically become part of your Health Journal.</p><button type="button" disabled={saving || !hasInput} onClick={save} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-xs font-black text-white shadow-[0_8px_22px_rgba(11,45,84,0.16)] transition hover:-translate-y-0.5 hover:bg-[#123d66] disabled:cursor-not-allowed disabled:opacity-45"><Save className="h-4 w-4" />{saving ? "Saving…" : savedJournal ? "Update check-in" : "Save today’s check-in"}</button></div>
      </div>
    </section>
  );
}
