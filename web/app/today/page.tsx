"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Activity, Apple, Bell, Brain, CalendarDays, CheckCircle2, ClipboardCheck, Cigarette, Droplets, HeartPulse, Moon, Pill, Scale, ShieldCheck, Sparkles, Target, Wine, Footprints } from "lucide-react";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import DailyHealthCheckIn from "@/components/dashboard/daily-health-check-in";
import HealthVitalsSummary, { type DashboardVital } from "@/components/dashboard/health-vitals-summary";
import TodayMedicationActions from "@/components/today/today-medication-actions";
import TodayAlcoholGoal from "@/components/today/today-alcohol-goal";
import TodayWeightGoal from "@/components/today/today-weight-goal";
import { healthGoalsService } from "@/services/health-goals.service";

function text(value: unknown, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function formatDate(value: unknown, includeTime = false) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-ZA", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

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
  if (!Number.isFinite(number)) return null;
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function normalizeVitals(data: any): DashboardVital[] {
  const deviceVitals = Array.isArray(data?.healthSnapshot?.latestMeasurements)
    ? data.healthSnapshot.latestMeasurements.map((item: any) => ({ type: item.type ?? item.measurementType, name: item.name, value: item.value, unit: item.unit, measuredAt: item.measuredAt, source: item.source }))
    : [];
  const clinicalVitals = Array.isArray(data?.clinicalVitals)
    ? data.clinicalVitals.map((item: any) => ({ type: item.vitalType?.code ?? item.vitalType?.name, name: item.vitalType?.name, value: item.value, unit: item.vitalType?.unit, measuredAt: item.measuredAt, source: "CLINICAL_RECORD" }))
    : [];
  const byType = new Map<string, DashboardVital>();
  for (const vital of [...deviceVitals, ...clinicalVitals]) {
    const key = String(vital.type ?? vital.name ?? "").toUpperCase();
    if (!key) continue;
    const previous = byType.get(key);
    if (!previous || new Date(String(vital.measuredAt ?? 0)).getTime() > new Date(String(previous.measuredAt ?? 0)).getTime()) byType.set(key, vital);
  }
  return Array.from(byType.values());
}

function goalProgress(goal: any) {
  const latest = Number(goal?.progressPercent ?? goal?.latestProgress?.progressPercent);
  if (Number.isFinite(latest)) return Math.max(0, Math.min(100, Math.round(latest)));
  const progress = Array.isArray(goal?.progress) ? goal.progress[0] : null;
  const percent = Number(progress?.progressPercent);
  return Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;
}

function goalTarget(goal: any) {
  const value = formatNumber(goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue);
  if (value === null) return "Target not set";
  const unit = text(goal?.unit, "").trim();
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function goalJourney(goal: any) {
  const startDate = new Date(String(goal?.createdAt ?? Date.now()));
  const targetDate = new Date(String(goal?.targetDate ?? ""));
  const journeyDay = Number.isNaN(startDate.getTime()) ? 1 : Math.max(1, Math.floor((Date.now() - startDate.getTime()) / 86400000) + 1);
  const daysLeft = Number.isNaN(targetDate.getTime()) ? null : Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86400000));
  return { journeyDay, targetDate, daysLeft };
}

const GOAL_META: Record<string, { label: string; icon: typeof Target; accent: string; surface: string }> = {
  WEIGHT: { label: "Weight", icon: Scale, accent: "text-[#0b6f73]", surface: "bg-[#e5f7f6]" },
  EXERCISE: { label: "Exercise", icon: Footprints, accent: "text-emerald-700", surface: "bg-emerald-50" },
  NUTRITION: { label: "Nutrition", icon: Apple, accent: "text-orange-700", surface: "bg-orange-50" },
  BLOOD_PRESSURE: { label: "Blood pressure", icon: HeartPulse, accent: "text-rose-700", surface: "bg-rose-50" },
  BLOOD_GLUCOSE: { label: "Blood glucose", icon: Activity, accent: "text-amber-700", surface: "bg-amber-50" },
  CHOLESTEROL: { label: "Cholesterol", icon: ShieldCheck, accent: "text-blue-700", surface: "bg-blue-50" },
  SLEEP: { label: "Sleep", icon: Moon, accent: "text-indigo-700", surface: "bg-indigo-50" },
  MENTAL_HEALTH: { label: "Mental health", icon: Brain, accent: "text-fuchsia-700", surface: "bg-fuchsia-50" },
  HYDRATION: { label: "Hydration", icon: Droplets, accent: "text-cyan-700", surface: "bg-cyan-50" },
  ALCOHOL: { label: "Alcohol", icon: Wine, accent: "text-purple-700", surface: "bg-purple-50" },
  HEART_RATE: { label: "Heart rate", icon: HeartPulse, accent: "text-red-700", surface: "bg-red-50" },
  OTHER: { label: "Personal goal", icon: Target, accent: "text-[#0b2d54]", surface: "bg-[#edf4ff]" },
};

export default function TodayPage() {
  const { data, loading, error, reload } = useDashboard();
  const [smokingToday, setSmokingToday] = useState<Record<string, number | null>>({});
  const [smokingDrafts, setSmokingDrafts] = useState<Record<string, string>>({});
  const [openSmokingGoalId, setOpenSmokingGoalId] = useState<string | null>(null);
  const [savingSmokingGoalId, setSavingSmokingGoalId] = useState<string | null>(null);
  const [smokingDay, setSmokingDay] = useState(() => localDayKey());

  useEffect(() => {
    const smokingGoals = (data?.goals ?? []).filter(
      (goal: any) => String(goal?.status).toUpperCase() === "ACTIVE" && String(goal?.category ?? "").toUpperCase() === "SMOKING",
    );
    if (!smokingGoals.length) return;

    let cancelled = false;

    const loadSmokingToday = async () => {
      const dayKey = localDayKey();
      setSmokingDay((current) => (current === dayKey ? current : dayKey));
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      try {
        const response = await healthGoalsService.getMetricEvents("SMOKING", "smoking.cigarettes", start, end, "patient-smoking-log");
        if (cancelled) return;
        const next: Record<string, number | null> = {};
        const drafts: Record<string, string> = {};
        for (const goal of smokingGoals) {
          const event = response.events.find((item) => item.sourceId === `${String(goal.id)}:${dayKey}`);
          next[String(goal.id)] = event ? Number(event.loggedValue) : null;
          if (event) drafts[String(goal.id)] = String(event.loggedValue);
        }
        setSmokingToday(next);
        setSmokingDrafts((current) => ({ ...current, ...drafts }));
      } catch {
        // Preserve the current UI if the event history cannot be loaded.
      }
    };

    void loadSmokingToday();
    const interval = window.setInterval(() => {
      const dayKey = localDayKey();
      if (dayKey !== smokingDay) {
        setOpenSmokingGoalId(null);
        setSmokingDrafts({});
        void loadSmokingToday();
      }
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [data?.goals, smokingDay]);

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5fafb] p-4 sm:p-8">
          <div className="mx-auto max-w-[1260px] space-y-5" aria-busy="true">
            <div className="h-[58px] animate-pulse rounded-[24px] bg-white" />
            <div className="h-[270px] animate-pulse rounded-[30px] bg-white" />
            <div className="h-[420px] animate-pulse rounded-[27px] bg-white" />
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error || !data) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5fafb] p-4 sm:p-8">
          <div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-white p-7">
            <h1 className="text-xl font-black text-[#0b2d54]">We couldn&apos;t load today</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Your saved health information has not been changed. Please try again.</p>
            <button type="button" onClick={reload} className="mt-5 min-h-11 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-semibold text-white">Try again</button>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  const firstName = data.patient?.firstName || data.profile?.preferredName || "there";
  const medications = data.today?.activeMedications ?? [];
  const appointments = data.today?.upcomingAppointments ?? [];
  const goals = (data.goals ?? []).filter((goal: any) => String(goal?.status).toUpperCase() === "ACTIVE");
  const medicationGoal = goals.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "MEDICATION");
  const smokingGoal = goals.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "SMOKING");
  const alcoholGoal = goals.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "ALCOHOL");
  const weightGoal = goals.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "WEIGHT");
  const otherGoals = goals.filter((goal: any) => !["MEDICATION", "SMOKING", "ALCOHOL", "WEIGHT"].includes(String(goal?.category ?? "").toUpperCase()));
  const attention = data.attention ?? [];
  const carePlans = data.carePlans ?? [];
  const careTasks = carePlans.flatMap((plan: any) =>
    (Array.isArray(plan.tasks) ? plan.tasks : [])
      .filter((task: any) => !["COMPLETED", "CANCELLED"].includes(String(task.status ?? "").toUpperCase()))
      .map((task: any) => ({ ...task, carePlanTitle: plan.title })),
  );
  const todayAppointments = appointments.filter(
    (appointment: any) => appointment?.scheduledStart && new Date(String(appointment.scheduledStart)).toDateString() === new Date().toDateString(),
  );
  const notifications = (data.today?.notifications ?? data.notifications ?? []).filter(
    (item: any) => !item.scheduledFor || new Date(String(item.scheduledFor)) <= new Date(),
  );
  const healthVitals = normalizeVitals(data);
  const bmi = data.healthSnapshot?.bmi ?? data.patient?.bmi ?? null;
  const bmiCategory = data.healthSnapshot?.bmiCategory ?? data.patient?.bmiCategory ?? null;
  const weightKg = data.patient?.weightKg ?? data.healthSnapshot?.weightKg ?? null;
  const heightCm = data.patient?.heightCm ?? data.healthSnapshot?.heightCm ?? null;

  const actionItems = [
    ...attention.slice(0, 3).map((item: any) => ({ href: String(item.actionUrl || "/health-journal"), label: "Needs review", title: text(item.title, "Attention needed"), detail: text(item.description), icon: CheckCircle2 })),
    ...todayAppointments.slice(0, 2).map((appointment: any) => ({ href: "/appointments", label: "Appointment", title: text(appointment.reason || appointment.appointmentType, "Clinic visit").replaceAll("_", " "), detail: formatDate(appointment.scheduledStart, true), icon: CalendarDays })),
    ...careTasks.slice(0, 2).map((task: any) => ({ href: "/care-plans", label: "Care plan", title: text(task.title, "Care task"), detail: task.dueDate ? `Due ${formatDate(task.dueDate)}` : text(task.carePlanTitle, "Care plan"), icon: ClipboardCheck })),
    ...notifications.filter((item: any) => item.actionUrl || ["HIGH", "URGENT"].includes(String(item.priority ?? "").toUpperCase())).slice(0, 2).map((item: any) => ({ href: String(item.actionUrl || "/today"), label: "Reminder", title: text(item.title, "Reminder"), detail: text(item.body), icon: Bell })),
  ];

  async function saveSmokingToday(goal: any) {
    const goalId = String(goal.id);
    const dailyTarget = Number(goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue ?? 0);
    const raw = smokingDrafts[goalId]?.trim() ?? "";
    const cigarettes = Number(raw);
    const current = smokingToday[goalId] ?? null;

    if (!raw || !Number.isFinite(cigarettes) || cigarettes < 0) return;
    if (Number.isFinite(dailyTarget) && dailyTarget > 0 && cigarettes > dailyTarget) return;
    if (current !== null && Number.isFinite(dailyTarget) && dailyTarget > 0 && current >= dailyTarget) return;

    try {
      setSavingSmokingGoalId(goalId);
      await healthGoalsService.logSmoking(goalId, cigarettes, localDayKey());
      setSmokingToday((state) => ({ ...state, [goalId]: cigarettes }));
      setSmokingDrafts((state) => ({ ...state, [goalId]: String(cigarettes) }));
      setOpenSmokingGoalId(null);
      await reload();
    } finally {
      setSavingSmokingGoalId(null);
    }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5fafb] text-[#17314e]">
        <div className="mx-auto max-w-[1260px] px-4 pb-12 pt-4 sm:px-7 sm:pt-6">
          <header className="mb-5 flex items-center justify-between">
            <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#0b2d54] hover:bg-white"><ArrowLeft className="h-4 w-4" />My Health</Link>
            <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#71839a] shadow-sm ring-1 ring-[#e0ebef]">Today</span>
          </header>

          <section className="rounded-[30px] bg-gradient-to-br from-[#08284a] via-[#0e4773] to-[#24babe] p-7 text-white shadow-[0_20px_55px_rgba(11,45,84,0.12)] sm:p-9">
            <p className="text-sm font-medium text-white/75">Hi {firstName}</p>
            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">What do I do today?</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Your important health actions, brought together in one place.</p>
              </div>
              <Link href="/log-symptom" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/12 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/20"><Sparkles className="h-4 w-4" />Log a symptom</Link>
            </div>
          </section>

          <div className="mt-7 flex items-end justify-between gap-5"><h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Today, organised</h2><p className="hidden text-right text-[11px] text-[#74859a] sm:block">Only the things worth acting on.</p></div>

          <section className="mt-3.5 overflow-hidden rounded-[26px] border border-[#dfebef] bg-white shadow-[0_6px_20px_rgba(11,45,84,.035)]">
            {medications[0] ? (
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b6f73]"><Pill className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b6f73]">Medication today</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{text(medications[0]?.medication?.name, "Your medicine")}</p><p className="mt-1 text-[11px] text-[#74859a]">{text(medications[0]?.dosage, "Dose not recorded")} · {String(medications[0]?.frequency || "Schedule not recorded").replaceAll("_", " ")}</p></div></div>
                <Link href="#today-goals" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[10px] font-black text-white">Go to today&apos;s goals <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            ) : <div className="p-5 text-sm text-[#74859a]">No medication is scheduled for today.</div>}
            {actionItems.length > 0 && <div className="divide-y divide-[#edf2f5] border-t border-[#edf2f5]">{actionItems.map((item, index) => { const Icon = item.icon; return <Link key={`${item.label}-${index}`} href={item.href} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#f8fbfc] sm:px-6"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f1f6f8] text-[#0b2d54]"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[9px] font-black uppercase tracking-[0.14em] text-[#8a99a8]">{item.label}</span><span className="mt-0.5 block truncate text-xs font-bold text-[#0b2d54]">{item.title}</span><span className="mt-0.5 block truncate text-[10px] text-[#74859a]">{item.detail}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-[#93a1ad]" /></Link>; })}</div>}
          </section>

          <div id="daily-health-check-in" className="mt-7 flex items-end justify-between gap-5"><h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Daily health check-in</h2><p className="hidden text-right text-[11px] text-[#74859a] sm:block">A few answers help Sympto understand your day.</p></div>
          <div className="mt-3.5"><DailyHealthCheckIn embedded goals={goals} /></div>

          <section id="current-health" className="mt-7 rounded-[27px] border border-[#e0ebef] bg-white p-5 shadow-[0_5px_18px_rgba(11,45,84,0.03)] sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#71839a]">Current health</p><h2 className="mt-1 text-xl font-black tracking-[-.045em] text-[#0b2d54]">Vitals and essentials</h2></div>
              <Link href="/health-journal" className="text-[10px] font-black text-[#0b2d54]">Open health journal <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
            </div>
            <HealthVitalsSummary measurements={healthVitals} bmi={bmi} bmiCategory={bmiCategory} weightKg={weightKg} heightCm={heightCm} />
          </section>

          <div id="today-goals" className="mt-7 flex items-end justify-between gap-5"><h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Your active goals</h2><Link href="/health-goals" className="text-[10px] font-black text-[#0b2d54]">Manage goals <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>

          {(medicationGoal || smokingGoal || alcoholGoal) && <section className="mt-3.5 grid items-stretch gap-4 lg:grid-cols-2">
            {medicationGoal ? <TodayMedicationActions medications={medications} goal={medicationGoal} onUpdated={reload} /> : <div />}
            {smokingGoal ? (() => {
              const goalId = String(smokingGoal.id);
              const todayLogged = smokingToday[goalId] ?? null;
              const dailyTarget = Number(smokingGoal?.metricConfig?.frequencyTarget ?? smokingGoal?.frequencyTarget ?? smokingGoal?.targetValue ?? 0);
              const hasTarget = Number.isFinite(dailyTarget) && dailyTarget > 0;
              const difference = todayLogged !== null && hasTarget ? todayLogged - dailyTarget : 0;
              const targetReached = todayLogged !== null && hasTarget && todayLogged >= dailyTarget;
              const exceeded = todayLogged !== null && hasTarget && todayLogged > dailyTarget;
              const scaleMax = Math.max(hasTarget ? dailyTarget * 2 : 1, todayLogged ?? 0, 1);
              const todayBar = todayLogged === null ? 0 : Math.min(100, (todayLogged / scaleMax) * 100);
              const targetMarker = hasTarget ? Math.min(100, (dailyTarget / scaleMax) * 100) : 50;
              const startDate = new Date(String(smokingGoal?.createdAt ?? Date.now()));
              const targetDate = new Date(String(smokingGoal?.targetDate ?? "2026-09-30T00:00:00Z"));
              const journeyDay = Number.isNaN(startDate.getTime()) ? 1 : Math.max(1, Math.floor((Date.now() - startDate.getTime()) / 86400000) + 1);
              const daysLeft = Number.isNaN(targetDate.getTime()) ? null : Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86400000));
              const loggingLocked = targetReached || savingSmokingGoalId === goalId;

              return <article className="flex h-full flex-col rounded-[24px] border border-[#dfe9ed] bg-white shadow-[0_5px_18px_rgba(11,45,84,.035)]">
                <div className="flex-1 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b6f73]"><Cigarette className="h-5 w-5" /></span><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7d8c98]">Smoking cessation tracker</p><h3 className="mt-1 truncate text-[17px] font-black tracking-[-.025em] text-[#0b2d54]">{text(smokingGoal.title, "Smoking")}</h3></div></div>
                    {todayLogged !== null && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${targetReached ? "bg-slate-100 text-slate-600" : exceeded ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{targetReached ? "Daily target reached" : exceeded ? "Above today’s target" : "On track today"}</span>}
                  </div>

                  {todayLogged === null ? (
                    <div className="mt-5 rounded-[18px] border border-[#e7eef1] bg-[#f8fbfc] p-4">
                      <p className="text-lg font-black tracking-[-.03em] text-[#0b2d54]">Today&apos;s smoking: Not logged</p>
                      <p className="mt-1.5 text-[11px] leading-5 text-[#74859a]">Log honestly when you are ready. Sympto will compare it with your daily ceiling without treating an unlogged day as zero.</p>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-[18px] border border-[#e7eef1] bg-[#fbfdfd] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-3xl font-black leading-none tracking-[-.06em] text-[#0b2d54]">{todayLogged}</p>
                          <p className="mt-1 text-sm font-bold text-[#74859a]">cigarettes today</p>
                          <p className="mt-2 text-[10px] font-semibold text-[#74859a]">Daily Target: {formatNumber(dailyTarget)} cigarettes</p>
                        </div>
                        <div className="shrink-0 text-right"><p className={`text-xl font-black ${exceeded ? "text-[#a34f43]" : targetReached ? "text-[#0b2d54]" : "text-[#168660]"}`}>{difference > 0 ? `+${difference}` : difference}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#8a99a6]">Today&apos;s difference</p></div>
                      </div>

                      <div className="mt-5">
                        <div className="relative h-3 rounded-full bg-[#edf2f5]">
                          <div className={`absolute inset-y-0 left-0 rounded-full ${exceeded ? "bg-[#d9775f]" : targetReached ? "bg-[#0b2d54]" : "bg-[#35b77a]"}`} style={{ width: `${todayBar}%` }} />
                          {hasTarget && <span className="absolute -top-1.5 h-6 w-0.5 rounded-full bg-[#0b2d54]" style={{ left: `${targetMarker}%` }} aria-hidden="true" />}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-semibold text-[#8795a0]"><span>0</span><span className="font-black text-[#0b2d54]">Daily target {formatNumber(dailyTarget)}</span><span className={`font-black ${exceeded ? "text-[#a34f43]" : difference < 0 ? "text-[#168660]" : "text-[#0b2d54]"}`}>{difference > 0 ? `${Math.abs(difference)} above target` : difference < 0 ? `${Math.abs(difference)} below target` : "At target"}</span></div>
                      </div>
                    </div>
                  )}

                  {openSmokingGoalId === goalId && !loggingLocked && <div className="mt-4 rounded-xl bg-[#f7fafb] p-3"><label className="text-[9px] font-black uppercase tracking-[0.14em] text-[#74859a]" htmlFor={`smoking-${goalId}`}>Cigarettes today</label><div className="mt-2 flex gap-2"><input id={`smoking-${goalId}`} type="number" min="0" max={hasTarget ? dailyTarget : undefined} step="1" inputMode="numeric" value={smokingDrafts[goalId] ?? ""} onChange={(event) => setSmokingDrafts((current) => ({ ...current, [goalId]: event.target.value }))} className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#d7e4e8] bg-white px-3 text-sm font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" /><button type="button" disabled={savingSmokingGoalId === goalId} onClick={() => void saveSmokingToday(smokingGoal)} className="min-h-10 rounded-xl bg-[#0b2d54] px-4 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{savingSmokingGoalId === goalId ? "Saving…" : "Save"}</button></div><button type="button" onClick={() => setOpenSmokingGoalId(null)} className="mt-2 text-[9px] font-bold text-[#74859a]">Cancel</button></div>}
                </div>

                <div className="border-t border-[#edf2f5] px-4 py-4">
                  <div className="mb-3 flex items-center justify-between gap-3 text-[10px] text-[#74859a]"><span>Day {journeyDay} of your journey</span>{daysLeft !== null && <span>{daysLeft} days left until {formatDate(targetDate)}</span>}</div>
                  <div className="grid grid-cols-2 gap-2"><button type="button" disabled={loggingLocked} aria-disabled={loggingLocked} onClick={() => { if (loggingLocked) return; setOpenSmokingGoalId(goalId); setSmokingDrafts((current) => ({ ...current, [goalId]: todayLogged === null ? "" : String(todayLogged) })); }} className={`min-h-10 rounded-xl px-3 py-2 text-[10px] font-black transition ${loggingLocked ? "cursor-not-allowed bg-[#eef2f4] text-[#93a0aa]" : "bg-[#0b2d54] text-white hover:bg-[#123e66]"}`}>{savingSmokingGoalId === goalId ? "Saving…" : targetReached ? "Daily target reached" : todayLogged === null ? "Log today’s smoking" : "Update today’s log"}</button><Link href="/health-goals" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2 text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link></div>
                </div>
              </article>;
            })() : <div />}
            {alcoholGoal && <TodayAlcoholGoal goal={alcoholGoal} onUpdated={reload} />}
          </section>}

          {weightGoal && <section className="mt-4 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3"><TodayWeightGoal goal={weightGoal} fallbackWeight={weightKg} /></section>}

          {otherGoals.length > 0 && <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{otherGoals.map((goal: any) => { const category = String(goal?.category ?? "OTHER").toUpperCase(); const meta = GOAL_META[category] ?? GOAL_META.OTHER; const Icon = meta.icon; const progress = goalProgress(goal); const journey = goalJourney(goal); const targetLabel = goalTarget(goal); return <article key={String(goal.id)} className="flex h-full flex-col rounded-[24px] border border-[#e0ebee] bg-white shadow-[0_5px_18px_rgba(11,45,84,.03)]"><div className="flex-1 p-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${meta.surface} ${meta.accent}`}><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className={`text-[9px] font-black uppercase tracking-[0.14em] ${meta.accent}`}>{meta.label}</p><h3 className="mt-1 truncate text-[16px] font-black text-[#0b2d54]">{text(goal.title, "Health goal")}</h3></div></div><span className="shrink-0 rounded-full bg-[#f1f6f8] px-2.5 py-1 text-[9px] font-black text-[#6f8091]">{progress}%</span></div><div className="mt-5 rounded-[18px] border border-[#e7eef1] bg-[#fbfdfd] p-4"><div className="flex items-end justify-between gap-4"><div><p className="text-3xl font-black leading-none tracking-[-.06em] text-[#0b2d54]">{progress}%</p><p className="mt-1 text-sm font-bold text-[#74859a]">progress</p></div><div className="text-right"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#8a99a6]">Target</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{targetLabel}</p></div></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-[#edf2f5]"><div className="h-full rounded-full bg-gradient-to-r from-[#0b6f73] to-[#24c1c4]" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-right text-[9px] font-semibold text-[#8a99a6]">{progress === 0 ? "Not started yet" : `${progress}% complete`}</p></div></div><div className="border-t border-[#edf2f5] px-4 py-4"><div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#91a0ae]">Target date</p><p className="mt-0.5 text-xs font-black text-[#17314e]">{Number.isNaN(journey.targetDate.getTime()) ? "—" : formatDate(journey.targetDate)}</p><p className="text-[9px] font-medium text-[#7b8da1]">{journey.daysLeft === null ? "Target date not set" : journey.daysLeft === 0 ? "Target date is today" : `${journey.daysLeft} days left to target`}</p></div><span className="text-[9px] font-semibold text-[#7b8da1]">Day {journey.journeyDay} of your journey</span></div><Link href="/health-goals" className="inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2 text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link></div></article>; })}</section>}

          {!medicationGoal && !smokingGoal && !alcoholGoal && !weightGoal && <Link href="/health-goals" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[10px] font-black text-white">Set a health goal <ArrowRight className="h-3.5 w-3.5" /></Link>}
        </div>
      </main>
    </ProtectedRoute>
  );
}
