"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, LockKeyhole, Pill, ShieldCheck, Stethoscope } from "lucide-react";
import { useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { api } from "@/lib/api";

type Prescription = {
  id: string;
  issuedAt: string;
  expiresAt: string | null;
  notes: string | null;
  practitioner: { name: string; registrationNumber: string | null };
  items: Array<{
    dosage: string | null;
    frequency: string | null;
    route: string | null;
    durationDays: number | null;
    quantity: string | null;
    refills: number | null;
    instructions: string | null;
    medication: { id: string; name: string; genericName: string | null; brandName: string | null };
  }>;
};

type Result = {
  consentId: string;
  patientId: string;
  scope: "CLINICAL_SMART_FILE" | "PRESCRIPTIONS_ONLY";
  expiresAt: string;
  prescriptions?: Prescription[];
};

const unwrap = <T,>(value: any): T => value?.data ?? value;

export default function SmartFileAuthorizePage() {
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"clinical" | "pharmacy">("clinical");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const redeem = async () => {
    const credential = code.trim();
    if (!credential) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await api.post(mode === "clinical" ? "/smart-file/authorize" : "/smart-file/authorize-pharmacy", { code: credential });
      const next = unwrap<Result>(response.data);
      setResult(next);
      if (next.scope === "CLINICAL_SMART_FILE") {
        window.location.href = `/smart-file/clinical/${next.consentId}`;
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "That code is invalid, expired or has already been used.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb] text-slate-800">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54]"><ArrowLeft className="h-4 w-4" />Back to My Health</Link>
          <section className="overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-slate-200">
            <div className="bg-gradient-to-br from-[#0b2d54] to-[#24c1c4] p-6 text-white sm:p-8">
              <ShieldCheck className="h-8 w-8" />
              <h1 className="mt-4 text-3xl font-bold">Open a Smart File</h1>
              <p className="mt-2 text-sm leading-6 text-white/80">Enter the temporary code shown by the patient. The code grants only the access described below.</p>
            </div>
            <div className="p-5 sm:p-7">
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={() => { setMode("clinical"); setError(""); }} className={`rounded-2xl border p-4 text-left ${mode === "clinical" ? "border-[#24c1c4] bg-[#24c1c4]/5" : "border-slate-200"}`}><Stethoscope className="h-6 w-6 text-[#0b2d54]" /><p className="mt-3 font-bold text-[#0b2d54]">Clinic / Doctor</p><p className="mt-1 text-xs text-slate-500">Full clinical Smart File.</p></button>
                <button onClick={() => { setMode("pharmacy"); setError(""); }} className={`rounded-2xl border p-4 text-left ${mode === "pharmacy" ? "border-[#24c1c4] bg-[#24c1c4]/5" : "border-slate-200"}`}><Pill className="h-6 w-6 text-[#0b2d54]" /><p className="mt-3 font-bold text-[#0b2d54]">Pharmacy</p><p className="mt-1 text-xs text-slate-500">Prescriptions only.</p></button>
              </div>

              <div className="mt-7">
                <label className="block text-sm font-bold text-[#0b2d54]">Patient's 6-digit code</label>
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="mt-2 w-full rounded-2xl border border-slate-200 px-5 py-5 text-center text-3xl font-black tracking-[0.35em] text-[#0b2d54] outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />
                {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
                <button onClick={redeem} disabled={loading || code.length !== 6} className="mt-4 w-full rounded-2xl bg-[#0b2d54] px-5 py-4 text-sm font-bold text-white disabled:opacity-40">{loading ? "Opening…" : mode === "clinical" ? "Open clinical Smart File" : "View prescriptions"}</button>
              </div>

              {result?.scope === "PRESCRIPTIONS_ONLY" && <section className="mt-7 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5"><div className="flex items-center gap-2 text-emerald-800"><CheckCircle2 className="h-5 w-5" /><h2 className="font-bold">Prescription access granted</h2></div><p className="mt-2 text-xs text-slate-500">This access is limited to prescriptions and expires automatically.</p><div className="mt-5 space-y-3">{result.prescriptions?.length ? result.prescriptions.flatMap((p) => p.items.map((item, index) => <div key={`${p.id}-${index}`} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><p className="font-bold text-[#0b2d54]">{item.medication.name}</p><p className="mt-1 text-sm text-slate-600">{item.dosage || "Dose not recorded"} · {item.frequency || "Frequency not recorded"}</p>{item.route && <p className="mt-1 text-xs text-slate-500">Route: {item.route}</p>}{item.instructions && <p className="mt-2 text-xs leading-5 text-slate-500">{item.instructions}</p>}</div>)) : <p className="text-sm text-slate-600">No active prescriptions were found.</p>}</div></section>}

              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-slate-50 p-4"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-[#0b2d54]" /><p className="text-xs leading-5 text-slate-500">Never enter a patient's code unless they have intentionally shown it to you. Financial information such as invoices, claims and payments is not part of the clinical Smart File.</p></div>
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
