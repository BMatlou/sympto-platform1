"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mic, Save, Sparkles } from "lucide-react";
import { useState } from "react";
import {
  healthJournalService,
  type SymptomIntelligenceResult,
} from "@/services/health-journal.service";

const severityOptions = [
  { value: "MILD", label: "Mild", hint: "Noticeable, but manageable" },
  { value: "MODERATE", label: "Moderate", hint: "Affects my day" },
  { value: "SEVERE", label: "Severe", hint: "Hard to manage" },
] as const;

function onsetToDate(value: string) {
  const date = new Date();
  if (value === "Yesterday") date.setDate(date.getDate() - 1);
  if (value === "A few days ago") date.setDate(date.getDate() - 3);
  if (value === "More than a week ago") date.setDate(date.getDate() - 8);
  if (value === "I am not sure") return undefined;
  return date.toISOString();
}

export default function LogSymptomPage() {
  const [symptom, setSymptom] = useState("");
  const [severity, setSeverity] = useState<(typeof severityOptions)[number]["value"]>("MILD");
  const [started, setStarted] = useState("Today");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SymptomIntelligenceResult | null>(null);
  const [error, setError] = useState("");

  const save = async () => {
    if (!symptom.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const intelligence = await healthJournalService.processSymptom({
        symptomName: symptom.trim(),
        severity,
        startedAt: onsetToDate(started),
        details: details.trim() || undefined,
      });
      setResult(intelligence);
    } catch {
      setError("We could not save and connect your symptom. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-[#0b2d54] sm:px-6">
        <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
          <section className="w-full rounded-[2rem] bg-white p-7 shadow-[0_20px_60px_rgba(11,45,84,0.10)] ring-1 ring-slate-200 sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#24c1c4]/15 text-[#0b2d54]"><CheckCircle2 className="h-10 w-10" /></div>
            <p className="mt-6 text-center text-xs font-black uppercase tracking-[0.18em] text-[#24c1c4]">Connected to My Health Record</p>
            <h1 className="mt-2 text-center text-3xl font-black">{result.assessment.title}</h1>
            <p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-slate-500">{result.assessment.message}</p>

            {result.insights.length > 0 && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-[#0b2d54]"><Sparkles className="h-4 w-4 text-[#24c1c4]" /> What Sympto connected</div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {result.insights.map((insight, index) => <li key={index}>• {insight}</li>)}
                </ul>
              </div>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {result.actions.map((action) => (
                <Link key={`${action.href}-${action.label}`} href={action.href} className="flex min-h-14 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-4 text-center text-sm font-black text-[#0b2d54] transition hover:border-[#24c1c4] hover:bg-slate-50">
                  {action.label}
                </Link>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href="/health-journal" className="flex min-h-14 items-center justify-center rounded-2xl bg-[#0b2d54] px-5 text-sm font-black text-white">View Smart Journal</Link>
              <Link href="/" className="flex min-h-14 items-center justify-center rounded-2xl border-2 border-slate-200 px-5 text-sm font-black text-[#0b2d54]">Back to Health Home</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-[#0b2d54] sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-500 hover:bg-white hover:text-[#0b2d54]"><ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back to Health Home</Link>
        <section className="mt-5 rounded-[2rem] bg-white p-6 shadow-[0_20px_60px_rgba(11,45,84,0.10)] ring-1 ring-slate-200 sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#24c1c4]">Smart Journal</p><h1 className="mt-2 text-3xl font-black">How are you feeling?</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Tell Sympto what you are experiencing. Your symptom will be connected to your health history so future entries can be compared with your other health information.</p></div><div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0b2d54] text-white sm:flex"><Mic className="h-6 w-6" /></div></div>
          <label className="mt-8 block text-sm font-black text-[#0b2d54]" htmlFor="symptom">What are you feeling?</label>
          <input id="symptom" value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder="e.g. headache, tired, stomach pain" className="mt-2 min-h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-semibold outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />
          <fieldset className="mt-7"><legend className="text-sm font-black">How strong is it?</legend><div className="mt-3 grid gap-3 sm:grid-cols-3">{severityOptions.map((option) => { const selected = severity === option.value; return <button key={option.value} type="button" onClick={() => setSeverity(option.value)} className={`min-h-20 rounded-2xl border-2 px-4 text-left transition ${selected ? "border-[#24c1c4] bg-[#24c1c4]/10" : "border-slate-200 bg-white hover:border-[#24c1c4]/50"}`} aria-pressed={selected}><span className="block text-sm font-black">{option.label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{option.hint}</span></button>; })}</div></fieldset>
          <label className="mt-7 block text-sm font-black" htmlFor="started">When did it start?</label>
          <select id="started" value={started} onChange={(e) => setStarted(e.target.value)} className="mt-2 min-h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-semibold outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10"><option>Today</option><option>Yesterday</option><option>A few days ago</option><option>More than a week ago</option><option>I am not sure</option></select>
          <label className="mt-7 block text-sm font-black" htmlFor="details">Anything else? <span className="font-medium text-slate-400">Optional</span></label>
          <textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="What makes it better or worse? Any other detail you want Sympto to remember?" className="mt-2 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-base font-medium leading-6 outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />
          {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}
          <button type="button" onClick={save} disabled={!symptom.trim() || saving} className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 text-base font-black text-white shadow-lg transition hover:bg-[#071f3a] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24c1c4]/30"><Save className="h-5 w-5" aria-hidden="true" />{saving ? "Connecting your health information…" : "Save & understand my symptom"}</button>
        </section>
      </div>
    </main>
  );
}
