"use client";

import Link from "next/link";
import { AlertTriangle, Check, ChevronDown, CircleSlash2, Info, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useDashboard } from "@/hooks/use-dashboard";

interface MedicationAdherenceActionsProps {
  medicationId: string;
  medicationName: string;
  adherencePercentage?: number | null;
}

interface ClinicalSymptom {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  bodySystem?: string | null;
  evidenceLevel?: string | null;
  source?: string | null;
  notes?: string | null;
}

interface ClinicalReference {
  medication: { id: string; name: string; genericName?: string | null; category?: string | null };
  sideEffects: ClinicalSymptom[];
  relievesSymptoms: ClinicalSymptom[];
  mayMaskSymptoms: ClinicalSymptom[];
  counts: { sideEffects: number; relievesSymptoms: number; mayMaskSymptoms: number };
}

function getErrorMessage(error: unknown) {
  const responseMessage = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(" ");
  if (responseMessage) return responseMessage;
  return "We could not update medication adherence. Please try again.";
}

function ClinicalList({ items }: { items: ClinicalSymptom[] }) {
  if (!items.length) return <p className="text-xs text-slate-500">No medication-specific reference entries are currently recorded.</p>;
  return <div className="flex flex-wrap gap-2">{items.map((item) => <span key={item.id} title={item.description || item.name} className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#0b2d54]">{item.name}</span>)}</div>;
}

export function MedicationAdherenceActions({ medicationId, medicationName, adherencePercentage }: MedicationAdherenceActionsProps) {
  const { data: dashboard } = useDashboard();
  const [saving, setSaving] = useState<"TAKEN" | "SKIPPED" | null>(null);
  const [adherence, setAdherence] = useState(adherencePercentage ?? null);
  const [clinicalOpen, setClinicalOpen] = useState(false);
  const [clinical, setClinical] = useState<ClinicalReference | null>(null);
  const [clinicalLoading, setClinicalLoading] = useState(false);
  const [clinicalError, setClinicalError] = useState(false);
  const [medicationGoal, setMedicationGoal] = useState<{ id: string } | null>(null);
  const [goalLoading, setGoalLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const patientId = dashboard?.patient?.id;

    async function loadMedicationGoal() {
      if (!patientId) {
        if (!cancelled) setGoalLoading(false);
        return;
      }

      try {
        setGoalLoading(true);
        const response = await api.get("/health-goals", {
          params: { patientId, page: 1, limit: 100 },
        });
        const payload = response.data?.data ?? response.data;
        const goals = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
        const targetId = String(medicationId);
        const goal = goals.find((item: any) => {
          const category = String(item?.category ?? "").toUpperCase();
          const status = String(item?.status ?? "").toUpperCase();
          const linkedPatientMedicationId = String(item?.patientMedicationId ?? "");
          return category === "MEDICATION" && status !== "ARCHIVED" && linkedPatientMedicationId === targetId;
        });

        if (!cancelled) setMedicationGoal(goal?.id ? { id: String(goal.id) } : null);
      } catch {
        if (!cancelled) setMedicationGoal(null);
      } finally {
        if (!cancelled) setGoalLoading(false);
      }
    }

    void loadMedicationGoal();
    return () => { cancelled = true; };
  }, [dashboard?.patient?.id, medicationId]);

  useEffect(() => {
    let cancelled = false;
    if (!clinicalOpen || clinical || clinicalLoading) return () => { cancelled = true; };

    async function loadClinicalReference() {
      try {
        setClinicalLoading(true);
        setClinicalError(false);
        const response = await api.get(`/patient-medications/${medicationId}/clinical-reference`);
        if (!cancelled) setClinical(response.data?.data ?? response.data ?? null);
      } catch {
        if (!cancelled) setClinicalError(true);
      } finally {
        if (!cancelled) setClinicalLoading(false);
      }
    }

    void loadClinicalReference();
    return () => { cancelled = true; };
  }, [clinicalOpen, clinical, clinicalLoading, medicationId]);

  async function record(action: "TAKEN" | "SKIPPED") {
    if (saving) return;
    setSaving(action);
    try {
      const response = await api.post(`/patient-medications/${medicationId}/adherence`, {
        action,
        scheduledFor: new Date().toISOString(),
      });
      const next = response.data?.adherencePercentage;
      if (typeof next === "number") setAdherence(next);
      toast.success(action === "TAKEN" ? "Medication marked taken" : "Medication marked skipped", { description: medicationName });
    } catch (error) {
      toast.error("Medication update failed", { description: getErrorMessage(error) });
    } finally {
      setSaving(null);
    }
  }

  const goalAction = goalLoading ? null : medicationGoal ? (
    <Link
      href={`/today?medicationGoalId=${encodeURIComponent(medicationGoal.id)}#medication-adherence-card-${encodeURIComponent(medicationId)}`}
      className="inline-flex items-center gap-1.5 rounded-xl border border-[#24c1c4]/30 bg-white px-3 py-2 text-xs font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/5"
    >
      View Goal
    </Link>
  ) : (
    <Link
      href={`/health-goals?open=medication&patientMedicationId=${encodeURIComponent(medicationId)}&name=${encodeURIComponent(medicationName)}`}
      className="inline-flex items-center gap-1.5 rounded-xl border border-[#24c1c4]/30 bg-white px-3 py-2 text-xs font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/5"
    >
      Set medication goal
    </Link>
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Adherence</p><p className="mt-1 text-sm font-bold text-[#0b2d54]">{adherence == null ? "Not recorded yet" : `${Math.round(adherence)}% overall`}</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={Boolean(saving)} onClick={() => record("TAKEN")} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />{saving === "TAKEN" ? "Saving…" : "Taken"}</button>
            <button type="button" disabled={Boolean(saving)} onClick={() => record("SKIPPED")} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><CircleSlash2 className="h-3.5 w-3.5" />{saving === "SKIPPED" ? "Saving…" : "Skipped"}</button>
            {goalAction}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#24c1c4]/20 bg-white">
        <button type="button" onClick={() => setClinicalOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#24c1c4]/5" aria-expanded={clinicalOpen}>
          <span className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#24c1c4]/10 text-[#0b2d54]"><Sparkles className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-[#0b2d54]">Medication information</span><span className="mt-0.5 block text-[11px] text-slate-500">Clinical reference linked to this medicine</span></span></span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${clinicalOpen ? "rotate-180" : ""}`} />
        </button>
        {clinicalOpen && <div className="border-t border-slate-100 px-4 py-4">
          {clinicalLoading && <p className="text-xs text-slate-500">Loading medication information…</p>}
          {clinicalError && !clinicalLoading && <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>Medication-specific clinical information could not be loaded right now.</span></div>}
          {clinical && !clinicalLoading && <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#24c1c4]" /><span className="text-xs font-semibold text-[#0b2d54]">{clinical.medication.genericName || clinical.medication.name}</span>{clinical.medication.category && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">{clinical.medication.category}</span>}</div>
            <section><div className="mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><h4 className="text-xs font-bold uppercase tracking-[0.1em] text-[#0b2d54]">Possible side effects</h4><span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{clinical.counts.sideEffects}</span></div><ClinicalList items={clinical.sideEffects} /></section>
            <section><div className="mb-2 flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /><h4 className="text-xs font-bold uppercase tracking-[0.1em] text-[#0b2d54]">Symptoms it may relieve</h4><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{clinical.counts.relievesSymptoms}</span></div><ClinicalList items={clinical.relievesSymptoms} /></section>
            {clinical.mayMaskSymptoms.length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-3"><div className="mb-2 flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><h4 className="text-xs font-bold uppercase tracking-[0.1em] text-[#0b2d54]">Symptoms it may make less noticeable</h4><p className="mt-1 text-[11px] leading-4 text-slate-600">A symptom becoming less noticeable does not necessarily mean its underlying cause has gone away.</p></div></div><ClinicalList items={clinical.mayMaskSymptoms} /></section>}
            <div className="flex items-start gap-2 border-t border-slate-100 pt-3 text-[10px] leading-4 text-slate-400"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>This is reference information linked to your medication. It does not diagnose a condition or replace advice from your doctor or pharmacist.</span></div>
          </div>}
        </div>}
      </div>
    </div>
  );
}
