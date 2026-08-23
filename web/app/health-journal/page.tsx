"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Watch,
} from "lucide-react";

import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import {
  healthHomeService,
  type GeneratedJournal,
} from "@/services/health-home.service";

function formatMeasurementType(type: string) {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function HealthJournalPage() {
  const { data: dashboard, loading: dashboardLoading, error: dashboardError } = useDashboard();
  const [generatedJournal, setGeneratedJournal] = useState<GeneratedJournal | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const generateJournal = useCallback(async () => {
    try {
      setGenerating(true);
      setGenerationError(null);
      const journal = await healthHomeService.generateDailyJournal();
      setGeneratedJournal(journal);
    } catch (error) {
      console.error("Failed to generate daily journal:", error);
      setGenerationError("We could not compile today's journal yet. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    if (!dashboardLoading && dashboard) void generateJournal();
  }, [dashboardLoading, dashboard, generateJournal]);

  const signals = dashboard?.journal?.signals ?? [];
  const recentSymptoms = dashboard?.journal?.recentSymptoms ?? [];
  const upcomingAppointments = dashboard?.appointments ?? [];
  const goals = dashboard?.healthGoals ?? dashboard?.goals ?? [];
  const devices = dashboard?.healthSnapshot?.connectedDevices ?? [];
  const firstName = dashboard?.profile?.preferredName || dashboard?.profile?.firstName || "there";
  const signalCards = useMemo(() => signals.slice(0, 8), [signals]);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#F8FAFC]">
        <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6 lg:px-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#0B5CAD]">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#EAF3FB] px-2.5 py-1 text-xs font-semibold text-[#0B5CAD]">
                <Sparkles className="h-3.5 w-3.5" />
                Smart Health Journal
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Your health story, built for you</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Hi {firstName}. Sympto gathers the health information you already log across the platform and connected devices, then compiles it into your daily journal automatically.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void generateJournal()}
              disabled={generating || dashboardLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B5CAD] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#084987] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Compiling..." : "Refresh today's journal"}
            </button>
          </div>

          {(dashboardLoading || generating) && (
            <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm">Sympto is compiling the latest health signals for you...</div>
          )}

          {(dashboardError || generationError) && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">{generationError || "We could not load your health journal right now."}</div>
          )}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-[#F5FAFE] to-white p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF3FB] text-[#0B5CAD]"><ClipboardList className="h-5 w-5" /></div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-900">Today&apos;s automatically compiled journal</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3" />No typing required</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Built from information already captured by Sympto.</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {generatedJournal ? (
                <>
                  <div className="whitespace-pre-line rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{generatedJournal.journal}</div>
                  <p className="mt-3 text-xs text-slate-400">Last compiled {formatDate(generatedJournal.updatedAt)}</p>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                  <Sparkles className="mx-auto h-7 w-7 text-[#0B5CAD]" />
                  <p className="mt-3 text-sm font-semibold text-slate-800">Your automatic summary will appear here.</p>
                  <p className="mt-1 text-xs text-slate-500">Sympto will use the information already available in your account.</p>
                </div>
              )}
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-900">What Sympto collected</h2>
                <p className="mt-1 text-xs text-slate-400">These are sources, not extra journal fields for you to complete.</p>
              </div>
              <span className="rounded-full bg-[#EAF3FB] px-2.5 py-1 text-[11px] font-semibold text-[#0B5CAD]">{dashboard?.journal?.sourceCount ?? 0} signals</span>
            </div>
            {signalCards.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No wearable or measurement signals are available yet. As you connect devices or use other health features, this section will populate automatically.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {signalCards.map((signal) => (
                  <div key={`${signal.type}-${signal.measuredAt}`} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600"><HeartPulse className="h-4 w-4" /></div>
                      <div><p className="text-sm font-semibold text-slate-800">{formatMeasurementType(signal.type)}</p><p className="text-[11px] text-slate-400">{formatDate(signal.measuredAt)}</p></div>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{signal.value} {signal.unit}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Watch className="h-5 w-5" /></div>
                <div><h2 className="font-bold text-slate-900">Connected devices</h2><p className="text-xs text-slate-400">Background data sources</p></div>
              </div>
              <div className="mt-4 space-y-3">
                {devices.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No connected wearable or health devices yet.</p> : devices.map((device) => (
                  <div key={device.id} className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-800">{device.manufacturer} {device.model}</p><span className="text-[11px] font-semibold text-emerald-600">{device.status}</span></div>
                    <p className="mt-1 text-xs text-slate-400">{device.measurementCount} measurements · Last sync {formatDate(device.lastSyncAt)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Activity className="h-5 w-5" /></div>
                <div><h2 className="font-bold text-slate-900">Recent health activity</h2><p className="text-xs text-slate-400">Already part of your journey</p></div>
              </div>
              <div className="mt-4 space-y-3">
                {recentSymptoms.length === 0 && upcomingAppointments.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nothing new has been recorded recently.</p> : <>
                  {recentSymptoms.slice(0, 3).map((item: any) => <div key={item.id} className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">{item.title || item.symptoms?.join(", ") || "Symptom activity"}</p><p className="mt-1 text-xs text-slate-400">{item.severity ? `Severity: ${String(item.severity).toLowerCase()}` : "Symptom recorded"}</p></div>)}
                  {upcomingAppointments.slice(0, 2).map((appointment: any) => <div key={appointment.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><CalendarDays className="h-4 w-4 text-[#0B5CAD]" /><div><p className="text-sm font-semibold text-slate-800">Upcoming appointment</p><p className="text-xs text-slate-400">{formatDate(appointment.scheduledStart)}</p></div></div>)}
                </>}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Target className="h-5 w-5" /></div>
                <div><h2 className="font-bold text-slate-900">Goals the journal is following</h2><p className="text-xs text-slate-400">Progress is measured from your health activity.</p></div>
              </div>
              <Link href="/health-goals" className="text-sm font-semibold text-[#0B5CAD]">Manage goals</Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {goals.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 sm:col-span-2">No active goals yet.</p> : goals.slice(0, 4).map((goal: any) => {
                const progress = goal.latestProgress?.progressPercent;
                return <div key={goal.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-800">{goal.title}</p><span className="text-xs font-bold text-[#0B5CAD]">{progress != null ? `${Number(progress)}%` : "Tracking"}</span></div>{progress != null && <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0B5CAD]" style={{ width: `${Math.min(100, Math.max(0, Number(progress)))}%` }} /></div>}</div>;
              })}
            </div>
          </section>

          <div className="mt-6 flex items-center justify-center gap-2 pb-6 text-center text-xs text-slate-400"><ShieldCheck className="h-4 w-4" />Your journal is compiled from your existing Sympto health data.</div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
