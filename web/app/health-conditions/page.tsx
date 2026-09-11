"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowLeft, Edit3, Plus, RefreshCw, Save, X } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { api } from "@/lib/api";

const formatEnum = (value: unknown) => !value ? "Not specified" : String(value).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const displayDate = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) : "Date not recorded";
const unwrap = (payload: any) => Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.data?.data) ? payload.data.data : [];

export default function HealthConditionsPage() {
  const { data: dashboard, loading, reload } = useDashboard();
  const [allergyCatalog, setAllergyCatalog] = useState<any[]>([]);
  const [conditionCatalog, setConditionCatalog] = useState<any[]>([]);
  const [clinicalDiagnoses, setClinicalDiagnoses] = useState<any[]>([]);
  const [section, setSection] = useState<"allergy" | "condition" | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<any>({});

  const allergies = useMemo(() => Array.isArray(dashboard?.allergies) ? dashboard.allergies : [], [dashboard?.allergies]);
  const conditions = useMemo(() => Array.isArray(dashboard?.conditions) ? dashboard.conditions : [], [dashboard?.conditions]);
  const activeAllergies = allergies.filter((item: any) => item?.status === "ACTIVE" || !item?.status);
  const activeConditions = conditions.filter((item: any) => item?.status === "ACTIVE" && !item?.resolvedAt);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [allergyResponse, conditionResponse, diagnosisResponse] = await Promise.allSettled([
        api.get("/allergies?page=1&limit=50"),
        api.get("/conditions?page=1&limit=50"),
        api.get("/patient-health-records/clinical-diagnoses"),
      ]);
      if (cancelled) return;
      if (allergyResponse.status === "fulfilled") setAllergyCatalog(unwrap(allergyResponse.value.data));
      if (conditionResponse.status === "fulfilled") setConditionCatalog(unwrap(conditionResponse.value.data));
      if (diagnosisResponse.status === "fulfilled") setClinicalDiagnoses(Array.isArray(diagnosisResponse.value.data) ? diagnosisResponse.value.data : unwrap(diagnosisResponse.value.data));
    })();
    return () => { cancelled = true; };
  }, []);

  const openAdd = (kind: "allergy" | "condition") => {
    setSection(kind); setEditing(null); setMessage("");
    setDraft(kind === "allergy" ? { allergyId: "", severity: "", reaction: "", notes: "" } : { conditionId: "", diagnosedAt: "", chronic: false, status: "ACTIVE", notes: "" });
  };

  const openEdit = (kind: "allergy" | "condition", record: any) => {
    if (kind === "allergy" && (record.verified || record.verifiedBy)) return;
    if (kind === "condition" && (record.diagnosedBy || record.treatmentPlan)) return;
    setSection(kind); setEditing(record); setMessage("");
    setDraft(kind === "allergy" ? { allergyId: record.allergyId, severity: record.severity ?? "", reaction: record.reaction ?? "", notes: record.notes ?? "" } : { conditionId: record.conditionId, diagnosedAt: record.diagnosedAt ? String(record.diagnosedAt).slice(0, 10) : "", chronic: Boolean(record.chronic), status: record.status ?? "ACTIVE", notes: record.notes ?? "" });
  };

  const save = async () => {
    if (!section || (!draft.allergyId && !draft.conditionId)) return;
    setSaving(true); setMessage("");
    try {
      if (section === "allergy") {
        const body = { allergyId: draft.allergyId, severity: draft.severity || undefined, reaction: draft.reaction || undefined, notes: draft.notes || undefined, status: "ACTIVE" };
        if (editing) await api.patch(`/patient-health-records/allergies/${editing.id}`, body);
        else await api.post("/patient-health-records/allergies", body);
      } else {
        const body = { conditionId: draft.conditionId, diagnosedAt: draft.diagnosedAt || undefined, chronic: Boolean(draft.chronic), status: draft.status || "ACTIVE", notes: draft.notes || undefined };
        if (editing) await api.patch(`/patient-health-records/conditions/${editing.id}`, body);
        else await api.post("/patient-health-records/conditions", body);
      }
      setSection(null); setEditing(null); setDraft({}); setMessage("Your patient health information has been updated."); await reload();
    } catch { setMessage("We couldn't save that change. Please try again."); } finally { setSaving(false); }
  };

  const remove = async (kind: "allergy" | "condition", record: any) => {
    if (kind === "allergy" && (record.verified || record.verifiedBy)) return;
    if (kind === "condition" && (record.diagnosedBy || record.treatmentPlan)) return;
    setSaving(true); setMessage("");
    try {
      await api.delete(`/patient-health-records/${kind === "allergy" ? "allergies" : "conditions"}/${record.id}`);
      setMessage("The patient-entered record has been removed."); await reload();
    } catch { setMessage("We couldn't remove that record. Please try again."); } finally { setSaving(false); }
  };

  return <ProtectedRoute><main className="min-h-screen bg-[#F7F9FC]">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B2D54]"><ArrowLeft className="h-4 w-4"/>Back to My Health</Link><Link href="/health-passport" className="text-sm font-semibold text-[#0B2D54] hover:underline">Open My Clinic Card</Link></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-bold text-[#0B2D54]"><Activity className="h-3.5 w-3.5"/>Health information</div><h1 className="text-3xl font-bold tracking-tight text-[#0B2D54]">Allergies & conditions</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Keep your own health information up to date. Practitioner diagnoses are also brought into this view automatically from the clinical record.</p></div>
      {message && <div className="mb-5 rounded-2xl border border-[#24c1c4]/20 bg-white px-4 py-3 text-sm font-semibold text-[#0B2D54]">{message}</div>}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600"><AlertCircle className="h-5 w-5"/></div><div><h2 className="font-bold text-[#0B2D54]">Allergies</h2><p className="text-xs text-slate-500">{activeAllergies.length} active records</p></div></div><button onClick={() => openAdd("allergy")} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B2D54] px-3.5 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5"/>Add</button></div><div className="mt-5 space-y-3">{activeAllergies.length ? activeAllergies.map((item: any) => { const clinician = Boolean(item.verified || item.verifiedBy); return <div key={item.id} className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#0B2D54]">{item.allergy?.name || item.name || "Allergy"}</p>{item.reaction && <p className="mt-1 text-sm text-slate-500">Reaction: {item.reaction}</p>}{item.severity && <p className="mt-1 text-xs text-slate-500">Severity: {formatEnum(item.severity)}</p>}<span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">{clinician ? "Clinician verified" : "Patient record"}</span></div>{!clinician && <div className="flex gap-1"><button onClick={() => openEdit("allergy", item)} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Edit allergy"><Edit3 className="h-4 w-4"/></button><button onClick={() => remove("allergy", item)} className="rounded-lg p-2 text-slate-400 hover:bg-white" aria-label="Remove allergy"><X className="h-4 w-4"/></button></div>}</div></div>; }) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No active allergies recorded.</p>}</div></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Activity className="h-5 w-5"/></div><div><h2 className="font-bold text-[#0B2D54]">Health conditions</h2><p className="text-xs text-slate-500">{activeConditions.length} active records</p></div></div><button onClick={() => openAdd("condition")} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B2D54] px-3.5 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5"/>Add</button></div><div className="mt-5 space-y-3">{activeConditions.length ? activeConditions.map((item: any) => { const clinician = Boolean(item.diagnosedBy || item.treatmentPlan); return <div key={item.id} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#0B2D54]">{item.condition?.name || item.name || "Health condition"}</p>{item.diagnosedAt && <p className="mt-1 text-sm text-slate-500">Recorded: {displayDate(item.diagnosedAt)}</p>}{item.notes && <p className="mt-1 text-sm text-slate-500">{item.notes}</p>}<span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">{clinician ? "Clinician record" : "Patient record"}</span></div>{!clinician && <div className="flex gap-1"><button onClick={() => openEdit("condition", item)} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Edit condition"><Edit3 className="h-4 w-4"/></button><button onClick={() => remove("condition", item)} className="rounded-lg p-2 text-slate-400 hover:bg-white" aria-label="Remove condition"><X className="h-4 w-4"/></button></div>}</div></div>; }) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No active patient conditions recorded.</p>}</div></section>
      </div>
      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-[#0B2D54]">Clinical diagnoses</h2><p className="mt-1 text-xs text-slate-500">Practitioner diagnoses are part of your clinical record and cannot be edited from the patient view.</p></div><RefreshCw className="h-4 w-4 text-slate-300"/></div><div className="mt-4 space-y-3">{clinicalDiagnoses.length ? clinicalDiagnoses.map((item: any) => <div key={item.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#0B2D54]">{item.diagnosis?.name || item.diagnosis?.description || "Clinical diagnosis"}</p><p className="mt-1 text-xs text-slate-500">Clinical encounter · {displayDate(item.createdAt || item.encounter?.startedAt)}</p>{item.notes && <p className="mt-2 text-sm text-slate-600">{item.notes}</p>}</div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#0B2D54]">Practitioner record</span></div></div>) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No practitioner diagnoses are available to display yet.</p>}</div></section>
    </div>
    {section && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-[#0B2D54]">{editing ? "Edit" : "Add"} {section === "allergy" ? "allergy" : "health condition"}</h2><p className="mt-1 text-xs text-slate-500">Choose from Sympto's reference list and add your information.</p></div><button onClick={() => setSection(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"><X className="h-5 w-5"/></button></div><div className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">{section === "allergy" ? "Allergy" : "Condition"}</span><select value={section === "allergy" ? draft.allergyId : draft.conditionId} onChange={(e) => setDraft((v: any) => ({ ...v, [section === "allergy" ? "allergyId" : "conditionId"]: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-[#0B2D54]"><option value="">Select</option>{(section === "allergy" ? allergyCatalog : conditionCatalog).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{section === "allergy" ? <><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Severity</span><select value={draft.severity} onChange={(e) => setDraft((v: any) => ({ ...v, severity: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Not specified</option><option value="MILD">Mild</option><option value="MODERATE">Moderate</option><option value="SEVERE">Severe</option><option value="LIFE_THREATENING">Life threatening</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Reaction</span><input value={draft.reaction} onChange={(e) => setDraft((v: any) => ({ ...v, reaction: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="e.g. Rash, swelling"/></label></> : <><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Date diagnosed or first recorded</span><input type="date" value={draft.diagnosedAt} onChange={(e) => setDraft((v: any) => ({ ...v, diagnosedAt: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm"><input type="checkbox" checked={draft.chronic} onChange={(e) => setDraft((v: any) => ({ ...v, chronic: e.target.checked }))}/><span>Long-term / chronic condition</span></label></>}<label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Notes</span><textarea value={draft.notes || ""} onChange={(e) => setDraft((v: any) => ({ ...v, notes: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label></div><div className="mt-6 flex justify-end gap-3"><button onClick={() => setSection(null)} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button onClick={save} disabled={saving || (!draft.allergyId && !draft.conditionId)} className="inline-flex items-center gap-2 rounded-xl bg-[#0B2D54] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{saving ? "Saving…" : "Save"}</button></div></div></div>}
  </main></ProtectedRoute>;
}
