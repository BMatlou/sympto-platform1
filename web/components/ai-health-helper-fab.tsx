"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Mic, Sparkles, X, Save, ClipboardPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { healthJournalService, type TalkToSymptoResult } from "@/services/health-journal.service";

type Insight = {
  tone: "calm" | "watch" | "urgent";
  title: string;
  message: string;
};

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

const DEMO_SYMPTOM = "I have a headache and feel tired today.";

function createInsight(text: string): Insight {
  const normalized = text.toLowerCase();

  if (/chest pain|can't breathe|cannot breathe|difficulty breathing|fainting|unconscious|severe bleeding|stroke/.test(normalized)) {
    return { tone: "urgent", title: "Please get urgent help", message: "These symptoms can need immediate medical attention. If they are severe or getting worse, seek emergency care now." };
  }

  if (/fever|vomit|vomiting|dizzy|dizziness|shortness of breath|breathless|severe pain|migraine/.test(normalized)) {
    return { tone: "watch", title: "Worth keeping an eye on", message: "Your symptom may need attention if it persists, becomes severe, or is joined by new symptoms. Consider contacting your clinic." };
  }

  return { tone: "calm", title: "Daily health check noted", message: "Your update has been captured for today. Keep tracking how you feel and note any changes." };
}

export default function AIHealthHelperFab() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [insight, setInsight] = useState<Insight | null>(null);
  const [talkResult, setTalkResult] = useState<TalkToSymptoResult | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    setSpeechSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));

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
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setTranscript(DEMO_SYMPTOM);
      setInsight(createInsight(DEMO_SYMPTOM));
      setTalkResult(null);
      setSaved(false);
      return;
    }

    recognitionRef.current?.abort?.();
    const recognition = new Recognition();
    recognition.lang = "en-ZA";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
      setTranscript(DEMO_SYMPTOM);
      setInsight(createInsight(DEMO_SYMPTOM));
      setTalkResult(null);
      setSaved(false);
    };
    recognition.onresult = (event) => {
      const spoken = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ").trim();
      if (!spoken) return;
      setTranscript(spoken);
      setInsight(createInsight(spoken));
      setTalkResult(null);
      setSaved(false);
      setSaveError("");
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const openHelper = () => {
    setOpen(true);
    setInsight(null);
    setTranscript("");
    setTalkResult(null);
    setSaved(false);
    setSaveError("");
  };

  function closeHelper() {
    recognitionRef.current?.abort?.();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setOpen(false);
  }

  const saveToHealthRecord = async () => {
    if (!transcript.trim() || !user?.id || saving || saved) return;
    setSaving(true);
    setSaveError("");
    try {
      const result = await healthJournalService.talkToSympto(transcript.trim());
      setTalkResult(result);
      setInsight(result.intelligence.assessment);
      setSaved(true);
    } catch {
      setSaveError("We could not connect this update to your health record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toneClasses = insight
    ? { calm: "border-[#24c1c4]/30 bg-[#24c1c4]/10 text-[#0b2d54]", watch: "border-amber-200 bg-amber-50 text-amber-950", urgent: "border-red-200 bg-red-50 text-red-950" }[insight.tone]
    : "";

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
        <button type="button" onClick={openHelper} className="pointer-events-auto inline-flex min-h-14 items-center gap-3 rounded-full bg-slate-950 px-6 py-3 text-base font-extrabold text-white shadow-[0_12px_35px_rgba(11,45,84,0.28)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-[#0b2d54] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24c1c4]/50 active:translate-y-0" aria-label="Talk to Sympto">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#24c1c4] text-lg text-slate-950 shadow-[0_0_0_6px_rgba(36,193,196,0.12)]">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#24c1c4]/50" aria-hidden="true" />
            <span className="relative">🎙️</span>
          </span>
          <span>Talk to Sympto</span>
          <Sparkles className="h-5 w-5 text-[#24c1c4]" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="ai-helper-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeHelper(); }}>
          <section className="max-h-[calc(100vh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#24c1c4]">AI Health Helper</p>
                <h2 id="ai-helper-title" className="mt-1 text-xl font-bold text-[#0b2d54]">Talk to Sympto</h2>
              </div>
              <button type="button" onClick={closeHelper} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]" aria-label="Close AI Health Helper">
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </header>

            <div className="px-5 pb-6 pt-5 sm:px-6 sm:pb-7">
              <div className="rounded-3xl bg-gradient-to-br from-[#0b2d54] to-slate-950 p-6 text-center text-white">
                <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 ${listening ? "animate-pulse border-[#24c1c4] bg-[#24c1c4]/20" : "border-white/15 bg-white/10"}`}>
                  <Mic className={`h-10 w-10 ${listening ? "text-[#24c1c4]" : "text-white"}`} aria-hidden="true" />
                </div>
                <p className="mt-5 text-lg font-bold">{listening ? "I’m listening…" : "Speak naturally"}</p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/70">{listening ? "Tell Sympto what you are feeling, in your own words." : "No typing needed. Tap the microphone and tell Sympto about your symptoms."}</p>
                <button type="button" onClick={listening ? stopListening : startListening} className="mt-5 inline-flex min-h-14 min-w-40 items-center justify-center gap-2 rounded-full bg-[#24c1c4] px-6 text-sm font-extrabold text-slate-950 shadow-lg transition hover:bg-[#5edadd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40">
                  <Mic className="h-5 w-5" aria-hidden="true" />
                  {listening ? "Stop listening" : speechSupported ? "Start speaking" : "Simulate symptom"}
                </button>
              </div>

              {transcript && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Today’s update</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#0b2d54]">“{transcript}”</p>
                </div>
              )}

              {insight && (
                <div className={`mt-4 rounded-2xl border p-4 ${toneClasses}`} aria-live="polite">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 text-xl" aria-hidden="true">✨</div>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wide opacity-60">Sympto Insight</p>
                      <h3 className="mt-1 text-base font-extrabold">{insight.title}</h3>
                      <p className="mt-1 text-sm leading-6 opacity-80">{insight.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {talkResult && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4" aria-live="polite">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Connected context</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {talkResult.intelligence.context.activeMedicationCount} active medication{talkResult.intelligence.context.activeMedicationCount === 1 ? "" : "s"}, {talkResult.intelligence.context.conditionCount} condition{talkResult.intelligence.context.conditionCount === 1 ? "" : "s"}, {talkResult.intelligence.context.recentSymptomCount} recent symptom entr{talkResult.intelligence.context.recentSymptomCount === 1 ? "y" : "ies"}, and {talkResult.intelligence.context.recentAiAssessmentCount} previous AI assessment{talkResult.intelligence.context.recentAiAssessmentCount === 1 ? "" : "s"} are available for continuity.
                  </p>
                  {talkResult.intelligence.insights.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm leading-6 text-slate-600">
                      {talkResult.intelligence.insights.map((item, index) => <li key={index}>• {item}</li>)}
                    </ul>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {talkResult.intelligence.actions.slice(0, 4).map((action) => (
                      <Link key={`${action.href}-${action.label}`} href={action.href} onClick={closeHelper} className="flex min-h-12 items-center justify-center rounded-xl border-2 border-slate-200 px-3 text-center text-xs font-extrabold text-[#0b2d54] hover:border-[#24c1c4]">{action.label}</Link>
                    ))}
                  </div>
                </div>
              )}

              {transcript && (
                <div className="mt-4 space-y-2">
                  <button type="button" onClick={saveToHealthRecord} disabled={saving || saved || !user?.id} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 text-base font-extrabold text-white transition hover:bg-[#071f3a] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24c1c4]/30">
                    <Save className="h-5 w-5" aria-hidden="true" />
                    {saved ? "Connected to My Health Record" : saving ? "Connecting your health information…" : "Save & connect to My Health Record"}
                  </button>
                  <Link href="/log-symptom" onClick={closeHelper} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 text-base font-extrabold text-[#0b2d54] transition hover:border-[#24c1c4] hover:bg-slate-50">
                    <ClipboardPlus className="h-5 w-5" aria-hidden="true" />
                    Log this as a symptom
                  </Link>
                  {saveError && <p className="text-center text-sm font-semibold text-red-600" role="alert">{saveError}</p>}
                </div>
              )}

              <button type="button" onClick={closeHelper} className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-5 text-base font-extrabold text-[#0b2d54] hover:border-[#24c1c4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24c1c4]/30">
                Done — Close AI Helper
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
