"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Bell, CalendarDays, CheckCircle2, ChevronRight, FolderOpen, HeartPulse, House, ShieldCheck, Sparkles, UserRound } from "lucide-react";
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



  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#F8FAFC] text-[#16324A]">
        <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-3 pb-8 pt-20 sm:px-5 sm:pt-24 lg:grid-cols-[82px_minmax(0,1fr)] lg:gap-5">
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

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
              <section className="group relative overflow-hidden rounded-[32px] bg-[#177E89] p-5 text-white shadow-[0_10px_40px_rgba(0,0,0,0.02)] sm:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#24C1C4]/20 blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-white/[0.08] blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:34px_34px]"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#24C1C4] shadow-[0_0_12px_rgba(36,193,196,0.75)]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/75">
                          Today
                        </span>
                      </div>
                      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.15em] text-[#A5F6F3]">
                        Daily care pulse
                      </p>
                      <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-white/[0.82]">
                        Start with what needs you now.
                      </h2>
                    </div>

                    <div className="hidden h-12 w-12 place-items-center rounded-2xl bg-white/[0.08] ring-1 ring-white/10 sm:grid">
                      <CheckCircle2 className="h-5 w-5 text-[#9AF6F4]" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
                    <div>
                      <div className="flex items-end gap-3">
                        <span className="text-[68px] font-black leading-[0.84] tracking-[-0.09em]">
                          {todayActionCount}
                        </span>
                        <div className="pb-1.5">
                          <p className="text-[11px] font-black uppercase tracking-[0.13em] text-white/55">
                            active items
                          </p>
                          <p className="mt-1 text-[12px] font-semibold text-white/[0.72]">
                            across your care today
                          </p>
                        </div>
                      </div>
                    </div>

                    <ActionLink
                      href="/today"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#0F5A62] shadow-[0_10px_24px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5"
                    >
                      Open today
                      <ArrowRight className="h-3.5 w-3.5 text-[#24C1C4]" aria-hidden="true" />
                    </ActionLink>
                  </div>

                  <div className="mt-7 grid grid-cols-3 gap-2">
                    {[
                      ["Medication", medications.length],
                      ["Visits", appointments.length],
                      ["Goals", activeGoalCount],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-2xl bg-white/[0.07] px-3.5 py-3 ring-1 ring-white/10 backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/50">
                            {label}
                          </span>
                          <span className="text-[18px] font-black text-white">
                            {value}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.09]">
                          <div
                            className="h-full rounded-full bg-[#24C1C4] shadow-[0_0_12px_rgba(36,193,196,0.45)]"
                            style={{
                              width: `${Math.min(100, Math.max(12, Number(value) * 25))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <div className="grid gap-4">
                <ActionLink
                  href="/log-symptom"
                  className="group relative flex min-h-[176px] flex-col justify-between overflow-hidden rounded-[32px] bg-[#24C1C4] p-5 text-white shadow-[0_10px_40px_rgba(0,0,0,0.02)] sm:p-6"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/[0.18] blur-3xl transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="relative flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.14] ring-1 ring-white/25 backdrop-blur-sm">
                      <HeartPulse className="h-5 w-5 text-white" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-white/[0.12] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-white/85 ring-1 ring-white/15">
                      Quick action
                    </span>
                  </div>
                  <div className="relative">
                    <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#0F5A62]">
                      Monitor
                    </p>
                    <p className="mt-1 text-[22px] font-black tracking-[-0.045em]">
                      Log a symptom
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-white/[0.78]">
                      Capture how you feel in a few taps.
                    </p>
                  </div>
                </ActionLink>

                <div className="relative overflow-hidden rounded-[32px] border border-[#DDE9EA] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] sm:p-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#24C1C4]/15 blur-3xl"
                  />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#177E89]">
                          Next focus
                        </p>
                        <p className="mt-1 text-[18px] font-black tracking-[-0.035em] text-[#0B2D54]">
                          {todayActionCount > 0 ? "Start with today." : "You’re clear for now."}
                        </p>
                      </div>
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E7F8F7]">
                        <Sparkles className="h-4 w-4 text-[#0F5A62]" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="mt-4 max-w-sm text-[11px] leading-5 text-[#71839A]">
                      Sympto keeps your daily care, clinic essentials and health record close without making you repeat the same information.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#E9F8F7] via-white to-[#F7FAFC] p-[1px] shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-[#24C1C4]/10 blur-3xl"
              />
              <div className="relative rounded-[33px] bg-white/85 p-4 backdrop-blur-sm sm:p-5">
                <div className="flex items-end justify-between gap-4 px-1 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#24C1C4] shadow-[0_0_10px_rgba(36,193,196,0.65)]" />
                      <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#177E89]">
                        Your health, at a glance
                      </p>
                    </div>
                    <p className="mt-1 text-[12px] font-medium text-[#8A99A8]">
                      Three places. One health story.
                    </p>
                  </div>

                  <span className="hidden items-center gap-1.5 rounded-full bg-[#F3F8F9] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#6F848B] sm:inline-flex">
                    Sympto
                    <Sparkles className="h-3 w-3 text-[#24C1C4]" aria-hidden="true" />
                  </span>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  <ActionLink
                    href="/today"
                    className="group relative min-h-[280px] overflow-hidden rounded-[28px] border border-[#B9E5E2] bg-gradient-to-br from-[#F2FBFA] via-white to-[#EAF8F7] p-5 shadow-[0_10px_30px_rgba(15,90,98,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,90,98,0.09)] sm:p-6"
                  >
                    <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[#24C1C4]/15 blur-2xl" />
                    <div className="relative flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#DDF7F5] ring-1 ring-[#24C1C4]/25">
                          <CheckCircle2 className="h-5 w-5 text-[#0F5A62]" aria-hidden="true" />
                        </span>
                        <span className="rounded-full bg-[#E8F8F7] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#177E89]">
                          Care
                        </span>
                      </div>

                      <p className="mt-8 text-[9px] font-black uppercase tracking-[0.16em] text-[#177E89]">
                        Daily care
                      </p>
                      <h2 className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#0B2D54]">
                        Today
                      </h2>
                      <p className="mt-2 max-w-[18rem] text-[11px] leading-5 text-[#71839A]">
                        Your medications, visits and goals live here when you need to act.
                      </p>

                      <div className="mt-auto pt-7">
                        <ProgressStrip value={todayCoverage} accent="bg-[#24C1C4]" label="Care coverage" />
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.11em] text-[#0F5A62]">
                            Open today
                          </span>
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0F5A62] text-white transition-transform duration-200 group-hover:translate-x-1">
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-passport"
                    className="group relative min-h-[280px] overflow-hidden rounded-[28px] border border-[#F0CACA] bg-gradient-to-br from-[#FFF4F4] via-white to-[#FFF9F9] p-5 shadow-[0_10px_30px_rgba(180,35,24,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(180,35,24,0.08)] sm:p-6"
                  >
                    <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[#E53935]/12 blur-2xl" />
                    <div className="relative flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FFE6E6] ring-1 ring-[#E53935]/22">
                          <ShieldCheck className="h-5 w-5 text-[#C62828]" aria-hidden="true" />
                        </span>
                        <span className="rounded-full bg-[#FFF0F0] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#C62828]">
                          Safety
                        </span>
                      </div>

                      <p className="mt-8 text-[9px] font-black uppercase tracking-[0.16em] text-[#C62828]">
                        My Clinic Card
                      </p>
                      <h2 className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#0B2D54]">
                        Essentials
                      </h2>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-[#FFF8F8] px-3 py-3 ring-1 ring-[#F5DDDD]">
                          <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#9D8585]">
                            Allergies
                          </p>
                          <p className="mt-1 truncate text-[11px] font-black text-[#B42318]">
                            {allergiesValue}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[#FFF8F8] px-3 py-3 ring-1 ring-[#F5DDDD]">
                          <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#9D8585]">
                            Conditions
                          </p>
                          <p className="mt-1 truncate text-[11px] font-black text-[#B42318]">
                            {conditionsValue}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto pt-5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.11em] text-[#C62828]">
                            Open clinic card
                          </span>
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#C62828] text-white transition-transform duration-200 group-hover:translate-x-1">
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-journal"
                    className="group relative min-h-[280px] overflow-hidden rounded-[28px] border border-[#C8E0DF] bg-gradient-to-br from-[#F1F9F8] via-white to-[#F7FBFB] p-5 shadow-[0_10px_30px_rgba(15,90,98,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,90,98,0.09)] sm:p-6"
                  >
                    <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[#177E89]/12 blur-2xl" />
                    <div className="relative flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#E4F3F3] ring-1 ring-[#0F5A62]/20">
                          <FolderOpen className="h-5 w-5 text-[#0F5A62]" aria-hidden="true" />
                        </span>
                        <span className="rounded-full bg-[#EAF6F5] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#0F5A62]">
                          History
                        </span>
                      </div>

                      <p className="mt-8 text-[9px] font-black uppercase tracking-[0.16em] text-[#0F5A62]">
                        My history & papers
                      </p>
                      <h2 className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#0B2D54]">
                        Records
                      </h2>
                      <p className="mt-2 max-w-[18rem] text-[11px] leading-5 text-[#71839A]">
                        Your encounters, results and documents stay together in your health story.
                      </p>

                      <div className="mt-auto pt-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#6C8F94]">
                                Records
                              </p>
                              <p className="mt-1 text-lg font-black leading-none text-[#0F5A62]">
                                {historyCount}
                              </p>
                            </div>
                            <span className="h-8 w-px bg-[#DCEBEB]" />
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#6C8F94]">
                                Vitals
                              </p>
                              <p className="mt-1 text-lg font-black leading-none text-[#0F5A62]">
                                {healthVitals.length}
                              </p>
                            </div>
                          </div>

                          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0F5A62] text-white transition-transform duration-200 group-hover:translate-x-1">
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </ActionLink>
                </div>
              </div>
            </section>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

      </main>
    </ProtectedRoute>
  );
}
