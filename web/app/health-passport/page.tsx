"use client";

import Link from "next/link";
import { ArrowLeft, Activity, Check, CreditCard, HeartPulse, Pencil, Phone, Save, ShieldCheck, Syringe, X } from "lucide-react";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { api } from "@/lib/api";

const text = (value: unknown, fallback = "Not recorded") => value === null || value === undefined || value === "" ? fallback : String(value);
const label = (value: unknown) => text(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const date = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("en-ZA") : "Not recorded";

function Section({ title, edit, onEdit, children }: { title: string; edit?: boolean; onEdit?: () => void; children: React.ReactNode }) {
  return <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-[#0b2d54]">{title}</h2>{edit && onEdit && <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#0b2d54] hover:border-[#24c1c4]"><Pencil className="h-3.5 w-3.5"/>Edit</button>}</div>{children}</section>;
}

function Field({ label: fieldLabel, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">{fieldLabel}</span><input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0b2d54] outline-none focus:border-[#24c1c4] focus:ring-2 focus:ring-[#24c1c4]/10"/></label>;
}

export default function HealthPassportPage() {
  const { data, loading, error, reload } = useDashboard();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [form, setForm] = useState({ preferredName: "", dateOfBirth: "", gender: "", heightCm: "", weightKg: "", bloodType: "", rhesusFactor: "", organDonor: "", emergencyNotes: "", shareByDefault: "" });

  useEffect(() => {
    if (!data) return;
    const p = data.profile as any;
    const passport = data.healthPassport as any;
    const baseline = data.healthSnapshot.baseline as any;
    setForm({
      preferredName: text(p?.preferredName, ""),
      dateOfBirth: p?.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : "",
      gender: text(p?.gender, ""),
      heightCm: baseline?.heightCm != null ? String(baseline.heightCm) : data.patient?.heightCm != null ? String(data.patient.heightCm) : "",
      weightKg: baseline?.weightKg != null ? String(baseline.weightKg) : data.patient?.weightKg != null ? String(data.patient.weightKg) : "",
      bloodType: text(passport?.bloodType, ""),
      rhesusFactor: text(passport?.rhesusFactor, ""),
      organDonor: passport?.organDonor == null ? "" : String(Boolean(passport.organDonor)),
      emergencyNotes: text(passport?.emergencyNotes, ""),
      shareByDefault: passport?.shareByDefault == null ? "" : String(Boolean(passport.shareByDefault)),
    });
  }, [data]);

  const save = async () => {
    if (!data?.patient?.id) return;
    setSaving(true); setSaveError(""); setSaveSuccess("");
    try {
      await Promise.all([
        api.patch("/onboarding/profile", {
          preferredName: form.preferredName || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
        }),
        api.patch("/onboarding/individual/profile", {
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          heightCm: form.heightCm ? Number(form.heightCm) : undefined,
          weightKg: form.weightKg ? Number(form.weightKg) : undefined,
          bloodType: form.bloodType || undefined,
          rhesusFactor: form.rhesusFactor || undefined,
          organDonor: form.organDonor === "" ? undefined : form.organDonor === "true",
          shareByDefault: form.shareByDefault === "" ? undefined : form.shareByDefault === "true",
          emergencyNotes: form.emergencyNotes || undefined,
        }),
        ...(data.healthPassport?.id ? [api.patch(`/health-passports/${String(data.healthPassport.id)}`, {
          patientId: data.patient.id,
          bloodType: form.bloodType || undefined,
          organDonor: form.organDonor === "" ? undefined : form.organDonor === "true",
          emergencyNotes: form.emergencyNotes || undefined,
          shareByDefault: form.shareByDefault === "" ? undefined : form.shareByDefault === "true",
        })] : []),
      ]);
      setSaveSuccess("Your changes have been saved.");
      setEditing(false);
      await reload();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || "We couldn't save your changes. Please try again.");
    } finally { setSaving(false); }
  };

  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-6"><div className="mx-auto max-w-4xl space-y-4"><div className="h-36 animate-pulse rounded-3xl bg-white"/><div className="h-64 animate-pulse rounded-3xl bg-white"/></div></main></ProtectedRoute>;
  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-6"><div className="mx-auto max-w-xl rounded-3xl bg-white p-7"><h1 className="text-xl font-bold text-[#0b2d54]">We couldn't load your Clinic Card</h1><button onClick={reload} className="mt-5 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-semibold text-white">Try again</button></div></main></ProtectedRoute>;

  const passport = data.healthPassport as any;
  const profile = data.profile as any;
  const allergies = data.healthSnapshot.activeAllergies ?? data.healthSnapshot.allergies ?? [];
  const conditions = data.healthSnapshot.activeConditions ?? [];
  const immunizations = data.healthSnapshot.immunizations ?? [];
  const emergencies = data.emergencyContacts ?? [];
  const medications = data.medications ?? data.today.activeMedications ?? [];
  const vitals = data.healthSnapshot.latestMeasurements ?? [];
  const insurance = data.patientInsurances ?? [];
  const firstName = profile?.preferredName || profile?.firstName || data.patient.firstName || "Patient";
  const fullName = [firstName, profile?.lastName || data.patient.lastName].filter(Boolean).join(" ");

  return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] text-slate-800"><div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
    <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54]"><ArrowLeft className="h-4 w-4"/>Back to My Health</Link>

    {saveSuccess && <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><Check className="h-4 w-4"/>{saveSuccess}</div>}
    {saveError && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{saveError}</div>}

    <section className="mb-5 overflow-hidden rounded-[30px] bg-gradient-to-br from-rose-700 via-rose-600 to-[#0b2d54] p-6 text-white shadow-lg sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70"><ShieldCheck className="h-4 w-4"/>My Clinic Card</div><h1 className="mt-4 text-3xl font-bold">{fullName}</h1><p className="mt-2 text-sm text-white/75">Patient number: {text(data.patient.patientNumber)}</p></div><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><HeartPulse className="h-7 w-7"/></div></div>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-white/10 p-3"><p className="text-[11px] text-white/60">Date of birth</p><p className="mt-1 font-semibold">{date(profile?.dateOfBirth)}</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-[11px] text-white/60">Blood</p><p className="mt-1 font-semibold">{label(passport?.bloodType)}</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-[11px] text-white/60">Rhesus</p><p className="mt-1 font-semibold">{label(passport?.rhesusFactor)}</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-[11px] text-white/60">Organ donor</p><p className="mt-1 font-semibold">{passport?.organDonor === true ? "Yes" : passport?.organDonor === false ? "No" : "Not recorded"}</p></div></div>
      <button onClick={() => { setSaveError(""); setSaveSuccess(""); setEditing(true); }} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0b2d54] hover:bg-white/90"><Pencil className="h-4 w-4"/>Edit my information</button>
    </section>

    {editing && <section className="mb-5 rounded-3xl border border-[#24c1c4]/30 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[#0b2d54]">Edit my information</h2><p className="mt-1 text-xs text-slate-500">Changes are saved to your patient record.</p></div><button onClick={() => setEditing(false)} disabled={saving} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"><X className="h-5 w-5"/></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Preferred name" value={form.preferredName} onChange={(v) => setForm(f => ({...f, preferredName: v}))}/><Field label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => setForm(f => ({...f, dateOfBirth: v}))}/><Field label="Gender" value={form.gender} onChange={(v) => setForm(f => ({...f, gender: v.toUpperCase()}))} placeholder="Use your saved gender value"/><Field label="Height (cm)" type="number" value={form.heightCm} onChange={(v) => setForm(f => ({...f, heightCm: v}))}/><Field label="Weight (kg)" type="number" value={form.weightKg} onChange={(v) => setForm(f => ({...f, weightKg: v}))}/><Field label="Blood type" value={form.bloodType} onChange={(v) => setForm(f => ({...f, bloodType: v.toUpperCase()}))} placeholder="Your saved BloodType value"/><Field label="Rhesus factor" value={form.rhesusFactor} onChange={(v) => setForm(f => ({...f, rhesusFactor: v.toUpperCase()}))} placeholder="Your saved RhesusFactor value"/><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">Organ donor</span><select value={form.organDonor} onChange={(e) => setForm(f => ({...f, organDonor: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0b2d54]"><option value="">Not recorded</option><option value="true">Yes</option><option value="false">No</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">Share my Clinic Card by default</span><select value={form.shareByDefault} onChange={(e) => setForm(f => ({...f, shareByDefault: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0b2d54]"><option value="">Not set</option><option value="true">Yes</option><option value="false">No</option></select></label><div className="sm:col-span-2"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">Emergency notes</span><textarea value={form.emergencyNotes} onChange={(e) => setForm(f => ({...f, emergencyNotes: e.target.value}))} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0b2d54] outline-none focus:border-[#24c1c4]"/></label></div></div><div className="mt-5 flex flex-wrap justify-end gap-3"><button onClick={() => setEditing(false)} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"><X className="h-4 w-4"/>Cancel</button><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Save className="h-4 w-4"/>{saving ? "Saving…" : "Save changes"}</button></div></section>}

    <Section title="Allergies"><div className="flex flex-wrap gap-2">{allergies.length ? allergies.map((a: any) => <span key={a.id} className="rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{text(a.allergy?.name || a.name)}</span>) : <p className="text-sm text-slate-500">No active allergies are recorded.</p>}</div><Link href="/allergies" className="mt-4 inline-block text-xs font-bold text-[#0b2d54] underline">Manage allergies</Link></Section>
    <Section title="Health conditions"><>{conditions.length ? <div className="grid gap-3 sm:grid-cols-2">{conditions.map((c: any) => <div key={c.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{text(c.condition?.name || c.name)}</p>{c.severity && <p className="mt-1 text-xs text-slate-500">Severity: {label(c.severity)}</p>}</div>)}</div> : <p className="text-sm text-slate-500">No active health conditions are recorded.</p>}<Link href="/conditions" className="mt-4 inline-block text-xs font-bold text-[#0b2d54] underline">Manage conditions</Link></></Section>
    <Section title="Current medicines"><>{medications.length ? <div className="grid gap-3 sm:grid-cols-2">{medications.map((m: any) => <div key={m.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{text(m.medication?.name || m.name)}</p><p className="mt-1 text-sm text-slate-500">{text(m.dosage || m.dose, "Dose not recorded")} · {text(m.frequency, "Frequency not recorded")}</p></div>)}</div> : <p className="text-sm text-slate-500">No current medicines are recorded.</p>}<Link href="/medications" className="mt-4 inline-block text-xs font-bold text-[#0b2d54] underline">Manage medicines</Link></></Section>
    <Section title="Immunisations"><div className="mb-4 flex items-center gap-2"><Syringe className="h-5 w-5 text-[#24c1c4]"/><span className="text-sm text-slate-500">{immunizations.length} recorded</span></div>{immunizations.length ? <div className="grid gap-3 sm:grid-cols-2">{immunizations.map((i: any) => <div key={i.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{text(i.immunization?.name || i.name)}</p><p className="mt-1 text-sm text-slate-500">{date(i.administeredAt)}{i.doseNumber != null ? ` · Dose ${i.doseNumber}` : ""}</p></div>)}</div> : <p className="text-sm text-slate-500">No immunisations are recorded.</p>}<Link href="/immunizations" className="mt-4 inline-block text-xs font-bold text-[#0b2d54] underline">Manage immunisations</Link></Section>
    <Section title="Latest vitals"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{vitals.length ? vitals.map((v: any) => <div key={`${v.type}-${v.measuredAt}`} className="rounded-2xl bg-slate-50 p-4"><Activity className="h-4 w-4 text-[#24c1c4]"/><p className="mt-2 text-xs text-slate-500">{label(v.type)}</p><p className="mt-1 font-bold text-[#0b2d54]">{text(v.value)} <span className="text-xs font-medium text-slate-400">{text(v.unit, "")}</span></p></div>) : <p className="text-sm text-slate-500">No connected vital measurements are recorded.</p>}</div></Section>
    <Section title="Emergency information"><div className="mb-4 flex justify-end"><Link href="/emergency-contacts" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#0b2d54]"><Pencil className="h-3.5 w-3.5"/>Edit contacts</Link></div>{passport?.emergencyNotes && <p className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{passport.emergencyNotes}</p>}{emergencies.length ? <div className="grid gap-3 sm:grid-cols-2">{emergencies.map((c: any) => <div key={c.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{c.fullName}</p><p className="mt-1 text-sm text-slate-500">{label(c.relationship)}</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#0b2d54]"><Phone className="h-4 w-4"/>{c.phoneNumber}</p></div>)}</div> : <p className="text-sm text-slate-500">No emergency contacts are recorded.</p>}</Section>
    <Section title="Insurance / medical aid"><div className="mb-4 flex items-center gap-2"><CreditCard className="h-5 w-5 text-[#24c1c4]"/>{insurance.length ? <span className="text-sm text-slate-500">{insurance.length} policy record{insurance.length === 1 ? "" : "s"}</span> : null}</div>{insurance.length ? <div className="grid gap-3 sm:grid-cols-2">{insurance.map((p: any) => <div key={p.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{text(p.insurancePolicy?.name || p.name, "Medical aid / insurance")}</p><p className="mt-1 text-sm text-slate-500">Membership: {text(p.membershipNumber)}</p>{p.dependantCode && <p className="mt-1 text-sm text-slate-500">Dependant: {p.dependantCode}</p>}</div>)}</div> : <p className="text-sm text-slate-500">No insurance or medical-aid record is available.</p>}</Section>

    <div className="rounded-3xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5 text-sm text-slate-600"><p className="font-semibold text-[#0b2d54]">Your Clinic Card uses your saved health record.</p><p className="mt-1">Clinical records such as laboratory results, prescriptions and imaging reports remain part of your medical history; they are not silently changed from this card.</p></div>
  </div></main></ProtectedRoute>;
}
