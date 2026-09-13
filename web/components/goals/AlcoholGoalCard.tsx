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

function mondayStart(date = new Date()) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() + diff);
  return result;
}

function nextMondayStart(date = new Date()) {
  const result = mondayStart(date);
  result.setDate(result.getDate() + 7);
  return result;
}

function formatDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-ZA");
}

function currentWeekNumber(startedAt: string) {
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) return 1;
  const startWeek = mondayStart(start);
  const nowWeek = mondayStart();
  return Math.max(1, Math.floor((nowWeek.getTime() - startWeek.getTime()) / (7 * 86400000)) + 1);
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
    let cancelled = false;

    const loadWeeklyTotal = async () => {
      if (!goal?.id) return;
      try {
        const response = await healthGoalsService.getMetricEvents(
          "ALCOHOL",
          "alcohol.drinks",
          mondayStart(),
          nextMondayStart(),
        );
        if (cancelled) return;
        const total = response.events.reduce((sum, event) => {
          const value = Number(event.loggedValue);
          return Number.isFinite(value) ? sum + value : sum;
        }, 0);
        setThisWeekLogged(total);
      } catch {
        if (!cancelled) setThisWeekLogged(Number(goal.currentValue ?? 0));
      }
    };

    void loadWeeklyTotal();
    const interval = window.setInterval(() => {
      void loadWeeklyTotal();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [goal?.id, goal?.currentValue]);

  const differenceDelta = thisWeekLogged - weeklyTarget;
  const budgetUsedPercentage = hasTarget
    ? Math.round((thisWeekLogged / weeklyTarget) * 100)
    : 0;
  const isAboveBudget = hasTarget && thisWeekLogged > weeklyTarget;
  const daysLeft = useMemo(() => {
    const currentDate = new Date();
    const deadlineDate = new Date(goal.targetDate);
    if (Number.isNaN(deadlineDate.getTime())) return 0;
    return Math.max(0, Math.ceil((deadlineDate.getTime() - currentDate.getTime()) / 86400000));
  }, [goal.targetDate]);
  const week = currentWeekNumber(goal.startedAt || goal.createdAt || new Date().toISOString());

  async function addDrinks() {
    const drinks = Number(draft);
    if (!Number.isFinite(drinks) || drinks <= 0) return;

    try {
      setSaving(true);
      await healthGoalsService.logAlcohol(drinks);
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wine className="h-4 w-4 text-emerald-700" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Alcohol Moderation</h3>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-gray-500">📅 Week {week} of your program</p>
        </div>
        <span
          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
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
          ❗ You are <strong>{differenceDelta} drinks</strong> above this week&apos;s budget. Every choice from here still counts.
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs font-semibold leading-normal text-emerald-900">
          ✓ On track this week — {formatNumber(Math.max(0, weeklyTarget - thisWeekLogged))} drinks remaining.
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 border-b border-t border-dashed border-gray-100 py-3 text-center text-xs">
        <div>
          <span className="block text-[10px] font-medium uppercase text-gray-400">This week</span>
          <span className="mt-0.5 block font-bold text-gray-900">{formatNumber(thisWeekLogged)} drinks</span>
        </div>
        <div>
          <span className="block text-[10px] font-medium uppercase text-gray-400">Weekly Target</span>
          <span className="mt-0.5 block font-bold text-gray-900">≤ {formatNumber(weeklyTarget)} drinks</span>
        </div>
        <div>
          <span className="block text-[10px] font-medium uppercase text-gray-400">Budget Used</span>
          <span className={`mt-0.5 block font-mono font-bold ${isAboveBudget ? "text-red-600" : "text-emerald-600"}`}>
            {budgetUsedPercentage}%
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full transition-all duration-500 ease-out ${isAboveBudget ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(budgetUsedPercentage, 100)}%` }}
          />
          <span className="absolute inset-y-0 right-0 w-px bg-[#0b2d54]/40" aria-hidden="true" />
        </div>
        <div className="flex justify-between gap-2 font-mono text-[9px] text-gray-400">
          <span>0 drinks</span>
          <span>Budget: {formatNumber(weeklyTarget)} max</span>
          {isAboveBudget && <span className="font-bold text-red-500">Current: {formatNumber(thisWeekLogged)}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] font-normal leading-relaxed text-slate-700">
        {isAboveBudget ? (
          <>
            You have gone past your weekly budget of {formatNumber(weeklyTarget)} drinks. Focus on stopping further intake for the remainder of the week cycle. Sympto will automatically reset your budget on <strong>Monday morning at 00:00</strong> to help you start fresh.
          </>
        ) : (
          <>
            You are managing your budget well. Your weekly allowance is {formatNumber(weeklyTarget)} drinks. Pace yourself through the remaining days while keeping your entries honest.
          </>
        )}
      </div>

      <div className="text-right font-mono text-[10px] text-gray-400">
        ⏳ {daysLeft} days left until your target date ({formatDate(goal.targetDate)})
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
