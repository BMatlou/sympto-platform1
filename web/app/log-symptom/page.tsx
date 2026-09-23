
"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronDown, MapPin, Search, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { healthJournalService, type SymptomIntelligenceResult } from "@/services/health-journal.service";
import { useDashboard } from "@/hooks/use-dashboard";
import SymptomMedicationPicker from "@/components/symptoms/symptom-medication-picker";

const severityOptions = [
  { value: "MILD", label: "Mild", description: "Noticeable, manageable" },
  { value: "MODERATE", label: "Moderate", description: "Affects my day" },
  { value: "SEVERE", label: "Severe", description: "Hard to manage" },
] as const;

const startOptions = [
  ["Today", "Today"],
  ["Yesterday", "Yesterday"],
  ["A few days ago", "A few days"],
  ["More than a week ago", "Over a week"],
  ["I am not sure", "Not sure"],
] as const;

function onsetToDate(value: string) {
  if (value === "I am not sure") return undefined;
  const date = new Date();
  if (value === "Yesterday") date.setDate(date.getDate() - 1);
  if (value === "A few days ago") date.setDate(date.getDate() - 3);
  if (value === "More than a week ago") date.setDate(date.getDate() - 8);
  return date.toISOString();
}

function human(value: unknown) {
  return String(value ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LogSymptomPage() {
  const { data: dashboard } = useDashboard();
  const [symptom, setSymptom] = useState("");
  const [selectedReference, setSelectedReference] = useState<any | null>(null);
  const [symptomResults, setSymptomResults] = useState<any[]>([]);
  const [symptomSearching, setSymptomSearching] = useState(false);
  const [symptomSearchOpen, setSymptomSearchOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState<"MILD" | "MODERATE" | "SEVERE" | "">("");
  const [started, setStarted] = useState<(typeof startOptions)[number][0]>("Today");
  const [details, setDetails] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [medication, setMedication] = useState<{ medicationId?: string; reportedMedicationName?: string; medicationImproved?: boolean }>({});
  const [showMedicine, setShowMedicine] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SymptomIntelligenceResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = symptom.trim();
    if (term.length < 2 || selectedReference?.name === term) {
      setSymptomResults([]);
      setSymptomSearching(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setSymptomSearching(true);
        const records = await healthJournalService.searchSymptomReference({ search: term, limit: 8 });
        if (active) setSymptomResults(records);
      } catch {
        if (active) setSymptomResults([]);
      } finally {
        if (active) setSymptomSearching(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [symptom, selectedReference]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const symptomParam = params.get("symptom")?.trim();
    const severityParam = params.get("severity");
    const startedParam = params.get("started");
    const locationParam = params.get("location")?.trim();
    const medicationParam = params.get("reportedMedicationName")?.trim();

    if (symptomParam) setSymptom(symptomParam);
    if (locationParam) setLocation(locationParam);
    if (medicationParam) {
      setMedication({ reportedMedicationName: medicationParam });
      setShowMedicine(true);
    }
    if (severityParam === "MILD" || severityParam === "MODERATE" || severityParam === "SEVERE") setSeverity(severityParam);
    if (startedParam && startOptions.some(([value]) => value === startedParam)) setStarted(startedParam as (typeof startOptions)[number][0]);

    if (symptomParam) {
      void healthJournalService.searchSymptomReference({ search: symptomParam, limit: 6 }).then((records) => {
        const match = records.find((item: any) => String(item?.name ?? "").toLowerCase() === symptomParam.toLowerCase());
        if (match) setSelectedReference(match);
      });
    }
  }, []);

  const locationOptions: string[] = Array.isArray(selectedReference?.suggestedLocations) ? selectedReference.suggestedLocations : [];
  const activeMedications = useMemo(() => {
    const values = dashboard?.today?.activeMedications ?? dashboard?.medications ?? [];
    return Array.isArray(values) ? values : [];
  }, [dashboard]);

  const chooseSymptom = (reference: any) => {
    setSelectedReference(reference);
    setSymptom(String(reference.name));
    setSymptomResults([]);
    setSymptomSearchOpen(false);
    setLocation("");
  };

  const onSymptomChange = (value: string) => {
    setSymptom(value);
    if (selectedReference && String(selectedReference.name).toLowerCase() !== value.trim().toLowerCase()) {
      setSelectedReference(null);
      setLocation("");
    }
    setSymptomSearchOpen(true);
  };

  const save = async () => {
    if (!symptom.trim() || !severity || saving) return;
    setSaving(true);
    setError("");

    try {
      const intelligence = await healthJournalService.processSymptom({
        symptomName: symptom.trim(),
        severity,
        startedAt: onsetToDate(started),
        onsetUncertain: started === "I am not sure",
        location: location.trim() || undefined,
        details: details.trim() || undefined,
        medicationId: medication.medicationId,
        reportedMedicationName: medication.reportedMedicationName,
        medicationImproved: medication.medicationImproved,
      });
      setResult(intelligence);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "We could not save your symptom. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    const urgent = result.assessment.tone === "urgent";
    const watch = result.assessment.tone === "watch";
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f4f9fb] px-4 py-6 text-[#0b2d54] sm:px-6 sm:py-9">
          <div className="mx-auto max-w-2xl">
            <Link href="/today" className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-bold hover:bg-white"><ArrowLeft className="h-4 w-4" />Today</Link>
            <section className="mt-4 overflow-hidden rounded-[32px] border border-white bg-white shadow-[0_18px_55px_rgba(11,45,84,0.08)]">
              <div className="bg-gradient-to-br from-[#08284a] via-[#0d4771] to-[#24babe] px-6 py-8 text-white sm:px-8">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-white/10 ring-1 ring-white/20">{urgent ? <TriangleAlert className="h-7 w-7" /> : <Check className="h-7 w-7 text-[#bafffa]" />}</div>
                <p className="mt-5 text-center text-[9px] font-black uppercase tracking-[0.2em] text-white/60">{urgent ? "Safety first" : "Saved to your health record"}</p>
                <h1 className="mt-2 text-center text-3xl font-black tracking-[-.04em]">{result.assessment.title}</h1>
                <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-6 text-white/70">{result.assessment.message}</p>
              </div>
              <div className="p-5 sm:p-7">
                <div className="rounded-[24px] bg-[#f7fbfb] p-5 ring-1 ring-[#e0ebef]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Symptom</p><h2 className="mt-1 text-2xl font-black text-[#0b2d54]">{human(symptom)}</h2></div>
                    <span className={"rounded-full px-3 py-1.5 text-[10px] font-black " + (watch ? "bg-amber-50 text-amber-700" : "bg-[#e8f8f7] text-[#0b7b80]")}>{human(severity)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
                    <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">Started · {started}</span>
                    {location && <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">Location · {location}</span>}
                    {medication.medicationId && <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">Medicine linked</span>}
                    {medication.reportedMedicationName && <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">Medicine · {medication.reportedMedicationName}</span>}
                  </div>
                </div>
                <div className="mt-4 rounded-[24px] border border-[#24c1c4]/15 bg-white p-5">
                  <div className="flex gap-3"><Sparkles className="h-5 w-5 shrink-0 text-[#24c1c4]" /><div><p className="text-sm font-black">Sympto will keep this as your baseline.</p><p className="mt-1 text-sm leading-6 text-slate-500">Future check-ins focus on what changed, so you do not have to repeat the original details.</p></div></div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Link href={result.symptomLogId ? "/symptom-logs/" + encodeURIComponent(result.symptomLogId) + "/monitor" : "/today"} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 text-sm font-black text-white">Track this symptom <ArrowRight className="h-4 w-4 text-[#24c1c4]" /></Link>
                  <Link href="/today" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-[#0b2d54]">Back to Today</Link>
                </div>
              </div>
            </section>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  const canSave = Boolean(symptom.trim() && severity);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f4f9fb] px-4 py-5 text-[#0b2d54] sm:px-6 sm:py-8">
        <div className="mx-auto max-w-2xl">
          <Link href="/today" className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-bold hover:bg-white"><ArrowLeft className="h-4 w-4" />Today</Link>

          <section className="mt-4 overflow-visible rounded-[32px] border border-white bg-white shadow-[0_18px_55px_rgba(11,45,84,0.07)]">
            <div className="rounded-t-[32px] bg-gradient-to-br from-[#08284a] via-[#0d4771] to-[#24babe] px-6 py-7 text-white sm:px-8 sm:py-8">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/55">Smart symptom check-in</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-.045em]">What&apos;s happening?</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">A few taps are enough. Sympto will help structure the rest.</p>
            </div>

            <div className="space-y-7 p-5 sm:p-7">
              <div className="relative">
                <label htmlFor="symptom" className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Symptom</label>
                <div className="mt-2 flex items-center gap-2 rounded-[20px] border-2 border-slate-200 bg-white px-4 shadow-sm focus-within:border-[#24c1c4] focus-within:ring-4 focus-within:ring-[#24c1c4]/10">
                  <Search className="h-5 w-5 shrink-0 text-slate-400" />
                  <input id="symptom" value={symptom} onChange={(event) => onSymptomChange(event.target.value)} onFocus={() => setSymptomSearchOpen(true)} autoComplete="off" autoFocus placeholder="e.g. headache, cough, nausea" className="min-h-14 min-w-0 flex-1 border-0 bg-transparent text-base font-semibold outline-none placeholder:text-slate-400" />
                  {symptomSearching && <span className="text-[10px] font-bold text-slate-400">Searching…</span>}
                </div>

                {symptomSearchOpen && symptomResults.length > 0 && (
                  <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(11,45,84,0.14)]">
                    <p className="px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Symptom library</p>
                    {symptomResults.map((reference: any) => (
                      <button key={String(reference.id)} type="button" onClick={() => chooseSymptom(reference)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#24c1c4]/5">
                        <span className="min-w-0"><span className="block text-sm font-black text-[#0b2d54]">{human(reference.name)}</span><span className="mt-1 block text-[10px] text-slate-400">{reference.category || reference.bodySystem || "Symptom reference"}</span></span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#24c1c4]" />
                      </button>
                    ))}
                  </div>
                )}

                {selectedReference && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] bg-[#e8f8f7] px-3.5 py-3 ring-1 ring-[#24c1c4]/15">
                    <div className="flex items-center gap-2"><Check className="h-4 w-4 text-[#0b7b80]" /><span className="text-xs font-black text-[#0b2d54]">Symptom recognised</span></div>
                    <span className="truncate text-xs font-bold text-[#0b7b80]">{human(selectedReference.name)}</span>
                  </div>
                )}
              </div>

              <fieldset>
                <legend className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">How strong is it right now?</legend>
                <div className="mt-3 grid gap-2.5">
                  {severityOptions.map((option) => {
                    const selected = severity === option.value;
                    return (
                      <button key={option.value} type="button" onClick={() => setSeverity(option.value)} aria-pressed={selected} className={"flex min-h-[68px] items-center justify-between rounded-[20px] border-2 px-4 text-left transition " + (selected ? "border-[#24c1c4] bg-[#24c1c4]/8 shadow-[0_8px_24px_rgba(36,193,196,0.10)]" : "border-slate-200 bg-white hover:border-[#24c1c4]/40")}>
                        <div><span className="block text-sm font-black">{option.label}</span><span className="mt-1 block text-[10px] text-slate-500">{option.description}</span></div>
                        {selected && <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0b2d54] text-white"><Check className="h-4 w-4" /></span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">When did it start?</legend>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {startOptions.map(([value, label]) => {
                    const selected = started === value;
                    return <button key={value} type="button" onClick={() => setStarted(value)} className={"shrink-0 rounded-full border px-4 py-2.5 text-[10px] font-black transition " + (selected ? "border-[#24c1c4] bg-[#e8f8f7] text-[#0b2d54]" : "border-slate-200 bg-white text-slate-500 hover:border-[#24c1c4]/40")}>{label}</button>;
                  })}
                </div>
              </fieldset>

              {selectedReference && locationOptions.length > 0 && (
                <section>
                  <div className="flex items-end justify-between gap-3">
                    <div><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Where do you feel it?</p><p className="mt-1 text-[11px] text-slate-500">Choose the area that fits. You can skip this.</p></div>
                    <MapPin className="h-4 w-4 text-[#24c1c4]" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {locationOptions.map((option) => <button key={option} type="button" onClick={() => setLocation(option)} className={"rounded-full border px-3.5 py-2.5 text-[10px] font-black transition " + (location === option ? "border-[#24c1c4] bg-[#e8f8f7] text-[#0b2d54]" : "border-slate-200 bg-white text-slate-500 hover:border-[#24c1c4]/40")}>{option}</button>)}
                  </div>
                  <div className="mt-2"><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Another location" className="min-h-11 w-full rounded-[16px] border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#24c1c4]" /></div>
                </section>
              )}

              {!selectedReference && symptom.trim() && (
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Where do you feel it? <span className="font-medium normal-case tracking-normal">(optional)</span></span>
                  <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. left side of my head" className="mt-2 min-h-12 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />
                </label>
              )}

              <div className="rounded-[22px] border border-slate-200 bg-[#fbfdfd] p-4">
                <button type="button" onClick={() => setShowMedicine((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
                  <div><p className="text-sm font-black text-[#0b2d54]">Add medicine</p><p className="mt-1 text-[11px] text-slate-500">Optional. Sympto can connect what you took with what you noticed.</p></div>
                  <ChevronDown className={"h-5 w-5 text-slate-400 transition " + (showMedicine ? "rotate-180" : "")} />
                </button>
                {showMedicine && <div className="mt-4"><SymptomMedicationPicker activeMedications={activeMedications} value={medication} onChange={setMedication} /></div>}
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-[#fbfdfd] p-4">
                <button type="button" onClick={() => setShowNote((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
                  <div><p className="text-sm font-black text-[#0b2d54]">Add a note</p><p className="mt-1 text-[11px] text-slate-500">Tell Sympto anything important in your own words.</p></div>
                  <ChevronDown className={"h-5 w-5 text-slate-400 transition " + (showNote ? "rotate-180" : "")} />
                </button>
                {showNote && <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={4} maxLength={4000} placeholder="Anything important that Sympto should remember." className="mt-4 w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />}
              </div>

              {error && <div role="alert" className="rounded-[18px] bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">{error}</div>}

              <div className="sticky bottom-3 pt-1">
                <button type="button" onClick={save} disabled={!canSave || saving} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-[#0b2d54] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(11,45,84,0.18)] transition hover:bg-[#082544] disabled:cursor-not-allowed disabled:opacity-45">{saving ? "Saving…" : "Save symptom"} <ArrowRight className="h-4 w-4 text-[#24c1c4]" /></button>
                <p className="mt-2 text-center text-[9px] leading-5 text-slate-400">Sympto organises your health information. It does not provide a diagnosis.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
