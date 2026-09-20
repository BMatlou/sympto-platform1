"use client";

import Link from "next/link";
import { ArrowRight, Cigarette } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";

type Props = { goal: any; onUpdated?: () => void | Promise<void> };

function localDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatNumber(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function calendarMidnight(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function TodaySmokingGoal({ goal, onUpdated }: Props) {
  const [todayLogged, setTodayLogged] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const goalId = String(goal?.id ?? "");
  const targetRaw = goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue;
  const dailyTarget = Number(targetRaw);
  const hasTarget = targetRaw !== null && targetRaw !== undefined && targetRaw !== "" && Number.isFinite(dailyTarget) && dailyTarget >= 0;
  const startDate = useMemo(() => calendarMidnight(goal?.createdAt), [goal?.createdAt]);
  const targetDate = useMemo(() => calendarMidnight(goal?.targetDate), [goal?.targetDate]);
  const today = calendarMidnight(new Date());
  const journeyDay = startDate && today ? Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / 86400000) + 1) : 1;
  const daysLeft = targetDate && today ? Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / 86400000)) : null;

  useEffect(() => {
    let active = true;
    async function loadToday() {
      if (!goalId) return;
      const dayKey = localDayKey();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      try {
        const response = await healthGoalsService.getMetricEvents("SMOKING", "smoking.cigarettes", start, end, "patient-smoking-log");
        if (!active) return;
        const event = (response.events ?? []).find((item) => item.sourceId === `${goalId}:${dayKey}`);
        const value = event ? Number(event.loggedValue) : null;
        setTodayLogged(Number.isFinite(value) ? value : null);
        setDraft(value == null ? "" : String(value));
      } catch {
        if (active) setTodayLogged(null);
      }
    }
    void loadToday();
    const interval = window.setInterval(() => void loadToday(), 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [goalId]);

  const difference = todayLogged !== null && hasTarget ? todayLogged - dailyTarget : 0;
  const targetReached = todayLogged !== null && hasTarget && (dailyTarget === 0 ? todayLogged === 0 : todayLogged >= dailyTarget);
  const exceeded = todayLogged !== null && hasTarget && todayLogged > dailyTarget;
  const progress = todayLogged !== null && hasTarget ? (dailyTarget === 0 ? 1 : Math.min(1, todayLogged / dailyTarget)) : 0;
  const progressPercent = Math.round(progress * 100);

  async function save() {
    const cigarettes = Number(draft.trim());
    if (!goalId || !draft.trim() || !Number.isFinite(cigarettes) || cigarettes < 0) return;
    try {
      setSaving(true);
      await healthGoalsService.logSmoking(goalId, cigarettes, localDayKey());
      setTodayLogged(cigarettes);
      setDraft(String(cigarettes));
      setOpen(false);
      window.dispatchEvent(new Event("sympto:health-goal-updated"));
      window.dispatchEvent(new Event("sympto:health-checkin-updated"));
      await onUpdated?.();
    } finally {
      setSaving(false);
    }
  }

  const ringSize = 104;
  const ringStroke = 10;
  const radius = (ringSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[26px] border border-[#e5edef] bg-white shadow-[0_14px_36px_rgba(11,45,84,.07)]">
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[#e8f8f7] text-[#24c1c4] ring-1 ring-[#d3efed]"><Cigarette className="h-4 w-4" /></span>
          <div className="min-w-0"><p className="truncate text-sm font-black tracking-[-.035em] text-[#0b2d54]">Smoking cessation</p><p className="mt-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-[#8a99a6]">Daily progress</p></div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[8px] font-black ${todayLogged === null ? "bg-[#eef5f6] text-[#71879b]" : exceeded ? "bg-red-50 text-red-700" : targetReached ? "bg-slate-100 text-slate-600" : "bg-[#e8f8f7] text-[#0b7b80]"}`}>{todayLogged === null ? "Not logged" : exceeded ? "Over ceiling" : targetReached ? "Ceiling reached" : "On track"}</span>
      </header>

      <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4">
        <section className="relative overflow-hidden rounded-[23px] bg-[#0b2d54] px-4 py-3.5 text-white shadow-[0_12px_28px_rgba(11,45,84,.14)] sm:px-5 sm:py-4">
          <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#24c1c4]/18 blur-2xl" />
          <div className="relative flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
              <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} className="-rotate-90">
                <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth={ringStroke} />
                {todayLogged !== null && hasTarget && <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke={exceeded ? "#f87171" : "#24c1c4"} strokeWidth={ringStroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />}
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div><p className="text-3xl font-black leading-none tracking-[-.07em]">{todayLogged === null ? "—" : formatNumber(todayLogged)}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[.12em] text-white/45">today</p></div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/40">Daily ceiling</p>
                  <p className="mt-1 text-xl font-black leading-none tracking-[-.045em]">{hasTarget ? formatNumber(dailyTarget) : "—"}</p>
                  <p className="mt-1 text-[9px] font-semibold text-white/50">cigarettes</p>
                </div>
                <div className="border-l border-white/10 pl-3 sm:pl-4">
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/40">Today</p>
                  <p className="mt-1 text-xl font-black leading-none tracking-[-.045em]">{todayLogged === null ? "—" : formatNumber(todayLogged)}</p>
                  <p className="mt-1 text-[9px] font-semibold text-white/50">{todayLogged === null ? "not logged" : "cigarettes"}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-1.5 text-[9px] font-black text-[#b8ffff] ring-1 ring-white/10">{hasTarget ? (dailyTarget === 0 ? "Smoke-free target" : `${progressPercent}% of ceiling`) : "Set a daily ceiling"}</span>
                {todayLogged !== null && hasTarget && <span className="truncate text-[9px] font-semibold text-white/50">{difference < 0 ? `${formatNumber(Math.abs(difference))} remaining` : difference === 0 ? "At ceiling" : `${formatNumber(Math.abs(difference))} over`}</span>}
              </div>
            </div>
          </div>
        </section>

        {open && (
          <section className="mt-3 rounded-[18px] border border-[#e1ecee] bg-[#f8fbfb] p-3">
            <label htmlFor={`smoking-${goalId}`} className="text-[8px] font-black uppercase tracking-[.14em] text-[#74859a]">Cigarettes today</label>
            <div className="mt-1.5 flex gap-2"><input id={`smoking-${goalId}`} type="number" min="0" step="1" inputMode="numeric" value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-9 min-w-0 flex-1 rounded-xl border border-[#d7e4e8] bg-white px-3 text-xs font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" /><button type="button" disabled={saving} onClick={() => void save()} className="min-h-9 rounded-xl bg-[#0b2d54] px-3.5 text-[9px] font-black text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></div>
            <button type="button" onClick={() => setOpen(false)} className="mt-1.5 text-[8px] font-bold text-[#74859a]">Cancel</button>
          </section>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-[#e2ecef] bg-[#fbfdfd] px-3 py-2.5">
          <p className="min-w-0 text-[9px] font-semibold leading-4 text-[#74859a]">{todayLogged === null ? "Keep the number honest — Sympto tracks today against your ceiling." : "Your smoking entry is tracked against today’s ceiling."}</p>
          <button type="button" onClick={() => { setOpen((value) => !value); setDraft(todayLogged == null ? "" : String(todayLogged)); }} className="shrink-0 rounded-xl bg-[#0b2d54] px-3 py-2 text-[9px] font-black text-white">{open ? "Close" : todayLogged === null ? "Log today" : "Update"}</button>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[#edf2f4] bg-[#fbfdfd] px-4 py-3 sm:px-5">
        <div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.14em] text-[#9aa8b3]">Journey</p><p className="mt-0.5 text-xs font-black text-[#0b2d54]">Day {journeyDay}{daysLeft !== null ? ` · ${daysLeft} days left` : ""}</p></div>
        <div className="flex items-center gap-2"><p className="hidden text-[8px] text-[#7d8d99] sm:block">until {formatDate(goal?.targetDate)}</p><Link href={`/health-goals#goal-${encodeURIComponent(String(goal?.id ?? ""))}`} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-xl border border-[#d6e4e7] bg-white px-3 py-2 text-[9px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link></div>
      </footer>
    </article>
  );
}
