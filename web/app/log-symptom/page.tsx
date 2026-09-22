"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardPlus, Save, Sparkles, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthJournalService, type SymptomIntelligenceResult } from "@/services/health-journal.service";

const severityOptions = [
  { value: "MILD", label: "Mild", hint: "Noticeable, but manageable" },
  { value: "MODERATE", label: "Moderate", hint: "Affects my day" },
  { value: "SEVERE", label: "Severe", hint: "Hard to manage" },
] as const;

const progressionOptions = [
  ["IMPROVING", "Improving"],
  ["STABLE", "Stable"],
  ["WORSENING", "Getting worse"],
  ["FLUCTUATING", "Comes and goes"],
] as const;

const frequencyOptions = [
  ["CONSTANT", "Constant"],
  ["INTERMITTENT", "Intermittent"],
  ["OCCASIONAL", "Occasional"],
  ["RARE", "Rare"],
  ["UNKNOWN", "Not sure"],
] as const;

const painCharacterOptions = [
  ["SHARP", "Sharp"],
  ["DULL", "Dull"],
  ["THROBBING", "Throbbing"],
  ["STABBING", "Stabbing"],
  ["BURNING", "Burning"],
  ["CRAMPING", "Cramping"],
  ["PRESSURE", "Pressure"],
  ["TIGHTNESS", "Tightness"],
  ["ACHING", "Aching"],
  ["OTHER", "Other"],
] as const;

function onsetToDate(value: string) {
  if (value === "I am not sure") return undefined;
  const date = new Date();
  if (value === "Yesterday") date.setDate(date.getDate() - 1);
  if (value === "A few days ago") date.setDate(date.getDate() - 3);
  if (value === "More than a week ago") date.setDate(date.getDate() - 8);
  return date.toISOString();
}

function ResultIcon({ tone }: { tone: SymptomIntelligenceResult["assessment"]["tone"] }) {
  if (tone === "urgent") return <TriangleAlert className="h-10 w-10" aria-hidden="true" />;
  return <CheckCircle2 className="h-10 w-10" aria-hidden="true" />;
}

function human(value: string | null | undefined) {
  return String(value ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LogSymptomPage() {
  const { data: dashboard } = useDashboard();
  const activeMedications = useMemo(
    () => (dashboard?.today?.activeMedications ?? dashboard?.medications ?? []).filter((medication: any) => {
      const status = String(medication?.status ?? "ACTIVE").toUpperCase();
      return status === "ACTIVE" || (status === "PAUSED" && medication?.ongoing !== false);
    }),
    [dashboard],
  );

  const [symptom, setSymptom] = useState("");
  const [severity, setSeverity] = useState<(typeof severityOptions)[number]["value"]>("MILD");
  const [started, setStarted] = useState("Today");
  const [details, setDetails] = useState("");
  const [progression, setProgression] = useState("");
  const [frequency, setFrequency] = useState("");
  const [painCharacter, setPainCharacter] = useState("");
  const [painScore, setPainScore] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [intermittent, setIntermittent] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [suspectedTrigger, setSuspectedTrigger] = useState("");
  const [triggerDetails, setTriggerDetails] = useState("");
  const [aggravatingFactors, setAggravatingFactors] = useState("");
  const [relievingFactors, setRelievingFactors] = useState("");
  const [resolved, setResolved] = useState(false);
  const [medicationId, setMedicationId] = useState("");
  const [prescriptionId, setPrescriptionId] = useState("");
  const [medicationImproved, setMedicationImproved] = useState("");
  const [medicationEffectiveness, setMedicationEffectiveness] = useState("");
  const [medicationSideEffects, setMedicationSideEffects] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SymptomIntelligenceResult | null>(null);
  const [error, setError] = useState("");

  const selectedMedication = activeMedications.find(
    (medication: any) => String(medication?.medicationId ?? medication?.medication?.id ?? medication?.id ?? "") === medicationId,
  );

  const save = async () => {
    if (!symptom.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const exactPainScore = painScore.trim() ? Number(painScore) : undefined;
      const duration = durationMinutes.trim() ? Number(durationMinutes) : undefined;
      const effectiveness = medicationEffectiveness.trim() ? Number(medicationEffectiveness) : undefined;
      const intelligence = await healthJournalService.processSymptom({
        symptomName: symptom.trim(),
        severity,
        startedAt: onsetToDate(started),
        onsetUncertain: started === "I am not sure",
        resolved,
        progression: progression || undefined,
        frequency: frequency || undefined,
        painCharacter: painCharacter || undefined,
        painScore: Number.isFinite(exactPainScore) ? exactPainScore : undefined,
        durationMinutes: Number.isFinite(duration) && duration! > 0 ? duration : undefined,
        intermittent,
        recurring,
        suspectedTrigger: suspectedTrigger.trim() || undefined,
        triggerDetails: triggerDetails.trim() || undefined,
        aggravatingFactors: aggravatingFactors.trim() || undefined,
        relievingFactors: relievingFactors.trim() || undefined,
        details: details.trim() || undefined,
        medicationId: medicationId || undefined,
        prescriptionId: prescriptionId || undefined,
        medicationImproved: medicationImproved === "YES" ? true : medicationImproved === "NO" ? false : undefined,
        medicationEffectiveness: Number.isFinite(effectiveness) ? effectiveness : undefined,
        medicationSideEffects: medicationSideEffects.trim() || undefined,
      });
      setResult(intelligence);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "We could not save and connect your symptom. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    const urgent = result.assessment.tone === "urgent";
    const watch = result.assessment.tone === "watch";
    const toneClass = urgent
      ? "bg-red-50 text-red-700 ring-red-100"
      : watch
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-[#24c1c4]/10 text-[#0b2d54] ring-[#24c1c4]/15";
    const eyebrow = urgent ? "Safety first" : "Connected to My Health Record";

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-[#0b2d54] sm:px-6">
        <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
          <section className="w-full rounded-[2rem] bg-white p-7 shadow-[0_20px_60px_rgba(11,45,84,0.10)] ring-1 ring-slate-200 sm:p-10">
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ring-1 ${toneClass}`}><ResultIcon tone={result.assessment.tone} /></div>
            <p className={`mt-6 text-center text-xs font-black uppercase tracking-[0.18em] ${urgent ? "text-red-600" : watch ? "text-amber-600" : "text-[#24c1c4]"}`}>{eyebrow}</p>
            <h1 className="mt-2 text-center text-3xl font-black leading-tight">{result.assessment.title}</h1>
            <p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-slate-500">{result.assessment.message}</p>

            <div className="mt-7 rounded-2xl border border-[#dce8ec] bg-[#f7fbfb] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#71839a]">Saved symptom</p>
              <p className="mt-1 text-lg font-black text-[#0b2d54]">{symptom}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-slate-600">
                <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">{human(severity)}</span>
                <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">{started}</span>
                {progression && <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">{human(progression)}</span>}
                {frequency && <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">{human(frequency)}</span>}
                {painScore && <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">Pain {painScore}/10</span>}
                {resolved && <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">Resolved</span>}
              </div>
            </div>

            {result.insights.length > 0 && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-[#0b2d54]"><Sparkles className="h-4 w-4 text-[#24c1c4]" /> Automated safety check</div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {result.insights.map((insight, index) => <li key={index} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#24c1c4]" />{insight}</li>)}
                </ul>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-[#24c1c4]/15 bg-white p-4 ring-1 ring-slate-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#24aeb3]">Connected health data</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Your symptom stays in its own record while Sympto keeps the surrounding health context linked for comparison.</p>
                </div>
                <span className="rounded-full bg-[#0b2d54]/[0.05] px-2.5 py-1 text-[9px] font-black text-[#0b2d54]">{result.context.recentSymptomCount} recent</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Medicines", result.context.activeMedicationCount],
                  ["Conditions", result.context.conditionCount],
                  ["Allergies", result.context.allergyCount],
                  ["Goals", result.context.activeGoalCount],
                ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-[#f7fbfb] p-3 ring-1 ring-slate-100"><p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{value}</p></div>)}
              </div>
              {selectedMedication && <p className="mt-3 text-[10px] leading-5 text-slate-500"><span className="font-black text-slate-600">Medicine linked:</span> {selectedMedication.name || selectedMedication.medication?.name || selectedMedication.medication?.genericName}</p>}
              {suspectedTrigger.trim() && <p className="mt-2 text-[10px] leading-5 text-slate-500"><span className="font-black text-slate-600">Possible trigger:</span> {suspectedTrigger.trim()}</p>}
            </div>

            <div className="mt-5 rounded-2xl bg-[#0b2d54]/[0.04] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">What happens next</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Your symptom is now part of your longitudinal health record. You can review the saved record in Smart Journal, where future symptoms, medicines, measurements, and care events can be compared over time.</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href={`/symptom-logs/${encodeURIComponent(result.symptomLogId)}`} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 text-sm font-black text-white shadow-lg transition hover:bg-[#071f3a]"><ClipboardPlus className="h-4 w-4" aria-hidden="true" /> View saved symptom</Link>
              <Link href="/health-journal" className="flex min-h-14 items-center justify-center rounded-2xl border-2 border-slate-200 px-5 text-sm font-black text-[#0b2d54] transition hover:border-[#24c1c4]">View Smart Journal</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-[#0b2d54] sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-500 hover:bg-white hover:text-[#0b2d54]"><ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back to Health Home</Link>
        <section className="mt-5 rounded-[2rem] bg-white p-6 shadow-[0_20px_60px_rgba(11,45,84,0.10)] ring-1 ring-slate-200 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#24c1c4]">Smart Journal</p>
              <h1 className="mt-2 text-3xl font-black">How are you feeling?</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Tell Sympto what you are experiencing. Start with the essentials, then add more detail when it matters. Your symptom becomes part of your connected health history.</p>
            </div>
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0b2d54] text-white sm:flex"><ClipboardPlus className="h-6 w-6" aria-hidden="true" /></div>
          </div>

          <label className="mt-8 block text-sm font-black text-[#0b2d54]" htmlFor="symptom">What are you feeling?</label>
          <input id="symptom" value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder="e.g. headache, cough, tired, stomach pain" className="mt-2 min-h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-semibold outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" autoComplete="off" />

          <fieldset className="mt-7">
            <legend className="text-sm font-black">How strong is it?</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {severityOptions.map((option) => {
                const selected = severity === option.value;
                return <button key={option.value} type="button" onClick={() => setSeverity(option.value)} className={`min-h-20 rounded-2xl border-2 px-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24c1c4]/20 ${selected ? "border-[#24c1c4] bg-[#24c1c4]/10" : "border-slate-200 bg-white hover:border-[#24c1c4]/50"}`} aria-pressed={selected}><span className="block text-sm font-black">{option.label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{option.hint}</span></button>;
              })}
            </div>
          </fieldset>

          <label className="mt-7 block text-sm font-black" htmlFor="started">When did it start?</label>
          <select id="started" value={started} onChange={(e) => setStarted(e.target.value)} className="mt-2 min-h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-semibold outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10">
            <option>Today</option><option>Yesterday</option><option>A few days ago</option><option>More than a week ago</option><option>I am not sure</option>
          </select>

          <details className="mt-5 overflow-hidden rounded-2xl border border-[#dce8ec] bg-[#f8fbfb]">
            <summary className="cursor-pointer list-none px-4 py-4 text-sm font-black text-[#0b2d54]">More symptom details</summary>
            <div className="space-y-5 border-t border-[#e3ecef] bg-white p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="progression">What is it doing?</label>
                  <select id="progression" value={progression} onChange={(e) => setProgression(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-semibold"><option value="">Not sure</option>{progressionOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="frequency">How often?</label>
                  <select id="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-semibold"><option value="">Not sure</option>{frequencyOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="duration">How long each time?</label>
                  <input id="duration" type="number" min={1} inputMode="numeric" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="Minutes" className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-semibold" />
                </div>
                <label className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold sm:mt-6"><input type="checkbox" checked={intermittent} onChange={(e) => setIntermittent(e.target.checked)} /> Comes and goes</label>
                <label className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold sm:mt-6"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Happened before</label>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Pain details <span className="font-medium normal-case tracking-normal text-slate-400">Optional</span></p>
                <div className="mt-2 grid gap-4 sm:grid-cols-[1fr_140px]">
                  <select value={painCharacter} onChange={(e) => setPainCharacter(e.target.value)} className="min-h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-semibold"><option value="">How does the pain feel?</option>{painCharacterOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
                  <input type="number" min={0} max={10} inputMode="numeric" value={painScore} onChange={(e) => setPainScore(e.target.value)} placeholder="Pain 0–10" className="min-h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-semibold" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="trigger">Possible trigger</label><input id="trigger" value={suspectedTrigger} onChange={(e) => setSuspectedTrigger(e.target.value)} placeholder="e.g. after exercise, food, stress" className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-semibold" /></div>
                <div><label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="triggerDetails">What happened before it?</label><input id="triggerDetails" value={triggerDetails} onChange={(e) => setTriggerDetails(e.target.value)} placeholder="Optional context" className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-semibold" /></div>
                <div><label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="aggravating">What makes it worse?</label><textarea id="aggravating" value={aggravatingFactors} onChange={(e) => setAggravatingFactors(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-medium" /></div>
                <div><label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="relieving">What makes it better?</label><textarea id="relieving" value={relievingFactors} onChange={(e) => setRelievingFactors(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-medium" /></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="resolved">Has it gone away?</label>
                  <select id="resolved" value={resolved ? "YES" : "NO"} onChange={(e) => setResolved(e.target.value === "YES")} className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-semibold"><option value="NO">No, it is still there</option><option value="YES">Yes, it has resolved</option></select>
                </div>
              </div>

              {activeMedications.length > 0 && (
                <div className="rounded-2xl border border-[#dce8ec] bg-[#f7fbfb] p-4">
                  <p className="text-xs font-black text-[#0b2d54]">Could this be related to a medicine?</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">Link the symptom to a medicine you already have in Sympto. This does not mean the medicine caused it.</p>
                  <select value={medicationId} onChange={(e) => {
                    const next = activeMedications.find((medication: any) => String(medication?.medicationId ?? medication?.medication?.id ?? medication?.id ?? "") === e.target.value);
                    setMedicationId(e.target.value);
                    setPrescriptionId(next?.prescriptionId ?? "");
                  }} className="mt-3 min-h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-semibold">
                    <option value="">No medicine linked</option>
                    {activeMedications.map((medication: any) => {
                      const id = medication?.medicationId ?? medication?.medication?.id ?? medication?.id;
                      const label = medication?.name || medication?.medication?.name || medication?.medication?.genericName || medication?.medication?.brandName || "Medicine";
                      return <option key={String(id)} value={String(id)}>{label}</option>;
                    })}
                  </select>

                  {medicationId && (
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div><label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Did it improve the symptom?</label><select value={medicationImproved} onChange={(e) => setMedicationImproved(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-semibold"><option value="">Not sure</option><option value="YES">Yes</option><option value="NO">No</option></select></div>
                        <div><label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="effectiveness">How effective was it? <span className="font-medium normal-case tracking-normal text-slate-400">0–10</span></label><input id="effectiveness" type="number" min={0} max={10} inputMode="numeric" value={medicationEffectiveness} onChange={(e) => setMedicationEffectiveness(e.target.value)} placeholder="Not sure" className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-semibold" /></div>
                      </div>
                      <div><label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500" htmlFor="sideEffects">What changed after taking it?</label><textarea id="sideEffects" value={medicationSideEffects} onChange={(e) => setMedicationSideEffects(e.target.value)} rows={3} placeholder="Any side effect, improvement, or other change you noticed" className="mt-2 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-medium" /></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </details>

          <label className="mt-7 block text-sm font-black" htmlFor="details">Anything else? <span className="font-medium text-slate-400">Optional</span></label>
          <textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="Anything else you want Sympto to remember about this symptom?" className="mt-2 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-base font-medium leading-6 outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />
          {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}
          <button type="button" onClick={save} disabled={!symptom.trim() || saving} className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 text-base font-black text-white shadow-lg transition hover:bg-[#071f3a] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24c1c4]/30"><Save className="h-5 w-5" aria-hidden="true" />{saving ? "Saving your symptom…" : "Save & understand my symptom"}</button>
        </section>
      </div>
    </main>
  );
}
