"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, Bell, CalendarDays, CheckCircle2, ChevronDown, ClipboardList, CreditCard, FileHeart, FileText, FolderOpen, HeartPulse, House, Menu, MessageCircle, Pill, Plus, Settings, ShieldCheck, UserRound, Users, Watch } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthJournalService } from "@/services/health-journal.service";
import ProtectedRoute from "@/components/auth/protected-route";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/today", label: "Today", icon: CheckCircle2 },
  { href: "/health-passport", label: "Clinic Card", icon: FileHeart },
  { href: "/health-journal", label: "Health Journal", icon: FileText },
];

const MORE_NAV = [
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/medications", label: "Medications", icon: Pill },
  { href: "/care-plans", label: "Care Plans", icon: ClipboardList },
  { href: "/health-goals", label: "Health Goals", icon: HeartPulse },
  { href: "/log-symptom", label: "Log a symptom", icon: HeartPulse },
  { href: "/health-vitals", label: "Measurements", icon: Activity },
  { href: "/health-records", label: "Health Records", icon: FileText },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/wearables", label: "Connected devices", icon: Watch },
  { href: "/family", label: "Family", icon: Users },
  { href: "/health-finance", label: "Medical aid & payments", icon: CreditCard },
  { href: "/emergency-contacts", label: "Emergency contacts", icon: ShieldCheck },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];
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
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!data?.patient?.id) return;

    let active = true;

    healthJournalService.getSymptoms({ limit: 100 })
      .then((symptoms) => {
        if (!active) return;
        setSymptomFeed(Array.isArray(symptoms) ? symptoms : []);
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

  const journalChips = [
    recentSymptom ? "Symptom logged" : null,
    recentSymptom ? "Recent" : null,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#F8FAFC] p-3 text-slate-800 sm:p-4">
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.02)] lg:grid-cols-[220px_minmax(0,1fr)_320px]">
          <aside className="hidden p-3 lg:block">
            <div className="sticky top-3 flex min-h-[calc(100vh-2rem)] flex-col rounded-[28px] bg-gradient-to-b from-[#0F5A62] to-[#177E89] p-3 text-white">
              <div className="px-3 py-4">
                <Link href="/dashboard" aria-label="Sympto home" className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-[15px] bg-white/12 ring-1 ring-inset ring-white/20">
                    <HeartPulse className="h-5 w-5 text-[#24C1C4]" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-[17px] font-black tracking-[-0.04em]">Sympto</span>
                    <span className="block text-[9px] font-medium text-white/65">Your health, organised.</span>
                  </span>
                </Link>
              </div>

              <nav className="mt-5 space-y-1.5" aria-label="Primary health navigation">
                {PRIMARY_NAV.map(({ href, label, icon: Icon }) => (
                  <ActionLink
                    key={href}
                    href={href}
                    ariaLabel={label}
                    className={
                      "flex min-h-12 items-center gap-3 rounded-[16px] px-3.5 text-[11px] font-bold transition-all " +
                      (href === "/dashboard"
                        ? "bg-white text-[#0F5A62] shadow-[0_8px_22px_rgba(0,0,0,0.10)]"
                        : "text-white/76 hover:bg-white/10 hover:text-white")
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </ActionLink>
                ))}
              </nav>

              <div className="mt-auto border-t border-white/15 pt-4">
                <button
                  type="button"
                  onClick={() => setMoreOpen((value) => !value)}
                  aria-expanded={moreOpen}
                  aria-label={moreOpen ? "Collapse more navigation" : "More navigation"}
                  className="flex min-h-11 w-full items-center gap-3 rounded-[16px] px-3.5 text-[11px] font-bold text-white/72 transition-all hover:bg-white/10 hover:text-white"
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                  <span>More</span>
                  <ChevronDown className={"ml-auto h-3.5 w-3.5 transition-transform " + (moreOpen ? "rotate-180" : "")} aria-hidden="true" />
                </button>

                {moreOpen && (
                  <nav className="mt-2 max-h-[42vh] space-y-1 overflow-y-auto pr-1" aria-label="More health navigation">
                    {MORE_NAV.map(({ href, label, icon: Icon }) => (
                      <ActionLink
                        key={href}
                        href={href}
                        ariaLabel={label}
                        className="flex min-h-10 items-center gap-3 rounded-[14px] px-3.5 text-[10px] font-semibold text-white/68 transition-all hover:bg-white/10 hover:text-white"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{label}</span>
                      </ActionLink>
                    ))}
                  </nav>
                )}
              </div>
            </div>
          </aside>

          <section className="min-w-0 border-x border-slate-200/70 bg-white">
            <div className="p-5 sm:p-6 lg:p-7">
              <header className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#177E89]">Workspace</p>
                  <h1 className="mt-1 text-[28px] font-black tracking-[-0.055em] text-[#0F5A62]">Overview</h1>
                  <p className="mt-1 max-w-2xl text-[12px] leading-5 text-slate-500">
                    Good day, {firstName}. Your health, organised around what matters today.
                  </p>
                </div>

                <ActionLink
                  href="/smart-file"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[14px] bg-[#0F5A62] px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-[0_8px_20px_rgba(15,90,98,0.12)] hover:bg-[#0B4850]"
                >
                  <FileHeart className="h-3.5 w-3.5" aria-hidden="true" />
                  Share Smart File
                </ActionLink>
              </header>

              <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(250px,0.72fr)]">
                <section className="relative min-h-[330px] overflow-hidden rounded-[28px] bg-[#177E89] p-6 text-white shadow-[0_10px_40px_rgba(0,0,0,0.02)] sm:p-7">
                  <div className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/58">Health telemetry</p>
                        <p className="mt-3 max-w-[34rem] text-[12px] leading-5 text-white/74">
                          Your health, organised around what matters today.
                        </p>
                      </div>
                      <span className="grid h-11 w-11 place-items-center rounded-[15px] bg-white/10 ring-1 ring-inset ring-white/15">
                        <Activity className="h-5 w-5 text-[#24C1C4]" aria-hidden="true" />
                      </span>
                    </div>

                    <div className="mt-auto pt-8">
                      <div className="flex items-end gap-4">
                        <p className="text-[88px] font-black leading-[0.75] tracking-[-0.09em]">{todayActionCount}</p>
                        <p className="max-w-[14rem] pb-2 text-[11px] font-bold leading-4 text-white/78">
                          active items that need your attention today
                        </p>
                      </div>

                      <ActionLink
                        href="/today"
                        className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#24C1C4] px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#0F5A62] hover:bg-white"
                      >
                        Open today
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </ActionLink>
                    </div>

                    <div className="mt-7 grid grid-cols-3 overflow-hidden rounded-[18px] border border-white/10 bg-white/8">
                      <ActionLink href="/today" className="border-r border-white/10 p-4 hover:bg-white/8">
                        <p className="text-[9px] font-bold text-white/55">Today</p>
                        <p className="mt-1 text-[11px] font-black text-white">
                          {todayChips.length > 0 ? todayChips.join(" · ") : "No active items"}
                        </p>
                      </ActionLink>
                      <ActionLink href="/health-passport" className="border-r border-white/10 p-4 hover:bg-white/8">
                        <p className="text-[9px] font-bold text-white/55">Clinic Card</p>
                        <p className="mt-1 text-[11px] font-black text-white">
                          Essentials
                        </p>
                      </ActionLink>
                      <ActionLink href="/health-journal" className="p-4 hover:bg-white/8">
                        <p className="text-[9px] font-bold text-white/55">Health Journal</p>
                        <p className="mt-1 text-[11px] font-black text-white">
                          Records
                        </p>
                      </ActionLink>
                    </div>
                  </div>
                </section>

                <div className="grid gap-4">
                  <ActionLink
                    href="/today"
                    className="group min-h-[154px] rounded-[26px] bg-[#24C1C4] p-6 text-[#0F5A62] shadow-[0_10px_40px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,90,98,0.10)]"
                  >
                    <div className="flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/25">
                          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <ArrowRight className="h-4 w-4 opacity-45 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-65">Daily care</p>
                        <h2 className="mt-1 text-[25px] font-black tracking-[-0.05em]">Open today</h2>
                      </div>
                    </div>
                  </ActionLink>

                  <section className="min-h-[154px] rounded-[26px] bg-[#F0F7F8] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.02)] ring-1 ring-inset ring-[#177E89]/10">
                    <div className="flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#177E89]">Monitor</span>
                        <Activity className="h-4 w-4 text-[#177E89]/60" aria-hidden="true" />
                      </div>
                      {recentSymptom ? (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Recent symptom</p>
                          <h2 className="mt-1 truncate text-[24px] font-black tracking-[-0.05em] text-[#0F5A62]">{symptomLabel(recentSymptom)}</h2>
                          <p className="mt-1 text-[10px] font-semibold text-slate-500">
                            {formatSymptomDate(recentSymptomAt)}
                            {recentSymptomStatus === "ACTIVE" ? " · Active" : ""}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <h2 className="text-[24px] font-black tracking-[-0.05em] text-[#0F5A62]">No symptom yet</h2>
                          <p className="mt-1 text-[10px] font-semibold text-slate-500">Your journal is ready when you are.</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Your health</p>
                    <h2 className="mt-0.5 text-[17px] font-black tracking-[-0.035em] text-[#0F5A62]">Quick navigation</h2>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <ActionLink href="/today" className="group min-h-[165px] rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 hover:border-[#24C1C4]/30">
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between">
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#E9FAFA] text-[#0F5A62]">
                          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <ArrowRight className="mt-1 h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-[#24C1C4]" aria-hidden="true" />
                      </div>
                      <div className="mt-auto">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Daily care</p>
                        <h3 className="mt-1 text-[28px] font-black tracking-[-0.06em] text-[#0F5A62]">Today</h3>
                        <p className="mt-1 text-[10px] font-medium text-slate-500">{todayChips.length > 0 ? todayChips.join(" · ") : "Nothing due today"}</p>
                        <div className="mt-4 h-1 rounded-full bg-slate-100">
                          <div className="h-1 w-full rounded-full bg-[#24C1C4]" />
                        </div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink href="/health-passport" className="group min-h-[165px] rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 hover:border-[#177E89]/30">
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between">
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#EAF4F5] text-[#177E89]">
                          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <ArrowRight className="mt-1 h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-[#177E89]" aria-hidden="true" />
                      </div>
                      <div className="mt-auto">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Clinic Card</p>
                        <h3 className="mt-1 text-[28px] font-black tracking-[-0.06em] text-[#0F5A62]">Essentials</h3>
                        <p className="mt-1 truncate text-[10px] font-medium text-slate-500">{clinicChips.length > 0 ? clinicChips.join(" · ") : "Key health information"}</p>
                        <div className="mt-4 h-1 rounded-full bg-slate-100">
                          <div className="h-1 w-3/4 rounded-full bg-[#177E89]" />
                        </div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink href="/health-journal" className="group min-h-[165px] rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 hover:border-[#24C1C4]/30">
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between">
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#E9FAFA] text-[#0F5A62]">
                          <FolderOpen className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <ArrowRight className="mt-1 h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-[#24C1C4]" aria-hidden="true" />
                      </div>
                      <div className="mt-auto">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Health Journal</p>
                        <h3 className="mt-1 text-[28px] font-black tracking-[-0.06em] text-[#0F5A62]">Records</h3>
                        <p className="mt-1 text-[10px] font-medium text-slate-500">{recentSymptom ? "Recent symptom recorded" : "Your health history"}</p>
                        <div className="mt-4 h-1 rounded-full bg-slate-100">
                          <div className="h-1 w-1/2 rounded-full bg-[#24C1C4]" />
                        </div>
                      </div>
                    </div>
                  </ActionLink>
                </div>
              </section>
            </div>
          </section>

          <aside className="hidden border-l border-slate-200/70 bg-[#FBFCFD] p-5 lg:block">
            <div className="sticky top-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Workspace feed</p>
                  <h2 className="mt-1 text-[18px] font-black tracking-[-0.04em] text-[#0F5A62]">More</h2>
                </div>
                <ActionLink href="/smart-file" className="text-[9px] font-black uppercase tracking-[0.08em] text-[#177E89] hover:text-[#0F5A62]">
                  Share Smart File
                </ActionLink>
              </div>

              <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Recent symptom</p>
                  <Activity className="h-4 w-4 text-[#24C1C4]" aria-hidden="true" />
                </div>

                {recentSymptom ? (
                  <ActionLink
                    href={
                      recentSymptomStatus === "ACTIVE"
                        ? "/symptom-logs/" + encodeURIComponent(String(recentSymptom.id)) + "/monitor"
                        : "/symptom-logs/" + encodeURIComponent(String(recentSymptom.id))
                    }
                    className="block rounded-[18px] bg-[#F3FAFA] p-4 hover:bg-[#EAF7F7]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-[17px] font-black tracking-[-0.035em] text-[#0F5A62]">{symptomLabel(recentSymptom)}</h3>
                        <p className="mt-1 text-[10px] font-medium text-slate-500">
                          {formatSymptomDate(recentSymptomAt)}
                          {recentSymptomStatus === "ACTIVE" ? " · Active" : ""}
                        </p>
                      </div>
                      {recentSymptom.overallSeverity && (
                        <span className="rounded-full bg-[#24C1C4]/15 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-[#0F5A62]">
                          {String(recentSymptom.overallSeverity).toLowerCase()}
                        </span>
                      )}
                    </div>
                  </ActionLink>
                ) : (
                  <div className="rounded-[18px] bg-slate-50 p-4">
                    <h3 className="text-[16px] font-black text-[#0F5A62]">No recent symptom</h3>
                    <p className="mt-1 text-[10px] leading-4 text-slate-500">Your health journal has no symptom entry to show here.</p>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-[24px] bg-[#F0F7F8] p-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#177E89]">Your health</p>
                <h2 className="mt-1 text-[21px] font-black tracking-[-0.045em] text-[#0F5A62]">New symptom</h2>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">Keep your health journal up to date when something changes.</p>
                <ActionLink href="/log-symptom" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#0F5A62] px-4 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-white hover:bg-[#0B4850]">
                  Log symptom
                  <ArrowRight className="h-3.5 w-3.5 text-[#24C1C4]" aria-hidden="true" />
                </ActionLink>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </ProtectedRoute>
  );}


export default function HealthHome() {
  const { data, loading, error, reload } = useDashboard();
  const [symptomFeed, setSymptomFeed] = useState<any[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!data?.patient?.id) return;

    let active = true;

    healthJournalService.getSymptoms({ limit: 100 })
      .then((symptoms) => {
        if (!active) return;
        setSymptomFeed(Array.isArray(symptoms) ? symptoms : []);
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

  const journalChips = [
    recentSymptom ? "Symptom logged" : null,
    recentSymptom ? "Recent" : null,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#EAF0F7] px-2 py-2 text-[#0B2D54] sm:px-4 sm:py-4">
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1480px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_28px_80px_rgba(11,45,84,0.12)] lg:grid-cols-[76px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 border-r border-slate-200/80 bg-[#F8FAFD] lg:flex lg:flex-col">
            <div className="flex justify-center border-b border-slate-200/80 px-2 py-4">
              <Link
                href="/dashboard"
                aria-label="Sympto home"
                className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0B2D54] text-white shadow-[0_10px_24px_rgba(11,45,84,0.20)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(11,45,84,0.28)]"
              >
                <HeartPulse className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0">
              <nav className="space-y-2" aria-label="Primary health navigation">
                {PRIMARY_NAV.map(({ href, label, icon: Icon }) => (
                  <div key={href} className="group relative flex justify-center">
                    <ActionLink
                      href={href}
                      ariaLabel={label}
                      className={
                        "grid h-11 w-11 place-items-center rounded-2xl transition-all " +
                        (href === "/dashboard"
                          ? "bg-[#0B2D54] text-white shadow-[0_10px_24px_rgba(11,45,84,0.15)]"
                          : "text-slate-400 hover:bg-white hover:text-[#0B2D54] hover:shadow-[0_8px_20px_rgba(11,45,84,0.08)]")
                      }
                    >
                      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                    </ActionLink>
                    <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-xl bg-[#0B2D54] px-3 py-2 text-[10px] font-black text-white opacity-0 shadow-[0_12px_28px_rgba(11,45,84,0.22)] transition-opacity duration-150 group-hover:opacity-100">
                      {label}
                    </span>
                  </div>
                ))}
              </nav>

              <div className="mt-4 flex justify-center border-t border-slate-200/80 pt-4">
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => setMoreOpen((value) => !value)}
                    aria-expanded={moreOpen}
                    aria-label={moreOpen ? "Collapse more navigation" : "More navigation"}
                    className="grid h-11 w-11 place-items-center rounded-2xl text-slate-400 transition-all hover:bg-white hover:text-[#0B2D54] hover:shadow-[0_8px_20px_rgba(11,45,84,0.08)]"
                  >
                    <Menu className="h-4.5 w-4.5" aria-hidden="true" />
                  </button>
                  <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-xl bg-[#0B2D54] px-3 py-2 text-[10px] font-black text-white opacity-0 shadow-[0_12px_28px_rgba(11,45,84,0.22)] transition-opacity duration-150 group-hover:opacity-100">
                    More
                  </span>
                </div>
              </div>

              {moreOpen && (
                <nav className="mt-3 space-y-2" aria-label="More health navigation">
                  {MORE_NAV.map(({ href, label, icon: Icon }) => (
                    <div key={href} className="group relative flex justify-center">
                      <ActionLink
                        href={href}
                        ariaLabel={label}
                        className="grid h-10 w-10 place-items-center rounded-2xl text-slate-400 transition-all hover:bg-white hover:text-[#0B2D54] hover:shadow-[0_8px_20px_rgba(11,45,84,0.08)]"
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </ActionLink>
                      <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-xl bg-[#0B2D54] px-3 py-2 text-[10px] font-black text-white opacity-0 shadow-[0_12px_28px_rgba(11,45,84,0.22)] transition-opacity duration-150 group-hover:opacity-100">
                        {label}
                      </span>
                    </div>
                  ))}
                </nav>
              )}
            </div>
          </aside>

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

              <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(290px,0.8fr)]">
                <section className="group relative min-h-[230px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B2D54] via-[#143D67] to-[#0F6173] p-5 text-white shadow-[0_24px_60px_rgba(11,45,84,0.16)] sm:p-6">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#24C1C4]/20 blur-3xl transition-transform duration-500 group-hover:scale-110" />
                  <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-white/[0.06] blur-3xl" />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-7 top-0 h-px bg-white/20" />

                  <div className="relative flex min-h-[202px] flex-col justify-between">
                    <div className="flex items-start justify-between gap-5">
                      <div className="max-w-[38rem]">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/48">Overview</p>
                        <h2 className="mt-1.5 text-[28px] font-black tracking-[-0.05em] sm:text-[34px]">
                          Good day, {firstName}
                        </h2>
                        <p className="mt-1.5 max-w-[31rem] text-[11px] font-medium leading-5 text-white/66">
                          Your health, organised around what matters today.
                        </p>
                      </div>

                    </div>

                    <div className="flex flex-wrap items-end justify-between gap-5">
                      <div className="flex items-end gap-3">
                        <p className="text-[62px] font-black leading-[0.78] tracking-[-0.08em] sm:text-[70px]">
                          {todayActionCount}
                        </p>
                        <div className="pb-1">
                          <p className="max-w-[13rem] text-[10px] font-black leading-4 text-white/74">
                            active items that need your attention today
                          </p>
                          <ActionLink
                            href="/today"
                            className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-full bg-[#24C1C4] px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#0B2D54] shadow-[0_12px_28px_rgba(36,193,196,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(36,193,196,0.32)]"
                          >
                            Open today
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </ActionLink>
                        </div>
                      </div>


                    </div>
                  </div>
                </section>

                <section className="group relative min-h-[230px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#29CFD0] via-[#20BBC0] to-[#0A9DA7] p-5 text-white shadow-[0_24px_60px_rgba(36,193,196,0.20)] ring-1 ring-inset ring-white/25 sm:p-6">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/45 blur-3xl transition-transform duration-500 group-hover:scale-110" />
                  <div aria-hidden="true" className="pointer-events-none absolute -left-20 -bottom-24 h-56 w-56 rounded-full bg-[#C9FFFF]/35 blur-3xl" />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-7 top-0 h-px bg-white/75" />

                  <div className="relative flex min-h-[202px] flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 ring-1 ring-inset ring-white/45 shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-transform duration-300 group-hover:scale-105">
                        <HeartPulse className="h-5 w-5 text-white drop-shadow-[0_0_9px_rgba(255,255,255,0.80)]" aria-hidden="true" />
                      </span>
                      <span className="rounded-full bg-white/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-white/82 ring-1 ring-inset ring-white/20">
                        Monitor
                      </span>
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.17em] text-white/68">
                        Recent symptom
                      </p>

                      {recentSymptom ? (
                        <>
                          <div className="mt-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="truncate text-[23px] font-black tracking-[-0.045em]">
                                {symptomLabel(recentSymptom)}
                              </h2>
                              <p className="mt-1 text-[11px] font-semibold text-white/76">
                                {formatSymptomDate(recentSymptomAt)}
                                {recentSymptomStatus === "ACTIVE" ? " · Active" : ""}
                              </p>
                            </div>
                            {recentSymptom.overallSeverity && (
                              <span className="shrink-0 rounded-full bg-white/16 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] ring-1 ring-inset ring-white/25">
                                {String(recentSymptom.overallSeverity).toLowerCase()}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
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
                        </>
                      ) : (
                        <>
                          <h2 className="mt-2 text-[27px] font-black tracking-[-0.05em]">Log a symptom</h2>
                          <p className="mt-1 text-[11px] font-semibold text-white/76">Nothing has been logged yet.</p>
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
                    className="group relative min-h-[152px] overflow-hidden rounded-[22px] bg-[#E7F8F8] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(11,45,84,0.10)]"
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#D3F0EF] text-[#0B2D54]">
                          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <ArrowRight className="mt-1 h-4 w-4 text-[#0B2D54]/30 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </div>
                      <div className="mt-auto">
                        <p className="text-[10px] font-medium text-[#0B2D54]/70">Daily care</p>
                        <h2 className="mt-0.5 text-[27px] font-black tracking-[-0.05em] text-[#0B2D54]">Today</h2>
                        <p className="mt-0.5 text-[10px] font-medium text-[#0B2D54]/55">
                          {todayActionCount > 0 ? todayChips.join(" · ") : "Nothing due today"}
                        </p>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-passport"
                    className="group relative min-h-[152px] overflow-hidden rounded-[22px] bg-[#EEF4F8] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(11,45,84,0.10)]"
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#DDE9F1] text-[#0B2D54]">
                          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <ArrowRight className="mt-1 h-4 w-4 text-[#0B2D54]/30 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </div>
                      <div className="mt-auto">
                        <p className="text-[10px] font-medium text-[#0B2D54]/70">Clinic Card</p>
                        <h2 className="mt-0.5 text-[27px] font-black tracking-[-0.05em] text-[#0B2D54]">Essentials</h2>
                        <p className="mt-0.5 text-[10px] font-medium text-[#0B2D54]/55">
                          {clinicChips.length > 0 ? clinicChips.join(" · ") : "Key health information"}
                        </p>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-journal"
                    className="group relative min-h-[152px] overflow-hidden rounded-[22px] bg-[#EAF9F9] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(11,45,84,0.10)]"
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#D6F1F1] text-[#0B2D54]">
                          <FolderOpen className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <ArrowRight className="mt-1 h-4 w-4 text-[#0B2D54]/30 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </div>
                      <div className="mt-auto">
                        <p className="text-[10px] font-medium text-[#0B2D54]/70">Health Journal</p>
                        <h2 className="mt-0.5 text-[27px] font-black tracking-[-0.05em] text-[#0B2D54]">Records</h2>
                        <p className="mt-0.5 text-[10px] font-medium text-[#0B2D54]/55">
                          {recentSymptom ? "Recent symptom recorded" : "Your health history"}
                        </p>
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