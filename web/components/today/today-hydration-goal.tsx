"use client";

import Link from "next/link";
import { ArrowRight, Check, Droplets, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { healthJournalService } from "@/services/health-journal.service";
import type { HealthJournal } from "@/types/health-journal";

type Props = { goal: any; onUpdated?: () => void | Promise<void> };

const QUICK_ADD_ML = [250, 500, 750];
const DAY_TIME_ZONE = "Africa/Johannesburg";

function dayKey(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatNumber(value: number | null) {
  return value == null || !Number.isFinite(value) ? "—" : Math.round(value).toLocaleString("en-ZA");
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function targetInMillilitres(goal: any): number | null {
  const raw = goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue;
  if (raw === null || raw === undefined || raw === "") return null;
  const target = Number(raw);
  if (!Number.isFinite(target) || target <= 0) return null;
  const unit = String(goal?.unit ?? "").trim().toLowerCase().replace(/\s+/g, "");
  return ["l", "l/day", "liter", "litre", "liters", "litres", "liter/day", "litre/day", "liters/day", "litres/day"].includes(unit)
    ? target * 1000
    : target;
}

function updateJournalSummary(journalText: unknown, waterIntakeMl: number) {
  const existing = String(journalText ?? "")
    .replace(/\bWater:\s*[\d,.]+\s*ml\.?/gi, "")
    .replace(/Daily health check-in recorded\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return [existing, `Water: ${formatNumber(waterIntakeMl)} ml.`].filter(Boolean).join(" ");
}

function isTodayCheckIn(journal: HealthJournal, todayKey: string) {
  return journal.title === "Daily Health Check-in" && dayKey(journal.createdAt) === todayKey;
}

export default function TodayHydrationGoal({ goal, onUpdated }: Props) {
  const goalId = String(goal?.id ?? "");
  const targetMl = targetInMillilitres(goal);
  const [todayIntakeMl, setTodayIntakeMl] = useState<number | null>(null);
  const [todayJournal, setTodayJournal] = useState<HealthJournal | null>(null);
  const [customAmount, setCustomAmount] = useState("250");
  const [loading, setLoading] = useState(true);
  const [savingAmount, setSavingAmount] = useState<number | null>(null);

  const todayKey = useMemo(() => dayKey(new Date()), []);
  const journey = useMemo(() => {
    const startDate = new Date(String(goal?.createdAt ?? ""));
    const targetDate = new Date(String(goal?.targetDate ?? ""));
    const now = Date.now();
    return {
      journeyDay: Number.isNaN(startDate.getTime()) ? 1 : Math.max(1, Math.floor((now - startDate.getTime()) / 86400000) + 1),
      daysLeft: Number.isNaN(targetDate.getTime()) ? null : Math.max(0, Math.ceil((targetDate.getTime() - now) / 86400000)),
      targetDate,
    };
  }, [goal]);

  const loadToday = useCallback(async () => {
    try {
      const response = await healthJournalService.getAll({ limit: 100 });
      const journals = Array.isArray(response?.data) ? response.data : [];
      const found = journals
        .filter((journal) => isTodayCheckIn(journal, dayKey(new Date())))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
      setTodayJournal(found);
      const amount = found?.waterIntakeMl == null ? null : Number(found.waterIntakeMl);
      setTodayIntakeMl(amount != null && Number.isFinite(amount) && amount >= 0 ? amount : null);
    } catch {
      // Keep the last successfully loaded value visible during temporary network errors.
      toast.error("Hydration data could not be refreshed.", {
        description: "Check your connection and refresh Today to retry.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!active) return;
      await loadToday();
    };
    void refresh();
    const onCheckInUpdated = () => void refresh();
    window.addEventListener("sympto:health-checkin-updated", onCheckInUpdated);
    window.addEventListener("sympto:water-intake-updated", onCheckInUpdated);
    const interval = window.setInterval(() => void refresh(), 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("sympto:health-checkin-updated", onCheckInUpdated);
      window.removeEventListener("sympto:water-intake-updated", onCheckInUpdated);
    };
  }, [loadToday, goalId]);

  const intake = todayIntakeMl ?? 0;
  const progressPercent = targetMl != null ? Math.min(100, Math.round((intake / targetMl) * 100)) : 0;
  const remainingMl = targetMl == null ? null : Math.max(0, targetMl - intake);
  const targetReached = todayIntakeMl != null && targetMl != null && intake >= targetMl;
  const unusuallySmallTarget = targetMl != null && targetMl < 250;
  const ringSize = 104;
  const ringStroke = 10;
  const radius = (ringSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressPercent / 100);

  async function addWater(amount: number) {
    if (!Number.isFinite(amount) || amount === 0 || savingAmount !== null) return;
    const nextTotal = Math.max(0, intake + amount);
    setSavingAmount(amount);
    try {
      const journalText = updateJournalSummary(todayJournal?.journal, nextTotal);
      const saved = todayJournal
        ? await healthJournalService.update(todayJournal.id, {
            waterIntakeMl: nextTotal,
            journal: journalText,
          })
        : await healthJournalService.create({
            title: "Daily Health Check-in",
            journal: journalText,
            waterIntakeMl: nextTotal,
            notes: "Captured from the Hydration goal card on Today.",
          });
      setTodayJournal(saved);
      setTodayIntakeMl(nextTotal);
      setCustomAmount("250");
      window.dispatchEvent(new Event("sympto:water-intake-updated"));
      window.dispatchEvent(new Event("sympto:health-checkin-updated"));
      toast.success(amount > 0 ? `Added ${formatNumber(amount)} ml` : `Removed ${formatNumber(Math.abs(amount))} ml`, {
        description: `${formatNumber(nextTotal)} ml recorded for today.`,
      });
      await onUpdated?.();
    } catch (error: any) {
      const message = error?.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join(" ") : String(message || "Water intake could not be saved."));
    } finally {
      setSavingAmount(null);
    }
  }

  const formattedTarget = targetMl == null
    ? "Set a daily target"
    : targetMl >= 1000
      ? `${(targetMl / 1000).toLocaleString("en-ZA", { maximumFractionDigits: 2 })} L`
      : `${formatNumber(targetMl)} ml`;

  return (
    <article id={`today-goal-${goalId}`} className="flex h-full min-w-0 flex-col overflow-hidden rounded-[26px] border border-[#e5edef] bg-white shadow-[0_14px_36px_rgba(11,45,84,.07)]">
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[#e8f8f7] text-[#0b7b80] ring-1 ring-[#d3efed]"><Droplets className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-[-.035em] text-[#0b2d54]">{String(goal?.title || "Hydration")}</p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-[#8a99a6]">Water tracking · Today</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[8px] font-black ${loading || todayIntakeMl === null ? "bg-[#eef5f6] text-[#71879b]" : targetReached ? "bg-[#e8f8f7] text-[#0b7b80]" : "bg-[#eef5f6] text-[#547086]"}`}>
          {loading ? "Loading" : todayIntakeMl === null ? "Not logged" : targetReached ? "Goal reached" : "Keep sipping"}
        </span>
      </header>

      <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4">
        <section className="relative overflow-hidden rounded-[23px] bg-[#0b2d54] px-4 py-3.5 text-white shadow-[0_12px_28px_rgba(11,45,84,.14)] sm:px-5 sm:py-4">
          <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#24c1c4]/20 blur-2xl" />
          <div className="relative flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
              <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} className="-rotate-90" aria-hidden="true">
                <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={ringStroke} />
                {targetMl != null && <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="#24c1c4" strokeWidth={ringStroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />}
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <Droplets className="mx-auto mb-1 h-4 w-4 text-[#75e3e3]" />
                  <p className="text-[25px] font-black leading-none tracking-[-.06em]">{loading ? "—" : formatNumber(todayIntakeMl)}</p>
                  <p className="mt-1 text-[8px] font-black uppercase tracking-[.12em] text-white/45">ml today</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/40">Daily target</p>
                  <p className="mt-1 text-xl font-black leading-none tracking-[-.045em]">{targetMl == null ? "—" : formatNumber(targetMl)}</p>
                  <p className="mt-1 text-[9px] font-semibold text-white/50">{targetMl != null && targetMl >= 1000 ? "ml · " + formattedTarget : "millilitres"}</p>
                </div>
                <div className="border-l border-white/10 pl-3 sm:pl-4">
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/40">Progress</p>
                  <p className="mt-1 text-xl font-black leading-none tracking-[-.045em]">{todayIntakeMl == null || targetMl == null ? "—" : `${progressPercent}%`}</p>
                  <p className="mt-1 text-[9px] font-semibold text-white/50">{remainingMl == null ? "target needed" : remainingMl > 0 ? `${formatNumber(remainingMl)} ml to go` : "minimum met"}</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#24c1c4] transition-[width] duration-500" style={{ width: `${todayIntakeMl == null ? 0 : progressPercent}%` }} />
              </div>
              <p className="mt-2 text-[9px] font-semibold text-white/55">
                {todayIntakeMl == null ? "Log a drink or update water in your Daily Health Check-in." : targetReached ? "Your saved intake has reached its daily target." : "Small, regular drinks help you build a steady routine."}
              </p>
            </div>
          </div>
        </section>

        {unusuallySmallTarget && (
          <div className="mt-3 rounded-[15px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] leading-4 text-amber-900">
            Your saved target is {formatNumber(targetMl)} ml/day. Please verify the amount and unit in <Link href={`/health-goals#goal-${encodeURIComponent(goalId)}`} className="font-black underline underline-offset-2">Health Goals</Link>; Sympto has not changed it.
          </div>
        )}

        <section className="mt-3 rounded-[18px] border border-[#e1ecee] bg-[#f8fbfb] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#74859a]">Add water</p>
            <p className="text-[8px] font-bold text-[#91a0aa]">Quick log · ml</p>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {QUICK_ADD_ML.map((amount) => (
              <button key={amount} type="button" disabled={savingAmount !== null || loading} onClick={() => void addWater(amount)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#d9e9eb] bg-white px-2 py-2 text-[10px] font-black text-[#0b2d54] transition hover:border-[#24c1c4] hover:bg-[#effafa] disabled:cursor-not-allowed disabled:opacity-50">
                <Plus className="h-3 w-3 text-[#0b7b80]" /> {amount} ml
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <label htmlFor={`custom-water-${goalId}`} className="sr-only">Custom water amount in millilitres</label>
            <input id={`custom-water-${goalId}`} type="number" inputMode="numeric" min="1" max="5000" step="50" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#d7e4e8] bg-white px-3 text-xs font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" />
            <button type="button" disabled={savingAmount !== null || loading || !customAmount.trim() || !Number.isFinite(Number(customAmount)) || Number(customAmount) < 1 || Number(customAmount) > 5000} onClick={() => void addWater(Number(customAmount))} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-xl bg-[#0b2d54] px-3.5 py-2 text-[9px] font-black text-white disabled:opacity-50">
              {savingAmount !== null ? "Saving…" : "Add amount"}
            </button>
          </div>
          <button type="button" disabled={savingAmount !== null || loading || intake < 250} onClick={() => void addWater(-250)} className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-[9px] font-bold text-[#74859a] transition hover:bg-white hover:text-[#0b2d54] disabled:cursor-not-allowed disabled:opacity-40">
            <Minus className="h-3 w-3" /> Remove 250 ml
          </button>
        </section>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-[#e2ecef] bg-[#fbfdfd] px-3 py-2.5">
          <p className="min-w-0 text-[9px] font-semibold leading-4 text-[#74859a]">This total is saved to your Daily Health Check-in. Changes made in either place stay in sync.</p>
          <Link href="#daily-health-check-in" className="shrink-0 rounded-xl bg-[#0b2d54] px-3 py-2 text-[9px] font-black text-white">Check-in</Link>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[#edf2f4] bg-[#fbfdfd] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#9aa8b3]">Journey</p>
          <p className="mt-0.5 text-xs font-black text-[#0b2d54]">Day {journey.journeyDay}{journey.daysLeft !== null ? ` · ${journey.daysLeft} days left` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="hidden text-[8px] text-[#7d8d99] sm:block">until {formatDate(goal?.targetDate)}</p>
          <Link href={`/health-goals#goal-${encodeURIComponent(goalId)}`} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-xl border border-[#d6e4e7] bg-white px-3 py-2 text-[9px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </footer>
    </article>
  );
}
