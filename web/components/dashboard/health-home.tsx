"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, FileHeart, FolderOpen, ShieldCheck } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthJournalService } from "@/services/health-journal.service";
import ProtectedRoute from "@/components/auth/protected-route";

function display(value: unknown, fallback = "Not recorded"): string {
  return value === null || value === undefined || value === "" ? fallback : String(value);
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

  const recentSymptom = recentSymptomFrom(data, symptomFeed);
  const recentSymptomStatus = String(recentSymptom?.status ?? "").toUpperCase();
  const recentSymptomAt = recentSymptom?.startedAt ?? recentSymptom?.createdAt ?? null;

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
      <main className="min-h-screen bg-[#EAF0F7] px-2 pb-2 pt-[72px] text-[#0B2D54] sm:px-4 sm:pb-4 sm:pt-[72px] lg:pl-[104px] lg:pt-4">
        <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1480px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_28px_80px_rgba(11,45,84,0.12)]">
          <section className="min-w-0 bg-white">
            <div className="px-4 pb-5 pt-3 sm:px-5 lg:px-7">
              <div className="flex justify-end">
                <ActionLink
                  href="/smart-file"
                  className="inline-flex min-h-9 items-center gap-2 rounded-2xl bg-[#0B2D54] px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-white shadow-[0_8px_20px_rgba(11,45,84,0.10)] transition-all hover:-translate-y-0.5 hover:bg-[#092544]"
                >
                  <FileHeart className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Share Smart File</span>
                  <span className="sm:hidden">Share</span>
                </ActionLink>
              </div>

              <section className="relative mt-3 overflow-hidden rounded-[28px] border border-[#24C1C4]/20 bg-gradient-to-br from-[#0B2D54] via-[#103E69] to-[#24C1C4] px-6 py-7 text-white shadow-[0_20px_50px_rgba(11,45,84,0.16)] sm:px-8">
                <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-20 h-56 w-56 rounded-full bg-[#24C1C4]/25 blur-3xl" />
                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/75">My health</p>
                <h2 className="mt-2 text-[32px] font-black tracking-[-0.05em] text-white sm:text-[40px]">
                  {greeting}, {firstName}
                </h2>
                <p className="mt-2 max-w-[42rem] text-sm font-medium leading-6 text-white/75">
                  Your health, organised around what matters today.
                </p>
                </div>
              </section>

              <section className="mt-5 overflow-hidden rounded-[24px] border border-[#24C1C4]/20 bg-[#E8F8F7]">
                <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#0B2D54]/55">Recent symptom</p>
                    {recentSymptom ? (
                      <>
                        <h3 className="mt-1 truncate text-lg font-black tracking-[-0.03em] text-[#0B2D54]">{symptomLabel(recentSymptom)}</h3>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {formatSymptomDate(recentSymptomAt)}
                          {recentSymptomStatus ? ` · ${recentSymptomStatus.replace(/_/g, " ").toLowerCase()}` : ""}
                        </p>
                      </>
                    ) : (
                      <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-[#0B2D54]">No symptoms logged yet</h3>
                    )}
                  </div>
                  <ActionLink
                    href="/log-symptom"
                    className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-[#0B2D54] px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-[0_8px_18px_rgba(11,45,84,0.12)] hover:bg-[#092544]"
                  >
                    Log a symptom
                  </ActionLink>
                </div>
              </section>

              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between px-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0B2D54]/55">Your health</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <ActionLink
                    href="/today"
                    className="group relative min-h-[164px] overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_34px_rgba(11,45,84,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#24C1C4]/25 hover:shadow-[0_22px_44px_rgba(11,45,84,0.11)]"
                  >
                    <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#24C1C4]/10 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E8F8F7] text-[#24C1C4] ring-1 ring-inset ring-[#24C1C4]/18 shadow-[0_0_20px_rgba(36,193,196,0.10)] transition-all group-hover:scale-105 group-hover:bg-[#D9FFFE] group-hover:shadow-[0_0_28px_rgba(36,193,196,0.32)]">
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-[#24C1C4]" aria-hidden="true" />
                    </div>
                    <div className="relative mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Daily care</p>
                      <div className="mt-1 flex items-end justify-between gap-3">
                        <h2 className="text-[24px] font-black tracking-[-0.05em] text-[#0B2D54]">Today</h2>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {todayChips.map((chip) => (
                            <RecordedChip key={chip} className="bg-[#E8F8F7] text-[#0B2D54] ring-[#24C1C4]/15">{chip}</RecordedChip>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-passport"
                    className="group relative min-h-[164px] overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_34px_rgba(11,45,84,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#C62828]/25 hover:shadow-[0_22px_44px_rgba(11,45,84,0.11)]"
                  >
                    <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#C62828]/10 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF0F0] text-[#C62828] ring-1 ring-inset ring-[#C62828]/18 shadow-[0_0_20px_rgba(198,40,40,0.10)] transition-all group-hover:scale-105 group-hover:bg-[#FFE4E4] group-hover:shadow-[0_0_28px_rgba(198,40,40,0.30)]">
                        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-[#C62828]" aria-hidden="true" />
                    </div>
                    <div className="relative mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Clinic Card</p>
                      <div className="mt-1 flex items-end justify-between gap-3">
                        <h2 className="text-[24px] font-black tracking-[-0.05em] text-[#0B2D54]">Essentials</h2>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {clinicChips.map((chip) => (
                            <RecordedChip key={chip} className="bg-[#FFF0F0] text-[#8D1A24] ring-[#C62828]/15">{chip}</RecordedChip>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-journal"
                    className="group relative min-h-[164px] overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_34px_rgba(11,45,84,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#155AC1]/25 hover:shadow-[0_22px_44px_rgba(11,45,84,0.11)]"
                  >
                    <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#155AC1]/10 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EEF5FF] text-[#155AC1] ring-1 ring-inset ring-[#155AC1]/18 shadow-[0_0_20px_rgba(21,90,193,0.10)] transition-all group-hover:scale-105 group-hover:bg-[#E5F0FF] group-hover:shadow-[0_0_28px_rgba(21,90,193,0.30)]">
                        <FolderOpen className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-[#155AC1]" aria-hidden="true" />
                    </div>
                    <div className="relative mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Health Journal</p>
                      <div className="mt-1 flex items-end justify-between gap-3">
                        <h2 className="text-[24px] font-black tracking-[-0.05em] text-[#0B2D54]">Records</h2>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <RecordedChip className="bg-[#EEF5FF] text-[#0E4B9F] ring-[#155AC1]/15">{journalRecordLabel}</RecordedChip>
                          <RecordedChip className="bg-[#EEF5FF] text-[#0E4B9F] ring-[#155AC1]/15">{symptomRecordLabel}</RecordedChip>
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