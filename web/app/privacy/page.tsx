"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, LockKeyhole, ShieldCheck, UserRound, XCircle } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { api } from "@/lib/api";

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function personName(user: any) {
  const person = user?.person;
  return person?.preferredName || [person?.firstName, person?.lastName].filter(Boolean).join(" ") || user?.email || "Authorised user";
}

const permissions = [["canViewMedicalRecords", "Medical records"], ["canViewLabResults", "Lab results"], ["canViewImaging", "Imaging"], ["canViewPrescriptions", "Prescriptions"], ["canViewAppointments", "Appointments"], ["canViewAIReports", "AI health reports"], ["canViewHealthPassport", "Health Passport"], ["canViewWearables", "Wearable data"], ["canViewInsurance", "Insurance"], ["canViewInvoices", "Invoices"]] as const;

export default function PrivacyPage() {
  const { data, loading, error, reload } = useDashboard();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function revoke(consentId: string) {
    if (!window.confirm("Revoke this person's access to your health information?")) return;
    try {
      setRevoking(consentId);
      setMessage("");
      await api.patch(`/data-access-consents/${consentId}`, { revokedAt: new Date().toISOString() });
      setMessage("Access revoked successfully.");
      await reload();
    } catch (requestError) {
      console.error("Failed to revoke consent:", requestError);
      setMessage("We couldn't revoke this access. Please try again.");
    } finally {
      setRevoking(null);
    }
  }

  const consents = (data as any)?.dataAccessConsents ?? [];
  const active = consents.filter((consent: any) => !consent.revokedAt && (!consent.expiresAt || new Date(consent.expiresAt).getTime() > Date.now()));

  return <ProtectedRoute><main className="min-h-screen bg-slate-50"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6 lg:px-8"><Link href="/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to Settings</Link></div></header><div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"><div className="rounded-3xl border border-[#24c1c4]/20 bg-gradient-to-br from-[#24c1c4]/10 via-white to-white p-6 sm:p-8"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b2d54] text-white"><LockKeyhole className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-[#24c1c4]">Privacy & access</p><h1 className="text-3xl font-bold tracking-tight text-[#0b2d54]">Who can access my health information?</h1></div></div><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Review active access granted to healthcare professionals and other authorised users. You can revoke an active consent at any time.</p></div>{message && <div className="mt-5 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-4 text-sm font-semibold text-[#0b2d54]">{message}</div>}{loading && <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your access permissions…</div>}{error && !loading && <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6"><p className="font-semibold text-[#0b2d54]">We couldn't load your access permissions.</p><button type="button" onClick={reload} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-sm font-semibold text-white">Try again</button></div>}{!loading && !error && active.length === 0 && <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-4 font-semibold text-[#0b2d54]">No active access grants</h2><p className="mt-2 text-sm text-slate-500">When you share your Smart File with a healthcare professional, the access will appear here.</p></div>}{!loading && !error && active.length > 0 && <div className="mt-6 space-y-4">{active.map((consent: any) => <article key={String(consent.id)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><UserRound className="h-5 w-5" /></span><div><h2 className="font-semibold text-[#0b2d54]">{personName(consent.grantedTo)}</h2><p className="mt-1 text-sm text-slate-500">{consent.purpose || "Health information access"}</p><p className="mt-1 text-xs text-slate-400">Granted {formatDate(consent.grantedAt)} · {consent.expiresAt ? `Expires ${formatDate(consent.expiresAt)}` : "No expiry recorded"}</p></div></div><button type="button" disabled={revoking === consent.id} onClick={() => revoke(String(consent.id))} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{revoking === consent.id ? "Revoking…" : <><XCircle className="h-4 w-4" />Revoke access</>}</button></div><div className="mt-4 flex flex-wrap gap-2">{permissions.map(([key, label]) => Boolean(consent[key]) && <span key={key} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"><CheckCircle2 className="h-3.5 w-3.5 text-[#24c1c4]" />{label}</span>)}</div></article>)}</div>}<div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-[#0b2d54]">Financial information stays separate</h2><p className="mt-1 text-sm leading-6 text-slate-500">Clinical Smart File access does not automatically include your insurance, claims, invoices or payments. Those permissions remain separate.</p></div></div></main></ProtectedRoute>;
}
