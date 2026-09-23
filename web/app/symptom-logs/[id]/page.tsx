
"use client";

import Link from "next/link";
import { Activity, ArrowLeft, ArrowRight, CircleAlert, MapPin, Pill, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

function shortDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function readableText(value: unknown) {
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
        const resolved = await params;
        const result = await healthJournalService.getSymptom(decodeURIComponent(resolved.id));
        if (active) setRecord(result);
      } catch (requestError: any) {
        if (active) setError(requestError?.response?.data?.message || "We could not load this symptom record.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params]);

  const timeline = useMemo(() => {
    if (!record) return [];
    const baseline = record.symptoms?.[0];
    return [
      {
        id: "baseline-" + record.id,
        at: baseline?.onsetAt || record.startedAt,
        severity: baseline?.severity || record.overallSeverity,
        progression: null,
        label: "Started",
        note: baseline?.notes || record.notes || null,
      },
      ...(record.monitorings ?? []).map((item: any) => ({
        id: item.id,
        at: item.observedAt || item.createdAt,
        severity: item.severity,
        progression: item.progression,
        label: item.stillPresent === false ? "Resolved" : "Check-in",
        note: item.notes || null,
      })),
    ].sort((a: any, b: any) => new Date(String(a.at)).getTime() - new Date(String(b.at)).getTime());
  }, [record]);

  if (loading) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] px-4 py-6 sm:px-6 sm:py-8"><div className="mx-auto max-w-3xl space-y-4"><div className="h-10 animate-pulse rounded-full bg-white" /><div className="h-[720px] animate-pulse rounded-[32px] bg-white" /></div></main></ProtectedRoute>;
  }

  if (error || !record) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] px-5 py-7"><div className="mx-auto max-w-xl rounded-[28px] bg-white p-7 shadow-sm"><Link href="/health-journal" className="inline-flex items-center gap-2 text-sm font-black text-[#0b2d54]"><ArrowLeft className="h-4 w-4" />Smart Journal</Link><h1 className="mt-6 text-xl font-black text-[#0b2d54]">Symptom record unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-500">{error || "This record could not be found."}</p></div></main></ProtectedRoute>;
  }

  const item = record.symptoms?.[0] ?? null;
  const symptomName = item?.symptom?.name || record.title || "Symptom";
  const latestMonitoring = record.monitorings?.[record.monitorings.length - 1] ?? null;
  const currentSeverity = latestMonitoring?.severity || record.overallSeverity || "MILD";
  const isResolved = record.status === "COMPLETED";
  const intelligence = record.intelligence ?? null;
  const medicationEffects = Array.isArray(record.medicationEffects) ? record.medicationEffects : [];
  const observations = Array.isArray(record.monitorings) ? record.monitorings.filter((entry: any) => entry.suspectedTrigger || entry.aggravatingFactors || entry.relievingFactors || entry.notes) : [];

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f4f9fb] text-[#14304d]">
        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
          <Link href="/health-journal" className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-black text-[#0b2d54] hover:bg-white"><ArrowLeft className="h-4 w-4" />Smart Journal</Link>

          <section className="mt-4 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#08284a] via-[#0d4771] to-[#24babe] p-6 text-white shadow-[0_18px_50px_rgba(11,45,84,0.10)] sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em]">Symptom</span>
                  <span className={"rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] " + (isResolved ? "bg-white/10 text-white" : "bg-[#bafffa]/15 text-[#d9fffd]")}>{isResolved ? "Resolved" : "Active"}</span>
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-[-.045em] sm:text-4xl">{human(symptomName)}</h1>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-2 text-[10px] font-black">Current · {human(currentSeverity)}</span>
                  <span className="rounded-full bg-white/10 px-3 py-2 text-[10px] font-black">Started · {shortDate(record.startedAt)}</span>
                  {item?.location && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[10px] font-black"><MapPin className="h-3 w-3" />{item.location}</span>}
                </div>
              </div>

              {!isResolved && (
                <Link href={"/symptom-logs/" + encodeURIComponent(String(record.id)) + "/monitor"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-white px-5 py-3 text-xs font-black text-[#0b2d54] shadow-sm">Update symptom <ArrowRight className="h-4 w-4 text-[#24aeb3]" /></Link>
              )}
            </div>
          </section>

          {intelligence && (
            <section className="mt-4 overflow-hidden rounded-[28px] border border-[#24c1c4]/15 bg-white shadow-[0_12px_34px_rgba(11,45,84,0.045)]">
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80]"><Sparkles className="h-5 w-5" /></span>
                    <div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#24aeb3]">Sympto Insights</p><h2 className="mt-1 text-xl font-black tracking-[-.03em] text-[#0b2d54]">What Sympto noticed</h2></div>
                  </div>
                  {intelligence.source === "AI" && <span className="rounded-full bg-[#e8f8f7] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#0b7b80]">AI-assisted</span>}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{intelligence.summary}</p>

                {intelligence.patterns?.length > 0 && (
                  <div className="mt-5 rounded-[22px] bg-[#f8fbfb] p-4 ring-1 ring-[#e1edef]">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Pattern</p>
                    <div className="mt-2 space-y-2">{intelligence.patterns.slice(0, 3).map((entry: string, index: number) => <p key={index} className="text-sm leading-6 text-[#0b2d54]">• {entry}</p>)}</div>
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {intelligence.associations?.length > 0 && (
                    <section className="rounded-[22px] bg-[#f8fbfb] p-4 ring-1 ring-[#e1edef]">
                      <div className="flex items-center gap-2"><CircleAlert className="h-4 w-4 text-[#24aeb3]" /><h3 className="text-sm font-black text-[#0b2d54]">Related health signals</h3></div>
                      <div className="mt-3 space-y-2">{intelligence.associations.slice(0, 3).map((entry: string, index: number) => <p key={index} className="text-xs leading-5 text-slate-600">• {entry}</p>)}</div>
                    </section>
                  )}

                  {intelligence.medicationInsights?.length > 0 && (
                    <section className="rounded-[22px] bg-[#f8fbfb] p-4 ring-1 ring-[#e1edef]">
                      <div className="flex items-center gap-2"><Pill className="h-4 w-4 text-[#24aeb3]" /><h3 className="text-sm font-black text-[#0b2d54]">Medicine response</h3></div>
                      <div className="mt-3 space-y-2">{intelligence.medicationInsights.slice(0, 3).map((entry: string, index: number) => <p key={index} className="text-xs leading-5 text-slate-600">• {entry}</p>)}</div>
                    </section>
                  )}
                </div>

                {intelligence.dataGaps?.length > 0 && (
                  <div className="mt-4 rounded-[22px] border border-dashed border-[#cfe2e5] bg-white p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Next useful detail</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{intelligence.dataGaps[0]}</p>
                  </div>
                )}

                {intelligence.nextQuestions?.length > 0 && !isResolved && (
                  <Link href={"/symptom-logs/" + encodeURIComponent(String(record.id)) + "/monitor"} className="mt-4 flex items-center justify-between gap-3 rounded-[20px] bg-[#0b2d54] px-4 py-3.5 text-xs font-black text-white">Next check: {intelligence.nextQuestions[0]}<ArrowRight className="h-4 w-4 shrink-0 text-[#24c1c4]" /></Link>
                )}
              </div>
              <div className="border-t border-slate-100 px-5 py-3.5 sm:px-6">
                <p className="text-[9px] leading-5 text-slate-400">Sympto Insights uses your recorded health information. It does not diagnose or establish that one health factor caused another.</p>
              </div>
            </section>
          )}

          <section className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#24aeb3]">Symptom journey</p><h2 className="mt-1 text-xl font-black tracking-[-.03em] text-[#0b2d54]">How it changed</h2></div>
              <span className="rounded-full bg-[#f4f8fa] px-3 py-1.5 text-[9px] font-black text-slate-500">{Math.max(0, timeline.length - 1)} update{Math.max(0, timeline.length - 1) === 1 ? "" : "s"}</span>
            </div>

            <div className="mt-6 space-y-5">
              {timeline.map((point: any, index: number) => (
                <div key={point.id} className="flex gap-3">
                  <div className="flex w-8 shrink-0 flex-col items-center">
                    <span className={"grid h-8 w-8 place-items-center rounded-full " + (index === 0 ? "bg-[#0b2d54] text-white" : point.progression === "WORSENING" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : point.progression === "IMPROVING" ? "bg-[#e8f8f7] text-[#0b7b80]" : "bg-slate-100 text-slate-600")}><Activity className="h-3.5 w-3.5" /></span>
                    {index < timeline.length - 1 && <span className="mt-2 w-px flex-1 bg-slate-200" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-[#0b2d54]">{point.label}</p>
                      <span className="rounded-full bg-[#f4f8fa] px-2.5 py-1 text-[9px] font-black text-slate-500">{human(point.severity)}</span>
                      {point.progression && <span className={"rounded-full px-2.5 py-1 text-[9px] font-black " + (point.progression === "WORSENING" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500")}>{human(point.progression)}</span>}
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">{dateLabel(point.at)}</p>
                    {readableText(point.note) && <p className="mt-2 text-xs leading-5 text-slate-600">{point.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {observations.length > 0 && (
            <section className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#24c1c4]" /><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#24aeb3]">Your observations</p><h2 className="mt-1 text-xl font-black text-[#0b2d54]">What you noticed</h2></div></div>
              <div className="mt-4 space-y-3">
                {observations.slice().reverse().map((entry: any) => (
                  <article key={entry.id} className="rounded-[22px] bg-[#f8fbfb] p-4 ring-1 ring-[#e1edef]">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{dateLabel(entry.observedAt)}</p>
                    {entry.suspectedTrigger && <p className="mt-2 text-xs leading-5 text-slate-600"><b className="text-[#0b2d54]">Possible trigger:</b> {entry.suspectedTrigger}</p>}
                    {entry.aggravatingFactors && <p className="mt-2 text-xs leading-5 text-slate-600"><b className="text-[#0b2d54]">Worse:</b> {entry.aggravatingFactors}</p>}
                    {entry.relievingFactors && <p className="mt-2 text-xs leading-5 text-slate-600"><b className="text-[#0b2d54]">Better:</b> {entry.relievingFactors}</p>}
                    {entry.notes && <p className="mt-2 text-xs leading-5 text-slate-600">{entry.notes}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}

          <div className="mt-4 rounded-[22px] bg-white/70 px-4 py-3.5 text-center ring-1 ring-[#dfeaec]">
            <p className="text-[9px] leading-5 text-slate-400">This record is for tracking and communication. Sympto does not diagnose or replace professional medical judgement.</p>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
