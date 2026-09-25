"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, FileText, FolderOpen, ShieldCheck } from "lucide-react";
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
  footerLabel = "Open",
  icon: Icon,
  iconWrapClass,
  cardClass,
  badgeClass,
  footerClass,
}: {
  href: string;
  title: string;
  tag: string;
  description: string;
  children?: ReactNode;
  footerLabel?: string;
  icon: typeof CheckCircle2;
  iconWrapClass: string;
  cardClass: string;
  badgeClass: string;
  footerClass: string;
}) {
  return (
    <ActionLink
      href={href}
      ariaLabel={title}
      className={
        "group relative block overflow-hidden rounded-3xl border p-5 shadow-[0_10px_30px_rgba(0,0,0,0.02)] " +
        "transition-all duration-200 hover:-translate-y-0.5 sm:p-6 " +
        cardClass
      }
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-current opacity-80" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            className={
              "grid h-12 w-12 shrink-0 place-items-center rounded-2xl " +
              iconWrapClass
            }
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>

          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-[-0.04em] text-[#0b2d54]">
              {title}
            </h2>
            <p
              className={
                "mt-1 text-[10px] font-black uppercase tracking-[0.16em] " +
                badgeClass
              }
            >
              {tag}
            </p>
          </div>
        </div>

        <span
          className={
            "shrink-0 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] " +
            badgeClass
          }
        >
          {footerLabel}
        </span>
      </div>

      <p className="relative mt-5 max-w-2xl text-sm leading-6 text-slate-600">
        {description}
      </p>

      {children ? <div className="relative mt-5">{children}</div> : null}

      <div
        className={
          "relative mt-5 flex items-center justify-between gap-3 border-t pt-4 " +
          footerClass
        }
      >
        <span className="text-[10px] font-black uppercase tracking-[0.14em]">
          {footerLabel}
        </span>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 ring-1 ring-black/5 transition-transform duration-200 group-hover:translate-x-1">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
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
    <div className="rounded-2xl bg-white/80 px-3.5 py-3 ring-1 ring-black/[0.04] backdrop-blur-sm">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-black tracking-[-0.03em] text-[#0b2d54]">
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
        "flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5 " +
        (blood ? "bg-red-50 ring-1 ring-red-100" : "bg-white/70 ring-1 ring-slate-100")
      }
    >
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <span
        className={
          "text-right text-sm font-black " +
          (blood ? "text-red-700" : "text-[#0b2d54]")
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
          <div className="mx-auto max-w-2xl space-y-4" aria-busy="true">
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

  const greeting =
    todayActionCount > 0
      ? `${todayActionCount} ${todayActionCount === 1 ? "thing" : "things"} to take care of today.`
      : "Nothing urgent to take care of today.";

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
        <div className="mx-auto max-w-[1180px] px-4 pb-12 pt-20 sm:px-6 sm:pt-24 lg:px-8">
          <section className="relative overflow-hidden rounded-t-3xl rounded-b-[42px] bg-gradient-to-b from-[#0F5A62] to-[#177E89] p-5 text-white shadow-[0_16px_38px_rgba(15,90,98,0.14)] sm:p-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full border border-white/10"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 left-1/4 h-56 w-56 rounded-full bg-[#24C1C4]/15 blur-3xl"
            />

            <div className="relative">
              <p className="text-[11px] font-bold tracking-[-0.01em] text-white/70">
                Good day, {firstName}
              </p>
              <h1 className="mt-3 max-w-md text-3xl font-black tracking-[-0.045em] sm:text-4xl">
                {greeting}
              </h1>
              <p className="mt-2 text-sm leading-6 text-white/72">
                Start with what matters most.
              </p>

              <div className="mt-6 rounded-2xl bg-white/10 p-1 ring-1 ring-white/10 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-1">
                  <ActionLink
                    href="/today"
                    className="flex min-h-11 items-center justify-center rounded-xl bg-white px-3 text-xs font-black text-[#0b2d54]"
                  >
                    View today
                  </ActionLink>
                  <span
                    aria-current="page"
                    className="flex min-h-11 items-center justify-center rounded-xl px-3 text-xs font-black text-white/75"
                  >
                    Your health, at a glance
                  </span>
                </div>
              </div>

              <ActionLink
                href="/log-symptom"
                className="mt-3 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#24C1C4] px-5 text-sm font-black text-[#073f46] shadow-[0_10px_24px_rgba(36,193,196,0.20)] hover:bg-[#24C1C4]/90"
              >
                ＋ Log a symptom
              </ActionLink>
            </div>
          </section>

          <div className="px-1 pb-1 pt-7">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              Choose what you need. Sympto will take you there.
            </p>
          </div>

          <section className="space-y-4" aria-label="Health dashboard">
            <DashboardCard
              href="/today"
              title="Today"
              tag="Today"
              description={`What do I do today? ${todayActionCount} ${todayActionCount === 1 ? "thing needs" : "things need"} your attention.`}
              icon={CheckCircle2}
              iconWrapClass="bg-[#E5FAF8] text-[#0B7B80] ring-1 ring-[#24C1C4]/25"
              cardClass="border-[#B9E7E5] bg-gradient-to-br from-white via-white to-[#F0FCFB] text-[#0B7B80] hover:border-[#24C1C4] hover:shadow-[0_16px_38px_rgba(36,193,196,0.14)]"
              badgeClass="text-[#0B7B80] bg-[#EAF9F8]"
              footerClass="border-[#D8EFEE] text-[#0B7B80]"
            >
              <div className="grid grid-cols-3 gap-2.5">
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
              iconWrapClass="bg-[#FFF0F0] text-[#C62828] ring-1 ring-[#E53935]/20"
              cardClass="border-[#F0B7B7] bg-gradient-to-br from-white via-white to-[#FFF5F5] text-[#C62828] hover:border-[#E53935] hover:shadow-[0_16px_38px_rgba(229,57,53,0.14)]"
              badgeClass="text-[#B42318] bg-[#FFF1F1]"
              footerClass="border-[#F3D5D5] text-[#B42318]"
            >
              <div className="space-y-2.5">
                <ClinicRow label="Allergies" value={allergiesValue} />
                <ClinicRow label="Conditions" value={conditionsValue} />
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
            </DashboardCard>

            <DashboardCard
              href="/health-journal"
              title="Records"
              tag="My History and Papers"
              description="Your encounters, results and important health documents in one place."
              icon={FolderOpen}
              iconWrapClass="bg-[#EAF2FF] text-[#2F6FDB] ring-1 ring-[#4A80E8]/20"
              cardClass="border-[#B9D0F5] bg-gradient-to-br from-white via-white to-[#F2F7FF] text-[#2F6FDB] hover:border-[#4A80E8] hover:shadow-[0_16px_38px_rgba(47,111,219,0.14)]"
              badgeClass="text-[#2F5FAF] bg-[#EEF4FF]"
              footerClass="border-[#D8E5FA] text-[#2F5FAF]"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <MetricBadge label="Records" value={historyCount} />
                <MetricBadge label="Vitals" value={healthVitals.length} />
              </div>
            </DashboardCard>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
