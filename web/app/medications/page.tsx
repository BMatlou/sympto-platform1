"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Check, ChevronDown, Clock3, FileText, Pill, Plus, ShieldCheck } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { MedicationReminderButton } from "@/components/medications/MedicationReminderButton";
import { MedicationAdherenceActions } from "@/components/medications/MedicationAdherenceActions";
import { onboardingService } from "@/services/onboarding.service";
import { api } from "@/lib/api";
import type { MedicationItem, UpdatePatientMedicationsDto } from "@/types/onboarding";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FREQUENCY_OPTIONS = [
  { label: "Once a day", value: "ONCE_DAILY" },
  { label: "Twice a day", value: "TWICE_DAILY" },
  { label: "Three times a day", value: "THREE_TIMES_DAILY" },
  { label: "Four times a day", value: "FOUR_TIMES_DAILY" },
  { label: "As needed", value: "AS_NEEDED" },
  { label: "Weekly", value: "WEEKLY" },
  { label: "Other", value: "OTHER" },
];

const ROUTE_OPTIONS = [
  { label: "By mouth", value: "ORAL" },
  { label: "Inhaled", value: "INHALATION" },
  { label: "Injection", value: "INJECTION" },
  { label: "Applied to skin", value: "TOPICAL" },
  { label: "Eye drops", value: "OPHTHALMIC" },
  { label: "Ear drops", value: "OTIC" },
  { label: "Other", value: "OTHER" },
];

const DOSE_OPTIONS = [
  "5 mg", "10 mg", "20 mg", "25 mg", "40 mg", "50 mg", "75 mg", "100 mg", "150 mg", "200 mg", "250 mg", "300 mg", "400 mg", "500 mg", "600 mg", "750 mg", "800 mg", "1 g", "2 g", "5 mL", "10 mL", "15 mL", "20 mL", "1 tablet", "2 tablets", "1 capsule", "2 capsules", "Other",
];

const PRESCRIBED_BY_OPTIONS = [
  { label: "Doctor", value: "Doctor" },
  { label: "Specialist", value: "Specialist" },
  { label: "Clinic / nurse", value: "Clinic / nurse" },
  { label: "Pharmacist", value: "Pharmacist" },
  { label: "Self / over the counter", value: "Self / over the counter" },
  { label: "Other", value: "OTHER" },
];

const INDICATION_OPTIONS = [
  "Pain relief", "Blood pressure", "Diabetes", "Cholesterol", "Heart health", "Infection", "Inflammation", "Allergy", "Asthma / breathing", "Mental health", "Hormone treatment", "Contraception", "Vitamin / supplement", "Other",
];

const INSTRUCTION_OPTIONS = [
  "Take with water", "Take with food", "Take after food", "Take before food", "Take on an empty stomach", "Take at bedtime", "Take in the morning", "Use as directed", "Other",
];

const SIDE_EFFECT_OPTIONS = [
  "None noticed", "Nausea", "Dizziness", "Headache", "Stomach upset", "Sleepiness", "Diarrhoea", "Constipation", "Rash", "Other",
];

const EFFECTIVENESS_OPTIONS = [
  { label: "Helping", value: "Helping" },
  { label: "Helping a little", value: "Helping a little" },
  { label: "Not helping", value: "Not helping" },
  { label: "Unsure", value: "Unsure" },
  { label: "Too early to tell", value: "Too early to tell" },
];

function formatEnum(value: unknown) {
  if (!value) return "Not specified";
  return String(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function medicationId(medication: any) {
  return medication?.patientMedicationId || medication?.patientMedication?.id || medication?.id || null;
}

function toMedicationItem(medication: any): MedicationItem | null {
  const patientMedicationId = medicationId(medication);
  if (!patientMedicationId) return null;

  return {
    patientMedicationId: String(patientMedicationId),
    medicationId: String(medication?.medicationId || medication?.medication?.id || ""),
    dosage: medication?.dosage ?? undefined,
    frequency: medication?.frequency ?? undefined,
    route: medication?.route ?? undefined,
    indication: medication?.indication ?? undefined,
    instructions: medication?.instructions ?? undefined,
    prescribedBy: medication?.prescribedBy ?? undefined,
    startedAt: medication?.startedAt ?? undefined,
    endedAt: medication?.endedAt ?? undefined,
    ongoing: medication?.ongoing ?? (medication?.status ? medication.status === "ACTIVE" : true),
    adherencePercentage: medication?.adherencePercentage ?? undefined,
    missedDoses: medication?.missedDoses ?? undefined,
    sideEffects: medication?.sideEffects ?? undefined,
    effectiveness: medication?.effectiveness ?? undefined,
    status: medication?.status ?? undefined,
    notes: medication?.notes ?? undefined,
  };
}

const emptyMedication = (): MedicationItem => ({
  medicationId: "",
  dosage: "",
  frequency: "",
  route: "",
  indication: "",
  instructions: "",
  prescribedBy: "",
  startedAt: "",
  endedAt: "",
  ongoing: true,
  sideEffects: "",
  effectiveness: "",
  notes: "",
});

function FieldLabel({ children, optional = false }: { children: ReactNode; optional?: boolean }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-sm font-semibold text-[#0b2d54]">{children}</span>
      {optional && <span className="text-[11px] font-medium text-slate-400">Optional</span>}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-[#0b2d54] outline-none transition-all focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function MedicationForm({
  value,
  onChange,
}: {
  value: MedicationItem;
  onChange: (value: MedicationItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [doseOther, setDoseOther] = useState(Boolean(value.dosage && !DOSE_OPTIONS.includes(value.dosage)));
  const [prescriberOther, setPrescriberOther] = useState(Boolean(value.prescribedBy && !PRESCRIBED_BY_OPTIONS.some((option) => option.value === value.prescribedBy)));
  const [indicationOther, setIndicationOther] = useState(Boolean(value.indication && !INDICATION_OPTIONS.includes(value.indication)));
  const [instructionOther, setInstructionOther] = useState(Boolean(value.instructions && !INSTRUCTION_OPTIONS.includes(value.instructions)));
  const [sideEffectOther, setSideEffectOther] = useState(Boolean(value.sideEffects && !SIDE_EFFECT_OPTIONS.includes(value.sideEffects)));

  async function searchMedications(term: string) {
    setSearch(term);
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      setSearching(true);
      const { data } = await api.get("/medications", { params: { search: term.trim(), limit: 10, page: 1 } });
      setResults(Array.isArray(data?.data?.data) ? data.data.data : Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.error("Medication search failed:", error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  const currentDoseIsPreset = !value.dosage || DOSE_OPTIONS.includes(value.dosage);
  const currentPrescriberIsPreset = !value.prescribedBy || PRESCRIBED_BY_OPTIONS.some((option) => option.value === value.prescribedBy);

  return (
    <div className="space-y-7">
      <div className="rounded-2xl border border-[#24c1c4]/20 bg-gradient-to-br from-[#24c1c4]/10 via-white to-white p-4 sm:p-5">
        <FieldLabel>Medication</FieldLabel>
        <div className="relative">
          <input
            value={selectedName || search}
            onChange={(event) => {
              setSelectedName("");
              onChange({ ...value, medicationId: "" });
              void searchMedications(event.target.value);
            }}
            placeholder="Search by medicine name"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-[#0b2d54] shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10"
          />
          {searching && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">Searching...</span>}
        </div>
        {results.length > 0 && !value.medicationId && (
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
            {results.map((result: any) => {
              const id = String(result?.id ?? "");
              const name = String(result?.name || result?.genericName || "Medication");
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSelectedName(name);
                    setSearch(name);
                    setResults([]);
                    onChange({ ...value, medicationId: id });
                  }}
                  className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-[#24c1c4]/5"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-[#0b2d54]">{name}</span>
                    {result?.genericName && result.genericName !== name && <span className="text-xs text-slate-500">{result.genericName}</span>}
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-[#24c1c4]" />
                </button>
              );
            })}
          </div>
        )}
        {value.medicationId && (
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100"><Check className="h-3 w-3" /></span>
            Medicine selected
          </div>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <FieldLabel>Dose</FieldLabel>
          <SelectField
            value={currentDoseIsPreset && !doseOther ? (value.dosage ?? "") : "Other"}
            onChange={(next) => {
              setDoseOther(next === "Other");
              onChange({ ...value, dosage: next === "Other" ? "" : next });
            }}
            options={DOSE_OPTIONS.map((option) => ({ label: option, value: option }))}
            placeholder="Select dose"
          />
          {(doseOther || (value.dosage && !DOSE_OPTIONS.includes(value.dosage))) && (
            <input value={value.dosage ?? ""} onChange={(event) => onChange({ ...value, dosage: event.target.value })} placeholder="Enter dose, e.g. 125 mg" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0b2d54] outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />
          )}
        </div>

        <div>
          <FieldLabel>Frequency</FieldLabel>
          <SelectField value={value.frequency ?? ""} onChange={(next) => onChange({ ...value, frequency: next })} options={FREQUENCY_OPTIONS} placeholder="How often?" />
        </div>

        <div>
          <FieldLabel>Route</FieldLabel>
          <SelectField value={value.route ?? ""} onChange={(next) => onChange({ ...value, route: next })} options={ROUTE_OPTIONS} placeholder="How do you take it?" />
        </div>

        <div>
          <FieldLabel>Prescribed by</FieldLabel>
          <SelectField
            value={currentPrescriberIsPreset && !prescriberOther ? (value.prescribedBy ?? "") : "OTHER"}
            onChange={(next) => {
              setPrescriberOther(next === "OTHER");
              onChange({ ...value, prescribedBy: next === "OTHER" ? "" : next });
            }}
            options={PRESCRIBED_BY_OPTIONS}
            placeholder="Who prescribed it?"
          />
          {(prescriberOther || (value.prescribedBy && !currentPrescriberIsPreset)) && <input value={value.prescribedBy ?? ""} onChange={(event) => onChange({ ...value, prescribedBy: event.target.value })} placeholder="Enter name or provider" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0b2d54] outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />}
        </div>

        <div>
          <FieldLabel>Why are you taking this medication?</FieldLabel>
          <SelectField
            value={indicationOther ? "Other" : (value.indication ?? "")}
            onChange={(next) => {
              setIndicationOther(next === "Other");
              onChange({ ...value, indication: next === "Other" ? "" : next });
            }}
            options={INDICATION_OPTIONS.map((option) => ({ label: option, value: option }))}
            placeholder="Select a reason"
          />
          {(indicationOther || (value.indication && !INDICATION_OPTIONS.includes(value.indication))) && <input value={value.indication ?? ""} onChange={(event) => onChange({ ...value, indication: event.target.value })} placeholder="Tell us what you are treating" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0b2d54] outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />}
        </div>

        <div>
          <FieldLabel>How should you take it?</FieldLabel>
          <SelectField
            value={instructionOther ? "Other" : (value.instructions ?? "")}
            onChange={(next) => {
              setInstructionOther(next === "Other");
              onChange({ ...value, instructions: next === "Other" ? "" : next });
            }}
            options={INSTRUCTION_OPTIONS.map((option) => ({ label: option, value: option }))}
            placeholder="Select an instruction"
          />
          {(instructionOther || (value.instructions && !INSTRUCTION_OPTIONS.includes(value.instructions))) && <input value={value.instructions ?? ""} onChange={(event) => onChange({ ...value, instructions: event.target.value })} placeholder="Add your specific instructions" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0b2d54] outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />}
        </div>

        <div>
          <FieldLabel>Started</FieldLabel>
          <input type="date" value={value.startedAt ? String(value.startedAt).slice(0, 10) : ""} onChange={(event) => onChange({ ...value, startedAt: event.target.value || undefined })} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0b2d54] outline-none transition-all focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />
        </div>

        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5">
          <label className="flex w-full cursor-pointer items-center justify-between gap-4">
            <span><span className="block text-sm font-semibold text-[#0b2d54]">I currently take this medication</span><span className="mt-0.5 block text-xs text-slate-500">Keep this medicine active in your health profile.</span></span>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value.ongoing !== false ? "bg-[#24c1c4]" : "bg-slate-300"}`}>
              <input type="checkbox" checked={value.ongoing !== false} onChange={(event) => onChange({ ...value, ongoing: event.target.checked, endedAt: event.target.checked ? undefined : value.endedAt })} className="peer sr-only" />
              <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
            </span>
          </label>
        </div>

        {value.ongoing === false && (
          <div>
            <FieldLabel>Stopped</FieldLabel>
            <input type="date" value={value.endedAt ? String(value.endedAt).slice(0, 10) : ""} onChange={(event) => onChange({ ...value, endedAt: event.target.value || undefined })} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0b2d54] outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />
          </div>
        )}

        <div>
          <FieldLabel>Side effects</FieldLabel>
          <SelectField
            value={sideEffectOther ? "Other" : (value.sideEffects ?? "")}
            onChange={(next) => {
              setSideEffectOther(next === "Other");
              onChange({ ...value, sideEffects: next === "Other" ? "" : next });
            }}
            options={SIDE_EFFECT_OPTIONS.map((option) => ({ label: option, value: option }))}
            placeholder="Any side effects?"
          />
          {(sideEffectOther || (value.sideEffects && !SIDE_EFFECT_OPTIONS.includes(value.sideEffects))) && <input value={value.sideEffects ?? ""} onChange={(event) => onChange({ ...value, sideEffects: event.target.value })} placeholder="Describe what you noticed" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0b2d54] outline-none focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />}
        </div>

        <div>
          <FieldLabel>Effectiveness</FieldLabel>
          <SelectField value={value.effectiveness ?? ""} onChange={(next) => onChange({ ...value, effectiveness: next })} options={EFFECTIVENESS_OPTIONS} placeholder="How is it working?" />
        </div>

        <div className="md:col-span-2">
          <FieldLabel optional>Notes</FieldLabel>
          <textarea value={value.notes ?? ""} onChange={(event) => onChange({ ...value, notes: event.target.value })} placeholder="Anything else you want Sympto to remember" rows={3} className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0b2d54] outline-none transition-all placeholder:text-slate-400 focus:border-[#24c1c4] focus:ring-4 focus:ring-[#24c1c4]/10" />
        </div>
      </div>
    </div>
  );
}

export default function MedicationsPage() {
  const { data, loading, error, reload } = useDashboard();
  const [showMedicationEditor, setShowMedicationEditor] = useState(false);
  const [editingMedications, setEditingMedications] = useState(false);
  const [saving, setSaving] = useState(false);
  const medications = Array.isArray(data?.medications) && data.medications.length > 0 ? data.medications : (data?.today?.activeMedications ?? []);
  const activeMedications = medications.filter((medication: any) => medication?.ongoing === true || medication?.status === "ACTIVE" || !medication?.status);
  const initialMedicationValues = useMemo<UpdatePatientMedicationsDto>(() => ({ medications: medications.filter((medication: any) => medication?.source !== "PRESCRIPTION").map(toMedicationItem).filter(Boolean) as MedicationItem[] }), [medications]);
  const [medicationValues, setMedicationValues] = useState<UpdatePatientMedicationsDto>({ medications: [] });

  function openAddMedication() { setMedicationValues({ medications: [emptyMedication()] }); setEditingMedications(false); setShowMedicationEditor(true); }
  function openEditMedications() { setMedicationValues(initialMedicationValues); setEditingMedications(true); setShowMedicationEditor(true); }

  async function saveMedications() {
    if (saving) return;
    const valid = medicationValues.medications.filter((medication) => medication.medicationId);
    if (!valid.length) { toast.error("Please select a medication before saving."); return; }
    try {
      setSaving(true);
      const medicationsToSave = editingMedications ? valid : [...initialMedicationValues.medications, ...valid.filter((newMedication) => !initialMedicationValues.medications.some((existingMedication) => existingMedication.medicationId === newMedication.medicationId))];
      await onboardingService.managePatientMedications({ medications: medicationsToSave });
      toast.success("Your medication list has been updated.");
      setShowMedicationEditor(false);
      await reload();
    } catch (requestError: any) {
      console.error("Failed to save medications:", requestError);
      const message = requestError?.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join(", ") : message || "Unable to update your medications.");
    } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to Health Home</Link><Button type="button" onClick={openAddMedication} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#071f3a]"><Plus className="h-4 w-4" />Add medication</Button></div>
      <div className="mb-8"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0b2d54]"><Pill className="h-3.5 w-3.5" />My health</div><h1 className="text-3xl font-bold tracking-tight text-[#0b2d54] sm:text-4xl">Medications</h1><p className="mt-2 max-w-2xl text-slate-500">Keep track of your current medicines, doses, schedules and prescribing information.</p></div>
      {loading && <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading your medications...</div>}
      {error && !loading && <div className="mb-6 rounded-2xl border border-red-200 bg-white p-6"><h2 className="font-semibold text-[#0b2d54]">We couldn't load your medications</h2><button onClick={reload} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>}
      {showMedicationEditor && <section data-medication-editor className="mb-8 overflow-hidden rounded-3xl border border-[#24c1c4]/15 bg-white shadow-xl shadow-[#0b2d54]/5"><div className="border-b border-slate-100 bg-gradient-to-r from-[#0b2d54] to-[#123c67] px-5 py-6 text-white sm:px-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-[#b9ffff]"><Pill className="h-3.5 w-3.5" />Medication details</div><h2 className="text-2xl font-bold tracking-tight">{editingMedications ? "Edit medications" : "Add a medication"}</h2><p className="mt-1.5 max-w-2xl text-sm text-slate-200">Add the clinical details that help Sympto understand your treatment and medication goals.</p></div><Button type="button" variant="outline" disabled={saving} onClick={() => setShowMedicationEditor(false)} className="w-fit rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">Cancel</Button></div></div><div className="px-5 py-7 sm:px-8 lg:px-10">{medicationValues.medications.map((medication, index) => <div key={medication.patientMedicationId || index} className="rounded-2xl border border-slate-100 bg-white"> <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0b2d54]">Medicine {index + 1}</p><p className="mt-0.5 text-xs text-slate-500">A few quick details help Sympto personalise your treatment view.</p></div><div className="p-5 sm:p-7"><MedicationForm value={medication} onChange={(next) => setMedicationValues({ medications: medicationValues.medications.map((item, itemIndex) => itemIndex === index ? next : item) })} /></div></div>)}</div><div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-8"><Button type="button" variant="outline" disabled={saving} onClick={() => setShowMedicationEditor(false)} className="rounded-xl border-slate-200 text-[#0b2d54]">Cancel</Button><Button type="button" disabled={saving || medicationValues.medications.length === 0} onClick={saveMedications} className="rounded-xl bg-[#0b2d54] px-5 text-white shadow-sm hover:bg-[#071f3a]">{saving ? "Saving..." : "Save medication"}</Button></div></section>}
      <section className="mb-8 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Pill className="h-5 w-5 text-[#24c1c4]" /><p className="mt-4 text-2xl font-bold text-[#0b2d54]">{activeMedications.length}</p><p className="mt-1 text-sm text-slate-500">Current medications</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Clock3 className="h-5 w-5 text-[#24c1c4]" /><p className="mt-4 text-2xl font-bold text-[#0b2d54]">{activeMedications.length}</p><p className="mt-1 text-sm text-slate-500">Active treatment plans</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><FileText className="h-5 w-5 text-[#24c1c4]" /><p className="mt-4 text-2xl font-bold text-[#0b2d54]">{medications.length}</p><p className="mt-1 text-sm text-slate-500">Medication records</p></div></section>
      {!loading && !error && <section><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="mb-1 text-lg font-semibold text-[#0b2d54]">Current medications</h2><p className="text-sm text-slate-500">Medicines currently recorded in your Sympto health profile.</p></div>{medications.length > 0 && <Button type="button" variant="outline" onClick={openEditMedications} className="rounded-xl border-[#0b2d54]/20 text-[#0b2d54]">Edit medications</Button>}</div>{activeMedications.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><Pill className="mx-auto h-8 w-8 text-slate-400" /><h3 className="mt-4 font-semibold text-[#0b2d54]">No current medications</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Add a medicine you take so Sympto can keep it in your health profile and Today view.</p><Button type="button" onClick={openAddMedication} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add medication</Button></div> : <div className="grid gap-4 md:grid-cols-2">{activeMedications.map((medication: any) => { const medicationName = String(medication?.medication?.name || medication?.medication?.genericName || medication?.name || "Medication"); const dosage = String(medication?.dosage ?? "Not specified"); const adherenceId = medicationId(medication); return <article key={String(medication?.id ?? medicationName)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Pill className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#0b2d54]">{medicationName}</h3><span className="inline-flex rounded-full bg-[#24c1c4]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0b2d54]">{medication?.source === "PRESCRIPTION" ? "Clinic prescription" : "My medication"}</span></div><span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Active</span><div className="mt-4 space-y-2 text-sm text-slate-600"><p><b>Dose:</b> {dosage}</p><p><b>Frequency:</b> {formatEnum(medication?.frequency)}</p>{medication?.route && <p><b>Route:</b> {formatEnum(medication.route)}</p>}{medication?.indication && <p><b>For:</b> {medication.indication}</p>}{medication?.instructions && <p><b>Instructions:</b> {medication.instructions}</p>}{medication?.prescribedBy && <p><b>Prescribed by:</b> {medication.prescribedBy}</p>}</div>{adherenceId && <MedicationAdherenceActions medicationId={String(adherenceId)} medicationName={medicationName} adherencePercentage={medication?.adherencePercentage} />}{adherenceId && <MedicationReminderButton medicationId={String(adherenceId)} medicationName={medicationName} dosage={dosage} />}</div></div></article>; })}</div>}</section>}
      <div className="mt-8 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#0b2d54]" /><div><h3 className="font-semibold text-[#0b2d54]">Keep your medication list up to date</h3><p className="mt-1 text-sm leading-6 text-slate-500">Your medication details are used by Sympto for your health profile, reminders, Today tracking and medication goals.</p></div></div></div>
    </div></main>
  );
}
