"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Edit3, Plus, Save, ShieldCheck, Syringe, X, ArrowLeft } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { api } from "@/lib/api";

const unwrap = (payload: any) => Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.data?.data) ? payload.data.data : [];
const displayDate = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) : "Date not recorded";

export default function ImmunizationsPage() {
  const { data: dashboard, loading, reload } = useDashboard();
  const [catalog, setCatalog] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<any>({ immunizationId: "", administeredAt: "", doseNumber: "1", batchNumber: "", manufacturer: "", administeredBy: "", facility: "", route: "", site: "", adverseReaction: false, adverseReactionNotes: "", nextDueDate: "", notes: "" });

  const records = useMemo(() => Array.isArray(dashboard?.immunizations) ? dashboard.immunizations : [], [dashboard?.immunizations]);

  useEffect(() => {
    let cancelled = false;
    api.get("/immunizations?page=1&limit=50").then((response) => {
      if (!cancelled) setCatalog(unwrap(response.data));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const openAdd = () => {
    setEditing(null); setMessage("");
    setDraft({ immunizationId: "", administeredAt: "", doseNumber: "1", batchNumber: "", manufacturer: "", administeredBy: "", facility: "", route: "", site: "", adverseReaction: false, adverseReactionNotes: "", nextDueDate: "", notes: "" });
    setOpen(true);
  };

  const openEdit = (record: any) => {
    if (record.administeredBy || record.facility) return;
    setEditing(record); setMessage("");
    setDraft({ immunizationId: record.immunizationId, administeredAt: record.administeredAt ? String(record.administeredAt).slice(0, 10) : "", doseNumber: String(record.doseNumber ?? 1), batchNumber: record.batchNumber ?? "", manufacturer: record.manufacturer ?? "", administeredBy: "", facility: "", route: record.route ?? "", site: record.site ?? "", adverseReaction: Boolean(record.adverseReaction), adverseReactionNotes: record.adverseReactionNotes ?? "", nextDueDate: record.nextDueDate ? String(record.nextDueDate).slice(0, 10) : "", notes: record.notes ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.immunizationId) return;
    setSaving(true); setMessage("");
    try {
      const body = {
        immunizationId: draft.immunizationId,
        administeredAt: draft.administeredAt || undefined,
        doseNumber: Number(draft.doseNumber) || 1,
        batchNumber: draft.batchNumber || undefined,
        manufacturer: draft.manufacturer || undefined,
        route: draft.route || undefined,
        site: draft.site || undefined,
        adverseReaction: Boolean(draft.adverseReaction),
        adverseReactionNotes: draft.adverseReactionNotes || undefined,
        nextDueDate: draft.nextDueDate || undefined,
        notes: draft.notes || undefined,
      };
      if (editing) await api.patch(`/patient-health-records/immunizations/${editing.id}`, body);
      else await api.post("/patient-health-records/immunizations", body);
      setOpen(false); setEditing(null); setMessage("Your immunisation record has been updated."); await reload();
    } catch { setMessage("We couldn't save that immunisation. Please try again."); } finally { setSaving(false); }
  };

  const remove = async (record: any) => {
    if (record.administeredBy || record.facility) return;
    setSaving(true); setMessage("");
    try {
      await api.delete(`/patient-health-records/immunizations/${record.id}`);
      setMessage("The patient-entered immunisation record has been removed."); await reload();
    } catch { setMessage("We couldn't remove that immunisation. Please try again."); } finally { setSaving(false); }
  };

  return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] text-slate-800"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"><Link href="/health-passport" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54]"><ArrowLeft className="h-4 w-4"/>Back to My Clinic Card</Link><Link href="/dashboard" className="text-sm font-semibold text-[#0b2d54] hover:underline">My Health</Link></div></header><div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-bold text-[#0b2d54]"><Syringe className="h-3.5 w-3.5"/>Immunisation record</div><h1 className="text-3xl font-bold text-[#0b2d54]">My immunisations</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Your vaccination history combines patient-entered information with vaccinations recorded by healthcare professionals.</p></div><button onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4"/>Add immunisation</button></div>
    {message && <div className="mb-5 rounded-2xl border border-[#24c1c4]/20 bg-white p-4 text-sm font-semibold text-[#0b2d54]">{message}</div>}
    {loading ? <div className="rounded-3xl bg-white p-8 text-sm text-slate-500">Loading your immunisation record…</div> : <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">{records.length ? <div className="space-y-3">{records.map((record: any) => { const clinicianRecorded = Boolean(record.administeredBy || record.facility); return <article key={record.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-[#0b2d54]">{record.immunization?.name || "Immunisation"}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${clinicianRecorded ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"}`}>{clinicianRecorded ? "Clinician recorded" : "Patient record"}</span></div><p className="mt-1 text-sm text-slate-500">Dose {record.doseNumber ?? 1} · {displayDate(record.administeredAt)}</p><div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3"><span>Provider: {record.administeredBy || "Not recorded"}</span><span>Facility: {record.facility || "Not recorded"}</span><span>Batch: {record.batchNumber || "Not recorded"}</span></div>{record.nextDueDate && <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0b2d54]"><CalendarDays className="h-3.5 w-3.5"/>Next due {displayDate(record.nextDueDate)}</p>}{record.notes && <p className="mt-2 text-sm text-slate-600">{record.notes}</p>}</div>{!clinicianRecorded && <div className="flex gap-1"><button onClick={() => openEdit(record)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50" aria-label="Edit immunisation"><Edit3 className="h-4 w-4"/></button><button onClick={() => remove(record)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50" aria-label="Remove immunisation"><X className="h-4 w-4"/></button></div>}</div></article>; })}</div> : <div className="rounded-2xl bg-slate-50 p-8 text-center"><Syringe className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 font-semibold text-[#0b2d54]">No immunisations are recorded yet.</p><p className="mt-1 text-sm text-slate-500">Add your vaccination history here, or your healthcare professional can record vaccinations during care.</p></div>}</section>}
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0b2d54]"/><p className="text-sm leading-6 text-slate-600">Clinician-recorded vaccinations remain part of your clinical record. Patient actions are limited to records without clinician administration details.</p></div>
    </div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-[#0b2d54]">{editing ? "Edit" : "Add"} immunisation</h2><p className="mt-1 text-xs text-slate-500">Choose the vaccine from Sympto's reference list.</p></div><button onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"><X className="h-5 w-5"/></button></div><div className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Vaccine</span><select value={draft.immunizationId} onChange={(e) => setDraft((v: any) => ({ ...v, immunizationId: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">Select vaccine</option>{catalog.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Date given</span><input type="date" value={draft.administeredAt} onChange={(e) => setDraft((v: any) => ({ ...v, administeredAt: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Dose number</span><input type="number" min="1" value={draft.doseNumber} onChange={(e) => setDraft((v: any) => ({ ...v, doseNumber: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Batch number</span><input value={draft.batchNumber} onChange={(e) => setDraft((v: any) => ({ ...v, batchNumber: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Manufacturer</span><input value={draft.manufacturer} onChange={(e) => setDraft((v: any) => ({ ...v, manufacturer: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Next due date</span><input type="date" value={draft.nextDueDate} onChange={(e) => setDraft((v: any) => ({ ...v, nextDueDate: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label></div><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Notes</span><textarea value={draft.notes} onChange={(e) => setDraft((v: any) => ({ ...v, notes: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label></div><div className="mt-6 flex justify-end gap-3"><button onClick={() => setOpen(false)} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button onClick={save} disabled={saving || !draft.immunizationId} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{saving ? "Saving…" : "Save"}</button></div></div></div>}
  </main></ProtectedRoute>;
}
