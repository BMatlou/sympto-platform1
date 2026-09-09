"use client";

import Link from "next/link";
import { ArrowLeft, HeartPulse, ShieldCheck, Syringe, Phone, Activity, CreditCard } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";

const text = (value: unknown, fallback = "Not recorded") => value === null || value === undefined || value === "" ? fallback : String(value);
const label = (value: unknown) => text(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const date = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("en-ZA") : "Not recorded";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="mb-4 text-lg font-bold text-[#0b2d54]">{title}</h2>{children}</section>;
}

function Empty({ children }: { children: React.ReactNode }) { return <p className="text-sm text-slate-500">{children}</p>; }

export default function HealthPassportPage() {
  const { data, loading, error, reload } = useDashboard();

  if (loading) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-6"><div className="mx-auto max-w-4xl space-y-4"><div className="h-36 animate-pulse rounded-3xl bg-white"/><div className="h-64 animate-pulse rounded-3xl bg-white"/></div></main></ProtectedRoute>;
  if (error || !data) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-6"><div className="mx-auto max-w-xl rounded-3xl bg-white p-7"><h1 className="text-xl font-bold text-[#0b2d54]">We couldn't load your Clinic Card</h1><p className="mt-2 text-sm text-slate-500">Your saved health information has not been changed.</p><button onClick={reload} className="mt-5 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-semibold text-white">Try again</button></div></main></ProtectedRoute>;

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

    <section className="mb-5 overflow-hidden rounded-[30px] bg-gradient-to-br from-rose-700 via-rose-600 to-[#0b2d54] p-6 text-white shadow-lg sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70"><ShieldCheck className="h-4 w-4"/>My Clinic Card</div><h1 className="mt-4 text-3xl font-bold">{fullName}</h1><p className="mt-2 text-sm text-white/75">Patient number: {text(data.patient.patientNumber)}</p></div><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><HeartPulse className="h-7 w-7"/></div></div>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-white/10 p-3"><p className="text-[11px] text-white/60">Date of birth</p><p className="mt-1 font-semibold">{date(profile?.dateOfBirth)}</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-[11px] text-white/60">Blood</p><p className="mt-1 font-semibold">{label(passport?.bloodType)}</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-[11px] text-white/60">Rhesus</p><p className="mt-1 font-semibold">{label(passport?.rhesusFactor)}</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-[11px] text-white/60">Organ donor</p><p className="mt-1 font-semibold">{passport?.organDonor === true ? "Yes" : passport?.organDonor === false ? "No" : "Not recorded"}</p></div></div>
    </section>

    <Section title="Allergies"><div className="flex flex-wrap gap-2">{allergies.length ? allergies.map((a: any) => <span key={a.id} className="rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{text(a.allergy?.name || a.name)}</span>) : <Empty>No active allergies are recorded.</Empty>}</div></Section>
    <Section title="Health conditions">{conditions.length ? <div className="grid gap-3 sm:grid-cols-2">{conditions.map((c: any) => <div key={c.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{text(c.condition?.name || c.name)}</p>{c.severity && <p className="mt-1 text-xs text-slate-500">Severity: {label(c.severity)}</p>}</div>)}</div> : <Empty>No active health conditions are recorded.</Empty>}</Section>
    <Section title="Current medicines">{medications.length ? <div className="grid gap-3 sm:grid-cols-2">{medications.map((m: any) => <div key={m.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{text(m.medication?.name || m.name)}</p><p className="mt-1 text-sm text-slate-500">{text(m.dosage, "Dose not recorded")} · {text(m.frequency, "Frequency not recorded")}</p></div>)}</div> : <Empty>No current medicines are recorded.</Empty>}</Section>
    <Section title="Immunisations"><div className="flex items-center gap-2 mb-4"><Syringe className="h-5 w-5 text-[#24c1c4]"/><span className="text-sm text-slate-500">{immunizations.length} recorded</span></div>{immunizations.length ? <div className="grid gap-3 sm:grid-cols-2">{immunizations.map((i: any) => <div key={i.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{text(i.immunization?.name || i.name)}</p><p className="mt-1 text-sm text-slate-500">{date(i.administeredAt)}{i.doseNumber != null ? ` · Dose ${i.doseNumber}` : ""}</p></div>)}</div> : <Empty>No immunisations are recorded.</Empty>}</Section>
    <Section title="Latest vitals"><div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{vitals.length ? vitals.map((v: any) => <div key={`${v.type}-${v.measuredAt}`} className="rounded-2xl bg-slate-50 p-4"><Activity className="h-4 w-4 text-[#24c1c4]"/><p className="mt-2 text-xs text-slate-500">{label(v.type)}</p><p className="mt-1 font-bold text-[#0b2d54]">{text(v.value)} <span className="text-xs font-medium text-slate-400">{text(v.unit, "")}</span></p></div>) : <Empty>No connected vital measurements are recorded.</Empty>}</div></Section>
    <Section title="Emergency information">{passport?.emergencyNotes && <p className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{passport.emergencyNotes}</p>}{emergencies.length ? <div className="grid gap-3 sm:grid-cols-2">{emergencies.map((c: any) => <div key={c.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{c.fullName}</p><p className="mt-1 text-sm text-slate-500">{label(c.relationship)}</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#0b2d54]"><Phone className="h-4 w-4"/>{c.phoneNumber}</p></div>)}</div> : <Empty>No emergency contacts are recorded.</Empty>}</Section>
    <Section title="Insurance / medical aid"><div className="flex items-center gap-2 mb-4"><CreditCard className="h-5 w-5 text-[#24c1c4]"/>{insurance.length ? <span className="text-sm text-slate-500">{insurance.length} policy record{insurance.length === 1 ? "" : "s"}</span> : null}</div>{insurance.length ? <div className="grid gap-3 sm:grid-cols-2">{insurance.map((p: any) => <div key={p.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{text(p.insurancePolicy?.name || p.name, "Medical aid / insurance")}</p><p className="mt-1 text-sm text-slate-500">Membership: {text(p.membershipNumber)}</p>{p.dependantCode && <p className="mt-1 text-sm text-slate-500">Dependant: {p.dependantCode}</p>}</div>)}</div> : <Empty>No insurance or medical-aid record is available.</Empty>}</Section>

    <div className="rounded-3xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5 text-sm text-slate-600"><p className="font-semibold text-[#0b2d54]">Show this card when you need care.</p><p className="mt-1">It uses the health information saved in your authenticated patient record. Nothing here is made up for display.</p></div>
  </div></main></ProtectedRoute>;
}
