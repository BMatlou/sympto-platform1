"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowLeft, Edit3, Plus, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

const unwrap = (payload: any) => Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.data?.data) ? payload.data.data : [];
const prettyDate = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "Date not recorded";

export default function HealthConditionsPage() {
  const { data, loading, reload } = useDashboard();
  const [allergiesCatalog, setAllergiesCatalog] = useState<any[]>([]);
  const [conditionsCatalog, setConditionsCatalog] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [modal, setModal] = useState<"allergy" | "condition" | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const allergies = useMemo(() => Array.isArray(data?.allergies) ? data.allergies.filter((x: any) => x?.status === "ACTIVE" || !x?.status) : [], [data?.allergies]);
  const conditions = useMemo(() => Array.isArray(data?.conditions) ? data.conditions.filter((x: any) => x?.status === "ACTIVE" && !x?.resolvedAt) : [], [data?.conditions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled([
        api.get("/allergies?page=1&limit=100"),
        api.get("/conditions?page=1&limit=100"),
        api.get("/patient-health-records/clinical-diagnoses"),
      ]);
      if (cancelled) return;
      if (results[0].status === "fulfilled") setAllergiesCatalog(unwrap(results[0].value.data));
      if (results[1].status === "fulfilled") setConditionsCatalog(unwrap(results[1].value.data));
      if (results[2].status === "fulfilled") setDiagnoses(Array.isArray(results[2].value.data) ? results[2].value.data : unwrap(results[2].value.data));
    })();
    return () => { cancelled = true; };
  }, []);

  const openAdd = (kind: "allergy" | "condition") => {
    setModal(kind);
    setEditing(null);
    setNotice("");
    setDraft(kind === "allergy" ? { allergyId: "", severity: "", reaction: "", notes: "" } : { conditionId: "", diagnosedAt: "", chronic: false, notes: "" });
  };

  const openEdit = (kind: "allergy" | "condition", record: any) => {
    const clinician = kind === "allergy" ? Boolean(record.verified || record.verifiedBy) : Boolean(record.diagnosedBy || record.treatmentPlan);
    if (clinician) return;
    setModal(kind);
    setEditing(record);
    setNotice("");
    setDraft(kind === "allergy"
      ? { allergyId: record.allergyId, severity: record.severity ?? "", reaction: record.reaction ?? "", notes: record.notes ?? "" }
      : { conditionId: record.conditionId, diagnosedAt: record.diagnosedAt ? String(record.diagnosedAt).slice(0, 10) : "", chronic: Boolean(record.chronic), notes: record.notes ?? "" });
  };

  const save = async () => {
    if (!modal || saving) return;
    setSaving(true);
    setNotice("");
    try {
      if (modal === "allergy") {
        const body = { allergyId: draft.allergyId, severity: draft.severity || undefined, reaction: draft.reaction || undefined, notes: draft.notes || undefined, status: "ACTIVE" };
        if (editing) await api.patch(`/patient-health-records/allergies/${editing.id}`, body);
        else await api.post("/patient-health-records/allergies", body);
      } else {
        const body = { conditionId: draft.conditionId, diagnosedAt: draft.diagnosedAt || undefined, chronic: Boolean(draft.chronic), status: "ACTIVE", notes: draft.notes || undefined };
        if (editing) await api.patch(`/patient-health-records/conditions/${editing.id}`, body);
        else await api.post("/patient-health-records/conditions", body);
      }
      setModal(null);
      setEditing(null);
      setNotice("Your patient health record has been updated.");
      await reload();
    } catch (error: any) {
      setNotice(error?.response?.data?.message || "We couldn't save that record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (kind: "allergy" | "condition", record: any) => {
    const clinician = kind === "allergy" ? Boolean(record.verified || record.verifiedBy) : Boolean(record.diagnosedBy || record.treatmentPlan);
    if (clinician || saving) return;
    setSaving(true);
    setNotice("");
    try {
      await api.delete(`/patient-health-records/${kind === "allergy" ? "allergies" : "conditions"}/${record.id}`);
      setNotice("Your patient-entered record has been removed.");
      await reload();
    } catch (error: any) {
      setNotice(error?.response?.data?.message || "We couldn't remove that record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-5"><div className="mx-auto max-w-6xl space-y-4"><div className="h-24 animate-pulse rounded-3xl bg-white"/><div className="grid gap-5 md:grid-cols-2"><div className="h-72 animate-pulse rounded-3xl bg-white"/><div className="h-72 animate-pulse rounded-3xl bg-white"/></div></div></main></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb] pb-12">
        <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"><Link href="/health-passport" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54]"><ArrowLeft className="h-4 w-4" />My Clinic Card</Link><Link href="/dashboard" className="text-xs font-bold text-[#0b2d54] hover:underline">My Health</Link></div></header>
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
          <section className="mb-6 rounded-[30px] bg-gradient-to-r from-[#0b2d54] to-[#173f69] p-6 text-white shadow-[0_18px_50px_rgba(11,45,84,0.16)] sm:p-8"><div className="flex items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75"><ShieldCheck className="h-3.5 w-3.5" />Health records</div><h1 className="mt-4 text-3xl font-extrabold tracking-tight">Allergies & conditions</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Manage your own patient-entered records while practitioner diagnoses and verified clinical information flow into the same view.</p></div><Activity className="mt-1 hidden h-8 w-8 text-[#24c1c4] sm:block" /></div></section>

          {notice && <div className="mb-5 rounded-2xl border border-[#24c1c4]/20 bg-white px-4 py-3 text-sm font-semibold text-[#0b2d54] shadow-sm">{notice}</div>}

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-[26px] border border-rose-100 bg-white p-5 shadow-[0_10px_35px_rgba(11,45,84,0.06)] sm:p-6"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-600"><AlertCircle className="h-5 w-5" /></span><div><h2 className="font-bold text-[#0b2d54]">Allergies</h2><p className="text-xs text-slate-500">{allergies.length} active records</p></div></div></div><button onClick={() => openAdd("allergy")} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3.5 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" />Add</button></div><div className="mt-5 space-y-3">{allergies.length ? allergies.map((item: any) => { const clinician = Boolean(item.verified || item.verifiedBy); return <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#0b2d54]">{item.allergy?.name || item.name || "Allergy"}</p>{item.reaction && <p className="mt-1 text-sm text-slate-500">Reaction · {item.reaction}</p>}<span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">{clinician ? "Clinician verified · view only" : "Patient record · editable"}</span></div>{!clinician && <div className="flex gap-1"><button onClick={() => openEdit("allergy", item)} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Edit allergy"><Edit3 className="h-4 w-4" /></button><button onClick={() => remove("allergy", item)} className="rounded-lg p-2 text-slate-400 hover:bg-white" aria-label="Remove allergy"><Trash2 className="h-4 w-4" /></button></div>}</div></article>; }) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No active allergies recorded.</p>}</div></section>

            <section className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_10px_35px_rgba(11,45,84,0.06)] sm:p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Activity className="h-5 w-5" /></span><div><h2 className="font-bold text-[#0b2d54]">Health conditions</h2><p className="text-xs text-slate-500">{conditions.length} active records</p></div></div><button onClick={() => openAdd("condition")} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3.5 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" />Add</button></div><div className="mt-5 space-y-3">{conditions.length ? conditions.map((item: any) => { const clinician = Boolean(item.diagnosedBy || item.treatmentPlan); return <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#0b2d54]">{item.condition?.name || item.name || "Health condition"}</p>{item.diagnosedAt && <p className="mt-1 text-sm text-slate-500">Recorded · {prettyDate(item.diagnosedAt)}</p>}<span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">{clinician ? "Clinician record · view only" : "Patient record · editable"}</span></div>{!clinician && <div className="flex gap-1"><button onClick={() => openEdit("condition", item)} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Edit condition"><Edit3 className="h-4 w-4" /></button><button onClick={() => remove("condition", item)} className="rounded-lg p-2 text-slate-400 hover:bg-white" aria-label="Remove condition"><Trash2 className="h-4 w-4" /></button></div>}</div></article>; }) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No active health conditions recorded.</p>}</div></section>
          </div>

          <section className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(11,45,84,0.06)] sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-[#0b2d54]">Practitioner diagnoses</h2><p className="mt-1 text-xs text-slate-500">These records come from clinical encounters and are read-only from the patient view.</p></div><RefreshCw className="h-4 w-4 text-slate-300" /></div><div className="mt-4 space-y-3">{diagnoses.length ? diagnoses.map((item: any) => <div key={item.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#0b2d54]">{item.diagnosis?.name || item.diagnosis?.description || "Clinical diagnosis"}</p><p className="mt-1 text-xs text-slate-500">Clinical encounter · {prettyDate(item.createdAt || item.encounter?.startedAt)}</p>{item.notes && <p className="mt-2 text-sm text-slate-600">{item.notes}</p>}</div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#0b2d54]">Practitioner record</span></div></div>) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No practitioner diagnoses are available yet.</p>}</div></section>
        </div>

        {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-[#0b2d54]">{editing ? "Edit" : "Add"} {modal === "allergy" ? "allergy" : "health condition"}</h2><p className="mt-1 text-xs text-slate-500">This creates or edits your patient-entered record only.</p></div><button onClick={() => setModal(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">{modal === "allergy" ? "Allergy" : "Condition"}</span><select value={modal === "allergy" ? draft.allergyId : draft.conditionId} onChange={(e) => setDraft((v: any) => ({ ...v, [modal === "allergy" ? "allergyId" : "conditionId"]: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Select</option>{(modal === "allergy" ? allergiesCatalog : conditionsCatalog).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{modal === "allergy" ? <><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Severity</span><select value={draft.severity || ""} onChange={(e) => setDraft((v: any) => ({ ...v, severity: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Not specified</option><option value="MILD">Mild</option><option value="MODERATE">Moderate</option><option value="SEVERE">Severe</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Reaction</span><input value={draft.reaction || ""} onChange={(e) => setDraft((v: any) => ({ ...v, reaction: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="e.g. rash, swelling" /></label></> : <><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Date diagnosed / recorded</span><input type="date" value={draft.diagnosedAt || ""} onChange={(e) => setDraft((v: any) => ({ ...v, diagnosedAt: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label><label className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm"><input type="checkbox" checked={Boolean(draft.chronic)} onChange={(e) => setDraft((v: any) => ({ ...v, chronic: e.target.checked }))} />Long-term / chronic condition</label></>}<label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Notes</span><textarea rows={3} value={draft.notes || ""} onChange={(e) => setDraft((v: any) => ({ ...v, notes: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Optional notes" /></label></div><div className="mt-5 flex justify-end gap-3"><button onClick={() => setModal(null)} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button onClick={save} disabled={saving || !(modal === "allergy" ? draft.allergyId : draft.conditionId)} className="rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save record"}</button></div></div></div>}
      </main>
    </ProtectedRoute>
  );
}
