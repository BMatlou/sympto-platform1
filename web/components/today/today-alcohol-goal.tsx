"use client";

import Link from "next/link";
import { ArrowRight, Wine } from "lucide-react";
import { useEffect, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";

type TodayAlcoholGoalProps = {
  goal: any;
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

function weekKey(date = new Date()) {
  return mondayStart(date).toISOString().slice(0, 10);
}

function formatDate(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "target date";
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function journey(goal: any) {
  const start = new Date(String(goal?.createdAt ?? Date.now()));
  const targetDate = goal?.targetDate ? new Date(String(goal.targetDate)) : null;
  const currentWeek = mondayStart();
  const startWeek = mondayStart(start);
  const week = Number.isNaN(startWeek.getTime())
    ? 1
    : Math.max(1, Math.floor((currentWeek.getTime() - startWeek.getTime()) / (7 * 86400000)) + 1);
  const daysLeft = targetDate && !Number.isNaN(targetDate.getTime())
    ? Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86400000))
    : null;
  return { week, targetDate, daysLeft };
}

export default function TodayAlcoholGoal({ goal, onUpdated }: TodayAlcoholGoalProps) {
  const target = Number(goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue ?? 0);
  const hasTarget = Number.isFinite(target) && target > 0;
  const [weekTotal, setWeekTotal] = useState(0);
  const [hasLogs, setHasLogs] = useState(false);
  const [weekKeyState, setWeekKeyState] = useState(() => weekKey());
  const [loading, setLoading] = useState(false);
  const [openLog, setOpenLog] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await healthGoalsService.getMetricEvents("ALCOHOL", "alcohol.drinks", mondayStart(), nextMondayStart());
        if (cancelled) return;
        const total = response.events.reduce((sum, event) => {
          const value = Number(event.loggedValue);
          return Number.isFinite(value) ? sum + value : sum;
        }, 0);
        setWeekTotal(total);
        setHasLogs(response.events.length > 0);
        setWeekKeyState(weekKey());
      } catch {
        if (!cancelled) setHasLogs(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => {
      const currentWeekKey = weekKey();
      if (currentWeekKey !== weekKeyState) {
        setWeekTotal(0);
        setHasLogs(false);
        setDraft("");
        setOpenLog(false);
        void load();
      }
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [goal?.id, weekKeyState]);

  const remaining = hasTarget ? Math.max(0, target - weekTotal) : 0;
  const difference = hasTarget ? weekTotal - target : 0;
  const over = hasTarget && weekTotal > target;
  const usedPercent = hasTarget ? Math.round((weekTotal / target) * 100) : 0;
  const scaleMax = Math.max(hasTarget ? target * 1.6 : 1, weekTotal, 1);
  const barWidth = Math.min(100, hasTarget ? (weekTotal / scaleMax) * 100 : 0);
  const targetMarker = hasTarget ? Math.min(100, (target / scaleMax) * 100) : 100;
  const progressText = hasLogs
    ? over
      ? "Above weekly target"
      : `On track this week — ${formatNumber(remaining)} drinks remaining`
    : "This week's consumption: No drinks logged yet";
  const trip = journey(goal);

  async function save() {
    const drinks = Number(draft);
    if (!Number.isFinite(drinks) || drinks <= 0) return;
    try {
      setSaving(true);
      await healthGoalsService.logAlcohol(drinks);
      setWeekTotal((current) => current + drinks);
      setHasLogs(true);
      setDraft("");
      setOpenLog(false);
      await onUpdated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="flex h-full flex-col rounded-[24px] border border-[#dfe9ed] bg-white shadow-[0_5px_18px_rgba(11,45,84,.035)]">
      <div className="flex-1 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Wine className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-700">Alcohol Moderation</p>
              <h3 className="mt-1 truncate text-[17px] font-black tracking-[-.025em] text-[#0b2d54]">Weekly alcohol budget</h3>
            </div>
          </div>
          {hasLogs && (
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${over ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
              {over ? "Above weekly target" : "On track this week"}
            </span>
          )}
        </div>

        <div className={`mt-5 rounded-[18px] border p-4 ${over ? "border-amber-100 bg-amber-50/50" : "border-emerald-100 bg-emerald-50/40"}`}>
          <p className={`text-[15px] font-black tracking-[-.02em] ${over ? "text-amber-900" : "text-emerald-900"}`}>{progressText}</p>
          {hasLogs ? (
            <>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-black leading-none tracking-[-.06em] text-[#0b2d54]">{formatNumber(weekTotal)}</p>
                  <p className="mt-1 text-sm font-bold text-[#74859a]">drinks this week</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#97a7b4]">Weekly Target</p>
                  <p className="mt-1 text-xs font-black text-[#0b2d54]">≤ {formatNumber(target)} drinks</p>
                </div>
              </div>
              <p className={`mt-3 text-[10px] font-semibold ${over ? "text-amber-800" : "text-emerald-800"}`}>
                This week’s difference: {difference > 0 ? `+${formatNumber(difference)} above target` : difference < 0 ? `${formatNumber(difference)} under limit` : "0 at limit"}
              </p>
              <div className="mt-4">
                <div className="relative h-3 rounded-full bg-white/80">
                  <div className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${barWidth}%` }} />
                  {hasTarget && <span className="absolute -top-1.5 h-6 w-0.5 rounded-full bg-[#0b2d54]" style={{ left: `${targetMarker}%` }} aria-hidden="true" />}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-semibold text-[#8795a0]">
                  <span>0 drinks</span>
                  <span className="font-black text-[#0b2d54]">{formatNumber(target)} cap</span>
                  <span className={`font-black ${over ? "text-amber-800" : "text-emerald-800"}`}>{formatNumber(usedPercent)}% of weekly budget used</span>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-2 text-[11px] leading-5 text-emerald-800">Your weekly allowance is {formatNumber(target)} drinks. Log drinks honestly through the week so Sympto can keep the budget meaningful.</p>
          )}
        </div>

        {openLog && (
          <div className="mt-4 rounded-xl bg-[#f7fafb] p-3">
            <label htmlFor="alcohol-drinks-today" className="text-[9px] font-black uppercase tracking-[0.14em] text-[#74859a]">Drinks to add</label>
            <div className="mt-2 flex gap-2">
              <input id="alcohol-drinks-today" type="number" min="1" step="1" inputMode="numeric" value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#d7e4e8] bg-white px-3 text-sm font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" />
              <button type="button" disabled={saving || !draft} onClick={() => void save()} className="min-h-10 rounded-xl bg-[#0b2d54] px-4 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving…" : "Add"}</button>
            </div>
            <button type="button" onClick={() => setOpenLog(false)} className="mt-2 text-[9px] font-bold text-[#74859a]">Cancel</button>
          </div>
        )}
      </div>

      <div className="border-t border-[#edf2f5] px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-3 text-[10px] text-[#74859a]">
          <span>Week {trip.week} of your program</span>
          {trip.daysLeft !== null && <span>{trip.daysLeft} days left until {formatDate(trip.targetDate)}</span>}
        </div>
        <p className={`mb-3 text-[10px] leading-5 ${over ? "text-amber-800" : "text-[#74859a]"}`}>
          <span className="font-black">💡 Sympto Guidance</span>{" "}
          {over
            ? `You have gone past your weekly budget of ${formatNumber(target)} drinks. Focus on stopping further intake for the remainder of the week cycle. Sympto will automatically reset your budget on Monday morning at 00:00 to help you start fresh.`
            : `You are managing your budget well. Your weekly allowance is ${formatNumber(target)} drinks. Pace yourself through the remaining days while keeping your entries honest.`}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setOpenLog((current) => !current)} className="min-h-10 rounded-xl bg-[#0b2d54] px-3 py-2 text-[10px] font-black text-white">
            {openLog ? "Close log" : "Log drinks"}
          </button>
          <Link href="/health-goals" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2 text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </div>
    </article>
  );
}
