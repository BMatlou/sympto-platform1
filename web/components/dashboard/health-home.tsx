"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, ArrowRight, Bell, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, FileText, FolderOpen, HeartPulse, House, MapPin, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
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

function formatDashboardDate(value: unknown, fallback = "Recent"): string {
  if (!value) return fallback;

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return fallback;

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

function completenessPercent(present: number, total: number): number {
  if (!total) return 0;
  return Math.round((present / total) * 100);
}

function ProgressStrip({
  value,
  accent,
  label,
}: {
  value: number;
  accent: string;
  label: string;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8B9AA8]">
          {label}
        </span>
        <span className="text-[10px] font-black text-[#0B2D54]">{value}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EEF3F5]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${accent}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function FeedRow({
  icon: Icon,
  title,
  meta,
  time,
  accent,
  href,
}: {
  icon: typeof CalendarDays;
  title: string;
  meta: string;
  time: string;
  accent: string;
  href: string;
}) {
  return (
    <ActionLink
      href={href}
      className="group flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-[#F7FAFB]"
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${accent}`}>
        <Icon className="h-4 w-4 text-white" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-black text-[#17344F]">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[10px] font-medium text-[#8A99A8]">
          {meta}
        </span>
      </span>
      <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.08em] text-[#A0AFBA]">
        {time}
      </span>
    </ActionLink>
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
  const todayActionCount = medications.length + appointments.length + activeGoalCount;

  const historyCount =
    (data.encounters?.length ?? 0) +
    (data.recentResults?.laboratory?.length ?? 0) +
    (data.recentResults?.imaging?.length ?? 0) +
    (data.attachments?.length ?? 0);

  const healthVitals = normalizeVitals(data);
  const allergies =
    data.healthSnapshot?.activeAllergies ??
    data.healthSnapshot?.allergies ??
    data.allergies ??
    [];
  const conditions =
    data.healthSnapshot?.activeConditions ??
    data.conditions ??
    [];

  const allergyNames = itemNames(allergies, "allergy");
  const conditionNames = itemNames(conditions, "condition");

  const bloodType =
    data.healthPassport?.bloodType ??
    data.healthSnapshot?.bloodType ??
    data.medicalRecord?.bloodType;

  const rhesusFactor =
    data.healthPassport?.rhesusFactor ??
    data.healthSnapshot?.rhesusFactor;

  const allergiesValue = allergyNames.length
    ? allergyNames.slice(0, 3).join(" · ") +
      (allergyNames.length > 3 ? ` +${allergyNames.length - 3}` : "")
    : "None recorded";

  const conditionsValue = conditionNames.length
    ? conditionNames.slice(0, 3).join(" · ") +
      (conditionNames.length > 3 ? ` +${conditionNames.length - 3}` : "")
    : "None recorded";

  const encounters = Array.isArray(data.encounters) ? data.encounters : [];
  const laboratoryResults = Array.isArray(data.recentResults?.laboratory)
    ? data.recentResults.laboratory
    : [];
  const imagingResults = Array.isArray(data.recentResults?.imaging)
    ? data.recentResults.imaging
    : [];
  const attachments = Array.isArray(data.attachments) ? data.attachments : [];

  const todayCoverage = completenessPercent(
    Number(medications.length > 0) +
      Number(appointments.length > 0) +
      Number(activeGoalCount > 0),
    3,
  );

  const essentialsCoverage = completenessPercent(
    Number(allergyNames.length > 0) +
      Number(conditionNames.length > 0) +
      Number(Boolean(bloodType)) +
      Number(Boolean(rhesusFactor)),
    4,
  );

  const recordsCoverage = completenessPercent(
    Number(encounters.length > 0) +
      Number(laboratoryResults.length > 0) +
      Number(imagingResults.length > 0) +
      Number(attachments.length > 0),
    4,
  );

  const latestVital = [...healthVitals].sort((a, b) => new Date(String(b.measuredAt ?? 0)).getTime() - new Date(String(a.measuredAt ?? 0)).getTime())[0];

  const feedItems = [
    ...appointments.slice(0, 2).map((item: any) => ({
      icon: CalendarDays,
      title: display(item?.title ?? item?.name ?? item?.type, "Upcoming visit"),
      meta: display(
        item?.provider?.name ?? item?.providerName ?? item?.location,
        "Care appointment",
      ),
      time: formatDashboardDate(
        item?.scheduledAt ?? item?.appointmentDate ?? item?.date,
        "Upcoming",
      ),
      accent: "bg-[#177E89]",
      href: "/today",
      sort: new Date(
        String(item?.scheduledAt ?? item?.appointmentDate ?? item?.date ?? 0),
      ).getTime(),
    })),
    ...encounters.slice(0, 2).map((item: any) => ({
      icon: ClipboardList,
      title: display(item?.title ?? item?.type ?? item?.reason, "Care encounter"),
      meta: "Health journal",
      time: formatDashboardDate(item?.occurredAt ?? item?.encounterDate ?? item?.date),
      accent: "bg-[#2F6FDB]",
      href: "/health-journal",
      sort: new Date(
        String(item?.occurredAt ?? item?.encounterDate ?? item?.date ?? 0),
      ).getTime(),
    })),
    ...laboratoryResults.slice(0, 1).map((item: any) => ({
      icon: Activity,
      title: display(item?.name ?? item?.testName ?? item?.title, "Laboratory result"),
      meta: "Lab result",
      time: formatDashboardDate(item?.resultDate ?? item?.createdAt ?? item?.date),
      accent: "bg-[#0F5A62]",
      href: "/health-journal",
      sort: new Date(
        String(item?.resultDate ?? item?.createdAt ?? item?.date ?? 0),
      ).getTime(),
    })),
    ...attachments.slice(0, 1).map((item: any) => ({
      icon: FileText,
      title: display(item?.name ?? item?.fileName ?? item?.title, "Health document"),
      meta: "Document",
      time: formatDashboardDate(item?.createdAt ?? item?.uploadedAt ?? item?.date),
      accent: "bg-[#24C1C4]",
      href: "/health-journal",
      sort: new Date(
        String(item?.createdAt ?? item?.uploadedAt ?? item?.date ?? 0),
      ).getTime(),
    })),
  ]
    .sort((a, b) => (Number.isFinite(b.sort) ? b.sort : 0) - (Number.isFinite(a.sort) ? a.sort : 0))
    .slice(0, 5);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#F8FAFC] text-[#16324A]">
        <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-3 pb-8 pt-20 sm:px-5 sm:pt-24 lg:grid-cols-[82px_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[82px_minmax(0,1fr)_300px]">
          <aside className="hidden lg:sticky lg:top-24 lg:flex lg:h-[calc(100vh-8rem)] lg:flex-col lg:items-center lg:justify-between lg:rounded-3xl lg:bg-gradient-to-b lg:from-[#0F5A62] lg:to-[#177E89] lg:px-2.5 lg:py-4 lg:shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
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
                    `grid h-11 w-11 place-items-center rounded-2xl ${index === 0 ? "bg-white text-[#0F5A62] shadow-sm" : "text-white/[0.72] hover:bg-white/10 hover:text-white"}`
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
            <div className="flex items-end justify-between gap-4 px-1">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#177E89]">
                  Sympto workspace
                </p>
                <h1 className="mt-1 text-[30px] font-black tracking-[-0.05em] text-[#0B2D54] sm:text-[36px]">
                  Good day, {firstName}
                </h1>
                <p className="mt-1 text-[13px] font-medium text-[#7C8D9B]">
                  Your health, organised around what matters today.
                </p>
              </div>

              <ActionLink
                href="/today"
                className="hidden shrink-0 items-center gap-2 rounded-full bg-[#0F5A62] px-4 py-2.5 text-[11px] font-black text-white shadow-[0_8px_22px_rgba(15,90,98,0.12)] hover:bg-[#177E89] sm:inline-flex"
              >
                Open today
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </ActionLink>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.7fr)]">
              <section className="relative overflow-hidden rounded-3xl bg-[#177E89] p-5 text-white shadow-[0_10px_40px_rgba(0,0,0,0.02)] sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:32px_32px]" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#B4F9F6]">
                        Daily care pulse
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white/[0.78]">
                        What needs your attention today
                      </p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/75 ring-1 ring-white/10">
                      Today
                    </span>
                  </div>

                  <div className="mt-7 grid gap-6 md:grid-cols-[minmax(0,1fr)_170px] md:items-end">
                    <div>
                      <div className="flex items-end gap-3">
                        <span className="text-[64px] font-black leading-none tracking-[-0.08em]">
                          {todayActionCount}
                        </span>
                        <span className="pb-2 text-sm font-bold text-white/70">
                          active items
                        </span>
                      </div>
                      <p className="mt-5 max-w-[520px] text-[12px] leading-5 text-white/[0.74]">
                        Medication, visits and goals stay together here so you can see the day before you act.
                      </p>
                    </div>

                    <div className="rounded-3xl bg-[#0F5A62]/55 p-4 ring-1 ring-white/10">
                      <div className="flex h-32 items-end justify-center gap-3">
                        {[medications.length, appointments.length, activeGoalCount].map((value, index) => {
                          const height = Math.max(18, Math.min(100, value * 24 + 18));
                          return (
                            <div key={index} className="flex h-full w-8 items-end">
                              <div
                                className="w-full rounded-t-xl bg-[#24C1C4] shadow-[0_8px_18px_rgba(36,193,196,0.18)]"
                                style={{ height: `${height}%` }}
                                aria-hidden="true"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 grid grid-cols-3 text-center text-[8px] font-black uppercase tracking-[0.1em] text-white/55">
                        <span>Rx</span>
                        <span>Visits</span>
                        <span>Goals</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-2">
                    {[
                      ["Medication", medications.length],
                      ["Visit", appointments.length],
                      ["Goal", activeGoalCount],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-2xl bg-white/10 px-3.5 py-3 ring-1 ring-white/10">
                        <p className="text-[9px] font-black uppercase tracking-[0.11em] text-white/55">
                          {label}
                        </p>
                        <p className="mt-1 text-[22px] font-black leading-none text-white">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <div className="grid gap-4">
                <ActionLink
                  href="/log-symptom"
                  className="group flex min-h-[160px] flex-col justify-between overflow-hidden rounded-3xl bg-[#24C1C4] p-5 text-[#083D43] shadow-[0_10px_40px_rgba(0,0,0,0.02)] transition-transform hover:-translate-y-0.5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/25">
                      <HeartPulse className="h-5 w-5 text-white" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-white/[0.18] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-white/90 ring-1 ring-white/10">
                      Quick action
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0F5A62]">
                      Log a symptom
                    </p>
                    <p className="mt-1 text-[21px] font-black tracking-[-0.04em] text-white">
                      Tell Sympto how you feel.
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/[0.88]">
                      Open monitor <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </ActionLink>

                <div className="relative overflow-hidden rounded-3xl border border-[#E5EDF0] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] sm:p-6">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#24C1C4]/15 blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#177E89]">
                        At a glance
                      </span>
                      <Sparkles className="h-4 w-4 text-[#24C1C4]" aria-hidden="true" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl bg-[#F4FAFA] px-3 py-3">
                        <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#8A99A8]">Vitals</p>
                        <p className="mt-1 text-lg font-black text-[#0F5A62]">{healthVitals.length}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F4FAFA] px-3 py-3">
                        <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#8A99A8]">Conditions</p>
                        <p className="mt-1 text-lg font-black text-[#0F5A62]">{conditionNames.length}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F4FAFA] px-3 py-3">
                        <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#8A99A8]">Allergies</p>
                        <p className="mt-1 text-lg font-black text-[#0F5A62]">{allergyNames.length}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] leading-5 text-[#71839A]">
                      {latestVital
                        ? `Latest ${display(latestVital.type, "vital")}: ${display(latestVital.value)} ${display(latestVital.unit, "")}`
                        : "Your latest vital measurements will appear here."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <ActionLink
                href="/today"
                className="group flex min-h-[280px] flex-col overflow-hidden rounded-3xl border border-[#B7E5E2] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,90,98,0.08)] sm:p-6"
              >
                <div className="text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#DDF7F5] ring-1 ring-[#24C1C4]/20">
                    <CheckCircle2 className="h-6 w-6 text-[#0F5A62]" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-[9px] font-black uppercase tracking-[0.16em] text-[#177E89]">Daily care</p>
                  <h2 className="mt-1 text-[22px] font-black tracking-[-0.045em] text-[#0B2D54]">Today</h2>
                  <p className="mt-2 text-[11px] leading-5 text-[#71839A]">
                    {todayActionCount} {todayActionCount === 1 ? "thing needs" : "things need"} your attention.
                  </p>
                </div>

                <div className="mt-auto">
                  <ProgressStrip value={todayCoverage} accent="bg-[#24C1C4]" label="Today coverage" />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#0F5A62]">Open today</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FBFA] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#177E89]">
                      <CalendarDays className="h-3 w-3" aria-hidden="true" /> Today
                    </span>
                  </div>
                </div>
              </ActionLink>

              <ActionLink
                href="/health-passport"
                className="group flex min-h-[280px] flex-col overflow-hidden rounded-3xl border border-[#EFC8C8] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(180,35,24,0.08)] sm:p-6"
              >
                <div className="text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FFE8E8] ring-1 ring-[#E53935]/20">
                    <ShieldCheck className="h-6 w-6 text-[#C62828]" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-[9px] font-black uppercase tracking-[0.16em] text-[#C62828]">My Clinic Card</p>
                  <h2 className="mt-1 text-[22px] font-black tracking-[-0.045em] text-[#0B2D54]">Essentials</h2>
                  <p className="mt-2 text-[11px] leading-5 text-[#71839A]">Your essential health information for quick care.</p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-[#FFF7F7] px-3 py-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#9A7D7D]">Allergies</p>
                    <p className="mt-1 truncate text-[11px] font-black text-[#B42318]">{allergiesValue}</p>
                  </div>
                  <div className="rounded-2xl bg-[#FFF7F7] px-3 py-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#9A7D7D]">Conditions</p>
                    <p className="mt-1 truncate text-[11px] font-black text-[#B42318]">{conditionsValue}</p>
                  </div>
                </div>

                <div className="mt-auto">
                  <ProgressStrip value={essentialsCoverage} accent="bg-[#E53935]" label="Card completeness" />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#C62828]">Open clinic card</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF0F0] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#C62828]">
                      <CalendarDays className="h-3 w-3" aria-hidden="true" /> Care
                    </span>
                  </div>
                </div>
              </ActionLink>

              <ActionLink
                href="/health-journal"
                className="group flex min-h-[280px] flex-col overflow-hidden rounded-3xl border border-[#BFD9DA] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,90,98,0.08)] sm:p-6"
              >
                <div className="text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#E4F3F3] ring-1 ring-[#0F5A62]/20">
                    <FolderOpen className="h-6 w-6 text-[#0F5A62]" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-[9px] font-black uppercase tracking-[0.16em] text-[#0F5A62]">My history & papers</p>
                  <h2 className="mt-1 text-[22px] font-black tracking-[-0.045em] text-[#0B2D54]">Records</h2>
                  <p className="mt-2 text-[11px] leading-5 text-[#71839A]">Encounters, results and health documents in one place.</p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-[#F4FAFA] px-3 py-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#6C8F94]">Records</p>
                    <p className="mt-1 text-lg font-black text-[#0F5A62]">{historyCount}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F4FAFA] px-3 py-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#6C8F94]">Vitals</p>
                    <p className="mt-1 text-lg font-black text-[#0F5A62]">{healthVitals.length}</p>
                  </div>
                </div>

                <div className="mt-auto">
                  <ProgressStrip value={recordsCoverage} accent="bg-[#0F5A62]" label="Record coverage" />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#0F5A62]">Open records</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E9F5F5] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#0F5A62]">
                      <CalendarDays className="h-3 w-3" aria-hidden="true" /> History
                    </span>
                  </div>
                </div>
              </ActionLink>
            </div>
          </section>

          <aside className="min-w-0 rounded-3xl border border-[#E3EBEF] bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,0.02)] xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#EEF2F4] px-1 pb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#177E89]">Health feed</p>
                <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-[#0B2D54]">Recent activity</h2>
              </div>
              <Activity className="h-4 w-4 text-[#24C1C4]" aria-hidden="true" />
            </div>

            <div className="mt-2">
              {feedItems.length ? (
                feedItems.map((item, index) => (
                  <FeedRow
                    key={`${item.title}-${item.time}-${index}`}
                    icon={item.icon}
                    title={item.title}
                    meta={item.meta}
                    time={item.time}
                    accent={item.accent}
                    href={item.href}
                  />
                ))
              ) : (
                <div className="rounded-2xl bg-[#F7FAFB] px-4 py-5 text-center">
                  <p className="text-[11px] font-black text-[#64798D]">Your health activity will appear here.</p>
                  <p className="mt-1 text-[10px] leading-5 text-[#95A4AF]">
                    Add a visit, record or health update to start your feed.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-[#EEF2F4] pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#177E89]">Care map</p>
                  <p className="mt-1 text-[10px] text-[#8A99A8]">Your workspace pathways</p>
                </div>
                <MapPin className="h-4 w-4 text-[#24C1C4]" aria-hidden="true" />
              </div>

              <div className="relative mt-3 h-[190px] overflow-hidden rounded-2xl border border-[#E7EEF1] bg-[#F7FAFB]">
                <div className="absolute inset-0 opacity-60 bg-[linear-gradient(90deg,#E7EEF1_1px,transparent_1px),linear-gradient(#E7EEF1_1px,transparent_1px)] bg-[size:22px_22px]" />
                <div className="absolute left-[16%] top-[28%] h-2 w-2 rounded-full bg-[#24C1C4] ring-4 ring-[#24C1C4]/15" />
                <div className="absolute left-[54%] top-[50%] h-2.5 w-2.5 rounded-full bg-[#0F5A62] ring-4 ring-[#0F5A62]/15" />
                <div className="absolute right-[16%] bottom-[24%] h-2 w-2 rounded-full bg-[#0F5A62] ring-4 ring-[#4A80E8]/15" />
                <div className="absolute left-[17%] top-[30%] h-px w-[39%] rotate-[23deg] bg-[#24C1C4]/60" />
                <div className="absolute left-[56%] top-[55%] h-px w-[31%] -rotate-[24deg] bg-[#0F5A62]/55" />

                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-[#177E89] shadow-sm">
                  Today
                </div>
                <div className="absolute left-1/2 top-[43%] -translate-x-1/2 rounded-full bg-white/90 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-[#0F5A62] shadow-sm">
                  Clinic
                </div>
                <div className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-[#0F5A62] shadow-sm">
                  Records
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </ProtectedRoute>
  );
}
