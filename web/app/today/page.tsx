"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Activity, Apple, Bell, Brain, CalendarDays, CheckCircle2, ClipboardCheck, Cigarette, Droplets, HeartPulse, Moon, Pill, Scale, ShieldCheck, Sparkles, Target, Wine, Footprints } from "lucide-react";
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
  return new Intl.DateTimeFormat("en-ZA", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
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

function formatNumber(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function goalProgress(goal: any) {
  const latest = Number(goal?.progressPercent ?? goal?.latestProgress?.progressPercent);
  if (Number.isFinite(latest)) return Math.max(0, Math.min(100, Math.round(latest)));
  const progress = Array.isArray(goal?.progress) ? goal.progress[0] : null;
  const percent = Number(progress?.progressPercent);
  return Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;
}

function goalTarget(goal: any) {
  const value = formatNumber(goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue);
  if (value === null) return "Target not set";
  const unit = text(goal?.unit, "").trim();
  return `${value}${unit ? ` ${unit}` : ""}`;
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
  const [smokingDrafts, setSmokingDrafts] = useState<Record<string, string>>({});
  const [openSmokingGoalId, setOpenSmokingGoalId] = useState<string | null>(null);
  const [savingSmokingGoalId, setSavingSmokingGoalId] = useState<string | null>(null);

  useEffect(() => {
    const smokingGoals = (data?.goals ?? []).filter(
      (goal: any) => String(goal?.status).toUpperCase() === "ACTIVE" && String(goal?.category ?? "").toUpperCase() === "SMOKING",
    );
    if (!smokingGoals.length) return;

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
        const next: Record<string, number | null> = {};
        const drafts: Record<string, string> = {};
        for (const goal of smokingGoals) {
          const event = response.events.find((item) => item.sourceId === `${String(goal.id)}:${dayKey}`);
          next[String(goal.id)] = event ? Number(event.loggedValue) : null;
          if (event) drafts[String(goal.id)] = String(event.loggedValue);
        }
        setSmokingToday(next);
        setSmokingDrafts((current) => ({ ...current, ...drafts }));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [data?.goals]);

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5fafb] p-4 sm:p-8">
          <div className="mx-auto max-w-[1260px] space-y-5" aria-busy="true">
            <div className="h-[58px] animate-pulse rounded-[24px] bg-white" />
            <div className="h-[270px] animate-pulse rounded-[30px] bg-white" />
            <div className="h-[420px] animate-pulse rounded-[27px] bg-white" />
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
  const goals = (data.goals ?? []).filter((goal: any) => String(goal?.status).toUpperCase() === "ACTIVE");
  const medicationGoal = goals.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "MEDICATION");
  const smokingGoal = goals.find((goal: any) => String(goal?.category ?? "").toUpperCase() === "SMOKING");
  const otherGoals = goals.filter((goal: any) => !["MEDICATION", "SMOKING"].includes(String(goal?.category ?? "").toUpperCase()));
  const attention = data.attention ?? [];
  const carePlans = data.carePlans ?? [];
  const careTasks = carePlans.flatMap((plan: any) =>
    (Array.isArray(plan.tasks) ? plan.tasks : [])
      .filter((task: any) => !["COMPLETED", "CANCELLED"].includes(String(task.status ?? "").toUpperCase()))
      .map((task: any) => ({ ...task, carePlanTitle: plan.title })),
  );
  const todayAppointments = appointments.filter(
    (appointment: any) => appointment?.scheduledStart && new Date(String(appointment.scheduledStart)).toDateString() === new Date().toDateString(),
  );
  const notifications = (data.today?.notifications ?? data.notifications ?? []).filter(
    (item: any) => !item.scheduledFor || new Date(String(item.scheduledFor)) <= new Date(),
  );

  const actionItems = [
    ...attention.slice(0, 3).map((item: any) => ({ href: String(item.actionUrl || "/health-journal"), label: "Needs review", title: text(item.title, "Attention needed"), detail: text(item.description), icon: CheckCircle2 })),
    ...todayAppointments.slice(0, 2).map((appointment: any) => ({ href: "/appointments", label: "Appointment", title: text(appointment.reason || appointment.appointmentType, "Clinic visit").replaceAll("_", " "), detail: formatDate(appointment.scheduledStart, true), icon: CalendarDays })),
    ...careTasks.slice(0, 2).map((task: any) => ({ href: "/care-plans", label: "Care plan", title: text(task.title, "Care task"), detail: task.dueDate ? `Due ${formatDate(task.dueDate)}` : text(task.carePlanTitle, "Care plan"), icon: ClipboardCheck })),
    ...notifications.filter((item: any) => item.actionUrl || ["HIGH", "URGENT"].includes(String(item.priority ?? "").toUpperCase())).slice(0, 2).map((item: any) => ({ href: String(item.actionUrl || "/today"), label: "Reminder", title: text(item.title, "Reminder"), detail: text(item.body), icon: Bell })),
  ];

  async function saveSmokingToday(goal: any) {
    const goalId = String(goal.id);
    const raw = smokingDrafts[goalId]?.trim() ?? "";
    const cigarettes = Number(raw);
    if (!raw || !Number.isFinite(cigarettes) || cigarettes < 0) return;

    try {
      setSavingSmokingGoalId(goalId);
      await healthGoalsService.logSmoking(goalId, cigarettes, localDayKey());
      setSmokingToday((current) => ({ ...current, [goalId]: cigarettes }));
      setOpenSmokingGoalId(null);
      await reload();
    } finally {
      setSavingSmokingGoalId(null);
    }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5fafb] text-[#17314e]">
        <div className="mx-auto max-w-[1260px] px-4 pb-12 pt-4 sm:px-7 sm:pt-6">
          <header className="mb-5 flex items-center justify-between">
            <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#0b2d54] hover:bg-white">
              <ArrowLeft className="h-4 w-4" />My Health
            </Link>
            <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#71839a] shadow-sm ring-1 ring-[#e0ebef]">Today</span>
          </header>

          <section className="rounded-[30px] bg-gradient-to-br from-[#08284a] via-[#0e4773] to-[#24babe] p-7 text-white shadow-[0_20px_55px_rgba(11,45,84,0.12)] sm:p-9">
            <p className="text-sm font-medium text-white/75">Hi {firstName}</p>
            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">What do I do today?</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Your important health actions, brought together in one place.</p>
              </div>
              <Link href="/log-symptom" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/12 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/20">
                <Sparkles className="h-4 w-4" />Log a symptom
              </Link>
            </div>
          </section>

          <div className="mt-7 flex items-end justify-between gap-5">
            <h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Today, organised</h2>
            <p className="hidden text-right text-[11px] text-[#74859a] sm:block">Only the things worth acting on.</p>
          </div>

          <section className="mt-3.5 overflow-hidden rounded-[26px] border border-[#dfebef] bg-white shadow-[0_6px_20px_rgba(11,45,84,.035)]">
            {medications[0] ? (
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b6f73]"><Pill className="h-5 w-5" /></span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b6f73]">Medication today</p>
                    <p className="mt-1 text-sm font-black text-[#0b2d54]">{text(medications[0]?.medication?.name, "Your medicine")}</p>
                    <p className="mt-1 text-[11px] text-[#74859a]">{text(medications[0]?.dosage, "Dose not recorded")} · {String(medications[0]?.frequency || "Schedule not recorded").replaceAll("_", " ")}</p>
                  </div>
                </div>
                <Link href="#today-goals" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[10px] font-black text-white">
                  Go to today&apos;s goals <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="p-5 text-sm text-[#74859a]">No medication is scheduled for today.</div>
            )}
            {actionItems.length > 0 && (
              <div className="divide-y divide-[#edf2f5] border-t border-[#edf2f5]">
                {actionItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Link key={`${item.label}-${index}`} href={item.href} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#f8fbfc] sm:px-6">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f1f6f8] text-[#0b2d54]"><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-[#8a99a8]">{item.label}</span>
                        <span className="mt-0.5 block truncate text-xs font-bold text-[#0b2d54]">{item.title}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-[#74859a]">{item.detail}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#93a1ad]" />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <div id="daily-health-check-in" className="mt-7 flex items-end justify-between gap-5">
            <h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Daily health check-in</h2>
            <p className="hidden text-right text-[11px] text-[#74859a] sm:block">A few answers help Sympto understand your day.</p>
          </div>
          <div className="mt-3.5"><DailyHealthCheckIn embedded goals={goals} /></div>

          <div id="today-goals" className="mt-7 flex items-end justify-between gap-5">
            <h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Your active goals</h2>
            <Link href="/health-goals" className="text-[10px] font-black text-[#0b2d54]">Manage goals <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
          </div>

          {(medicationGoal || smokingGoal) && (
            <section className="mt-3.5 grid items-stretch gap-4 lg:grid-cols-2">
              {medicationGoal ? (
                <TodayMedicationActions medications={medications} goal={medicationGoal} onUpdated={reload} />
              ) : <div />}

              {smokingGoal ? (() => {
                const goalId = String(smokingGoal.id);
                const todayLogged = smokingToday[goalId] ?? null;
                const dailyTarget = Number(smokingGoal?.metricConfig?.frequencyTarget ?? smokingGoal?.frequencyTarget ?? smokingGoal?.targetValue ?? 0);
                const difference = todayLogged !== null ? todayLogged - dailyTarget : 0;
                const exceeded = todayLogged !== null && dailyTarget > 0 && todayLogged > dailyTarget;
                const targetMarker = todayLogged !== null && todayLogged > 0 && dailyTarget > 0 ? Math.min(94, Math.max(8, (dailyTarget / todayLogged) * 86 + 4)) : 50;
                const todayMarker = todayLogged !== null ? 95 : 50;
                const startDate = new Date(String(smokingGoal?.createdAt ?? "2026-08-21T00:00:00Z"));
                const targetDate = new Date(String(smokingGoal?.targetDate ?? "2026-09-30T00:00:00Z"));
                const journeyDay = Number.isNaN(startDate.getTime()) ? 1 : Math.max(1, Math.floor((Date.now() - startDate.getTime()) / 86400000) + 1);
                const daysLeft = Number.isNaN(targetDate.getTime()) ? 0 : Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86400000));

                return (
                  <article className="flex h-full flex-col rounded-[24px] border border-[#dfe9ed] bg-white shadow-[0_5px_18px_rgba(11,45,84,.035)]">
                    <style jsx>{`
                      .smoking-track{position:relative;height:62px;border-radius:16px;background:linear-gradient(180deg,#f8fbfc,#edf4f6);border:1px solid #dfebef;display:flex;align-items:center;padding:0 12px;overflow:visible}
                      .smoking-cigarette{position:relative;width:94%;height:24px;display:flex;align-items:stretch;filter:drop-shadow(0 4px 6px rgba(11,45,84,.12))}
                      .smoking-filter{width:17%;min-width:42px;background:linear-gradient(90deg,#bd7e48,#efd0a0 20%,#d5a06a 62%,#b77546);border-radius:5px 0 0 5px;box-shadow:inset 0 0 0 1px rgba(123,74,35,.17),inset -6px 0 9px rgba(105,59,28,.13);position:relative}
                      .smoking-filter:after{content:"";position:absolute;right:7px;top:0;bottom:0;width:2px;background:rgba(124,73,36,.18);box-shadow:5px 0 rgba(124,73,36,.11),10px 0 rgba(124,73,36,.08)}
                      .smoking-paper{flex:1;position:relative;background:linear-gradient(180deg,#fff,#f0f4f2 78%,#d8e3e2);border:1px solid #cedddd;border-left:0;border-radius:0 6px 6px 0}
                      .smoking-paper:before{content:"";position:absolute;left:4%;right:4%;top:4px;height:2px;background:rgba(11,45,84,.06);box-shadow:0 14px rgba(11,45,84,.05)}
                      .smoking-burn{position:absolute;right:18px;top:-1px;bottom:-1px;width:5px;background:linear-gradient(90deg,#b95d36,#f19b55,#793e31);box-shadow:0 0 8px rgba(238,117,45,.5)}
                      .smoking-ember{position:relative;width:22px;height:24px;border-radius:0 7px 7px 0;background:radial-gradient(circle at 25% 50%,#fff7a7 0 8%,#ffcb55 18%,#ef6b2d 48%,#8f3e32 80%);box-shadow:0 0 5px #ffb02e,0 0 12px rgba(255,94,35,.85),0 0 22px rgba(255,139,45,.5);animation:smokingPulse 1.2s ease-in-out infinite}
                      .smoking-ember:before{content:"";position:absolute;left:-3px;top:4px;width:8px;height:16px;border-radius:50%;background:rgba(255,221,102,.66);filter:blur(3px)}
                      .smoking-ember:after{content:"";position:absolute;right:1px;top:-13px;width:10px;height:15px;border-radius:70% 20% 70% 20%;background:linear-gradient(180deg,#fff09c,#ff8a32 68%,transparent);transform:rotate(24deg);animation:smokingFlicker .75s ease-in-out infinite alternate}
                      .smoking-smoke{position:absolute;right:6px;top:-16px;width:14px;height:22px;border-left:2px solid rgba(117,137,151,.46);border-radius:50%;animation:smokingRise 3.1s ease-in-out infinite}
                      .smoking-smoke.two{right:-1px;top:-21px;width:11px;height:18px;animation-delay:1s;opacity:.65}
                      .smoking-smoke.three{right:12px;top:-26px;width:8px;height:14px;animation-delay:1.7s;opacity:.42}
                      .smoking-target{position:absolute;left:var(--target);top:6px;bottom:6px;width:2px;background:#0b2d54;border-radius:2px;z-index:4}
                      .smoking-target:before{content:"Target ${formatNumber(dailyTarget) ?? ""}";position:absolute;top:-2px;left:50%;transform:translate(-50%,-100%);font-size:8px;font-weight:900;color:#0b2d54;white-space:nowrap}
                      .smoking-today{position:absolute;left:var(--today);bottom:5px;width:8px;height:8px;border-radius:50%;background:${exceeded ? "#de6c5f" : "#24c1c4"};box-shadow:0 0 0 4px ${exceeded ? "rgba(222,108,95,.12)" : "rgba(36,193,196,.14)"},0 0 12px ${exceeded ? "rgba(222,108,95,.48)" : "rgba(36,193,196,.45)"};z-index:5}
                      .smoking-today:after{content:"Today ${todayLogged ?? "—"}";position:absolute;right:-3px;top:12px;font-size:8px;color:${exceeded ? "#de6c5f" : "#0b6f73"};font-weight:900;white-space:nowrap}
                      @keyframes smokingPulse{0%,100%{filter:brightness(.95);transform:scaleX(1)}50%{filter:brightness(1.22);transform:scaleX(1.05)}}
                      @keyframes smokingFlicker{0%{transform:rotate(18deg) scale(.82)}100%{transform:rotate(33deg) translateY(-2px) scale(1.08)}}
                      @keyframes smokingRise{0%{transform:translateY(4px) rotate(8deg);opacity:.15}35%{opacity:.65}100%{transform:translateY(-12px) rotate(-15deg);opacity:0}}
                    `}</style>

                    <div className="flex-1 p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Cigarette className="h-4.5 w-4.5" /></span>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7d8c98]">Smoking</p>
                            <h3 className="mt-1 truncate text-[17px] font-black tracking-[-.025em] text-[#0b2d54]">{text(smokingGoal.title, "Smoking")}</h3>
                          </div>
                        </div>
                        {todayLogged !== null && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${exceeded ? "bg-red-50 text-red-700" : "bg-[#e9f9fa] text-[#0b6f73]"}`}>{exceeded ? `${difference} over` : "On target"}</span>}
                      </div>

                      <div className="mt-5 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-3xl font-black tracking-[-.06em] text-[#0b2d54]">{todayLogged === null ? "—" : todayLogged}</p>
                          <p className="mt-1 text-[10px] text-[#74859a]">today · target {formatNumber(dailyTarget)}</p>
                        </div>
                        {exceeded && <p className="max-w-[150px] text-right text-[10px] font-semibold leading-4 text-[#842832]">{difference} above target. Every next choice counts.</p>}
                      </div>

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-[#74859a]">
                          <span>Today&apos;s target</span>
                          <span className={exceeded ? "text-[#de6c5f]" : "text-[#0b6f73]"}>{todayLogged === null ? "Not logged" : exceeded ? `${difference} above target` : "On target"}</span>
                        </div>
                        <div className="smoking-track" role="img" aria-label={`Burning cigarette target bar: ${dailyTarget} target, ${todayLogged ?? "not logged"} today`} style={{ "--target": `${targetMarker}%`, "--today": `${todayMarker}%` } as React.CSSProperties}>
                          <div className="smoking-cigarette">
                            <div className="smoking-filter" />
                            <div className="smoking-paper"><span className="smoking-burn" /></div>
                            <div className="smoking-ember">
                              <span className="smoking-smoke" />
                              <span className="smoking-smoke two" />
                              <span className="smoking-smoke three" />
                            </div>
                          </div>
                          <span className="smoking-target" aria-hidden="true" />
                          <span className="smoking-today" aria-hidden="true" />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[9px] font-semibold text-[#8795a0]"><span>0</span><span className="font-black text-[#0b2d54]">Target {formatNumber(dailyTarget)}</span><span className={exceeded ? "font-black text-[#de6c5f]" : "font-black text-[#0b6f73]"}>Today {todayLogged ?? "—"}</span></div>
                      </div>

                      <p className="mt-4 text-[10px] font-semibold text-[#8a99a6]">Day {journeyDay} · {daysLeft} days left · target {formatDate(targetDate)}</p>

                      {openSmokingGoalId === goalId && (
                        <div className="mt-4 rounded-xl bg-[#f7fafb] p-3">
                          <label className="text-[9px] font-black uppercase tracking-[0.14em] text-[#74859a]" htmlFor={`smoking-${goalId}`}>Cigarettes today</label>
                          <div className="mt-2 flex gap-2">
                            <input id={`smoking-${goalId}`} type="number" min="0" step="1" inputMode="numeric" value={smokingDrafts[goalId] ?? ""} onChange={(event) => setSmokingDrafts((current) => ({ ...current, [goalId]: event.target.value }))} className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#d7e4e8] bg-white px-3 text-sm font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4]" />
                            <button type="button" disabled={savingSmokingGoalId === goalId} onClick={() => void saveSmokingToday(smokingGoal)} className="min-h-10 rounded-xl bg-[#0b2d54] px-4 text-[10px] font-black text-white disabled:opacity-50">{savingSmokingGoalId === goalId ? "Saving…" : "Save"}</button>
                          </div>
                          <button type="button" onClick={() => setOpenSmokingGoalId(null)} className="mt-2 text-[9px] font-bold text-[#74859a]">Cancel</button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-[#edf2f5] p-4">
                      <button type="button" onClick={() => { setOpenSmokingGoalId(goalId); setSmokingDrafts((current) => ({ ...current, [goalId]: todayLogged === null ? "" : String(todayLogged) })); }} className="min-h-10 rounded-xl bg-[#0b2d54] px-3 py-2 text-[10px] font-black text-white">{todayLogged === null ? "Log today" : "Update log"}</button>
                      <Link href="/health-goals" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2 text-[10px] font-black text-[#0b2d54]">View goal <ArrowRight className="h-3 w-3" /></Link>
                    </div>
                  </article>
                );
              })() : <div />}
            </section>
          )}

          {otherGoals.length > 0 && (
            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {otherGoals.map((goal: any) => {
                const category = String(goal?.category ?? "OTHER").toUpperCase();
                const meta = GOAL_META[category] ?? GOAL_META.OTHER;
                const Icon = meta.icon;
                const progress = goalProgress(goal);
                return (
                  <article key={String(goal.id)} className="rounded-[24px] border border-[#e0ebee] bg-white p-5 shadow-[0_5px_18px_rgba(11,45,84,.03)]">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.surface} ${meta.accent}`}><Icon className="h-4.5 w-4.5" /></span>
                      <div className="min-w-0"><p className={`text-[9px] font-black uppercase tracking-[0.14em] ${meta.accent}`}>{meta.label}</p><h3 className="mt-1 truncate text-[16px] font-black text-[#0b2d54]">{text(goal.title, "Health goal")}</h3></div>
                    </div>
                    <div className="mt-5 flex items-end justify-between"><div><p className="text-3xl font-black text-[#0b2d54]">{progress}%</p><p className="mt-1 text-[10px] text-[#74859a]">progress</p></div><p className="text-right text-[10px] font-bold text-[#74859a]">Target<br /><span className="text-[#0b2d54]">{goalTarget(goal)}</span></p></div>
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
