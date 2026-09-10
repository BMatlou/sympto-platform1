"use client";

import Link from "next/link";
import { ArrowLeft, Clock3, Copy, Pill, QrCode, ShieldCheck, Stethoscope } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { api } from "@/lib/api";

const QR_BASE = "https://quickchart.io/qr";

type Share = { qrToken: string; shortCode: string; expiresAt: string };

function formatTime(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function SmartFilePage() {
  const [share, setShare] = useState<Share | null>(null);
  const [kind, setKind] = useState<"clinical" | "prescription">("clinical");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!share) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [share]);

  const remaining = share ? new Date(share.expiresAt).getTime() - now : 0;
  const expired = Boolean(share && remaining <= 0);
  const qrContent = share?.qrToken ?? "";
  const qrUrl = useMemo(
    () => `${QR_BASE}?text=${encodeURIComponent(qrContent)}&size=360&margin=2&ecLevel=M`,
    [qrContent],
  );

  const createShare = async (nextKind: "clinical" | "prescription") => {
    setLoading(true);
    setCopied(false);
    setKind(nextKind);
    try {
      const response = await api.post<Share>(
        nextKind === "clinical" ? "/smart-file/share" : "/smart-file/prescription-share",
      );
      setShare(response.data);
      setNow(Date.now());
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!share) return;
    await navigator.clipboard.writeText(share.shortCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb] text-slate-800">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54]"><ArrowLeft className="h-4 w-4" />Back to My Health</Link>

          <section className="overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-slate-200">
            <div className="bg-gradient-to-br from-[#0b2d54] to-[#24c1c4] p-6 text-white sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70"><ShieldCheck className="h-4 w-4" />Smart File</div>
                  <h1 className="mt-3 text-3xl font-bold">Share my health information</h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">Create a temporary QR code for a healthcare professional. Your medical information is not stored inside the QR code.</p>
                </div>
                <QrCode className="h-9 w-9 shrink-0" />
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={() => createShare("clinical")} disabled={loading} className={`rounded-2xl border p-4 text-left transition ${kind === "clinical" ? "border-[#24c1c4] bg-[#24c1c4]/5" : "border-slate-200 bg-white"}`}>
                  <Stethoscope className="h-6 w-6 text-[#0b2d54]" />
                  <p className="mt-3 font-bold text-[#0b2d54]">Clinic / Doctor</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Share your clinical Smart File — history, medicines, tests and care information.</p>
                </button>
                <button onClick={() => createShare("prescription")} disabled={loading} className={`rounded-2xl border p-4 text-left transition ${kind === "prescription" ? "border-[#24c1c4] bg-[#24c1c4]/5" : "border-slate-200 bg-white"}`}>
                  <Pill className="h-6 w-6 text-[#0b2d54]" />
                  <p className="mt-3 font-bold text-[#0b2d54]">Pharmacy</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Share prescriptions only. Your wider clinical history stays private.</p>
                </button>
              </div>

              {!share || expired ? (
                <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <QrCode className="mx-auto h-12 w-12 text-slate-300" />
                  <h2 className="mt-4 text-lg font-bold text-[#0b2d54]">Create a temporary code</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">The code works for 10 minutes and can only be used once.</p>
                  <button onClick={() => createShare(kind)} disabled={loading} className="mt-5 rounded-xl bg-[#0b2d54] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{loading ? "Creating…" : kind === "clinical" ? "Show clinic QR" : "Show pharmacy QR"}</button>
                </div>
              ) : (
                <div className="mt-7 text-center">
                  <div className="mx-auto w-fit rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                    <img src={qrUrl} alt="Temporary Smart File QR code" className="h-64 w-64 sm:h-72 sm:w-72" />
                  </div>
                  <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500"><Clock3 className="h-4 w-4" />Expires in {formatTime(remaining)}</div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Or give them this 6-digit code</p>
                  <button onClick={copyCode} className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-6 py-3 text-2xl font-black tracking-[0.28em] text-[#0b2d54]">{share.shortCode}<Copy className="h-4 w-4 tracking-normal" /></button>
                  {copied && <p className="mt-2 text-xs font-bold text-emerald-700">Code copied</p>}
                  <p className="mx-auto mt-5 max-w-md text-xs leading-5 text-slate-500">Only share this code with the clinic, doctor or pharmacy you intend to access your information.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
