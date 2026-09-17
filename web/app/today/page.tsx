"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Activity, Apple, Bell, Brain, CalendarDays, CheckCircle2, ClipboardCheck, Droplets, HeartPulse, Moon, Pill, Scale, ShieldCheck, Sparkles, Target, Wine, Footprints } from "lucide-react";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import DailyHealthCheckIn from "@/components/dashboard/daily-health-check-in";
import HealthVitalsSummary, { type DashboardVital } from "@/components/dashboard/health-vitals-summary";
import PrescribedMedicationsCard from "@/components/today/prescribed-medications-card";
import TodayMedicationActions from "@/components/today/today-medication-actions";
import TodaySmokingGoal from "@/components/today/today-smoking-goal";
import TodayAlcoholGoal from "@/components/today/today-alcohol-goal";
import TodayWeightGoal from "@/components/today/today-weight-goal";
import TodayExerciseGoal from "@/components/today/today-exercise-goal";
import { TODAY_GOAL_CARD_CLASS, TODAY_GOAL_FOOTER_CLASS } from "@/components/today/today-goal-card-styles";

const ACTIVE_GOAL_STATUSES = new Set(["IN_PROGRESS", "ACTIVE", "ON_TRACK", "IMPROVING", "STAGNANT", "DECLINING"]);

function text(value: unknown, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function formatDate(value: unknown, includeTime = false) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-ZA", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
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

function patientMedicationId(medication: any) {
  return medication?.patientMedicationId || medication?.patientMedication?.id || medication?.id || null;
}

function normalise(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function medicationName(medication: any) {
  return normalise(medication?.medication?.name || medication?.name || medication?.medication?.genericName || medication?.medication?.brandName);
}

function isMedicationGoal(goal: any) {
  const category = String(goal?.category ?? "").toUpperCase();
  const metricType = String(goal?.metricType ?? "").toUpperCase();
  const metricKey = String(goal?.metricConfig?.metricKey ?? goal?.metricKey ?? "").toLowerCase();
  return category === "MEDICATION" || metricType === "MEDICATION" || metricKey === "medication.adherence";
}

function medicationGoalFor(medication: any, goals: any[], medicationCount: number) {
  const medicationId = patientMedicationId(medication);
  const medicationCatalogIds = [medication?.medicationId, medication?.medication?.id, medication?.medication?.medicationId].filter(Boolean).map(String);

  return goals.find((goal: any) => {
    const status = String(goal?.status ?? "").toUpperCase();
    if (!isMedicationGoal(goal) || !["ACTIVE", "IN_PROGRESS"].includes(status)) return false;

    if (goal?.patientMedicationId) {
      return Boolean(medicationId) && String(goal.patientMedicationId) === String(medicationId);
    }

    const linkedMedicationId = goal?.associatedMedicationId || goal?.medicationId || goal?.associatedMedication?.id || goal?.patientMedication?.id || goal?.medication?.id;
    if (linkedMedicationId) return medicationCatalogIds.includes(String(linkedMedicationId));

    const title = normalise(goal?.title);
    if (medicationCount === 1 && title === "manage medication") return true;

    const name = medicationName(medication);
    if (!name) return false;
    const goalNames = [goal?.medication?.name, goal?.medication?.genericName, goal?.medication?.brandName, goal?.title, goal?.description].map(normalise).filter(Boolean);
    return goalNames.some((candidate) => candidate === name || candidate.includes(name) || name.includes(candidate));
  }) ?? null;
}

const GOAL_META: Record<string, { label: string; icon: typeof Target; accent: string; surface: string }> = {
  NUTRITION: { label: "Nutrition", icon: Apple, accent: "text-orange-700", surface: "bg-orange-50" },
  BLOOD_PRESSURE: { label: "Blood pressure", icon: HeartPulse, accent: "text-rose-700", surface: "bg-rose-50" },
  BLOOD_GLUCOSE: { label: "Blood glucose", icon: Activity, accent: "text-amber-700", surface: "bg-amber-50" },
  CHOLESTEROL: { label: "Cholesterol", icon: ShieldCheck, accent: "text-blue-700", surface: "bg-blue-50" },
  SLEEP: { label: "Sleep", icon: Moon, accent: "text-indigo-700", surface: "bg-indigo-50" },
  MENTAL_HEALTH: { label: "Mental health", icon: Brain, accent: "text-fuchsia-700", surface: "bg-fuchsia-50" },
  HYDRATION: { label: "Hydration", icon: Droplets, accent: "text-cyan-700", surface: "bg-cyan-50" },
  HEART_RATE: { label: "Heart rate", icon: HeartPulse, accent: "text-red-700", surface: "bg-red-50" },
  MEDICATION: { label: "Medication", icon: Pill, accent: "text-emerald-700", surface: "bg-emerald-50" },
  OTHER: { label: "Personal goal", icon: Target, accent: "text-[#0b2d54]", surface: "bg-[#edf4ff]" },
};

export default function TodayPage() {
  const { data, loading, error, reload } = useDashboard();

  useEffect(() => {
    if (loading || error || !data || typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.startsWith("#medication-adherence-card-")) return;

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scrollToMedicationGoal = () => {
      const targetId = decodeURIComponent(hash.slice(1));
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (attempts < 12) {
        attempts += 1;
        timer = setTimeout(scrollToMedicationGoal, 100);
      }
    };

    requestAnimationFrame(scrollToMedicationGoal);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading, error, data]);

  if (loading) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f5fafb] p-4 sm:p-8"><div className="mx-auto max-w-[1260px] space-y-5" aria-busy="true"><div className="h-[58px] animate-pulse rounded-[24px] bg-white" /><div className="h-[270px] animate-pulse rounded-[30px] bg-white" /><div className="h-[420px] animate-pulse rounded-[27px] bg-white" /></div></main></ProtectedRoute>;
  }

  if (error || !data) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f5fafb] p-4 sm:p-8"><div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-white p-7"><h1 className="text-xl font-black text-[#0b2d54]">We couldn&apos;t load today</h1><p className="mt-2 text-sm leading-6 text-slate-500">Your saved health information has not been changed. Please try again.</p><button type="button" onClick={reload} className="mt-5 min-h-11 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-semibold text-white">Try again</button></div></main></ProtectedRoute>;
  }

  const firstName = data.patient?.firstName || data.profile?.preferredName || "there";
  const medications = data.today?.activeMedications ?? [];
  const appointments = data.today?.upcomingAppointments ?? [];
  const allGoals = data.goals ?? data.healthGoals ?? [];
  const activeGoalsArray = allGoals.filter((goal: any) => ACTIVE_GOAL_STATUSES.has(String(goal?.status ?? "").toUpperCase()));
  const goals = allGoals.filter((goal: any) => String(goal?.status).toUpperCase() === "ACTIVE");
  const medicationGoalCards = (Array.isArray(medications) ? medications : []).map((medication: any) => ({ medication, goal: medicationGoalFor(medication, activeGoalsArray, medications.length) }));
  const unmatchedMedicationGoals = activeGoalsArray.filter((goal: any) => isMedicationGoal(goal) && !medicationGoalCards.some((item: any) => item.goal?.id === goal?.id));
  const medicationGoal = medicationGoalCards.find((item: any) => item.goal)?.goal || unmatchedMedicationGoals[0] || null;
  const smokingGoal = goals.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "SMOKING");
  const alcoholGoal = goals.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "ALCOHOL");
  const weightGoal = goals.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "WEIGHT");
  const exerciseGoal = goals.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "EXERCISE");

  const attention = data.attention ?? [];
  const carePlans = data.carePlans ?? [];
  const careTasks = carePlans.flatMap((plan: any) => (Array.isArray(plan.tasks) ? plan.tasks : []).filter((task: any) => !["COMPLETED", "CANCELLED"].includes(String(task.status ?? "").toUpperCase())).map((task: any) => ({ ...task, carePlanTitle: plan.title })));
  const todayAppointments = appointments.filter((appointment: any) => appointment?.scheduledStart && new Date(String(appointment.scheduledStart)).toDateString() === new Date().toDateString());
  const notifications = (data.today?.notifications ?? data.notifications ?? []).filter((item: any) => !item.scheduledFor || new Date(String(item.scheduledFor)) <= new Date());
  const healthVitals = normalizeVitals(data);
  const bmi = data.healthSnapshot?.bmi ?? data.patient?.bmi ?? null;
  const bmiCategory = data.healthSnapshot?.bmiCategory ?? data.patient?.bmiCategory ?? null;
  const weightKg = data.patient?.weightKg ?? data.healthSnapshot?.weightKg ?? null;
  const heightCm = data.patient?.heightCm ?? data.healthSnapshot?.heightCm ?? null;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5fafb] text-[#17314e"><div className="mx-auto max-w-[1260px] px-4 pb-12 pt-4 sm:px-7 sm:pt-6">
        <header className="mb-5 flex items-center justify-between"><Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#0b2d54] hover:bg-white"><ArrowLeft className="h-4 w-4" />My Health</Link><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#71839a] shadow-sm ring-1 ring-[#e0ebef]">Today</span></header>
        <section className="rounded-[30px] bg-gradient-to-br from-[#08284a] via-[#0e4773] to-[#24babe] p-7 text-white shadow-[0_20px_55px_rgba(11,45,84,0.12)] sm:p-9"><p className="text-sm font-medium text-white/75">Hi {firstName}</p><div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">What do I do today?</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Your important health actions, brought together in one place.</p></div><Link href="/log-symptom" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/12 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/20"><Sparkles className="h-4 w-4" />Log a symptom</Link></div></section>
        <div className="mt-7 flex items-end justify-between gap-5"><h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Today, organised</h2><p className="hidden text-right text-[11px] text-[#74859a] sm:block">Only the things worth acting on.</p></div>
        <PrescribedMedicationsCard prescriptionsList={Array.isArray(medications) ? medications : []} activeGoalsArray={activeGoalsArray} />
        <div id="daily-health-check-in" className="mt-7 flex items-end justify-between gap-5"><h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Daily health check-in</h2><p className="hidden text-right text-[11px] text-[#74859a] sm:block">A few answers help Sympto understand your day.</p></div>
        <div className="mt-3.5"><DailyHealthCheckIn embedded goals={goals} /></div>
        <section id="current-health" className="mt-7 rounded-[27px] border border-[#e0ebef] bg-white p-5 shadow-[0_5px_18px_rgba(11,45,84,0.03)] sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#71839a]">Current health</p><h2 className="mt-1 text-xl font-black tracking-[-.045em] text-[#0b2d54]">Vitals and essentials</h2></div><Link href="/health-journal" className="text-[10px] font-black text-[#0b2d54]">Open health journal <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></div><HealthVitalsSummary measurements={healthVitals} bmi={bmi} bmiCategory={bmiCategory} weightKg={weightKg} heightCm={heightCm} /></section>
        <div id="today-goals" className="mt-7 flex items-end justify-between gap-5"><h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Your active goals</h2><Link href="/health-goals" className="text-[10px] font-black text-[#0b2d54]">Manage goals <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>
        {(medicationGoal || smokingGoal || alcoholGoal || weightGoal || exerciseGoal) && <section className="mt-3.5 grid items-stretch gap-4 lg:grid-cols-2">
          {medicationGoal ? <TodayMedicationActions medications={medicationGoalCards.find((item: any) => item.goal?.id === medicationGoal?.id)?.medication ? [medicationGoalCards.find((item: any) => item.goal?.id === medicationGoal?.id).medication] : medications.length > 0 ? [medications[0]] : []} goal={medicationGoal} onUpdated={reload} /> : null}
          {smokingGoal ? <TodaySmokingGoal goal={smokingGoal} onUpdated={reload} /> : null}
          {alcoholGoal ? <TodayAlcoholGoal goal={alcoholGoal} onUpdated={reload} /> : null}
          {weightGoal ? <TodayWeightGoal goal={weightGoal} onUpdated={reload} /> : null}
          {exerciseGoal ? <TodayExerciseGoal goal={exerciseGoal} onUpdated={reload} /> : null}
        </section>}
        {attention.length > 0 && <section className="mt-7 rounded-[27px] border border-amber-200 bg-amber-50/50 p-5"><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-amber-700" /><h2 className="text-sm font-black text-[#0b2d54]">Needs your attention</h2></div><div className="mt-3 space-y-2">{attention.map((item: any, index: number) => <div key={String(item.id ?? index)} className="rounded-xl bg-white p-3 text-xs text-slate-600 ring-1 ring-amber-100">{text(item.title || item.message || item.description)}</div>)}</div></section>}
        {todayAppointments.length > 0 && <section className="mt-7 rounded-[27px] border border-[#e0ebef] bg-white p-5"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#24c1c4]" /><h2 className="text-sm font-black text-[#0b2d54]">Today&apos;s appointments</h2></div><div className="mt-3 space-y-2">{todayAppointments.map((appointment: any, index: number) => <div key={String(appointment.id ?? index)} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs"><span className="font-semibold text-[#0b2d54]">{text(appointment.title || appointment.type || "Appointment")}</span><span className="text-slate-500">{formatDate(appointment.scheduledStart, true)}</span></div>)}</div></section>}
        {careTasks.length > 0 && <section className="mt-7 rounded-[27px] border border-[#e0ebef] bg-white p-5"><div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-[#24c1c4]" /><h2 className="text-sm font-black text-[#0b2d54]">Care plan tasks</h2></div><div className="mt-3 space-y-2">{careTasks.map((task: any, index: number) => <div key={String(task.id ?? index)} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-[#0b2d54]">{text(task.title || task.name || "Care task")}</p><p className="mt-1 text-[11px] text-slate-500">{text(task.carePlanTitle)}</p></div>)}</div></section>}
      </div></main>
    </ProtectedRoute>
  );
}
