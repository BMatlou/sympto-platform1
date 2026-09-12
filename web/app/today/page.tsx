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
  const latest = Number(goal?.progressPercent ?? goal?.latestProgress?.progressPercent);
  if (Number.isFinite(latest)) return Math.max(0, Math.min(100, Math.round(latest)));
  const progress = Array.isArray(goal?.progress) ? goal.progress[0] : null;
  const percent = Number(progress?.progressPercent);
  return Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;
}

const GOAL_META: Record<string, { label: string; icon: typeof Target; accent: string; surface: string; tint: string }> = {
  WEIGHT: { label: "Weight", icon: Scale, accent: "text-violet-700", surface: "bg-violet-50", tint: "from-violet-500/12 to-violet-500/0" },
  EXERCISE: { label: "Exercise", icon: Footprints, accent: "text-emerald-700", surface: "bg-emerald-50", tint: "from-emerald-500/12 to-emerald-500/0" },
  NUTRITION: { label: "Nutrition", icon: Apple, accent: "text-orange-700", surface: "bg-orange-50", tint: "from-orange-500/12 to-orange-500/0" },
  BLOOD_PRESSURE: { label: "Blood pressure", icon: HeartPulse, accent: "text-rose-700", surface: "bg-rose-50", tint: "from-rose-500/12 to-rose-500/0" },
  BLOOD_GLUCOSE: { label: "Blood glucose", icon: Activity, accent: "text-amber-700", surface: "bg-amber-50", tint: "from-amber-500/12 to-amber-500/0" },
  CHOLESTEROL: { label: "Cholesterol", icon: ShieldCheck, accent: "text-blue-700", surface: "bg-blue-50", tint: "from-blue-500/12 to-blue-500/0" },
  MEDICATION: { label: "Medication", icon: Pill, accent: "text-cyan-700", surface: "bg-cyan-50", tint: "from-cyan-500/12 to-cyan-500/0" },
  SLEEP: { label: "Sleep", icon: Moon, accent: "text-indigo-700", surface: "bg-indigo-50", tint: "from-indigo-500/12 to-indigo-500/0" },
  MENTAL_HEALTH: { label: "Mental health", icon: Brain, accent: "text-fuchsia-700", surface: "bg-fuchsia-50", tint: "from-fuchsia-500/12 to-fuchsia-500/0" },
  HYDRATION: { label: "Hydration", icon: Droplets, accent: "text-cyan-700", surface: "bg-cyan-50", tint: "from-cyan-500/12 to-cyan-500/0" },
  SMOKING: { label: "Smoking", icon: Cigarette, accent: "text-slate-700", surface: "bg-slate-100", tint: "from-slate-500/12 to-slate-500/0" },
  ALCOHOL: { label: "Alcohol", icon: Wine, accent: "text-purple-700", surface: "bg-purple-50", tint: "from-purple-500/12 to-purple-500/0" },
  HEART_RATE: { label: "Heart rate", icon: HeartPulse, accent: "text-red-700", surface: "bg-red-50", tint: "from-red-500/12 to-red-500/0" },
  OTHER: { label: "Personal goal", icon: Target, accent: "text-[#0b2d54]", surface: "bg-[#edf4ff]", tint: "from-slate-500/10 to-slate-500/0" },
};

const GOAL_FREQUENCY_LABELS: Record<string, string> = { DAILY: "Daily", WEEKLY: "Weekly", TOTAL: "Overall" };

function goalMeta(goal: any) {
  return GOAL_META[String(goal?.category ?? "OTHER").toUpperCase()] ?? GOAL_META.OTHER;
}

function goalFrequency(goal: any) {
  const configured = String(goal?.metricConfig?.frequency ?? goal?.frequency ?? "").toUpperCase();
  return GOAL_FREQUENCY_LABELS[configured] ?? "As needed";
}

function formatNumber(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function goalTarget(goal: any) {
  const raw = goal?.metricConfig?.frequencyTarget ?? goal?.frequencyTarget ?? goal?.targetValue;
  const number = formatNumber(raw);
  if (!number) return "Target not set";
  const unit = text(goal?.unit, "").trim();
  return `${number}${unit ? ` ${unit}` : ""}`;
}

function goalCurrent(goal: any) {
  const current = formatNumber(goal?.currentValue);
  if (!current) return null;
  const unit = text(goal?.unit, "").trim();
  return `${current}${unit ? ` ${unit}` : ""}`;
}

function goalInsight(goal: any, progress: number) {
  const category = String(goal?.category ?? "OTHER").toUpperCase();
  const frequency = goalFrequency(goal);
  const target = goalTarget(goal);
  const current = goalCurrent(goal);
  if (category === "WEIGHT") return current ? `${current} now · ${target} target` : `${target} target`;
  if (["BLOOD_PRESSURE", "BLOOD_GLUCOSE", "CHOLESTEROL", "HEART_RATE"].includes(category)) return current ? `${current} latest · ${target} target` : `${target} target`;
  if (category === "SMOKING") return current ? `${current} current · ${target} target` : `${target} target`;
  if (progress >= 100) return `${frequency} · Target reached`;
  return `${frequency} · ${target}`;
}

function goalStatus(goal: any, progress: number) {
  const explicit = String(goal?.progress?.[0]?.status ?? goal?.latestProgress?.status ?? "").toUpperCase();
  if (explicit === "ACHIEVED" || String(goal?.status ?? "").toUpperCase() === "ACHIEVED" || progress >= 100) return { label: "Achieved", tone: "text-[#168660] bg-[#e9f8f1]" };
  if (["ON_TRACK", "IMPROVING"].includes(explicit) || progress >= 70) return { label: "On track", tone: "text-[#0b6f73] bg-[#e9f9fa]" };
  if (explicit === "DECLINING") return { label: "Needs attention", tone: "text-red-700 bg-red-50" };
  return { label: progress > 0 ? "In progress" : "Ready to start", tone: "text-[#617487] bg-[#f4f7f9]" };
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

    {displayGoals.length > 0 && <section className="mt-4 overflow-hidden rounded-[30px] border border-[#dce9ee] bg-white shadow-[0_18px_48px_rgba(11,45,84,.055)]"><div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">{displayGoals.map((goal: any) => {
      const progress = goalProgress(goal); const meta = goalMeta(goal); const Icon = meta.icon; const status = goalStatus(goal, progress); const current = goalCurrent(goal);
      return <Link key={String(goal.id)} href="/health-goals" className="group relative overflow-hidden rounded-[25px] border border-[#e0ebee] bg-gradient-to-br from-white via-white to-[#f7fbfc] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#c8dce1] hover:shadow-[0_18px_38px_rgba(11,45,84,.09)]">
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${meta.tint} opacity-70`} />
        <div className="relative flex items-start justify-between gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${meta.surface} ${meta.accent}`}><Icon className="h-5 w-5" /></span><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${status.tone}`}>{status.label}</span></div>
        <div className="relative mt-5"><p className={`text-[10px] font-black uppercase tracking-[0.15em] ${meta.accent}`}>{meta.label}</p><h4 className="mt-1.5 truncate text-[17px] font-black tracking-[-.025em] text-[#0b2d54]">{text(goal.title, "Health goal")}</h4><p className="mt-2 text-[11px] leading-5 text-[#74859a]">{goalInsight(goal, progress)}</p></div>
        <div className="relative mt-5 rounded-[19px] border border-[#e7eff1] bg-white/80 p-3.5"><div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9aa7b2]">Progress</p><p className="mt-1 text-3xl font-black tracking-[-.06em] text-[#0b2d54]">{progress}<span className="text-base text-[#7b8d9d]">%</span></p></div><div className="text-right"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9aa7b2]">Target</p><p className="mt-1 max-w-[120px] text-[11px] font-black leading-4 text-[#0b2d54]">{goalTarget(goal)}</p></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf2f5]"><div className="h-full rounded-full bg-gradient-to-r from-[#0b6f73] to-[#24c1c4] transition-all duration-500" style={{ width: `${progress}%` }} /></div></div>
        <div className="relative mt-3 flex items-center justify-between gap-3 text-[10px] font-semibold text-[#74859a]"><span>{current ? `Current ${current}` : goalFrequency(goal)}</span><span className="shrink-0">{goal?.targetDate ? formatDate(goal.targetDate, false) : "No date"}</span></div>
        <div className="relative mt-4 flex items-center justify-between border-t border-[#edf2f5] pt-3"><span className="text-[10px] font-black text-[#0b2d54]">View goal</span><span className="grid h-7 w-7 place-items-center rounded-full bg-[#f1f6f8] text-[#617487] transition group-hover:bg-[#0b2d54] group-hover:text-white"><ArrowRight className="h-3.5 w-3.5" /></span></div>
      </Link>;
    })}</div></section>}

    {medicationGoals.length > 0 && <div className="mt-4"><TodayMedicationActions medications={medications} goal={medicationGoals[0]} onUpdated={reload} /></div>}

    <Link href="/health-goals" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-[10px] font-black text-white shadow-sm transition hover:bg-[#123d63]">Manage health goals <ArrowRight className="h-3.5 w-3.5" /></Link>

    <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[#74859a]">✦ <strong className="text-[#0b2d54]">Sympto</strong> keeps your health connected, understandable, and under your control.</div>
  </div></main></ProtectedRoute>;
}
