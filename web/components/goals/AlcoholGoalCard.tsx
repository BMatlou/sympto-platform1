"use client";

import Link from "next/link";
import { ArrowRight, Wine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";

export interface AlcoholGoalData {
  id?: string;
  currentValue: number;
  targetValue: number;
  startedAt: string;
  targetDate: string;
  createdAt?: string;
  metricConfig?: {
    frequencyTarget?: number | string | null;
  } | null;
  frequencyTarget?: number | string | null;
}

type AlcoholGoalCardProps = {
  goal: AlcoholGoalData;
  onUpdated?: () => void | Promise<void>;
};

function formatNumber(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function southAfricanWeekKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = localDate.getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  localDate.setUTCDate(localDate.getUTCDate() - daysFromMonday);
  return localDate.toISOString().slice(0, 10);
}

function calendarMidnight(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatTargetDate(value: string | Date) {
  const date = calendarMidnight(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function currentProgramDay(startedAt: string) {
  const start = calendarMidnight(startedAt);
  const today = calendarMidnight(new Date());
  if (!start || !today) return 1;
  const days = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return Math.max(1, days + 1);
}

function currentWeekNumber(startedAt: string) {
  const start = calendarMidnight(startedAt);
  const today = calendarMidnight(new Date());
  if (!start || !today) return 1;
  const days = Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
  return Math.max(1, Math.floor(days / 7) + 1);
}

function daysUntilTarget(targetDate: string) {
  const target = calendarMidnight(targetDate);
  const today = calendarMidnight(new Date());
  if (!target || !today) return 0;
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

export const AlcoholGoalCard: React.FC<AlcoholGoalCardProps> = ({ goal, onUpdated }) => {
  const weeklyTarget = Number(
    goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue ?? 0,
  );
  const hasTarget = Number.isFinite(weeklyTarget) && weeklyTarget > 0;
  const [thisWeekLogged, setThisWeekLogged] = useState(Number(goal?.currentValue ?? 0));
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    if (!goal?.id) return;

    const weekKey = southAfricanWeekKey();
    const storageKey = `sympto:alcohol-week:${goal.id}`;
    const previousWeekKey = window.localStorage.getItem(storageKey);

    const syncWeekBaseline = async () => {
      if (previousWeekKey && previousWeekKey !== weekKey) {
        try {
          await healthGoalsService.update(goal.id!, { currentValue: "0" });
          setThisWeekLogged(0);
        } catch {
          setThisWeekLogged(Number(goal.currentValue ?? 0));
        }
      } else {
        setThisWeekLogged(Number(goal.currentValue ?? 0));
      }

      window.localStorage.setItem(storageKey, weekKey);
    };

    void syncWeekBaseline();
  }, [goal?.id, goal?.currentValue]);

  const differenceDelta = thisWeekLogged - weeklyTarget;
  const budgetUsedPercentage = hasTarget
    ? Math.round((thisWeekLogged / weeklyTarget) * 100)
    : 0;
  const isAboveBudget = hasTarget && thisWeekLogged > weeklyTarget;
  const programDay = currentProgramDay(goal.startedAt || goal.createdAt || new Date().toISOString());
  const week = currentWeekNumber(goal.startedAt || goal.createdAt || new Date().toISOString());
  const targetDaysLeft = useMemo(() => daysUntilTarget(goal.targetDate), [goal.targetDate]);
  const targetDateLabel = useMemo(() => formatTargetDate(goal.targetDate), [goal.targetDate]);

  async function addDrinks() {
    const drinks = Number(draft);
    if (!goal?.id || !Number.isFinite(drinks) || drinks <= 0) return;

    try {
      setSaving(true);
      await healthGoalsService.logAlcohol(goal.id, thisWeekLogged, drinks);
      setThisWeekLogged((current) => current + drinks);
      setDraft("");
      setLogOpen(false);
      await onUpdated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full max-w-md flex-col space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Wine className="h-4 w-4 text-emerald-700" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Alcohol Moderation</h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-gray-500">
            <span>Day {programDay} of your program</span>
            <span aria-hidden="true" className="text-gray-300">•</span>
            <span>Week {week}</span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-bold tracking-wide ${
            isAboveBudget
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {isAboveBudget ? "⚠️ ABOVE WEEKLY TARGET" : "🟢 ON TRACK THIS WEEK"}
        </span>
      </div>

      {isAboveBudget ? (
        <div className="rounded-xl border border-red-100 bg-red-50/50 p-3 text-xs font-medium leading-normal text-red-900">
          You are <strong>{formatNumber(Math.abs(differenceDelta))} drinks</strong> above this week&apos;s budget. Every choice from here still counts.
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs font-semibold leading-normal text-emerald-900">
          ✓ On track this week — <strong>{formatNumber(Math.max(0, weeklyTarget - thisWeekLogged))} drinks remaining</strong>.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 border-b border-t border-dashed border-gray-100 py-3 text-center text-xs">
        <div className="min-w-0">
          <span className="block text-[10px] font-medium uppercase text-gray-400">This week</span>
          <span className="mt-1 block font-bold text-gray-900">{formatNumber(thisWeekLogged)} drinks</span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-medium uppercase text-gray-400">Weekly target</span>
          <span className="mt-1 block font-bold text-gray-900">≤ {formatNumber(weeklyTarget)} drinks</span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-medium uppercase text-gray-400">Budget used</span>
          <span className={`mt-1 block font-mono font-bold ${isAboveBudget ? "text-red-600" : "text-emerald-600"}`}>
            {budgetUsedPercentage}%
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full transition-all duration-500 ease-out ${isAboveBudget ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(budgetUsedPercentage, 100)}%` }}
          />
          <span className="absolute inset-y-0 right-0 w-px bg-[#0b2d54]/40" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between gap-3 text-[10px] text-gray-400">
          <span>0 drinks</span>
          <span className="font-semibold text-gray-500">Weekly budget: {formatNumber(weeklyTarget)} drinks</span>
          {isAboveBudget && <span className="font-bold text-red-500">{formatNumber(thisWeekLogged)} logged</span>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] font-normal leading-relaxed text-slate-700">
        {isAboveBudget ? (
          <>You have gone past your weekly budget of {formatNumber(weeklyTarget)} drinks. Focus on stopping further intake for the remainder of the week cycle. Your weekly budget resets on <strong>Monday at 00:00</strong>.</>
        ) : (
          <>You are managing your weekly budget well. You have <strong>{formatNumber(Math.max(0, weeklyTarget - thisWeekLogged))} drinks remaining</strong>. Pace yourself through the remaining days and keep your entries honest.</>
        )}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-center">
        <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-gray-400">Target date</div>
        <div className="mt-0.5 text-sm font-bold text-[#0b2d54]">{targetDateLabel}</div>
        <div className="mt-0.5 text-[10px] font-medium text-gray-500">
          {targetDaysLeft === 0 ? "Target date is today" : `${targetDaysLeft} days left to target`}
        </div>
      </div>

      {logOpen && (
        <div className="rounded-xl bg-[#f7fafb] p-3">
          <label htmlFor="alcohol-goal-drinks" className="text-[9px] font-black uppercase tracking-[0.14em] text-[#74859a]">
            Drinks to add
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="alcohol-goal-drinks"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#d7e4e8] bg-white px-3 text-sm font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]"
            />
            <button
              type="button"
              disabled={saving || !draft}
              onClick={() => void addDrinks()}
              className="min-h-10 rounded-xl bg-[#0b2d54] px-4 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add"}
            </button>
          </div>
          <button type="button" onClick={() => setLogOpen(false)} className="mt-2 text-[9px] font-bold text-[#74859a]">
            Cancel
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => setLogOpen((current) => !current)}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0b2d54] px-3 py-2 text-[10px] font-black text-white"
        >
          {logOpen ? "Close log" : "Log drinks"}
        </button>
        <Link href="/health-goals" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2 text-[10px] font-black text-[#0b2d54]">
          View goal <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
};

export default AlcoholGoalCard;
