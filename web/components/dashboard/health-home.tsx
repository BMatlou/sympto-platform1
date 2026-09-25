"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Bell, CheckCircle2, FolderOpen, HeartPulse, House, ShieldCheck, UserRound } from "lucide-react";
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
  const todayActionCount =
    medications.length + appointments.length + activeGoalCount;

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
              <section className="group relative overflow-hidden rounded-[32px] bg-[#0B2D54] p-5 text-white shadow-[0_18px_52px_rgba(11,45,84,0.14)] sm:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#24C1C4]/20 blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-white/[0.07] blur-3xl"
                />

                <div className="relative flex min-h-[232px] flex-col justify-between gap-10">
                  <div className="max-w-[40rem]">
                    <h2 className="text-[34px] font-black tracking-[-0.055em] sm:text-[44px]">
                      Good day, {firstName}
                    </h2>
                    <p className="mt-2 max-w-[30rem] text-[13px] font-medium leading-6 text-white/[0.72]">
                      Your health, organised around what matters today.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-6">
                    <div>
                      <p className="text-[62px] font-black leading-[0.82] tracking-[-0.08em] sm:text-[72px]">
                        {todayActionCount}
                      </p>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/[0.52]">
                        things today
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

              <ActionLink
                href="/log-symptom"
                className="group relative flex min-h-[232px] flex-col justify-between overflow-hidden rounded-[32px] bg-[#24C1C4] p-5 text-[#0B2D54] shadow-[0_18px_52px_rgba(36,193,196,0.15)] sm:p-6"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-white/25 blur-3xl transition-transform duration-300 group-hover:scale-110"
                />
                <div className="relative flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/30 ring-1 ring-white/40">
                    <HeartPulse className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <ArrowRight className="mt-1 h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </div>

                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0B2D54]/65">
                    Monitor
                  </p>
                  <h2 className="mt-1 text-[26px] font-black tracking-[-0.05em]">
                    Log a symptom
                  </h2>
                </div>
              </ActionLink>
            </div>

            <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#E8F8F7] via-white to-[#F7FBFB] p-[1px] shadow-[0_12px_40px_rgba(11,45,84,0.05)]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-[#24C1C4]/10 blur-3xl"
              />
              <div className="relative rounded-[33px] bg-white/95 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between px-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#0B2D54]">
                    Your health
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <ActionLink
                    href="/today"
                    className="group relative flex min-h-[164px] flex-col justify-between overflow-hidden rounded-[26px] border border-[#B9E5E2] bg-gradient-to-br from-[#F7FBFB] via-white to-[#E8F8F7] p-5 shadow-[0_10px_30px_rgba(11,45,84,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(11,45,84,0.09)]"
                  >
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#24C1C4]/15 blur-2xl" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E8F8F7] ring-1 ring-[#24C1C4]/25">
                        <CheckCircle2 className="h-5 w-5 text-[#0B2D54]" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#0B2D54] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                    <div className="relative">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#24C1C4]">
                        Daily care
                      </p>
                      <h2 className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#0B2D54]">
                        Today
                      </h2>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-passport"
                    className="group relative flex min-h-[164px] flex-col justify-between overflow-hidden rounded-[26px] border border-[#EFCACA] bg-gradient-to-br from-[#FFF4F4] via-white to-[#FFF9F9] p-5 shadow-[0_10px_30px_rgba(180,35,24,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(180,35,24,0.09)]"
                  >
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#E53935]/12 blur-2xl" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFE6E6] ring-1 ring-[#E53935]/22">
                        <ShieldCheck className="h-5 w-5 text-[#C62828]" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#C62828] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                    <div className="relative">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#C62828]">
                        Clinic Card
                      </p>
                      <h2 className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#0B2D54]">
                        Essentials
                      </h2>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-journal"
                    className="group relative flex min-h-[164px] flex-col justify-between overflow-hidden rounded-[26px] border border-[#B9E5E2] bg-gradient-to-br from-[#F7FBFB] via-white to-[#E8F8F7] p-5 shadow-[0_10px_30px_rgba(11,45,84,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(11,45,84,0.09)]"
                  >
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#24C1C4]/12 blur-2xl" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E8F8F7] ring-1 ring-[#24C1C4]/20">
                        <FolderOpen className="h-5 w-5 text-[#0B2D54]" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#0B2D54] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                    <div className="relative">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#24C1C4]">
                        Health Journal
                      </p>
                      <h2 className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#0B2D54]">
                        Records
                      </h2>
                    </div>
                  </ActionLink>
                </div>
              </div>
            </section>
          </section>
        </div>
      </main>
      </ProtectedRoute>
    );
  }
