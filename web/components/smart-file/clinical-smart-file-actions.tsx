"use client";

import { useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Check, Plus, Save, Search, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";

type Action = string;

type Props = {
  consentId: string;
  file: any;
  onSaved: () => Promise<void> | void;
};

const ACTIONS: Array<{ value: Action; label: string; group: string }> = [
  { value: "ENCOUNTER", label: "Clinical encounter", group: "Consultation" },
  { value: "CLINICAL_NOTE", label: "Clinical note", group: "Consultation" },
  { value: "DIAGNOSIS", label: "Diagnosis", group: "Clinical record" },
  { value: "CONDITION", label: "Condition", group: "Clinical record" },
  { value: "ALLERGY", label: "Allergy", group: "Clinical record" },
  { value: "IMMUNIZATION", label: "Immunisation", group: "Clinical record" },
  { value: "PROCEDURE", label: "Procedure", group: "Clinical record" },
  { value: "VITAL", label: "Clinical vital", group: "Clinical record" },
  { value: "SYMPTOM_EPISODE", label: "Symptom episode", group: "Symptoms" },
  { value: "SYMPTOM_LOG", label: "Symptom log", group: "Symptoms" },
  { value: "SYMPTOM_ITEM", label: "Symptom detail", group: "Symptoms" },
  { value: "PRESCRIPTION", label: "Prescription", group: "Medication" },
  { value: "PRESCRIPTION_ITEM", label: "Prescription item", group: "Medication" },
  { value: "PATIENT_MEDICATION", label: "Patient medication record", group: "Medication" },
  { value: "CARE_PLAN", label: "Care plan", group: "Care planning" },
  { value: "CARE_PLAN_GOAL", label: "Care plan goal", group: "Care planning" },
  { value: "CARE_PLAN_TASK", label: "Care plan task", group: "Care planning" },
  { value: "CARE_PLAN_NOTE", label: "Care plan note", group: "Care planning" },
  { value: "REFERRAL", label: "Referral", group: "Care coordination" },
  { value: "REFERRAL_NOTE", label: "Referral note", group: "Care coordination" },
  { value: "LAB_ORDER", label: "Laboratory order", group: "Tests" },
  { value: "IMAGING_ORDER", label: "Imaging order", group: "Tests" },
  { value: "IMAGING_REPORT", label: "Imaging report", group: "Tests" },
  { value: "HEALTH_PASSPORT", label: "Health Passport", group: "Patient record" },
  { value: "MEDICAL_RECORD", label: "Medical record", group: "Patient record" },
  { value: "HEALTH_JOURNAL", label: "Clinical Health Journal entry", group: "Patient record" },
];

const REF_TYPES: Record<string, string> = {
  DIAGNOSIS: "diagnoses",
  CONDITION: "conditions",
  ALLERGY: "allergies",
  IMMUNIZATION: "immunisations",
  PROCEDURE: "procedures",
  VITAL: "vitals",
  SYMPTOM_ITEM: "symptoms",
  PRESCRIPTION: "medications",
  PATIENT_MEDICATION: "medications",
  REFERRAL: "practitioners",
  LAB_ORDER: "lab-tests",
  IMAGING_ORDER: "imaging-procedures",
};

const GROUPS = ["Consultation", "Clinical record", "Symptoms", "Medication", "Care planning", "Care coordination", "Tests", "Patient record"];

function text(value: unknown, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}
function asDateInput(value: unknown) {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">{label}</span>{children}{hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}</label>;
}
function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-[#0b2d54] outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10 ${className}`} />;
}
function Area({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-[#0b2d54] outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10 ${className}`} />;
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-[#0b2d54] outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />;
}

export default function ClinicalSmartFileActions({ consentId, file, onSaved }: Props) {
  const [action, setAction] = useState<Action>("ENCOUNTER");
  const [mode, setMode] = useState<"CREATE" | "UPDATE">("CREATE");
  const [existingId, setExistingId] = useState("");
  const [data, setData] = useState<Record<string, any>>({});
  const [query, setQuery] = useState("");
  const [references, setReferences] = useState<any[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const set = (key: string, value: any) => setData((current) => ({ ...current, [key]: value }));

  const currentAction = ACTIONS.find((item) => item.value === action) ?? ACTIONS[0];
  const existingOptions = useMemo(() => {
    switch (action) {
      case "ENCOUNTER": return (file?.encounters ?? []).map((x: any) => ({ id: x.id, label: `${x.encounterType?.name || "Encounter"} · ${new Date(x.startedAt).toLocaleDateString("en-ZA")}` }));
      case "CLINICAL_NOTE": return (file?.clinicalDocuments ?? []).filter((x: any) => x.note).map((x: any) => ({ id: x.id, label: text(x.title || "Clinical note") }));
      case "DIAGNOSIS": return (file?.diagnoses ?? []).map((x: any) => ({ id: x.id, label: text(x.diagnosis?.name || x.name) }));
      case "CONDITION": return (file?.conditions ?? []).map((x: any) => ({ id: x.id, label: text(x.condition?.name || x.name) }));
      case "ALLERGY": return (file?.allergies ?? []).map((x: any) => ({ id: x.id, label: text(x.allergy?.name || x.name) }));
      case "IMMUNIZATION": return (file?.immunisations ?? []).map((x: any) => ({ id: x.id, label: text(x.immunization?.name || x.name) }));
      case "PROCEDURE": return (file?.procedures ?? []).map((x: any) => ({ id: x.id, label: text(x.procedure?.name || x.name) }));
      case "VITAL": return (file?.vitals ?? []).map((x: any) => ({ id: x.id, label: `${x.vitalType?.name || "Vital"} · ${text(x.value)} ${text(x.vitalType?.unit)}` }));
      case "SYMPTOM_EPISODE": return (file?.episodes ?? []).map((x: any) => ({ id: x.id, label: text(x.title, "Symptom episode") }));
      case "SYMPTOM_LOG": return (file?.symptoms ?? []).map((x: any) => ({ id: x.id, label: text(x.title, "Symptom log") }));
      case "SYMPTOM_ITEM": return (file?.symptoms ?? []).flatMap((log: any) => (log.symptoms ?? []).map((x: any) => ({ id: x.id, label: text(x.symptom?.name, "Symptom detail") })));
      case "PRESCRIPTION": return (file?.prescriptions ?? []).map((x: any) => ({ id: x.id, label: `${new Date(x.issuedAt).toLocaleDateString("en-ZA")} · ${(x.items ?? []).map((i: any) => i.medication?.name).filter(Boolean).join(", ")}` }));
      case "PRESCRIPTION_ITEM": return (file?.prescriptions ?? []).flatMap((p: any) => (p.items ?? []).map((x: any) => ({ id: x.id, label: text(x.medication?.name, "Medication") })));
      case "PATIENT_MEDICATION": return (file?.medications ?? []).map((x: any) => ({ id: x.id, label: text(x.medication?.name || x.name, "Medication") }));
      case "CARE_PLAN": return (file?.carePlans ?? []).map((x: any) => ({ id: x.id, label: text(x.title, "Care plan") }));
      case "CARE_PLAN_GOAL": return (file?.carePlans ?? []).flatMap((p: any) => (p.goals ?? []).map((x: any) => ({ id: x.id, label: `${text(p.title, "Care plan")} · ${text(x.title, "Goal")}` })));
      case "CARE_PLAN_TASK": return (file?.carePlans ?? []).flatMap((p: any) => (p.tasks ?? []).map((x: any) => ({ id: x.id, label: `${text(p.title, "Care plan")} · ${text(x.title, "Task")}` })));
      case "CARE_PLAN_NOTE": return (file?.carePlans ?? []).flatMap((p: any) => (p.notes ?? []).map((x: any) => ({ id: x.id, label: `${text(p.title, "Care plan")} · Note` })));
      case "REFERRAL": return (file?.referrals ?? []).map((x: any) => ({ id: x.id, label: `${text(x.specialty, "Referral")} · ${text(x.reason)}` }));
      case "REFERRAL_NOTE": return (file?.referrals ?? []).flatMap((p: any) => (p.notes ?? []).map((x: any) => ({ id: x.id, label: "Referral note" })));
      case "LAB_ORDER": return (file?.labOrders ?? []).map((x: any) => ({ id: x.id, label: `${text(x.orderNumber, "Lab order")} · ${(x.items ?? []).map((i: any) => i.test?.name).filter(Boolean).join(", ")}` }));
      case "IMAGING_ORDER": return (file?.imagingOrders ?? []).map((x: any) => ({ id: x.id, label: `${text(x.orderNumber, "Imaging order")} · ${(x.items ?? []).map((i: any) => i.procedure?.name).filter(Boolean).join(", ")}` }));
      case "IMAGING_REPORT": return (file?.imaging ?? []).flatMap((s: any) => (s.reports ?? []).map((r: any) => ({ id: r.id, label: `${text(s.accessionNumber, "Imaging study")} · Report` })));
      case "HEALTH_JOURNAL": return (file?.healthJournalEntries ?? []).map((x: any) => ({ id: x.id, label: text(x.title, "Health Journal entry") }));
      default: return [];
    }
  }, [action, file]);

  useEffect(() => {
    setMode("CREATE");
    setExistingId("");
    setData({});
    setSelectedRefs([]);
    setReferences([]);
    setQuery("");
    setMessage("");
  }, [action]);

  useEffect(() => {
    const type = REF_TYPES[action];
    const q = query.trim();
    if (!type || q.length < 2) {
      setReferences([]);
      return;
    }
    let alive = true;
    api.get(`/smart-file/clinical/${consentId}/references`, { params: { type, search: q } })
      .then((response) => { if (alive) setReferences(response.data?.data ?? response.data ?? []); })
      .catch(() => { if (alive) setReferences([]); });
    return () => { alive = false; };
  }, [action, consentId, query]);

  useEffect(() => {
    if (mode !== "UPDATE" || !existingId) return;
    const lists: any[] = [];
    switch (action) {
      case "DIAGNOSIS": lists.push(...(file?.diagnoses ?? [])); break;
      case "PROCEDURE": lists.push(...(file?.procedures ?? [])); break;
      case "CONDITION": lists.push(...(file?.conditions ?? [])); break;
      case "ALLERGY": lists.push(...(file?.allergies ?? [])); break;
      case "IMMUNIZATION": lists.push(...(file?.immunisations ?? [])); break;
      case "PRESCRIPTION": lists.push(...(file?.prescriptions ?? [])); break;
      case "PATIENT_MEDICATION": lists.push(...(file?.medications ?? [])); break;
      case "CARE_PLAN": lists.push(...(file?.carePlans ?? [])); break;
      case "CARE_PLAN_GOAL": lists.push(...(file?.carePlans ?? []).flatMap((p: any) => p.goals ?? [])); break;
      case "CARE_PLAN_TASK": lists.push(...(file?.carePlans ?? []).flatMap((p: any) => p.tasks ?? [])); break;
      case "CARE_PLAN_NOTE": lists.push(...(file?.carePlans ?? []).flatMap((p: any) => p.notes ?? [])); break;
      case "REFERRAL": lists.push(...(file?.referrals ?? [])); break;
      case "REFERRAL_NOTE": lists.push(...(file?.referrals ?? []).flatMap((p: any) => p.notes ?? [])); break;
      case "LAB_ORDER": lists.push(...(file?.labOrders ?? [])); break;
      case "IMAGING_ORDER": lists.push(...(file?.imagingOrders ?? [])); break;
      case "IMAGING_REPORT": lists.push(...(file?.imaging ?? []).flatMap((s: any) => s.reports ?? [])); break;
      case "HEALTH_JOURNAL": lists.push(...(file?.healthJournalEntries ?? [])); break;
      case "VITAL": lists.push(...(file?.vitals ?? [])); break;
      case "ENCOUNTER": lists.push(...(file?.encounters ?? [])); break;
      case "SYMPTOM_EPISODE": lists.push(...(file?.episodes ?? [])); break;
      case "SYMPTOM_LOG": lists.push(...(file?.symptoms ?? [])); break;
      case "SYMPTOM_ITEM": lists.push(...(file?.symptoms ?? []).flatMap((x: any) => x.symptoms ?? [])); break;
      default: break;
    }
    const existing = lists.find((x) => x.id === existingId);
    if (!existing) return;

    if (action === "DIAGNOSIS") setData({ diagnosisId: existing.diagnosis?.id || existing.diagnosisId, status: existing.status, severity: existing.severity, stage: existing.stage, primaryDiagnosis: existing.primaryDiagnosis, confirmed: existing.confirmed, diagnosedAt: asDateInput(existing.diagnosedAt), resolvedAt: asDateInput(existing.resolvedAt), treatmentPlan: existing.treatmentPlan, outcome: existing.outcome, notes: existing.notes });
    if (action === "PROCEDURE") setData({ procedureId: existing.procedure?.id || existing.procedureId, status: existing.status, performedAt: asDateInput(existing.performedAt), outcome: existing.outcome, performer: existing.performer, facility: existing.facility, complications: existing.complications, followUpRequired: existing.followUpRequired, followUpDate: asDateInput(existing.followUpDate), notes: existing.notes });
    if (action === "CONDITION") setData({ conditionId: existing.condition?.id || existing.conditionId, status: existing.status, chronic: existing.chronic, primaryCondition: existing.primaryCondition, severity: existing.severity, stage: existing.stage, diagnosedAt: asDateInput(existing.diagnosedAt), resolvedAt: asDateInput(existing.resolvedAt), treatmentPlan: existing.treatmentPlan, outcome: existing.outcome, notes: existing.notes });
    if (action === "ALLERGY") setData({ allergyId: existing.allergy?.id || existing.allergyId, status: existing.status, severity: existing.severity, reaction: existing.reaction, reactionNotes: existing.reactionNotes, onsetDate: asDateInput(existing.onsetDate), lastReaction: asDateInput(existing.lastReaction), verified: existing.verified, notes: existing.notes });
    if (action === "IMMUNIZATION") setData({ immunizationId: existing.immunization?.id || existing.immunizationId, administeredAt: asDateInput(existing.administeredAt), doseNumber: existing.doseNumber, batchNumber: existing.batchNumber, manufacturer: existing.manufacturer, administeredBy: existing.administeredBy, facility: existing.facility, route: existing.route, site: existing.site, adverseReaction: existing.adverseReaction, adverseReactionNotes: existing.adverseReactionNotes, nextDueDate: asDateInput(existing.nextDueDate), status: existing.status, notes: existing.notes });
    if (action === "PRESCRIPTION") setData({ status: existing.status, expiresAt: asDateInput(existing.expiresAt), notes: existing.notes });
    if (action === "PRESCRIPTION_ITEM") setData({ medicationId: existing.medication?.id || existing.medicationId, dosage: existing.dosage, frequency: existing.frequency, route: existing.route, durationDays: existing.durationDays, quantity: existing.quantity, refills: existing.refills, instructions: existing.instructions });
    if (action === "PATIENT_MEDICATION") setData({ medicationId: existing.medication?.id || existing.medicationId, dosage: existing.dosage, frequency: existing.frequency, route: existing.route, indication: existing.indication, instructions: existing.instructions, prescribedBy: existing.prescribedBy, startedAt: asDateInput(existing.startedAt), endedAt: asDateInput(existing.endedAt), ongoing: existing.ongoing, sideEffects: existing.sideEffects, effectiveness: existing.effectiveness, status: existing.status, notes: existing.notes });
    if (action === "CARE_PLAN") setData({ title: existing.title, description: existing.description, status: existing.status, startDate: asDateInput(existing.startDate), endDate: asDateInput(existing.endDate), encounterId: existing.encounterId });
    if (action === "CARE_PLAN_GOAL") setData({ carePlanId: existing.carePlanId, title: existing.title, description: existing.description, targetValue: existing.targetValue, currentValue: existing.currentValue, dueDate: asDateInput(existing.dueDate), status: existing.status });
    if (action === "CARE_PLAN_TASK") setData({ carePlanId: existing.carePlanId, assignedToId: existing.assignedToId, type: existing.type, title: existing.title, description: existing.description, dueDate: asDateInput(existing.dueDate), completedAt: asDateInput(existing.completedAt), status: existing.status });
    if (action === "CARE_PLAN_NOTE") setData({ carePlanId: existing.carePlanId, note: existing.note });
    if (action === "REFERRAL") setData({ receivingPractitionerId: existing.receivingPractitionerId, referringPracticeId: existing.referringPracticeId, receivingPracticeId: existing.receivingPracticeId, encounterId: existing.encounterId, type: existing.type, priority: existing.priority, status: existing.status, specialty: existing.specialty, reason: existing.reason, clinicalSummary: existing.clinicalSummary, requestedDate: asDateInput(existing.requestedDate) });
    if (action === "REFERRAL_NOTE") setData({ referralId: existing.referralId, note: existing.note });
    if (action === "LAB_ORDER") { setData({ laboratoryId: existing.laboratoryId, encounterId: existing.encounterId, status: existing.status, clinicalNotes: existing.clinicalNotes, orderedAt: asDateInput(existing.orderedAt) }); setSelectedRefs((existing.items ?? []).map((x: any) => x.test?.id).filter(Boolean)); }
    if (action === "IMAGING_ORDER") { setData({ imagingCenterId: existing.imagingCenterId, encounterId: existing.encounterId, priority: existing.priority, status: existing.status, clinicalIndication: existing.clinicalIndication }); setSelectedRefs((existing.items ?? []).map((x: any) => x.procedure?.id).filter(Boolean)); }
    if (action === "IMAGING_REPORT") setData({ studyId: existing.studyId, findings: existing.findings, impression: existing.impression, recommendations: existing.recommendations });
    if (action === "HEALTH_JOURNAL") setData({ title: existing.title, journal: existing.journal, mood: existing.mood, sleepQuality: existing.sleepQuality, sleepHours: existing.sleepHours, energyLevel: existing.energyLevel, stressLevel: existing.stressLevel, exerciseMinutes: existing.exerciseMinutes, waterIntakeMl: existing.waterIntakeMl, weightKg: existing.weightKg, temperature: existing.temperature, bloodPressureSystolic: existing.bloodPressureSystolic, bloodPressureDiastolic: existing.bloodPressureDiastolic, heartRate: existing.heartRate, oxygenSaturation: existing.oxygenSaturation, respiratoryRate: existing.respiratoryRate, notes: existing.notes });
    if (action === "VITAL") setData({ vitalTypeId: existing.vitalType?.id || existing.vitalTypeId, value: existing.value, measuredAt: asDateInput(existing.measuredAt) });
    if (action === "ENCOUNTER") setData({ encounterTypeId: existing.encounterTypeId, startedAt: asDateInput(existing.startedAt), endedAt: asDateInput(existing.endedAt), chiefComplaint: existing.chiefComplaint, assessment: existing.assessment, plan: existing.plan, notes: existing.notes });
    if (action === "SYMPTOM_EPISODE") setData({ title: existing.title, description: existing.description, type: existing.type, status: existing.status, priority: existing.priority, startedAt: asDateInput(existing.startedAt), endedAt: asDateInput(existing.endedAt), resolvedAt: asDateInput(existing.resolvedAt) });
    if (action === "SYMPTOM_LOG") setData({ clinicalEpisodeId: existing.clinicalEpisodeId, title: existing.title, notes: existing.notes, status: existing.status, overallSeverity: existing.overallSeverity, progression: existing.progression, startedAt: asDateInput(existing.startedAt), resolvedAt: asDateInput(existing.resolvedAt) });
    if (action === "SYMPTOM_ITEM") setData({ symptomLogId: existing.symptomLogId, symptomId: existing.symptom?.id || existing.symptomId, severity: existing.severity, progression: existing.progression, frequency: existing.frequency, painCharacter: existing.painCharacter, painScore: existing.painScore, durationMinutes: existing.durationMinutes, onsetAt: asDateInput(existing.onsetAt), resolvedAt: asDateInput(existing.resolvedAt), intermittent: existing.intermittent, recurring: existing.recurring, suspectedTrigger: existing.suspectedTrigger, aggravatingFactors: existing.aggravatingFactors, relievingFactors: existing.relievingFactors, notes: existing.notes });
    if (action === "HEALTH_PASSPORT") {
      const passport = file?.healthPassport;
      setData({ bloodType: passport?.bloodType, rhesusFactor: passport?.rhesusFactor, organDonor: passport?.organDonor, emergencyNotes: passport?.emergencyNotes });
    }
    if (action === "MEDICAL_RECORD") setData({ ...file?.medicalRecord });
    if (action === "CLINICAL_NOTE") setData({ encounterId: existing.encounterId, title: existing.title, note: existing.note });
  }, [action, existingId, mode, file]);

  const toggleRef = (id: string) => {
    setSelectedRefs((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = { ...data };
      if (action === "LAB_ORDER") payload.testIds = selectedRefs;
      if (action === "IMAGING_ORDER") payload.procedureIds = selectedRefs;
      await api.post(`/smart-file/clinical/${consentId}/write`, {
        section: action,
        action: mode,
        ...(mode === "UPDATE" ? { id: existingId } : {}),
        data: payload,
      });
      setMessage("Saved. The change is now part of the patient’s Sympto record.");
      await onSaved();
      setData({});
      setSelectedRefs([]);
      setExistingId("");
      setMode("CREATE");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setMessage(Array.isArray(msg) ? msg.join(", ") : msg || "The clinical update could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const referenceRequired = Boolean(REF_TYPES[action]);
  const groupedOptions = GROUPS.map((group) => ({ group, options: ACTIONS.filter((x) => x.group === group) })).filter((x) => x.options.length);

  return <section className="mt-5 overflow-hidden rounded-3xl border border-[#24c1c4]/25 bg-white shadow-sm">
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Stethoscope className="h-5 w-5" /></div>
        <div>
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-[#0b2d54]">Clinical workspace</h2><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">Write access</span></div>
          <p className="mt-1 text-sm leading-6 text-slate-500">Document the care you provide. Changes are written to the patient’s existing clinical records and become visible in their Sympto account.</p>
        </div>
      </div>
    </div>

    <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[260px,1fr]">
      <div className="space-y-4">
        <Field label="Clinical action">
          <Select value={action} onChange={(e) => setAction(e.target.value)}>
            {groupedOptions.map(({ group, options }) => <optgroup key={group} label={group}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button type="button" onClick={() => { setMode("CREATE"); setExistingId(""); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === "CREATE" ? "bg-white text-[#0b2d54] shadow-sm" : "text-slate-500"}`}><Plus className="mr-1 inline h-3.5 w-3.5"/>Add</button>
          <button type="button" onClick={() => setMode("UPDATE")} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === "UPDATE" ? "bg-white text-[#0b2d54] shadow-sm" : "text-slate-500"}`}>Update</button>
        </div>
        {mode === "UPDATE" && <Field label="Record to update"><Select value={existingId} onChange={(e) => setExistingId(e.target.value)}><option value="">Choose a record</option>{existingOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</Select></Field>}
        {message && <div className="rounded-xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 px-3 py-3 text-xs font-semibold text-[#0b2d54]">{message}</div>}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
          <p className="font-bold text-[#0b2d54]">Shared record rule</p>
          <p className="mt-1">This is not a separate Smart File database. A saved change goes directly into the patient’s canonical record.</p>
          <p className="mt-2">Historical clinical data remains attributable and auditable.</p>
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        {referenceRequired && <>
          <Field label={action === "REFERRAL" ? "Find receiving practitioner" : "Find reference record"}>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type at least 2 characters" className="pl-10"/></div>
          </Field>
          {references.length > 0 && <div className="max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white p-1">{references.map((item: any) => {
            const id = String(item.id);
            const label = text(item.name || item.genericName || item.code || item.registrationNumber, "Reference");
            const selected = action === "LAB_ORDER" || action === "IMAGING_ORDER" ? selectedRefs.includes(id) : String(data[
              action === "REFERRAL" ? "receivingPractitionerId" :
              action === "PATIENT_MEDICATION" || action === "PRESCRIPTION" ? "medicationId" :
              action === "SYMPTOM_ITEM" ? "symptomId" :
              action === "DIAGNOSIS" ? "diagnosisId" :
              action === "PROCEDURE" ? "procedureId" :
              action === "CONDITION" ? "conditionId" :
              action === "ALLERGY" ? "allergyId" : "immunizationId"
            ] || "") === id;
            return <button type="button" key={id} onClick={() => {
              if (action === "LAB_ORDER" || action === "IMAGING_ORDER") toggleRef(id);
              else {
                const key = action === "REFERRAL" ? "receivingPractitionerId" : action === "PATIENT_MEDICATION" || action === "PRESCRIPTION" ? "medicationId" : action === "SYMPTOM_ITEM" ? "symptomId" : action === "DIAGNOSIS" ? "diagnosisId" : action === "PROCEDURE" ? "procedureId" : action === "CONDITION" ? "conditionId" : action === "ALLERGY" ? "allergyId" : "immunizationId";
                set(key, id);
                setQuery(label);
                setReferences([]);
              }
            }} className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold ${selected ? "bg-[#24c1c4]/10 text-[#0b2d54]" : "hover:bg-slate-50 text-[#0b2d54]"}`}>{label}{item.genericName ? ` · ${item.genericName}` : ""}{selected ? <Check className="float-right h-4 w-4"/> : null}</button>;
          })}</div>}
          {(action === "LAB_ORDER" || action === "IMAGING_ORDER") && selectedRefs.length > 0 && <p className="text-xs font-semibold text-[#0b2d54]">{selectedRefs.length} reference{selectedRefs.length === 1 ? "" : "s"} selected.</p>}
        </>}

        {action === "ENCOUNTER" && <div className="grid gap-4 md:grid-cols-2"><Field label="Reason for visit"><Input value={text(data.chiefComplaint)} onChange={(e) => set("chiefComplaint", e.target.value)} placeholder="Reason for consultation"/></Field><Field label="Start date"><Input type="date" value={text(data.startedAt)} onChange={(e) => set("startedAt", e.target.value)}/></Field><Field label="Assessment"><Area rows={4} value={text(data.assessment)} onChange={(e) => set("assessment", e.target.value)} placeholder="Clinical assessment"/></Field><Field label="Plan"><Area rows={4} value={text(data.plan)} onChange={(e) => set("plan", e.target.value)} placeholder="Treatment / follow-up plan"/></Field><Field label="Notes"><Area rows={4} value={text(data.notes)} onChange={(e) => set("notes", e.target.value)} placeholder="Additional clinical notes"/></Field><Field label="Clinical note title"><Input value={text(data.clinicalNoteTitle)} onChange={(e) => set("clinicalNoteTitle", e.target.value)} placeholder="Consultation note"/></Field><Field label="Clinical note"><Area rows={4} value={text(data.clinicalNote)} onChange={(e) => set("clinicalNote", e.target.value)} placeholder="Formal clinical note"/></Field></div>}

        {action === "CLINICAL_NOTE" && <div className="grid gap-4"><Field label="Encounter ID"><Select value={text(data.encounterId)} onChange={(e) => set("encounterId", e.target.value)}><option value="">Choose encounter</option>{(file?.encounters ?? []).map((e: any) => <option key={e.id} value={e.id}>{e.encounterType?.name || "Encounter"} · {new Date(e.startedAt).toLocaleDateString("en-ZA")}</option>)}</Select></Field><Field label="Title"><Input value={text(data.title)} onChange={(e) => set("title", e.target.value)} placeholder="Clinical note title"/></Field><Field label="Note"><Area rows={8} value={text(data.note)} onChange={(e) => set("note", e.target.value)} placeholder="Clinical documentation"/></Field></div>}

        {action === "DIAGNOSIS" && <div className="grid gap-4 md:grid-cols-2"><Field label="Diagnosis"><Input readOnly value={text(data.diagnosisId)} placeholder="Select from search above"/></Field><Field label="Status"><Select value={text(data.status, "ACTIVE")} onChange={(e) => set("status", e.target.value)}><option>ACTIVE</option><option>RESOLVED</option><option>REMISSION</option><option>RECURRENT</option></Select></Field><Field label="Severity"><Select value={text(data.severity)} onChange={(e) => set("severity", e.target.value)}><option value="">Not specified</option><option>MILD</option><option>MODERATE</option><option>SEVERE</option><option>CRITICAL</option></Select></Field><Field label="Stage"><Input value={text(data.stage)} onChange={(e) => set("stage", e.target.value)} placeholder="e.g. Stage 2"/></Field><Field label="Diagnosed date"><Input type="date" value={text(data.diagnosedAt)} onChange={(e) => set("diagnosedAt", e.target.value)}/></Field><Field label="Resolved date"><Input type="date" value={text(data.resolvedAt)} onChange={(e) => set("resolvedAt", e.target.value)}/></Field><Field label="Treatment plan"><Area rows={4} value={text(data.treatmentPlan)} onChange={(e) => set("treatmentPlan", e.target.value)}/></Field><Field label="Notes"><Area rows={4} value={text(data.notes)} onChange={(e) => set("notes", e.target.value)}/></Field></div>}

        {action === "PROCEDURE" && <div className="grid gap-4 md:grid-cols-2"><Field label="Procedure"><Input readOnly value={text(data.procedureId)} placeholder="Select from search above"/></Field><Field label="Status"><Select value={text(data.status, "COMPLETED")} onChange={(e) => set("status", e.target.value)}><option>SCHEDULED</option><option>IN_PROGRESS</option><option>COMPLETED</option><option>CANCELLED</option></Select></Field><Field label="Performed date"><Input type="date" value={text(data.performedAt)} onChange={(e) => set("performedAt", e.target.value)}/></Field><Field label="Facility"><Input value={text(data.facility)} onChange={(e) => set("facility", e.target.value)} placeholder="Facility"/></Field><Field label="Outcome"><Area rows={3} value={text(data.outcome)} onChange={(e) => set("outcome", e.target.value)}/></Field><Field label="Complications"><Area rows={3} value={text(data.complications)} onChange={(e) => set("complications", e.target.value)}/></Field><Field label="Follow-up date"><Input type="date" value={text(data.followUpDate)} onChange={(e) => set("followUpDate", e.target.value)}/></Field><Field label="Notes"><Area rows={3} value={text(data.notes)} onChange={(e) => set("notes", e.target.value)}/></Field></div>}

        {action === "VITAL" && <div className="grid gap-4 md:grid-cols-2"><Field label="Vital type"><Input readOnly value={text(data.vitalTypeId)} placeholder="Select from search above"/></Field><Field label="Value"><Input value={text(data.value)} onChange={(e) => set("value", e.target.value)} placeholder="e.g. 120"/></Field><Field label="Measured date"><Input type="date" value={text(data.measuredAt)} onChange={(e) => set("measuredAt", e.target.value)}/></Field></div>}

        {action === "SYMPTOM_EPISODE" && <div className="grid gap-4 md:grid-cols-2"><Field label="Title"><Input value={text(data.title)} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Lower back pain"/></Field><Field label="Type"><Select value={text(data.type, "ACUTE")} onChange={(e) => set("type", e.target.value)}>{["ACUTE","CHRONIC","FOLLOW_UP","EMERGENCY","SURGICAL","MENTAL_HEALTH","TELEMEDICINE","PREVENTIVE","WELLNESS","REHABILITATION","OTHER"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Status"><Select value={text(data.status, "ACTIVE")} onChange={(e) => set("status", e.target.value)}>{["ACTIVE","ONGOING","RESOLVED","CANCELLED","CLOSED"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Priority"><Select value={text(data.priority, "ROUTINE")} onChange={(e) => set("priority", e.target.value)}>{["ROUTINE","LOW","MEDIUM","HIGH","URGENT","CRITICAL"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Started"><Input type="date" value={text(data.startedAt)} onChange={(e) => set("startedAt", e.target.value)}/></Field><Field label="Resolved"><Input type="date" value={text(data.resolvedAt)} onChange={(e) => set("resolvedAt", e.target.value)}/></Field><Field label="Description"><Area rows={4} value={text(data.description)} onChange={(e) => set("description", e.target.value)}/></Field></div>}

        {action === "SYMPTOM_LOG" && <div className="grid gap-4 md:grid-cols-2"><Field label="Clinical episode"><Select value={text(data.clinicalEpisodeId)} onChange={(e) => set("clinicalEpisodeId", e.target.value)}><option value="">Choose episode</option>{(file?.episodes ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.title}</option>)}</Select></Field><Field label="Started"><Input type="date" value={text(data.startedAt)} onChange={(e) => set("startedAt", e.target.value)}/></Field><Field label="Title"><Input value={text(data.title)} onChange={(e) => set("title", e.target.value)} placeholder="Symptom log title"/></Field><Field label="Overall severity"><Select value={text(data.overallSeverity)} onChange={(e) => set("overallSeverity", e.target.value)}><option value="">Not specified</option>{["NONE","MILD","MODERATE","SEVERE","VERY_SEVERE"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Progression"><Select value={text(data.progression)} onChange={(e) => set("progression", e.target.value)}><option value="">Not specified</option>{["IMPROVING","STABLE","WORSENING","FLUCTUATING","RESOLVED"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Notes"><Area rows={5} value={text(data.notes)} onChange={(e) => set("notes", e.target.value)}/></Field></div>}

        {action === "SYMPTOM_ITEM" && <div className="grid gap-4 md:grid-cols-2"><Field label="Symptom"><Input readOnly value={text(data.symptomId)} placeholder="Select symptom from search above"/></Field><Field label="Symptom log"><Select value={text(data.symptomLogId)} onChange={(e) => set("symptomLogId", e.target.value)}><option value="">Choose symptom log</option>{(file?.symptoms ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.title || "Symptom log"}</option>)}</Select></Field><Field label="Severity"><Select value={text(data.severity, "MILD")} onChange={(e) => set("severity", e.target.value)}>{["MILD","MODERATE","SEVERE","VERY_SEVERE","NONE"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Pain score"><Input type="number" min="0" max="10" value={text(data.painScore)} onChange={(e) => set("painScore", e.target.value)}/></Field><Field label="Frequency"><Select value={text(data.frequency)} onChange={(e) => set("frequency", e.target.value)}><option value="">Not specified</option>{["CONSTANT","INTERMITTENT","OCCASIONAL","RARE","UNKNOWN"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Location / detail"><Input value={text(data.notes)} onChange={(e) => set("notes", e.target.value)} placeholder="Add location or clinical detail"/></Field><Field label="Triggers"><Area rows={3} value={text(data.suspectedTrigger)} onChange={(e) => set("suspectedTrigger", e.target.value)}/></Field><Field label="Relieving factors"><Area rows={3} value={text(data.relievingFactors)} onChange={(e) => set("relievingFactors", e.target.value)}/></Field></div>}

        {action === "PRESCRIPTION" && <div className="grid gap-4 md:grid-cols-2"><Field label="Medication"><Input readOnly value={text(data.medicationId)} placeholder="Select medication from search above"/></Field><Field label="Dose"><Input value={text(data.dosage)} onChange={(e) => set("dosage", e.target.value)} placeholder="e.g. 200 mg"/></Field><Field label="Frequency"><Select value={text(data.frequency, "ONCE_DAILY")} onChange={(e) => set("frequency", e.target.value)}>{["ONCE_DAILY","TWICE_DAILY","THREE_TIMES_DAILY","FOUR_TIMES_DAILY","EVERY_4_HOURS","EVERY_6_HOURS","EVERY_8_HOURS","EVERY_12_HOURS","WEEKLY","MONTHLY","AS_NEEDED"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Route"><Select value={text(data.route, "ORAL")} onChange={(e) => set("route", e.target.value)}>{["ORAL","TOPICAL","INTRAVENOUS","INTRAMUSCULAR","SUBCUTANEOUS","INHALATION","RECTAL","NASAL","OPHTHALMIC","OTIC","OTHER"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Duration (days)"><Input type="number" min="1" value={text(data.durationDays)} onChange={(e) => set("durationDays", e.target.value)}/></Field><Field label="Quantity"><Input type="number" value={text(data.quantity)} onChange={(e) => set("quantity", e.target.value)}/></Field><Field label="Refills"><Input type="number" min="0" value={text(data.refills)} onChange={(e) => set("refills", e.target.value)}/></Field><Field label="Expiry"><Input type="date" value={text(data.expiresAt)} onChange={(e) => set("expiresAt", e.target.value)}/></Field><Field label="Instructions"><Area rows={3} value={text(data.instructions)} onChange={(e) => set("instructions", e.target.value)} placeholder="Directions for the patient"/></Field><Field label="Prescription notes"><Area rows={3} value={text(data.notes)} onChange={(e) => set("notes", e.target.value)}/></Field></div>}

        {action === "PRESCRIPTION_ITEM" && <div className="grid gap-4 md:grid-cols-2"><Field label="Medication"><Input readOnly value={text(data.medicationId)}/></Field><Field label="Dose"><Input value={text(data.dosage)} onChange={(e) => set("dosage", e.target.value)}/></Field><Field label="Frequency"><Input value={text(data.frequency)} onChange={(e) => set("frequency", e.target.value)}/></Field><Field label="Route"><Input value={text(data.route)} onChange={(e) => set("route", e.target.value)}/></Field><Field label="Duration (days)"><Input type="number" value={text(data.durationDays)} onChange={(e) => set("durationDays", e.target.value)}/></Field><Field label="Quantity"><Input type="number" value={text(data.quantity)} onChange={(e) => set("quantity", e.target.value)}/></Field><Field label="Refills"><Input type="number" min="0" value={text(data.refills)} onChange={(e) => set("refills", e.target.value)}/></Field><Field label="Instructions"><Area rows={3} value={text(data.instructions)} onChange={(e) => set("instructions", e.target.value)}/></Field></div>}

        {action === "PATIENT_MEDICATION" && <div className="grid gap-4 md:grid-cols-2"><Field label="Medication"><Input readOnly value={text(data.medicationId)} placeholder="Select medication from search above"/></Field><Field label="Dose"><Input value={text(data.dosage)} onChange={(e) => set("dosage", e.target.value)}/></Field><Field label="Frequency"><Input value={text(data.frequency)} onChange={(e) => set("frequency", e.target.value)}/></Field><Field label="Route"><Input value={text(data.route)} onChange={(e) => set("route", e.target.value)}/></Field><Field label="Indication"><Input value={text(data.indication)} onChange={(e) => set("indication", e.target.value)}/></Field><Field label="Status"><Select value={text(data.status, "ACTIVE")} onChange={(e) => set("status", e.target.value)}>{["ACTIVE","PAUSED","COMPLETED","DISCONTINUED"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Started"><Input type="date" value={text(data.startedAt)} onChange={(e) => set("startedAt", e.target.value)}/></Field><Field label="Ended"><Input type="date" value={text(data.endedAt)} onChange={(e) => set("endedAt", e.target.value)}/></Field><Field label="Instructions"><Area rows={3} value={text(data.instructions)} onChange={(e) => set("instructions", e.target.value)}/></Field><Field label="Clinical notes"><Area rows={3} value={text(data.notes)} onChange={(e) => set("notes", e.target.value)}/></Field></div>}

        {action === "CONDITION" && <div className="grid gap-4 md:grid-cols-2"><Field label="Condition"><Input readOnly value={text(data.conditionId)}/></Field><Field label="Status"><Select value={text(data.status, "ACTIVE")} onChange={(e) => set("status", e.target.value)}>{["ACTIVE","RESOLVED","REMISSION","RECURRENT"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Severity"><Select value={text(data.severity)} onChange={(e) => set("severity", e.target.value)}><option value="">Not specified</option>{["MILD","MODERATE","SEVERE","CRITICAL"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Chronic"><Select value={String(data.chronic ?? false)} onChange={(e) => set("chronic", e.target.value === "true")}><option value="false">No</option><option value="true">Yes</option></Select></Field><Field label="Treatment plan"><Area rows={4} value={text(data.treatmentPlan)} onChange={(e) => set("treatmentPlan", e.target.value)}/></Field><Field label="Notes"><Area rows={4} value={text(data.notes)} onChange={(e) => set("notes", e.target.value)}/></Field></div>}

        {action === "ALLERGY" && <div className="grid gap-4 md:grid-cols-2"><Field label="Allergy"><Input readOnly value={text(data.allergyId)}/></Field><Field label="Severity"><Select value={text(data.severity, "MILD")} onChange={(e) => set("severity", e.target.value)}>{["MILD","MODERATE","SEVERE"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Reaction"><Input value={text(data.reaction)} onChange={(e) => set("reaction", e.target.value)} placeholder="Reaction"/></Field><Field label="Status"><Select value={text(data.status, "ACTIVE")} onChange={(e) => set("status", e.target.value)}>{["ACTIVE","RESOLVED","RECURRENT","INACTIVE"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Verified"><Select value={String(data.verified ?? true)} onChange={(e) => set("verified", e.target.value === "true")}><option value="true">Verified</option><option value="false">Not verified</option></Select></Field><Field label="Notes"><Area rows={4} value={text(data.notes)} onChange={(e) => set("notes", e.target.value)}/></Field></div>}

        {action === "IMMUNIZATION" && <div className="grid gap-4 md:grid-cols-2"><Field label="Immunisation"><Input readOnly value={text(data.immunizationId)}/></Field><Field label="Dose number"><Input type="number" min="1" value={text(data.doseNumber)} onChange={(e) => set("doseNumber", e.target.value)}/></Field><Field label="Administered date"><Input type="date" value={text(data.administeredAt)} onChange={(e) => set("administeredAt", e.target.value)}/></Field><Field label="Next due date"><Input type="date" value={text(data.nextDueDate)} onChange={(e) => set("nextDueDate", e.target.value)}/></Field><Field label="Facility"><Input value={text(data.facility)} onChange={(e) => set("facility", e.target.value)}/></Field><Field label="Administered by"><Input value={text(data.administeredBy)} onChange={(e) => set("administeredBy", e.target.value)}/></Field><Field label="Status"><Select value={text(data.status, "COMPLETED")} onChange={(e) => set("status", e.target.value)}><option>SCHEDULED</option><option>COMPLETED</option><option>CANCELLED</option></Select></Field><Field label="Notes"><Area rows={4} value={text(data.notes)} onChange={(e) => set("notes", e.target.value)}/></Field></div>}

        {action === "CARE_PLAN" && <div className="grid gap-4 md:grid-cols-2"><Field label="Title"><Input value={text(data.title)} onChange={(e) => set("title", e.target.value)} placeholder="Care plan title"/></Field><Field label="Status"><Select value={text(data.status, "ACTIVE")} onChange={(e) => set("status", e.target.value)}>{["DRAFT","ACTIVE","ON_HOLD","COMPLETED","CANCELLED"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Start date"><Input type="date" value={text(data.startDate)} onChange={(e) => set("startDate", e.target.value)}/></Field><Field label="End date"><Input type="date" value={text(data.endDate)} onChange={(e) => set("endDate", e.target.value)}/></Field><Field label="Description"><Area rows={5} value={text(data.description)} onChange={(e) => set("description", e.target.value)} placeholder="Clinical plan"/></Field></div>}

        {(action === "CARE_PLAN_GOAL" || action === "CARE_PLAN_TASK" || action === "CARE_PLAN_NOTE") && <div className="grid gap-4 md:grid-cols-2"><Field label="Care plan"><Select value={text(data.carePlanId)} onChange={(e) => set("carePlanId", e.target.value)}><option value="">Choose care plan</option>{(file?.carePlans ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.title}</option>)}</Select></Field>{action === "CARE_PLAN_GOAL" && <><Field label="Goal title"><Input value={text(data.title)} onChange={(e) => set("title", e.target.value)}/></Field><Field label="Description"><Area rows={3} value={text(data.description)} onChange={(e) => set("description", e.target.value)}/></Field><Field label="Target value"><Input value={text(data.targetValue)} onChange={(e) => set("targetValue", e.target.value)}/></Field><Field label="Current value"><Input value={text(data.currentValue)} onChange={(e) => set("currentValue", e.target.value)}/></Field><Field label="Due date"><Input type="date" value={text(data.dueDate)} onChange={(e) => set("dueDate", e.target.value)}/></Field><Field label="Status"><Select value={text(data.status, "NOT_STARTED")} onChange={(e) => set("status", e.target.value)}>{["NOT_STARTED","IN_PROGRESS","ACHIEVED","CANCELLED"].map((x) => <option key={x}>{x}</option>)}</Select></>}{action === "CARE_PLAN_TASK" && <><Field label="Task title"><Input value={text(data.title)} onChange={(e) => set("title", e.target.value)}/></Field><Field label="Task type"><Input value={text(data.type)} onChange={(e) => set("type", e.target.value)} placeholder="Task type"/></Field><Field label="Description"><Area rows={3} value={text(data.description)} onChange={(e) => set("description", e.target.value)}/></Field><Field label="Due date"><Input type="date" value={text(data.dueDate)} onChange={(e) => set("dueDate", e.target.value)}/></Field><Field label="Status"><Select value={text(data.status, "PENDING")} onChange={(e) => set("status", e.target.value)}>{["PENDING","IN_PROGRESS","COMPLETED","CANCELLED"].map((x) => <option key={x}>{x}</option>)}</Select></Field></>}{action === "CARE_PLAN_NOTE" && <Field label="Note"><Area rows={7} value={text(data.note)} onChange={(e) => set("note", e.target.value)}/></Field>}</div>}

        {(action === "REFERRAL" || action === "REFERRAL_NOTE") && <div className="grid gap-4 md:grid-cols-2">{action === "REFERRAL" ? <><Field label="Specialty"><Input value={text(data.specialty)} onChange={(e) => set("specialty", e.target.value)} placeholder="e.g. Cardiology"/></Field><Field label="Type"><Select value={text(data.type, "EXTERNAL")} onChange={(e) => set("type", e.target.value)}><option>INTERNAL</option><option>EXTERNAL</option></Select></Field><Field label="Priority"><Select value={text(data.priority, "ROUTINE")} onChange={(e) => set("priority", e.target.value)}><option>ROUTINE</option><option>URGENT</option><option>STAT</option></Select></Field><Field label="Status"><Select value={text(data.status, "PENDING")} onChange={(e) => set("status", e.target.value)}>{["DRAFT","PENDING","ACCEPTED","REJECTED","SCHEDULED","IN_PROGRESS","COMPLETED","CANCELLED"].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Reason"><Area rows={4} value={text(data.reason)} onChange={(e) => set("reason", e.target.value)} placeholder="Reason for referral"/></Field><Field label="Clinical summary"><Area rows={4} value={text(data.clinicalSummary)} onChange={(e) => set("clinicalSummary", e.target.value)}/></Field></> : <><Field label="Referral"><Select value={text(data.referralId)} onChange={(e) => set("referralId", e.target.value)}><option value="">Choose referral</option>{(file?.referrals ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.specialty || "Referral"} · {x.reason}</option>)}</Select></Field><Field label="Note"><Area rows={7} value={text(data.note)} onChange={(e) => set("note", e.target.value)}/></Field></>}</div>}

        {(action === "LAB_ORDER" || action === "IMAGING_ORDER") && <div className="grid gap-4 md:grid-cols-2">{action === "LAB_ORDER" ? <Field label="Laboratory"><Input value={text(data.laboratoryId)} onChange={(e) => set("laboratoryId", e.target.value)} placeholder="Laboratory ID or use the lab reference in the search flow"/></Field> : <Field label="Imaging centre"><Input value={text(data.imagingCenterId)} onChange={(e) => set("imagingCenterId", e.target.value)} placeholder="Imaging centre ID"/></Field>}<Field label="Status"><Select value={text(data.status, action === "LAB_ORDER" ? "ORDERED" : "ORDERED")} onChange={(e) => set("status", e.target.value)}>{(action === "LAB_ORDER" ? ["DRAFT","ORDERED","COLLECTED","IN_PROGRESS","COMPLETED","CANCELLED"] : ["ORDERED","SCHEDULED","IN_PROGRESS","COMPLETED","CANCELLED"]).map((x) => <option key={x}>{x}</option>)}</Select></Field>{action === "IMAGING_ORDER" && <Field label="Priority"><Select value={text(data.priority, "ROUTINE")} onChange={(e) => set("priority", e.target.value)}><option>ROUTINE</option><option>URGENT</option><option>STAT</option></Select></Field>}<Field label="Clinical notes / indication"><Area rows={4} value={text(action === "LAB_ORDER" ? data.clinicalNotes : data.clinicalIndication)} onChange={(e) => set(action === "LAB_ORDER" ? "clinicalNotes" : "clinicalIndication", e.target.value)}/></Field></div>}

        {action === "IMAGING_REPORT" && <div className="grid gap-4"><Field label="Imaging study"><Select value={text(data.studyId)} onChange={(e) => set("studyId", e.target.value)}><option value="">Choose study</option>{(file?.imaging ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.accessionNumber || "Imaging study"}</option>)}</Select></Field><Field label="Findings"><Area rows={7} value={text(data.findings)} onChange={(e) => set("findings", e.target.value)}/></Field><Field label="Impression"><Area rows={4} value={text(data.impression)} onChange={(e) => set("impression", e.target.value)}/></Field><Field label="Recommendations"><Area rows={4} value={text(data.recommendations)} onChange={(e) => set("recommendations", e.target.value)}/></Field></div>}

        {action === "HEALTH_PASSPORT" && <div className="grid gap-4 md:grid-cols-2"><Field label="Blood type"><Input value={text(data.bloodType)} onChange={(e) => set("bloodType", e.target.value)}/></Field><Field label="Rhesus factor"><Input value={text(data.rhesusFactor)} onChange={(e) => set("rhesusFactor", e.target.value)}/></Field><Field label="Organ donor"><Select value={String(data.organDonor ?? false)} onChange={(e) => set("organDonor", e.target.value === "true")}><option value="false">No</option><option value="true">Yes</option></Select></Field><Field label="Emergency notes"><Area rows={5} value={text(data.emergencyNotes)} onChange={(e) => set("emergencyNotes", e.target.value)}/></Field></div>}

        {action === "MEDICAL_RECORD" && <div className="grid gap-4 md:grid-cols-2">{["pastMedicalHistory","surgicalHistory","familyHistory","socialHistory","chronicConditions","currentMedications","immunizationNotes"].map((key) => <Field key={key} label={key.replace(/([A-Z])/g, " $1")}><Area rows={4} value={text(data[key])} onChange={(e) => set(key, e.target.value)}/></Field>)}</div>}

        {action === "HEALTH_JOURNAL" && <div className="grid gap-4 md:grid-cols-2"><Field label="Title"><Input value={text(data.title)} onChange={(e) => set("title", e.target.value)}/></Field><Field label="Journal"><Area rows={8} value={text(data.journal)} onChange={(e) => set("journal", e.target.value)} placeholder="Clinical journal entry"/></Field><Field label="Mood"><Input value={text(data.mood)} onChange={(e) => set("mood", e.target.value)}/></Field><Field label="Notes"><Area rows={4} value={text(data.notes)} onChange={(e) => set("notes", e.target.value)}/></Field></div>}

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          {referenceRequired && <span className="mr-auto text-xs text-slate-400">{selectedRefs.length > 0 ? `${selectedRefs.length} selected` : ""}</span>}
          <button type="button" onClick={() => void save()} disabled={saving || (mode === "UPDATE" && !existingId)} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4"/>{saving ? "Saving…" : mode === "UPDATE" ? "Save changes" : "Add to clinical record"}</button>
        </div>
      </div>
    </div>
  </section>;
}
