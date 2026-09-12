"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Bell, CalendarDays, CheckCircle2, ClipboardCheck, Pill, Target, Sparkles, Activity, Apple, Brain, Droplets, HeartPulse, Moon, Scale, ShieldCheck, Wine, Cigarette, Footprints } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import DailyHealthCheckIn from "@/components/dashboard/daily-health-check-in";
import TodayMedicationActions from "@/components/today/today-medication-actions";

function text(value: unknown, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function formatDate(value: unknown, includeTime = true) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-ZA", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

function goalProgress(goal: any) {
  const latest = Number(goal?.progressPercent);
  if (Number.isFinite(latest)) return Math.max(0, Math.min(100, Math.round(latest)));
  const progress = Array.isArray(goal?.progress) ? goal.progress[0] : null;
  const percent = Number(progress?.progressPercent);
  return Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;
}

const GOAL_META: Record<string, { label: string; icon: typeof Target; frequency: string; accent: string; surface: string }> = {
  WEIGHT: { label: "Weight", icon: Scale, frequency: "Total target", accent: "text-violet-700", surface: "bg-violet-50" },
  EXERCISE: { label: "Exercise", icon: Footprints, frequency: "Daily", accent: "text-emerald-700", surface: "bg-emerald-50" },
  NUTRITION: { label: "Nutrition", icon: Apple, frequency: "Daily", accent: "text-orange-700", surface: "bg-orange-50" },
  BLOOD_PRESSURE: { label: "Blood pressure", icon: HeartPulse, frequency: "Daily", accent: "text-rose-700", surface: "bg-rose-50" },
  BLOOD_GLUCOSE: { label: "Blood glucose", icon: Activity, frequency: "Daily", accent: "text-amber-700", surface: "bg-amber-50" },
  CHOLESTEROL: { label: "Cholesterol", icon: ShieldCheck, frequency: "Total target", accent: "text-blue-700", surface: "bg-blue-50" },
  MEDICATION: { label: "Medication", icon: Pill, frequency: "Weekly", accent: "text-cyan-700", surface: "bg-cyan-50" },
  SLEEP: { label: "Sleep", icon: Moon, frequency: "Daily", accent: "text-indigo-700", surface: "bg-indigo-50" },
  MENTAL_HEALTH: { label: "Mental health", icon: Brain, frequency: "Daily", accent: "text-fuchsia-700", surface: "bg-fuchsia-50" },
  HYDRATION: { label: "Hydration", icon: Droplets, frequency: "Daily", accent: "text-cyan-700", surface: "bg-cyan-50" },
  SMOKING: { label: "Smoking", icon: Cigarette, frequency: "Total target", accent: "text-slate-700", surface: "bg-slate-100" },
  ALCOHOL: { label: "Alcohol", icon: Wine, frequency: "Weekly", accent: "text-purple-700", surface: "bg-purple-50" },
  HEART_RATE: { label: "Heart rate", icon: HeartPulse, frequency: "Daily", accent: "text-red-700", surface: "bg-red-50" },
  OTHER: { label: "Personal goal", icon: Target, frequency: "Total target", accent: "text-[#0b2d54]", surface: "bg-[#edf4ff]" },
};

const GOAL_FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  TOTAL: "Overall",
};

function goalMeta(goal: any) {
  const category = String(goal?.category ?? "OTHER").toUpperCase();
  return GOAL_META[category] ?? GOAL_META.OTHER;
}

function goalFrequency(goal: any) {
  const configured = String(goal?.metricConfig?.frequency ?? goal?.frequency ?? "").toUpperCase();
  if (configured && GOAL_FREQUENCY_LABELS[configured]) return GOAL_FREQUENCY_LABELS[configured];
  return goalMeta(goal).frequency;
}

function goalTarget(goal: any) {
  const configuredTarget = goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget;
  const rawTarget = configuredTarget ?? goal?.targetValue;
  const target = Number(rawTarget);
  if (!Number.isFinite(target)) return "Target not set";
  const unit = text(goal?.unit, "").trim();
  return `${target % 1 === 0 ? target.toFixed(0) : target.toFixed(1)}${unit ? ` ${unit}` : ""}`;
}

function goalCurrent(goal: any) {
  const current = Number(goal?.currentValue);
  if (!Number.isFinite(current)) return null;
  const unit = text(goal?.unit, "").trim();
  return `${current % 1 === 0 ? current.toFixed(0) : current.toFixed(1)}${unit ? ` ${unit}` : ""}`;
}

function goalStatus(goal: any, progress: number) {
  const status = String(goal?.status ?? "ACTIVE").toUpperCase();
  if (status === "ACHIEVED" || progress >= 100) return "Achieved";
  if (progress >= 75) return "Strong progress";
  if (progress > 0) return "In progress";
  return "Ready to start";
}

function goalDetail(goal: any, progress: number) {
  const category = String(goal?.category ?? "OTHER").toUpperCase();
  const frequency = goalFrequency(goal);
  const target = goalTarget(goal);
  const current = goalCurrent(goal);
  if (category === "BLOOD_PRESSURE") return current ? `${frequency} · Latest ${current} · Target ${target}` : `${frequency} · Target ${target}`;
  if (category === "BLOOD_GLUCOSE" || category === "CHOLESTEROL" || category === "HEART_RATE") return current ? `${frequency} · Latest ${current} · Target ${target}` : `${frequency} · Target ${target}`;
  if (category === "WEIGHT") return current ? `${frequency} · Current ${current} · Target ${target}` : `${frequency} · Target ${target}`;
  if (progress >= 100) return `${frequency} · Target ${target}`;
  return `${frequency} · Target ${target}`;
}

export default function TodayPage() {
  const { data, loading, error, reload } = useDashboard();
  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#f5fafb] p-4 sm:p-8"><div className="mx-auto max-w-[1260px] space-y-5" aria-busy="true"><div className="h-[58px] animate-pulse rounded-[24px] bg-white" /><div className="h-[270px] animate-pulse rounded-[30px] bg-white" /><div className="h-[560px] animate-pulse rounded-[27px] bg-white" /></div></main></ProtectedRoute>;
  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-[#f5fafb] p-4 sm:p-8"><div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-white p-7"><h1 className="text-xl font-black text-[#0b2d54]">We couldn&apos;t load today</h1><p className="mt-2 text-sm leading-6 text-slate-500">Your saved health information has not been changed. Please try again.</p><button type="button" onClick={reload} className="mt-5 min-h-11 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-semibold text-white">Try again</button></div></main></ProtectedRoute>;

  const firstName = data.patient?.firstName || data.profile?.preferredName || "there";
  const medications = data.today?.activeMedications ?? [];
  const appointments = data.today?.upcomingAppointments ?? [];
  const goals = (data.goals ?? []).filter((goal: any) => String(goal.status).toUpperCase() === "ACTIVE");
  const medicationGoals = goals.filter((goal: any) => String(goal?.category ?? "").toUpperCase() === "MEDICATION");
  const displayGoals = goals.filter((goal: any) => String(goal?.category ?? "").toUpperCase() !== "MEDICATION");
  const today = new Date();
  const todayAppointments = appointments.filter((appointment: any) => appointment?.scheduledStart && new Date(String(appointment.scheduledStart)).toDateString() === today.toDateString());
  const carePlans = data.carePlans ?? [];
  const careTasks = carePlans.flatMap((plan: any) => (Array.isArray(plan.tasks) ? plan.tasks : []).filter((task: any) => !["COMPLETED", "CANCELLED"].includes(String(task.status ?? "").toUpperCase())).map((task: any) => ({ ...task, carePlanTitle: plan.title })));
  const goalsDueSoon = goals.filter((goal: any) => goal.targetDate && new Date(String(goal.targetDate)) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const notifications = (data.today?.notifications ?? data.notifications ?? []).filter((item: any) => !item.scheduledFor || new Date(String(item.scheduledFor)) <= new Date());
  const attention = data.attention ?? [];
  const actionItems = [
    ...attention.slice(0, 5).map((item: any) => ({ key: `attention-${item.type}-${item.title}`, href: String(item.actionUrl || "/health-journal"), label: "Needs review", title: text(item.title, "Attention needed"), detail: text(item.description), tone: "bg-red-50 text-red-700" })),
    ...todayAppointments.slice(0, 3).map((appointment: any) => ({ key: `appointment-${appointment.id}`, href: "/appointments", label: "Appointment", title: text(appointment.reason || appointment.appointmentType, "Clinic visit").replaceAll("_", " "), detail: formatDate(appointment.scheduledStart), tone: "bg-[#edf4ff] text-[#3f75bd]" })),
    ...careTasks.slice(0, 3).map((task: any) => ({ key: `task-${task.id}`, href: "/care-plans", label: "Care plan", title: text(task.title, "Care task"), detail: task.dueDate ? `Due ${formatDate(task.dueDate, false)}` : text(task.carePlanTitle, "Care plan"), tone: "bg-violet-50 text-violet-700" })),
    ...goalsDueSoon.slice(0, 3).map((goal: any) => ({ key: `goal-${goal.id}`, href: "/health-goals", label: "Goal", title: text(goal.title, "Health goal"), detail: `${goalProgress(goal)}% progress${goal.targetDate ? ` · Due ${formatDate(goal.targetDate, false)}` : ""}`, tone: "bg-[#e9f8f1] text-[#168660]" })),
    ...notifications.filter((item: any) => item.actionUrl || ["HIGH", "URGENT"].includes(String(item.priority ?? "").toUpperCase())).slice(0, 3).map((item: any) => ({ key: `notification-${item.id}`, href: String(item.actionUrl || "/today"), label: "Reminder", title: text(item.title, "Reminder"), detail: text(item.body), tone: "bg-amber-50 text-amber-700" })),
    ...medications.slice(1, 5).map((medication: any, index: number) => ({ key: `medication-${medication.id || index}`, href: "/medications", label: "Medicine", title: text(medication?.medication?.name, "Your medicine"), detail: `${text(medication?.dosage, "Dose not recorded")} · ${text(medication?.frequency, "Schedule not recorded")}`, tone: "bg-[#e9f9fa] text-[#0b6f73]" })),
  ];
  const medicine = medications[0] ?? null;
  const totalTodayItems = actionItems.length + (medicine ? 1 : 0);

  return <ProtectedRoute><main className="min-h-screen bg-[#f5fafb] text-[#17314e]"><div className="mx-auto max-w-[1260px] px-4 pb-12 pt-4 sm:px-7 sm:pt-6">
    <header className="mb-5 flex items-center justify-between"><Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#0b2d54] transition hover:bg-white"><ArrowLeft className="h-4 w-4" />My Health</Link><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#71839a] shadow-sm ring-1 ring-[#e0ebef]">Today</span></header>
    <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#08284a] via-[#0e4773] to-[#24babe] p-7 text-white shadow-[0_20px_55px_rgba(11,45,84,0.12)] sm:p-9"><div className="relative"><p className="text-sm font-medium text-white/75">Hi {firstName}</p><div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">What do I do today?</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Sympto has brought together the things that actually need your attention, without making you search for them.</p></div><Link href="/log-symptom" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/12 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur-sm"><Sparkles className="h-4 w-4" />Log a symptom</Link></div><div className="mt-7 flex flex-wrap gap-2.5"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 ring-1 ring-white/10">{totalTodayItems} {totalTodayItems === 1 ? "item" : "items"} organised</span>{attention.length > 0 && <span className="rounded-full bg-red-400/15 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-red-200/20">{attention.length} need review</span>}</div></div></section>
    <div className="mt-7 flex items-end justify-between gap-5"><h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Today, organised</h2><p className="text-right text-[11px] text-[#74859a]">A small check-in gives Sympto a better picture of your day.</p></div>
    <section className="mt-3.5 overflow-hidden rounded-[26px] border border-[#dfebef] bg-white shadow-[0_6px_20px_rgba(11,45,84,.035)]"><div className="grid items-center gap-3.5 p-5 sm:grid-cols-2 sm:p-[22px]"><div className="flex items-center gap-3.5"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b2d54]"><Pill className="h-5 w-5" /></div><div><h3 className="text-[17px] font-black text-[#0b2d54]">Your plan</h3><p className="mt-1 text-xs text-[#74859a]">{medicine ? "One important treatment to keep in view." : "Your current treatment plan will appear here."}</p></div></div><div className="rounded-[19px] bg-[#f5fafb] px-4 py-3.5"><div className="text-[13px] font-black text-[#0b2d54]">{medicine ? `Medicine · ${text(medicine?.medication?.name, "Your medicine")}` : "Medicine · No active medicine"}</div><div className="mt-1 text-[11px] text-[#74859a]">{medicine ? `${text(medicine?.dosage, "Dose not recorded")} · ${text(medicine?.frequency, "Schedule not recorded")}` : "Your medication plan will appear here."}</div></div></div>{actionItems.length > 0 && <div className="divide-y divide-[#edf2f5] border-t border-[#edf2f5]">{actionItems.map((item: any) => <Link key={item.key} href={item.href} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-[#f8fbfc] sm:px-[22px]"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${item.tone}`}>{item.label === "Appointment" ? <CalendarDays className="h-4 w-4" /> : item.label === "Care plan" ? <ClipboardCheck className="h-4 w-4" /> : item.label === "Reminder" ? <Bell className="h-4 w-4" /> : item.label === "Medicine" ? <Pill className="h-4 w-4" /> : item.label === "Goal" ? <Target className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[#8a99a8]">{item.label}</span><span className="mt-1 block text-sm font-bold text-[#0b2d54]">{item.title}</span><span className="mt-1 block truncate text-[11px] text-[#74859a]">{item.detail}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-[#91a0ad] transition group-hover:translate-x-1 group-hover:text-[#0b2d54]" /></Link>)}</div>}</section>
    <div id="daily-health-check-in" className="mt-7 flex items-end justify-between gap-5"><h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Daily health check-in</h2><p className="text-right text-[11px] text-[#74859a]">Your answers become structured Health Journal data.</p></div><div className="mt-3.5"><DailyHealthCheckIn embedded goals={goals} /></div>

    <section className="mt-4 overflow-hidden rounded-[30px] border border-[#dce9ee] bg-white shadow-[0_18px_48px_rgba(11,45,84,.055)]">
      <div className="relative border-b border-[#edf2f5] bg-gradient-to-br from-white via-white to-[#f4fbfb] px-5 py-5 sm:px-7 sm:py-6">
        <div className="absolute right-[-50px] top-[-55px] h-36 w-36 rounded-full bg-[#24c1c4]/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0b2d54] text-white shadow-sm"><Target className="h-4.5 w-4.5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6f8295]">Your longer-term health</p><h3 className="mt-1 text-xl font-black tracking-[-.045em] text-[#0b2d54]">Health goals</h3></div></div>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-[#74859a]">A clean view of the goals that matter most — whatever you are tracking, how often you track it, and where you stand against the target.</p>
          </div>
          <div className="flex items-center gap-2">
            {medicationGoals.length > 0 && <span className="rounded-full bg-[#e9f9fa] px-3 py-1.5 text-[10px] font-black text-[#0b6f73]">Medication tracked separately</span>}
            <Link href="/health-goals" className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3.5 py-2.5 text-[10px] font-black text-white shadow-sm transition hover:bg-[#123d63]">{goals.length} active goal{goals.length === 1 ? "" : "s"}<ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </div>

      {displayGoals.length > 0 ? <div className="grid gap-3.5 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">{displayGoals.map((goal: any) => {
        const progress = goalProgress(goal);
        const meta = goalMeta(goal);
        const Icon = meta.icon;
        const status = goalStatus(goal, progress);
        return <Link key={String(goal.id)} href={`/health-goals/${String(goal.id)}`} className="group relative overflow-hidden rounded-[23px] border border-[#e1ebee] bg-white p-4.5 transition duration-200 hover:-translate-y-0.5 hover:border-[#cbdde2] hover:shadow-[0_14px_34px_rgba(11,45,84,.08)]">
          <div className="flex items-start justify-between gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${meta.surface} ${meta.accent}`}><Icon className="h-4.5 w-4.5" /></span><span className="rounded-full bg-[#f4f7f9] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#708193]">{meta.label}</span></div>
          <div className="mt-4 min-w-0"><h4 className="truncate text-[15px] font-black text-[#0b2d54]">{text(goal.title, "Health goal")}</h4><p className="mt-1 text-[11px] font-semibold text-[#74859a]">{goalDetail(goal, progress)}</p></div>
          <div className="mt-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#91a0ad]">Progress</p><p className="mt-1 text-2xl font-black tracking-[-.05em] text-[#0b2d54]">{progress}%</p></div><div className="text-right"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#91a0ad]">Status</p><p className="mt-1 text-[11px] font-black text-[#0b6f73]">{status}</p></div></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf2f5]"><div className="h-full rounded-full bg-gradient-to-r from-[#0b6f73] to-[#24c1c4] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
          <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-semibold text-[#74859a]"><span>{goal?.targetDate ? `Target ${formatDate(goal.targetDate, false)}` : "No target date"}</span><span className="shrink-0">{goalFrequency(goal)} · {goalTarget(goal)}</span></div>
          <ArrowRight className="absolute bottom-4 right-4 h-3.5 w-3.5 text-[#a2afb9] transition group-hover:translate-x-0.5 group-hover:text-[#0b2d54]" />
        </Link>;
      })}</div> : <div className="px-5 py-8 sm:px-7"><div className="rounded-[22px] border border-dashed border-[#d6e5e9] bg-[#f8fbfc] px-5 py-7 text-center"><Target className="mx-auto h-7 w-7 text-[#8ca3af]" /><p className="mt-3 text-sm font-bold text-[#0b2d54]">No non-medication goals are active yet.</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#74859a]">Create a goal for weight, exercise, nutrition, blood pressure, glucose, cholesterol, sleep, mental health, hydration, smoking, alcohol, heart rate, or another personal target.</p><Link href="/health-goals" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[10px] font-black text-white">Create or manage goals <ArrowRight className="h-3.5 w-3.5" /></Link></div></div>}
      <div className="flex items-center justify-between gap-4 border-t border-[#edf2f5] px-5 py-4 sm:px-7"><p className="text-[10px] font-semibold text-[#8393a1]">Targets and cadence come from each goal&apos;s tracking configuration when available.</p><Link href="/health-goals" className="shrink-0 text-[10px] font-black text-[#0b2d54]">Open all goals →</Link></div>
    </section>

    {medicationGoals.length > 0 && <section className="mt-4 overflow-hidden rounded-[28px] border border-[#dce9ee] bg-white shadow-[0_12px_34px_rgba(11,45,84,.045)]"><div className="px-5 pt-5 sm:px-7 sm:pt-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0b6f73]">Medication adherence</p><h3 className="mt-1 text-lg font-black tracking-[-.04em] text-[#0b2d54]">Today&apos;s medication</h3><p className="mt-1 text-xs text-[#74859a]">Mark each medicine Taken or Skipped. Your saved activity remains connected to the medication goal.</p></div><div className="hidden h-10 w-10 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b6f73] sm:grid"><Pill className="h-4.5 w-4.5" /></div></div></div><div className="px-5 pb-5 sm:px-7 sm:pb-6"><TodayMedicationActions medications={medications} onUpdated={reload} /></div></section>}

    <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[#74859a]">✦ <strong className="text-[#0b2d54]">Sympto</strong> keeps your health connected, understandable, and under your control.</div>
  </div></main></ProtectedRoute>;
}
