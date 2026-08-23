"use client";

import Link from "next/link";
import { ArrowLeft, Clock3, FileText, Pill, Plus, ShieldCheck } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { MedicationReminderButton } from "@/components/medications/MedicationReminderButton";

function formatEnum(value: unknown) {
  if (!value) return "Not specified";
  return String(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function MedicationsPage() {
  const { data, loading, error, reload } = useDashboard();
  // Health Home already exposes the canonical active medication collection under today.
  // Prefer it so this page cannot drift from the medication count shown on Health Home.
  const medications = Array.isArray(data?.medications) && data.medications.length > 0
    ? data.medications
    : (data?.today?.activeMedications ?? []);
  const activeMedications = medications.filter((medication: any) => medication?.ongoing === true || medication?.status === "ACTIVE" || !medication?.status);

  return <main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to Health Home</Link>
    <div className="mb-8"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0b2d54]"><Pill className="h-3.5 w-3.5" />My health</div><h1 className="text-3xl font-bold tracking-tight text-[#0b2d54] sm:text-4xl">Medications</h1><p className="mt-2 max-w-2xl text-slate-500">Keep track of your current medicines, doses, schedules and prescribing information.</p></div>
    {loading && <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading your medications...</div>}
    {error && !loading && <div className="mb-6 rounded-2xl border border-red-200 bg-white p-6"><h2 className="font-semibold text-[#0b2d54]">We couldn't load your medications</h2><button onClick={reload} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>}
    <section className="mb-8 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5"><Pill className="h-5 w-5 text-[#24c1c4]" /><p className="mt-4 text-2xl font-bold text-[#0b2d54]">{activeMedications.length}</p><p className="mt-1 text-sm text-slate-500">Current medications</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><Clock3 className="h-5 w-5 text-[#24c1c4]" /><p className="mt-4 text-2xl font-bold text-[#0b2d54]">{activeMedications.length}</p><p className="mt-1 text-sm text-slate-500">Active treatment plans</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><FileText className="h-5 w-5 text-[#24c1c4]" /><p className="mt-4 text-2xl font-bold text-[#0b2d54]">{medications.length}</p><p className="mt-1 text-sm text-slate-500">Medication records</p></div></section>
    {!loading && !error && <section><h2 className="mb-1 text-lg font-semibold text-[#0b2d54]">Current medications</h2><p className="mb-4 text-sm text-slate-500">Medicines currently recorded in your Sympto health profile.</p>{activeMedications.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><Pill className="mx-auto h-8 w-8 text-slate-400" /><h3 className="mt-4 font-semibold text-[#0b2d54]">No current medications</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">No active medications are currently recorded.</p></div> : <div className="grid gap-4 md:grid-cols-2">{activeMedications.map((medication: any) => { const medicationName = medication?.medication?.name || medication?.medication?.genericName || medication?.name || "Medication"; return <article key={medication?.id ?? medicationName} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Pill className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 className="font-semibold text-[#0b2d54]">{medicationName}</h3><span className="mt-2 inline-flex rounded-full bg-[#24c1c4]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0b2d54]">Active</span><div className="mt-4 space-y-2 text-sm text-slate-600"><p><b>Dose:</b> {medication?.dosage || "Not specified"}</p><p><b>Frequency:</b> {formatEnum(medication?.frequency)}</p>{medication?.prescribedBy && <p><b>Prescribed by:</b> {medication.prescribedBy}</p>}</div>{medication?.id && <MedicationReminderButton medicationId={medication.id} medicationName={medicationName} dosage={medication?.dosage} />}</div></div></article>; })}</div>}</section>}
    <div className="mt-8 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#0b2d54]" /><div><h3 className="font-semibold text-[#0b2d54]">Keep your medication list up to date</h3><p className="mt-1 text-sm leading-6 text-slate-500">Always check medication changes with your healthcare professional. Sympto does not replace professional medical advice.</p></div></div></div>
  </div></main>;
}
