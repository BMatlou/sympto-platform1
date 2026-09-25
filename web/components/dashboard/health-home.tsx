"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, ArrowRight, Bell, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, FileText, FolderOpen, HeartPulse, House, MapPin, Pill, ShieldCheck, Sparkles, Target, UserRound } from "lucide-react";
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

  const latestVital = healthVitals[0];

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
<SHOULD_NOT_EXIST>