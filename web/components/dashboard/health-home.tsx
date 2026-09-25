"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, CheckCircle2, FolderOpen, HeartPulse, House, Plus, ShieldCheck, UserRound } from "lucide-react";
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
      className={"inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-black tracking-[-0.01em] ring-1 ring-inset " + className}
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
  const [journalEntries, setJournalEntries] = useState<any[]>([]);

  useEffect(() => {
    if (!data?.patient?.id) return;

    let active = true;

    Promise.all([
      healthJournalService.getSymptoms({ limit: 100 }),
      healthJournalService.getAll({ page: 1, limit: 100 }),
    ])
      .then(([symptoms, journals]) => {
        if (!active) return;
        setSymptomFeed(Array.isArray(symptoms) ? symptoms : []);
        setJournalEntries(Array.isArray(journals?.data) ? journals.data : []);
      })
      .catch(() => {
        if (!active) return;
        setSymptomFeed([]);
        setJournalEntries([]);
      });

    return () => {
      active = false;
    };
  }, [data?.patient?.id, data?.generatedAt]);
  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f7fbfb] p-4 sm:p-8">
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
  const todayActionCount =
    medications.length + appointments.length + activeGoalCount;

  const recentSymptom = recentSymptomFrom(data, symptomFeed);
  const recentSymptomStatus = String(recentSymptom?.status ?? "").toUpperCase();
  const recentSymptomAt =
    recentSymptom?.startedAt ?? recentSymptom?.createdAt ?? null;

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

  const recordedMeasurements = [
    ...(Array.isArray(data.clinicalVitals) ? data.clinicalVitals : []),
    ...(Array.isArray(data.healthSnapshot?.latestMeasurements)
      ? data.healthSnapshot.latestMeasurements
      : []),
  ];
  const uniqueMeasurementCount = new Set(
    recordedMeasurements
      .filter((item: any) => item?.measuredAt)
      .map(
        (item: any) =>
          String(item?.type ?? item?.vitalType?.code ?? item?.name ?? "measurement") + "|" +
          String(item?.value ?? "") + "|" +
          String(item?.measuredAt),
      ),
  ).size;

  const todayChips = [
    medications.length ? medications.length + " med" + (medications.length === 1 ? "" : "s") : null,
    appointments.length ? appointments.length + " appt" : null,
    activeGoalCount ? activeGoalCount + " goal" + (activeGoalCount === 1 ? "" : "s") : null,
  ].filter(Boolean) as string[];

  const clinicChips = [
    activeConditions.length ? activeConditions.length + " condition" + (activeConditions.length === 1 ? "" : "s") : null,
    activeAllergies.length ? activeAllergies.length + " allerg" + (activeAllergies.length === 1 ? "y" : "ies") : null,
    data.healthSnapshot?.bloodType
      ? String(data.healthSnapshot.bloodType).replace(/_POSITIVE$/i, "+").replace(/_NEGATIVE$/i, "−").replace(/_/g, " ")
      : null,
  ].filter(Boolean) as string[];

  const journalChips = [
    symptomFeed.length ? symptomFeed.length + " symptom" + (symptomFeed.length === 1 ? "" : "s") : null,
    uniqueMeasurementCount ? uniqueMeasurementCount + " measure" + (uniqueMeasurementCount === 1 ? "" : "ments") : null,
    journalEntries.length ? journalEntries.length + " entr" + (journalEntries.length === 1 ? "y" : "ies") : null,
  ].filter(Boolean) as string[];

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#F7FBFB] text-[#0B2D54]">
        <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-3 pb-8 pt-20 sm:px-5 sm:pt-24 lg:grid-cols-[82px_minmax(0,1fr)] lg:gap-5">
          <aside className="hidden lg:sticky lg:top-24 lg:flex lg:h-[calc(100vh-8rem)] lg:flex-col lg:items-center lg:justify-between lg:rounded-3xl lg:bg-gradient-to-b lg:from-[#0B2D54] lg:to-[#24C1C4] lg:px-2.5 lg:py-4 lg:shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
            <div className="flex w-full flex-col items-center gap-2">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <HeartPulse className="h-5 w-5 text-[#9AF6F4]" aria-hidden="true" />
              </div>

              {[
                { href: "/dashboard", icon: House, label: "Home" },
                { href: "/today", icon: CheckCircle2, label: "Today" },
                { href: "/log-symptom", icon: HeartPulse, label: "Symptoms" },
                { href: "/health-journal", icon: FolderOpen, label: "Journal" },
                { href: "/health-passport", icon: ShieldCheck, label: "Clinic" },
              ].map(({ href, icon: Icon, label }, index) => (
                <ActionLink
                  key={href}
                  href={href}
                  ariaLabel={label}
                  className={
                    `grid h-11 w-11 place-items-center rounded-2xl ${index === 0 ? "bg-white text-[#0B2D54] shadow-sm" : "text-white/[0.72] hover:bg-white/10 hover:text-white"}`
                  }
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </ActionLink>
              ))}
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
                <Bell className="h-4 w-4 text-white/80" aria-hidden="true" />
              </span>
              <span className="h-px w-7 bg-white/15" />
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
                <UserRound className="h-4 w-4 text-white/80" aria-hidden="true" />
              </span>
            </div>
          </aside>

          <section className="min-w-0 space-y-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
              <section className="group relative overflow-hidden rounded-[32px] bg-[#0B2D54] p-5 text-white shadow-[0_18px_52px_rgba(11,45,84,0.14)] sm:p-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#24C1C4]/20 blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-white/[0.07] blur-3xl"
                />

                <div className="relative flex min-h-[196px] flex-col justify-between gap-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="max-w-[34rem]">
                      <h2 className="text-[34px] font-black tracking-[-0.055em] sm:text-[44px]">
                        Good day, {firstName}
                      </h2>
                      <p className="mt-2 max-w-[30rem] text-[13px] font-medium leading-6 text-white/[0.72]">
                        Your health, organised around what matters today.
                      </p>
                    </div>

                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-6">
                    <div className="flex items-end gap-3">
                      <p className="text-[62px] font-black leading-[0.82] tracking-[-0.08em] sm:text-[72px]">
                        {todayActionCount}
                      </p>
                      <p className="pb-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/[0.52]">
                        active items
                      </p>
                    </div>

                    <ActionLink
                      href="/today"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#24C1C4] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#0B2D54] shadow-[0_10px_26px_rgba(36,193,196,0.18)] transition-transform hover:-translate-y-0.5"
                    >
                      Open today
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </ActionLink>
                  </div>
                </div>
              </section>

              <section className="group relative flex min-h-[196px] flex-col justify-between overflow-hidden rounded-[32px] bg-gradient-to-br from-[#25C9CC] via-[#20BBC0] to-[#0A9DA7] p-5 text-white shadow-[0_0_58px_rgba(36,193,196,0.42),0_24px_70px_rgba(11,45,84,0.16),inset_0_1px_0_rgba(255,255,255,0.42)] ring-1 ring-inset ring-white/25 sm:p-5">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/45 blur-3xl transition-transform duration-500 group-hover:scale-110"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-16 bottom-[-92px] h-52 w-52 rounded-full bg-[#C9FFFF]/45 blur-3xl transition-transform duration-500 group-hover:translate-x-3"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/3 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-[#7AF4F2]/25 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/75"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-24 top-8 h-32 w-60 rotate-[-18deg] rounded-full bg-white/20 blur-2xl"
                />

                <div className="relative flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/22 ring-1 ring-white/45 shadow-[0_0_24px_rgba(255,255,255,0.18)]">
                    <HeartPulse className="h-5 w-5 text-white" aria-hidden="true" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/80">
                    Monitor
                  </span>
                </div>

                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/72">
                    Recent symptom
                  </p>

                  {recentSymptom ? (
                    <>
                      <div className="mt-1 flex items-end justify-between gap-3">
                        <h2 className="min-w-0 truncate text-[22px] font-black tracking-[-0.045em] text-white">
                          {symptomLabel(recentSymptom)}
                        </h2>
                        {recentSymptom.overallSeverity && (
                          <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-white ring-1 ring-inset ring-white/30">
                            {String(recentSymptom.overallSeverity).toLowerCase()}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-white/78">
                        {formatSymptomDate(recentSymptomAt)}
                        {recentSymptomStatus === "ACTIVE" ? " · Active" : ""}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <Link
                          href={
                            recentSymptomStatus === "ACTIVE"
                              ? "/symptom-logs/" + encodeURIComponent(String(recentSymptom.id)) + "/monitor"
                              : "/symptom-logs/" + encodeURIComponent(String(recentSymptom.id))
                          }
                          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#0B2D54] px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white transition-transform hover:-translate-y-0.5"
                        >
                          Update
                          <ArrowRight className="h-3.5 w-3.5 text-[#24C1C4]" aria-hidden="true" />
                        </Link>
                        <Link
                          href="/log-symptom"
                          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.09em] text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm transition-all hover:bg-white/22 hover:ring-white/40"
                        >
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[#0B2D54] shadow-sm">
                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                          </span>
                          New symptom
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-1 text-[22px] font-black tracking-[-0.045em] text-white">
                        Log a symptom
                      </h2>
                      <p className="mt-1 text-[11px] font-semibold text-white/78">
                        Nothing has been logged yet.
                      </p>
                      <Link
                        href="/log-symptom"
                        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#0B2D54] px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white"
                      >
                        Log symptom
                        <ArrowRight className="h-3.5 w-3.5 text-[#24C1C4]" aria-hidden="true" />
                      </Link>
                    </>
                  )}
                </div>
              </section>
            </div>

            <section className="relative">
              <div className="mb-4 flex items-center justify-between px-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#0B2D54]">
                    Your health
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <ActionLink
                    href="/today"
                    className="group relative flex min-h-[164px] flex-col justify-between overflow-hidden rounded-[26px] border border-[#8EE4E2] bg-gradient-to-br from-[#F8FFFF] via-white to-[#DDF8F7] p-5 shadow-[0_14px_38px_rgba(36,193,196,0.12),0_0_28px_rgba(36,193,196,0.10)] ring-1 ring-inset ring-white/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(36,193,196,0.20),0_0_38px_rgba(36,193,196,0.16)]"
                  >
                    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#24C1C4]/28 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 ring-1 ring-[#24C1C4]/30 shadow-[0_0_20px_rgba(36,193,196,0.18)]">
                        <CheckCircle2 className="h-5 w-5 text-[#0B2D54]" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#0B2D54] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                    <div className="relative">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#24C1C4]">
                        Daily care
                      </p>
                      <div className="mt-1 flex min-w-0 items-center justify-between gap-3">
                        <h2 className="min-w-0 text-[24px] font-black tracking-[-0.05em] text-[#0B2D54]">
                          Today
                        </h2>
                        {todayChips.length > 0 && (
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                            {todayChips.map((chip) => (
                              <RecordedChip
                                key={chip}
                                className="bg-white/70 px-2 py-1 text-[#0B2D54] ring-[#24C1C4]/20"
                              >
                                {chip}
                              </RecordedChip>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-passport"
                    className="group relative flex min-h-[164px] flex-col justify-between overflow-hidden rounded-[26px] border border-[#F1B8C1] bg-gradient-to-br from-[#FFF8F8] via-white to-[#FFEDEF] p-5 shadow-[0_14px_38px_rgba(198,40,40,0.11),0_0_28px_rgba(198,40,40,0.08)] ring-1 ring-inset ring-white/75 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(198,40,40,0.17),0_0_38px_rgba(198,40,40,0.13)]"
                  >
                    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#E53935]/22 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/85 ring-1 ring-[#E53935]/25 shadow-[0_0_20px_rgba(229,57,53,0.14)]">
                        <ShieldCheck className="h-5 w-5 text-[#C62828]" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#C62828] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                    <div className="relative">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#C62828]">
                        Clinic Card
                      </p>
                      <div className="mt-1 flex min-w-0 items-center justify-between gap-3">
                        <h2 className="min-w-0 text-[24px] font-black tracking-[-0.05em] text-[#0B2D54]">
                          Essentials
                        </h2>
                        {clinicChips.length > 0 && (
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                            {clinicChips.map((chip) => (
                              <RecordedChip
                                key={chip}
                                className="bg-white/80 px-2 py-1 text-[#8F2435] ring-[#E53935]/15"
                              >
                                {chip}
                              </RecordedChip>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-journal"
                    className="group relative flex min-h-[164px] flex-col justify-between overflow-hidden rounded-[26px] border border-white/25 bg-[#155AC1] p-5 text-white shadow-[0_16px_42px_rgba(21,90,193,0.38),0_0_38px_rgba(21,90,193,0.30)] ring-1 ring-inset ring-white/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(21,90,193,0.48),0_0_48px_rgba(21,90,193,0.38)]"
                  >
                    <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#8DB7FF]/55 blur-3xl transition-transform duration-500 group-hover:scale-125" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/18 ring-1 ring-white/40 shadow-[0_0_24px_rgba(255,255,255,0.22)] backdrop-blur-sm">
                        <FolderOpen className="h-5 w-5 text-white" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                    <div className="relative">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/78">
                        Health Journal
                      </p>
                      <div className="mt-1 flex min-w-0 items-center justify-between gap-3">
                        <h2 className="min-w-0 text-[24px] font-black tracking-[-0.05em] text-white">
                          Records
                        </h2>
                        {journalChips.length > 0 && (
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                            {journalChips.map((chip) => (
                              <RecordedChip
                                key={chip}
                                className="bg-white/18 px-2 py-1 text-white ring-white/30 backdrop-blur-sm"
                              >
                                {chip}
                              </RecordedChip>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </ActionLink>
                </div>
            </section>
          </section>
        </div>
      </main>
      </ProtectedRoute>
    );
  }
