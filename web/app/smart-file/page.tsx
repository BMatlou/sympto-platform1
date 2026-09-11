"use client";

import Link from "next/link";
import { ArrowLeft, Check, Clock3, Copy, Loader2, Pill, QrCode, RefreshCw, ShieldCheck, Stethoscope } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { api } from "@/lib/api";

const QR_BASE = "https://quickchart.io/qr";

type Share = { qrToken: string; shortCode: string; expiresAt: string };
type ShareKind = "clinical" | "prescription";
const unwrap = <T,>(value: any): T => value?.data ?? value;

function formatTime(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function SmartFilePage() {
  const [share, setShare] = useState<Share | null>(null);
  const [kind, setKind] = useState<ShareKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  const createShare = async (nextKind: ShareKind) => {
    setLoading(true);
    setError("");
    setCopied(false);
    setKind(nextKind);
    setShare(null);
    try {
      const response = await api.post(nextKind === "clinical" ? "/smart-file/share" : "/smart-file/prescription-share");
      const nextShare = unwrap<Share>(response.data);
      setShare(nextShare);
      setNow(Date.now());
    } catch (requestError) {
      console.error("Failed to create Smart File share session:", requestError);
      setShare(null);
      setError("We could not create a temporary sharing session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!share) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [share]);

  const remaining = share ? new Date(share.expiresAt).getTime() - now : 0;
  const expired = Boolean(share && remaining <= 0);
  const qrContent = share?.qrToken ?? "";
  const qrUrl = useMemo(
    () => `${QR_BASE}?text=${encodeURIComponent(qrContent)}&size=420&margin=2&ecLevel=M`,
    [qrContent],
  );

  const copyCode = async () => {
    if (!share || expired) return;
    try {
      await navigator.clipboard.writeText(share.shortCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("The code could not be copied. You can still read it from the screen.");
    }
  };

  const isClinical = kind === "clinical";
  const scopeTitle = isClinical ? "Clinic / Doctor" : "Pharmacy";

  const resetChoice = () => {
    setShare(null);
    setKind(null);
    setError("");
    setCopied(false);
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb] text-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
          <Link href="/dashboard" className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#0b2d54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]">
            <ArrowLeft className="h-4 w-4" />
            Back to My Health
          </Link>

          <section className="overflow-hidden rounded-[32px] bg-white shadow-[0_18px_55px_rgba(11,45,84,0.10)] ring-1 ring-slate-200">
            <header className="bg-gradient-to-br from-[#0b2d54] to-[#24c1c4] p-4 text-white sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                  <QrCode className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/70">
                    <ShieldCheck className="h-3 w-3" />
                    Walk-In / Quick Share
                  </div>
                  <h1 className="mt-1 text-xl font-black sm:text-2xl">Share Smart File</h1>
                  {!share && <p className="mt-1 text-xs leading-5 text-white/85">Choose who you want to share with.</p>}
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-5">
              {!share && !loading && (
                <div>
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Choose access</p>
                    <h2 className="mt-1 text-lg font-black text-[#0b2d54]">Who are you sharing with?</h2>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2" aria-label="Choose Smart File sharing scope">
                    <button type="button" onClick={() => void createShare("clinical")} className="min-h-24 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-[#24c1c4]/50 hover:bg-[#24c1c4]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]">
                      <span className="flex items-center gap-3 text-base font-black text-[#0b2d54]"><Stethoscope className="h-6 w-6" /> Clinic / Doctor</span>
                      <span className="mt-1.5 block text-xs font-semibold leading-5 text-slate-500">Share your clinical Smart File with an authorised clinician.</span>
                    </button>
                    <button type="button" onClick={() => void createShare("prescription")} className="min-h-24 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-[#24c1c4]/50 hover:bg-[#24c1c4]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]">
                      <span className="flex items-center gap-3 text-base font-black text-[#0b2d54]"><Pill className="h-6 w-6" /> Pharmacy</span>
                      <span className="mt-1.5 block text-xs font-semibold leading-5 text-slate-500">Share prescription and medication information only.</span>
                    </button>
                  </div>
                </div>
              )}

              {loading && <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-[#24c1c4]" /><p className="mt-3 text-sm font-bold text-[#0b2d54]">Creating your {scopeTitle.toLowerCase()} sharing session…</p></div>}

              {error && <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

              {!loading && share && !expired && (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)] lg:items-stretch">
                  <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-3 text-center sm:p-4">
                    <div className="flex items-center justify-between gap-3 text-left"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">QR code</p><h2 className="mt-0.5 text-lg font-black text-[#0b2d54]">{scopeTitle} access</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-800">Temporary</span></div>
                    <div className="mx-auto mt-3 w-fit rounded-[22px] border border-slate-200 bg-white p-2 shadow-sm"><img src={qrUrl} alt={`Temporary ${scopeTitle} Smart File QR code`} className="h-60 w-60 sm:h-64 sm:w-64 lg:h-72 lg:w-72" /></div>
                    <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-500">The QR contains only a secure temporary token.</p>
                  </section>

                  <div className="flex flex-col gap-3">
                    <section className="rounded-[28px] border border-[#24c1c4]/25 bg-[#24c1c4]/5 p-4 text-center sm:p-5">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#0b2d54]/60">6-digit code</p>
                      <button type="button" onClick={copyCode} className="mt-2 inline-flex min-h-14 items-center gap-3 rounded-2xl px-3 text-3xl font-black tracking-[0.18em] text-[#0b2d54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] sm:text-4xl" aria-label="Copy six-digit Smart File code">{share.shortCode.slice(0, 3)} {share.shortCode.slice(3)}{copied ? <Check className="h-5 w-5 text-emerald-700" /> : <Copy className="h-5 w-5" />}</button>
                      <p className="mx-auto mt-1 max-w-sm text-[11px] font-semibold leading-4 text-slate-500">Use this code if QR scanning isn't available.</p>
                    </section>

                    <div className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0b2d54]/5 px-4 py-2.5 text-xs font-black text-[#0b2d54]"><Clock3 className="h-4 w-4" />Expires in {formatTime(remaining)}</div>

                    <div className="flex flex-1 items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-left text-[10px] font-semibold leading-4 text-amber-900">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>Temporary, one-time share. Only give the QR or code to the person you intend to access your information.</p>
                    </div>

                    <button type="button" onClick={resetChoice} className="min-h-10 rounded-xl text-xs font-bold text-[#0b2d54] underline underline-offset-2 hover:text-[#24c1c4]">Choose a different sharing type</button>
                  </div>
                </div>
              )}

              {!loading && share && expired && <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center"><Clock3 className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-3 text-lg font-black text-[#0b2d54]">This share has expired</h2><p className="mx-auto mt-1 max-w-md text-sm leading-5 text-slate-500">Generate a fresh one-time QR code and six-digit code for {scopeTitle.toLowerCase()} access.</p><button type="button" onClick={resetChoice} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#071f3a]"><RefreshCw className="h-4 w-4" />Choose sharing type again</button></div>}
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
