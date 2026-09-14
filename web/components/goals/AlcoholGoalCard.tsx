"use client";

import Link from "next/link";
import { ArrowRight, Check, Wine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { healthGoalsService } from "@/services/health-goals.service";
import { TODAY_GOAL_FOOTER_CLASS } from "@/components/today/today-goal-card-styles";

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

  const status = isAboveBudget ? "Above weekly target" : isAtOrAboveBudget ? "Weekly target reached" : "On track this week";
  const budgetRatio = Math.min(Math.max(budgetUsedPercentage, 0), 100);

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[30px] border border-[#dfeaec] bg-white shadow-[0_18px_48px_rgba(11,45,84,.065)]">
      <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#fff2ea] text-[#c86b33] ring-1 ring-[#f5e0d2]"><Wine className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-[-.035em] text-[#0b2d54]">Alcohol moderation</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#84969e]">Day {programDay} · Week {week}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black ${isAboveBudget ? "bg-[#fff0ef] text-[#c83f32]" : "bg-[#eaf8f1] text-[#168660]"}`}>{isAboveBudget ? "Above target" : "On track"}</span>
      </div>

      <div className="flex-1 px-4 pb-5 sm:px-5 sm:pb-6">
        <div className="relative overflow-hidden rounded-[27px] bg-[#0b2d54] p-5 text-white shadow-[0_16px_34px_rgba(11,45,84,.16)] sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#24c1c4]/14 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-[#24c1c4]/8 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/50">This week</p>
              <p className="mt-2 text-[48px] font-black leading-none tracking-[-.08em]">{formatNumber(thisWeekLogged)}<span className="ml-1.5 text-lg font-bold tracking-normal text-white/50">drinks</span></p>
              <p className="mt-2 text-sm font-semibold text-white/65">Weekly limit ≤ {formatNumber(weeklyTarget)}</p>
              <p className="mt-3 text-[11px] font-bold text-white/60">{isAboveBudget ? `${formatNumber(Math.abs(differenceDelta))} drinks above your weekly limit` : isAtOrAboveBudget ? "Weekly limit reached" : `${formatNumber(remaining)} drinks remaining`}</p>
            </div>

            <div className="mx-auto shrink-0 sm:mx-0">
              <div className="relative grid h-[140px] w-[140px] place-items-center rounded-full" style={{ background: `conic-gradient(${isAboveBudget ? "#f17e71" : "#24c1c4"} 0 ${budgetRatio}%, rgba(255,255,255,.11) ${budgetRatio}% 100%)` }}>
                <div className="absolute inset-[10px] rounded-full bg-[#0b2d54] ring-1 ring-white/10" />
                <div className="relative z-10 text-center">
                  <p className="text-[32px] font-black leading-none tracking-[-.07em]">{formatNumber(budgetUsedPercentage)}%</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[.15em] text-white/45">budget used</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-6 rounded-[20px] border border-white/10 bg-white/[.06] p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[#7de6e7]"><Check className="h-4 w-4" /></span>
              <div>
                <p className="text-xs font-black text-white">{status}</p>
                <p className="mt-1 text-[11px] leading-5 text-white/60">Pace yourself through the remaining days and keep your entries honest.</p>
              </div>
            </div>
          </div>

          {logOpen && !isAtOrAboveBudget && (
            <div className="relative mt-4 rounded-[20px] bg-white p-3.5 text-[#0b2d54]">
              <label htmlFor="alcohol-goal-drinks" className="text-[9px] font-black uppercase tracking-[.14em] text-[#74859a]">Drinks to add</label>
              <div className="mt-2 flex gap-2"><input id="alcohol-goal-drinks" type="number" min="1" step="1" inputMode="numeric" value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#d7e4e8] bg-white px-3 text-sm font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" /><button type="button" disabled={saving || !draft} onClick={() => void addDrinks()} className="min-h-10 rounded-xl bg-[#0b2d54] px-4 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving…" : "Add"}</button></div>
              <button type="button" onClick={() => setLogOpen(false)} className="mt-2 text-[9px] font-bold text-[#74859a]">Cancel</button>
            </div>
          )}

          <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-[10px] text-white/55">
            <div><span className="font-bold uppercase tracking-[.12em]">Target date</span><p className="mt-1 text-xs font-black text-white">{targetDateLabel}</p></div>
            <div className="text-right"><span className="font-bold uppercase tracking-[.12em]">Time left</span><p className="mt-1 text-xs font-black text-white">{targetDaysLeft === 0 ? "Today" : `${targetDaysLeft} days`}</p></div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-[21px] border border-[#e1eaed] bg-[#fbfdfd] p-4">
          <div><p className="text-[9px] font-black uppercase tracking-[.13em] text-[#8999a3]">Goal journey</p><p className="mt-1 text-xs font-black text-[#0b2d54]">Stay within your weekly limit</p></div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={isAtOrAboveBudget} onClick={() => setLogOpen((open) => !open)} className={`min-h-10 rounded-xl px-3.5 py-2 text-[10px] font-black ${isAtOrAboveBudget ? "cursor-not-allowed bg-[#eef2f4] text-[#93a0aa]" : "bg-[#0b2d54] text-white"}`}>{saving ? "Saving…" : isAboveBudget ? "Budget exceeded" : isAtOrAboveBudget ? "Limit reached" : logOpen ? "Close log" : "Log drinks"}</button>
            <Link href="/health-goals" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#d7e4e8] bg-white px-3.5 py-2 text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </div>
      </div>

      <div className={`${TODAY_GOAL_FOOTER_CLASS} bg-[#fbfdfd]`}>
        <p className="text-[9px] leading-4 text-[#9aa8b1]">Your weekly budget resets each Monday at 00:00.</p>
      </div>
    </article>
  );
};

export default AlcoholGoalCard;
