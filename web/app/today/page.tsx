"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Bell, CalendarDays, ClipboardCheck, Sparkles } from "lucide-react";
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
import TodaySupportedGoalCard from "@/components/today/today-supported-goal-card";

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
  const source = String(medication?.source ?? "").trim().toLowerCase();
  const syntheticPrescriptionId = String(medication?.id ?? "").startsWith("prescription-item-");
  return medication?.patientMedicationId ||
    medication?.patientMedication?.id ||
    (source !== "prescription" && !syntheticPrescriptionId ? medication?.id : null) ||
    null;
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
  const medicationRecordIds = [
    medicationId,
    medication?.patientMedicationId,
    medication?.patientMedication?.id,
  ].filter(Boolean).map(String);
  const medicationCatalogIds = [
    medication?.medicationId,
    medication?.medication?.id,
    medication?.medication?.medicationId,
  ].filter(Boolean).map(String);

  return goals.find((goal: any) => {
    const status = String(goal?.status ?? "").toUpperCase();
    const isLiveMedicationGoal =
      ACTIVE_GOAL_STATUSES.has(status) ||
      status === "NOT_STARTED";
    if (!isMedicationGoal(goal) || !isLiveMedicationGoal) return false;

    const linkedPatientMedicationId =
      goal?.patientMedicationId ||
      goal?.patientMedication?.id ||
      goal?.associatedPatientMedicationId ||
      goal?.associatedPatientMedication?.id;

    if (linkedPatientMedicationId && medicationRecordIds.length > 0) {
      if (medicationRecordIds.includes(String(linkedPatientMedicationId))) return true;
    }

    const linkedMedicationId =
      goal?.associatedMedicationId ||
      goal?.medicationId ||
      goal?.associatedMedication?.id ||
      goal?.medication?.id;

    if (linkedMedicationId && medicationCatalogIds.length > 0) {
      if (medicationCatalogIds.includes(String(linkedMedicationId))) return true;
    }

    const name = medicationName(medication);
    const goalNames = [
      goal?.medication?.name,
      goal?.medication?.genericName,
      goal?.medication?.brandName,
      goal?.title,
      goal?.description,
    ].map(normalise).filter(Boolean);

    if (name) {
      const matchesMedicationName = goalNames.some(
        (candidate) =>
          candidate === name ||
          candidate.includes(name) ||
          name.includes(candidate),
      );
      if (matchesMedicationName) return true;
    }

    return medicationCount === 1 && normalise(goal?.title) === "manage medication";
  }) ?? null;
}

export default function TodayPage() {
  const { data, loading, error, reload } = useDashboard();

  useEffect(() => {
    if (loading || error || !data || typeof window === "undefined") return;
    const hash = window.location.hash;
    const supportedHash =
      hash.startsWith("#medication-adherence-card-") ||
      hash.startsWith("#health-goal-card-");
    if (!supportedHash) return;

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
  const medicationGoalCandidates = allGoals.filter((goal: any) => {
    const status = String(goal?.status ?? "").toUpperCase();
    return isMedicationGoal(goal) && !["ARCHIVED", "CANCELLED", "DELETED"].includes(status);
  });
  const todayGoalArray = activeGoalsArray;
  const goals = activeGoalsArray;
  const medicationGoalCards = (Array.isArray(medications) ? medications : []).map((medication: any) => {
    const goal = medicationGoalFor(medication, medicationGoalCandidates, medications.length);
    const linkedPatientMedicationId =
      goal?.patientMedicationId ??
      goal?.patientMedication?.id ??
      goal?.associatedPatientMedicationId ??
      goal?.associatedPatientMedication?.id ??
      null;
    const resolvedMedication =
      linkedPatientMedicationId && !patientMedicationId(medication)
        ? {
            ...medication,
            patientMedicationId: String(linkedPatientMedicationId),
            patientMedication: {
              ...(medication?.patientMedication ?? {}),
              id: String(linkedPatientMedicationId),
            },
          }
        : medication;
    return { medication: resolvedMedication, goal };
  });
  const unmatchedMedicationGoals = medicationGoalCandidates.filter((goal: any) => !medicationGoalCards.some((item: any) => item.goal?.id === goal?.id));
  const matchedMedicationGoalCards = medicationGoalCards.filter((item: any) => Boolean(item.goal));
  const unmatchedMedicationGoalCards = unmatchedMedicationGoals.map((goal: any) => ({
    goal,
    medication: (Array.isArray(medications) ? medications : []).find((medication: any) => {
      const targetPatientMedicationId =
        goal?.patientMedicationId ||
        goal?.patientMedication?.id ||
        goal?.associatedPatientMedicationId ||
        goal?.associatedPatientMedication?.id;
      return targetPatientMedicationId && String(patientMedicationId(medication)) === String(targetPatientMedicationId);
    }) ?? medications[0] ?? null,
  }));
  const medicationGoalCardsForToday = [...matchedMedicationGoalCards, ...unmatchedMedicationGoalCards].filter((item: any) => Boolean(item.goal));
  const matchedMedicationGoalCard = matchedMedicationGoalCards[0] ?? null;
  const medicationGoal = medicationGoalCardsForToday[0]?.goal || null;
  const smokingGoal = todayGoalArray.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "SMOKING");
  const alcoholGoal = todayGoalArray.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "ALCOHOL");
  const weightGoal = todayGoalArray.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "WEIGHT");
  const exerciseGoal = todayGoalArray.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "EXERCISE");
  const dedicatedTodayCategories = new Set(["MEDICATION", "SMOKING", "ALCOHOL", "WEIGHT", "EXERCISE"]);
  const otherTodayGoals = activeGoalsArray.filter((goal: any) => !dedicatedTodayCategories.has(String(goal?.category ?? "").toUpperCase()));
  const primaryMedicationId = medicationGoalCardsForToday[0]?.medication ? patientMedicationId(medicationGoalCardsForToday[0].medication) : null;

  const attention = data.attention ?? [];
  const carePlans = data.carePlans ?? [];
  const careTasks = carePlans.flatMap((plan: any) => (Array.isArray(plan.tasks) ? plan.tasks : []).filter((task: any) => !["COMPLETED", "CANCELLED"].includes(String(task.status ?? "").toUpperCase())).map((task: any) => ({ ...task, carePlanTitle: plan.title })));
  const nextAppointment = Array.isArray(appointments)
    ? appointments
        .filter((appointment: any) => appointment?.scheduledStart && !Number.isNaN(new Date(String(appointment.scheduledStart)).getTime()))
        .sort((a: any, b: any) => new Date(String(a.scheduledStart)).getTime() - new Date(String(b.scheduledStart)).getTime())[0] ?? null
    : null;
  const appointmentIsToday = Boolean(
    nextAppointment?.scheduledStart &&
      new Date(String(nextAppointment.scheduledStart)).toDateString() === new Date().toDateString(),
  );
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
        <section className="mt-7">
          <div className="mb-3.5 flex items-end justify-between gap-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#24aeb3]">Start here</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.045em] text-[#0b2d54]">What needs your attention today</h2>
            </div>
            <p className="hidden max-w-sm text-right text-[11px] leading-5 text-[#74859a] sm:block">Your scheduled care and daily actions are kept together first.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <div className="min-w-0"><PrescribedMedicationsCard prescriptionsList={Array.isArray(medications) ? medications : []} activeGoalsArray={medicationGoalCandidates} /></div>
            <div className="min-w-0">
              <section className="h-full rounded-[27px] border border-[#e0ebef] bg-white p-5 shadow-[0_5px_18px_rgba(11,45,84,0.03)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#e8f8f7] text-[#0b7b80]"><CalendarDays className="h-4 w-4" /></span>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#71839a]">Care</p>
                      <h2 className="text-sm font-black text-[#0b2d54]">{appointmentIsToday ? "Today&apos;s appointment" : "Next appointment"}</h2>
                    </div>
                  </div>
                  <Link href="/appointments" className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2.5 py-2 text-[9px] font-black text-[#0b2d54] hover:bg-[#f4fafb]">View all <ArrowRight className="h-3 w-3" /></Link>
                </div>
                {nextAppointment ? (
                  <Link href={nextAppointment.id ? `/appointments/${encodeURIComponent(String(nextAppointment.id))}` : "/appointments"} className="mt-4 block h-[calc(100%-3.25rem)] rounded-[21px] bg-gradient-to-br from-[#f7fbfb] to-[#f2f8fa] p-4 ring-1 ring-[#e4edef] transition hover:ring-[#24c1c4]/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]">
                    <div className="flex h-full flex-col justify-between gap-5">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black tracking-[-.03em] text-[#0b2d54]">{text(nextAppointment.title || nextAppointment.type || "Healthcare appointment")}</h3>
                          {appointmentIsToday && <span className="rounded-full bg-[#e8f8f7] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#0b7b80]">Today</span>}
                        </div>
                        <p className="mt-2 text-sm font-bold text-[#0b2d54]">{formatDate(nextAppointment.scheduledStart, true)}</p>
                        {(nextAppointment.practitioner?.person || nextAppointment.practice?.name) && (
                          <p className="mt-1.5 text-[11px] text-slate-500">
                            {nextAppointment.practitioner?.person ? [nextAppointment.practitioner.person.firstName, nextAppointment.practitioner.person.lastName].filter(Boolean).join(" ") : ""}
                            {nextAppointment.practitioner?.person && nextAppointment.practice?.name ? " · " : ""}
                            {nextAppointment.practice?.name ? String(nextAppointment.practice.name) : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-[#dfe9ec] pt-4">
                        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#71839a]">Appointment details</span>
                        <span className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[#0b2d54] px-3 py-2 text-[9px] font-black text-white">View <ArrowRight className="h-3 w-3 text-[#24c1c4]" /></span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="mt-4 flex h-[calc(100%-3.25rem)] flex-col justify-between rounded-[21px] border border-dashed border-[#dce8ec] bg-slate-50/70 p-4">
                    <div>
                      <p className="text-base font-black text-[#0b2d54]">No upcoming appointments</p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-500">When a healthcare appointment is recorded for you, it will appear here automatically.</p>
                    </div>
                    <Link href="/appointments" className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#0b2d54] px-3.5 py-2.5 text-[9px] font-black text-white">Open appointments <ArrowRight className="h-3.5 w-3.5 text-[#24c1c4]" /></Link>
                  </div>
                )}
              </section>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div id="daily-health-check-in" className="mb-3.5 flex items-end justify-between gap-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#24aeb3]">Daily rhythm</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.045em] text-[#0b2d54]">Check in with yourself</h2>
            </div>
            <p className="hidden text-right text-[11px] text-[#74859a] sm:block">A few answers help Sympto understand your day.</p>
          </div>
          <div className="overflow-hidden rounded-[30px] bg-white shadow-[0_8px_30px_rgba(11,45,84,0.035)] ring-1 ring-[#e0ebef]">
            <DailyHealthCheckIn embedded goals={goals} medicationGoalHref={medicationGoal && primaryMedicationId ? `#medication-adherence-card-${String(primaryMedicationId)}` : null} />
          </div>
        </section>

        {attention.length > 0 && <section className="mt-8 rounded-[27px] border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-[0_8px_24px_rgba(161,98,4,0.05)] sm:p-6"><div className="flex items-start gap-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-amber-100 text-amber-700"><Bell className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-700/80">Check this next</p><h2 className="mt-1 text-sm font-black text-[#0b2d54]">Needs your attention</h2></div></div><div className="mt-3 space-y-2">{attention.map((item: any, index: number) => <div key={String(item.id ?? index)} className="rounded-xl bg-white p-3.5 text-xs leading-5 text-slate-600 ring-1 ring-amber-100">{text(item.title || item.message || item.description)}</div>)}</div></section>}

        <section id="current-health" className="mt-8 rounded-[27px] border border-[#e0ebef] bg-white p-5 shadow-[0_5px_18px_rgba(11,45,84,0.03)] sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#71839a]">Your snapshot</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.045em] text-[#0b2d54]">Current health</h2>
              <p className="mt-1 text-[11px] text-[#74859a]">The latest vitals and essential measurements we have for you.</p>
            </div>
            <Link href="/health-journal" className="text-[10px] font-black text-[#0b2d54]">Open health journal <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
          </div>
          <HealthVitalsSummary measurements={healthVitals} bmi={bmi} bmiCategory={bmiCategory} weightKg={weightKg} heightCm={heightCm} />
        </section>

        <section className="mt-8">
          <div id="today-goals" className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#24aeb3]">Keep momentum</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.045em] text-[#0b2d54]">Your active goals</h2>
              <p className="mt-1 text-[11px] text-[#74859a]">Track the goals you are actively working on.</p>
            </div>
            <Link href="/health-goals" className="text-[10px] font-black text-[#0b2d54]">Manage goals <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
          </div>
          {(medicationGoalCardsForToday.length > 0 || smokingGoal || alcoholGoal || weightGoal || exerciseGoal) && <div className="mt-3.5 grid items-stretch gap-4 lg:grid-cols-2">
            {medicationGoalCardsForToday.map((item: any) => item.medication ? <TodayMedicationActions key={`medication-goal-${String(item.goal?.id ?? patientMedicationId(item.medication) ?? "unassigned")}`} medications={[item.medication]} goal={item.goal} onUpdated={reload} /> : null)}
            {smokingGoal ? <TodaySmokingGoal goal={smokingGoal} onUpdated={reload} /> : null}
            {alcoholGoal ? <TodayAlcoholGoal goal={alcoholGoal} onUpdated={reload} /> : null}
            {weightGoal ? <TodayWeightGoal goal={weightGoal} /> : null}
            {exerciseGoal ? <TodayExerciseGoal goal={exerciseGoal} /> : null}
          </div>}
          {otherTodayGoals.length > 0 && <section className="mt-7 rounded-[27px] border border-[#e5edef] bg-[#f8fbfb] p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#71839a]">More to monitor</p>
                <h3 className="mt-1 text-base font-black tracking-[-.03em] text-[#0b2d54]">Other active goals</h3>
                <p className="mt-1 text-[11px] leading-5 text-[#74859a]">These stay connected to their matching health data without competing with your main actions.</p>
              </div>
              <Link href="/health-goals" className="hidden text-[10px] font-black text-[#0b2d54] sm:inline-flex">Manage goals <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
            </div>
            <div className="mt-3.5 grid items-stretch gap-4 lg:grid-cols-2">{otherTodayGoals.map((goal: any, index: number) => <TodaySupportedGoalCard key={String(goal?.id ?? "goal-" + index)} goal={goal} onUpdated={reload} />)}</div>
          </section>}
        </section>
        {careTasks.length > 0 && <section className="mt-7 rounded-[27px] border border-[#e0ebef] bg-white p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-[#24c1c4]" /><h2 className="text-sm font-black text-[#0b2d54]">Care plan tasks</h2></div><Link href="/care-plans" className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2 text-[9px] font-black text-[#0b2d54]">Open care plans <ArrowRight className="h-3 w-3" /></Link></div><div className="mt-3 space-y-2">{careTasks.map((task: any, index: number) => <div key={String(task.id ?? index)} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-[#0b2d54]">{text(task.title || task.name || "Care task")}</p><p className="mt-1 text-[11px] text-slate-500">{text(task.carePlanTitle)}</p></div>)}</div></section>}
      </div></main>
    </ProtectedRoute>
  );
}
