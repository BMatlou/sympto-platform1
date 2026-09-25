"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, CheckCircle2, FileHeart, FolderOpen, Plus, ShieldCheck } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthJournalService } from "@/services/health-journal.service";
import ProtectedRoute from "@/components/auth/protected-route";

function display(value: unknown, fallback = "Not recorded"): string {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function normalizeVitals(data: any) {
  const deviceVitals = Array.isArray(data?.healthSnapshot?.latestMeasurements)
    ? data.healthSnapshot.latestMeasurements.map((item: any) => ({
        type: item.type ?? item.measurementType,
        value: item.value,
        unit: item.unit,
        measuredAt: item.measuredAt,
      }))
    : [];

  const clinicalVitals = Array.isArray(data?.clinicalVitals)
    ? data.clinicalVitals.map((item: any) => ({
        type: item.vitalType?.code ?? item.vitalType?.name,
        value: item.value,
        unit: item.vitalType?.unit,
        measuredAt: item.measuredAt,
      }))
    : [];

  const byType = new Map<string, any>();

  for (const vital of [...deviceVitals, ...clinicalVitals]) {
    const key = String(vital.type ?? "").toUpperCase();
    if (!key) continue;

    const previous = byType.get(key);
    if (
      !previous ||
      new Date(String(vital.measuredAt ?? 0)).getTime() >
        new Date(String(previous.measuredAt ?? 0)).getTime()
    ) {
      byType.set(key, vital);
    }
  }

  return Array.from(byType.values());
}

function itemNames(
  items: any[],
  kind: "allergy" | "condition",
): string[] {
  return items
    .map((item) =>
      kind === "allergy"
        ? item?.allergy?.name ?? item?.name
        : item?.condition?.name ?? item?.name,
    )
    .filter(Boolean) as string[];
}

function countActiveGoals(data: any) {
  return (Array.isArray(data?.goals) ? data.goals : []).filter(
    (goal: any) =>
      !["ACHIEVED", "ARCHIVED", "CANCELLED", "DELETED"].includes(
        String(goal?.status ?? "").toUpperCase(),
      ),
  ).length;
}

function recentSymptomFrom(data: any, symptomFeed: any[]) {
  const symptoms =
    symptomFeed.length > 0
      ? symptomFeed
      : Array.isArray(data?.symptoms)
        ? data.symptoms
        : [];
  return [...symptoms]
    .filter((symptom: any) => symptom?.id && (symptom?.startedAt || symptom?.createdAt))
    .sort(
      (a: any, b: any) =>
        new Date(String(b.startedAt ?? b.createdAt)).getTime() -
        new Date(String(a.startedAt ?? a.createdAt)).getTime(),
    )[0] ?? null;
}

function symptomLabel(symptom: any): string {
  if (!symptom) return "";
  if (symptom.title) return String(symptom.title);
  const names = Array.isArray(symptom.symptoms)
    ? symptom.symptoms
        .map((item: any) => item?.symptom?.name ?? item?.name)
        .filter(Boolean)
    : [];
  return names[0] ? String(names[0]) : "Symptom";
}

function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  if (hour >= 18 || hour < 5) return "Good evening";
  return "Hello";
}

function formatSymptomDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatAppointmentDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function RecordedChip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={"inline-flex min-h-6 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-black tracking-[-0.01em] shadow-[0_3px_12px_rgba(11,45,84,0.08)] backdrop-blur-md ring-1 ring-inset " + className}
    >
      {children}
    </span>
  );
}
function ActionLink({
  href,
  children,
  className = "",
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-label={ariaLabel}
      className={
        "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] focus-visible:ring-offset-2 " +
        className
      }
    >
      {children}
    </Link>
  );
}


export default function HealthHome() {
  const { data, loading, error, reload } = useDashboard();
  const [symptomFeed, setSymptomFeed] = useState<any[]>([]);
  const [journalRecordCount, setJournalRecordCount] = useState(0);

  useEffect(() => {
    if (!data?.patient?.id) return;

    let active = true;

    Promise.all([
      healthJournalService.getSymptoms({ limit: 100 }),
      healthJournalService.getAll({ page: 1, limit: 1 }),
    ])
      .then(([symptoms, journals]) => {
        if (!active) return;
        setSymptomFeed(Array.isArray(symptoms) ? symptoms : []);
        setJournalRecordCount(Number(journals?.pagination?.total ?? journals?.data?.length ?? 0));
      })
      .catch(() => {
        if (!active) return;
        setSymptomFeed([]);
      });

    return () => {
      active = false;
    };
  }, [data?.patient?.id, data?.generatedAt]);
  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f7fbfb] p-4 pt-[72px] sm:p-8 sm:pt-[88px] lg:pt-8">
          <div className="mx-auto max-w-[1240px] space-y-4" aria-busy="true">
            <div className="h-[360px] animate-pulse rounded-b-[42px] rounded-t-[30px] bg-white" />
            <div className="h-10 animate-pulse rounded-2xl bg-white" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-3xl bg-white"
              />
            ))}
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error || !data) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f7fbfb] p-4 sm:p-8">
          <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-7 shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-600">
              Sympto
            </p>
            <h1 className="mt-2 text-xl font-black text-[#0b2d54]">
              Your health screen could not load
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your saved health information has not been changed. Please try
              again.
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-5 min-h-11 rounded-2xl bg-[#0b2d54] px-5 py-2.5 text-sm font-black text-white transition-all duration-200 hover:bg-slate-100 hover:text-[#0b2d54]"
            >
              Try again
            </button>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  const greeting = getTimeGreeting();

  const firstName =
    data.patient?.firstName ||
    data.profile?.preferredName ||
    data.profile?.firstName ||
    "Dankie";

  const medications = Array.isArray(data.today?.activeMedications)
    ? data.today.activeMedications
    : [];
  const appointments = Array.isArray(data.today?.upcomingAppointments)
    ? data.today.upcomingAppointments
    : [];

  const activeGoalCount = countActiveGoals(data);
  const todayActionCount = medications.length + appointments.length + activeGoalCount;
  const attentionItems = Array.isArray(data?.attention) ? data.attention : [];
  const priorityItem = attentionItems[0] ?? null;
  const nextAppointment = (appointments[0] ?? null) as any;

  const recentSymptom = recentSymptomFrom(data, symptomFeed);
  const recentSymptomStatus = String(recentSymptom?.status ?? "").toUpperCase();
  const recentSymptomAt =
    recentSymptom?.startedAt ?? recentSymptom?.createdAt ?? null;

  // Chips shown on the three navigation cards are derived only from records
  // already loaded for this dashboard; they are not hard-coded health data.
  const todayChips = [
    medications.length > 0 ? `${medications.length} med${medications.length === 1 ? "" : "s"}` : null,
    activeGoalCount > 0 ? `${activeGoalCount} goal${activeGoalCount === 1 ? "" : "s"}` : null,
    appointments.length > 0 ? `${appointments.length} visit${appointments.length === 1 ? "" : "s"}` : null,
  ].filter((chip): chip is string => Boolean(chip));

  const activeConditions = Array.isArray(data.conditions)
    ? data.conditions
    : Array.isArray(data.healthSnapshot?.activeConditions)
      ? data.healthSnapshot.activeConditions
      : [];
  const activeAllergies = Array.isArray(data.allergies)
    ? data.allergies
    : Array.isArray(data.healthSnapshot?.activeAllergies)
      ? data.healthSnapshot.activeAllergies
      : [];

  const clinicChips = [
    activeConditions.length > 0
      ? `${activeConditions.length} condition${activeConditions.length === 1 ? "" : "s"}`
      : null,
    activeAllergies.length > 0
      ? `${activeAllergies.length} allerg${activeAllergies.length === 1 ? "y" : "ies"}`
      : null,
  ].filter((chip): chip is string => Boolean(chip));

  const journalRecordLabel = `${journalRecordCount} record${journalRecordCount === 1 ? "" : "s"}`;
  const symptomRecordLabel = `${symptomFeed.length} symptom${symptomFeed.length === 1 ? "" : "s"}`;

  return (
    <ProtectedRoute>
      <ActionLink
        href="/smart-file"
        ariaLabel="Share Smart File"
        className="fixed right-4 top-4 z-[60] inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[#0B2D54] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.08em] text-white shadow-[0_12px_28px_rgba(11,45,84,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#092544] sm:right-6 sm:top-5"
      >
        <FileHeart className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Share Smart File</span>
        <span className="sm:hidden">Share</span>
      </ActionLink>
      <main className="min-h-screen bg-[#EAF0F7] px-2 pb-2 pt-[72px] text-[#0B2D54] sm:px-4 sm:pb-4 sm:pt-[72px] lg:pl-[104px] lg:pt-4">
        <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1480px]">
          <section className="min-w-0">
            <div className="px-4 pb-5 pt-3 sm:px-5 lg:px-7">
              <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
                <section className="group relative min-h-[220px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B2D54] via-[#143D67] to-[#0F6173] p-6 text-white shadow-[0_24px_60px_rgba(11,45,84,0.16)] sm:p-7">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#24C1C4]/20 blur-3xl transition-transform duration-500 group-hover:scale-110" />
                  <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-1/4 h-56 w-56 rounded-full bg-white/[0.06] blur-3xl" />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-7 top-0 h-px bg-white/20" />

                  <div className="relative flex min-h-[166px] items-center justify-between gap-8">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/50">Overview</p>
                      <h2 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.05em] sm:text-[38px]">
                        {greeting}, {firstName}
                      </h2>
                      <p className="mt-2 max-w-[34rem] text-[11px] font-medium leading-5 text-white/66 sm:text-xs">
                        Your health, organised around what matters today.
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[52px] font-black leading-none tracking-[-0.08em] sm:text-[64px]">{todayActionCount}</p>
                      <p className="mt-2 max-w-[11rem] text-[9px] font-black uppercase leading-4 tracking-[0.08em] text-white/55">
                        active items today
                      </p>
                    </div>
                  </div>
                </section>

                <section className="group relative min-h-[210px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#29CFD0] via-[#20BBC0] to-[#0A9DA7] p-5 text-white shadow-[0_24px_60px_rgba(36,193,196,0.20)] ring-1 ring-inset ring-white/25 sm:p-6">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/45 blur-3xl transition-transform duration-500 group-hover:scale-110" />
                  <div aria-hidden="true" className="pointer-events-none absolute -left-20 -bottom-24 h-56 w-56 rounded-full bg-[#C9FFFF]/35 blur-3xl" />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-7 top-0 h-px bg-white/75" />

                  <div className="relative">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/14 ring-1 ring-inset ring-white/20">
                        <Activity
                          className="h-5 w-5 text-white/90"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </span>
                      <p className="text-[10px] font-black uppercase tracking-[0.17em] text-white/70">
                        Recent symptom
                      </p>
                    </div>

                    {recentSymptom ? (
                      <div className="mt-5 min-w-0">
                        <h2 className="truncate text-[29px] font-black tracking-[-0.05em] sm:text-[32px]">
                          {symptomLabel(recentSymptom)}
                        </h2>
                        <p className="mt-1 text-[11px] font-semibold text-white/76">
                          {formatSymptomDate(recentSymptomAt)}
                          {recentSymptomStatus === "ACTIVE" ? " · Active" : ""}
                        </p>

                        <div className="mt-3.5 flex flex-wrap items-center gap-2">
                          <Link
                            href={
                              recentSymptomStatus === "ACTIVE"
                                ? "/symptom-logs/" + encodeURIComponent(String(recentSymptom.id)) + "/monitor"
                                : "/symptom-logs/" + encodeURIComponent(String(recentSymptom.id))
                            }
                            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#0B2D54] px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_24px_rgba(11,45,84,0.18)] transition-all hover:-translate-y-0.5"
                          >
                            Update
                            <ArrowRight className="h-3.5 w-3.5 text-[#24C1C4]" aria-hidden="true" />
                          </Link>
                          <Link
                            href="/log-symptom"
                            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.09em] text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm transition-all hover:bg-white/22"
                          >
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[#0B2D54] shadow-sm">
                              <Plus className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                            </span>
                            New symptom
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5">
                        <h2 className="text-[27px] font-black tracking-[-0.05em]">Log a symptom</h2>
                        <p className="mt-1 text-[11px] font-semibold text-white/76">Nothing has been logged yet.</p>
                        <Link
                          href="/log-symptom"
                          className="mt-3.5 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#0B2D54] px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white"
                        >
                          Log symptom
                          <ArrowRight className="h-3.5 w-3.5 text-[#24C1C4]" aria-hidden="true" />
                        </Link>
                      </div>
                    )}
                  </div>
                </section>
              </div>
              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between px-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0B2D54]/55">Your health</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <ActionLink
                    href="/today"
                    className="group relative min-h-[164px] overflow-hidden rounded-[26px] bg-gradient-to-br from-[#10B7B9] via-[#24C1C4] to-[#79E6E1] p-5 text-white shadow-[0_18px_40px_rgba(36,193,196,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(36,193,196,0.30)]"
                  >
                    <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/25 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/45" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/18 text-white ring-1 ring-inset ring-white/25 shadow-[0_8px_22px_rgba(0,70,80,0.12)] transition-all group-hover:scale-105 group-hover:bg-white/25">
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-white/65 transition-all group-hover:translate-x-1 group-hover:text-white" aria-hidden="true" />
                    </div>
                    <div className="relative mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/65">Daily care</p>
                      <div className="mt-1 flex items-end justify-between gap-3">
                        <h2 className="text-[24px] font-black tracking-[-0.05em] text-white">Today</h2>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {todayChips.map((chip) => (
                            <RecordedChip key={chip} className="bg-white/16 text-white ring-white/20">{chip}</RecordedChip>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-passport"
                    className="group relative min-h-[164px] overflow-hidden rounded-[26px] bg-gradient-to-br from-[#0B2D54] via-[#155AC1] to-[#4E8CFF] p-5 text-white shadow-[0_18px_40px_rgba(21,90,193,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(21,90,193,0.30)]"
                  >
                    <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/22 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/35" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/14 text-white ring-1 ring-inset ring-white/22 shadow-[0_8px_22px_rgba(0,20,60,0.16)] transition-all group-hover:scale-105 group-hover:bg-white/22">
                        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-white/65 transition-all group-hover:translate-x-1 group-hover:text-white" aria-hidden="true" />
                    </div>
                    <div className="relative mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/65">Clinic Card</p>
                      <div className="mt-1 flex items-end justify-between gap-3">
                        <h2 className="text-[24px] font-black tracking-[-0.05em] text-white">Essentials</h2>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {clinicChips.map((chip) => (
                            <RecordedChip key={chip} className="bg-white/14 text-white ring-white/18">{chip}</RecordedChip>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-journal"
                    className="group relative min-h-[164px] overflow-hidden rounded-[26px] bg-gradient-to-br from-[#4B2E83] via-[#6B4CC5] to-[#9B82E8] p-5 text-white shadow-[0_18px_40px_rgba(75,46,131,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(75,46,131,0.30)]"
                  >
                    <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/22 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/35" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/14 text-white ring-1 ring-inset ring-white/22 shadow-[0_8px_22px_rgba(40,20,80,0.16)] transition-all group-hover:scale-105 group-hover:bg-white/22">
                        <FolderOpen className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-white/65 transition-all group-hover:translate-x-1 group-hover:text-white" aria-hidden="true" />
                    </div>
                    <div className="relative mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/65">Health Journal</p>
                      <div className="mt-1 flex items-end justify-between gap-3">
                        <h2 className="text-[24px] font-black tracking-[-0.05em] text-white">Records</h2>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <RecordedChip className="bg-white/14 text-white ring-white/18">{journalRecordLabel}</RecordedChip>
                          <RecordedChip className="bg-white/14 text-white ring-white/18">{symptomRecordLabel}</RecordedChip>
                        </div>
                      </div>
                    </div>
                  </ActionLink>
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
  }