"use client";

import Link from "next/link";
import { ArrowRight, Droplets } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { healthJournalService } from "@/services/health-journal.service";
import type { HealthJournal } from "@/types/health-journal";

type Props = { goal: any };

const DAY_TIME_ZONE = "Africa/Johannesburg";

function dayKey(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
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

function calendarDaysBetween(fromValue: unknown, toValue: unknown): number | null {
  const fromKey = dayKey(fromValue);
  const toKey = dayKey(toValue);
  if (!fromKey || !toKey) return null;

  const parseDay = (key: string) => {
    const [year, month, day] = key.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };

  return Math.round((parseDay(toKey) - parseDay(fromKey)) / 86400000);
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

function waterAmountFromJournal(journal: HealthJournal | null | undefined): number | null {
  if (!journal) return null;

  // The structured field is the source of truth, including a deliberately
  // recorded zero. Read the narrative only for older records that lack it.
  if (journal.waterIntakeMl !== null && journal.waterIntakeMl !== undefined) {
    const amount = Number(journal.waterIntakeMl);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  }

  const match = /\bWater:\s*([\d,.]+)\s*ml\b/i.exec(String(journal.journal ?? ""));
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function isTodayCheckIn(journal: HealthJournal, today: string) {
  return String(journal?.title ?? "").trim().toLowerCase() === "daily health check-in"
    && dayKey(journal.createdAt) === today;
}

function journalListFromResponse(response: any): HealthJournal[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

export default function TodayHydrationGoal({ goal }: Props) {
  const goalId = String(goal?.id ?? "");
  const targetMl = targetInMillilitres(goal);
  const [todayIntakeMl, setTodayIntakeMl] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const refreshVersion = useRef(0);

  const journey = useMemo(() => {
    const today = new Date();
    const elapsedCalendarDays = calendarDaysBetween(goal?.createdAt, today);
    const remainingCalendarDays = calendarDaysBetween(today, goal?.targetDate);
    return {
      // Journey days follow South African calendar dates, not elapsed 24-hour
      // periods. A goal created yesterday is already on Day 2 today.
      journeyDay: elapsedCalendarDays === null ? 1 : Math.max(1, elapsedCalendarDays + 1),
      daysLeft: remainingCalendarDays === null ? null : Math.max(0, remainingCalendarDays),
    };
  }, [goal?.createdAt, goal?.targetDate]);

  const loadToday = useCallback(async () => {
    const requestVersion = ++refreshVersion.current;
    try {
      const response = await healthJournalService.getAll({ limit: 100, page: 1 });
      const today = dayKey(new Date());
      const journals = journalListFromResponse(response);
      const found = journals
        .filter((journal) => isTodayCheckIn(journal, today))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
      // Do not let a slower, older request overwrite a newer check-in save event.
      if (requestVersion !== refreshVersion.current) return;
      setTodayIntakeMl(waterAmountFromJournal(found));
      setLastUpdatedAt(found?.updatedAt ?? found?.createdAt ?? null);
    } catch {
      // Keep the last confirmed value when a refresh temporarily fails.
    } finally {
      if (requestVersion === refreshVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const refresh = () => {
      if (active) void loadToday();
    };

    const onCheckInUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ journal?: HealthJournal; waterIntakeMl?: number | string | null }>).detail;
      const journal = detail?.journal;
      if (journal && isTodayCheckIn(journal, dayKey(new Date()))) {
        refreshVersion.current += 1;
        const explicitValue = detail?.waterIntakeMl;
        const parsedExplicitValue = explicitValue == null || explicitValue === "" ? null : Number(explicitValue);
        const journalValue = waterAmountFromJournal(journal);
        setTodayIntakeMl(
          parsedExplicitValue != null && Number.isFinite(parsedExplicitValue) && parsedExplicitValue >= 0
            ? parsedExplicitValue
            : journalValue,
        );
        setLastUpdatedAt(journal.updatedAt ?? journal.createdAt ?? new Date().toISOString());
        setLoading(false);
        return;
      }

      if (detail && detail.waterIntakeMl !== undefined) {
        refreshVersion.current += 1;
        const value = detail.waterIntakeMl == null || detail.waterIntakeMl === ""
          ? null
          : Number(detail.waterIntakeMl);
        if (value == null || (Number.isFinite(value) && value >= 0)) {
          setTodayIntakeMl(value);
          setLastUpdatedAt(new Date().toISOString());
          setLoading(false);
          return;
        }
      }

      refresh();
    };

    refresh();
    window.addEventListener("sympto:health-checkin-updated", onCheckInUpdated);
    const interval = window.setInterval(refresh, 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("sympto:health-checkin-updated", onCheckInUpdated);
    };
  }, [loadToday, goalId]);

  const progressPercent = todayIntakeMl != null && targetMl != null
    ? Math.min(100, Math.round((todayIntakeMl / targetMl) * 100))
    : 0;
  const remainingMl = targetMl == null || todayIntakeMl == null
    ? targetMl
    : Math.max(0, targetMl - todayIntakeMl);
  const targetReached = todayIntakeMl != null && targetMl != null && todayIntakeMl >= targetMl;
  const unusuallySmallTarget = targetMl != null && targetMl < 250;
  const ringSize = 104;
  const ringStroke = 10;
  const radius = (ringSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressPercent / 100);
  const formattedTarget = targetMl == null
    ? "Target not set"
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
                {targetMl != null && todayIntakeMl != null && <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="#24c1c4" strokeWidth={ringStroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />}
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
                  <p className="mt-1 text-[9px] font-semibold text-white/50">{targetMl != null && targetMl >= 1000 ? `ml · ${formattedTarget}` : "millilitres"}</p>
                </div>
                <div className="border-l border-white/10 pl-3 sm:pl-4">
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/40">Progress</p>
                  <p className="mt-1 text-xl font-black leading-none tracking-[-.045em]">{todayIntakeMl == null || targetMl == null ? "—" : `${progressPercent}%`}</p>
                  <p className="mt-1 text-[9px] font-semibold text-white/50">{remainingMl == null ? "target needed" : todayIntakeMl == null ? `${formatNumber(remainingMl)} ml target` : remainingMl > 0 ? `${formatNumber(remainingMl)} ml to go` : "minimum met"}</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#24c1c4] transition-[width] duration-500" style={{ width: `${todayIntakeMl == null ? 0 : progressPercent}%` }} />
              </div>
              <p className="mt-2 text-[9px] font-semibold text-white/55">
                {todayIntakeMl == null ? "Water intake will appear here after you save today's Daily Health Check-in." : targetReached ? "Your saved intake has reached its daily target." : "Keep recording water in your Daily Health Check-in; your progress updates here."}
              </p>
            </div>
          </div>
        </section>

        {unusuallySmallTarget && (
          <div className="mt-3 rounded-[15px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] leading-4 text-amber-900">
            Your saved target is {formatNumber(targetMl)} ml/day. Please verify the amount and unit in <Link href={`/health-goals#goal-${encodeURIComponent(goalId)}`} className="font-black underline underline-offset-2">Health Goals</Link>; Sympto has not changed it.
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-[#e2ecef] bg-[#fbfdfd] px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold leading-4 text-[#74859a]">Your Daily Health Check-in is the single place to record water. This card only displays the saved daily total.</p>
            {lastUpdatedAt && <p className="mt-1 text-[8px] text-[#9aa8b3]">Updated {new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit" }).format(new Date(lastUpdatedAt))}</p>}
          </div>
          <Link href="#daily-health-check-in" className="shrink-0 rounded-xl bg-[#0b2d54] px-3 py-2 text-[9px] font-black text-white">Open check-in</Link>
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
