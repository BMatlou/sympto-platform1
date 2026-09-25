"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, FolderOpen, HeartPulse, ShieldCheck } from "lucide-react";
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

function DashboardCard({
  href,
  title,
  tag,
  description,
  children,
  footerLabel,
  icon: Icon,
  accent,
  accentBg,
  softAccent,
  iconBg,
  border,
}: {
  href: string;
  title: string;
  tag: string;
  description: string;
  children?: ReactNode;
  footerLabel: string;
  icon: typeof CheckCircle2;
  accent: string;
  accentBg: string;
  softAccent: string;
  iconBg: string;
  border: string;
}) {
  return (
    <ActionLink
      href={href}
      ariaLabel={title}
      className={
        "group flex min-h-[340px] h-full flex-col overflow-hidden rounded-[28px] border bg-white " +
        "shadow-[0_8px_28px_rgba(11,45,84,0.045)] " +
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(11,45,84,0.08)] " +
        border
      }
    >
      <div className={`h-1.5 w-full ${accentBg}`} />

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              className={
                "grid h-12 w-12 shrink-0 place-items-center rounded-[18px] " +
                iconBg
              }
            >
              <Icon className={`h-5 w-5 ${accent}`} aria-hidden="true" />
            </span>

            <div className="min-w-0">
              <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${accent}`}>
                {tag}
              </p>
              <h2 className="mt-1 text-[21px] font-black tracking-[-0.045em] text-[#0B2D54]">
                {title}
              </h2>
            </div>
          </div>
        </div>

        <p className="mt-5 max-w-[34rem] text-[13px] leading-6 text-[#6F8192]">
          {description}
        </p>

        {children ? <div className="mt-5">{children}</div> : null}

        <div className="mt-auto pt-6">
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <span className={`text-[10px] font-black uppercase tracking-[0.16em] ${accent}`}>
              {footerLabel}
            </span>

            <span
              className={
                "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 " +
                softAccent +
                " transition-transform duration-200 group-hover:translate-x-1"
              }
            >
              <ArrowRight className={`h-4 w-4 ${accent}`} aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </ActionLink>
  );
}

function MetricBadge({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[18px] border border-[#E2EBEE] bg-[#F8FBFB] px-3.5 py-3.5">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#8A9AA8]">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-black leading-none tracking-[-0.04em] text-[#0B2D54]">
        {value}
      </p>
    </div>
  );
}

function ClinicRow({
  label,
  value,
  blood = false,
}: {
  label: string;
  value: string;
  blood?: boolean;
}) {
  return (
    <div
      className={
        "flex min-h-[50px] items-center justify-between gap-3 rounded-[18px] border px-3.5 py-3 " +
        (blood
          ? "border-[#F5D7D7] bg-[#FFF6F6]"
          : "border-[#E3ECEF] bg-[#F9FBFB]")
      }
    >
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#8A9AA8]">
        {label}
      </span>
      <span
        className={
          "text-right text-[11px] font-black " +
          (blood ? "text-[#B42318]" : "text-[#0B2D54]")
        }
      >
        {value}
      </span>
    </div>
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

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f7fbfb] text-[#14304d]">
        <div className="mx-auto max-w-[1240px] px-4 pb-12 pt-20 sm:px-6 sm:pt-24 lg:px-8">
          <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#08284A] via-[#0C4166] to-[#24B8BB] px-5 py-5 text-white shadow-[0_18px_48px_rgba(11,45,84,0.13)] sm:px-7 sm:py-7 lg:px-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/[0.08]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 left-[48%] h-56 w-56 rounded-full bg-[#24C1C4]/20 blur-3xl"
            />

            <div className="relative">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold tracking-[-0.01em] text-white/[0.86]">
                    Good day, {firstName}
                  </p>
                  <p className="mt-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/[0.48]">
                    Your health overview
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/[0.72]">
                  Today
                </span>
              </div>

              <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-[24px] bg-white/10 ring-1 ring-white/10 sm:h-[84px] sm:w-[84px]">
                    <div className="text-center">
                      <p className="text-3xl font-black leading-none tracking-[-0.06em]">
                        {todayActionCount}
                      </p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-[#9EF4F0]">
                        today
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h1 className="max-w-2xl text-[26px] font-black leading-[1.07] tracking-[-0.05em] sm:text-[34px]">
                      You have {todayActionCount} {todayActionCount === 1 ? "thing" : "things"} to take care of today.
                    </h1>
                    <p className="mt-2 text-[13px] leading-5 text-white/[0.62]">
                      Start with what matters most.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <ActionLink
                    href="/today"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-black text-[#0B2D54] shadow-sm hover:bg-slate-50"
                  >
                    View today
                    <ArrowRight className="h-3.5 w-3.5 text-[#24C1C4]" aria-hidden="true" />
                  </ActionLink>

                  <ActionLink
                    href="/log-symptom"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#24C1C4] px-4 py-2 text-[11px] font-black text-[#08284A] shadow-[0_8px_18px_rgba(36,193,196,0.20)] hover:bg-[#57D7D9]"
                  >
                    <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
                    Log a symptom
                  </ActionLink>
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between gap-4 px-1 pb-1 pt-7">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#71839A]">
                Your health, at a glance
              </p>
              <p className="mt-1 text-xs font-medium text-[#8A99A8]">
                Choose what you need. Sympto will take you there.
              </p>
            </div>
          </div>

          <section
            className="grid items-stretch gap-4 md:grid-cols-3"
            aria-label="Health dashboard"
          >
            <DashboardCard
              href="/today"
              title="Today"
              tag="Daily care"
              description={`What do I do today? ${todayActionCount} ${todayActionCount === 1 ? "thing needs" : "things need"} your attention.`}
              icon={CheckCircle2}
              accent="text-[#0B7B80]"
              accentBg="bg-[#24C1C4]"
              softAccent="bg-[#E8F8F7]"
              iconBg="bg-[#E8F8F7] ring-1 ring-[#24C1C4]/20"
              border="border-[#B9E6E4]"
              footerLabel="Open today"
            >
              <div className="grid grid-cols-3 gap-2">
                <MetricBadge label="Medication" value={medications.length} />
                <MetricBadge label="Visit" value={appointments.length} />
                <MetricBadge label="Goal" value={activeGoalCount} />
              </div>
            </DashboardCard>

            <DashboardCard
              href="/health-passport"
              title="Essentials"
              tag="My Clinic Card"
              description="Your essential health information for quick reference and care."
              icon={ShieldCheck}
              accent="text-[#C62828]"
              accentBg="bg-[#E53935]"
              softAccent="bg-[#FFF0F0]"
              iconBg="bg-[#FFF0F0] ring-1 ring-[#E53935]/20"
              border="border-[#F0C2C2]"
              footerLabel="Open clinic card"
            >
              <div className="space-y-2">
                <ClinicRow label="Allergies" value={allergiesValue} />
                <ClinicRow label="Conditions" value={conditionsValue} />
                <div className="grid grid-cols-2 gap-2">
                  <ClinicRow
                    label="Blood"
                    value={display(bloodType).toUpperCase()}
                    blood
                  />
                  <ClinicRow
                    label="Rhesus"
                    value={display(rhesusFactor).toUpperCase()}
                  />
                </div>
              </div>
            </DashboardCard>

            <DashboardCard
              href="/health-journal"
              title="Records"
              tag="My history & papers"
              description="Your encounters, results and important health documents in one place."
              icon={FolderOpen}
              accent="text-[#2F6FDB]"
              accentBg="bg-[#4A80E8]"
              softAccent="bg-[#EEF4FF]"
              iconBg="bg-[#EEF4FF] ring-1 ring-[#4A80E8]/20"
              border="border-[#BED2F4]"
              footerLabel="Open records"
            >
              <div className="grid grid-cols-2 gap-2">
                <MetricBadge label="Records" value={historyCount} />
                <MetricBadge label="Vitals" value={healthVitals.length} />
              </div>

              <div className="mt-3 rounded-[18px] border border-[#DDE7F7] bg-[#F7FAFF] px-3.5 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#6D8FC7]">
                  Documents
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#2F5FAF]">
                  Your history, results and health papers stay together.
                </p>
              </div>
            </DashboardCard>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
