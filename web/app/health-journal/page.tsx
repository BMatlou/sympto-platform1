"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, ArrowRight, ChevronDown, ClipboardList, FileText, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthJournalService } from "@/services/health-journal.service";

const cfg: Record<string, { icon: typeof FileText; label: string }> = {
  symptom: { icon: Activity, label: "Symptoms" },
  measurement: { icon: HeartPulse, label: "Measurements" },
  journal: { icon: FileText, label: "Journal entries" },
};

const dayKey = (value: string) => { const d = new Date(value); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const dayLabel = (value: string) => { const d = new Date(value); const t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1); const same = (a: Date, b: Date) => a.toDateString() === b.toDateString(); if (same(d, t)) return "Today"; if (same(d, y)) return "Yesterday"; return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(d); };
const timeLabel = (value: string) => new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const human = (value: unknown) => String(value ?? "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const moodLabel: Record<string, string> = { VERY_BAD: "Very low", BAD: "Low", NEUTRAL: "Neutral", GOOD: "Good", VERY_GOOD: "Very good" };
const sleepLabel: Record<string, string> = { VERY_POOR: "Very poor", POOR: "Poor", FAIR: "Fair", GOOD: "Good", EXCELLENT: "Excellent" };
const energyLabel: Record<string, string> = { VERY_LOW: "Very low", LOW: "Low", NORMAL: "Normal", HIGH: "High", VERY_HIGH: "Very high" };

type Event = { id: string; type: "symptom" | "measurement" | "journal"; title: string; detail: string; at: string; href: string; meta?: string[]; source?: string };

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
  const [journalError, setJournalError] = useState(false);
  const [visible, setVisible] = useState(10);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "journal" | "symptom" | "measurement">("all");

  useEffect(() => {
    let active = true;
    setJournalError(false);
    healthJournalService.getAll({ page: 1, limit: 100 }).then(r => { if (active) setLogs(r.data ?? []); }).catch(() => { if (active) setJournalError(true); });
    return () => { active = false; };
  }, []);

  const events = useMemo(() => {
    if (!data) return [] as Event[];
    const all: Event[] = [];
    (data.symptoms ?? []).forEach((s: any) => {
      const at = s.startedAt || s.createdAt;
      if (!at) return;
      all.push({ id: `s-${s.id}`, type: "symptom", title: s.title || "Symptom recorded", detail: [s.overallSeverity ? `Severity: ${String(s.overallSeverity).toLowerCase()}` : null, ...(s.symptoms ?? []).map((x: any) => x.symptom?.name || x.name).filter(Boolean)].filter(Boolean).join(" · "), at: String(at), href: "/log-symptom", source: "Symptom tracker" });
    });
    (data.clinicalVitals ?? []).forEach((v: any) => {
      if (!v.measuredAt) return;
      all.push({ id: `v-${v.id}`, type: "measurement", title: v.vitalType?.name || v.vitalType?.code || "Measurement", detail: `${v.value ?? "—"}${v.unit || v.vitalType?.unit ? ` ${v.unit ?? v.vitalType.unit}` : ""}`, at: String(v.measuredAt), href: "/health-vitals", source: "Vitals" });
    });
    (data.healthSnapshot?.latestMeasurements ?? []).forEach((v: any, i: number) => {
      if (!v.measuredAt) return;
      all.push({ id: `d-${v.id ?? i}`, type: "measurement", title: v.name || v.type || "Measurement", detail: `${v.value ?? "—"}${v.unit ? ` ${v.unit}` : ""}`, at: String(v.measuredAt), href: "/health-vitals", source: v.source ? human(v.source) : "Connected device" });
    });
    logs.forEach((l: any) => {
      const at = l.createdAt || l.recordedAt;
      if (!at) return;
      const rawTitle = l.title || "Journal entry";
      const lowerTitle = rawTitle.toLowerCase();
      const isWeight = lowerTitle.includes("weight update");
      const isTalk = lowerTitle.includes("talk to sympto");
      const meta = [
        l.mood ? `Mood · ${moodLabel[String(l.mood)] ?? human(l.mood)}` : null,
        l.sleepQuality ? `Sleep · ${sleepLabel[String(l.sleepQuality)] ?? human(l.sleepQuality)}` : null,
        l.sleepHours ? `${l.sleepHours}h sleep` : null,
        l.energyLevel ? `Energy · ${energyLabel[String(l.energyLevel)] ?? human(l.energyLevel)}` : null,
        l.stressLevel != null ? `Stress · ${l.stressLevel}/10` : null,
        l.exerciseMinutes != null ? `Exercise · ${l.exerciseMinutes} min` : null,
        l.waterIntakeMl != null ? `Water · ${l.waterIntakeMl} ml` : null,
        l.weightKg != null ? `Weight · ${l.weightKg} kg` : null,
        l.temperature != null ? `Temp · ${l.temperature}` : null,
        l.bloodPressureSystolic != null || l.bloodPressureDiastolic != null ? `BP · ${l.bloodPressureSystolic ?? "—"}/${l.bloodPressureDiastolic ?? "—"}` : null,
        l.heartRate != null ? `Heart rate · ${l.heartRate} bpm` : null,
        l.oxygenSaturation != null ? `Oxygen · ${l.oxygenSaturation}%` : null,
        l.respiratoryRate != null ? `Respiratory rate · ${l.respiratoryRate}/min` : null,
      ].filter(Boolean) as string[];
      const detail = l.journal || l.notes || "Journal entry recorded.";
      if (isWeight) all.push({ id: `w-${l.id}`, type: "measurement", title: "Weight update", detail: detail.replace(/^Weight update\s*/i, ""), at: String(at), href: "/health-vitals", meta, source: "My Health" });
      else if (isTalk) all.push({ id: `m-${l.id}`, type: "journal", title: "Talk to Sympto", detail, at: String(at), href: "/messages", meta, source: "Talk to Sympto" });
      else all.push({ id: `j-${l.id}`, type: "journal", title: rawTitle, detail, at: String(at), href: "/health-journal", meta, source: l.practitionerId ? "Clinical journal" : "Personal journal" });
    });
    return clean(all);
  }, [data, logs]);

  const visibleEvents = useMemo(() => filter === "all" ? events : events.filter(e => e.type === filter), [events, filter]);
  const grouped = visibleEvents.slice(0, visible).reduce<Record<string, Event[]>>((acc, e) => { (acc[dayKey(e.at)] ||= []).push(e); return acc; }, {});
  const journalCount = events.filter(e => e.type === "journal").length;
  const measurementCount = events.filter(e => e.type === "measurement").length;
  useEffect(() => { setVisible(10); setExpanded(null); }, [filter]);

  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-6"><div className="mx-auto max-w-4xl space-y-4"><div className="h-40 animate-pulse rounded-[30px] bg-white"/><div className="h-[220px] animate-pulse rounded-[28px] bg-white"/><div className="h-[600px] animate-pulse rounded-[30px] bg-white"/></div></main></ProtectedRoute>;
  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-6"><div className="mx-auto max-w-xl rounded-[28px] bg-white p-6"><h1 className="text-xl font-black text-[#0b2d54]">We couldn't load your Health Journal</h1><p className="mt-2 text-sm text-slate-500">Your health history could not be loaded right now.</p><button onClick={reload} className="mt-5 rounded-xl bg-[#0b2d54] px-5 py-3 text-sm font-black text-white">Try again</button></div></main></ProtectedRoute>;

  return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] text-[#14304d]"><div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[#0b2d54]"><ArrowLeft className="h-4 w-4"/>Back to My Health</Link>
    <header className="mt-4 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#08284a] via-[#0d4771] to-[#24babe] p-6 text-white shadow-[0_18px_50px_rgba(11,45,84,0.10)] sm:p-8"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/65">My history</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Your health story</h1><p className="mt-2 text-sm leading-6 text-white/75">A cleaner view of meaningful health activity, newest first.</p></div><Link href="/log-symptom" className="hidden min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-[#0b2d54] sm:inline-flex"><HeartPulse className="h-4 w-4"/>Add update</Link></div><div className="mt-5 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{events.length} meaningful events</div></header>

    <section className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(11,45,84,0.05)]"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Total history</p><p className="mt-2 text-3xl font-black text-[#0b2d54]">{events.length}</p><p className="mt-1 text-xs text-slate-500">Meaningful activity items</p></div><div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(11,45,84,0.05)]"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Journal</p><p className="mt-2 text-3xl font-black text-[#0b2d54]">{journalCount}</p><p className="mt-1 text-xs text-slate-500">Personal and guided entries</p></div><div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(11,45,84,0.05)]"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Measurements</p><p className="mt-2 text-3xl font-black text-[#0b2d54]">{measurementCount}</p><p className="mt-1 text-xs text-slate-500">Vitals, weight and connected readings</p></div></section>

    <section className="mt-5 rounded-[26px] border border-[#24c1c4]/20 bg-white p-5 shadow-[0_12px_35px_rgba(11,45,84,0.04)] sm:p-6"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]"><Sparkles className="h-5 w-5"/></div><div><h2 className="font-black text-[#0b2d54]">How your history works</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Symptom logs, journal entries, vitals, weight updates and connected measurements are brought into one timeline. Open an item to jump to the record behind it.</p></div></div></section>

    {journalError && <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/><p><span className="font-bold">Some personal journal entries could not be loaded.</span> Other available health activity is still shown below.</p></div>}

    <section className="mt-5 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(11,45,84,0.06)] sm:p-7"><div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24aeb3]">Your record</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">Timeline</h2><p className="mt-1 text-sm text-slate-500">Start with the newest activity. Select a category to narrow the view.</p></div><div className="flex flex-wrap gap-2">{([['all','All'],['journal','Journal'],['symptom','Symptoms'],['measurement','Measurements']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-3.5 py-2 text-xs font-black transition ${filter === value ? "bg-[#0b2d54] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>)}</div></div>
      {visibleEvents.length === 0 ? <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center"><ClipboardList className="mx-auto h-9 w-9 text-slate-300"/><h3 className="mt-4 text-base font-black text-[#0b2d54]">Nothing here yet</h3><p className="mt-2 text-sm text-slate-500">New {filter === "all" ? "health activity" : filter === "journal" ? "journal entries" : filter === "symptom" ? "symptom entries" : "measurements"} will appear here automatically as they are recorded.</p><Link href={filter === "symptom" ? "/log-symptom" : "/health-journal"} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-xs font-black text-white">{filter === "symptom" ? "Log a symptom" : "Open journal"}<ArrowRight className="h-3.5 w-3.5"/></Link></div> : <div className="space-y-9">{Object.entries(grouped).map(([k, items]) => <section key={k}><div className="mb-3 flex items-center gap-3"><span className="rounded-full bg-[#0b2d54] px-3 py-1.5 text-[10px] font-black uppercase text-white">{dayLabel(items[0].at)}</span><div className="h-px flex-1 bg-slate-100"/></div><div className="relative ml-2 border-l-2 border-slate-100 pl-6 sm:ml-3 sm:pl-8">{items.map((e) => { const C = cfg[e.type] || cfg.journal; const Icon = C.icon; const open = expanded === e.id; return <article key={e.id} className="relative pb-4 last:pb-0"><span className="absolute -left-[37px] top-3 grid h-7 w-7 place-items-center rounded-full border-4 border-white bg-[#e7f8f5] text-[#0b2d54] shadow-sm sm:-left-[45px]"><Icon className="h-3.5 w-3.5"/></span><button type="button" onClick={() => setExpanded(open ? null : e.id)} className="w-full rounded-[22px] border border-slate-100 bg-white p-4 text-left shadow-[0_8px_25px_rgba(11,45,84,0.04)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_14px_32px_rgba(11,45,84,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#24aeb3]">{C.label}</span><span className="text-[10px] font-semibold text-slate-400">{timeLabel(e.at)}</span>{e.source && <span className="text-[10px] font-semibold text-slate-400">· {e.source}</span>}</div><h3 className="mt-2 text-sm font-black text-[#0b2d54]">{e.title}</h3><p className={`mt-1 text-sm leading-6 text-slate-600 ${open ? "" : "line-clamp-2"}`}>{e.detail}</p>{e.meta?.length ? <div className="mt-3 flex flex-wrap gap-2">{e.meta.map(item => <span key={item} className="rounded-full bg-[#f4f8fa] px-2.5 py-1 text-[10px] font-semibold text-slate-600">{item}</span>)}</div> : null}</div><ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}/></div>{open && <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4"><Link href={e.href} onClick={(ev) => ev.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3.5 py-2.5 text-[10px] font-black text-white">Open related record <ArrowRight className="h-3.5 w-3.5"/></Link>{e.type === "journal" && <Link href="/health-journal" onClick={(ev) => ev.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-[10px] font-black text-[#0b2d54]">View journal</Link>}</div>}</button></article>; })}</div></section>)}</div>}
      {visible < visibleEvents.length && <div className="mt-7 flex justify-center border-t border-slate-100 pt-5"><button type="button" onClick={() => setVisible(v => v + 10)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-[#0b2d54] hover:bg-slate-50">Show older activity</button></div>}
    </section>

    <section className="mt-5 rounded-3xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#0b2d54]"/><div><p className="font-bold text-[#0b2d54]">Your history is designed to tell the story, not expose database noise.</p><p className="mt-1 text-sm leading-6 text-slate-600">Repeated entries are filtered where possible, while the original record remains available through the related-record action.</p></div></div></section>
  </div></main></ProtectedRoute>;
}
