"use client";

import Link from "next/link";
import { ArrowLeft, Brain, CalendarDays, ChevronRight, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { api } from "@/lib/api";
import { useDashboard } from "@/hooks/use-dashboard";

function formatDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function unwrap<T>(value: any): T { return value?.data ?? value; }

export default function AIReportsPage() {
  const { data: dashboard, loading: dashboardLoading } = useDashboard();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const patientId = dashboard?.patient?.id;
    if (!patientId) {
      if (!dashboardLoading) setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/ai-analyses?patientId=${encodeURIComponent(patientId)}&page=1&limit=50`);
        const payload = unwrap<any>(response.data);
        setReports(Array.isArray(payload) ? payload : payload?.data ?? []);
      } catch (requestError) {
        console.error("Failed to load AI health reports:", requestError);
        setError("We could not load your AI health reports.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [dashboard?.patient?.id, dashboardLoading]);

  return <ProtectedRoute><main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#0b2d54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to Health Home</Link>
    <header className="mt-6 rounded-3xl border border-[#24c1c4]/20 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]"><Brain className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#24c1c4]">Sympto intelligence</p><h1 className="mt-1 text-3xl font-black tracking-tight text-[#0b2d54]">AI health reports</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Review previous AI-generated health analyses saved to your clinical record. These reports support your understanding and do not replace professional medical care.</p></div></div></header>
    <div className="mt-6">{(loading || dashboardLoading) && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your reports…</div>}{error && !loading && <div className="rounded-2xl border border-red-200 bg-white p-6"><p className="text-sm font-semibold text-red-700">{error}</p></div>}{!loading && !error && reports.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><FileText className="mx-auto h-9 w-9 text-slate-400" /><h2 className="mt-4 font-bold text-[#0b2d54]">No saved AI reports yet</h2><p className="mt-2 text-sm leading-6 text-slate-500">When an AI health analysis is saved to your record, it will appear here.</p><Link href="/health-journal" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-bold text-white">Open Smart Journal</Link></div>}{!loading && !error && reports.length > 0 && <div className="space-y-3">{reports.map((report) => <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b2d54]/5 text-[#0b2d54]"><Brain className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-[#0b2d54]">{String(report.analysisType || "Health analysis").replace(/_/g, " ")}</h2>{report.status && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{String(report.status).replace(/_/g, " ")}</span>}</div><div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400"><span><CalendarDays className="mr-1 inline h-3.5 w-3.5" />{formatDate(report.createdAt)}</span>{report.encounter?.id && <span>Linked to clinical encounter</span>}</div>{report.summary && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{String(report.summary)}</p>}</div><ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300" /></div></article>)}</div>}</div>
  </div></main></ProtectedRoute>;
}
