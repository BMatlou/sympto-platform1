"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardList, FileText, FlaskConical, HeartPulse, Pill, ShieldCheck, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/protected-route";
import { api } from "@/lib/api";

type SmartFile = {
  patient: { id: string; patientNumber: string | null; firstName: string; middleName?: string | null; lastName: string; preferredName?: string | null; dateOfBirth?: string | null; gender?: string | null };
  clinicalAccess: { canView: boolean; canUpdate: boolean; consentExpiresAt: string | null };
  healthPassport: any;
  medicalRecord: any;
  conditions: any[];
  allergies: any[];
  immunisations: any[];
  medications: any[];
  prescriptions: any[];
  encounters: any[];
  episodes: any[];
  vitals: any[];
  symptoms: any[];
  patientVitals: any[];
  diagnoses: any[];
  procedures: any[];
  labResults: any[];
  imaging: any[];
  carePlans: any[];
  referrals: any[];
  clinicalDocuments: any[];
  appointments: any[];
  healthJournalEntries: any[];
  patientMeasurements: any[];
  wearableWellnessMetrics: any[];
  wearableDevices: any[];
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
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    chiefComplaint: "",
    assessment: "",
    plan: "",
    notes: "",
    medicationQuery: "",
    medicationId: "",
    dosage: "",
    frequency: "ONCE_DAILY",
    route: "ORAL",
    instructions: "",
  });
  const [medications, setMedications] = useState<any[]>([]);

  const loadFile = async () => {
    if (!params.consentId) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/smart-file/clinical/${params.consentId}`);
      setFile(unwrap<SmartFile>(response.data));
    } catch (err: any) {
      setError(err?.response?.data?.message || "This clinical Smart File is no longer available.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFile();
  }, [params.consentId]);

  useEffect(() => {
    let active = true;
    const query = form.medicationQuery.trim();
    if (!file?.clinicalAccess.canUpdate || query.length < 2) {
      setMedications([]);
      return;
    }
    api.get(`/smart-file/clinical/${params.consentId}/medications`, { params: { search: query } })
      .then((response) => { if (active) setMedications(unwrap<any[]>(response.data) ?? []); })
      .catch(() => { if (active) setMedications([]); });
    return () => { active = false; };
  }, [file?.clinicalAccess.canUpdate, form.medicationQuery, params.consentId]);

  const saveClinicalUpdate = async () => {
    if (!file?.clinicalAccess.canUpdate || !params.consentId) return;
    const hasRecord = [form.chiefComplaint, form.assessment, form.plan, form.notes].some((value) => value.trim());
    const hasPrescription = Boolean(form.medicationId && form.dosage.trim());
    if (!hasRecord && !hasPrescription) {
      setMessage("Add a clinical note, assessment, plan or prescription before saving.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await api.post(`/smart-file/clinical/${params.consentId}/updates`, {
        chiefComplaint: form.chiefComplaint.trim() || undefined,
        assessment: form.assessment.trim() || undefined,
        plan: form.plan.trim() || undefined,
        notes: form.notes.trim() || undefined,
        prescription: hasPrescription ? {
          medicationId: form.medicationId,
          dosage: form.dosage.trim(),
          frequency: form.frequency,
          route: form.route,
          instructions: form.instructions.trim() || undefined,
        } : undefined,
      });
      setForm({
        chiefComplaint: "",
        assessment: "",
        plan: "",
        notes: "",
        medicationQuery: "",
        medicationId: "",
        dosage: "",
        frequency: "ONCE_DAILY",
        route: "ORAL",
        instructions: "",
      });
      setMedications([]);
      setMessage("Clinical Smart File updated. The new record is now part of the patient’s longitudinal file.");
      await loadFile();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "The clinical update could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] text-slate-800"><div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
    <Link href="/smart-file/authorize" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54]"><ArrowLeft className="h-4 w-4" />Back to Smart File access</Link>
    {loading && <div className="space-y-4"><div className="h-48 animate-pulse rounded-[32px] bg-white"/><div className="h-32 animate-pulse rounded-3xl bg-white"/></div>}
    {!loading && error && <section className="rounded-3xl bg-white p-8 text-center shadow-sm"><ShieldCheck className="mx-auto h-12 w-12 text-slate-300"/><h1 className="mt-4 text-xl font-bold text-[#0b2d54]">Smart File access unavailable</h1><p className="mt-2 text-sm text-slate-500">{error}</p></section>}
    {!loading && file && <>
      <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0b2d54] to-[#24c1c4] p-6 text-white shadow-lg sm:p-8"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70"><ShieldCheck className="h-4 w-4"/>Clinical Smart File</div><h1 className="mt-3 text-3xl font-bold">{text(file.patient.preferredName || file.patient.firstName)} {text(file.patient.lastName, "")}</h1><p className="mt-2 text-sm text-white/75">Patient number: {text(file.patient.patientNumber)} · Date of birth: {date(file.patient.dateOfBirth)}</p></div><Stethoscope className="h-9 w-9"/></div><p className="mt-6 max-w-3xl text-sm leading-6 text-white/80">Longitudinal clinical history shared by the patient. Financial information such as claims, invoices, receipts and payments is not included.</p></section>

      {file.clinicalAccess.canUpdate && <section className="mt-5 rounded-3xl border border-[#24c1c4]/25 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Stethoscope className="h-5 w-5" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-[#0b2d54]">Update this Smart File</h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">Clinical</span>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">Record this visit or issue a prescription. Previous clinical records stay in the file for the next clinician.</p>
          </div>
        </div>
        {message && <div className="mt-4 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 px-4 py-3 text-sm font-semibold text-[#0b2d54]">{message}</div>}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Reason for visit</span><input value={form.chiefComplaint} onChange={(e) => setForm((v) => ({ ...v, chiefComplaint: e.target.value }))} placeholder="e.g. Follow-up" className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#24c1c4]" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Assessment</span><textarea rows={3} value={form.assessment} onChange={(e) => setForm((v) => ({ ...v, assessment: e.target.value }))} placeholder="Clinical assessment" className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#24c1c4]" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Plan</span><textarea rows={3} value={form.plan} onChange={(e) => setForm((v) => ({ ...v, plan: e.target.value }))} placeholder="Care plan or follow-up" className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#24c1c4]" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Clinical note</span><textarea rows={3} value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} placeholder="Additional clinical record" className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#24c1c4]" /></label>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2"><Pill className="h-4 w-4 text-[#0b2d54]" /><h3 className="text-sm font-bold text-[#0b2d54]">Prescription</h3></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Medication</span><input value={form.medicationQuery} onChange={(e) => setForm((v) => ({ ...v, medicationQuery: e.target.value, medicationId: "" }))} placeholder="Search medication" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#24c1c4]" />{medications.length > 0 && <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-white p-1">{medications.map((item) => <button type="button" key={item.id} onClick={() => { setForm((v) => ({ ...v, medicationId: item.id, medicationQuery: item.name })); setMedications([]); }} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#0b2d54] hover:bg-slate-50">{item.name}{item.genericName ? " · " + item.genericName : ""}</button>)}</div>}</label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Dose</span><input value={form.dosage} onChange={(e) => setForm((v) => ({ ...v, dosage: e.target.value }))} placeholder="e.g. 200 mg" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#24c1c4]" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Frequency</span><select value={form.frequency} onChange={(e) => setForm((v) => ({ ...v, frequency: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm">{["ONCE_DAILY","TWICE_DAILY","THREE_TIMES_DAILY","FOUR_TIMES_DAILY","EVERY_4_HOURS","EVERY_6_HOURS","EVERY_8_HOURS","EVERY_12_HOURS","WEEKLY","MONTHLY","AS_NEEDED"].map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Route</span><select value={form.route} onChange={(e) => setForm((v) => ({ ...v, route: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm">{["ORAL","TOPICAL","INTRAVENOUS","INTRAMUSCULAR","SUBCUTANEOUS","INHALATION","RECTAL","NASAL","OPHTHALMIC","OTIC","OTHER"].map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select></label>
          </div>
          <label className="mt-3 block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Instructions</span><textarea rows={2} value={form.instructions} onChange={(e) => setForm((v) => ({ ...v, instructions: e.target.value }))} placeholder="Directions for the patient" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#24c1c4]" /></label>
        </div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={() => void saveClinicalUpdate()} disabled={saving} className="rounded-xl bg-[#0b2d54] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save clinical update"}</button></div>
      </section>}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="text-xs text-slate-500">Encounters</p><p className="mt-1 text-2xl font-black text-[#0b2d54]">{file.encounters.length}</p></div><div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="text-xs text-slate-500">Prescriptions</p><p className="mt-1 text-2xl font-black text-[#0b2d54]">{file.prescriptions.length}</p></div><div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="text-xs text-slate-500">Lab results</p><p className="mt-1 text-2xl font-black text-[#0b2d54]">{file.labResults.length}</p></div><div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><p className="text-xs text-slate-500">Imaging</p><p className="mt-1 text-2xl font-black text-[#0b2d54]">{file.imaging.length}</p></div></div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Section icon={HeartPulse} title="Conditions & allergies" count={file.conditions.length + file.allergies.length}><div className="space-y-3">{file.conditions.length ? <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Conditions</p><div className="mt-2 flex flex-wrap gap-2">{file.conditions.map((x: any, i) => <span key={x.id || i} className="rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">{text(x.condition?.name || x.name)}</span>)}</div></div> : null}{file.allergies.length ? <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Allergies</p><div className="mt-2 flex flex-wrap gap-2">{file.allergies.map((x: any, i) => <span key={x.id || i} className="rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{text(x.allergy?.name || x.name)}</span>)}</div></div> : null}{!file.conditions.length && !file.allergies.length && <Empty label="conditions or allergies"/>}</div></Section>
        <Section icon={Pill} title="Medications & prescriptions" count={file.prescriptions.length}><div className="space-y-3">{file.prescriptions.map((p: any) => <div key={p.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">Clinical</span><p className="text-xs font-bold text-slate-400">{date(p.issuedAt)}</p></div><p className="mt-2 text-xs text-slate-500">{text(p.practitioner?.person ? p.practitioner.person.firstName + " " + p.practitioner.person.lastName : null, "Prescriber not recorded")} · {text(p.status)}</p><div className="mt-2 space-y-3">{(p.items || []).map((item: any, i: number) => <div key={item.id || i}><p className="font-semibold text-[#0b2d54]">{text(item.medication?.name || item.medicationName)}</p><p className="text-xs text-slate-500">{text(item.dosage)} · {text(item.frequency)} · {text(item.route)}</p>{item.instructions && <p className="mt-1 text-xs leading-5 text-slate-600">{item.instructions}</p>}</div>)}</div>{p.notes && <p className="mt-3 text-sm leading-5 text-slate-600">{p.notes}</p>}</div>)}{!file.prescriptions.length && <Empty label="prescriptions"/>}</div></Section>
        <Section icon={CalendarDays} title="Encounters & episodes" count={file.encounters.length + file.episodes.length}><div className="space-y-3">{file.encounters.map((e: any, i: number) => <div key={e.id || i} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">Clinical</span><p className="font-semibold text-[#0b2d54]">{text(e.encounterType?.name || e.encounterType?.code, "Clinical encounter")}</p></div><p className="mt-1 text-xs text-slate-500">{date(e.startedAt)} · {text(e.practitioner?.person ? e.practitioner.person.firstName + " " + e.practitioner.person.lastName : null, "Practitioner not recorded")}</p>{e.chiefComplaint && <p className="mt-3 text-sm leading-5 text-slate-700"><strong>Reason:</strong> {e.chiefComplaint}</p>}{e.assessment && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-700"><strong>Assessment:</strong> {e.assessment}</p>}{e.plan && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-700"><strong>Plan:</strong> {e.plan}</p>}{e.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-600"><strong>Notes:</strong> {e.notes}</p>}</div>)}{!file.encounters.length && !file.episodes.length && <Empty label="encounters or episodes"/>}</div></Section>
        <Section icon={FlaskConical} title="Tests & imaging" count={file.labResults.length + file.imaging.length}><div className="space-y-3">{file.labResults.map((r: any, i: number) => <div key={r.id || i} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">Clinical</span><p className="font-semibold text-[#0b2d54]">{text(r.orderItem?.test?.name, "Lab result")}</p><p className="text-xs text-slate-400">{date(r.reportedAt || r.createdAt)}</p></div><div className="mt-3 space-y-2">{(r.items || []).map((item: any, index: number) => <div key={item.id || index} className="flex flex-wrap justify-between gap-2 rounded-xl bg-white p-3"><span className="text-xs font-semibold text-slate-600">{text(item.test?.name, "Test")}</span><span className="text-xs font-black text-[#0b2d54]">{item.numericValue ?? item.textValue ?? item.booleanValue ?? (item.dateValue ? date(item.dateValue) : null) ?? "Not recorded"}{item.abnormal ? " · Abnormal" : ""}{item.critical ? " · Critical" : ""}</span></div>)}</div>{(r.items || []).length === 0 && <p className="mt-2 text-sm text-slate-500">No individual result values recorded.</p>}</div>)}{file.imaging.map((r: any, i: number) => <div key={r.id || i} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">Clinical</span><p className="font-semibold text-[#0b2d54]">{text(r.studyType || r.modality || r.name, "Imaging study")}</p><p className="text-xs text-slate-400">{date(r.performedAt || r.createdAt)}</p></div>{r.imagingCenter?.name && <p className="mt-2 text-xs text-slate-500">Facility: {r.imagingCenter.name}</p>}{(r.reports || []).map((report: any, index: number) => <div key={report.id || index} className="mt-3 space-y-2"><p className="text-sm leading-5 text-slate-700"><strong>Findings:</strong> {text(report.findings)}</p>{report.impression && <p className="text-sm leading-5 text-slate-700"><strong>Impression:</strong> {report.impression}</p>}{report.recommendations && <p className="text-sm leading-5 text-slate-700"><strong>Recommendations:</strong> {report.recommendations}</p>}</div>)}</div>)}{!file.labResults.length && !file.imaging.length && <Empty label="tests or imaging"/>}</div></Section>
        <Section icon={ClipboardList} title="Vitals, symptoms & diagnoses" count={file.vitals.length + file.patientVitals.length + file.symptoms.length + file.diagnoses.length}><div className="space-y-2 text-sm">{file.vitals.map((v: any, i: number) => <div key={v.id || i} className="flex justify-between gap-3 rounded-xl bg-slate-50 p-3"><span className="flex items-center gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">Clinical</span>{text(v.vitalType?.name || v.type, "Vital")}</span><strong className="text-[#0b2d54]">{text(v.value)}</strong></div>)}{file.patientVitals.map((v: any, i: number) => <div key={v.journalId + "-" + i} className="flex justify-between gap-3 rounded-xl bg-slate-50 p-3"><span className="flex items-center gap-2"><span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-blue-700">Patient</span>{v.type}</span><strong className="text-[#0b2d54]">{text(v.value)} {v.unit}</strong></div>)}{file.diagnoses.map((d: any, i: number) => <div key={d.id || i} className="rounded-xl bg-slate-50 p-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">Clinical</span> Diagnosis: <strong className="text-[#0b2d54]">{text(d.name || d.diagnosis?.name)}</strong></div>)}{file.symptoms.map((s: any, i: number) => <div key={s.id || i} className="rounded-xl bg-slate-50 p-3"><span className={s.source === "CLINICAL" ? "rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700" : "rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-blue-700"}>{s.source === "CLINICAL" ? "Clinical" : "Patient"}</span> Symptom: <strong className="text-[#0b2d54]">{text(s.symptomName || s.name || s.description)}</strong></div>)}{!file.vitals.length && !file.patientVitals.length && !file.symptoms.length && !file.diagnoses.length && <Empty label="vitals, symptoms or diagnoses"/>}</div></Section>
        <Section icon={FileText} title="Care plans & referrals" count={file.carePlans.length + file.referrals.length}><div className="space-y-3">{file.carePlans.map((x: any, i: number) => <div key={x.id || i} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">{text(x.name || x.title, "Care plan")}</p><p className="mt-1 text-xs text-slate-500">{text(x.status)}</p></div>)}{file.referrals.map((x: any, i: number) => <div key={x.id || i} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-[#0b2d54]">Referral</p><p className="mt-1 text-xs text-slate-500">{text(x.reason || x.notes || x.specialty)}</p></div>)}{!file.carePlans.length && !file.referrals.length && <Empty label="care plans or referrals"/>}</div></Section>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Section icon={FileText} title="Medical background" count={file.medicalRecord ? 1 : 0}>
          {file.medicalRecord ? <div className="space-y-3">
            {(["pastMedicalHistory","surgicalHistory","familyHistory","socialHistory","chronicConditions","currentMedications","immunizationNotes"] as const).map((key) => file.medicalRecord?.[key] ? <div key={key}><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{key.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{file.medicalRecord[key]}</p></div> : null)}
            {(file.medicalRecord?.bloodType || file.medicalRecord?.organDonor != null) && <div className="flex flex-wrap gap-2">{file.medicalRecord.bloodType && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">Blood group · {file.medicalRecord.bloodType}</span>}{file.medicalRecord.organDonor != null && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">Organ donor · {file.medicalRecord.organDonor ? "Yes" : "No"}</span>}</div>}
          </div> : <Empty label="medical background"/>}
        </Section>
        <Section icon={HeartPulse} title="Patient health activity" count={file.healthJournalEntries.length + file.patientVitals.length + file.patientMeasurements.length}>
          <div className="space-y-2">
            {file.patientVitals.map((v: any, i: number) => <div key={v.journalId + "-" + v.type + "-" + i} className="rounded-xl bg-slate-50 p-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-blue-700">Patient</span><span className="text-xs text-slate-400">{date(v.recordedAt)}</span></div><p className="mt-1 text-sm font-semibold text-[#0b2d54]">{v.type}: {text(v.value)} {v.unit}</p></div>)}
            {file.healthJournalEntries.map((entry: any) => <div key={entry.id} className="rounded-xl bg-slate-50 p-3"><div className="flex flex-wrap items-center gap-2"><span className={entry.source === "CLINICAL" ? "rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700" : "rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-blue-700"}>{entry.source === "CLINICAL" ? "Clinical" : "Patient"}</span><span className="text-xs text-slate-400">{date(entry.createdAt)}</span></div><p className="mt-1 text-sm font-semibold text-[#0b2d54]">{text(entry.title, "Health journal entry")}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-600">{text(entry.journal, "Entry recorded.")}</p></div>)}
            {file.healthJournalEntries.length === 0 && file.patientVitals.length === 0 && file.patientMeasurements.length === 0 && <Empty label="patient health activity"/>}
          </div>
        </Section>
        <Section icon={FileText} title="Care plans & referrals" count={file.carePlans.length + file.referrals.length}>
          <div className="space-y-3">{file.carePlans.map((x: any) => <div key={x.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">Clinical</span><p className="font-semibold text-[#0b2d54]">{text(x.title, "Care plan")}</p></div><p className="mt-1 text-xs text-slate-500">{text(x.status)}{x.practitioner?.person ? " · " + x.practitioner.person.firstName + " " + x.practitioner.person.lastName : ""}</p>{x.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-600">{x.description}</p>}</div>)}
          {file.referrals.map((x: any) => <div key={x.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">Clinical</span><p className="font-semibold text-[#0b2d54]">Referral {x.specialty ? "· " + x.specialty : ""}</p></div><p className="mt-1 text-xs text-slate-500">{text(x.status)} · {date(x.requestedDate)}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-600">{text(x.reason)}</p>{x.clinicalSummary && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-600"><strong>Clinical summary:</strong> {x.clinicalSummary}</p>}</div>)}
          {file.carePlans.length === 0 && file.referrals.length === 0 && <Empty label="care plans or referrals"/>}
        </Section>
      </div>
      <p className="mt-5 text-center text-xs text-slate-400">Smart File generated {date(file.generatedAt)} · Access is controlled by the patient's consent.</p>
    </>}
  </div></main></ProtectedRoute>;
}
