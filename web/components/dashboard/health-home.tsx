"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, Bell, CalendarDays, CheckCircle2 , ClipboardList, CreditCard, FileHeart, FileText, FolderOpen, HeartPulse, House,  MessageCircle, Pill, Plus, Settings, ShieldCheck, UserRound, Users, Watch } from "lucide-react";
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
        <main className="min-h-screen bg-[#F4FBFB] p-4 sm:p-8">
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
        <main className="min-h-screen bg-[#F4FBFB] p-4 sm:p-8">
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

  const recentSymptoms = [...(
    symptomFeed.length > 0
      ? symptomFeed
      : Array.isArray(data.symptoms)
        ? data.symptoms
        : []
  )]
    .filter((symptom: any) => symptom?.id && (symptom?.startedAt || symptom?.createdAt))
    .sort(
      (a: any, b: any) =>
        new Date(String(b.startedAt ?? b.createdAt)).getTime() -
        new Date(String(a.startedAt ?? a.createdAt)).getTime(),
    )
    .slice(0, 3);

  const clinicSummary =
    [
      activeConditions.length
        ? `${activeConditions.length} condition${activeConditions.length === 1 ? "" : "s"}`
        : null,
      activeAllergies.length
        ? `${activeAllergies.length} allerg${activeAllergies.length === 1 ? "y" : "ies"}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || "No conditions or allergies recorded";

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#F4FBFB] p-3 text-[#0B2D54] sm:p-4">
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] overflow-hidden rounded-[32px] border border-[#0B2D54]/[0.06] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.02)] lg:grid-cols-[250px_minmax(0,1fr)_320px]">

          <aside className="hidden p-3 lg:block">
            <div className="flex min-h-[calc(100vh-2rem)] flex-col rounded-[28px] bg-gradient-to-b from-[#0B2D54] to-[#24C1C4] p-3 text-white">
              <Link
                href="/dashboard"
                aria-label="Sympto home"
                className="flex items-center gap-3 rounded-[18px] px-3 py-4"
              >
                <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-white/10">
                  <HeartPulse className="h-5 w-5 text-[#24C1C4]" aria-hidden="true" />
                </span>
                <span className="text-[17px] font-black tracking-[-0.04em]">Sympto</span>
              </Link>

              <nav className="mt-5 space-y-1.5" aria-label="Primary health navigation">
                {PRIMARY_NAV.map(({ href, label, icon: Icon }) => (
                  <ActionLink
                    key={href}
                    href={href}
                    ariaLabel={label}
                    className={
                      "flex min-h-12 items-center gap-3 rounded-[16px] px-3.5 text-[11px] font-bold transition-all " +
                      (href === "/dashboard"
                        ? "bg-white text-[#0B2D54] shadow-[0_8px_22px_rgba(11,45,84,0.12)]"
                        : "text-white/78 hover:bg-white/10 hover:text-white")
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </ActionLink>
                ))}
              </nav>

              <div className="my-5 border-t border-white/15" />

              <nav
                className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0"
                aria-label="Utility health navigation"
              >
                {MORE_NAV.map(({ href, label, icon: Icon }) => (
                  <ActionLink
                    key={href}
                    href={href}
                    ariaLabel={label}
                    className="flex min-h-10 items-center gap-3 rounded-[14px] px-3.5 text-[10px] font-semibold text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </ActionLink>
                ))}
              </nav>
            </div>
          </aside>

          <section className="min-w-0 border-x border-[#0B2D54]/[0.06] bg-white">
            <div className="p-5 sm:p-6 lg:p-7">
              <header className="border-b border-slate-100 pb-6">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#24C1C4]">Overview</p>
                <h1 className="mt-1 text-[30px] font-black tracking-[-0.055em] text-[#0B2D54]">Overview</h1>
                <p className="mt-1 max-w-2xl text-[12px] leading-5 text-slate-500">
                  Good day, {firstName}. Your health, organised around what matters today.
                </p>
              </header>

              <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.58fr)_minmax(250px,0.72fr)]">
                <section className="min-h-[340px] rounded-[28px] bg-[#177E89] p-6 text-white shadow-[0_10px_40px_rgba(0,0,0,0.02)] sm:p-7">
                  <div className="flex h-full flex-col">
                    <div className="flex items-start justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/55">Health telemetry</p>
                      <Activity className="h-5 w-5 text-[#24C1C4]" aria-hidden="true" />
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-end gap-4">
                        <p className="text-[88px] font-black leading-[0.75] tracking-[-0.09em]">{todayActionCount}</p>
                        <p className="max-w-[15rem] pb-2 text-[11px] font-bold leading-4 text-white/78">
                          active items that need your attention today
                        </p>
                      </div>

                      <div className="mt-7 grid grid-cols-3 overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.07]">
                        <ActionLink href="/today" className="border-r border-white/10 p-4">
                          <p className="text-[9px] font-bold text-white/52">Today</p>
                          <p className="mt-1 text-[11px] font-black">
                            {[
                              medications.length ? `${medications.length} med${medications.length === 1 ? "" : "s"}` : null,
                              activeGoalCount ? `${activeGoalCount} goal${activeGoalCount === 1 ? "" : "s"}` : null,
                            ].filter(Boolean).join(" · ") || "No active items"}
                          </p>
                        </ActionLink>
                        <ActionLink href="/health-passport" className="border-r border-white/10 p-4">
                          <p className="text-[9px] font-bold text-white/52">Clinic Card</p>
                          <p className="mt-1 text-[11px] font-black">Essentials</p>
                        </ActionLink>
                        <ActionLink href="/health-journal" className="p-4">
                          <p className="text-[9px] font-bold text-white/52">Health Journal</p>
                          <p className="mt-1 text-[11px] font-black">Records</p>
                        </ActionLink>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid gap-4">
                  <ActionLink
                    href="/today"
                    className="group min-h-[154px] rounded-[26px] bg-[#24C1C4] p-6 text-[#0B2D54] shadow-[0_10px_40px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20">
                          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <ArrowRight className="h-4 w-4 opacity-40 group-hover:translate-x-1" aria-hidden="true" />
                      </div>
                      <h2 className="text-[25px] font-black tracking-[-0.05em]">Open today</h2>
                    </div>
                  </ActionLink>

                  <div className="min-h-[154px] rounded-[26px] border border-[#0B2D54]/[0.08] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#0B2D54]/45">Monitor</p>
                    <div className="mt-auto pt-14">
                      <h2 className="text-[25px] font-black tracking-[-0.05em] text-[#0B2D54]">Monitor</h2>
                    </div>
                  </div>
                </div>
              </div>

              <section className="mt-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <ActionLink
                    href="/today"
                    className="group min-h-[176px] rounded-[24px] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] ring-1 ring-inset ring-[#0B2D54]/[0.06]"
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#24C1C4]/10 text-[#0B2D54]">
                          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 group-hover:text-[#24C1C4]" aria-hidden="true" />
                      </div>
                      <div className="mt-auto">
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Daily care</p>
                        <h3 className="mt-1 text-[27px] font-black tracking-[-0.06em] text-[#0B2D54]">Today</h3>
                        <p className="mt-1 text-[10px] text-slate-500">Today</p>
                        <div className="mt-5 h-1 rounded-full bg-[#24C1C4]/15">
                          <div className="h-1 w-full rounded-full bg-[#24C1C4]" />
                        </div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-passport"
                    className="group min-h-[176px] rounded-[24px] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] ring-1 ring-inset ring-[#0B2D54]/[0.06]"
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#0B2D54]/[0.05] text-[#0B2D54]">
                          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 group-hover:text-[#0B2D54]" aria-hidden="true" />
                      </div>
                      <div className="mt-auto">
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Clinic Card</p>
                        <h3 className="mt-1 text-[27px] font-black tracking-[-0.06em] text-[#0B2D54]">{clinicSummary}</h3>
                        <div className="mt-5 h-1 rounded-full bg-[#0B2D54]/10">
                          <div className="h-1 w-3/4 rounded-full bg-[#0B2D54]/45" />
                        </div>
                      </div>
                    </div>
                  </ActionLink>

                  <ActionLink
                    href="/health-journal"
                    className="group min-h-[176px] rounded-[24px] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] ring-1 ring-inset ring-[#0B2D54]/[0.06]"
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#24C1C4]/10 text-[#0B2D54]">
                          <FolderOpen className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 group-hover:text-[#24C1C4]" aria-hidden="true" />
                      </div>
                      <div className="mt-auto">
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Health Journal</p>
                        <h3 className="mt-1 text-[27px] font-black tracking-[-0.06em] text-[#0B2D54]">Recent symptom recorded</h3>
                        <div className="mt-5 h-1 rounded-full bg-[#24C1C4]/15">
                          <div className="h-1 w-1/2 rounded-full bg-[#24C1C4]" />
                        </div>
                      </div>
                    </div>
                  </ActionLink>
                </div>
              </section>
            </div>
          </section>

          <aside className="hidden border-l border-[#0B2D54]/[0.06] bg-[#F4FBFB] p-5 lg:block">
            <div className="sticky top-5">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-[21px] font-black tracking-[-0.045em] text-[#0B2D54]">More</h2>
                <ActionLink href="/smart-file" className="text-[9px] font-black uppercase tracking-[0.08em] text-[#0B2D54] hover:text-[#24C1C4]">
                  Share Smart File
                </ActionLink>
              </div>

              <div className="mt-4 space-y-2.5">
                {[0, 1, 2].map((index) => {
                  const symptom = recentSymptoms[index];
                  if (!symptom) {
                    return (
                      <div key={index} className="rounded-[20px] border border-[#0B2D54]/[0.06] bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
                        <p className="text-[8px] font-black uppercase tracking-[0.13em] text-[#24C1C4]">Recent symptom</p>
                        <p className="mt-2 text-[12px] font-semibold text-slate-400">No symptom recorded</p>
                      </div>
                    );
                  }

                  const status = String(symptom?.status ?? "").toUpperCase();
                  const when = symptom?.startedAt ?? symptom?.createdAt ?? null;
                  const severity = symptom?.overallSeverity ? String(symptom.overallSeverity).toLowerCase() : null;

                  return (
                    <ActionLink
                      key={String(symptom.id)}
                      href={
                        status === "ACTIVE"
                          ? "/symptom-logs/" + encodeURIComponent(String(symptom.id)) + "/monitor"
                          : "/symptom-logs/" + encodeURIComponent(String(symptom.id))
                      }
                      className="block rounded-[20px] border border-[#0B2D54]/[0.06] bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,0.02)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[8px] font-black uppercase tracking-[0.13em] text-[#24C1C4]">Recent symptom</p>
                          <h3 className="mt-1 truncate text-[16px] font-black tracking-[-0.035em] text-[#0B2D54]">
                            {symptomLabel(symptom)}
                          </h3>
                          <p className="mt-1 text-[10px] text-slate-500">
                            {formatSymptomDate(when)}{status === "ACTIVE" ? " · Active" : ""}
                          </p>
                        </div>
                        {severity && (
                          <span className="rounded-full bg-[#24C1C4]/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.07em] text-[#0B2D54]">
                            {severity}
                          </span>
                        )}
                      </div>
                    </ActionLink>
                  );
                })}
              </div>

              <div className="mt-4 rounded-[24px] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] ring-1 ring-inset ring-[#24C1C4]/15">
                <h2 className="text-[21px] font-black tracking-[-0.045em] text-[#0B2D54]">New symptom</h2>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#24C1C4]">Your health</p>
                <p className="mt-3 text-[10px] leading-4 text-slate-500">Add a new symptom when something changes.</p>
                <ActionLink href="/log-symptom" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#0B2D54] px-4 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-white">
                  Log symptom <Plus className="h-3.5 w-3.5 text-[#24C1C4]" aria-hidden="true" />
                </ActionLink>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </ProtectedRoute>
  );
  }