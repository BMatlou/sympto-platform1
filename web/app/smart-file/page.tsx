"use client";

import Link from "next/link";
import { ArrowLeft, Check, Clock3, Copy, Loader2, Pill, QrCode, RefreshCw, ShieldCheck, Stethoscope } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [kind, setKind] = useState<ShareKind>("clinical");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  const createShare = useCallback(async (nextKind: ShareKind) => {
    setLoading(true);
    setError("");
    setCopied(false);
    setKind(nextKind);
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
  }, []);

  useEffect(() => {
    void createShare("clinical");
  }, [createShare]);

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

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb] text-slate-800">
        <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
          <Link href="/dashboard" className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#0b2d54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]">
            <ArrowLeft className="h-4 w-4" />
            Back to My Health
          </Link>

          <section className="overflow-hidden rounded-[32px] bg-white shadow-[0_18px_55px_rgba(11,45,84,0.10)] ring-1 ring-slate-200">
            <header className="bg-gradient-to-br from-[#0b2d54] to-[#24c1c4] p-5 text-white sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                  <QrCode className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Walk-In / Quick Share
                  </div>
                  <h1 className="mt-2 text-2xl font-black sm:text-3xl">Share Smart File</h1>
                  <p className="mt-2 text-sm leading-6 text-white/85">
                    Show this temporary QR code or code to the healthcare professional you intend to share with.
                  </p>
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-7">
              <div className="grid grid-cols-2 gap-3" aria-label="Share with">
                <button
                  type="button"
                  onClick={() => void createShare("clinical")}
                  disabled={loading}
                  className={`min-h-16 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] ${isClinical ? "border-[#24c1c4] bg-[#24c1c4]/8 ring-1 ring-[#24c1c4]/30" : "border-slate-200 bg-white hover:border-[#24c1c4]/50"}`}
                >
                  <span className="flex items-center gap-2 text-sm font-black text-[#0b2d54]"><Stethoscope className="h-5 w-5" /> Clinic / Doctor</span>
                  <span className="mt-1 block text-[11px] font-semibold text-slate-500">Full clinical Smart File</span>
                </button>
                <button
                  type="button"
                  onClick={() => void createShare("prescription")}
                  disabled={loading}
                  className={`min-h-16 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] ${!isClinical ? "border-[#24c1c4] bg-[#24c1c4]/8 ring-1 ring-[#24c1c4]/30" : "border-slate-200 bg-white hover:border-[#24c1c4]/50"}`}
                >
                  <span className="flex items-center gap-2 text-sm font-black text-[#0b2d54]"><Pill className="h-5 w-5" /> Pharmacy</span>
                  <span className="mt-1 block text-[11px] font-semibold text-slate-500">Prescriptions only</span>
                </button>
              </div>

              {error && (
                <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              {loading && !share ? (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#24c1c4]" />
                  <p className="mt-3 text-sm font-bold text-[#0b2d54]">Creating your temporary share…</p>
                </div>
              ) : expired || !share ? (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <Clock3 className="mx-auto h-10 w-10 text-slate-300" />
                  <h2 className="mt-4 text-lg font-black text-[#0b2d54]">{expired ? "This share has expired" : "Create a temporary share"}</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Generate a fresh one-time QR code and six-digit code for {scopeTitle.toLowerCase()} access.</p>
                  <button type="button" onClick={() => void createShare(kind)} disabled={loading} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#071f3a] disabled:opacity-60">
                    <RefreshCw className="h-4 w-4" />
                    {loading ? "Creating…" : "Generate new share"}
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 text-center sm:p-6">
                    <div className="flex items-center justify-between gap-3 text-left">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">QR code</p>
                        <h2 className="mt-1 text-lg font-black text-[#0b2d54]">{scopeTitle} access</h2>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-800">Temporary</span>
                    </div>
                    <div className="mx-auto mt-5 w-fit rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
                      <img src={qrUrl} alt={`Temporary ${scopeTitle} Smart File QR code`} className="h-64 w-64 sm:h-72 sm:w-72" />
                    </div>
                    <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">The QR contains only a secure temporary token. Your medical information is not stored inside it.</p>
                  </section>

                  <section className="rounded-[28px] border border-[#24c1c4]/25 bg-[#24c1c4]/5 p-5 text-center sm:p-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0b2d54]/60">Laptop / receptionist code</p>
                    <button type="button" onClick={copyCode} className="mt-2 inline-flex min-h-16 items-center gap-3 rounded-2xl px-4 text-3xl font-black tracking-[0.22em] text-[#0b2d54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] sm:text-4xl" aria-label="Copy six-digit Smart File code">
                      {share.shortCode.slice(0, 3)} {share.shortCode.slice(3)}
                      {copied ? <Check className="h-5 w-5 text-emerald-700" /> : <Copy className="h-5 w-5" />}
                    </button>
                    <p className="mx-auto mt-1 max-w-sm text-xs font-semibold leading-5 text-slate-500">Show this six-digit code to the receptionist or doctor if scanning isn't available.</p>
                  </section>

                  <section className="rounded-[28px] border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0b2d54]/8"><ShieldCheck className="h-5 w-5 text-[#0b2d54]" /></div>
                      <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Privacy &amp; trust</p><h2 className="text-base font-black text-[#0b2d54]">You control what is shared</h2></div>
                    </div>

                    {isClinical ? (
                      <div className="mt-5 space-y-3">
                        <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200"><p className="text-sm font-black text-emerald-800">🩺 Clinical Smart File Access: ENABLED</p><p className="mt-1 text-xs font-semibold leading-5 text-emerald-700">Health Passport, conditions, allergies, medications, prescriptions, encounters, vitals, symptoms, tests, imaging and care information.</p></div>
                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><p className="text-sm font-black text-slate-700">💳 Financial / Billing Access: DISABLED</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Invoices, claims, insurance / medical aid, payments and receipts remain locked out.</p></div>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-3">
                        <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200"><p className="text-sm font-black text-emerald-800">💊 Prescription Access: ENABLED</p><p className="mt-1 text-xs font-semibold leading-5 text-emerald-700">The pharmacy receives prescription and medication information needed to dispense your medicines.</p></div>
                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><p className="text-sm font-black text-slate-700">🩺 Clinical Smart File Access: DISABLED</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Your wider clinical history, Health Passport, encounters, tests and diagnoses are not shared.</p></div>
                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><p className="text-sm font-black text-slate-700">💳 Financial / Billing Access: DISABLED</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Invoices, claims, insurance / medical aid, payments and receipts remain locked out.</p></div>
                      </div>
                    )}
                  </section>

                  <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#0b2d54]/5 px-4 py-3 text-xs font-black text-[#0b2d54]">
                    <Clock3 className="h-4 w-4" />
                    Code expires in {formatTime(remaining)}
                  </div>
                  <p className="text-center text-[11px] font-semibold leading-5 text-slate-400">This share is temporary and can only be redeemed once. Do not share the QR or code with anyone you do not intend to access your information.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
