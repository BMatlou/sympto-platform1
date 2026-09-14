"use client";

import Link from "next/link";
import { ArrowRight, Cigarette } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { TODAY_GOAL_CARD_CLASS, TODAY_GOAL_FOOTER_CLASS } from "@/components/today/today-goal-card-styles";

type Props = { goal: any };
type SmokingEvent = { loggedValue: number; sourceId?: string | null };

function localDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
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
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(date);
}

export default function TodaySmokingGoal({ goal }: Props) {
  const [todayLogged, setTodayLogged] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const goalId = String(goal?.id ?? "");
  const dailyTarget = Number(goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue ?? 0);
  const hasTarget = Number.isFinite(dailyTarget) && dailyTarget > 0;
  const startDate = useMemo(() => new Date(String(goal?.createdAt ?? "")), [goal?.createdAt]);
  const targetDate = useMemo(() => new Date(String(goal?.targetDate ?? "")), [goal?.targetDate]);
  const journeyDay = Number.isNaN(startDate.getTime()) ? 1 : Math.max(1, Math.floor((Date.now() - startDate.getTime()) / 86400000) + 1);
  const daysLeft = Number.isNaN(targetDate.getTime()) ? null : Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86400000));

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
  const targetReached = todayLogged !== null && hasTarget && todayLogged >= dailyTarget;
  const exceeded = todayLogged !== null && hasTarget && todayLogged > dailyTarget;
  const scaleMax = Math.max(hasTarget ? dailyTarget * 2 : 1, todayLogged ?? 0, 1);
  const todayBar = todayLogged === null ? 0 : Math.min(100, (todayLogged / scaleMax) * 100);
  const targetMarker = hasTarget ? Math.min(100, (dailyTarget / scaleMax) * 100) : 50;

  async function save() {
    const cigarettes = Number(draft.trim());
    if (!goalId || !draft.trim() || !Number.isFinite(cigarettes) || cigarettes < 0) return;
    if (hasTarget && cigarettes > dailyTarget) return;

    try {
      setSaving(true);
      await healthGoalsService.logSmoking(goalId, cigarettes, localDayKey());
      setTodayLogged(cigarettes);
      setDraft(String(cigarettes));
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={`${TODAY_GOAL_CARD_CLASS} flex h-full min-w-0 flex-col`}>
      <div className="border-b border-[#edf2f5] bg-gradient-to-br from-[#f7fcfc] via-white to-[#eef8f8] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e5f7f6] text-[#0b6f73]"><Cigarette className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0b6f73]">Smoking cessation tracker</p><h3 className="truncate text-lg font-black tracking-[-.04em] text-[#0b2d54]">{String(goal?.title ?? "Smoking")}</h3></div>
          </div>
          {todayLogged !== null && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${targetReached ? "bg-slate-100 text-slate-600" : exceeded ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{targetReached ? "Daily target reached" : exceeded ? "Above today’s target" : "On track today"}</span>}
        </div>
      </div>

      <div className="flex-1 p-5 sm:p-6">
        <div className="rounded-[18px] border border-[#e7eef1] bg-[#fbfdfd] p-4">
          {todayLogged === null ? (
            <>
              <p className="text-lg font-black tracking-[-.03em] text-[#0b2d54]">Today&apos;s smoking: Not logged</p>
              <p className="mt-1.5 text-[11px] leading-5 text-[#74859a]">Log honestly when you are ready. Sympto will compare it with your daily ceiling.</p>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-3xl font-black leading-none tracking-[-.06em] text-[#0b2d54]">{todayLogged}</p><p className="mt-1 text-sm font-bold text-[#74859a]">cigarettes today</p><p className="mt-2 text-[10px] font-semibold text-[#74859a]">Daily Target: {formatNumber(dailyTarget)} cigarettes</p></div>
                <div className="shrink-0 text-right"><p className={`text-xl font-black ${exceeded ? "text-[#a34f43]" : targetReached ? "text-[#0b2d54]" : "text-[#168660]"}`}>{difference > 0 ? `+${difference}` : difference}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#8a99a6]">Today&apos;s difference</p></div>
              </div>
              <div className="mt-5"><div className="relative h-3 rounded-full bg-[#edf2f5]"><div className={`absolute inset-y-0 left-0 rounded-full ${exceeded ? "bg-[#d9775f]" : targetReached ? "bg-[#0b2d54]" : "bg-[#35b77a]"}`} style={{ width: `${todayBar}%` }} />{hasTarget && <span className="absolute -top-1.5 h-6 w-0.5 rounded-full bg-[#0b2d54]" style={{ left: `${targetMarker}%` }} />}</div><div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-semibold text-[#8795a0]"><span>0</span><span className="font-black text-[#0b2d54]">Daily target {formatNumber(dailyTarget)}</span><span className="font-black">{difference > 0 ? `${Math.abs(difference)} above target` : difference < 0 ? `${Math.abs(difference)} below target` : "At target"}</span></div></div>
            </>
          )}
        </div>

        {open && !targetReached && (
          <div className="mt-4 rounded-xl bg-[#f7fafb] p-3">
            <label className="text-[9px] font-black uppercase tracking-[0.14em] text-[#74859a]" htmlFor={`smoking-${goalId}`}>Cigarettes today</label>
            <div className="mt-2 flex gap-2"><input id={`smoking-${goalId}`} type="number" min="0" max={hasTarget ? dailyTarget : undefined} step="1" value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#d7e4e8] bg-white px-3 text-sm font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" /><button type="button" disabled={saving} onClick={() => void save()} className="min-h-10 rounded-xl bg-[#0b2d54] px-4 text-[10px] font-black text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></div>
            <button type="button" onClick={() => setOpen(false)} className="mt-2 text-[9px] font-bold text-[#74859a]">Cancel</button>
          </div>
        )}
      </div>

      <div className={`${TODAY_GOAL_FOOTER_CLASS} px-4`}>
        <div className="mb-3 flex items-center justify-between gap-3 text-[10px] text-[#74859a]"><span>Day {journeyDay} of your journey</span>{daysLeft !== null && <span>{daysLeft} days left until {formatDate(targetDate)}</span>}</div>
        <div className="grid grid-cols-2 gap-2"><button type="button" disabled={targetReached} onClick={() => { if (!targetReached) { setOpen(true); setDraft(todayLogged == null ? "" : String(todayLogged)); } }} className={`min-h-10 rounded-xl px-3 py-2 text-[10px] font-black ${targetReached ? "cursor-not-allowed bg-[#eef2f4] text-[#93a0aa]" : "bg-[#0b2d54] text-white hover:bg-[#123e66]"}`}>{targetReached ? "Daily target reached" : todayLogged === null ? "Log today’s smoking" : "Update today’s log"}</button><Link href="/health-goals" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2 text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link></div>
      </div>
    </article>
  );
}
