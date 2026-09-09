"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, FileText, HeartPulse, History, Pill, Sparkles, TriangleAlert } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";

function ActionCard({
  href,
  title,
  description,
  icon: Icon,
  tone,
  detail,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof HeartPulse;
  tone: "today" | "passport" | "history";
  detail?: React.ReactNode;
}) {
  const styles = {
    today: "border-[#24c1c4]/25 bg-gradient-to-br from-white to-[#effcfc] hover:border-[#24c1c4]/50",
    passport: "border-rose-200/70 bg-gradient-to-br from-white to-rose-50/50 hover:border-rose-300",
    history: "border-blue-200/70 bg-gradient-to-br from-white to-blue-50/50 hover:border-blue-300",
  }[tone];
  const iconStyles = {
    today: "bg-[#24c1c4]/15 text-[#0b2d54]",
    passport: "bg-rose-100 text-rose-700",
    history: "bg-blue-100 text-blue-700",
  }[tone];

  return (
    <Link
      href={href}
      className={`group block min-h-[190px] rounded-[28px] border p-6 shadow-[0_10px_35px_rgba(11,45,84,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(11,45,84,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]/60 ${styles}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${iconStyles}`}>
          <Icon className="h-7 w-7" />
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[#0b2d54] shadow-sm transition-transform group-hover:translate-x-1">
          <ArrowRight className="h-5 w-5" />
        </span>
      </div>
      <h2 className="mt-6 text-xl font-bold tracking-tight text-[#0b2d54]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {detail && <div className="mt-4">{detail}</div>}
    </Link>
  );
}

export default function HealthHome() {
  const { data, loading, error, reload } = useDashboard();

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5f8fb] p-4 sm:p-8">
          <div className="mx-auto max-w-5xl space-y-5" aria-busy="true">
            <div className="h-40 animate-pulse rounded-[28px] bg-white" />
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-52 animate-pulse rounded-[28px] bg-white" />
              ))}
            </div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error || !data) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5f8fb] p-4 sm:p-8">
          <div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <TriangleAlert className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-xl font-bold text-[#0b2d54]">We couldn't load your health home</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Your health information has not been changed. Please try again.</p>
            <button onClick={reload} className="mt-5 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#071f3a]">Try again</button>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  const firstName = data.patient?.firstName || data.profile?.preferredName || data.profile?.firstName || "there";
  const medicationCount = data.today?.activeMedications?.length ?? 0;
  const appointmentCount = data.today?.upcomingAppointments?.length ?? 0;
  const goalCount = data.goals?.filter((goal) => String(goal.status).toUpperCase() !== "ACHIEVED").length ?? 0;
  const attentionCount = data.attention?.length ?? 0;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb] text-slate-800">
        <header className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto flex h-[68px] max-w-5xl items-center justify-between px-4 sm:px-6">
            <img src="/logo-navbar.png" alt="Sympto" className="h-10 w-auto" />
            <span className="rounded-full bg-[#0b2d54]/5 px-3.5 py-1.5 text-xs font-bold text-[#0b2d54]">My Health</span>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
          <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0b2d54] via-[#103e69] to-[#24c1c4] p-7 text-white shadow-[0_20px_50px_rgba(11,45,84,0.16)] sm:p-10">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="relative max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                <Sparkles className="h-4 w-4" />
                My Health
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Hello, {firstName}</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">Everything you need is organised for you. Just choose what you want to do.</p>
            </div>
          </section>

          <section className="mt-7 grid gap-4 md:grid-cols-3">
            <ActionCard
              href="/today"
              title="What do I do today?"
              description="See what needs your attention now — medicines, clinic visits, goals and helpful reminders are brought together automatically."
              icon={CheckCircle2}
              tone="today"
              detail={<div className="flex flex-wrap gap-2 text-xs font-semibold text-[#0b2d54]"><span className="rounded-full bg-white/80 px-3 py-1.5">{medicationCount} medicine{medicationCount === 1 ? "" : "s"}</span><span className="rounded-full bg-white/80 px-3 py-1.5">{appointmentCount} visit{appointmentCount === 1 ? "" : "s"}</span>{goalCount > 0 && <span className="rounded-full bg-white/80 px-3 py-1.5">{goalCount} goal{goalCount === 1 ? "" : "s"}</span>}{attentionCount > 0 && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800">{attentionCount} needs attention</span>}</div>}
            />
            <ActionCard
              href="/health-passport"
              title="My Clinic Card"
              description="Your important health information in one simple place. Show this to a nurse or doctor when you need care."
              icon={HeartPulse}
              tone="passport"
              detail={<div className="flex items-center gap-2 text-xs font-semibold text-rose-800"><FileText className="h-4 w-4" /> Your health information stays organised automatically</div>}
            />
            <ActionCard
              href="/health-journal"
              title="My History & Files"
              description="Your health story, visits and saved information are kept together in one simple timeline."
              icon={History}
              tone="history"
              detail={<div className="flex items-center gap-2 text-xs font-semibold text-blue-800"><CalendarDays className="h-4 w-4" /> Your records build up automatically</div>}
            />
          </section>

          <p className="mt-7 text-center text-xs text-slate-400">You don't need to understand medical terms. Sympto organises your health information for you.</p>
        </div>
      </main>
    </ProtectedRoute>
  );
}
