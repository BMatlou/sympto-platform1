"use client";

import Link from "next/link";
import { ArrowLeft, Activity, CalendarDays, CircleAlert, Pill, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { healthJournalService } from "@/services/health-journal.service";

function human(value: unknown) {
  return String(value ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function dateLabel(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function optionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export default function SymptomLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { id } = await params;
        const result = await healthJournalService.getSymptom(decodeURIComponent(id));
        if (active) setRecord(result);
      } catch (requestError: any) {
        if (active) setError(requestError?.response?.data?.message || "We could not load this symptom record.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [params]);

  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-5"><div className="mx-auto max-w-3xl space-y-4"><div className="h-12 animate-pulse rounded-2xl bg-white"/><div className="h-[520px] animate-pulse rounded-[30px] bg-white"/></div></main></ProtectedRoute>;

  if (error || !record) return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-5"><div className="mx-auto max-w-xl rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-slate-200"><Link href="/health-journal" className="inline-flex items-center gap-2 text-sm font-black text-[#0b2d54]"><ArrowLeft className="h-4 w-4"/>Back to Smart Journal</Link><h1 className="mt-6 text-xl font-black text-[#0b2d54]">Symptom record unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-500">{error || "This record could not be found."}</p></div></main></ProtectedRoute>;

  const item = record.symptoms?.[0] ?? null;
  const symptomName = item?.symptom?.name || record.title || "Symptom recorded";
  const observation = record.observations?.[0] ?? null;
  const effect = record.medicationEffects?.[0] ?? null;
  const trigger = record.triggers?.[0] ?? null;

  return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] text-[#14304d]"><div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
    <Link href="/health-journal" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-black text-[#0b2d54] hover:bg-white"><ArrowLeft className="h-4 w-4"/>Back to Smart Journal</Link>

    <section className="mt-4 overflow-hidden rounded-[30px] bg-gradient-to-br from-[#08284a] via-[#0d4771] to-[#24babe] p-6 text-white shadow-[0_18px_50px_rgba(11,45,84,0.10)] sm:p-8">
      <div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20"><Activity className="h-6 w-6"/></div><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/65">Saved symptom</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em]">{symptomName}</h1><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black"><span className="rounded-full bg-white/10 px-2.5 py-1.5">{human(record.overallSeverity)}</span><span className="rounded-full bg-white/10 px-2.5 py-1.5">{record.status === "COMPLETED" ? "Resolved" : "Active"}</span><span className="rounded-full bg-white/10 px-2.5 py-1.5">{dateLabel(record.startedAt)}</span></div></div></div>
    </section>

    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#24c1c4]"/><h2 className="text-sm font-black text-[#0b2d54]">Symptom details</h2></div><div className="mt-4 space-y-3 text-sm">{[
        ["Progression", item?.progression || record.progression],
        ["Frequency", item?.frequency],
        ["Duration", item?.durationMinutes != null ? String(item.durationMinutes) + " minutes" : null],
        ["Pain character", item?.painCharacter],
        ["Pain score", item?.painScore != null ? String(item.painScore) + "/10" : null],
        ["Comes and goes", item?.intermittent ? "Yes" : item?.intermittent === false ? "No" : null],
        ["Happened before", item?.recurring ? "Yes" : item?.recurring === false ? "No" : null],
        ["Onset", item?.onsetUncertain ? "Patient is unsure" : dateLabel(item?.onsetAt || record.startedAt)],
      ].map(([label,value]) => <div key={String(label)} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2.5 last:border-0 last:pb-0"><span className="text-slate-500">{String(label)}</span><span className="text-right font-bold text-[#0b2d54]">{optionalText(value) ? human(String(value)) : "Not recorded"}</span></div>)}</div></section>

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#24c1c4]"/><h2 className="text-sm font-black text-[#0b2d54]">What you noticed</h2></div><div className="mt-4 space-y-4 text-sm leading-6"><div><p className="font-black text-[#0b2d54]">Your notes</p><p className="mt-1 text-slate-600">{optionalText(record.notes || item?.notes) || "No extra notes recorded."}</p></div><div><p className="font-black text-[#0b2d54]">What makes it worse</p><p className="mt-1 text-slate-600">{optionalText(item?.aggravatingFactors) || "Not recorded."}</p></div><div><p className="font-black text-[#0b2d54]">What makes it better</p><p className="mt-1 text-slate-600">{optionalText(item?.relievingFactors) || "Not recorded."}</p></div></div></section>
    </div>

    {(trigger || effect) && <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {trigger && <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><CircleAlert className="h-4 w-4 text-amber-600"/><h2 className="text-sm font-black text-[#0b2d54]">Possible trigger</h2></div><p className="mt-3 text-sm font-bold text-[#0b2d54]">{trigger.trigger}</p>{trigger.description && <p className="mt-1 text-sm leading-6 text-slate-500">{trigger.description}</p>}<div className="mt-3 space-y-1.5 text-xs text-slate-500"><p><span className="font-black text-slate-600">Certainty:</span> {trigger.confirmed ? "Confirmed by you" : trigger.suspected ? "Suspected" : "Not confirmed"}</p>{trigger.exposureAt && <p><span className="font-black text-slate-600">Trigger time:</span> {dateLabel(trigger.exposureAt)}</p>}{trigger.occurredBeforeHours != null && <p><span className="font-black text-slate-600">Timing:</span> {trigger.occurredBeforeHours} hour{trigger.occurredBeforeHours === 1 ? "" : "s"} before the symptom</p>}{trigger.notes && <p><span className="font-black text-slate-600">Notes:</span> {trigger.notes}</p>}</div></section>}
      {effect && <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Pill className="h-4 w-4 text-[#24c1c4]"/><h2 className="text-sm font-black text-[#0b2d54]">Medicine context</h2></div><p className="mt-3 text-sm font-black text-[#0b2d54]">{effect.medication?.name || effect.medication?.genericName || "Linked medicine"}</p>{effect.improved != null && <p className="mt-1 text-sm text-slate-600">Improved symptom: {effect.improved ? "Yes" : "No"}</p>}{effect.effectiveness != null && <p className="mt-1 text-sm text-slate-600">Effectiveness: {effect.effectiveness}/10</p>}{effect.improvementPercentage != null && <p className="mt-1 text-sm text-slate-600">Improvement: {effect.improvementPercentage}%</p>}<div className="mt-3 space-y-1.5 text-xs text-slate-500">{effect.startedMedicationAt && <p><span className="font-black text-slate-600">Medicine started:</span> {dateLabel(effect.startedMedicationAt)}</p>}{effect.improvementObservedAt && <p><span className="font-black text-slate-600">Improvement noticed:</span> {dateLabel(effect.improvementObservedAt)}</p>}{effect.stoppedMedicationAt && <p><span className="font-black text-slate-600">Medicine stopped:</span> {dateLabel(effect.stoppedMedicationAt)}</p>}</div>{effect.sideEffects && <p className="mt-3 text-sm leading-6 text-slate-500">{effect.sideEffects}</p>}{effect.notes && <p className="mt-2 text-sm leading-6 text-slate-500"><span className="font-black text-slate-600">Notes:</span> {effect.notes}</p>}</section>}
    </div>}

    {observation && <section className="mt-4 rounded-[26px] border border-[#24c1c4]/20 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#24c1c4]"/><h2 className="text-sm font-black text-[#0b2d54]">Automated safety observation</h2></div><p className="mt-3 text-sm leading-6 text-slate-600">{observation.observation}</p>{observation.recommendation && <p className="mt-3 rounded-xl bg-[#f7fbfb] p-3 text-sm font-semibold text-[#0b2d54]">{observation.recommendation}</p>}<p className="mt-3 text-[10px] font-semibold text-slate-400">This is a safety-oriented record, not a diagnosis.</p></section>}

    <section className="mt-5 flex flex-wrap gap-2"><Link href="/log-symptom" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2d54] px-4 py-2.5 text-xs font-black text-white">Log another symptom</Link><Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-[#0b2d54]">Back to My Health</Link></section>
  </div></main></ProtectedRoute>;
}
