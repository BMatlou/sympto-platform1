"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardPlus, Mic, Save, Sparkles, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { healthJournalService, type TalkToSymptoResult } from "@/services/health-journal.service";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
};

function human(value: string | null | undefined) {
  return String(value ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AIHealthHelperFab() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const [talkResult, setTalkResult] = useState<TalkToSymptoResult | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };

    setSpeechSupported(
      Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition),
    );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeHelper();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      recognitionRef.current?.abort?.();
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const closeHelper = () => {
    recognitionRef.current?.abort?.();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setOpen(false);
  };

  const openHelper = () => {
    setOpen(true);
    setMessage("");
    setTalkResult(null);
    setProcessing(false);
    setProcessError("");
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const startListening = () => {
    if (typeof window === "undefined") return;

    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };

    const Recognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setProcessError("Voice input is not available on this device. Type your update below instead.");
      return;
    }

    recognitionRef.current?.abort?.();

    const recognition = new Recognition();
    recognition.lang = "en-ZA";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
      setProcessError("");
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
      setProcessError("I couldn't capture your voice. Please try again or type the update below.");
    };

    recognition.onresult = (event) => {
      const spoken = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (!spoken) return;

      setMessage(spoken);
      setTalkResult(null);
      setProcessError("");
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const analyzeWithSympto = async () => {
    const text = message.trim();
    if (!text || !user?.id || processing) return;

    setProcessing(true);
    setProcessError("");

    try {
      const result = await healthJournalService.talkToSympto(text);
      setTalkResult(result);
    } catch (error: any) {
      setProcessError(
        error?.response?.data?.message ||
          "We could not connect this update to Sympto. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const symptomHref = useMemo(() => {
    const draft = talkResult?.intelligence.draft;
    if (!draft?.symptomName) return "/log-symptom";

    const params = new URLSearchParams();
    params.set("symptom", draft.symptomName);
    if (draft.severity) params.set("severity", draft.severity);
    if (draft.onsetLabel) params.set("started", draft.onsetLabel);
    if (draft.location) params.set("location", draft.location);

    return `/log-symptom?${params.toString()}`;
  }, [talkResult]);

  const insight = talkResult?.intelligence.assessment;
  const toneClasses = insight
    ? {
        calm: "border-[#24c1c4]/30 bg-[#24c1c4]/10 text-[#0b2d54]",
        watch: "border-amber-200 bg-amber-50 text-amber-950",
        urgent: "border-red-200 bg-red-50 text-red-950",
      }[insight.tone]
    : "";

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={openHelper}
          className="pointer-events-auto inline-flex min-h-14 items-center gap-3 rounded-full bg-[#0b2d54] px-5 py-3 text-sm font-extrabold text-white shadow-[0_12px_35px_rgba(11,45,84,0.28)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-[#082544] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24c1c4]/50 active:translate-y-0 sm:px-6 sm:text-base"
          aria-label="Talk to Sympto"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#24c1c4] text-lg text-slate-950 shadow-[0_0_0_5px_rgba(36,193,196,0.10)]">
            <Mic className="relative h-5 w-5" aria-hidden="true" />
          </span>
          <span>Talk to Sympto</span>
          <Sparkles className="h-5 w-5 text-[#24c1c4]" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-helper-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeHelper();
          }}
        >
          <section className="max-h-[calc(100vh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#24c1c4]">
                  Health companion
                </p>
                <h2 id="ai-helper-title" className="mt-1 text-xl font-bold text-[#0b2d54]">
                  Talk to Sympto
                </h2>
              </div>
              <button
                type="button"
                onClick={closeHelper}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"
                aria-label="Close Talk to Sympto"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </header>

            <div className="px-5 pb-6 pt-5 sm:px-6 sm:pb-7">
              <div className="rounded-3xl bg-gradient-to-br from-[#0b2d54] to-slate-950 p-6 text-center text-white">
                <div
                  className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 ${
                    listening
                      ? "animate-pulse border-[#24c1c4] bg-[#24c1c4]/20"
                      : "border-white/15 bg-white/10"
                  }`}
                >
                  <Mic
                    className={`h-10 w-10 ${
                      listening ? "text-[#24c1c4]" : "text-white"
                    }`}
                    aria-hidden="true"
                  />
                </div>

                <p className="mt-5 text-lg font-bold">
                  {listening ? "I’m listening…" : "Tell Sympto what’s happening"}
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/70">
                  {listening
                    ? "Speak naturally. When you stop, Sympto will show you what it understood before anything clinical is saved."
                    : "Use your voice or type your update. Sympto will decide whether it belongs in your symptom record or general health journal."}
                </p>

                <button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  disabled={processing}
                  className="mt-5 inline-flex min-h-14 min-w-44 items-center justify-center gap-2 rounded-full bg-[#24c1c4] px-6 text-sm font-extrabold text-slate-950 shadow-lg transition hover:bg-[#5edadd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Mic className="h-5 w-5" aria-hidden="true" />
                  {listening ? "Stop listening" : "Speak to Sympto"}
                </button>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="sympto-message"
                  className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400"
                >
                  Your update
                </label>
                <textarea
                  id="sympto-message"
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    setTalkResult(null);
                    setProcessError("");
                  }}
                  rows={4}
                  placeholder="For example: “I have had a headache since yesterday and it is getting worse.”"
                  className="mt-2 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-[#0b2d54] outline-none transition focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10"
                />
              </div>

              {processError && (
                <p
                  className="mt-3 rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
                  role="alert"
                >
                  {processError}
                </p>
              )}

              {message.trim() && !talkResult && (
                <button
                  type="button"
                  onClick={analyzeWithSympto}
                  disabled={processing || !user?.id}
                  className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 text-base font-extrabold text-white transition hover:bg-[#082544] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24c1c4]/30"
                >
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  {processing ? "Sympto is understanding your update…" : "Review with Sympto"}
                </button>
              )}

              {talkResult && insight && (
                <div className={`mt-4 rounded-2xl border p-4 ${toneClasses}`} aria-live="polite">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 text-xl" aria-hidden="true">
                      {insight.tone === "urgent" ? "!" : "✨"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold uppercase tracking-wide opacity-60">
                        Sympto assessment
                      </p>
                      <h3 className="mt-1 text-base font-extrabold">{insight.title}</h3>
                      <p className="mt-1 text-sm leading-6 opacity-80">{insight.message}</p>
                    </div>
                  </div>

                  {talkResult.intelligence.safetySignals.length > 0 && (
                    <div className="mt-4 rounded-xl bg-white/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] opacity-60">
                        Warning signs detected
                      </p>
                      <ul className="mt-2 space-y-1 text-sm font-semibold leading-5">
                        {talkResult.intelligence.safetySignals.map((signal) => (
                          <li key={signal}>• {signal}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {talkResult?.intelligence.inputType === "SYMPTOM" && (
                <div className="mt-4 rounded-2xl border border-[#dce8ec] bg-[#f7fbfb] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#24aeb3]">
                    Symptom draft — not saved yet
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Symptom</p>
                      <p className="mt-1 text-sm font-black text-[#0b2d54]">
                        {talkResult.intelligence.draft.symptomName}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Severity</p>
                      <p className="mt-1 text-sm font-black text-[#0b2d54]">
                        {human(talkResult.intelligence.draft.severity) || "Not stated"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Started</p>
                      <p className="mt-1 text-sm font-black text-[#0b2d54]">
                        {talkResult.intelligence.draft.onsetLabel}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Pattern</p>
                      <p className="mt-1 text-sm font-black text-[#0b2d54]">
                        {human(talkResult.intelligence.draft.progression) || "Not stated"}
                      </p>
                    </div>
                  </div>

                  {talkResult.intelligence.draft.location && (
                    <p className="mt-3 text-xs font-semibold text-slate-600">
                      Location · {talkResult.intelligence.draft.location}
                    </p>
                  )}

                  {talkResult.intelligence.draft.followUpQuestion && (
                    <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                        Sympto needs one more detail
                      </p>
                      <p className="mt-1 text-sm font-bold leading-5 text-[#0b2d54]">
                        {talkResult.intelligence.draft.followUpQuestion}
                      </p>
                    </div>
                  )}

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Sympto will not silently turn an inferred symptom into a medical record. Review the structured form first, then save it yourself.
                  </p>

                  <Link
                    href={symptomHref}
                    onClick={closeHelper}
                    className="mt-4 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 text-sm font-extrabold text-white transition hover:bg-[#082544] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24c1c4]/30"
                  >
                    <ClipboardPlus className="h-5 w-5" aria-hidden="true" />
                    Continue symptom log
                  </Link>
                </div>
              )}

              {talkResult?.intelligence.inputType === "URGENT_CONCERN" && (
                <div className="mt-4 space-y-2">
                  {talkResult.intelligence.actions
                    .filter((action) => action.href.startsWith("tel:"))
                    .map((action) => (
                      <a
                        key={`${action.href}-${action.label}`}
                        href={action.href}
                        className="flex min-h-14 items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-extrabold text-white shadow-lg transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
                      >
                        {action.label}
                      </a>
                    ))}
                  <Link
                    href={symptomHref}
                    onClick={closeHelper}
                    className="flex min-h-14 items-center justify-center rounded-2xl border-2 border-slate-200 px-5 text-sm font-extrabold text-[#0b2d54] hover:border-[#24c1c4]"
                  >
                    Review in symptom log
                  </Link>
                </div>
              )}

              {talkResult?.intelligence.inputType === "GENERAL_HEALTH" && (
                <div className="mt-4 rounded-2xl border border-[#24c1c4]/20 bg-[#f7fbfb] p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]">
                      <Save className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#24aeb3]">
                        Saved to My Health Record
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        This update did not look like a specific symptom, so Sympto stored it as a journal entry and kept the surrounding health context available.
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/health-journal"
                    onClick={closeHelper}
                    className="mt-4 flex min-h-12 items-center justify-center rounded-xl border-2 border-slate-200 px-4 text-xs font-extrabold text-[#0b2d54] hover:border-[#24c1c4]"
                  >
                    Open My Health Record
                  </Link>
                </div>
              )}

              {talkResult && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Connected context
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {talkResult.intelligence.context.activeMedicationCount} active medication
                    {talkResult.intelligence.context.activeMedicationCount === 1 ? "" : "s"}, {talkResult.intelligence.context.conditionCount} condition
                    {talkResult.intelligence.context.conditionCount === 1 ? "" : "s"}, {talkResult.intelligence.context.recentSymptomCount} recent symptom
                    {talkResult.intelligence.context.recentSymptomCount === 1 ? "" : "s"} and {talkResult.intelligence.context.recentAiAssessmentCount} previous AI assessment
                    {talkResult.intelligence.context.recentAiAssessmentCount === 1 ? "" : "s"} are available for continuity.
                  </p>

                  {talkResult.intelligence.insights.length > 0 && (
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                      {talkResult.intelligence.insights.map((item, index) => (
                        <li key={index}>• {item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <p className="mt-5 text-center text-[10px] leading-5 text-slate-400">
                Sympto helps organise and contextualise your health information. It does not provide a diagnosis.
              </p>

              <button
                type="button"
                onClick={closeHelper}
                className="mt-3 flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-5 text-sm font-extrabold text-[#0b2d54] hover:border-[#24c1c4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24c1c4]/30"
              >
                Done — Close Talk to Sympto
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
