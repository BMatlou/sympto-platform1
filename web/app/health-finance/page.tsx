"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CreditCard, FileText, Receipt, ShieldCheck } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { api } from "@/lib/api";

function unwrap(payload: any) {
  return payload?.data ?? payload;
}

function money(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(number) : String(value);
}

function date(value: unknown) {
  if (!value) return "—";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(parsed);
}

export default function HealthFinancePage() {
  const { data, loading: healthLoading } = useDashboard();
  const patientId = data?.patient?.id;
  const [invoices, setInvoices] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [invoiceResponse, claimResponse] = await Promise.all([
          api.get("/invoices", { params: { patientId, page: 1, limit: 50 } }),
          api.get("/claims", { params: { patientId, page: 1, limit: 50 } }),
        ]);
        if (cancelled) return;
        setInvoices(Array.isArray(unwrap(invoiceResponse.data)) ? unwrap(invoiceResponse.data) : unwrap(invoiceResponse.data)?.data ?? []);
        setClaims(Array.isArray(unwrap(claimResponse.data)) ? unwrap(claimResponse.data) : unwrap(claimResponse.data)?.data ?? []);
      } catch (requestError) {
        if (!cancelled) {
          console.error("Failed to load patient financial records:", requestError);
          setError("Financial records are not available for this account yet.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  const insurance = data?.patientInsurances ?? [];

  return <ProtectedRoute><main className="min-h-screen bg-slate-50"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to My Health</Link></div></header><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><div className="rounded-3xl border border-[#24c1c4]/20 bg-gradient-to-br from-[#24c1c4]/10 via-white to-white p-6 sm:p-8"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b2d54] text-white"><CreditCard className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-[#24c1c4]">Health finance</p><h1 className="text-3xl font-bold tracking-tight text-[#0b2d54]">Medical aid & payments</h1></div></div><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Keep your medical aid details, claims and healthcare invoices together without mixing them into your clinical Smart File.</p></div>

{(healthLoading || loading) && <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your financial records…</div>}
{error && !loading && <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{error}</div>}

{!healthLoading && <div className="mt-6 grid gap-5 lg:grid-cols-3"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#24c1c4]" /><h2 className="font-bold text-[#0b2d54]">Medical aid</h2></div>{insurance.length === 0 ? <p className="mt-5 text-sm leading-6 text-slate-500">No medical aid membership is recorded yet.</p> : <div className="mt-5 space-y-4">{insurance.map((item: any) => <div key={String(item.id)} className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{item.insurancePolicy?.provider?.name || item.insurancePolicy?.name || "Medical aid"}</p><p className="mt-1 text-sm text-slate-600">Membership: {item.membershipNumber || "—"}</p>{item.dependantCode && <p className="mt-1 text-sm text-slate-600">Dependant code: {item.dependantCode}</p>}<p className="mt-2 text-xs text-slate-400">{item.active === false ? "Inactive" : "Active"}</p></div>)}</div>}</section>

<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-[#24c1c4]" /><h2 className="font-bold text-[#0b2d54]">Claims</h2></div>{claims.length === 0 ? <p className="mt-5 text-sm leading-6 text-slate-500">No claims are recorded yet.</p> : <div className="mt-5 space-y-3">{claims.map((claim: any) => <div key={String(claim.id)} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{claim.claimNumber || "Claim"}</p><p className="mt-1 text-xs text-slate-400">Submitted {date(claim.submittedAt || claim.createdAt)}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{String(claim.status || "UNKNOWN").replace(/_/g, " ")}</span></div><p className="mt-3 text-sm text-slate-600">Approved: {money(claim.approvedAmount)}</p>{claim.rejectedReason && <p className="mt-1 text-sm text-red-600">{claim.rejectedReason}</p>}</div>)}</div>}</section>

<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><Receipt className="h-5 w-5 text-[#24c1c4]" /><h2 className="font-bold text-[#0b2d54]">Invoices</h2></div>{invoices.length === 0 ? <p className="mt-5 text-sm leading-6 text-slate-500">No healthcare invoices are recorded yet.</p> : <div className="mt-5 space-y-3">{invoices.map((invoice: any) => <div key={String(invoice.id)} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{invoice.invoiceNumber || "Invoice"}</p><p className="mt-1 text-xs text-slate-400">{date(invoice.invoiceDate || invoice.createdAt)}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{String(invoice.status || "UNKNOWN").replace(/_/g, " ")}</span></div><p className="mt-3 text-sm text-slate-600">Total: {money(invoice.totalAmount ?? invoice.amount)}</p><p className="mt-1 text-sm text-slate-600">Balance: {money(invoice.balanceAmount ?? invoice.balance)}</p></div>)}</div>}</section></div>}

<div className="mt-6 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5"><p className="text-sm leading-6 text-slate-600"><strong className="text-[#0b2d54]">Privacy boundary:</strong> these financial records are separate from clinical Smart File access. A practitioner receiving clinical access does not automatically receive your medical aid, claims or invoices.</p></div>
</div></main></ProtectedRoute>;
}
