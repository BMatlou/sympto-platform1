"use client";

import Link from "next/link";
import { ArrowRight, Moon, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { healthJournalService } from "@/services/health-journal.service";
import GoalCardDisclosureButton from "@/components/today/goal-card-disclosure-button";

type Props = { goal: any; onUpdated?: () => void | Promise<void>; detailsExpanded?: boolean; onToggleDetails?: () => void };
type SleepEntry = { day: string; value: number; occurredAt: string };

function sleepDayKey(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return String(values.year) + "-" + String(values.month) + "-" + String(values.day);
}

function sleepDayOrdinal(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  if (![year, month, date].every(Number.isFinite)) return Number.NaN;
  return Math.floor(Date.UTC(year, month - 1, date) / 86400000);
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDate(value: unknown, withYear = false) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
  }).format(date);
}

function formatJourneyDate(value: unknown) {
  return formatDate(value, true);
}

export default function TodaySleepGoal({ goal, detailsExpanded, onToggleDetails }: Props) {
  const [history, setHistory] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const goalId = String(goal?.id ?? "");
  const targetRaw = goal?.targetValue ?? goal?.metricConfig?.frequencyTarget;
  const targetNumber = targetRaw === null || targetRaw === undefined || targetRaw === "" ? null : Number(targetRaw);
  const target = targetNumber != null && Number.isFinite(targetNumber) && targetNumber > 0 ? targetNumber : null;

  const journey = useMemo(() => {
    const now = new Date();
    const todayOrdinal = sleepDayOrdinal(sleepDayKey(now));
    const startOrdinal = sleepDayOrdinal(sleepDayKey(goal?.createdAt));
    const endOrdinal = goal?.targetDate ? sleepDayOrdinal(sleepDayKey(goal.targetDate)) : Number.NaN;
    return {
      day: Number.isFinite(startOrdinal) ? Math.max(1, todayOrdinal - startOrdinal + 1) : 1,
      daysLeft: Number.isFinite(endOrdinal) ? Math.max(0, endOrdinal - todayOrdinal) : null,
    };
  }, [goal]);

  const loadSleep = useCallback(async () => {
    const now = new Date();
    const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const [metricResult, journalResult] = await Promise.allSettled([
      healthGoalsService.getMetricEvents("SLEEP", "sleep.hours", from, now),
      healthJournalService.getAll({ page: 1, limit: 100 }),
    ]);

    const metricEvents = metricResult.status === "fulfilled" && Array.isArray(metricResult.value?.events)
      ? metricResult.value.events.map((event: any) => {
          const occurredAt = String(event?.occurredAt ?? "");
          const recordedAt = new Date(occurredAt).getTime();
          return {
            day: sleepDayKey(occurredAt),
            value: Number(event?.loggedValue),
            occurredAt,
            recordedAt,
            priority: 1,
          };
        }).filter((event: any) =>
          event.day && Number.isFinite(event.value) && event.value >= 0 && Number.isFinite(event.recordedAt),
        )
      : [];

    const journals = journalResult.status === "fulfilled" && Array.isArray(journalResult.value?.data)
      ? journalResult.value.data
      : [];
    const checkIns = journals
      .filter((entry: any) =>
        String(entry?.title ?? "") === "Daily Health Check-in"
        && entry?.sleepHours !== null
        && entry?.sleepHours !== undefined
        && entry?.sleepHours !== ""
        && Number.isFinite(Number(entry.sleepHours))
        && Number(entry.sleepHours) >= 0,
      )
      .map((entry: any) => {
        const occurredAt = String(entry?.createdAt ?? entry?.updatedAt ?? "");
        const recordedAt = new Date(String(entry?.updatedAt ?? entry?.createdAt ?? "")).getTime();
        return {
          day: sleepDayKey(occurredAt),
          value: Number(entry.sleepHours),
          occurredAt,
          recordedAt,
          priority: 2,
        };
      })
      .filter((entry: any) => entry.day && Number.isFinite(entry.recordedAt));

    const latestByDay = new Map<string, any>();
    for (const entry of [...metricEvents, ...checkIns]) {
      const existing = latestByDay.get(entry.day);
      if (
        !existing
        || entry.priority > existing.priority
        || (entry.priority === existing.priority && entry.recordedAt >= existing.recordedAt)
      ) {
        latestByDay.set(entry.day, entry);
      }
    }

    const entries: SleepEntry[] = Array.from(latestByDay.values())
      .sort((a: any, b: any) => a.day.localeCompare(b.day))
      .map((entry: any) => ({
        day: entry.day,
        value: Number(entry.value),
        occurredAt: String(entry.occurredAt),
      }));

    setHistory(entries);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!active) return;
      await loadSleep();
    };
    void refresh();
    const handleUpdated = () => void refresh();
    const interval = window.setInterval(() => void refresh(), 30000);
    window.addEventListener("sympto:health-checkin-updated", handleUpdated);
    window.addEventListener("sympto:today-action-updated", handleUpdated);
    window.addEventListener("sympto:health-goal-updated", handleUpdated);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("sympto:health-checkin-updated", handleUpdated);
      window.removeEventListener("sympto:today-action-updated", handleUpdated);
      window.removeEventListener("sympto:health-goal-updated", handleUpdated);
    };
  }, [loadSleep]);

  const latest = history.length > 0 ? history[history.length - 1] : null;
  const current = latest?.value ?? null;
  const progress = current != null && target != null ? Math.min(1, current / target) : 0;
  const progressPercent = Math.round(progress * 100);
  const targetMet = current != null && target != null && current >= target;
  const todayKey = sleepDayKey(new Date());
  const latestIsToday = latest?.day === todayKey;

  const recent = useMemo(() => {
    const todayOrdinal = sleepDayOrdinal(sleepDayKey(new Date()));
    const recentSeven = history.filter((entry) => {
      const offset = todayOrdinal - sleepDayOrdinal(entry.day);
      return offset >= 0 && offset <= 6;
    });
    const previousSeven = history.filter((entry) => {
      const offset = todayOrdinal - sleepDayOrdinal(entry.day);
      return offset >= 7 && offset <= 13;
    });
    const average = (entries: SleepEntry[]) => entries.length
      ? entries.reduce((sum, entry) => sum + entry.value, 0) / entries.length
      : null;
    const recentAverage = average(recentSeven);
    const previousAverage = average(previousSeven);
    const targetNights = target == null ? null : recentSeven.filter((entry) => entry.value >= target).length;
    let trendTitle = "Building a trend";
    let trendText = "Keep recording sleep in the Daily Health Check-in. Sympto needs at least 3 recorded nights in each 7-day period before comparing weekly averages.";
    let trend: "UP" | "DOWN" | "STEADY" | "BUILDING" = "BUILDING";

    if (recentSeven.length >= 3 && previousSeven.length >= 3 && recentAverage != null && previousAverage != null) {
      const delta = recentAverage - previousAverage;
      if (delta >= 0.5) {
        trend = "UP";
        trendTitle = "Average sleep is higher";
      } else if (delta <= -0.5) {
        trend = "DOWN";
        trendTitle = "Average sleep has dipped";
      } else {
        trend = "STEADY";
        trendTitle = "Average sleep is steady";
      }
      trendText = "The 7-day average changed by " + (delta > 0 ? "+" : "") + delta.toFixed(1) + " hours compared with the previous week.";
    } else {
      trendText = "You have " + recentSeven.length + " recorded " + (recentSeven.length === 1 ? "night" : "nights") + " in the latest week and " + previousSeven.length + " in the previous week. Keep recording to establish a reliable comparison.";
    }

    return { recentSeven, recentAverage, previousAverage, targetNights, trend, trendTitle, trendText };
  }, [history, target]);

  const ringSize = 100;
  const ringStroke = 9;
  const radius = (ringSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <article
      id={"today-goal-" + encodeURIComponent(goalId)}
      className={detailsExpanded ? "flex flex-1 h-auto min-h-[480px] min-w-0 flex-col overflow-visible rounded-[26px] border border-[#e5edef] bg-white shadow-[0_14px_36px_rgba(11,45,84,.07)]" : "flex flex-1 h-auto min-h-[480px] min-w-0 flex-col overflow-visible rounded-[26px] border border-[#e5edef] bg-white shadow-[0_14px_36px_rgba(11,45,84,.07)]"}
    >
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[#e8f8f7] text-[#24c1c4] ring-1 ring-[#d3efed]">
            <Moon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-[-.035em] text-[#0b2d54]">{String(goal?.title || "Sleep goal")}</p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-[#8a99a6]">Daily progress · hours/night</p>
          </div>
        </div>
        <span className={"shrink-0 rounded-full px-2.5 py-1 text-[8px] font-black " + (
          current == null ? "bg-[#eef5f6] text-[#71879b]" : targetMet ? "bg-[#e8f8f7] text-[#0b7b80]" : "bg-amber-50 text-amber-800"
        )}>
          {current == null ? (loading ? "Loading" : "Not logged") : target == null ? "Logged" : targetMet ? "Target met" : "Below target"}
        </span>
      </header>

      <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4">
        <section className="relative overflow-hidden rounded-[23px] bg-[#0b2d54] px-4 py-3.5 text-white shadow-[0_12px_28px_rgba(11,45,84,.14)] sm:px-5 sm:py-4">
          <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#24c1c4]/18 blur-2xl" />
          <div className="relative flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
              <svg width={ringSize} height={ringSize} viewBox={"0 0 " + ringSize + " " + ringSize} className="-rotate-90" aria-hidden="true">
                <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={ringStroke} />
                {current != null && target != null && (
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={radius}
                    fill="none"
                    stroke={targetMet ? "#24c1c4" : "#8ee7e5"}
                    strokeWidth={ringStroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                  />
                )}
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-3xl font-black leading-none tracking-[-.07em]">{current == null ? "—" : formatNumber(current)}</p>
                  <p className="mt-1 text-[8px] font-black uppercase tracking-[.12em] text-white/45">hours</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/40">Nightly target</p>
                  <p className="mt-1 text-xl font-black leading-none tracking-[-.045em]">{target == null ? "—" : formatNumber(target)}</p>
                  <p className="mt-1 text-[9px] font-semibold text-white/50">hours per night</p>
                </div>
                <div className="border-l border-white/10 pl-3 sm:pl-4">
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/40">Latest night</p>
                  <p className="mt-1 text-xl font-black leading-none tracking-[-.045em]">{current == null ? "—" : formatNumber(current)}</p>
                  <p className="mt-1 text-[9px] font-semibold text-white/50">{latest ? formatDate(latest.occurredAt) : "not recorded"}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-1.5 text-[9px] font-black text-[#b8ffff] ring-1 ring-white/10">
                  {current == null || target == null ? "Track your sleep" : progressPercent + "% of target"}
                </span>
                {current != null && target != null && (
                  <span className="text-[9px] font-semibold text-white/55">
                    {targetMet ? "Target met" : formatNumber(target - current) + " hours below target"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="relative mt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-white/40">Latest-night progress</p>
              <span className="text-[9px] font-black text-white">{current == null || target == null ? "—" : progressPercent + "%"}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#24c1c4] transition-all" style={{ width: Math.max(0, progressPercent) + "%" }} />
            </div>
            <p className="mt-2 text-[9px] leading-4 text-white/55">
              {current == null
                ? "Record sleep in your Daily Health Check-in. Your latest value and progress will appear here."
                : targetMet
                  ? "Your latest recorded night met the saved target. Keep logging to build a useful personal trend."
                  : "Your latest recorded night was " + formatNumber(current) + " hours against a " + formatNumber(target) + "-hour target."}
            </p>
          </div>
        </section>

        {onToggleDetails && <div className="px-3.5 pb-1 sm:px-4"><GoalCardDisclosureButton expanded={Boolean(detailsExpanded)} onToggle={onToggleDetails} label="Show sleep insights" /></div>}

        {detailsExpanded && (
        <section className="mt-3 rounded-[18px] border border-[#e2ecef] bg-[#fbfdfd] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#0b7b80]">Recent sleep</p>
              <p className="mt-1 text-[10px] font-semibold text-[#758896]">Last 7 days · recorded nights only</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#8a99a6]">Average</p>
              <p className="mt-0.5 text-lg font-black tracking-[-.04em] text-[#0b2d54]">
                {recent.recentAverage == null ? "—" : recent.recentAverage.toFixed(1) + " h"}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[14px] bg-white p-3 ring-1 ring-[#e4edef]">
              <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#82939f]">Nights at target</p>
              <p className="mt-1 text-base font-black text-[#0b2d54]">
                {recent.targetNights == null || recent.recentSeven.length === 0 ? "—" : recent.targetNights + " / " + recent.recentSeven.length}
              </p>
            </div>
            <div className="rounded-[14px] bg-white p-3 ring-1 ring-[#e4edef]">
              <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#82939f]">Weekly trend</p>
              <div className="mt-1 flex items-center gap-1.5">
                {recent.trend === "UP"
                  ? <TrendingUp className="h-3.5 w-3.5 text-[#0b7b80]" />
                  : recent.trend === "DOWN"
                    ? <TrendingDown className="h-3.5 w-3.5 text-[#8d6a64]" />
                    : <Moon className="h-3.5 w-3.5 text-[#0b7b80]" />}
                <p className="text-[9px] font-black leading-4 text-[#0b2d54]">{recent.trendTitle}</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[9px] leading-4 text-[#74859a]">{recent.trendText}</p>
        </section>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-[#e2ecef] bg-[#fbfdfd] px-3 py-2.5">
          <p className="min-w-0 text-[9px] font-semibold leading-4 text-[#74859a]">
            {latestIsToday
              ? "Sleep is up to date for today. Use the check-in to update the saved duration if needed."
              : "Sleep is recorded through your Daily Health Check-in so the goal stays connected to your health journal."}
          </p>
          <Link href="#daily-health-check-in" className="shrink-0 rounded-xl bg-[#0b2d54] px-3 py-2 text-[9px] font-black text-white">
            {latestIsToday ? "Update" : "Check in"}
          </Link>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[#edf2f4] bg-[#fbfdfd] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#9aa8a6]">Journey</p>
          <p className="mt-0.5 text-xs font-black text-[#0b2d54]">
            Day {journey.day}{journey.daysLeft !== null ? " · " + journey.daysLeft + " days left" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="hidden text-[8px] text-[#7d8d99] sm:block">until {formatJourneyDate(goal?.targetDate)}</p>
          <Link
            href={"/health-goals#goal-" + encodeURIComponent(goalId)}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-xl border border-[#d6e4e7] bg-white px-3 py-2 text-[9px] font-black text-[#0b2d54]"
          >
            View goal <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </footer>
    </article>
  );
}
