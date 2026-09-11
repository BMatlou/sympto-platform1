"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Bell, CalendarDays, CheckCircle2, ClipboardCheck, Pill, Target, Sparkles } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import DailyHealthCheckIn from "@/components/dashboard/daily-health-check-in";

function text(value: unknown, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function formatDate(value: unknown, includeTime = true) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-ZA", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

export default function TodayPage() {
  const { data, loading, error, reload } = useDashboard();

  if (loading) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f5fafb] p-4 sm:p-8"><div className="mx-auto max-w-[1260px] space-y-5" aria-busy="true"><div className="h-[58px] animate-pulse rounded-[24px] bg-white" /><div className="h-[270px] animate-pulse rounded-[30px] bg-white" /><div className="h-32 animate-pulse rounded-[26px] bg-white" /><div className="h-[560px] animate-pulse rounded-[27px] bg-white" /></div></main></ProtectedRoute>;
  }

  if (error || !data) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f5fafb] p-4 sm:p-8"><div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-white p-7"><h1 className="text-xl font-black text-[#0b2d54]">We couldn&apos;t load today</h1><p className="mt-2 text-sm leading-6 text-slate-500">Your saved health information has not been changed. Please try again.</p><button type="button" onClick={reload} className="mt-5 min-h-11 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-semibold text-white">Try again</button></div></main></ProtectedRoute>;
  }

  const firstName = data.patient?.firstName || data.profile?.preferredName || "there";
  const medications = data.today?.activeMedications ?? [];
  const appointments = data.today?.upcomingAppointments ?? [];
  const goals = (data.goals ?? []).filter((goal: any) => String(goal.status).toUpperCase() === "ACTIVE");
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
    ...goalsDueSoon.slice(0, 3).map((goal: any) => ({ key: `goal-${goal.id}`, href: "/health-goals", label: "Goal", title: text(goal.title, "Health goal"), detail: goal.targetDate ? `Due ${formatDate(goal.targetDate, false)}` : "Active goal", tone: "bg-[#e9f8f1] text-[#168660]" })),
    ...notifications.filter((item: any) => item.actionUrl || ["HIGH", "URGENT"].includes(String(item.priority ?? "").toUpperCase())).slice(0, 3).map((item: any) => ({ key: `notification-${item.id}`, href: String(item.actionUrl || "/today"), label: "Reminder", title: text(item.title, "Reminder"), detail: text(item.body), tone: "bg-amber-50 text-amber-700" })),
    ...medications.slice(1, 5).map((medication: any, index: number) => ({ key: `medication-${medication.id || index}`, href: "/medications", label: "Medicine", title: text(medication?.medication?.name, "Your medicine"), detail: `${text(medication?.dosage, "Dose not recorded")} · ${text(medication?.frequency, "Schedule not recorded")}`, tone: "bg-[#e9f9fa] text-[#0b6f73]" })),
  ];
  const medicine = medications[0] ?? null;
  const totalTodayItems = actionItems.length + (medicine ? 1 : 0);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5fafb] text-[#17314e]">
        <div className="mx-auto max-w-[1260px] px-4 pb-12 pt-4 sm:px-7 sm:pt-6">
          <header className="mb-5 flex items-center justify-between"><Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#0b2d54] transition hover:bg-white"><ArrowLeft className="h-4 w-4" />My Health</Link><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#71839a] shadow-sm ring-1 ring-[#e0ebef]">Today</span></header>
          <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#08284a] via-[#0e4773] to-[#24babe] p-7 text-white shadow-[0_20px_55px_rgba(11,45,84,0.12)] sm:p-9"><div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full border border-white/10 shadow-[0_0_0_24px_rgba(255,255,255,0.025)]" /><div className="relative"><p className="text-sm font-medium text-white/75">Hi {firstName}</p><div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">What do I do today?</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Sympto has brought together the things that actually need your attention, without making you search for them.</p></div><Link href="/log-symptom" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/12 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/18"><Sparkles className="h-4 w-4" />Log a symptom</Link></div><div className="mt-7 flex flex-wrap gap-2.5"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 ring-1 ring-white/10">{totalTodayItems} {totalTodayItems === 1 ? "item" : "items"} organised</span>{attention.length > 0 && <span className="rounded-full bg-red-400/15 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-red-200/20">{attention.length} need review</span>}</div></div></section>
          <div className="mt-7 flex items-end justify-between gap-5"><h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Today, organised</h2><p className="text-right text-[11px] text-[#74859a]">A small check-in gives Sympto a better picture of your day.</p></div>
          <section className="mt-3.5 overflow-hidden rounded-[26px] border border-[#dfebef] bg-white shadow-[0_6px_20px_rgba(11,45,84,.035)]"><div className="grid items-center gap-3.5 p-5 sm:grid-cols-2 sm:p-[22px]"><div className="flex items-center gap-3.5"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b2d54]"><Pill className="h-5 w-5" /></div><div><h3 className="text-[17px] font-black text-[#0b2d54]">Your plan</h3><p className="mt-1 text-xs text-[#74859a]">{medicine ? "One important treatment to keep in view." : "Your current treatment plan will appear here."}</p></div></div><Link href="/medications" className="flex items-center justify-between gap-3 rounded-[19px] bg-[#f5fafb] px-4 py-3.5 transition hover:bg-[#edf7f8]"><div><div className="text-[13px] font-black text-[#0b2d54]">{medicine ? `Medicine · ${text(medicine?.medication?.name, "Your medicine")}` : "Medicine · No active medicine"}</div><div className="mt-1 text-[11px] text-[#74859a]">{medicine ? `${text(medicine?.dosage, "Dose not recorded")} · ${text(medicine?.frequency, "Schedule not recorded")}` : "Your medication plan will appear here."}</div></div><span className="whitespace-nowrap rounded-xl border border-[#d7e9ec] bg-white px-2.5 py-2 text-[10px] font-black text-[#24c1c4]">View plan →</span></Link></div>{actionItems.length > 0 && <div className="divide-y divide-[#edf2f5] border-t border-[#edf2f5]">{actionItems.map((item: any) => <Link key={item.key} href={item.href} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-[#f8fbfc] sm:px-[22px]"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${item.tone}`}>{item.label === "Appointment" ? <CalendarDays className="h-4 w-4" /> : item.label === "Care plan" ? <ClipboardCheck className="h-4 w-4" /> : item.label === "Reminder" ? <Bell className="h-4 w-4" /> : item.label === "Medicine" ? <Pill className="h-4 w-4" /> : item.label === "Goal" ? <Target className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[#8a99a8]">{item.label}</span><span className="mt-1 block text-sm font-bold text-[#0b2d54]">{item.title}</span><span className="mt-1 block truncate text-[11px] text-[#74859a]">{item.detail}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-[#91a0ad] transition group-hover:translate-x-1 group-hover:text-[#0b2d54]" /></Link>)}</div>}</section>
          <div className="mt-7 flex items-end justify-between gap-5"><h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Daily health check-in</h2><p className="text-right text-[11px] text-[#74859a]">Your answers become structured Health Journal data.</p></div><div className="mt-3.5"><DailyHealthCheckIn embedded goals={goals} /></div>
          <section className="mt-4 rounded-[27px] border border-[#dfebef] bg-white p-[22px] shadow-[0_6px_20px_rgba(11,45,84,.035)]"><div className="flex items-start justify-between gap-4"><div><h3 className="text-[17px] font-black text-[#0b2d54]">Health goals</h3><p className="mt-2 text-xs leading-5 text-[#74859a]">Keep your longer-term goals moving.</p></div><Link href="/health-goals" className="rounded-[11px] bg-[#edf4ff] px-2.5 py-2 text-[10px] font-black text-[#3f75bd]">{goals.length} active goal{goals.length === 1 ? "" : "s"}</Link></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eef3f4] pt-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf4ff] text-[#3f75bd]"><Target className="h-4 w-4" /></span><div><b className="block text-sm text-[#0b2d54]">{goals[0]?.title ? text(goals[0].title) : "Build a healthier rhythm"}</b><span className="mt-1 block text-[11px] text-[#74859a]">Progress is built one day at a time.</span></div></div><ArrowRight className="h-4 w-4 text-[#0b2d54]" /></div><Link href="/health-goals" className="mt-4 inline-block text-xs font-black text-[#0b2d54]">Open health goals →</Link></section>
          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[#74859a]">✦ <strong className="text-[#0b2d54]">Sympto</strong> keeps your health connected, understandable, and under your control.</div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
