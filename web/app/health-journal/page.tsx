"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, ArrowRight, ChevronDown, ClipboardList, FileText, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthJournalService } from "@/services/health-journal.service";

const cfg: Record<string, { icon: typeof FileText; label: string }> = {
  symptom: { icon: Activity, label: "Symptom" },
  measurement: { icon: HeartPulse, label: "Measurement" },
  journal: { icon: FileText, label: "Journal" },
};

const dayKey = (value: string) => { const d = new Date(value); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const dayLabel = (value: string) => { const d = new Date(value); const t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1); const same = (a: Date, b: Date) => a.toDateString() === b.toDateString(); if (same(d, t)) return "Today"; if (same(d, y)) return "Yesterday"; return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(d); };
const timeLabel = (value: string) => new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));

type Event = { id: string; type: "symptom" | "measurement" | "journal"; title: string; detail: string; at: string; href: string };

function clean(events: Event[]) {
  const sorted = [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const seen = new Set<string>();
  const out: Event[] = [];
  for (const e of sorted) {
    const key = `${e.type}|${e.title.toLowerCase()}|${e.detail.toLowerCase()}|${dayKey(e.at)}|${timeLabel(e.at)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

export default function HealthJournalPage() {
  const { data, loading, error, reload } = useDashboard();
  const [logs, setLogs] = useState<any[]>([]);
  const [visible, setVisible] = useState(10);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { healthJournalService.getAll({ page: 1, limit: 100 }).then(r => setLogs(r.data ?? [])).catch(() => undefined); }, []);

  const events = useMemo(() => {
    if (!data) return [] as Event[];
    const all: Event[] = [];
    (data.symptoms ?? []).forEach((s: any) => { const at = s.startedAt || s.createdAt; if (!at) return; all.push({ id: `s-${s.id}`, type: "symptom", title: s.title || "Symptom recorded", detail: [s.overallSeverity ? `Severity: ${String(s.overallSeverity).toLowerCase()}` : null, ...(s.symptoms ?? []).map((x: any) => x.symptom?.name || x.name).filter(Boolean)].filter(Boolean).join(" · "), at: String(at), href: "/log-symptom" }); });
    (data.clinicalVitals ?? []).forEach((v: any) => { if (!v.measuredAt) return; all.push({ id: `v-${v.id}`, type: "measurement", title: v.vitalType?.name || v.vitalType?.code || "Measurement", detail: `${v.value ?? "—"}${v.unit || v.vitalType?.unit ? ` ${v.unit ?? v.vitalType.unit}` : ""}`, at: String(v.measuredAt), href: "/health-vitals" }); });
    (data.healthSnapshot?.latestMeasurements ?? []).forEach((v: any, i: number) => { if (!v.measuredAt) return; all.push({ id: `d-${v.id ?? i}`, type: "measurement", title: v.name || v.type || "Measurement", detail: `${v.value ?? "—"}${v.unit ? ` ${v.unit}` : ""}`, at: String(v.measuredAt), href: "/health-vitals" }); });
    logs.forEach((l: any) => { const at = l.createdAt || l.recordedAt; if (!at) return; const title = l.title || "Journal entry"; const detail = l.journal || l.notes || "Journal entry recorded."; if (title.toLowerCase().includes("weight update")) { all.push({ id: `w-${l.id}`, type: "measurement", title: "Weight", detail: detail.replace(/^Weight update\s*/i, ""), at: String(at), href: "/health-vitals" }); } else if (title.toLowerCase().includes("talk to sympto")) { all.push({ id: `m-${l.id}`, type: "journal", title: "Talk to Sympto", detail, at: String(at), href: "/messages" }); } else { all.push({ id: `j-${l.id}`, type: "journal", title, detail, at: String(at), href: "/health-journal" }); } });
    return clean(all);
  }, [data, logs]);

  const grouped = events.slice(0, visible).reduce<Record<string, Event[]>>((acc, e) => { (acc[dayKey(e.at)] ||= []).push(e); return acc; }, {});

  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-6"><div className="mx-auto max-w-4xl space-y-4"><div className="h-40 animate-pulse rounded-[30px] bg-white"/><div className="h-[600px] animate-pulse rounded-[30px] bg-white"/></div></main></ProtectedRoute>;
  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-6"><div className="mx-auto max-w-xl rounded-[28px] bg-white p-6"><h1 className="text-xl font-black text-[#0b2d54]">We couldn't load your Health Journal</h1><button onClick={reload} className="mt-5 rounded-xl bg-[#0b2d54] px-5 py-3 text-sm font-black text-white">Try again</button></div></main></ProtectedRoute>;

  return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] text-[#14304d]"><div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[#0b2d54]"><ArrowLeft className="h-4 w-4"/>Back to My Health</Link>
    <header className="mt-4 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#08284a] via-[#0d4771] to-[#24babe] p-6 text-white shadow-[0_18px_50px_rgba(11,45,84,0.10)] sm:p-8"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/65">My history</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Your health story</h1><p className="mt-2 text-sm leading-6 text-white/75">A cleaner view of meaningful health activity, newest first.</p></div><Link href="/log-symptom" className="hidden min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-[#0b2d54] sm:inline-flex"><HeartPulse className="h-4 w-4"/>Add update</Link></div><div className="mt-5 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{events.length} meaningful events</div></header>
    <section className="mt-5 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(11,45,84,0.06)] sm:p-7"><div className="mb-7 flex items-end justify-between"><div><h2 className="text-xl font-black text-[#0b2d54]">Timeline</h2><p className="mt-1 text-sm text-slate-500">Grouped by day so your health story is easy to scan.</p></div></div>
      {events.length === 0 ? <div className="py-16 text-center"><ClipboardList className="mx-auto h-9 w-9 text-slate-300"/><h3 className="mt-4 font-black text-[#0b2d54]">Your story starts here</h3><p className="mt-2 text-sm text-slate-500">Health activity will appear here as it is recorded.</p></div> : <div className="space-y-9">{Object.entries(grouped).map(([k, items]) => <section key={k}><div className="mb-3 flex items-center gap-3"><span className="rounded-full bg-[#0b2d54] px-3 py-1.5 text-[10px] font-black uppercase text-white">{dayLabel(items[0].at)}</span><div className="h-px flex-1 bg-slate-100"/></div><div className="relative ml-2 border-l-2 border-slate-100 pl-6 sm:ml-3 sm:pl-8">{items.map((e) => { const C = cfg[e.type] || cfg.journal; const Icon = C.icon; const open = expanded === e.id; return <article key={e.id} className="relative pb-4 last:pb-0"><span className="absolute -left-[37px] top-3 grid h-7 w-7 place-items-center rounded-full border-4 border-white bg-[#e7f8f5] text-[#0b2d54] shadow-sm sm:-left-[45px]"><Icon className="h-3.5 w-3.5"/></span><button type="button" onClick={() => setExpanded(open ? null : e.id)} className="w-full rounded-[20px] border border-slate-100 bg-slate-50/70 p-4 text-left hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#24aeb3]">{C.label}</span><span className="text-[10px] font-semibold text-slate-400">{timeLabel(e.at)}</span></div><h3 className="mt-1.5 text-sm font-black text-[#0b2d54]">{e.title}</h3><p className={`mt-1 text-sm leading-6 text-slate-600 ${open ? "" : "line-clamp-2"}`}>{e.detail}</p></div><ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-400 ${open ? "rotate-180" : ""}`}/></div>{open && <div className="mt-4 border-t border-slate-200 pt-3"><Link href={e.href} onClick={(ev) => ev.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0b2d54] px-3 py-2 text-[10px] font-black text-white">Open related record <ArrowRight className="h-3.5 w-3.5"/></Link></div>}</button></article>; })}</div></section>)}</div>}
      {visible < events.length && <div className="mt-7 flex justify-center border-t border-slate-100 pt-5"><button type="button" onClick={() => setVisible(v => v + 10)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-[#0b2d54]">Show older activity</button></div>}
    </section>
    <section className="mt-5 rounded-3xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#0b2d54]"/><div><p className="font-semibold text-[#0b2d54]">One health story, not a raw event log</p><p className="mt-1 text-sm leading-6 text-slate-600">Repeated technical entries are filtered so the patient sees the meaningful change rather than database noise.</p></div></div></section>
  </div></main></ProtectedRoute>;
}
