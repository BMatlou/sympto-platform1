"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowLeft, ClipboardList, FileText, FlaskConical, HeartPulse, Image as ImageIcon, Pill, ShieldCheck, Sparkles, Stethoscope, Syringe } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthJournalService } from "@/services/health-journal.service";
import type { HealthJournal } from "@/types/health-journal";

const text = (value: unknown, fallback = "—") => value === null || value === undefined || value === "" ? fallback : String(value);
const date = (value: unknown) => value ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(String(value))) : "Date not recorded";

function IconFor({ type }: { type: string }) { const cls = "h-5 w-5"; if (type === "visit") return <Stethoscope className={cls}/>; if (type === "symptom") return <Activity className={cls}/>; if (type === "lab") return <FlaskConical className={cls}/>; if (type === "imaging") return <ImageIcon className={cls}/>; if (type === "prescription") return <Pill className={cls}/>; if (type === "document") return <FileText className={cls}/>; if (type === "immunisation") return <Syringe className={cls}/>; if (type === "measurement") return <HeartPulse className={cls}/>; return <HeartPulse className={cls}/>; }

const vitalName = (value: unknown) => {
  const key = String(value ?? "Measurement").toUpperCase().replaceAll(" ", "_");
  const labels: Record<string, string> = {
    BLOOD_PRESSURE: "Blood pressure",
    BLOODPRESSURE: "Blood pressure",
    HEART_RATE: "Heart rate",
    HEARTRATE: "Heart rate",
    OXYGEN_SATURATION: "Oxygen saturation",
    OXYGENSATURATION: "Oxygen saturation",
    BODY_TEMPERATURE: "Temperature",
    BODYTEMPERATURE: "Temperature",
    RESPIRATORY_RATE: "Respiratory rate",
    RESPIRATORYRATE: "Respiratory rate",
    WEIGHT: "Weight",
    BMI: "BMI",
  };
  return labels[key] ?? String(value ?? "Measurement").replaceAll("_", " ");
};

export default function HealthJournalPage() {
  const { data, loading, error, reload } = useDashboard();
  const [logs, setLogs] = useState<HealthJournal[]>([]);
  const [logsError, setLogsError] = useState("");

  useEffect(() => { healthJournalService.getAll({ page: 1, limit: 50 }).then((r) => setLogs(r.data ?? [])).catch(() => setLogsError("Some journal entries could not be loaded.")); }, []);

  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-6"><div className="mx-auto max-w-4xl space-y-4"><div className="h-32 animate-pulse rounded-3xl bg-white"/><div className="h-96 animate-pulse rounded-3xl bg-white"/></div></main></ProtectedRoute>;
  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-6"><div className="mx-auto max-w-xl rounded-3xl bg-white p-7"><h1 className="text-xl font-bold text-[#0b2d54]">We couldn't load your history</h1><p className="mt-2 text-sm text-slate-500">Your saved health information has not been changed.</p><button onClick={reload} className="mt-5 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-semibold text-white">Try again</button></div></main></ProtectedRoute>;

  const timeline: Array<{ id: string; type: string; title: string; detail: string; at: string | null }> = [];
  (data.encounters ?? []).forEach((e: any) => timeline.push({ id: `enc-${e.id}`, type: "visit", title: e.chiefComplaint || "Healthcare visit", detail: e.assessment || e.plan || e.notes || "Clinical encounter recorded", at: e.startedAt }));
  (data.symptoms ?? []).forEach((s: any) => timeline.push({ id: `sym-${s.id}`, type: "symptom", title: s.title || "Symptom recorded", detail: [s.overallSeverity && `Severity: ${s.overallSeverity}`, ...(s.symptoms?.map((x: any) => x.symptom?.name || x.name) ?? [])].filter(Boolean).join(" · ") || "Symptom activity recorded", at: s.startedAt }));
  (data.recentResults?.laboratory ?? []).forEach((o: any) => timeline.push({ id: `lab-${o.id}`, type: "lab", title: o.orderNumber ? `Laboratory order ${o.orderNumber}` : "Laboratory result", detail: o.items?.map((i: any) => i.test?.name).filter(Boolean).join(", ") || text(o.status, "Laboratory activity recorded"), at: o.orderedAt }));
  (data.recentResults?.imaging ?? []).forEach((s: any) => timeline.push({ id: `img-${s.id}`, type: "imaging", title: s.imagingCenter?.name || "Imaging study", detail: s.reports?.[0]?.impression || s.reports?.[0]?.findings || text(s.status, "Imaging study recorded"), at: s.performedAt || s.createdAt }));
  (data.prescriptions ?? []).forEach((p: any) => timeline.push({ id: `rx-${p.id}`, type: "prescription", title: "Prescription", detail: text(p.status, "Prescription recorded"), at: p.issuedAt || p.createdAt }));
  (data.attachments ?? []).forEach((a: any) => timeline.push({ id: `doc-${a.id}`, type: "document", title: a.fileName || "Medical document", detail: text(a.mimeType, "Document saved to your health record"), at: a.createdAt }));
  (data.immunizations ?? []).forEach((i: any) => timeline.push({ id: `imm-${i.id}`, type: "immunisation", title: i.immunization?.name || i.name || "Immunisation", detail: i.facility ? `Facility: ${i.facility}` : i.doseNumber != null ? `Dose ${i.doseNumber}` : "Immunisation recorded", at: i.administeredAt || i.createdAt }));

  // Clinical vitals are full patient-record measurements. Device measurements
  // are the latest values already surfaced by Health Home, so the timeline
  // remains useful without pretending it has a full raw device history.
  (data.clinicalVitals ?? []).forEach((v: any) => {
    const type = v?.vitalType?.code ?? v?.type ?? v?.vitalType?.name ?? "MEASUREMENT";
    const name = v?.vitalType?.name ?? vitalName(type);
    const value = v?.value != null ? `${v.value}${v?.unit || v?.vitalType?.unit ? ` ${v.unit ?? v.vitalType.unit}` : ""}` : "Value not recorded";
    const source = v?.source ? ` · ${v.source}` : " · Clinical record";
    timeline.push({ id: `vital-clinical-${v.id}`, type: "measurement", title: name, detail: `${value}${source}`, at: v?.measuredAt ?? null });
  });
  (data.healthSnapshot?.latestMeasurements ?? []).forEach((v: any, index: number) => {
    const type = v?.type ?? "MEASUREMENT";
    const name = v?.name ?? vitalName(type);
    const value = v?.value != null ? `${v.value}${v?.unit ? ` ${v.unit}` : ""}` : "Value not recorded";
    const source = v?.source ? ` · ${v.source}` : " · Connected device";
    timeline.push({ id: `vital-device-${v.id ?? `${type}-${index}`}`, type: "measurement", title: name, detail: `${value}${source}`, at: v?.measuredAt ?? null });
  });

  logs.forEach((l: any) => timeline.push({ id: `journal-${l.id}`, type: "journal", title: l.title || "Health journal entry", detail: l.journal || l.notes || "Journal entry recorded", at: l.createdAt }));
  timeline.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());

  const counts = [
    { key: "visits", value: (data.encounters ?? []).length, href: "/appointments" },
    { key: "symptoms", value: (data.symptoms ?? []).length, href: "/health-journal" },
    { key: "labs", value: (data.recentResults?.laboratory ?? []).length, href: "/lab-results" },
    { key: "imaging", value: (data.recentResults?.imaging ?? []).length, href: "/imaging" },
    { key: "prescriptions", value: (data.prescriptions ?? []).length, href: "/medications" },
    { key: "documents", value: (data.attachments ?? []).length, href: "/health-records" },
  ];

  return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb]"><div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
    <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54]"><ArrowLeft className="h-4 w-4"/>Back to My Health</Link>
    <section className="mb-5 rounded-[30px] bg-gradient-to-br from-blue-700 via-blue-600 to-[#0b2d54] p-6 text-white shadow-lg sm:p-8"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Sparkles className="h-6 w-6"/></div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/65">My History & Files</p><h1 className="mt-1 text-3xl font-bold">Your health story</h1></div></div><p className="mt-4 max-w-2xl text-sm leading-6 text-white/75">Visits, symptoms, measurements, results, prescriptions and documents are brought together automatically from your health record.</p><div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-6">{counts.map(({ key, value, href }) => <Link key={key} href={href} aria-label={`Open ${key}`} className="rounded-xl bg-white/10 p-3 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"><p className="text-[10px] uppercase text-white/55">{key}</p><p className="mt-1 text-lg font-bold">{value}</p></Link>)}</div></section>
    {logsError && <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{logsError}</div>}
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-6 flex items-center justify-between"><div><h2 className="text-xl font-bold text-[#0b2d54]">Timeline</h2><p className="mt-1 text-sm text-slate-500">Newest health activity appears first.</p></div><span className="rounded-full bg-[#0b2d54]/5 px-3 py-1.5 text-xs font-bold text-[#0b2d54]">{timeline.length} records</span></div>
      {timeline.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center"><ClipboardList className="mx-auto h-9 w-9 text-slate-300"/><h3 className="mt-3 font-semibold text-[#0b2d54]">Your history will appear here</h3><p className="mt-1 text-sm text-slate-500">As information is saved to your health record, it will automatically join this timeline.</p></div> : <div className="space-y-3">{timeline.map((item) => <article key={item.id} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0b2d54] shadow-sm"><IconFor type={item.type}/></div><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><span className="text-[10px] font-bold uppercase tracking-wide text-[#24c1c4]">{item.type}</span><h3 className="mt-0.5 font-semibold text-[#0b2d54]">{item.title}</h3></div><time className="text-xs text-slate-400">{date(item.at)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.detail}</p></div></article>)}</div>}
    </section>
    <section className="mt-5 rounded-3xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#0b2d54]"/><div><p className="font-semibold text-[#0b2d54]">Automatically organised</p><p className="mt-1 text-sm leading-6 text-slate-600">This timeline is built from your authenticated patient data. It does not create or invent medical records.</p></div></div></section>
  </div></main></ProtectedRoute>;
}
