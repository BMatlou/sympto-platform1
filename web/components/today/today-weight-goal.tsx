"use client";

import Link from "next/link";
import { ArrowRight, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { healthGoalsService } from "@/services/health-goals.service";
import { TODAY_GOAL_FOOTER_CLASS } from "@/components/today/today-goal-card-styles";

function numberValue(value: unknown): number | null { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function formatKg(value: number | null) { return value == null ? "—" : Number(value).toFixed(1); }
function formatRate(value: number | null) { return value == null ? "—" : Math.abs(value) < 0.1 ? Number(value).toFixed(2) : Number(value).toFixed(1); }
function formatDate(value: unknown) { if (!value) return "—"; const date = new Date(String(value)); if (Number.isNaN(date.getTime())) return "—"; return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(date); }
function journeyFor(goal: any) { const startDate = new Date(String(goal?.createdAt ?? "")); const targetDate = new Date(String(goal?.targetDate ?? "")); const now = Date.now(); const journeyDay = Number.isNaN(startDate.getTime()) ? 1 : Math.max(1, Math.floor((now - startDate.getTime()) / 86400000) + 1); const daysLeft = Number.isNaN(targetDate.getTime()) ? null : Math.max(0, Math.ceil((targetDate.getTime() - now) / 86400000)); const totalDays = !Number.isNaN(startDate.getTime()) && !Number.isNaN(targetDate.getTime()) ? Math.max(1, Math.ceil((targetDate.getTime() - startDate.getTime()) / 86400000)) : null; return { startDate, targetDate, journeyDay, daysLeft, totalDays }; }

type Props = { goal: any; fallbackWeight?: number | string | null };
type WeightEvent = { loggedValue: number; occurredAt: string; source?: string | null; sourceId?: string | null };

export default function TodayWeightGoal({ goal, fallbackWeight }: Props) {
  const [events, setEvents] = useState<WeightEvent[]>([]);
  const [baselineWeight, setBaselineWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await healthGoalsService.getMetricEvents("WEIGHT", "weight.kg", new Date(0), new Date());
        if (!active) return;
        const all = (response.events ?? []).map((event) => ({ loggedValue: Number(event.loggedValue), occurredAt: String(event.occurredAt), source: event.source, sourceId: event.sourceId })).filter((event) => Number.isFinite(event.loggedValue) && !Number.isNaN(new Date(event.occurredAt).getTime())).sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
        const goalId = String(goal?.id ?? "");
        const goalBaseline = all.find((event) => event.source === "goal-baseline" && event.sourceId === goalId);
        const goalCreatedAt = new Date(String(goal?.createdAt ?? ""));
        const baselineFromHistory = !Number.isNaN(goalCreatedAt.getTime()) ? [...all].reverse().find((event) => event.source !== "goal-baseline" && new Date(event.occurredAt).getTime() <= goalCreatedAt.getTime()) : null;
        // Synthetic goal-baseline rows are never current user measurements. A baseline from
        // another goal must never become today's weight simply because it is the latest row.
        const regular = all.filter((event) => event.source !== "goal-baseline");
        // Prefer the real measurement at/before creation; the synthetic baseline is only a fallback.
        setBaselineWeight(baselineFromHistory?.loggedValue ?? goalBaseline?.loggedValue ?? null);
        setEvents(regular);
      } catch { if (active) { setEvents([]); setBaselineWeight(null); } }
      finally { if (active) setLoading(false); }
    };
    void load();
    const onWeightUpdated = () => { void load(); };
    const onGoalUpdated = () => { void load(); };
    window.addEventListener("sympto:weight-updated", onWeightUpdated);
    window.addEventListener("sympto:health-goal-updated", onGoalUpdated);
    return () => { active = false; window.removeEventListener("sympto:weight-updated", onWeightUpdated); window.removeEventListener("sympto:health-goal-updated", onGoalUpdated); };
  }, [goal?.id, goal?.createdAt]);

  const journey = useMemo(() => journeyFor(goal), [goal]);
  const comparison = String(goal?.metricConfig?.comparison ?? goal?.comparison ?? "DECREASE_TO").toUpperCase();
  const configuredTarget = numberValue(goal?.metricConfig?.frequencyTarget ?? goal?.targetValue);
  const fallback = numberValue(fallbackWeight);
  const patientWeight = numberValue(goal?.patient?.weightKg);
  const currentEvent = events[events.length - 1] ?? null;
  const currentWeight = currentEvent?.loggedValue ?? fallback ?? patientWeight;
  const startingWeight = baselineWeight ?? patientWeight ?? currentWeight;
  const targetAmount = configuredTarget != null && configuredTarget > 0 ? configuredTarget : null;
  const targetWeight = comparison === "DECREASE_TO" && startingWeight != null && targetAmount != null ? startingWeight - targetAmount : comparison === "INCREASE_TO" && startingWeight != null && targetAmount != null ? startingWeight + targetAmount : null;
  const changeKg = startingWeight != null && currentWeight != null ? currentWeight - startingWeight : null;
  const lostKg = comparison === "DECREASE_TO" && startingWeight != null && currentWeight != null ? Math.max(startingWeight - currentWeight, 0) : null;
  const gainedKg = comparison === "INCREASE_TO" && startingWeight != null && currentWeight != null ? Math.max(currentWeight - startingWeight, 0) : null;
  const actualChange = comparison === "DECREASE_TO" ? lostKg : gainedKg;
  const targetReached = targetAmount != null && actualChange != null && actualChange >= targetAmount;
  const progress = targetAmount != null && actualChange != null ? Math.round(Math.min(100, Math.max(0, (actualChange / targetAmount) * 100))) : 0;
  const weekAgo = Date.now() - 7 * 86400000;
  const olderThanWeek = [...events].reverse().find((event) => new Date(event.occurredAt).getTime() <= weekAgo);
  const weeklyChangeKg = olderThanWeek && currentWeight != null ? currentWeight - olderThanWeek.loggedValue : null;
  const expectedProgress = journey.totalDays != null && journey.totalDays > 0 ? Math.min(100, Math.max(0, ((journey.journeyDay - 1) / journey.totalDays) * 100)) : null;
  const onTrack = targetReached || expectedProgress == null || progress >= expectedProgress - 10;
  const weeksLeft = journey.daysLeft != null ? journey.daysLeft / 7 : null;
  const remainingGoalAmount = targetAmount != null && actualChange != null ? Math.max(targetAmount - actualChange, 0) : null;
  const requiredWeeklyChange = targetReached ? 0 : remainingGoalAmount != null && weeksLeft && weeksLeft > 0 ? remainingGoalAmount / weeksLeft : null;
  const requiredDailyChange = targetReached ? 0 : remainingGoalAmount != null && journey.daysLeft != null && journey.daysLeft > 0 ? remainingGoalAmount / journey.daysLeft : null;
  const heightCm = numberValue(goal?.patient?.heightCm ?? goal?.heightCm);
  const currentBmi = currentWeight != null && heightCm != null && heightCm > 0 ? currentWeight / ((heightCm / 100) ** 2) : null;
  const targetBmi = targetWeight != null && heightCm != null && heightCm > 0 ? targetWeight / ((heightCm / 100) ** 2) : null;
  const bmiCaution = comparison === "DECREASE_TO" && targetBmi != null && targetBmi < 18.5;
  const ChangeIcon = comparison === "INCREASE_TO" ? TrendingUp : TrendingDown;
  const targetLabel = comparison === "DECREASE_TO" ? `Lose ${formatKg(targetAmount)} kg · target body weight ${formatKg(targetWeight)} kg` : `Gain ${formatKg(targetAmount)} kg · target body weight ${formatKg(targetWeight)} kg`;

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[30px] border border-[#dfeaec] bg-white shadow-[0_18px_48px_rgba(11,45,84,.065)]">
      <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80] ring-1 ring-[#d8efed]"><Scale className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-base font-black tracking-[-.035em] text-[#0b2d54]">{String(goal?.title ?? "Weight")}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#84969e]">Weight goal</p></div></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black ${bmiCaution ? "bg-[#fff6e5] text-[#a26204]" : targetReached ? "bg-[#eaf8ef] text-[#168660]" : onTrack ? "bg-[#e8f8f7] text-[#0b7b80]" : "bg-[#fff6e5] text-[#a26204]"}`}>{bmiCaution ? "Health check recommended" : targetReached ? "Target reached" : onTrack ? "On track" : "Needs attention"}</span></div>
      <div className="flex-1 px-4 pb-5 sm:px-5 sm:pb-6">
        {loading ? <div className="h-[250px] animate-pulse rounded-[26px] bg-[#f5f9fa]" /> : currentWeight == null || targetAmount == null || startingWeight == null ? <div className="rounded-[26px] bg-[#0b2d54] p-6 text-white shadow-[0_14px_30px_rgba(11,45,84,.14)]"><p className="text-xl font-black tracking-[-.04em]">Weight progress will update automatically</p><p className="mt-2 text-sm leading-6 text-white/65">Record your weight in Vitals &amp; Measurements and Sympto will use that measurement here.</p></div> : <div className="overflow-hidden rounded-[27px] bg-[#0b2d54] text-white shadow-[0_16px_34px_rgba(11,45,84,.16)]"><div className="relative p-5 sm:p-6"><div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#24c1c4]/18 blur-3xl" /><div className="pointer-events-none absolute bottom-[-90px] left-1/3 h-48 w-48 rounded-full bg-[#24c1c4]/10 blur-3xl" /><div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/50">Latest recorded weight</p><p className="mt-2 text-[48px] font-black leading-none tracking-[-.08em]">{formatKg(currentWeight)}<span className="ml-1.5 text-lg font-bold tracking-normal text-white/55">kg</span></p><div className="mt-4 flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black text-white/80 ring-1 ring-white/10">{targetLabel}</span> <span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${targetReached ? "bg-[#24c1c4]/20 text-[#7de6e7]" : "bg-white/10 text-white/70 ring-1 ring-white/10"}`}>{progress}% progress</span></div></div><div className="mx-auto sm:mx-0"><div className="relative grid h-[132px] w-[132px] place-items-center rounded-full" style={{ background: `conic-gradient(#24c1c4 0 ${progress}%, rgba(255,255,255,.12) ${progress}% 100%)` }}><div className="absolute inset-[9px] rounded-full bg-[#0b2d54] ring-1 ring-white/10" /><div className="relative z-10 text-center"><p className="text-[30px] font-black leading-none tracking-[-.07em]">{progress}%</p><p className="mt-1 text-[9px] font-black uppercase tracking-[.15em] text-white/45">progress</p></div></div></div></div><div className="relative mt-6 border-t border-white/10 pt-5"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-white/45">Journey</p><p className="mt-1 text-sm font-bold text-white">{targetReached ? "Target reached" : comparison === "DECREASE_TO" ? `${formatKg(lostKg)} kg lost from ${formatKg(startingWeight)} kg` : `${formatKg(gainedKg)} kg gained from ${formatKg(startingWeight)} kg`}</p></div>{journey.daysLeft !== null && <p className="text-right text-[10px] font-bold text-white/50">{journey.daysLeft === 0 ? "Target date today" : `${journey.daysLeft} days left`}</p>}</div></div></div><div className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-4"><div className="border-white/10 px-4 py-4 sm:border-r"><p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">Starting</p><p className="mt-1.5 text-sm font-black text-white">{formatKg(startingWeight)} kg</p></div><div className="border-white/10 px-4 py-4 sm:border-r"><p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">Change</p><p className="mt-1.5 inline-flex items-center gap-1 text-sm font-black text-white"><ChangeIcon className="h-3.5 w-3.5 text-[#7de6e7]" />{changeKg == null ? "—" : `${changeKg > 0 ? "+" : ""}${formatKg(changeKg)} kg`}</p></div><div className="border-white/10 px-4 py-4 sm:border-r"><p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">Last recorded</p><p className="mt-1.5 text-sm font-black text-white">{formatDate(currentEvent?.occurredAt)}</p></div><div className="px-4 py-4"><p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">BMI now</p><p className="mt-1.5 text-sm font-black text-white">{currentBmi == null ? "—" : currentBmi.toFixed(1)}</p></div></div></div>}
        {!loading && currentWeight != null && targetAmount != null && remainingGoalAmount != null && <div className="mt-4 rounded-[20px] border border-[#e1eaed] bg-[#f8fbfc] px-4 py-3.5 text-[10px] font-semibold leading-5 text-[#74859a]">{targetReached ? `Goal reached. You need 0.0 kg/day (0.0 kg/week) more.` : comparison === "DECREASE_TO" ? `You need to lose about ${formatKg(remainingGoalAmount)} kg more to reach ${formatKg(targetWeight)} kg by ${formatDate(journey.targetDate)}. That is about ${formatRate(requiredDailyChange)} kg/day or ${formatRate(requiredWeeklyChange)} kg/week.` : `You need to gain about ${formatKg(remainingGoalAmount)} kg more to reach ${formatKg(targetWeight)} kg by ${formatDate(journey.targetDate)}. That is about ${formatRate(requiredDailyChange)} kg/day or ${formatRate(requiredWeeklyChange)} kg/week.`}</div>}
        {!loading && bmiCaution && <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3.5 text-[10px] font-semibold leading-5 text-amber-900">Your planned target would place BMI below 18.5, the adult underweight screening threshold. Sympto should not encourage further loss based on this number alone; consider a health-focused goal and discuss the target with a healthcare professional. BMI is a screening measure, not a complete assessment of health.</div>}
      </div>
      <div className={`${TODAY_GOAL_FOOTER_CLASS} bg-[#fbfdfd]`}><div className="flex items-center justify-between gap-3 text-[10px] font-semibold text-[#74859a]"><span>Day {journey.journeyDay} · {journey.daysLeft === null ? "Journey active" : journey.daysLeft === 0 ? "Target date today" : `${journey.daysLeft} days left`}</span><Link href="/health-goals" className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[10px] font-black text-[#0b2d54] hover:bg-white">View goal <ArrowRight className="h-3 w-3" /></Link></div><p className="mt-2 text-[9px] leading-4 text-[#9aa8b1]">Progress uses the weight recorded when this goal was created as the baseline, then applies later weight measurements to calculate actual change.</p></div>
    </article>
  );
}