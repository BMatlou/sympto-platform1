"use client";

import Link from "next/link";
import { ArrowRight, Wine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { TODAY_GOAL_CARD_CLASS, TODAY_GOAL_FOOTER_CLASS, TODAY_GOAL_HEADER_CLASS } from "@/components/today/today-goal-card-styles";

export interface AlcoholGoalData {
  id?: string;
  currentValue: number;
  targetValue: number;
  startedAt: string;
  targetDate: string;
  createdAt?: string;
  metricConfig?: { frequencyTarget?: number | string | null } | null;
  frequencyTarget?: number | string | null;
}

type AlcoholGoalCardProps = { goal: AlcoholGoalData; onUpdated?: () => void | Promise<void> };

function formatNumber(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function southAfricanWeekKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" });
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
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(date);
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
  const weeklyTarget = Number(goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue ?? 0);
  const hasTarget = Number.isFinite(weeklyTarget) && weeklyTarget > 0;
  const [thisWeekLogged, setThisWeekLogged] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    if (!goal?.id) return;
    const weekKey = southAfricanWeekKey();
    const weekKeyStorage = `sympto:alcohol-week:${goal.id}`;
    const totalStorage = `sympto:alcohol-total:${goal.id}`;
    const previousWeekKey = window.localStorage.getItem(weekKeyStorage);
    const storedTotal = window.localStorage.getItem(totalStorage);

    const syncWeekBaseline = async () => {
      if (previousWeekKey === weekKey && storedTotal !== null) {
        const localTotal = Math.max(0, Number(storedTotal));
        setThisWeekLogged(Number.isFinite(localTotal) ? localTotal : 0);
        return;
      }
      try {
        await healthGoalsService.update(goal.id!, { currentValue: "0" });
      } catch {
        // Keep the UI at zero for a new/unknown weekly baseline.
      }
      setThisWeekLogged(0);
      window.localStorage.setItem(weekKeyStorage, weekKey);
      window.localStorage.setItem(totalStorage, "0");
    };
    void syncWeekBaseline();
  }, [goal?.id]);

  const differenceDelta = thisWeekLogged - weeklyTarget;
  const budgetUsedPercentage = hasTarget ? Math.round((thisWeekLogged / weeklyTarget) * 100) : 0;
  const isAboveBudget = hasTarget && thisWeekLogged > weeklyTarget;
  const isAtOrAboveBudget = hasTarget && thisWeekLogged >= weeklyTarget;
  const remaining = Math.max(0, weeklyTarget - thisWeekLogged);
  const programDay = currentProgramDay(goal.startedAt || goal.createdAt || new Date().toISOString());
  const week = currentWeekNumber(goal.startedAt || goal.createdAt || new Date().toISOString());
  const targetDaysLeft = useMemo(() => daysUntilTarget(goal.targetDate), [goal.targetDate]);
  const targetDateLabel = useMemo(() => formatTargetDate(goal.targetDate), [goal.targetDate]);

  async function addDrinks() {
    const drinks = Number(draft);
    if (!goal?.id || !Number.isFinite(drinks) || drinks <= 0 || isAtOrAboveBudget) return;
    try {
      setSaving(true);
      await healthGoalsService.logAlcohol(goal.id, thisWeekLogged, drinks);
      const nextTotal = thisWeekLogged + drinks;
      setThisWeekLogged(nextTotal);
      window.localStorage.setItem(`sympto:alcohol-total:${goal.id}`, String(nextTotal));
      setDraft("");
      setLogOpen(false);
      await onUpdated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${TODAY_GOAL_CARD_CLASS} flex h-full min-w-0 flex-col`}>
      <div className={TODAY_GOAL_HEADER_CLASS}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e5f7f6] text-[#0b6f73]"><Wine className="h-4 w-4" /></span>
              <h3 className="text-xs font-black uppercase tracking-wide text-[#51677f]">Alcohol Moderation</h3>
            </div>
            <p className="mt-1 text-[10px] font-semibold text-[#7b8da1]">Day {programDay} of your program <span className="px-1 text-[#c1cbd4]">•</span> Week {week}</p>
          </div>
          <span className={`shrink-0 whitespace-nowrap text-[9px] font-black uppercase tracking-wide ${isAboveBudget ? "text-red-600" : isAtOrAboveBudget ? "text-slate-600" : "text-emerald-700"}`}>
            {isAboveBudget ? "⚠️ Above weekly target" : isAtOrAboveBudget ? "Weekly target reached" : "🟢 On track this week"}
          </span>
        </div>
      </div>

      <div className="flex-1 p-5">
        <div className={`text-sm font-semibold ${isAboveBudget ? "text-red-800" : "text-emerald-800"}`}>
          {isAboveBudget ? <>You are <strong>{formatNumber(Math.abs(differenceDelta))} drinks</strong> above this week&apos;s budget.</> : <>✓ On track this week — <strong>{formatNumber(remaining)} drinks remaining.</strong></>}
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-[#edf2f5] border-y border-[#edf2f5] py-3">
          <div className="px-2 text-center first:pl-0"><span className="block text-[9px] font-bold uppercase tracking-wide text-[#91a0ae]">This week</span><span className="mt-1 block text-sm font-black text-[#17314e]">{formatNumber(thisWeekLogged)} drinks</span></div>
          <div className="px-2 text-center"><span className="block text-[9px] font-bold uppercase tracking-wide text-[#91a0ae]">Weekly target</span><span className="mt-1 block text-sm font-black text-[#17314e]">≤ {formatNumber(weeklyTarget)}</span></div>
          <div className="px-2 text-center last:pr-0"><span className="block text-[9px] font-bold uppercase tracking-wide text-[#91a0ae]">Budget used</span><span className={`mt-1 block text-sm font-black ${isAboveBudget ? "text-red-600" : isAtOrAboveBudget ? "text-slate-600" : "text-emerald-700"}`}>{budgetUsedPercentage}%</span></div>
        </div>

        <div className="mt-4">
          <div className="flex items-end justify-between gap-3 text-[10px]"><span className="font-medium text-[#8a9aaa]">0 drinks</span><span className="font-bold text-[#667b91]">Weekly budget: {formatNumber(weeklyTarget)} drinks</span></div>
          <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-[#edf2f4]"><div className={`h-full rounded-full transition-all duration-500 ${isAboveBudget ? "bg-red-500" : isAtOrAboveBudget ? "bg-slate-400" : "bg-emerald-500"}`} style={{ width: `${Math.min(budgetUsedPercentage, 100)}%` }} /><span className="absolute inset-y-[-2px] right-0 w-px bg-[#0b2d54]/35" aria-hidden="true" /></div>
          <p className="mt-1.5 text-right text-[9px] font-medium text-[#96a3ae]">{isAboveBudget ? `${formatNumber(thisWeekLogged)} drinks logged` : isAtOrAboveBudget ? "Weekly target reached" : `${formatNumber(remaining)} drinks remaining`}</p>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-[#687d91]">{isAboveBudget ? <>You have gone past your weekly budget. Focus on stopping further intake for the rest of this week. Your budget resets Monday at 00:00.</> : isAtOrAboveBudget ? <>You have reached your weekly budget. No more drinks can be logged against this goal until the budget resets Monday at 00:00.</> : <>Pace yourself through the remaining days and keep your entries honest.</>}</p>

        {logOpen && !isAtOrAboveBudget && (
          <div className="mt-3 rounded-xl bg-[#f7fafb] p-3">
            <label htmlFor="alcohol-goal-drinks" className="text-[9px] font-black uppercase tracking-[0.14em] text-[#74859a]">Drinks to add</label>
            <div className="mt-2 flex gap-2"><input id="alcohol-goal-drinks" type="number" min="1" step="1" inputMode="numeric" value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#d7e4e8] bg-white px-3 text-sm font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" /><button type="button" disabled={saving || !draft} onClick={() => void addDrinks()} className="min-h-10 rounded-xl bg-[#0b2d54] px-4 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving…" : "Add"}</button></div>
            <button type="button" onClick={() => setLogOpen(false)} className="mt-2 text-[9px] font-bold text-[#74859a]">Cancel</button>
          </div>
        )}
      </div>

      <div className={TODAY_GOAL_FOOTER_CLASS}>
        <div className="mb-3 flex items-center justify-between gap-3 text-[10px] text-[#74859a]"><div><span className="block font-bold uppercase tracking-[0.12em] text-[#91a0ae]">Target date</span><span className="mt-0.5 block text-xs font-black text-[#0b2d54]">{targetDateLabel}</span><span className="block text-[9px] font-medium text-[#7b8da1]">{targetDaysLeft === 0 ? "Target date is today" : `${targetDaysLeft} days left to target`}</span></div></div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={isAtOrAboveBudget} aria-disabled={isAtOrAboveBudget} onClick={() => { if (isAtOrAboveBudget) return; setLogOpen(true); }} className={`min-h-10 rounded-xl px-3 py-2 text-[10px] font-black transition ${isAtOrAboveBudget ? "cursor-not-allowed bg-[#eef2f4] text-[#93a0aa]" : "bg-[#0b2d54] text-white hover:bg-[#123e66]"}`}>{saving ? "Saving…" : isAboveBudget ? "Weekly budget exceeded" : isAtOrAboveBudget ? "Weekly target reached" : logOpen ? "Close log" : "Log drinks"}</button>
          <Link href="/health-goals" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2 text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </div>
    </div>
  );
};

export default AlcoholGoalCard;
