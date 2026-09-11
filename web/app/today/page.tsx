"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Pill,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";

function formatDate(value: unknown, includeTime = true) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(
    "en-ZA",
    includeTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" },
  ).format(date);
}

function text(value: unknown, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function isToday(value: unknown, now = new Date()) {
  if (!value) return false;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return false;
  return date >= startOfDay(now) && date <= endOfDay(now);
}

function isIncompleteTask(status: unknown) {
  const normalized = String(status ?? "").toUpperCase();
  return normalized !== "COMPLETED" && normalized !== "CANCELLED";
}

export default function TodayPage() {
  const { data, loading, error, reload } = useDashboard();

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5f8fb] p-4 sm:p-8">
          <div className="mx-auto max-w-4xl space-y-4" aria-busy="true">
            <div className="h-16 animate-pulse rounded-[24px] bg-white" />
            <div className="h-52 animate-pulse rounded-[30px] bg-white" />
            <div className="h-[520px] animate-pulse rounded-[30px] bg-white" />
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error || !data) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5f8fb] p-4 sm:p-8">
          <div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-white p-7">
            <TriangleAlert className="h-6 w-6 text-red-600" />
            <h1 className="mt-4 text-xl font-bold text-[#0b2d54]">We couldn't load today</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your saved health information has not been changed. Please try again.
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-5 min-h-11 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123d66]"
            >
              Try again
            </button>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  const now = new Date();
  const firstName = data.patient?.firstName || data.profile?.preferredName || "there";
  const medications = data.today?.activeMedications ?? [];
  const appointments = data.today?.upcomingAppointments ?? [];
  const goals = (data.goals ?? []).filter(
    (goal) => String(goal.status).toUpperCase() === "ACTIVE",
  );
  const notifications = data.today?.notifications ?? data.notifications ?? [];
  const attention = data.attention ?? [];
  const carePlans = data.carePlans ?? [];

  const todayAppointments = appointments.filter((appointment) => isToday(appointment.scheduledStart, now));
  const nextAppointment = appointments[0] ?? null;

  const careTasks = carePlans
    .flatMap((plan: any) =>
      (Array.isArray(plan.tasks) ? plan.tasks : []).map((task: any) => ({
        ...task,
        carePlanTitle: plan.title,
      })),
    )
    .filter((task: any) => isIncompleteTask(task.status))
    .sort((a: any, b: any) => {
      const aTime = a.dueDate ? new Date(String(a.dueDate)).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.dueDate ? new Date(String(b.dueDate)).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

  const todayCareTasks = careTasks.filter((task: any) => task.dueDate && new Date(String(task.dueDate)) <= endOfDay(now));
  const goalsDueSoon = goals
    .filter((goal: any) => goal.targetDate && new Date(String(goal.targetDate)) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
    .slice(0, 4);

  const todayNotificationItems = notifications.filter((notification: any) => {
    if (!notification.scheduledFor) return true;
    return new Date(String(notification.scheduledFor)) <= endOfDay(now);
  });

  const totalTodayItems =
    attention.length +
    todayAppointments.length +
    todayCareTasks.length +
    goalsDueSoon.length +
    (medications.length > 0 ? 1 : 0) +
    todayNotificationItems.length;

  const actionRows: Array<{
    key: string;
    href: string;
    label: string;
    title: string;
    detail: string;
    icon: typeof Pill;
    tone: string;
  }> = [];

  todayAppointments.slice(0, 2).forEach((appointment: any) => {
    actionRows.push({
      key: `appointment-${appointment.id}`,
      href: "/appointments",
      label: "Visit",
      title: text(appointment.title || appointment.type, "Clinic visit"),
      detail: formatDate(appointment.scheduledStart),
      icon: CalendarDays,
      tone: "bg-[#edf4ff] text-[#3f75bd]",
    });
  });

  todayCareTasks.slice(0, 3).forEach((task: any) => {
    actionRows.push({
      key: `task-${task.id}`,
      href: "/care-plans",
      label: "Care plan",
      title: text(task.title, "Care task"),
      detail: task.dueDate ? `Due ${formatDate(task.dueDate, false)}` : text(task.carePlanTitle, "Care plan"),
      icon: ClipboardCheck,
      tone: "bg-violet-50 text-violet-700",
    });
  });

  goalsDueSoon.slice(0, 2).forEach((goal: any) => {
    actionRows.push({
      key: `goal-${goal.id}`,
      href: "/health-goals",
      label: "Goal",
      title: text(goal.title, "Health goal"),
      detail: goal.targetDate ? `Due ${formatDate(goal.targetDate, false)}` : "Active goal",
      icon: Target,
      tone: "bg-[#e8f8f1] text-[#168660]",
    });
  });

  if (medications.length > 0) {
    actionRows.push({
      key: "medications",
      href: "/medications",
      label: "Medicine",
      title: medications.length === 1 ? text(medications[0]?.medication?.name, "Your medicine") : `${medications.length} active medicines`,
      detail:
        medications.length === 1
          ? `${text(medications[0]?.dosage, "Dose not recorded")}${medications[0]?.frequency ? ` · ${String(medications[0].frequency)}` : ""}`
          : "Review your current medication plan",
      icon: Pill,
      tone: "bg-[#e9f9fa] text-[#0b6f73]",
    });
  }

  const notificationRows = todayNotificationItems
    .filter((notification: any) => notification.actionUrl || notification.priority === "HIGH" || notification.priority === "URGENT")
    .slice(0, 3);

  notificationRows.forEach((notification: any) => {
    actionRows.push({
      key: `notification-${notification.id}`,
      href: String(notification.actionUrl || "/today"),
      label: "Reminder",
      title: text(notification.title, "Reminder"),
      detail: text(notification.body),
      icon: Bell,
      tone: "bg-amber-50 text-amber-700",
    });
  });

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb] text-[#14304d]">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
          <header className="mb-5 flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#0b2d54] transition hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              My Health
            </Link>
            <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#71839a] shadow-sm ring-1 ring-[#e0ebef]">
              Today
            </span>
          </header>

          <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#08284a] via-[#0e4773] to-[#24babe] p-7 text-white shadow-[0_20px_55px_rgba(11,45,84,0.12)] sm:p-9">
            <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full border border-white/10 shadow-[0_0_0_24px_rgba(255,255,255,0.025)]" />
            <div className="relative">
              <p className="text-sm font-medium text-white/75">Hi {firstName}</p>
              <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">What do I do today?</h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                    Sympto has brought together the things that actually need your attention, without making you search for them.
                  </p>
                </div>
                <Link
                  href="/log-symptom"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/12 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/18"
                >
                  <Sparkles className="h-4 w-4" />
                  Log a symptom
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 ring-1 ring-white/10">
                  {totalTodayItems} {totalTodayItems === 1 ? "item" : "items"} organised
                </span>
                {attention.length > 0 && (
                  <span className="rounded-full bg-red-400/15 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-red-200/20">
                    {attention.length} need review
                  </span>
                )}
              </div>
            </div>
          </section>

          {attention.length > 0 && (
            <section className="mt-5 rounded-[26px] border border-amber-200 bg-amber-50 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-amber-700 shadow-sm ring-1 ring-amber-200">
                  <TriangleAlert className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-black text-amber-950">Needs your attention</h2>
                  <p className="mt-0.5 text-xs text-amber-800/70">These items have been flagged by your health information.</p>
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                {attention.slice(0, 5).map((item: any, index: number) => (
                  <Link
                    key={`${item.type}-${item.title}-${index}`}
                    href={String(item.actionUrl || "/health-journal")}
                    className="group flex items-start justify-between gap-4 rounded-2xl bg-white/85 px-4 py-3.5 ring-1 ring-amber-100 transition hover:bg-white"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0b2d54]">{text(item.title, "Attention needed")}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{text(item.description)}</p>
                    </div>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 transition group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-5 overflow-hidden rounded-[28px] border border-[#e0ebef] bg-white shadow-[0_12px_35px_rgba(11,45,84,0.055)]">
            <div className="flex items-end justify-between gap-4 border-b border-[#edf2f5] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#71839a]">Your plan</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[#0b2d54]">Today, organised</h2>
              </div>
              <Link href="/health-journal" className="text-xs font-bold text-[#71839a] transition hover:text-[#0b2d54]">
                See health story
              </Link>
            </div>

            {actionRows.length > 0 ? (
              <div className="divide-y divide-[#edf2f5]">
                {actionRows.slice(0, 8).map((row) => {
                  const Icon = row.icon;
                  return (
                    <Link
                      key={row.key}
                      href={row.href}
                      className="group flex items-center gap-4 px-5 py-4 transition hover:bg-[#f8fbfc] sm:px-6"
                    >
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${row.tone}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a99a8]">{row.label}</span>
                          {row.label === "Care plan" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#71839a]">
                              <Clock3 className="h-3 w-3" />
                              {row.detail}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block truncate text-sm font-bold text-[#0b2d54]">{row.title}</span>
                        {row.label !== "Care plan" && <span className="mt-1 block truncate text-xs text-[#71839a]">{row.detail}</span>}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#9aa8b7] transition group-hover:translate-x-1 group-hover:text-[#0b2d54]" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e8f8f1] text-[#168660]">
                  <CheckCircle2 className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-lg font-black text-[#0b2d54]">You’re all caught up</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#71839a]">
                  There is nothing urgent waiting for you right now. Your health information is still available whenever you need it.
                </p>
              </div>
            )}
          </section>

          <section className="mt-5 grid gap-4 sm:grid-cols-2">
            <Link
              href="/appointments"
              className="group rounded-[24px] border border-[#e0ebef] bg-white p-5 shadow-[0_8px_25px_rgba(11,45,84,0.035)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(11,45,84,0.08)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4ff] text-[#3f75bd]">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-[#9aa8b7] transition group-hover:translate-x-1 group-hover:text-[#0b2d54]" />
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#71839a]">Next care visit</p>
              <h3 className="mt-1 text-base font-black text-[#0b2d54]">
                {nextAppointment ? text(nextAppointment.title || nextAppointment.type, "Clinic visit") : "No visit scheduled"}
              </h3>
              <p className="mt-1 text-xs leading-5 text-[#71839a]">
                {nextAppointment ? formatDate(nextAppointment.scheduledStart) : "Your appointments will appear here."}
              </p>
            </Link>

            <Link
              href="/health-goals"
              className="group rounded-[24px] border border-[#e0ebef] bg-white p-5 shadow-[0_8px_25px_rgba(11,45,84,0.035)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(11,45,84,0.08)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
                  <Target className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-[#9aa8b7] transition group-hover:translate-x-1 group-hover:text-[#0b2d54]" />
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#71839a]">Health goals</p>
              <h3 className="mt-1 text-base font-black text-[#0b2d54]">
                {goals.length === 1 ? "1 active goal" : `${goals.length} active goals`}
              </h3>
              <p className="mt-1 text-xs leading-5 text-[#71839a]">
                {goalsDueSoon.length > 0 ? `${goalsDueSoon.length} goal${goalsDueSoon.length === 1 ? "" : "s"} due soon.` : "Keep your longer-term health goals moving."}
              </p>
            </Link>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
