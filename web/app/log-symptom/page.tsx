"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardPlus, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { healthJournalService, type SymptomIntelligenceResult } from "@/services/health-journal.service";

const severityOptions = [
  { value: "MILD", label: "Mild", hint: "Noticeable, but manageable" },
  { value: "MODERATE", label: "Moderate", hint: "Affects my day" },
  { value: "SEVERE", label: "Severe", hint: "Hard to manage" },
] as const;

const startOptions = [
  "Today",
  "Yesterday",
  "A few days ago",
  "More than a week ago",
  "I am not sure",
] as const;

function onsetToDate(value: string) {
  if (value === "I am not sure") return undefined;
  const date = new Date();
  if (value === "Yesterday") date.setDate(date.getDate() - 1);
  if (value === "A few days ago") date.setDate(date.getDate() - 3);
  if (value === "More than a week ago") date.setDate(date.getDate() - 8);
  return date.toISOString();
}

function human(value: string | null | undefined) {
  return String(value ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LogSymptomPage() {
  const [symptom, setSymptom] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState<(typeof severityOptions)[number]["value"] | "">("");
  const [started, setStarted] = useState<(typeof startOptions)[number]>("Today");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SymptomIntelligenceResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const symptomParam = params.get("symptom")?.trim();
    const severityParam = params.get("severity");
    const startedParam = params.get("started");
    const locationParam = params.get("location")?.trim();

    if (symptomParam) setSymptom(symptomParam);
    if (locationParam) setLocation(locationParam);

    if (
      severityParam === "MILD" ||
      severityParam === "MODERATE" ||
      severityParam === "SEVERE"
    ) {
      setSeverity(severityParam);
    }

    if (startedParam && startOptions.includes(startedParam as (typeof startOptions)[number])) {
      setStarted(startedParam as (typeof startOptions)[number]);
    }
  }, []);

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
      });

      setResult(intelligence);
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          "We could not save your symptom. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    const urgent = result.assessment.tone === "urgent";
    const watch = result.assessment.tone === "watch";

    return (
      <main className="min-h-screen bg-[#f4f9fb] px-4 py-7 text-[#0b2d54] sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Health Home
          </Link>

          <section className="mt-5 rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(11,45,84,0.08)] ring-1 ring-slate-200 sm:p-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200">
              {urgent ? (
                <TriangleAlert className="h-10 w-10 text-red-600" aria-hidden="true" />
              ) : (
                <CheckCircle2
                  className={`h-10 w-10 ${watch ? "text-amber-600" : "text-[#24aeb3]"}`}
                  aria-hidden="true"
                />
              )}
            </div>

            <p className={`mt-5 text-center text-[10px] font-black uppercase tracking-[0.18em] ${urgent ? "text-red-600" : watch ? "text-amber-600" : "text-[#24aeb3]"}`}>
              {urgent ? "Safety first" : "Symptom saved"}
            </p>

            <h1 className="mt-2 text-center text-3xl font-black tracking-[-0.04em]">
              {result.assessment.title}
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-slate-500">
              {result.assessment.message}
            </p>

            <div className="mt-7 rounded-3xl bg-[#f7fbfb] p-5 ring-1 ring-[#dcebed]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Your symptom
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-[#0b2d54]">{symptom}</h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#0b2d54] ring-1 ring-slate-200">
                  {human(severity)}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                  Started · {started}
                </span>
                {location.trim() && (
                  <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                    Location · {location}
                  </span>
                )}
              </div>

              {details.trim() && (
                <div className="mt-4 border-t border-[#dcebed] pt-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    What you told Sympto
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{details}</p>
                </div>
              )}
            </div>

            <section className="mt-5 rounded-3xl border border-[#24c1c4]/20 bg-white p-5 ring-1 ring-slate-100">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-black text-[#0b2d54]">What Sympto did</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    The symptom is now the baseline for a separate monitoring timeline. Future updates can capture changes without making you repeat the original questions.
                  </p>
                </div>
              </div>

              {result.insights.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                  {result.insights.slice(0, 4).map((item, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#24c1c4]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href={`/symptom-logs/${encodeURIComponent(result.symptomLogId)}`}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 text-sm font-black text-white shadow-lg transition hover:bg-[#082544]"
              >
                View symptom timeline
                <ArrowRight className="h-4 w-4 text-[#24c1c4]" />
              </Link>
              <Link
                href="/health-journal"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-5 text-sm font-black text-[#0b2d54] hover:border-[#24c1c4]"
              >
                View Smart Journal
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const canSave = Boolean(symptom.trim() && severity);

  return (
    <main className="min-h-screen bg-[#f4f9fb] px-4 py-7 text-[#0b2d54] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Health Home
        </Link>

        <section className="mt-5 overflow-hidden rounded-[32px] bg-white shadow-[0_18px_55px_rgba(11,45,84,0.08)] ring-1 ring-slate-200">
          <div className="bg-gradient-to-br from-[#08284a] via-[#0d4771] to-[#24babe] p-6 text-white sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
              Smart Journal
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Log a symptom
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              Start with the few details that define what is happening. You can add observations later as the symptom changes.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <label className="block text-sm font-black" htmlFor="symptom">
              What are you feeling?
            </label>
            <input
              id="symptom"
              value={symptom}
              onChange={(event) => setSymptom(event.target.value)}
              placeholder="e.g. headache, cough, nausea, stomach pain"
              className="mt-2 min-h-14 w-full rounded-2xl border-2 border-slate-200 px-4 text-base font-semibold outline-none transition focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10"
              autoComplete="off"
              autoFocus
            />

            <fieldset className="mt-7">
              <legend className="text-sm font-black">How strong is it right now?</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {severityOptions.map((option) => {
                  const selected = severity === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSeverity(option.value)}
                      aria-pressed={selected}
                      className={`min-h-20 rounded-2xl border-2 px-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24c1c4]/20 ${
                        selected
                          ? "border-[#24c1c4] bg-[#24c1c4]/10"
                          : "border-slate-200 bg-white hover:border-[#24c1c4]/50"
                      }`}
                    >
                      <span className="block text-sm font-black">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="mt-7 block text-sm font-black" htmlFor="started">
              When did it start?
            </label>
            <select
              id="started"
              value={started}
              onChange={(event) => setStarted(event.target.value as (typeof startOptions)[number])}
              className="mt-2 min-h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-semibold outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10"
            >
              {startOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>

            <label className="mt-7 block text-sm font-black" htmlFor="location">
              Where do you feel it?
              <span className="ml-2 text-xs font-medium text-slate-400">Optional</span>
            </label>
            <input
              id="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="e.g. behind my right eye, lower abdomen"
              className="mt-2 min-h-14 w-full rounded-2xl border-2 border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10"
            />

            <label className="mt-7 block text-sm font-black" htmlFor="details">
              Anything else Sympto should know?
              <span className="ml-2 text-xs font-medium text-slate-400">Optional</span>
            </label>
            <textarea
              id="details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Describe anything that feels important in your own words."
              className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10"
            />

            <div className="mt-5 rounded-2xl border border-[#dcebed] bg-[#f8fbfb] p-4">
              <p className="text-xs font-black text-[#0b2d54]">You can add more later</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                When you monitor this symptom, Sympto can record whether it is improving or worsening, how often it happens, possible triggers, what helps or makes it worse, medication effects, side effects, and whether it has resolved.
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={save}
              disabled={!canSave || saving}
              className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 text-sm font-black text-white shadow-lg transition hover:bg-[#082544] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24c1c4]/30"
            >
              <ClipboardPlus className="h-5 w-5" aria-hidden="true" />
              {saving ? "Saving symptom…" : "Save symptom"}
            </button>

            <p className="mt-3 text-center text-[10px] leading-5 text-slate-400">
              Sympto helps organise and monitor health information. It does not provide a diagnosis.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
