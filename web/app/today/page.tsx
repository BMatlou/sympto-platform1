"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Pill, Target, Sparkles } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import DailyHealthCheckIn from "@/components/dashboard/daily-health-check-in";

function text(value: unknown, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function appointmentLabel(appointment: any) {
  return text(appointment?.reason || appointment?.appointmentType, "Clinic visit").replaceAll("_", " ");
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function TodayPage() {
  const { data, loading, error, reload } = useDashboard();

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5fafb] p-4 sm:p-8">
          <div className="mx-auto max-w-[1260px] space-y-5" aria-busy="true">
            <div className="h-[58px] animate-pulse rounded-[24px] bg-white" />
            <div className="h-[270px] animate-pulse rounded-[30px] bg-white" />
            <div className="h-32 animate-pulse rounded-[26px] bg-white" />
            <div className="h-[560px] animate-pulse rounded-[27px] bg-white" />
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
  const goals = (data.goals ?? []).filter((goal: any) => String(goal.status).toUpperCase() === "ACTIVE");
  const todayAppointments = appointments.filter((appointment: any) => {
    if (!appointment?.scheduledStart) return false;
    const date = new Date(String(appointment.scheduledStart));
    return date.toDateString() === new Date().toDateString();
  });
  const goalsDueSoon = goals.filter((goal: any) => goal.targetDate && new Date(String(goal.targetDate)) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const todayNotifications = data.today?.notifications ?? data.notifications ?? [];
  const attention = data.attention ?? [];
  const nextAppointment = appointments[0] ?? null;
  const medicine = medications[0] ?? null;
  const totalTodayItems = attention.length + todayAppointments.length + goalsDueSoon.length + (medications.length > 0 ? 1 : 0) + todayNotifications.length;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5fafb] text-[#17314e]">
        <div className="mx-auto max-w-[1260px] px-4 pb-12 pt-4 sm:px-7 sm:pt-6">
          <header className="mb-5 flex items-center justify-between">
            <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#0b2d54] transition hover:bg-white">
              <ArrowLeft className="h-4 w-4" />
              My Health
            </Link>
            <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#71839a] shadow-sm ring-1 ring-[#e0ebef]">Today</span>
          </header>

          <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#08284a] via-[#0e4773] to-[#24babe] p-7 text-white shadow-[0_20px_55px_rgba(11,45,84,0.12)] sm:p-9">
            <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full border border-white/10 shadow-[0_0_0_24px_rgba(255,255,255,0.025)]" />
            <div className="relative">
              <p className="text-sm font-medium text-white/75">Hi {firstName}</p>
              <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">What do I do today?</h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Sympto has brought together the things that actually need your attention, without making you search for them.</p>
                </div>
                <Link href="/log-symptom" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/12 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/18">
                  <Sparkles className="h-4 w-4" />
                  Log a symptom
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 ring-1 ring-white/10">{totalTodayItems} {totalTodayItems === 1 ? "item" : "items"} organised</span>
                {attention.length > 0 && <span className="rounded-full bg-red-400/15 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-red-200/20">{attention.length} need review</span>}
              </div>
            </div>
          </section>

          <div className="mt-7 flex items-end justify-between gap-5">
            <h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Today, organised</h2>
            <p className="text-right text-[11px] text-[#74859a]">A small check-in gives Sympto a better picture of your day.</p>
          </div>

          <section className="mt-3.5 grid items-center gap-3.5 rounded-[26px] border border-[#dfebef] bg-white p-5 shadow-[0_6px_20px_rgba(11,45,84,.035)] sm:grid-cols-2 sm:p-[22px]">
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b2d54]"><Pill className="h-5 w-5" /></div>
              <div><h3 className="text-[17px] font-black text-[#0b2d54]">Your plan</h3><p className="mt-1 text-xs text-[#74859a]">{medicine ? "One important treatment to keep in view." : "Your current treatment plan will appear here."}</p></div>
            </div>
            <Link href="/medications" className="flex items-center justify-between gap-3 rounded-[19px] bg-[#f5fafb] px-4 py-3.5 transition hover:bg-[#edf7f8]">
              <div><div className="text-[13px] font-black text-[#0b2d54]">{medicine ? `Medicine · ${text(medicine?.medication?.name, "Your medicine")}` : "Medicine · No active medicine"}</div><div className="mt-1 text-[11px] text-[#74859a]">{medicine ? `${text(medicine?.dosage, "Dose not recorded")} · ${text(medicine?.frequency, "Schedule not recorded")}` : "Your medication plan will appear here."}</div></div>
              <span className="whitespace-nowrap rounded-xl border border-[#d7e9ec] bg-white px-2.5 py-2 text-[10px] font-black text-[#24c1c4]">View plan →</span>
            </Link>
          </section>

          <div className="mt-7 flex items-end justify-between gap-5">
            <h2 className="text-xl font-black tracking-[-.045em] text-[#0b2d54]">Daily health check-in</h2>
            <p className="text-right text-[11px] text-[#74859a]">Your answers become structured Health Journal data.</p>
          </div>

          <div className="mt-3.5">
            <DailyHealthCheckIn embedded goals={goals} />
          </div>

          <section className="mt-4 grid gap-[15px] sm:grid-cols-2">
            <Link href="/appointments" className="relative overflow-hidden rounded-[27px] bg-[#0b2d54] p-[22px] text-white shadow-[0_16px_42px_rgba(11,45,84,.09)] transition hover:-translate-y-0.5">
              <div className="pointer-events-none absolute -bottom-[115px] -right-[100px] h-[190px] w-[190px] rounded-full bg-[#24c1c4]/15" />
              <div className="relative z-10"><h3 className="text-[17px] font-black">Next care visit</h3><p className="mt-2 max-w-md text-xs leading-[1.55] text-white/65">Your appointments will appear here when a visit is scheduled.</p><div className="mt-3.5 flex items-center gap-2.5 border-t border-white/10 py-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-[#24c1c4]"><CalendarDays className="h-4 w-4" /></span><div><b className="block text-xs">{nextAppointment ? appointmentLabel(nextAppointment) : "No visit scheduled"}</b><span className="mt-1 block text-[10px] text-white/55">{nextAppointment ? formatDate(nextAppointment.scheduledStart) : "Keep your care timeline up to date."}</span></div></div><span className="mt-2 inline-flex rounded-[13px] bg-[#24c1c4] px-3 py-2.5 text-[11px] font-black text-[#0b2d54]">View appointments →</span></div>
            </Link>

            <Link href="/health-goals" className="rounded-[27px] border border-[#dfebef] bg-white p-[22px] shadow-[0_6px_20px_rgba(11,45,84,.035)] transition hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-4"><div><h3 className="text-[17px] font-black text-[#0b2d54]">Health goals</h3><p className="mt-2 text-xs leading-5 text-[#74859a]">Keep your longer-term goals moving.</p></div><span className="rounded-[11px] bg-[#edf4ff] px-2.5 py-2 text-[10px] font-black text-[#3f75bd]">{goals.length} active goal{goals.length === 1 ? "" : "s"}</span></div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eef3f4] pt-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf4ff] text-[#3f75bd]"><Target className="h-4 w-4" /></span><div><b className="block text-sm text-[#0b2d54]">{goals[0]?.title ? text(goals[0].title) : "Build a healthier rhythm"}</b><span className="mt-1 block text-[11px] text-[#74859a]">Progress is built one day at a time.</span></div></div><ArrowRight className="h-4 w-4 text-[#0b2d54]" /></div>
              <span className="mt-4 inline-block text-xs font-black text-[#0b2d54]">Open health goals →</span>
            </Link>
          </section>

          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[#74859a]">✦ <strong className="text-[#0b2d54]">Sympto</strong> keeps your health connected, understandable, and under your control.</div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
