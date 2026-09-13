"use client";

import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Apple,
  Bell,
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Cigarette,
  Droplets,
  Footprints,
  HeartPulse,
  Moon,
  Pill,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Wine,
} from "lucide-react";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import DailyHealthCheckIn from "@/components/dashboard/daily-health-check-in";
import TodayMedicationActions from "@/components/today/today-medication-actions";
import { healthGoalsService } from "@/services/health-goals.service";

function text(value: unknown, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function formatDate(value: unknown, includeTime = false) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(
    "en-ZA",
    includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" },
  ).format(date);
}

function localDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function numberText(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const GOAL_META: Record<string, { label: string; icon: typeof Target; accent: string; surface: string }> = {
  WEIGHT: { label: "Weight", icon: Scale, accent: "text-violet-700", surface: "bg-violet-50" },
  EXERCISE: { label: "Exercise", icon: Footprints, accent: "text-emerald-700", surface: "bg-emerald-50" },
  NUTRITION: { label: "Nutrition", icon: Apple, accent: "text-orange-700", surface: "bg-orange-50" },
  BLOOD_PRESSURE: { label: "Blood pressure", icon: HeartPulse, accent: "text-rose-700", surface: "bg-rose-50" },
  BLOOD_GLUCOSE: { label: "Blood glucose", icon: Activity, accent: "text-amber-700", surface: "bg-amber-50" },
  CHOLESTEROL: { label: "Cholesterol", icon: ShieldCheck, accent: "text-blue-700", surface: "bg-blue-50" },
  SLEEP: { label: "Sleep", icon: Moon, accent: "text-indigo-700", surface: "bg-indigo-50" },
  MENTAL_HEALTH: { label: "Mental health", icon: Brain, accent: "text-fuchsia-700", surface: "bg-fuchsia-50" },
  HYDRATION: { label: "Hydration", icon: Droplets, accent: "text-cyan-700", surface: "bg-cyan-50" },
  ALCOHOL: { label: "Alcohol", icon: Wine, accent: "text-purple-700", surface: "bg-purple-50" },
  HEART_RATE: { label: "Heart rate", icon: HeartPulse, accent: "text-red-700", surface: "bg-red-50" },
  OTHER: { label: "Personal goal", icon: Target, accent: "text-[#0b2d54]", surface: "bg-[#edf4ff]" },
};

export default function TodayPage() {
  const { data, loading, error, reload } = useDashboard();
  const [smokingToday, setSmokingToday] = useState<Record<string, number | null>>({});
  const [smokingDraft, setSmokingDraft] = useState<Record<string, string>>({});
  const [editingSmoking, setEditingSmoking] = useState<string | null>(null);
  const [savingSmoking, setSavingSmoking] = useState<string | null>(null);

  const goals = (data?.goals ?? []).filter((goal: any) => String(goal?.status).toUpperCase() === "ACTIVE");
  const smokingGoal = goals.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "SMOKING");
  const medicationGoal = goals.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "MEDICATION");
  const otherGoals = goals.filter((goal: any) => !["SMOKING", "MEDICATION"].includes(String(goal?.category ?? "").toUpperCase()));

  useEffect(() => {
    if (!smokingGoal?.id) return;
    let cancelled = false;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const dayKey = localDayKey();

    void healthGoalsService
      .getMetricEvents("SMOKING", "smoking.cigarettes", start, end, "patient-smoking-log")
      .then((response) => {
        if (cancelled) return;
        const event = response.events.find((item) => item.sourceId === `${String(smokingGoal.id)}:${dayKey}`);
        const value = event ? Number(event.loggedValue) : null;
        setSmokingToday({ [String(smokingGoal.id)]: value });
        setSmokingDraft({ [String(smokingGoal.id)]: value == null ? "" : String(value) });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [smokingGoal?.id]);

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5fafb] p-4 sm:p-8">
          <div className="mx-auto max-w-[1260px] space-y-5" aria-busy="true">
            <div className="h-12 animate-pulse rounded-[24px] bg-white" />
            <div className="h-64 animate-pulse rounded-[30px] bg-white" />
            <div className="h-96 animate-pulse rounded-[27px] bg-white" />
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error || !data) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5fafb] p-4 sm:p-8">
          <div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-white p-7">
            <h1 className="text-xl font-black text-[#0b2d54]">We couldn&apos;t load today</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Your saved health information has not been changed. Please try again.</p>
            <button type="button" onClick={reload} className="mt-5 min-h-11 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-semibold text-white">Try again</button>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  const firstName = data.patient?.firstName || data.profile?.preferredName || "there";
  const medications = data.today?.activeMedications ?? [];
  const appointments = data.today?.upcomingAppointments ?? [];
  const attention = data.attention ?? [];
  const carePlans = data.carePlans ?? [];
  const notifications = data.today?.notifications ?? data.notifications ?? [];

  const careTasks = carePlans.flatMap((plan: any) =>
    (Array.isArray(plan.tasks) ? plan.tasks : [])
      .filter((task: any) => !["COMPLETED", "CANCELLED"].includes(String(task.status ?? "").toUpperCase()))
      .map((task: any) => ({ ...task, carePlanTitle: plan.title })),
  );

  const todayAppointments = appointments.filter(
    (appointment: any) => appointment?.scheduledStart && new Date(String(appointment.scheduledStart)).toDateString() === new Date().toDateString(),
  );

  const actionItems = [
    ...attention.slice(0, 3).map((item: any) => ({ href: String(item.actionUrl || "/health-journal"), label: "Needs review", title: text(item.title, "Attention needed"), detail: text(item.description), icon: CheckCircle2 })),
    ...todayAppointments.slice(0, 2).map((appointment: any) => ({ href: "/appointments", label: "Appointment", title: text(appointment.reason || appointment.appointmentType, "Clinic visit").replaceAll("_", " "), detail: formatDate(appointment.scheduledStart, true), icon: CalendarDays })),
    ...careTasks.slice(0, 2).map((task: any) => ({ href: "/care-plans", label: "Care plan", title: text(task.title, "Care task"), detail: task.dueDate ? `Due ${formatDate(task.dueDate)}` : text(task.carePlanTitle, "Care plan"), icon: ClipboardCheck })),
    ...notifications
      .filter((item: any) => item.actionUrl || ["HIGH", "URGENT"].includes(String(item.priority ?? "").toUpperCase()))
      .slice(0, 2)
      .map((item: any) => ({ href: String(item.actionUrl || "/today"), label: "Reminder", title: text(item.title, "Reminder"), detail: text(item.body), icon: Bell })),
  ];

  const todaySmoking = smokingGoal ? smokingToday[String(smokingGoal.id)] ?? null : null;
  const smokingTarget = smokingGoal
    ? Number(smokingGoal?.metricConfig?.frequencyTarget ?? smokingGoal?.frequencyTarget ?? smokingGoal?.targetValue ?? 0)
    : 0;
  const smokingExceeded = todaySmoking !== null && smokingTarget > 0 && todaySmoking > smokingTarget;
  const smokingDifference = todaySmoking !== null ? todaySmoking - smokingTarget : 0;
  const smokingTargetPosition = todaySmoking !== null && todaySmoking > 0 && smokingTarget > 0
    ? Math.min(94, Math.max(8, (smokingTarget / todaySmoking) * 86 + 4))
    : 50;

  async function saveSmokingToday() {
    if (!smokingGoal) return;
    const goalId = String(smokingGoal.id);
    const raw = smokingDraft[goalId]?.trim() ?? "";
    const cigarettes = Number(raw);
    if (!raw || !Number.isFinite(cigarettes) || cigarettes < 0) return;
    try {
      setSavingSmoking(goalId);
      await healthGoalsService.logSmoking(goalId, cigarettes, localDayKey());
      setSmokingToday({ [goalId]: cigarettes });
      setEditingSmoking(null);
      await reload();
    } finally {
      setSavingSmoking(null);
    }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5fafb] text-[#17314e]">
        <div className="mx-auto max-w-[1260px] px-4 pb-12 pt-4 sm:px-7 sm:pt-6">
          <header className="mb-5 flex items-center justify-between">
            <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#0b2d54] hover:bg-white"><ArrowLeft className="h-4 w-4" />My Health</Link>
            <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#71839a] shadow-sm ring-1 ring-[#e0ebef]">Today</span>
          </header>

          <section className="rounded-[30px] bg-gradient-to-br from-[#08284a] via-[#0e4773] to-[#24babe] p-7 text-white shadow-[0_20px_55px_rgba(11,45,84,0.12)] sm:p-9">
            <p className="text-sm font-medium text-white/75">Hi {firstName}</p>
            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">What do I do today?</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Your important health actions, brought together in one place.</p>
              </div>
              <Link href="/log-symptom" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/12 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/20"><Sparkles className="h-4 w-4" />Log a symptom</Link>
            </div>
          </section>

          <div className="mt-7 flex items-end justify-between gap-5"><h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Today, organised</h2><p className="hidden text-right text-[11px] text-[#74859a] sm:block">Only the things worth acting on.</p></div>

          <section className="mt-3.5 overflow-hidden rounded-[26px] border border-[#dfebef] bg-white shadow-[0_6px_20px_rgba(11,45,84,.035)]">
            {medications[0] ? (
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b6f73]"><Pill className="h-5 w-5" /></span>
                  <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b6f73]">Medication today</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{text(medications[0]?.medication?.name, "Your medicine")}</p><p className="mt-1 text-[11px] text-[#74859a]">{text(medications[0]?.dosage, "Dose not recorded")} · {String(medications[0]?.frequency || "Schedule not recorded").replaceAll("_", " ")}</p></div>
                </div>
                <a href="#today-goals" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[10px] font-black text-white">Go to today&apos;s goals <ArrowRight className="h-3.5 w-3.5" /></a>
              </div>
            ) : <div className="p-5 text-sm text-[#74859a]">No medication is scheduled for today.</div>}
            {actionItems.length > 0 && (
              <div className="divide-y divide-[#edf2f5] border-t border-[#edf2f5]">
                {actionItems.map((item, index) => { const Icon = item.icon; return <Link key={`${item.label}-${index}`} href={item.href} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#f8fbfc] sm:px-6"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f1f6f8] text-[#0b2d54]"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[9px] font-black uppercase tracking-[0.14em] text-[#8a99a8]">{item.label}</span><span className="mt-0.5 block truncate text-xs font-bold text-[#0b2d54]">{item.title}</span><span className="mt-0.5 block truncate text-[10px] text-[#74859a]">{item.detail}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-[#93a1ad]" /></Link>; })}
              </div>
            )}
          </section>

          <div id="daily-health-check-in" className="mt-7 flex items-end justify-between gap-5"><h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Daily health check-in</h2><p className="hidden text-right text-[11px] text-[#74859a] sm:block">A few answers help Sympto understand your day.</p></div>
          <div className="mt-3.5"><DailyHealthCheckIn embedded goals={goals} /></div>

          <div id="today-goals" className="mt-7 flex items-end justify-between gap-5"><h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Your active goals</h2><Link href="/health-goals" className="text-[10px] font-black text-[#0b2d54]">Manage goals <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>

          {(medicationGoal || smokingGoal) && (
            <section className="mt-3.5 grid items-stretch gap-4 lg:grid-cols-2">
              {medicationGoal ? <TodayMedicationActions medications={medications} goal={medicationGoal} onUpdated={reload} /> : <div />}
              {smokingGoal ? (
                <article className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#dfe9ed] bg-white shadow-[0_5px_18px_rgba(11,45,84,.035)]">
                  <div className="flex-1 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Cigarette className="h-4 w-4" /></span>
                        <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7d8c98]">Smoking</p><h3 className="mt-1 truncate text-[17px] font-black tracking-[-.025em] text-[#0b2d54]">{text(smokingGoal.title, "Smoking")}</h3></div>
                      </div>
                      {smokingExceeded && <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-black text-red-700">Above target</span>}
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-4">
                      <div><p className="text-4xl font-black tracking-[-.06em] text-[#0b2d54]">{todaySmoking === null ? "—" : todaySmoking}</p><p className="mt-1 text-[10px] font-semibold text-[#74859a]">cigarettes today</p></div>
                      {todaySmoking !== null && <div className="text-right"><p className={`text-sm font-black ${smokingExceeded ? "text-[#842832]" : "text-[#0b6f73]"}`}>{smokingExceeded ? `${smokingDifference} above` : "On target"}</p><p className="mt-1 text-[10px] text-[#74859a]">Target {numberText(smokingTarget)}</p></div>}
                    </div>

                    <div className="mt-5">
                      <div className="relative h-[62px] overflow-visible rounded-2xl border border-[#dfebef] bg-gradient-to-b from-[#f8fbfc] to-[#edf4f6] px-3">
                        <div className="absolute inset-x-3 top-1/2 flex h-6 -translate-y-1/2 items-stretch drop-shadow-[0_4px_6px_rgba(11,45,84,.12)]">
                          <div className="relative w-[17%] min-w-[42px] rounded-l-md bg-gradient-to-r from-[#bd7e48] via-[#efd0a0] to-[#b77546]" />
                          <div className="relative flex-1 rounded-r-md border border-l-0 border-[#cedddd] bg-gradient-to-b from-white via-[#f0f4f2] to-[#d8e3e2]"><span className="absolute right-[18px] top-[-1px] bottom-[-1px] w-[5px] bg-gradient-to-r from-[#b95d36] via-[#f19b55] to-[#793e31] shadow-[0_0_8px_rgba(238,117,45,.5)]" /></div>
                          <div className="relative h-6 w-[22px] rounded-r-lg bg-[radial-gradient(circle_at_25%_50%,#fff7a7_0_8%,#ffcb55_18%,#ef6b2d_48%,#8f3e32_80%)] shadow-[0_0_5px_#ffb02e,0_0_12px_rgba(255,94,35,.85)] animate-pulse"><span className="absolute right-1 top-[-10px] h-3 w-2 rotate-[25deg] rounded-full bg-gradient-to-b from-[#fff09c] to-[#ff8a32]" /><span className="absolute right-1 top-[-18px] h-5 w-2 border-l-2 border-slate-400/40 rounded-full opacity-60" /></div>
                        </div>
                        <span className="absolute bottom-1 left-[var(--smoking-target)] top-1.5 w-0.5 rounded-full bg-[#0b2d54]" style={{ "--smoking-target": `${smokingTargetPosition}%` } as React.CSSProperties} />
                        <span className={`absolute bottom-1 h-2 w-2 rounded-full ${smokingExceeded ? "bg-[#de6c5f] shadow-[0_0_0_4px_rgba(222,108,95,.12),0_0_12px_rgba(222,108,95,.48)]" : "bg-[#24c1c4] shadow-[0_0_0_4px_rgba(36,193,196,.14),0_0_12px_rgba(36,193,196,.45)]"}`} style={{ left: "95%" }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[9px] font-semibold text-[#8795a0]"><span>0</span><span className="font-black text-[#0b2d54]">Target {numberText(smokingTarget)}</span><span className={smokingExceeded ? "font-black text-[#de6c5f]" : "font-black text-[#0b6f73]"}>{todaySmoking === null ? "Not logged" : `${todaySmoking} today`}</span></div>
                    </div>

                    {smokingExceeded && <p className="mt-3 text-[10px] font-semibold text-[#842832]">You&apos;re {smokingDifference} cigarette{smokingDifference === 1 ? "" : "s"} above your target today.</p>}

                    {editingSmoking === String(smokingGoal.id) && (
                      <div className="mt-4 rounded-xl bg-[#f7fafb] p-3">
                        <label className="text-[9px] font-black uppercase tracking-[0.14em] text-[#74859a]" htmlFor={`smoking-${smokingGoal.id}`}>Cigarettes today</label>
                        <div className="mt-2 flex gap-2">
                          <input id={`smoking-${smokingGoal.id}`} type="number" min="0" step="1" inputMode="numeric" value={smokingDraft[String(smokingGoal.id)] ?? ""} onChange={(event) => setSmokingDraft((current) => ({ ...current, [String(smokingGoal.id)]: event.target.value }))} className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#d7e4e8] bg-white px-3 text-sm font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" />
                          <button type="button" disabled={savingSmoking === String(smokingGoal.id)} onClick={() => void saveSmokingToday()} className="min-h-10 rounded-xl bg-[#0b2d54] px-4 text-[10px] font-black text-white disabled:opacity-50">{savingSmoking === String(smokingGoal.id) ? "Saving…" : "Save"}</button>
                        </div>
                        <button type="button" onClick={() => setEditingSmoking(null)} className="mt-2 text-[9px] font-bold text-[#74859a]">Cancel</button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-[#edf2f5] p-4">
                    <button type="button" onClick={() => { setEditingSmoking(String(smokingGoal.id)); setSmokingDraft((current) => ({ ...current, [String(smokingGoal.id)]: todaySmoking === null ? "" : String(todaySmoking) })); }} className="min-h-10 rounded-xl bg-[#0b2d54] px-3 py-2 text-[10px] font-black text-white">{todaySmoking === null ? "Log today" : "Update log"}</button>
                    <Link href="/health-goals" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2 text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link>
                  </div>
                </article>
              ) : <div />}
            </section>
          )}

          {otherGoals.length > 0 && (
            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {otherGoals.map((goal: any) => {
                const category = String(goal?.category ?? "OTHER").toUpperCase();
                const meta = GOAL_META[category] ?? GOAL_META.OTHER;
                const Icon = meta.icon;
                const progressValue = Number(goal?.progressPercent ?? goal?.latestProgress?.progressPercent ?? goal?.progress?.[0]?.progressPercent ?? 0);
                const progress = Number.isFinite(progressValue) ? Math.max(0, Math.min(100, Math.round(progressValue))) : 0;
                const target = numberText(goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue) ?? "Not set";
                const unit = text(goal?.unit, "").trim();
                return (
                  <article key={String(goal.id)} className="rounded-[24px] border border-[#e0ebee] bg-white p-5 shadow-[0_5px_18px_rgba(11,45,84,.03)]">
                    <div className="flex items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.surface} ${meta.accent}`}><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className={`text-[9px] font-black uppercase tracking-[0.14em] ${meta.accent}`}>{meta.label}</p><h3 className="mt-1 truncate text-[16px] font-black text-[#0b2d54]">{text(goal.title, "Health goal")}</h3></div></div>
                    <div className="mt-5 flex items-end justify-between"><div><p className="text-3xl font-black text-[#0b2d54]">{progress}%</p><p className="mt-1 text-[10px] text-[#74859a]">progress</p></div><p className="text-right text-[10px] font-bold text-[#74859a]">Target<br /><span className="text-[#0b2d54]">{target}{unit ? ` ${unit}` : ""}</span></p></div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf2f5]"><div className="h-full rounded-full bg-gradient-to-r from-[#0b6f73] to-[#24c1c4]" style={{ width: `${progress}%` }} /></div>
                    <div className="mt-4 flex justify-end"><Link href="/health-goals" className="text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>
                  </article>
                );
              })}
            </section>
          )}

          {!medicationGoal && !smokingGoal && <Link href="/health-goals" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[10px] font-black text-white">Set a health goal <ArrowRight className="h-3.5 w-3.5" /></Link>}
        </div>
      </main>
    </ProtectedRoute>
  );
}
