"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, Save, Sparkles } from "lucide-react";
import { healthJournalService } from "@/services/health-journal.service";
import type {
  HealthJournal,
  HealthJournalMood,
  SleepQuality,
} from "@/types/health-journal";

const moodOptions: Array<{ value: HealthJournalMood; label: string; icon: string }> = [
  { value: "VERY_BAD", label: "Very bad", icon: "😞" },
  { value: "BAD", label: "Bad", icon: "🙁" },
  { value: "NEUTRAL", label: "Okay", icon: "😐" },
  { value: "GOOD", label: "Good", icon: "🙂" },
  { value: "VERY_GOOD", label: "Very good", icon: "😄" },
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

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
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
  const [sleepHours, setSleepHours] = useState(8);
  const [stressLevel, setStressLevel] = useState(5);
  const [exerciseMinutes, setExerciseMinutes] = useState(30);
  const [waterIntakeMl, setWaterIntakeMl] = useState(0);
  const [savedJournal, setSavedJournal] = useState<HealthJournal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const hasInput = useMemo(
    () => Boolean(mood || sleepQuality || sleepHours > 0 || exerciseMinutes > 0 || waterIntakeMl > 0),
    [mood, sleepQuality, sleepHours, exerciseMinutes, waterIntakeMl],
  );

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
        setExerciseMinutes(existing.exerciseMinutes ?? 0);
        setWaterIntakeMl(existing.waterIntakeMl ?? 0);
      } catch {
        // The check-in remains usable even when today's previous entry cannot be loaded.
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
    });

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
    return <section className="mt-5 h-[430px] animate-pulse rounded-[28px] border border-[#e0ebef] bg-white" />;
  }

  return (
    <section className="mt-5 overflow-hidden rounded-[28px] border border-[#d9e8eb] bg-white shadow-[0_12px_35px_rgba(11,45,84,0.055)]">
      <div className="border-b border-[#edf2f5] bg-gradient-to-r from-[#f7fcfc] to-white px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#0b7b80]">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e8f9fa]"><Sparkles className="h-4 w-4" /></span>
              <p className="text-[10px] font-black uppercase tracking-[0.18em]">Daily health check-in</p>
            </div>
            <h2 className="mt-3 text-xl font-black tracking-[-0.03em] text-[#0b2d54]">How are you doing today?</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#71839a]">A few quick taps help Sympto understand your day. No journal writing is needed.</p>
          </div>
          {savedJournal && <span className="rounded-full bg-[#e8f8f1] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#168660]">Saved today</span>}
        </div>
      </div>

      <div className="space-y-7 px-5 py-6 sm:px-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#71839a]">Mood</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {moodOptions.map((option) => {
              const active = mood === option.value;
              return (
                <button key={option.value} type="button" onClick={() => setMood(option.value)} className={`rounded-2xl border px-2 py-3 text-center transition ${active ? "border-[#24babe] bg-[#e9fafb] ring-2 ring-[#24babe]/20" : "border-[#e3ecef] bg-white hover:bg-[#f8fbfc]"}`}>
                  <span className="block text-xl">{option.icon}</span>
                  <span className={`mt-1 block text-[9px] font-bold ${active ? "text-[#0b6f73]" : "text-[#71839a]"}`}>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#71839a]">Stress</p><span className="text-sm font-black text-[#0b2d54]">{stressLevel}/10</span></div>
          <input aria-label="Stress level" type="range" min={1} max={10} value={stressLevel} onChange={(event) => setStressLevel(Number(event.target.value))} className="mt-3 w-full accent-[#24babe]" />
          <div className="mt-1 flex justify-between text-[9px] font-semibold text-[#9aa8b7]"><span>Low</span><span>High</span></div>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#71839a]">Sleep</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="grid grid-cols-5 gap-2">
              {sleepOptions.map((option) => {
                const active = sleepQuality === option.value;
                return <button key={option.value} type="button" onClick={() => setSleepQuality(option.value)} className={`rounded-xl border px-2 py-2.5 text-[10px] font-bold transition ${active ? "border-[#24babe] bg-[#e9fafb] text-[#0b6f73]" : "border-[#e3ecef] text-[#71839a] hover:bg-[#f8fbfc]"}`}>{option.label}</button>;
              })}
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#f7fafb] px-3 py-2 ring-1 ring-[#e3ecef] lg:min-w-[150px]">
              <span className="text-[10px] font-black uppercase tracking-wide text-[#71839a]">Hours</span>
              <div className="flex items-center gap-2"><button type="button" onClick={() => setSleepHours((value) => Math.max(0, Number((value - 0.5).toFixed(1))))} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#0b2d54] ring-1 ring-[#e0ebef]"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-10 text-center text-sm font-black text-[#0b2d54]">{sleepHours}h</span><button type="button" onClick={() => setSleepHours((value) => Math.min(24, Number((value + 0.5).toFixed(1))))} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#0b2d54] ring-1 ring-[#e0ebef]"><Plus className="h-3.5 w-3.5" /></button></div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#71839a]">Exercise</p><span className="text-sm font-black text-[#0b2d54]">{exerciseMinutes} min</span></div>
          <div className="mt-3 flex flex-wrap gap-2">{exerciseOptions.map((value) => <button key={value} type="button" onClick={() => setExerciseMinutes(value)} className={`rounded-full px-3.5 py-2 text-[10px] font-black transition ${exerciseMinutes === value ? "bg-[#0b2d54] text-white" : "bg-[#f4f8fa] text-[#71839a] hover:bg-[#eaf1f4]"}`}>{value === 0 ? "None" : `${value} min`}</button>)}</div>
        </div>

        <div>
          <div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#71839a]">Water</p><span className="text-sm font-black text-[#0b2d54]">{waterIntakeMl.toLocaleString("en-ZA")} ml</span></div>
          <p className="mt-1 text-[10px] text-[#9aa8b7]">Tap each amount you have had today. Sympto keeps a running total.</p>
          <div className="mt-3 flex flex-wrap gap-2">{waterOptions.map((amount) => <button key={amount} type="button" onClick={() => setWaterIntakeMl((value) => value + amount)} className="rounded-full bg-[#e9f9fa] px-3.5 py-2 text-[10px] font-black text-[#0b6f73] transition hover:bg-[#d7f4f5]">+{amount} ml</button>)}<button type="button" onClick={() => setWaterIntakeMl(0)} className="rounded-full bg-[#f4f8fa] px-3.5 py-2 text-[10px] font-bold text-[#71839a]">Reset</button></div>
        </div>

        {message && <div className="flex items-center gap-2 rounded-2xl bg-[#edf9f2] px-4 py-3 text-xs font-semibold text-[#168660]"><Check className="h-4 w-4" />{message}</div>}
        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}

        <div className="flex flex-col gap-3 border-t border-[#edf2f5] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] leading-4 text-[#9aa8b7]">Your answers are saved as structured health data and automatically become part of your Health Journal.</p>
          <button type="button" disabled={saving || !hasInput} onClick={save} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#123d66] disabled:cursor-not-allowed disabled:opacity-45"><Save className="h-4 w-4" />{saving ? "Saving…" : savedJournal ? "Update check-in" : "Save check-in"}</button>
        </div>
      </div>
    </section>
  );
}
