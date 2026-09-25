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
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);

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
      <main className="min-h-screen bg-[#EAF0F7] px-2 py-2 text-[#0B2D54] sm:px-4 sm:py-4">
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1560px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_28px_80px_rgba(11,45,84,0.12)] lg:grid-cols-[214px_minmax(0,1fr)_250px]">
          <aside className="hidden min-h-0 border-r border-slate-200/80 bg-[#F8FAFD] lg:flex lg:flex-col">
            <div className="border-b border-slate-200/80 px-5 py-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0B2D54] text-[#8FF7F2] shadow-[0_10px_24px_rgba(11,45,84,0.16)]">
                  <HeartPulse className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Sympto</p>
                  <p className="text-sm font-black text-[#0B2D54]">My health</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0">
              <p className="px-2 pb-2 text-[9px] font-black uppercase tracking-[0.17em] text-slate-400">Navigate</p>
              <nav className="space-y-1.5" aria-label="Primary health navigation">
                {PRIMARY_NAV.map(({ href, label, icon: Icon }) => (
                  <ActionLink
                    key={href}
                    href={href}
                    ariaLabel={label}
                    className={
                      "group flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-xs font-black transition-all " +
                      (href === "/dashboard"
                        ? "bg-[#0B2D54] text-white shadow-[0_10px_24px_rgba(11,45,84,0.15)]"
                        : "text-slate-500 hover:bg-white hover:text-[#0B2D54] hover:shadow-[0_8px_20px_rgba(11,45,84,0.07)]")
                    }
                  >
                    <span className={"grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors " + (href === "/dashboard" ? "bg-white/10" : "bg-white group-hover:bg-[#E8F8F7]")}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span>{label}</span>
                  </ActionLink>
                ))}
              </nav>

              <div className="mt-5 border-t border-slate-200/80 pt-4">
                <button
                  type="button"
                  onClick={() => setMoreOpen((value) => !value)}
                  aria-expanded={moreOpen}
                  className="flex min-h-11 w-full items-center justify-between rounded-2xl px-3 py-2.5 text-xs font-black text-slate-500 transition-all hover:bg-white hover:text-[#0B2D54] hover:shadow-[0_8px_20px_rgba(11,45,84,0.06)]"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-white">
                      <Menu className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span>More</span>
                  </span>
                  <ChevronDown className={"h-4 w-4 transition-transform " + (moreOpen ? "rotate-180" : "")} aria-hidden="true" />
                </button>

                {moreOpen && (
                  <nav className="mt-1 space-y-1 pb-2" aria-label="More health navigation">
                    {MORE_NAV.map(({ href, label, icon: Icon }) => (
                      <ActionLink
                        key={href}
                        href={href}
                        ariaLabel={label}
                        className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-white hover:text-[#0B2D54]"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white">
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span>{label}</span>
                      </ActionLink>
                    ))}
                  </nav>
                )}
              </div>
            </div>

          </aside>

          <section className="min-w-0 bg-white">
            <div className="px-4 pb-6 pt-5 sm:px-6 lg:px-7 lg:pb-7">
              <header className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Primary</p>
                  <h1 className="mt-0.5 text-[25px] font-black tracking-[-0.05em] text-[#0B2D54] sm:text-[30px]">Dashboard</h1>
                </div>
                <div className="flex items-center gap-2">
                  <ActionLink
                    href="/profile"
                    ariaLabel="Open profile"
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-[#0B2D54] shadow-[0_8px_20px_rgba(11,45,84,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(11,45,84,0.10)]"
                  >
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                  </ActionLink>
                  <ActionLink
                    href="/smart-file"
                    className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[#0B2D54] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_24px_rgba(11,45,84,0.12)] transition-all hover:-translate-y-0.5 hover:bg-[#092544]"
                  >
                    <FileHeart className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Share Smart File</span>
                    <span className="sm:hidden">Share</span>
                  </ActionLink>
                </div>
              </header>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(270px,0.8fr)]">
                <section className="group relative min-h-[318px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B2D54] via-[#143D67] to-[#0F6173] p-5 text-white shadow-[0_22px_58px_rgba(11,45,84,0.15)] sm:p-6">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#24C1C4]/18 blur-3xl transition-transform duration-500 group-hover:scale-110" />
                  <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-white/[0.06] blur-3xl" />
                  <div className="relative flex min-h-[278px] flex-col justify-between">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/52">Overview</p>
                        <h2 className="mt-1 text-[29px] font-black tracking-[-0.05em] sm:text-[35px]">Good day, {firstName}</h2>
                        <p className="mt-2 max-w-[30rem] text-[12px] font-medium leading-5 text-white/65">Your health, organised around what matters today.</p>
                      </div>
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15 shadow-[0_0_30px_rgba(36,193,196,0.16)]">
                        <HeartPulse className="h-5 w-5 text-[#8FF7F2]" aria-hidden="true" />
                      </span>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-end">
                      <div>
                        <div className="flex items-end gap-3">
                          <p className="text-[74px] font-black leading-[0.76] tracking-[-0.09em] sm:text-[84px]">{todayActionCount}</p>
                          <div className="pb-1">
                            <p className="max-w-[13rem] text-[11px] font-black leading-4 text-white/72">active items that need your attention today</p>
                            <ActionLink
                              href="/today"
                              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#24C1C4] px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#0B2D54] shadow-[0_12px_26px_rgba(36,193,196,0.22)] transition-all hover:-translate-y-0.5"
                            >
                              Open today
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </ActionLink>
                          </div>
                        </div>
                        <div className="mt-6 overflow-hidden rounded-full bg-white/10 p-1 ring-1 ring-inset ring-white/10">
                          <div className="flex h-2 overflow-hidden rounded-full">
                            <span className="bg-[#24C1C4]" style={{ width: todayActionCount ? (medications.length / todayActionCount) * 100 + "%" : "0%" }} />
                            <span className="bg-white/75" style={{ width: todayActionCount ? (activeGoalCount / todayActionCount) * 100 + "%" : "0%" }} />
                            <span className="bg-[#7DEBED]" style={{ width: todayActionCount ? (appointments.length / todayActionCount) * 100 + "%" : "0%" }} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-2xl bg-white/[0.07] px-3 py-3 ring-1 ring-inset ring-white/10">
                          <p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/42">Meds</p>
                          <p className="mt-1 text-xl font-black tracking-[-0.04em]">{medications.length}</p>
                        </div>
                        <div className="rounded-2xl bg-white/[0.07] px-3 py-3 ring-1 ring-inset ring-white/10">
                          <p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/42">Goals</p>
                          <p className="mt-1 text-xl font-black tracking-[-0.04em]">{activeGoalCount}</p>
                        </div>
                        <div className="rounded-2xl bg-white/[0.07] px-3 py-3 ring-1 ring-inset ring-white/10">
                          <p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/42">Appts</p>
                          <p className="mt-1 text-xl font-black tracking-[-0.04em]">{appointments.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <section className="group relative min-h-[150px] overflow-hidden rounded-[26px] bg-gradient-to-br from-[#24C1C4] to-[#0A9DA7] p-5 text-white shadow-[0_18px_42px_rgba(36,193,196,0.22)] ring-1 ring-inset ring-white/25">
                    <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/30 blur-3xl transition-transform duration-500 group-hover:scale-125" />
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/18 ring-1 ring-inset ring-white/40 shadow-[0_0_24px_rgba(255,255,255,0.18)]">
                        <HeartPulse className="h-5 w-5 text-white" aria-hidden="true" />
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/75">Monitor</span>
                    </div>
                    <div className="relative mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/65">Recent symptom</p>
                      <div className="mt-1.5 flex items-center justify-between gap-3">
                        <h2 className="truncate text-[22px] font-black tracking-[-0.04em]">{recentSymptom ? symptomLabel(recentSymptom) : "Nothing logged"}</h2>
                        {recentSymptom?.overallSeverity && <span className="shrink-0 rounded-full bg-white/16 px-2 py-1 text-[8px] font-black uppercase ring-1 ring-inset ring-white/25">{String(recentSymptom.overallSeverity).toLowerCase()}</span>}
                      </div>
                      {recentSymptom && <p className="mt-1 text-[10px] font-semibold text-white/72">{formatSymptomDate(recentSymptomAt)}{recentSymptomStatus === "ACTIVE" ? " · Active" : ""}</p>}
                    </div>
                  </section>

                  <ActionLink
                    href="/health-passport"
                    className="group relative min-h-[150px] overflow-hidden rounded-[26px] bg-gradient-to-br from-[#C62828] to-[#A91E2A] p-5 text-white shadow-[0_18px_42px_rgba(198,40,40,0.18)] transition-all hover:-translate-y-0.5"
                  >
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/16 ring-1 ring-inset ring-white/35 shadow-[0_0_24px_rgba(255,255,255,0.16)]">
                        <ShieldCheck className="h-5 w-5 text-white" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-white/75 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                    <div className="relative mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/68">Clinic Card</p>
                      <h2 className="mt-1 text-[22px] font-black tracking-[-0.04em]">Essentials</h2>
                      <p className="mt-1 text-[10px] font-semibold text-white/72">{activeConditions.length} condition{activeConditions.length === 1 ? "" : "s"} · {activeAllergies.length} allerg{activeAllergies.length === 1 ? "y" : "ies"}</p>
                    </div>
                  </ActionLink>
                </div>
              </div>

              <section className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Your health</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Keep your most-used destinations close.</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <ActionLink href="/today" className="group min-h-[154px] rounded-[25px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(11,45,84,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(11,45,84,0.11)]">
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E8F8F7] text-[#24C1C4] ring-1 ring-inset ring-[#24C1C4]/18 shadow-[0_0_20px_rgba(36,193,196,0.10)] transition-all group-hover:bg-[#D9FFFE] group-hover:shadow-[0_0_28px_rgba(36,193,196,0.32)]">
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-[#24C1C4]" aria-hidden="true" />
                    </div>
                    <div className="mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Daily care</p>
                      <div className="mt-1 flex items-end justify-between gap-2">
                        <h2 className="text-[23px] font-black tracking-[-0.05em] text-[#0B2D54]">Today</h2>
                        <div className="flex flex-wrap justify-end gap-1">{todayChips.map((chip) => <RecordedChip key={chip} className="bg-[#E8F8F7] text-[#0B2D54] ring-[#24C1C4]/15">{chip}</RecordedChip>)}</div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink href="/health-passport" className="group min-h-[154px] rounded-[25px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(11,45,84,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(11,45,84,0.11)]">
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF0F0] text-[#C62828] ring-1 ring-inset ring-[#C62828]/18 shadow-[0_0_20px_rgba(198,40,40,0.10)] transition-all group-hover:bg-[#FFE4E4] group-hover:shadow-[0_0_28px_rgba(198,40,40,0.30)]">
                        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-[#C62828]" aria-hidden="true" />
                    </div>
                    <div className="mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Clinic Card</p>
                      <div className="mt-1 flex items-end justify-between gap-2">
                        <h2 className="text-[23px] font-black tracking-[-0.05em] text-[#0B2D54]">Essentials</h2>
                        <div className="flex flex-wrap justify-end gap-1">{clinicChips.map((chip) => <RecordedChip key={chip} className="bg-[#FFF0F0] text-[#8D1A24] ring-[#C62828]/15">{chip}</RecordedChip>)}</div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink href="/health-journal" className="group min-h-[154px] rounded-[25px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(11,45,84,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(11,45,84,0.11)]">
                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EEF5FF] text-[#155AC1] ring-1 ring-inset ring-[#155AC1]/18 shadow-[0_0_20px_rgba(21,90,193,0.10)] transition-all group-hover:bg-[#E5F0FF] group-hover:shadow-[0_0_28px_rgba(21,90,193,0.30)]">
                        <FolderOpen className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-[#155AC1]" aria-hidden="true" />
                    </div>
                    <div className="mt-7">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Health Journal</p>
                      <div className="mt-1 flex items-end justify-between gap-2">
                        <h2 className="text-[23px] font-black tracking-[-0.05em] text-[#0B2D54]">Records</h2>
                        <div className="flex flex-wrap justify-end gap-1">{journalChips.map((chip) => <RecordedChip key={chip} className="bg-[#EEF5FF] text-[#0E4B9F] ring-[#155AC1]/15">{chip}</RecordedChip>)}</div>
                      </div>
                    </div>
                  </ActionLink>
                </div>
              </section>
            </div>
          </section>

          <aside className="hidden min-h-0 border-l border-slate-200/80 bg-[#FBFCFE] xl:flex xl:flex-col">
            <div className="border-b border-slate-200/80 px-5 py-5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Care at a glance</p>
              <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-[#0B2D54]">Your health</h2>
            </div>

            <div className="space-y-3 overflow-y-auto p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0">
              <ActionLink href="/medications" className="group block rounded-[22px] bg-white p-4 shadow-[0_10px_26px_rgba(11,45,84,0.05)] ring-1 ring-inset ring-slate-200/70 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(11,45,84,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E8F8F7] text-[#24C1C4]"><Pill className="h-4 w-4" aria-hidden="true" /></span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </div>
                <p className="mt-4 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Medication</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.05em] text-[#0B2D54]">{medications.length}</p>
                <p className="text-[10px] font-semibold text-slate-500">active today</p>
              </ActionLink>

              <ActionLink href="/health-goals" className="group block rounded-[22px] bg-white p-4 shadow-[0_10px_26px_rgba(11,45,84,0.05)] ring-1 ring-inset ring-slate-200/70 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(11,45,84,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EEF5FF] text-[#155AC1]"><HeartPulse className="h-4 w-4" aria-hidden="true" /></span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </div>
                <p className="mt-4 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Health goals</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.05em] text-[#0B2D54]">{activeGoalCount}</p>
                <p className="text-[10px] font-semibold text-slate-500">active goals</p>
              </ActionLink>

              <div className="rounded-[22px] bg-white p-4 shadow-[0_10px_26px_rgba(11,45,84,0.05)] ring-1 ring-inset ring-slate-200/70">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF0F0] text-[#C62828]"><ShieldCheck className="h-4 w-4" aria-hidden="true" /></span>
                  <div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Essentials</p><p className="text-xs font-black text-[#0B2D54]">Clinic Card</p></div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 px-2 py-2"><p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">Conditions</p><p className="mt-1 text-base font-black text-[#0B2D54]">{activeConditions.length}</p></div>
                  <div className="rounded-xl bg-slate-50 px-2 py-2"><p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">Allergies</p><p className="mt-1 text-base font-black text-[#0B2D54]">{activeAllergies.length}</p></div>
                  <div className="rounded-xl bg-slate-50 px-2 py-2"><p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">Records</p><p className="mt-1 text-base font-black text-[#0B2D54]">{journalEntries.length}</p></div>
                </div>
              </div>

              <ActionLink
                href={recentSymptom ? "/symptom-logs/" + encodeURIComponent(String(recentSymptom.id)) + (recentSymptomStatus === "ACTIVE" ? "/monitor" : "") : "/log-symptom"}
                className="group block rounded-[22px] bg-[#F0FAFA] p-4 ring-1 ring-inset ring-[#24C1C4]/15 transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(36,193,196,0.10)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#159A9E]">Latest health signal</p>
                  <ArrowRight className="h-3.5 w-3.5 text-[#24C1C4] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </div>
                <p className="mt-3 truncate text-[18px] font-black tracking-[-0.04em] text-[#0B2D54]">{recentSymptom ? symptomLabel(recentSymptom) : "Log your first symptom"}</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">{recentSymptom ? formatSymptomDate(recentSymptomAt) + (recentSymptomStatus === "ACTIVE" ? " · Active" : "") : "Start your health story"}</p>
              </ActionLink>
            </div>
          </aside>
        </div>
      </main>
    </ProtectedRoute>
  );
  }
