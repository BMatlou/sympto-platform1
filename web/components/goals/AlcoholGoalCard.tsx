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
    let active = true;
    async function loadWeek() {
      if (!goal?.id) return;
      const today = new Date();
      const weekKey = southAfricanWeekKey(today);
      const weekStart = new Date(`${weekKey}T00:00:00+02:00`);
      try {
        const response = await healthGoalsService.getMetricEvents(
          "ALCOHOL",
          "alcohol.drinks",
          weekStart,
          today,
          "patient-alcohol-log",
        );
        if (!active) return;
        const total = (response.events ?? []).reduce((sum, event) => {
          const value = Number(event.loggedValue);
          return sum + (Number.isFinite(value) ? value : 0);
        }, 0);
        setThisWeekLogged(Math.max(0, Number(total.toFixed(2))));
      } catch {
        if (active) setThisWeekLogged(0);
      }
    }

    void loadWeek();
    const handleUpdated = () => void loadWeek();
    const interval = window.setInterval(() => void loadWeek(), 15000);
    window.addEventListener("sympto:health-goal-updated", handleUpdated);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("sympto:health-goal-updated", handleUpdated);
    };
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
    if (!goal?.id || !Number.isFinite(drinks) || drinks <= 0) return;
    try {
      setSaving(true);
      const result = await healthGoalsService.logAlcohol(goal.id!, drinks);
      const nextTotal = Number(result?.journal?.weeklyTotal);
      setThisWeekLogged(Number.isFinite(nextTotal) ? nextTotal : thisWeekLogged + drinks);
      setDraft("");
      setLogOpen(false);
      window.dispatchEvent(new Event("sympto:health-goal-updated"));
      await onUpdated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[30px] border border-[#dfeaec] bg-white shadow-[0_18px_48px_rgba(11,45,84,.06)]">
      <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80] ring-1 ring-[#d8efed]"><Wine className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-[-.035em] text-[#0b2d54]">Alcohol Moderation</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#84969e]">Day {programDay} · Week {week}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black ${isAboveBudget ? "bg-red-50 text-red-700" : isAtOrAboveBudget ? "bg-slate-100 text-slate-600" : "bg-[#e8f8f7] text-[#0b7b80]"}`}>
          {isAboveBudget ? "Above target" : isAtOrAboveBudget ? "Target reached" : "On track"}
        </span>
      </div>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="relative overflow-hidden rounded-[27px] bg-[#0b2d54] p-5 text-white shadow-[0_16px_34px_rgba(11,45,84,.16)] sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#24c1c4]/18 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-[#24c1c4]/10 blur-3xl" />

          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative shrink-0">
              <div className="relative grid h-[148px] w-[148px] place-items-center rounded-full" style={{ background: `conic-gradient(${isAboveBudget ? "#f87171" : "#24c1c4"} 0 ${Math.min(budgetUsedPercentage, 100)}%, rgba(255,255,255,.12) ${Math.min(budgetUsedPercentage, 100)}% 100%)` }}>
                <div className="absolute inset-[10px] rounded-full bg-[#0b2d54] ring-1 ring-white/10" />
                <div className="relative z-10 text-center"><p className="text-[38px] font-black leading-none tracking-[-.07em]">{formatNumber(thisWeekLogged)}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.15em] text-white/45">drinks</p></div>
              </div>
            </div>

            <div className="min-w-0 flex-1 text-center sm:pl-2 sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/50">This week</p>
              <p className="mt-2 text-[31px] font-black leading-none tracking-[-.065em]">{formatNumber(thisWeekLogged)}<span className="ml-1.5 text-base font-bold tracking-normal text-white/55">/ {formatNumber(weeklyTarget)}</span></p>
              <p className="mt-2 text-xs font-semibold text-white/65">{remaining > 0 ? `${formatNumber(remaining)} drinks remaining` : isAboveBudget ? `${formatNumber(Math.abs(differenceDelta))} drinks above target` : "Weekly target reached"}</p>
              <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black text-white/80 ring-1 ring-white/10">{budgetUsedPercentage}% of weekly budget</div>
            </div>
          </div>

          <div className="relative mt-6 border-t border-white/10 pt-5">
            <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">Weekly budget</p><p className="mt-1 text-sm font-bold text-white">≤ {formatNumber(weeklyTarget)} drinks</p></div><p className="text-right text-[10px] font-bold text-white/50">{targetDaysLeft === 0 ? "Target date today" : `${targetDaysLeft} days left`}</p></div>
          </div>

          {logOpen && (
            <div className="relative mt-4 rounded-[20px] bg-white/8 p-4 ring-1 ring-white/10">
              <label htmlFor="alcohol-goal-drinks" className="text-[9px] font-black uppercase tracking-[.14em] text-white/55">Drinks to add</label>
              <div className="mt-2 flex gap-2"><input id="alcohol-goal-drinks" type="number" min="1" step="1" inputMode="numeric" value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-[#24c1c4]" /><button type="button" disabled={saving || !draft} onClick={() => void addDrinks()} className="min-h-10 rounded-xl bg-white px-4 text-[10px] font-black text-[#0b2d54] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving…" : "Add"}</button></div>
              <button type="button" onClick={() => setLogOpen(false)} className="mt-2 text-[9px] font-bold text-white/55">Cancel</button>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-[#e2ecef] bg-[#fbfdfd] px-4 py-3.5">
          <p className="text-[10px] font-semibold leading-4 text-[#74859a]">{isAboveBudget ? "Your weekly target has been exceeded. Keep logging accurately so your health history reflects what actually happened." : isAtOrAboveBudget ? "Your weekly target has been reached. You can still log any additional intake so your record stays accurate." : "Pace yourself through the remaining days and keep your entries honest."}</p>
          <button type="button" onClick={() => setLogOpen((value) => !value)} className="shrink-0 rounded-xl bg-[#0b2d54] px-3.5 py-2.5 text-[10px] font-black text-white shadow-[0_7px_16px_rgba(11,45,84,.14)]">{logOpen ? "Close" : thisWeekLogged === 0 ? "Log drinks" : isAboveBudget ? "Update log" : "Add drinks"}</button>
        </div>
      </div>

      <div className="border-t border-[#edf2f4] bg-[#fbfdfd] px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#91a0ae]">Target date</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{targetDateLabel}</p></div><Link href="/health-goals" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#d6e5e8] bg-white px-3.5 py-2 text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link></div>
        <p className="mt-1.5 text-[9px] font-medium text-[#7b8da1]">{targetDaysLeft === 0 ? "Target date is today" : `${targetDaysLeft} days left to target`}</p>
      </div>
    </article>
  );
};

export default AlcoholGoalCard;
