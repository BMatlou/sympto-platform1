
"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronDown, MapPin, Save, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthJournalService, type SymptomMonitoringResult } from "@/services/health-journal.service";
import SymptomMedicationPicker from "@/components/symptoms/symptom-medication-picker";

const severityOptions = [
  ["MILD", "Mild", "Noticeable"],
  ["MODERATE", "Moderate", "Affects my day"],
  ["SEVERE", "Severe", "Hard to manage"],
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

function severityRank(value: string) {
  return value === "NONE" ? 0 : value === "MILD" ? 1 : value === "MODERATE" ? 2 : value === "SEVERE" ? 3 : 4;
}

export default function MonitorSymptomPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: dashboard } = useDashboard();
  const [id, setId] = useState("");
  const [record, setRecord] = useState<any>(null);
  const [reference, setReference] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<"NONE" | "MILD" | "MODERATE" | "SEVERE">("MILD");
  const [progression, setProgression] = useState("");
  const [adjustProgression, setAdjustProgression] = useState(false);
  const [stillPresent, setStillPresent] = useState(true);
  const [location, setLocation] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [frequency, setFrequency] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [painScore, setPainScore] = useState("");
  const [suspectedTrigger, setSuspectedTrigger] = useState("");
  const [aggravatingFactors, setAggravatingFactors] = useState("");
  const [relievingFactors, setRelievingFactors] = useState("");
  const [notes, setNotes] = useState("");
  const [showMedicine, setShowMedicine] = useState(false);
  const [medication, setMedication] = useState<{ medicationId?: string; reportedMedicationName?: string; medicationImproved?: boolean }>({});
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
        const loaded = await healthJournalService.getSymptom(decoded);
        if (!active) return;

        setId(decoded);
        setRecord(loaded);

        const latest = loaded.monitorings?.[loaded.monitorings.length - 1];
        const currentSeverity = latest?.severity ?? loaded.overallSeverity ?? "MILD";
        setSeverity(currentSeverity === "NONE" ? "MILD" : currentSeverity);
        setLocation(loaded.symptoms?.[0]?.location ?? "");

        const name = loaded.symptoms?.[0]?.symptom?.name ?? loaded.title ?? "";
        if (name) {
          const refs = await healthJournalService.searchSymptomReference({ search: name, limit: 5 });
          const match = refs.find((item: any) => String(item?.name ?? "").toLowerCase() === String(name).toLowerCase());
          if (active && match) setReference(match);
        }
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

  const activeMedications = useMemo(() => {
    const values = dashboard?.today?.activeMedications ?? dashboard?.medications ?? [];
    return Array.isArray(values) ? values.filter((medication: any) => {
      const status = String(medication?.status ?? "ACTIVE").toUpperCase();
      return status === "ACTIVE" || status === "PAUSED";
    }) : [];
  }, [dashboard]);

  const symptomName = String(record?.symptoms?.[0]?.symptom?.name || record?.title || "symptom");
  const lastSeverity = String(record?.monitorings?.[record.monitorings.length - 1]?.severity || record?.overallSeverity || "MILD");
  const inferredProgression =
    severityRank(severity) > severityRank(lastSeverity)
      ? "WORSENING"
      : severityRank(severity) < severityRank(lastSeverity)
        ? "IMPROVING"
        : "STABLE";
  const effectiveProgression = adjustProgression && progression ? progression : inferredProgression;
  const locationOptions: string[] = Array.isArray(reference?.suggestedLocations) ? reference.suggestedLocations : [];

  const save = async () => {
    if (!id || saving) return;
    if (stillPresent && !severity) return;

    setSaving(true);
    setError("");

    try {
      const duration = durationMinutes.trim() ? Number(durationMinutes) : Number.NaN;
      const pain = painScore.trim() ? Number(painScore) : Number.NaN;
      const effectiveness = medicationEffectiveness.trim() ? Number(medicationEffectiveness) : Number.NaN;

      const response = await healthJournalService.monitorSymptom(id, {
        severity: stillPresent ? severity : "NONE",
        progression: stillPresent ? effectiveProgression as "IMPROVING" | "STABLE" | "WORSENING" | "FLUCTUATING" : "RESOLVED",
        frequency: frequency || undefined,
        durationMinutes: Number.isFinite(duration) && duration > 0 ? duration : undefined,
        painScore: Number.isFinite(pain) ? pain : undefined,
        stillPresent,
        suspectedTrigger: suspectedTrigger.trim() || undefined,
        aggravatingFactors: aggravatingFactors.trim() || undefined,
        relievingFactors: relievingFactors.trim() || undefined,
        notes: notes.trim() || undefined,
        medicationId: medication.medicationId,
        reportedMedicationName: medication.reportedMedicationName,
        medicationImproved: medication.medicationImproved,
        medicationEffectiveness: Number.isFinite(effectiveness) ? effectiveness : undefined,
        medicationSideEffects: medicationSideEffects.trim() || undefined,
      });

      setResult(response);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "We could not save this update.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-4 sm:p-8"><div className="mx-auto max-w-2xl space-y-4"><div className="h-10 animate-pulse rounded-full bg-white" /><div className="h-[650px] animate-pulse rounded-[32px] bg-white" /></div></main></ProtectedRoute>;
  }

  if (error && !record) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-5"><div className="mx-auto max-w-xl rounded-[28px] bg-white p-7 shadow-sm"><Link href="/today" className="inline-flex items-center gap-2 text-sm font-black text-[#0b2d54]"><ArrowLeft className="h-4 w-4" />Today</Link><h1 className="mt-6 text-xl font-black text-[#0b2d54]">Symptom unavailable</h1><p className="mt-2 text-sm text-slate-500">{error}</p></div></main></ProtectedRoute>;
  }

  if (result) {
    const urgent = result.insight.tone === "urgent";
    return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] px-4 py-6 sm:px-6 sm:py-9"><div className="mx-auto max-w-2xl"><Link href={"/symptom-logs/" + encodeURIComponent(id)} className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-bold hover:bg-white"><ArrowLeft className="h-4 w-4" />Symptom</Link><section className="mt-4 overflow-hidden rounded-[32px] bg-white shadow-[0_18px_55px_rgba(11,45,84,0.08)] ring-1 ring-slate-200"><div className="bg-gradient-to-br from-[#08284a] via-[#0d4771] to-[#24babe] px-6 py-8 text-white sm:px-8"><div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-white/10">{urgent ? <TriangleAlert className="h-7 w-7" /> : <Check className="h-7 w-7 text-[#bafffa]" />}</div><p className="mt-5 text-center text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Update recorded</p><h1 className="mt-2 text-center text-3xl font-black tracking-[-.04em]">{result.insight.title}</h1><p className="mx-auto mt-2 max-w-xl text-center text-sm leading-6 text-white/70">{result.insight.message}</p></div><div className="p-5 sm:p-7"><div className="rounded-[22px] bg-[#f7fbfb] p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Recorded for {human(symptomName)}</p><p className="mt-1 text-xl font-black text-[#0b2d54]">{human(result.currentSeverity)}</p></div><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-[#0b7b80] ring-1 ring-slate-200">{human(result.progression || "RECORDED")}</span></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Link href={"/symptom-logs/" + encodeURIComponent(id)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 text-sm font-black text-white">View symptom <ArrowRight className="h-4 w-4 text-[#24c1c4]" /></Link><Link href="/today" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-[#0b2d54]">Back to Today</Link></div></div></section></div></main></ProtectedRoute>;
  }

  const canSave = !stillPresent || Boolean(severity);

  return <ProtectedRoute>
    <main className="min-h-screen bg-[#f4f9fb] px-4 py-5 text-[#0b2d54] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <Link href={"/symptom-logs/" + encodeURIComponent(id)} className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-bold hover:bg-white"><ArrowLeft className="h-4 w-4" />Symptom history</Link>

        <section className="mt-4 overflow-visible rounded-[32px] border border-white bg-white shadow-[0_18px_55px_rgba(11,45,84,0.07)]">
          <div className="rounded-t-[32px] bg-gradient-to-br from-[#08284a] via-[#0d4771] to-[#24babe] px-6 py-7 text-white sm:px-8">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/55">Smart symptom update</p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div><h1 className="text-3xl font-black tracking-[-.045em]">{human(symptomName)}</h1><p className="mt-2 text-sm text-white/70">Tell Sympto what changed. Your original record stays untouched.</p></div>
              <span className="hidden rounded-full bg-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/80 sm:inline-flex">Active</span>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-7">
            {stillPresent && (
              <fieldset>
                <legend className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">How strong is it now?</legend>
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {severityOptions.map(([value, label, description]) => {
                    const selected = severity === value;
                    return <button key={value} type="button" onClick={() => setSeverity(value)} aria-pressed={selected} className={"min-h-[86px] rounded-[20px] border-2 px-3 py-3 text-left transition " + (selected ? "border-[#24c1c4] bg-[#e8f8f7] shadow-[0_8px_24px_rgba(36,193,196,0.10)]" : "border-slate-200 bg-white hover:border-[#24c1c4]/40")}><span className="block text-sm font-black">{label}</span><span className="mt-1 block text-[9px] leading-4 text-slate-500">{description}</span>{selected && <span className="mt-2 grid h-6 w-6 place-items-center rounded-full bg-[#0b2d54] text-white"><Check className="h-3.5 w-3.5" /></span>}</button>;
                  })}
                </div>
              </fieldset>
            )}

            {stillPresent && (
              <section className="rounded-[22px] bg-[#f8fbfb] p-4 ring-1 ring-[#e1edef]">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#24aeb3]">Sympto will track this as</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{human(effectiveProgression)}</p></div>
                  <button type="button" onClick={() => setAdjustProgression((value) => !value)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-[#0b2d54]">{adjustProgression ? "Use automatic" : "Change"}</button>
                </div>
                {adjustProgression && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{progressionOptions.map(([value, label]) => <button key={value} type="button" onClick={() => setProgression(value)} className={"min-h-10 rounded-xl border text-[10px] font-black " + (progression === value ? "border-[#24c1c4] bg-[#e8f8f7] text-[#0b2d54]" : "border-slate-200 bg-white text-slate-500")}>{label}</button>)}</div>}
              </section>
            )}

            <section>
              <div className="flex items-end justify-between gap-3">
                <div><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Current state</p><p className="mt-1 text-sm text-slate-500">Is the symptom still happening?</p></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => { setStillPresent(true); if (severity === "NONE") setSeverity("MILD"); if (progression === "RESOLVED") setProgression(""); }} className={"min-h-14 rounded-[18px] border-2 text-sm font-black " + (stillPresent ? "border-[#24c1c4] bg-[#e8f8f7] text-[#0b2d54]" : "border-slate-200 bg-white text-slate-500")}>Yes, still there</button>
                <button type="button" onClick={() => { setStillPresent(false); setProgression("RESOLVED"); setAdjustProgression(false); }} className={"min-h-14 rounded-[18px] border-2 text-sm font-black " + (!stillPresent ? "border-[#24c1c4] bg-[#e8f8f7] text-[#0b2d54]" : "border-slate-200 bg-white text-slate-500")}>It has resolved</button>
              </div>
            </section>

            {(location || locationOptions.length > 0) && (
              <section className="rounded-[22px] border border-slate-200 bg-[#fbfdfd] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#24c1c4]" /><div><p className="text-sm font-black text-[#0b2d54]">Location</p><p className="mt-1 text-[10px] text-slate-500">{location || "Not recorded"}</p></div></div>
                  {locationOptions.length > 0 && <button type="button" onClick={() => setShowLocation((value) => !value)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-[#0b2d54]">{showLocation ? "Done" : "Change"}</button>}
                </div>
                {showLocation && <div className="mt-3 flex flex-wrap gap-2">{locationOptions.map((option) => <button key={option} type="button" onClick={() => { setLocation(option); setShowLocation(false); }} className={"rounded-full border px-3 py-2 text-[10px] font-black " + (location === option ? "border-[#24c1c4] bg-[#e8f8f7] text-[#0b2d54]" : "border-slate-200 bg-white text-slate-500")}>{option}</button>)}<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Another location" className="min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold sm:max-w-xs" /></div>}
              </section>
            )}

            <div className="rounded-[22px] border border-slate-200 bg-[#fbfdfd] p-4">
              <button type="button" onClick={() => setShowMedicine((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
                <div><p className="text-sm font-black text-[#0b2d54]">Medicine</p><p className="mt-1 text-[11px] text-slate-500">{medication.medicationId || medication.reportedMedicationName ? "Medicine context added" : "Optional — tell Sympto what you took."}</p></div>
                <ChevronDown className={"h-5 w-5 text-slate-400 transition " + (showMedicine ? "rotate-180" : "")} />
              </button>
              {showMedicine && <div className="mt-4"><SymptomMedicationPicker activeMedications={activeMedications} value={medication} onChange={setMedication} />{(medication.medicationId || medication.reportedMedicationName) && <div className="mt-4 grid gap-3 sm:grid-cols-2"><input type="number" min={0} max={10} value={medicationEffectiveness} onChange={(event) => setMedicationEffectiveness(event.target.value)} placeholder="Effectiveness 0–10" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold" /><textarea value={medicationSideEffects} onChange={(event) => setMedicationSideEffects(event.target.value)} rows={2} placeholder="Any side effects?" className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-5" /></div>}</div>}
            </div>

            <button type="button" onClick={() => setAdvanced((value) => !value)} className="flex w-full items-center justify-between rounded-[22px] border border-slate-200 bg-[#fbfdfd] p-4 text-left">
              <div><p className="text-sm font-black text-[#0b2d54]">{advanced ? "Hide extra details" : "Add more details"}</p><p className="mt-1 text-[11px] text-slate-500">Only add these when they help explain what changed.</p></div>
              <ChevronDown className={"h-5 w-5 text-slate-400 transition " + (advanced ? "rotate-180" : "")} />
            </button>

            {advanced && (
              <div className="space-y-5 rounded-[24px] bg-[#f8fbfb] p-4 ring-1 ring-[#e1edef] sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label><span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">How often?</span><select value={frequency} onChange={(event) => setFrequency(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"><option value="">Not sure</option>{frequencyOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label><span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Duration each time</span><div className="mt-2 flex items-center gap-2"><input type="number" min={1} value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} placeholder="30" className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold" /><span className="text-[10px] font-bold text-slate-400">min</span></div></label>
                </div>
                <label><span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Pain score</span><input type="number" min={0} max={10} value={painScore} onChange={(event) => setPainScore(event.target.value)} placeholder="0–10" className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold sm:max-w-xs" /></label>
                <label><span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Possible trigger</span><input value={suspectedTrigger} onChange={(event) => setSuspectedTrigger(event.target.value)} placeholder="What happened before it changed?" className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label><span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">What makes it worse?</span><textarea value={aggravatingFactors} onChange={(event) => setAggravatingFactors(event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold" /></label>
                  <label><span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">What makes it better?</span><textarea value={relievingFactors} onChange={(event) => setRelievingFactors(event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold" /></label>
                </div>
                <label><span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Anything else?</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={4000} placeholder="Only what is useful for this update." className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-5" /></label>
              </div>
            )}

            {error && <div role="alert" className="rounded-[18px] bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">{error}</div>}

            <div className="sticky bottom-3 pt-1">
              <button type="button" onClick={save} disabled={!canSave || saving} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-[#0b2d54] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(11,45,84,0.18)] disabled:cursor-not-allowed disabled:opacity-45">
                {saving ? "Saving update…" : stillPresent ? "Save update" : "Mark symptom resolved"} <Save className="h-4 w-4 text-[#24c1c4]" />
              </button>
              <p className="mt-2 text-center text-[9px] leading-5 text-slate-400">You never need to repeat the original symptom details.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  </ProtectedRoute>;
}
