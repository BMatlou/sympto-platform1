"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, ShieldCheck, Users } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { api } from "@/lib/api";

type Consent = { type?: string; granted?: boolean };
type PrivacyData = { consents?: Consent[]; healthPassport?: { shareByDefault?: boolean } | null };

const initialValues = { acceptTerms: false, acceptPrivacyPolicy: false, acceptDataProcessing: false, acceptMarketing: false };

export default function PrivacyPage() {
  const [values, setValues] = useState(initialValues);
  const [shareByDefault, setShareByDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const response = await api.get<{ data: PrivacyData }>("/onboarding/dashboard");
      const data = response.data.data ?? (response.data as unknown as PrivacyData);
      const consents = data.consents ?? [];
      const granted = (type: string) => consents.find((item) => item.type === type)?.granted === true;
      setValues({ acceptTerms: granted("TERMS"), acceptPrivacyPolicy: granted("PRIVACY_POLICY"), acceptDataProcessing: granted("DATA_PROCESSING"), acceptMarketing: granted("MARKETING") });
      setShareByDefault(data.healthPassport?.shareByDefault === true);
    } catch (error) {
      console.error("Failed to load privacy settings", error);
      setMessage("We couldn't load your privacy settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    try {
      setSaving(true);
      setMessage(null);
      await api.patch("/onboarding/individual/consent", values);
      setMessage("Your consent preferences have been saved.");
    } catch (error) {
      console.error("Failed to save consent", error);
      setMessage("We couldn't save your consent preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const items = [
    ["acceptTerms", "Terms and conditions", "Your agreement to use Sympto."],
    ["acceptPrivacyPolicy", "Privacy policy", "How your personal information is handled."],
    ["acceptDataProcessing", "Health data processing", "Permission for Sympto to process your health information to provide the service."],
    ["acceptMarketing", "Marketing communications", "Optional product updates and promotional communications."],
  ] as const;

  return <ProtectedRoute><main className="min-h-screen bg-slate-50"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6"><Link href="/my-health" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />My Health</Link><Link href="/family" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]"><Users className="h-4 w-4" />Family access</Link></div></header><div className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><section className="rounded-3xl border border-[#24c1c4]/20 bg-gradient-to-br from-[#24c1c4]/10 via-white to-white p-7"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b2d54] text-white"><ShieldCheck className="h-6 w-6" /></div><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[#24c1c4]">Privacy & sharing</p><h1 className="mt-2 text-3xl font-bold text-[#0b2d54]">You control your health information.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Review your consent choices and decide whether your Health Passport may be shared by default. Family access is managed separately.</p></section>{loading ? <div className="mt-6 rounded-2xl bg-white p-6 text-sm text-slate-500">Loading your privacy settings…</div> : <><section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold text-[#0b2d54]">Consent preferences</h2><p className="mt-1 text-sm text-slate-500">You can change these choices at any time.</p><div className="mt-5 divide-y divide-slate-100">{items.map(([key,title,description]) => <label key={key} className="flex cursor-pointer items-start gap-4 py-4"><input type="checkbox" className="sr-only" checked={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.checked }))} /><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${values[key] ? "border-[#24c1c4] bg-[#24c1c4] text-white" : "border-slate-300 bg-white"}`}>{values[key] && <Check className="h-4 w-4" />}</span><span><span className="block font-semibold text-[#0b2d54]">{title}</span><span className="mt-1 block text-sm leading-5 text-slate-500">{description}</span></span></label>)}</div><div className="mt-5 flex justify-end"><button onClick={save} disabled={saving} className="rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save consent choices"}</button></div></section><section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold text-[#0b2d54]">Default sharing</h2><p className="mt-1 text-sm leading-6 text-slate-500">When enabled, your Health Passport is marked as shareable by default. Specific family access and permissions still require the authorised family relationship.</p><button type="button" onClick={() => setShareByDefault((value) => !value)} className={`mt-5 flex w-full items-center justify-between rounded-2xl border p-4 text-left ${shareByDefault ? "border-[#24c1c4]/40 bg-[#24c1c4]/5" : "border-slate-200 bg-slate-50"}`}><span><span className="block font-semibold text-[#0b2d54]">Share Health Passport by default</span><span className="mt-1 block text-xs text-slate-500">{shareByDefault ? "Enabled" : "Disabled"}</span></span><span className={`relative h-6 w-11 rounded-full ${shareByDefault ? "bg-[#24c1c4]" : "bg-slate-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white ${shareByDefault ? "left-6" : "left-1"}`} /></span></button><p className="mt-4 text-xs text-slate-400">The sharing preference is stored with your Health Passport. Family access can be reviewed separately.</p></section><section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-[#0b2d54]">Family access</h2><p className="mt-1 text-sm text-slate-500">Review who can view your health record and revoke access when needed.</p></div><Link href="/family" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0b2d54]">Manage</Link></div></section>{message && <p className="mt-4 text-sm font-medium text-[#0b2d54]">{message}</p>}</>}</div></main></ProtectedRoute>;
}