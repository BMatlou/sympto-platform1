"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Droplets, Moon, Smile, Sparkles } from "lucide-react";
import { healthJournalService } from "@/services/health-journal.service";
import type { HealthJournal } from "@/types/health-journal";

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

const moodLabels: Record<string, string> = {
  VERY_BAD: "Very bad",
  BAD: "Bad",
  NEUTRAL: "Okay",
  GOOD: "Good",
  VERY_GOOD: "Very good",
};

const sleepLabels: Record<string, string> = {
  VERY_POOR: "Very poor",
  POOR: "Poor",
  FAIR: "Fair",
  GOOD: "Good",
  EXCELLENT: "Excellent",
};

export default function TodaysHealthSignals() {
  const [journal, setJournal] = useState<HealthJournal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    healthJournalService
      .getAll({ limit: 100 })
      .then((response) => {
        if (!active) return;
        setJournal(response.data.find((item) => item.title === "Daily Health Check-in" && isToday(item.createdAt)) ?? null);
      })
      .catch(() => {
        if (active) setJournal(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <section className="mx-auto mb-5 h-28 max-w-[1300px] animate-pulse rounded-[24px] bg-white" />;
  }

  if (!journal) {
    return (
      <section className="mx-auto mb-5 max-w-[1300px] rounded-[24px] border border-[#dcebed] bg-white px-5 py-4 shadow-[0_8px_25px_rgba(11,45,84,0.045)] sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f9fa] text-[#0b7b80]"><Sparkles className="h-4 w-4" /></span>
            <div><p className="text-xs font-black text-[#0b2d54]">Today's health signals</p><p className="mt-0.5 text-[10px] text-[#71839a]">Your mood, sleep, stress, exercise and water appear here after your daily check-in.</p></div>
          </div>
          <Link href="/today/check-in" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0b2d54] px-4 py-2 text-[10px] font-black text-white transition hover:bg-[#123d66]">Complete check-in</Link>
        </div>
      </section>
    );
  }

  const signals = [
    journal.mood ? { label: "Mood", value: moodLabels[journal.mood] ?? journal.mood, icon: Smile } : null,
    journal.sleepQuality || journal.sleepHours ? { label: "Sleep", value: `${journal.sleepQuality ? sleepLabels[journal.sleepQuality] ?? journal.sleepQuality : ""}${journal.sleepHours ? ` · ${journal.sleepHours}h` : ""}`.trim(), icon: Moon } : null,
    journal.stressLevel != null ? { label: "Stress", value: `${journal.stressLevel}/10`, icon: Activity } : null,
    journal.exerciseMinutes != null ? { label: "Exercise", value: `${journal.exerciseMinutes} min`, icon: Activity } : null,
    journal.waterIntakeMl != null ? { label: "Water", value: `${Number(journal.waterIntakeMl).toLocaleString("en-ZA")} ml`, icon: Droplets } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; icon: typeof Activity }>;

  return (
    <section className="mx-auto mb-5 max-w-[1300px] overflow-hidden rounded-[24px] border border-[#dcebed] bg-white shadow-[0_8px_25px_rgba(11,45,84,0.045)]">
      <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f9fa] text-[#0b7b80]"><Sparkles className="h-4 w-4" /></span>
          <div><p className="text-xs font-black text-[#0b2d54]">Today's health signals</p><p className="mt-0.5 text-[10px] text-[#71839a]">Automatically summarised from your daily check-in.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {signals.map(({ label, value, icon: Icon }) => <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f8fa] px-3 py-2 text-[10px] font-bold text-[#0b2d54]"><Icon className="h-3.5 w-3.5 text-[#0b7b80]" />{label} · {value}</span>)}
          <Link href="/today/check-in" className="inline-flex items-center rounded-full bg-[#0b2d54] px-3.5 py-2 text-[10px] font-black text-white transition hover:bg-[#123d66]">Update</Link>
        </div>
      </div>
    </section>
  );
}
