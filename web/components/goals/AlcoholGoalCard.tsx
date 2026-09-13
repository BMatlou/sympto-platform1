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
  const remaining = Math.max(0, weeklyTarget - thisWeekLogged);
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
    <div className="flex h-full max-w-md flex-col rounded-2xl border border-[#dfebef] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Wine className="h-4 w-4 text-purple-700" />
            <h3 className="text-xs font-black uppercase tracking-wide text-[#51677f]">Alcohol Moderation</h3>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-[#7b8da1]">
            Day {programDay} of your program <span className="px-1 text-[#c1cbd4]">•</span> Week {week}
          </p>
        </div>
        <span
          className={`shrink-0 whitespace-nowrap text-[9px] font-black uppercase tracking-wide ${
            isAboveBudget ? "text-red-600" : "text-emerald-700"
          }`}
        >
          {isAboveBudget ? "⚠️ Above weekly target" : "🟢 On track this week"}
        </span>
      </div>

      <div className={`mt-4 text-sm font-semibold ${isAboveBudget ? "text-red-800" : "text-emerald-800"}`}>
        {isAboveBudget ? (
          <>You are <strong>{formatNumber(Math.abs(differenceDelta))} drinks</strong> above this week&apos;s budget.</>
        ) : (
          <>✓ On track this week — <strong>{formatNumber(remaining)} drinks remaining.</strong></>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-[#e6eef1] border-y border-[#e6eef1] py-3">
        <div className="px-2 text-center first:pl-0">
          <span className="block text-[9px] font-bold uppercase tracking-wide text-[#91a0ae]">This week</span>
          <span className="mt-1 block text-sm font-black text-[#17314e]">{formatNumber(thisWeekLogged)} drinks</span>
        </div>
        <div className="px-2 text-center">
          <span className="block text-[9px] font-bold uppercase tracking-wide text-[#91a0ae]">Weekly target</span>
          <span className="mt-1 block text-sm font-black text-[#17314e]">≤ {formatNumber(weeklyTarget)}</span>
        </div>
        <div className="px-2 text-center last:pr-0">
          <span className="block text-[9px] font-bold uppercase tracking-wide text-[#91a0ae]">Budget used</span>
          <span className={`mt-1 block text-sm font-black ${isAboveBudget ? "text-red-600" : "text-emerald-700"}`}>
            {budgetUsedPercentage}%
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-end justify-between gap-3 text-[10px]">
          <span className="font-medium text-[#8a9aaa]">0 drinks</span>
          <span className="font-bold text-[#667b91]">Weekly budget: {formatNumber(weeklyTarget)} drinks</span>
        </div>
        <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-[#edf2f4]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isAboveBudget ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(budgetUsedPercentage, 100)}%` }}
          />
          <span className="absolute inset-y-[-2px] right-0 w-px bg-[#0b2d54]/35" aria-hidden="true" />
        </div>
        <p className="mt-1.5 text-right text-[9px] font-medium text-[#96a3ae]">
          {isAboveBudget ? `${formatNumber(thisWeekLogged)} drinks logged` : `${formatNumber(remaining)} drinks remaining`}
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[#687d91]">
        {isAboveBudget ? (
          <>You have gone past your weekly budget. Focus on stopping further intake for the rest of this week. Your budget resets Monday at 00:00.</>
        ) : (
          <>Pace yourself through the remaining days and keep your entries honest.</>
        )}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-[#edf1f3] pt-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#91a0ae]">Target date</p>
          <p className="mt-0.5 text-xs font-black text-[#17314e]">{targetDateLabel}</p>
          <p className="text-[9px] font-medium text-[#7b8da1]">
            {targetDaysLeft === 0 ? "Target date is today" : `${targetDaysLeft} days left to target`}
          </p>
        </div>
        <Link href="/health-goals" className="inline-flex items-center gap-1 text-[10px] font-black text-[#0b2d54]">
          View goal <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {logOpen && (
        <div className="mt-3 rounded-xl bg-[#f7fafb] p-3">
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

      {!logOpen && (
        <button
          type="button"
          onClick={() => setLogOpen(true)}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#0b2d54] px-3 py-2 text-[10px] font-black text-white"
        >
          Log drinks
        </button>
      )}
    </div>
  );
};

export default AlcoholGoalCard;
