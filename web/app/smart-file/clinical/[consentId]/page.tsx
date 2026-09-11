"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardList, FileText, FlaskConical, HeartPulse, Pill, ShieldCheck, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/protected-route";
import { api } from "@/lib/api";

type SmartFile = {
  patient: { id: string; patientNumber: string; firstName: string; middleName?: string | null; lastName: string; preferredName?: string | null; dateOfBirth?: string | null; gender?: string | null };
  healthPassport: any;
  conditions: any[];
  allergies: any[];
  immunisations: any[];
  medications: any[];
  prescriptions: any[];
  encounters: any[];
  episodes: any[];
  vitals: any[];
  symptoms: any[];
  diagnoses: any[];
  procedures: any[];
  labResults: any[];
  imaging: any[];
  carePlans: any[];
  referrals: any[];
  clinicalDocuments: any[];
  generatedAt: string;
};

const unwrap = <T,>(value: any): T => value?.data ?? value;
const text = (value: unknown, fallback = "Not recorded") => value === null || value === undefined || value === "" ? fallback : String(value);
const date = (value: unknown) => value ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(String(value))) : "Not recorded";

function Section({ icon: Icon, title, count, children }: { icon: typeof HeartPulse; title: string; count: number; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Icon className="h-5 w-5" /></div><h2 className="font-bold text-[#0b2d54]">{title}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{count}</span></div><div className="mt-4">{children}</div></section>;
}

function Empty({ label }: { label: string }) { return <p className="text-sm text-slate-500">No {label} are recorded.</p>; }

export default function ClinicalSmartFilePage() {
  const params = useParams<{ consentId: string }>();
  const [file, setFile] = useState<SmartFile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.consentId) return;
    api.get(`/smart-file/clinical/${params.consentId}`).then((response) => setFile(unwrap<SmartFile>(response.data))).catch((err) => setError(err?.response?.data?.message || "This clinical Smart File is no longer available.")).finally(() => setLoading(false));
  }, [params.consentId]);

  return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] text-slate-800"><div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
    <Link href="/smart-file/authorize" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54]"><ArrowLeft className="h-4 w-4" />Back to Smart File access</Link>
    {loading && <div className="space-y-4"><div className="h-48 animate-pulse rounded-[32px] bg-white"/><div className="h-32 animate-pulse rounded-3xl bg-white"/></div>}
    {!loading && error && <section className="rounded-3xl bg-white p-8 text-center shadow-sm"><ShieldCheck className="mx-auto h-12 w-12 text-slate-300"/><h1 className="mt-4 text-xl font-bold text-[#0b2d54]">Smart File access unavailable</h1><p className="mt-2 text-sm text-slate-500">{error}</p></section>}
    {!loading && file && <>
      <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0b2d54] to-[#24c1c4] p-6 text-white shadow-lg sm:p-8"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70"><ShieldCheck className="h-4 w-4"/>Clinical Smart File</div><h1 className="mt-3 text-3xl font-bold">{text(file.patient.preferredName || file.patient.firstName)} {text(file.patient.lastName, "")}</h1><p className="mt-2 text-sm text-white/75">Patient number: {text(file.patient.patientNumber)} · Date of birth: {date(file.patient.dateOfBirth)}</p></div><Stethoscope className="h-9 w-9"/></div><p className="mt-6 max-w-3xl text-sm leading-6 text-white/80">Longitudinal clinical history shared by the patient. Financial information such as claims, invoices, receipts and payments is not included.</p></section>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="text-xs text-slate-500">Encounters</p><p className="mt-1 text-2xl font-black text-[#0b2d54]">{file.encounters.length}</p></div><div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="text-xs text-slate-500">Prescriptions</p><p className="mt-1 text-2xl font-black text-[#0b2d54]">{file.prescriptions.length}</p></div><div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="text-xs text-slate-500">Lab results</p><p className="mt-1 text-2xl font-black text-[#0b2d54]">{file.labResults.length}</p></div><div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="text-xs text-slate-500">Imaging</p><p className="mt-1 text-2xl font-black text-[#0b2d54]">{file.imaging.length}</p></div></div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Section icon={HeartPulse} title="Conditions & allergies" count={file.conditions.length + file.allergies.length}><div className="space-y-3">{file.conditions.length ? <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Conditions</p><div className="mt-2 flex flex-wrap gap-2">{file.conditions.map((x: any, i) => <span key={x.id || i} className="rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">{text(x.condition?.name || x.name)}</span>)}</div></div> : null}{file.allergies.length ? <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Allergies</p><div className="mt-2 flex flex-wrap gap-2">{file.allergies.map((x: any, i) => <span key={x.id || i} className="rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{text(x.allergy?.name || x.name)}</span>)}</div></div> : null}{!file.conditions.length && !file.allergies.length && <Empty label="conditions or allergies"/>}</div></Section>
        <Section icon={Pill} title="Medications & prescriptions" count={file.prescriptions.length}><div className="space-y-3">{file.prescriptions.slice(0, 8).map((p: any) => <div key={p.id} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">{date(p.issuedAt)}</p><div className="mt-2 space-y-2">{(p.items || []).map((item: any, i: number) => <div key={item.id || i}><p className="font-semibold text-[#0b2d54]">{text(item.medication?.name || item.medicationName)}</p><p className="text-xs text-slate-500">{text(item.dosage)} · {text(item.frequency)}</p></div>)}</div></div>)}{!file.prescriptions.length && <Empty label="prescriptions"/>}</div></Section>
        <Section icon={CalendarDays} title="Encounters & episodes" count={file.encounters.length + file.episodes.length}><div className="space-y-3">{file.encounters.slice(0, 10).map((e: any, i: number) => <div key={e.id || i} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{text(e.encounterType?.name || e.encounterType?.code, "Clinical encounter")}</p><p className="mt-1 text-xs text-slate-500">{date(e.startedAt)} · {text(e.practitioner?.person ? `${e.practitioner.person.firstName} ${e.practitioner.person.lastName}` : null, "Practitioner not recorded")}</p></div>)}{!file.encounters.length && !file.episodes.length && <Empty label="encounters or episodes"/>}</div></Section>
        <Section icon={FlaskConical} title="Tests & imaging" count={file.labResults.length + file.imaging.length}><div className="space-y-3">{file.labResults.slice(0, 6).map((r: any, i: number) => <div key={r.id || i} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{text(r.name || r.testName, "Lab result")}</p><p className="mt-1 text-xs text-slate-500">{text(r.value || r.result, "Result not recorded")} · {date(r.reportedAt)}</p></div>)}{file.imaging.slice(0, 6).map((r: any, i: number) => <div key={r.id || i} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{text(r.studyType || r.name, "Imaging study")}</p><p className="mt-1 text-xs text-slate-500">{date(r.performedAt)}</p></div>)}{!file.labResults.length && !file.imaging.length && <Empty label="tests or imaging"/>}</div></Section>
        <Section icon={ClipboardList} title="Vitals, symptoms & diagnoses" count={file.vitals.length + file.symptoms.length + file.diagnoses.length}><div className="space-y-2 text-sm">{file.vitals.slice(0, 5).map((v: any, i: number) => <div key={v.id || i} className="flex justify-between gap-3 rounded-xl bg-slate-50 p-3"><span>{text(v.vitalType?.name || v.type, "Vital")}</span><strong className="text-[#0b2d54]">{text(v.value)}</strong></div>)}{file.diagnoses.slice(0, 5).map((d: any, i: number) => <div key={d.id || i} className="rounded-xl bg-slate-50 p-3">Diagnosis: <strong className="text-[#0b2d54]">{text(d.name || d.diagnosis?.name)}</strong></div>)}{file.symptoms.slice(0, 5).map((s: any, i: number) => <div key={s.id || i} className="rounded-xl bg-slate-50 p-3">Symptom: <strong className="text-[#0b2d54]">{text(s.symptomName || s.name || s.description)}</strong></div>)}{!file.vitals.length && !file.symptoms.length && !file.diagnoses.length && <Empty label="vitals, symptoms or diagnoses"/>}</div></Section>
        <Section icon={FileText} title="Care plans & referrals" count={file.carePlans.length + file.referrals.length}><div className="space-y-3">{file.carePlans.slice(0, 8).map((x: any, i: number) => <div key={x.id || i} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{text(x.name || x.title, "Care plan")}</p><p className="mt-1 text-xs text-slate-500">{text(x.status)}</p></div>)}{file.referrals.slice(0, 8).map((x: any, i: number) => <div key={x.id || i} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">Referral</p><p className="mt-1 text-xs text-slate-500">{text(x.reason || x.notes || x.specialty)}</p></div>)}{!file.carePlans.length && !file.referrals.length && <Empty label="care plans or referrals"/>}</div></Section>
      </div>
      <p className="mt-5 text-center text-xs text-slate-400">Smart File generated {date(file.generatedAt)} · Access is controlled by the patient's consent.</p>
    </>}
  </div></main></ProtectedRoute>;
}
