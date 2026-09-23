"use client";

import Link from "next/link";
import { Activity, ArrowLeft, ArrowRight, CalendarDays, CircleAlert, Pill, ShieldCheck, Sparkles } from "lucide-react";
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
        if (active) {
          setError(
            requestError?.response?.data?.message ||
              "We could not load this symptom record.",
          );
        }
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
    const points = [
      {
        id: `baseline-${record.id}`,
        at: baseline?.onsetAt || record.startedAt,
        severity: baseline?.severity || record.overallSeverity,
        progression: baseline?.progression || null,
        note: "Initial symptom recorded",
      },
      ...(record.monitorings ?? []).map((item: any) => ({
        id: item.id,
        at: item.observedAt || item.createdAt,
        severity: item.severity,
        progression: item.progression,
        note: item.stillPresent === false ? "Marked as resolved" : "Monitoring update",
      })),
    ];

    return points.sort(
      (a: any, b: any) =>
        new Date(String(a.at)).getTime() - new Date(String(b.at)).getTime(),
    );
  }, [record]);

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f4f9fb] p-5">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="h-12 animate-pulse rounded-2xl bg-white" />
            <div className="h-[650px] animate-pulse rounded-[30px] bg-white" />
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error || !record) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f4f9fb] p-5">
          <div className="mx-auto max-w-xl rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-slate-200">
            <Link
              href="/health-journal"
              className="inline-flex items-center gap-2 text-sm font-black text-[#0b2d54]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Smart Journal
            </Link>
            <h1 className="mt-6 text-xl font-black text-[#0b2d54]">
              Symptom record unavailable
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {error || "This record could not be found."}
            </p>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  const item = record.symptoms?.[0] ?? null;
  const symptomName = item?.symptom?.name || record.title || "Symptom recorded";
  const observation = record.observations?.[0] ?? null;
  const effect = record.medicationEffects?.[record.medicationEffects.length - 1] ?? null;
  const trigger = record.triggers?.[record.triggers.length - 1] ?? null;
  const latestMonitoring =
    record.monitorings?.[record.monitorings.length - 1] ?? null;
  const isResolved = record.status === "COMPLETED";
  const intelligence = record.intelligence ?? null;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f4f9fb] text-[#14304d]">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <Link
            href="/health-journal"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-black text-[#0b2d54] hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Smart Journal
          </Link>

          <section className="mt-4 overflow-hidden rounded-[30px] bg-gradient-to-br from-[#08284a] via-[#0d4771] to-[#24babe] p-6 text-white shadow-[0_18px_50px_rgba(11,45,84,0.10)] sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                  <Activity className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/65">
                    Symptom timeline
                  </p>
                  <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">
                    {symptomName}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black">
                    <span className="rounded-full bg-white/10 px-2.5 py-1.5">
                      Current · {human(latestMonitoring?.severity || record.overallSeverity)}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1.5">
                      {isResolved ? "Resolved" : "Active"}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1.5">
                      Started · {dateLabel(record.startedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {!isResolved && (
                <Link
                  href={`/symptom-logs/${encodeURIComponent(String(record.id))}/monitor`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-[#0b2d54]"
                >
                  Update symptom
                  <ArrowRight className="h-4 w-4 text-[#24aeb3]" />
                </Link>
              )}
            </div>
          </section>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#24c1c4]" />
                <h2 className="text-sm font-black text-[#0b2d54]">
                  Initial record
                </h2>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                {[
                  ["Severity", item?.severity || record.overallSeverity],
                  ["Started", item?.onsetUncertain ? "Not sure" : dateLabel(item?.onsetAt || record.startedAt)],
                  ["Location", item?.location],
                  ["Notes", item?.notes || record.notes],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="border-b border-slate-100 pb-2.5 last:border-0 last:pb-0"
                  >
                    <p className="text-xs font-bold text-slate-400">{label}</p>
                    <p className="mt-1 font-semibold leading-6 text-[#0b2d54]">
                      {optionalText(value) ? human(String(value)) : "Not recorded"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[26px] border border-[#24c1c4]/20 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#24c1c4]" />
                <h2 className="text-sm font-black text-[#0b2d54]">
                  Sympto insight
                </h2>
              </div>

              {latestMonitoring ? (
                <>
                  <p className="mt-4 text-base font-black text-[#0b2d54]">
                    Latest update · {human(latestMonitoring.severity)}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {latestMonitoring.progression
                      ? `The latest monitoring update is marked as ${human(latestMonitoring.progression).toLowerCase()}.`
                      : "A new monitoring point has been added to your timeline."}
                  </p>
                  <p className="mt-3 text-[10px] leading-5 text-slate-400">
                    This is longitudinal tracking, not a diagnosis.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-base font-black text-[#0b2d54]">
                    Your baseline is ready
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Keep the record updated as the symptom changes. Sympto can then identify patterns across time, health measurements, medicines and your journal.
                  </p>
                </>
              )}
            </section>
          </div>

          {intelligence && (
            <section className="mt-4 overflow-hidden rounded-[28px] border border-[#24c1c4]/20 bg-white shadow-sm">
              <div className="bg-[#f7fbfb] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]">
                      <Sparkles className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24aeb3]">
                        Sympto intelligence
                      </p>
                      <h2 className="mt-1 text-xl font-black text-[#0b2d54]">
                        What your record is showing
                      </h2>
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-[#0b2d54] ring-1 ring-slate-200">
                    {intelligence.source === "AI" ? "AI-assisted" : "Pattern engine"}
                  </span>
                </div>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                  {intelligence.summary}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  {[
                    ["Baseline", human(intelligence.metrics?.baselineSeverity)],
                    ["Latest", human(intelligence.metrics?.latestSeverity)],
                    ["Updates", String(intelligence.metrics?.monitoringUpdates ?? 0)],
                    ["Last 90 days", String(intelligence.metrics?.previous90DayOccurrences ?? 0)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                      <p className="mt-2 text-lg font-black text-[#0b2d54]">{value || "0"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                <section className="rounded-2xl bg-[#f8fbfb] p-4 ring-1 ring-[#e1edef]">
                  <h3 className="text-sm font-black text-[#0b2d54]">Patterns</h3>
                  {intelligence.patterns?.length ? (
                    <div className="mt-3 space-y-2">
                      {intelligence.patterns.map((text: string, index: number) => (
                        <p key={index} className="text-sm leading-6 text-slate-600">• {text}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Not enough data yet to identify a pattern.</p>
                  )}
                </section>

                <section className="rounded-2xl bg-[#f8fbfb] p-4 ring-1 ring-[#e1edef]">
                  <h3 className="text-sm font-black text-[#0b2d54]">Associations in your record</h3>
                  {intelligence.associations?.length ? (
                    <div className="mt-3 space-y-2">
                      {intelligence.associations.map((text: string, index: number) => (
                        <p key={index} className="text-sm leading-6 text-slate-600">• {text}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No linked association has been recorded yet.</p>
                  )}
                </section>

                <section className="rounded-2xl bg-[#f8fbfb] p-4 ring-1 ring-[#e1edef]">
                  <h3 className="text-sm font-black text-[#0b2d54]">Medicine response</h3>
                  {intelligence.medicationInsights?.length ? (
                    <div className="mt-3 space-y-2">
                      {intelligence.medicationInsights.map((text: string, index: number) => (
                        <p key={index} className="text-sm leading-6 text-slate-600">• {text}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No medicine response has been recorded for this symptom.</p>
                  )}
                </section>

                <section className="rounded-2xl bg-[#f8fbfb] p-4 ring-1 ring-[#e1edef]">
                  <h3 className="text-sm font-black text-[#0b2d54]">What would make this smarter?</h3>
                  {intelligence.dataGaps?.length ? (
                    <div className="mt-3 space-y-2">
                      {intelligence.dataGaps.map((text: string, index: number) => (
                        <p key={index} className="text-sm leading-6 text-slate-600">• {text}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Your record has enough information for the current summary.</p>
                  )}
                </section>
              </div>

              {intelligence.nextQuestions?.length ? (
                <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Suggested next check</p>
                  <p className="mt-2 text-sm font-bold text-[#0b2d54]">{intelligence.nextQuestions[0]}</p>
                </div>
              ) : null}

              <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
                <p className="text-[10px] leading-5 text-slate-400">
                  {intelligence.source === "AI"
                    ? "AI-assisted analysis uses the information already recorded for this symptom. It does not diagnose, determine causes, or replace clinical judgement."
                    : "The pattern engine is using recorded symptom observations. More updates allow stronger longitudinal pattern detection; this is not a diagnosis."}
                </p>
              </div>
            </section>
          )}

          <section className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24aeb3]">
                  Longitudinal record
                </p>
                <h2 className="mt-1 text-xl font-black text-[#0b2d54]">
                  How the symptom changed
                </h2>
              </div>
              <span className="rounded-full bg-[#f4f8fa] px-3 py-1.5 text-[10px] font-black text-slate-500">
                {Math.max(0, timeline.length - 1)} monitoring update{Math.max(0, timeline.length - 1) === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-6 space-y-5">
              {timeline.map((point: any, index: number) => (
                <div key={point.id} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                      index === 0
                        ? "bg-[#0b2d54] text-white"
                        : point.progression === "WORSENING"
                          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                          : point.progression === "IMPROVING"
                            ? "bg-[#e8f8f7] text-[#0b7b80]"
                            : "bg-slate-100 text-slate-600"
                    }`}>
                      <Activity className="h-4 w-4" />
                    </span>
                    {index < timeline.length - 1 && (
                      <span className="mt-2 w-px flex-1 bg-slate-200" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-[#0b2d54]">
                        {point.note}
                      </p>
                      <span className="rounded-full bg-[#f4f8fa] px-2.5 py-1 text-[9px] font-black text-slate-500">
                        {human(point.severity)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                      {dateLabel(point.at)}
                    </p>
                    {point.progression && (
                      <p className="mt-2 text-sm text-slate-600">
                        {human(point.progression)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {(record.monitorings ?? []).some((item: any) =>
            item.suspectedTrigger ||
            item.aggravatingFactors ||
            item.relievingFactors ||
            item.notes,
          ) && (
            <section className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#24c1c4]" />
                <h2 className="text-sm font-black text-[#0b2d54]">
                  What you noticed while monitoring
                </h2>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(record.monitorings ?? [])
                  .slice()
                  .reverse()
                  .map((monitoring: any) => (
                    <article key={monitoring.id} className="rounded-2xl bg-[#f8fbfb] p-4 ring-1 ring-[#e1edef]">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                        {dateLabel(monitoring.observedAt)}
                      </p>
                      {monitoring.suspectedTrigger && (
                        <p className="mt-2 text-sm text-slate-600">
                          <span className="font-black text-[#0b2d54]">Possible trigger:</span>{" "}
                          {monitoring.suspectedTrigger}
                        </p>
                      )}
                      {monitoring.aggravatingFactors && (
                        <p className="mt-2 text-sm text-slate-600">
                          <span className="font-black text-[#0b2d54]">Worse:</span>{" "}
                          {monitoring.aggravatingFactors}
                        </p>
                      )}
                      {monitoring.relievingFactors && (
                        <p className="mt-2 text-sm text-slate-600">
                          <span className="font-black text-[#0b2d54]">Better:</span>{" "}
                          {monitoring.relievingFactors}
                        </p>
                      )}
                      {monitoring.notes && (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {monitoring.notes}
                        </p>
                      )}
                    </article>
                  ))}
              </div>
            </section>
          )}

          {(trigger || effect) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {trigger && (
                <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CircleAlert className="h-4 w-4 text-amber-600" />
                    <h2 className="text-sm font-black text-[#0b2d54]">
                      Possible trigger
                    </h2>
                  </div>
                  <p className="mt-3 text-sm font-bold text-[#0b2d54]">
                    {trigger.trigger}
                  </p>
                  {trigger.description && (
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {trigger.description}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-slate-500">
                    Patient-reported trigger; not clinically confirmed.
                  </p>
                </section>
              )}

              {effect && (
                <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-[#24c1c4]" />
                    <h2 className="text-sm font-black text-[#0b2d54]">
                      Medicine context
                    </h2>
                  </div>
                  <p className="mt-3 text-sm font-black text-[#0b2d54]">
                    {effect.medication?.name ||
                      effect.medication?.genericName ||
                      "Linked medicine"}
                  </p>
                  {effect.improved != null && (
                    <p className="mt-1 text-sm text-slate-600">
                      Reported improvement: {effect.improved ? "Yes" : "No"}
                    </p>
                  )}
                  {effect.effectiveness != null && (
                    <p className="mt-1 text-sm text-slate-600">
                      Effectiveness: {effect.effectiveness}/10
                    </p>
                  )}
                  {effect.sideEffects && (
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Side effects: {effect.sideEffects}
                    </p>
                  )}
                </section>
              )}
            </div>
          )}

          {observation && (
            <section className="mt-4 rounded-[26px] border border-[#24c1c4]/20 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#24c1c4]" />
                <h2 className="text-sm font-black text-[#0b2d54]">
                  {observation.requiresAttention ? "Safety observation" : "Sympto record note"}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {observation.observation}
              </p>
              {observation.recommendation && (
                <p className="mt-3 rounded-xl bg-[#f7fbfb] p-3 text-sm font-semibold text-[#0b2d54]">
                  {observation.recommendation}
                </p>
              )}
              <p className="mt-3 text-[10px] font-semibold text-slate-400">
                Safety-oriented guidance is not a diagnosis.
              </p>
            </section>
          )}

          {!isResolved && (
            <Link
              href={`/symptom-logs/${encodeURIComponent(String(record.id))}/monitor`}
              className="mt-5 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 text-sm font-black text-white shadow-lg"
            >
              Update this symptom
              <ArrowRight className="h-4 w-4 text-[#24c1c4]" />
            </Link>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
