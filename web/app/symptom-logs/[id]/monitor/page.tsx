"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Pill, Save, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthJournalService, type SymptomMonitoringResult } from "@/services/health-journal.service";

const severityOptions = [
  ["MILD", "Mild"],
  ["MODERATE", "Moderate"],
  ["SEVERE", "Severe"],
] as const;

const progressionOptions = [
  ["IMPROVING", "Better"],
  ["STABLE", "About the same"],
  ["WORSENING", "Worse"],
  ["FLUCTUATING", "Comes and goes"],
] as const;

const frequencyOptions = [
  ["CONSTANT", "Constant"],
  ["INTERMITTENT", "Intermittent"],
  ["OCCASIONAL", "Occasional"],
  ["RARE", "Rare"],
  ["UNKNOWN", "Not sure"],
] as const;

function human(value: unknown) {
  return String(value ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MonitorSymptomPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: dashboard } = useDashboard();
  const [id, setId] = useState("");
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<"NONE" | "MILD" | "MODERATE" | "SEVERE" | "">("");
  const [progression, setProgression] = useState("");
  const [frequency, setFrequency] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [painScore, setPainScore] = useState("");
  const [stillPresent, setStillPresent] = useState(true);
  const [suspectedTrigger, setSuspectedTrigger] = useState("");
  const [aggravatingFactors, setAggravatingFactors] = useState("");
  const [relievingFactors, setRelievingFactors] = useState("");
  const [notes, setNotes] = useState("");
  const [medicationId, setMedicationId] = useState("");
  const [reportedMedicationName, setReportedMedicationName] = useState("");
  const [medicationImproved, setMedicationImproved] = useState("");
  const [medicationEffectiveness, setMedicationEffectiveness] = useState("");
  const [medicationSideEffects, setMedicationSideEffects] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SymptomMonitoringResult | null>(null);
  const [error, setError] = useState("");
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const resolved = await params;
        const decoded = decodeURIComponent(resolved.id);
        if (active) setId(decoded);
        const loaded = await healthJournalService.getSymptom(decoded);
        if (!active) return;
        setRecord(loaded);

        const latest = loaded.monitorings?.[loaded.monitorings.length - 1];
        const initialSeverity = latest?.severity ?? loaded.overallSeverity ?? "";
        setSeverity(initialSeverity === "NONE" ? "" : (initialSeverity as typeof severity));
      } catch (requestError: any) {
        if (active) setError(requestError?.response?.data?.message || "We could not load this symptom.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [params]);

  const activeMedications = useMemo(
    () =>
      (dashboard?.today?.activeMedications ?? dashboard?.medications ?? []).filter((medication: any) => {
        const status = String(medication?.status ?? "ACTIVE").toUpperCase();
        return status === "ACTIVE" || status === "PAUSED";
      }),
    [dashboard],
  );

  const symptomName =
    record?.symptoms?.[0]?.symptom?.name ||
    record?.title ||
    "Symptom";

  const save = async () => {
    if (!id || !severity || saving) return;

    setSaving(true);
    setError("");

    try {
      const duration = durationMinutes.trim() ? Number(durationMinutes) : Number.NaN;
      const pain = painScore.trim() ? Number(painScore) : Number.NaN;
      const effectiveness = medicationEffectiveness.trim() ? Number(medicationEffectiveness) : Number.NaN;

      const response = await healthJournalService.monitorSymptom(id, {
        severity,
        progression: progression || undefined,
        frequency: frequency || undefined,
        durationMinutes: Number.isFinite(duration) && duration > 0 ? duration : undefined,
        painScore: Number.isFinite(pain) ? pain : undefined,
        stillPresent,
        suspectedTrigger: suspectedTrigger.trim() || undefined,
        aggravatingFactors: aggravatingFactors.trim() || undefined,
        relievingFactors: relievingFactors.trim() || undefined,
        notes: notes.trim() || undefined,
        medicationId: medicationId && medicationId !== "__OTHER__" ? medicationId : undefined,
        reportedMedicationName: medicationId === "__OTHER__" ? reportedMedicationName.trim() || undefined : undefined,
        medicationImproved: medicationImproved === "YES" ? true : medicationImproved === "NO" ? false : undefined,
        medicationEffectiveness: Number.isFinite(effectiveness) ? effectiveness : undefined,
        medicationSideEffects: medicationSideEffects.trim() || undefined,
      });

      setResult(response);
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          "We could not save this monitoring update.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f9fb] p-5">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="h-10 animate-pulse rounded-xl bg-white" />
          <div className="h-[650px] animate-pulse rounded-[30px] bg-white" />
        </div>
      </main>
    );
  }

  if (error && !record) {
    return (
      <main className="min-h-screen bg-[#f4f9fb] p-5">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-slate-200">
          <Link href="/health-journal" className="inline-flex items-center gap-2 text-sm font-black text-[#0b2d54]">
            <ArrowLeft className="h-4 w-4" />
            Back to Smart Journal
          </Link>
          <h1 className="mt-6 text-xl font-black text-[#0b2d54]">Symptom unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
        </div>
      </main>
    );
  }

  if (result) {
    const urgent = result.insight.tone === "urgent";
    const watch = result.insight.tone === "watch";

    return (
      <main className="min-h-screen bg-[#f4f9fb] px-4 py-7 text-[#0b2d54] sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <Link
            href={`/symptom-logs/${encodeURIComponent(id)}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to symptom
          </Link>

          <section className="mt-5 rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(11,45,84,0.08)] ring-1 ring-slate-200 sm:p-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200">
              {urgent ? (
                <TriangleAlert className="h-9 w-9 text-red-600" aria-hidden="true" />
              ) : (
                <CheckCircle2
                  className={`h-9 w-9 ${watch ? "text-amber-600" : "text-[#24aeb3]"}`}
                  aria-hidden="true"
                />
              )}
            </div>

            <p className={`mt-5 text-center text-[10px] font-black uppercase tracking-[0.18em] ${urgent ? "text-red-600" : watch ? "text-amber-600" : "text-[#24aeb3]"}`}>
              Sympto monitoring
            </p>

            <h1 className="mt-2 text-center text-3xl font-black tracking-[-0.04em]">
              {result.insight.title}
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-slate-500">
              {result.insight.message}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-4">
              {[
                ["Current", human(result.currentSeverity)],
                ["Progress", human(result.progression) || "Recorded"],
                ["Highest", result.summary.highestRecordedSeverity],
                ["Updates", result.summary.updatesRecorded],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl bg-[#f7fbfb] p-4 ring-1 ring-[#dcebed]">
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-black text-[#0b2d54]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-[#24c1c4]/20 bg-white p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#24c1c4]" />
                <p className="text-sm font-black text-[#0b2d54]">What this means</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sympto has added this as a new time-stamped observation. Your original symptom entry remains the baseline, so the timeline can show how the symptom changes rather than overwriting history.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href={`/symptom-logs/${encodeURIComponent(id)}`}
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#0b2d54] px-5 text-sm font-black text-white"
              >
                View symptom timeline
              </Link>
              <Link
                href="/health-journal"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-slate-200 px-5 text-sm font-black text-[#0b2d54] hover:border-[#24c1c4]"
              >
                View Smart Journal
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f9fb] px-4 py-7 text-[#0b2d54] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/symptom-logs/${encodeURIComponent(id)}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to symptom
        </Link>

        <section className="mt-5 overflow-hidden rounded-[32px] bg-white shadow-[0_18px_55px_rgba(11,45,84,0.08)] ring-1 ring-slate-200">
          <div className="bg-gradient-to-br from-[#08284a] via-[#0d4771] to-[#24babe] p-6 text-white sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
              Symptom monitoring
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              How is your {symptomName.toLowerCase()} now?
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              This is an update to an existing symptom. You do not need to repeat when it started or describe the original symptom again.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <fieldset>
              <legend className="text-sm font-black">How strong is it right now?</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {severityOptions.map(([value, label]) => {
                  const selected = severity === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSeverity(value)}
                      aria-pressed={selected}
                      className={`min-h-16 rounded-2xl border-2 px-4 text-left text-sm font-black transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24c1c4]/20 ${selected ? "border-[#24c1c4] bg-[#24c1c4]/10" : "border-slate-200 bg-white hover:border-[#24c1c4]/50"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-7">
              <legend className="text-sm font-black">Compared with your last update?</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {progressionOptions.map(([value, label]) => {
                  const selected = progression === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setProgression(value)}
                      aria-pressed={selected}
                      className={`min-h-12 rounded-xl border-2 px-3 text-xs font-black transition ${selected ? "border-[#24c1c4] bg-[#24c1c4]/10" : "border-slate-200 bg-white hover:border-[#24c1c4]/50"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {!stillPresent ? (
              <div className="mt-7 rounded-2xl border border-[#24c1c4]/20 bg-[#f7fbfb] p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#24aeb3]">Current state</p>
                <p className="mt-1 text-sm font-black text-[#0b2d54]">Resolved — no current symptom</p>
              </div>
            ) : null}

            <fieldset className="mt-7">
              <legend className="text-sm font-black">Is it still happening?</legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStillPresent(true)}
                  aria-pressed={stillPresent}
                  className={`min-h-14 rounded-2xl border-2 text-sm font-black ${stillPresent ? "border-[#24c1c4] bg-[#24c1c4]/10" : "border-slate-200"}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStillPresent(false);
                    setSeverity("NONE");
                    setProgression("RESOLVED");
                  }}
                  aria-pressed={!stillPresent}
                  className={`min-h-14 rounded-2xl border-2 text-sm font-black ${!stillPresent ? "border-[#24c1c4] bg-[#24c1c4]/10" : "border-slate-200"}`}
                >
                  No, it has resolved
                </button>
              </div>
            </fieldset>

            <button
              type="button"
              onClick={() => setAdvanced((value) => !value)}
              className="mt-6 text-xs font-black text-[#0b7b80] underline-offset-4 hover:underline"
            >
              {advanced ? "Hide additional monitoring" : "Add more monitoring details"}
            </button>

            {advanced && (
              <div className="mt-4 space-y-5 rounded-3xl border border-[#dcebed] bg-[#f8fbfb] p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="frequency">
                      How often?
                    </label>
                    <select
                      id="frequency"
                      value={frequency}
                      onChange={(event) => setFrequency(event.target.value)}
                      className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold"
                    >
                      <option value="">Not sure</option>
                      {frequencyOptions.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="duration">
                      Duration each time
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        id="duration"
                        type="number"
                        min={1}
                        value={durationMinutes}
                        onChange={(event) => setDurationMinutes(event.target.value)}
                        placeholder="e.g. 30"
                        className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold"
                      />
                      <span className="text-xs font-bold text-slate-400">minutes</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="pain-score">
                    Pain score
                  </label>
                  <input
                    id="pain-score"
                    type="number"
                    min={0}
                    max={10}
                    value={painScore}
                    onChange={(event) => setPainScore(event.target.value)}
                    placeholder="0–10"
                    className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold sm:max-w-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="trigger">
                    Possible trigger
                  </label>
                  <input
                    id="trigger"
                    value={suspectedTrigger}
                    onChange={(event) => setSuspectedTrigger(event.target.value)}
                    placeholder="What happened before it changed?"
                    className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="worse">
                      What makes it worse?
                    </label>
                    <textarea
                      id="worse"
                      value={aggravatingFactors}
                      onChange={(event) => setAggravatingFactors(event.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-5"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="better">
                      What makes it better?
                    </label>
                    <textarea
                      id="better"
                      value={relievingFactors}
                      onChange={(event) => setRelievingFactors(event.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-5"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-[#24c1c4]" />
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Medicine response</p>
                  </div>

                  <label className="mt-3 block text-xs font-black text-[#0b2d54]" htmlFor="medication">
                    Did you take a medicine?
                  </label>
                  <select
                    id="medication"
                    value={medicationId}
                    onChange={(event) => setMedicationId(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold"
                  >
                    <option value="">No medicine taken</option>
                    {activeMedications.map((medication: any) => {
                      const medicationValue =
                        medication?.medicationId ||
                        medication?.medication?.id ||
                        medication?.patientMedication?.medicationId;
                      const medicationLabel =
                        medication?.name ||
                        medication?.medication?.name ||
                        medication?.medication?.genericName ||
                        medication?.medication?.brandName ||
                        "Medicine";
                      return (
                        <option key={String(medicationValue)} value={String(medicationValue)}>
                          {medicationLabel}
                        </option>
                      );
                    })}
                    <option value="__OTHER__">Another medicine / something not listed</option>
                  </select>

                  {medicationId === "__OTHER__" && (
                    <div className="mt-3">
                      <label className="block text-xs font-black text-[#0b2d54]" htmlFor="reported-medication">
                        What medicine did you take?
                      </label>
                      <input
                        id="reported-medication"
                        value={reportedMedicationName}
                        onChange={(event) => setReportedMedicationName(event.target.value)}
                        maxLength={300}
                        placeholder="Type the name exactly as you know it"
                        className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold"
                      />
                      <p className="mt-2 text-[10px] leading-5 text-slate-400">
                        This records what you said you took. It does not mean the medicine was prescribed to you or that it caused or treated the symptom.
                      </p>
                    </div>
                  )}

                  {medicationId && medicationId !== "__OTHER__" && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <select
                        value={medicationImproved}
                        onChange={(event) => setMedicationImproved(event.target.value)}
                        className="min-h-12 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold"
                        aria-label="Did the medicine help?"
                      >
                        <option value="">Did it help?</option>
                        <option value="YES">Yes, it helped</option>
                        <option value="NO">No, it did not help</option>
                      </select>

                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={medicationEffectiveness}
                        onChange={(event) => setMedicationEffectiveness(event.target.value)}
                        placeholder="Effectiveness 0–10"
                        className="min-h-12 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold"
                      />

                      <textarea
                        value={medicationSideEffects}
                        onChange={(event) => setMedicationSideEffects(event.target.value)}
                        rows={2}
                        placeholder="Any side effects?"
                        className="sm:col-span-2 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-5"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="notes">
                    Monitoring note
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    maxLength={4000}
                    placeholder="Anything that changed since the last update?"
                    className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-5"
                  />
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={save}
              disabled={!severity || saving}
              className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 text-sm font-black text-white shadow-lg transition hover:bg-[#082544] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Save className="h-5 w-5" aria-hidden="true" />
              {saving ? "Saving update…" : "Save monitoring update"}
            </button>

            <p className="mt-3 text-center text-[10px] leading-5 text-slate-400">
              Sympto stores each monitoring update separately so the symptom timeline keeps its history.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
