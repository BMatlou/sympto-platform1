"use client";

import Link from "next/link";
import { ArrowLeft, Bell, CalendarDays, CheckCircle2, Pill, TriangleAlert } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function label(value: unknown) {
  return value ? String(value).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Notification";
}

export default function NotificationsPage() {
  const { data, loading, error, reload } = useDashboard();
  const notifications = data?.notifications ?? [];

  return <ProtectedRoute><main className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to Health Home</Link></div></header>
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0b2d54]"><Bell className="h-3.5 w-3.5" />Notifications</div><h1 className="text-3xl font-bold tracking-tight text-[#0b2d54]">Your notifications</h1><p className="mt-2 text-slate-500">Medication reminders, care updates and other activity from your Sympto health record.</p></div>
      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your notifications...</div>}
      {error && !loading && <div className="rounded-2xl border border-red-200 bg-white p-6"><h2 className="font-semibold text-[#0b2d54]">We couldn't load your notifications</h2><button onClick={reload} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>}
      {!loading && !error && notifications.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><Bell className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-4 font-semibold text-[#0b2d54]">You're all caught up</h2><p className="mt-2 text-sm text-slate-500">New reminders and health activity will appear here automatically.</p></div>}
      {!loading && !error && notifications.length > 0 && <div className="space-y-3">{notifications.map((notification) => { const isMedication = notification.type.toUpperCase().includes("MEDICATION") || notification.title.toLowerCase().includes("medication") || notification.body.toLowerCase().includes("medication"); return <article key={notification.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]">{isMedication ? <Pill className="h-5 w-5" /> : notification.priority.toUpperCase() === "HIGH" ? <TriangleAlert className="h-5 w-5" /> : <Bell className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-[#0b2d54]">{notification.title}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{label(notification.status)}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{notification.body}</p><div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400"><span>{formatDate(notification.scheduledFor || notification.createdAt)}</span>{notification.channel && <span>{label(notification.channel)}</span>}</div>{notification.actionUrl && <Link href={notification.actionUrl} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0b2d54] underline underline-offset-2">{notification.actionLabel || "View"}</Link>}</div></div></article>; })}</div>}
      <div className="mt-8 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#24c1c4]" /><div><h3 className="font-semibold text-[#0b2d54]">Notifications are part of your health record</h3><p className="mt-1 text-sm leading-6 text-slate-500">Sympto uses your authorised notification and reminder preferences to keep important health activity visible.</p></div></div></div>
    </div>
  </main></ProtectedRoute>;
}
