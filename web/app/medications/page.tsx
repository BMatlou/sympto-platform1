"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, FileText, Pill, Plus, ShieldCheck } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { MedicationReminderButton } from "@/components/medications/MedicationReminderButton";
import { MedicationAdherenceActions } from "@/components/medications/MedicationAdherenceActions";
import { MedicationsStep } from "@/components/onboarding/steps/MedicationsStep";
import { onboardingService } from "@/services/onboarding.service";
import type { UpdatePatientMedicationsDto } from "@/types/onboarding";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function formatEnum(value: unknown) {
  if (!value) return "Not specified";
  return String(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function medicationId(medication: any) {
  return medication?.patientMedicationId || medication?.patientMedication?.id || null;
}

function toMedicationItem(medication: any) {
  const patientMedicationId = medicationId(medication);
  if (!patientMedicationId) return null;

  return {
    patientMedicationId: String(patientMedicationId),
    medicationId: String(medication?.medicationId || medication?.medication?.id || patientMedicationId),
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

export default function MedicationsPage() {
  const { data, loading, error, reload } = useDashboard();
  const [showMedicationEditor, setShowMedicationEditor] = useState(false);
  const [editingMedications, setEditingMedications] = useState(false);
  const [saving, setSaving] = useState(false);

  const medications = Array.isArray(data?.medications) && data.medications.length > 0
    ? data.medications
    : (data?.today?.activeMedications ?? []);

  const activeMedications = medications.filter(
    (medication: any) => medication?.ongoing === true || medication?.status === "ACTIVE" || !medication?.status,
  );

  const initialMedicationValues = useMemo<UpdatePatientMedicationsDto>(() => ({
    medications: medications
      .filter((medication: any) => medication?.source !== "PRESCRIPTION")
      .map(toMedicationItem)
      .filter(Boolean) as UpdatePatientMedicationsDto["medications"],
  }), [medications]);

  const [medicationValues, setMedicationValues] = useState<UpdatePatientMedicationsDto>({ medications: [] });

  function openAddMedication() {
    // ADD starts empty: the user searches first, selects a medicine,
    // then the existing Step 6 detail fields appear for that medicine.
    setMedicationValues({ medications: [] });
    setEditingMedications(false);
    setShowMedicationEditor(true);
  }

  function openEditMedications() {
    // EDIT starts with the user's existing PatientMedication records.
    setMedicationValues(initialMedicationValues);
    setEditingMedications(true);
    setShowMedicationEditor(true);
  }

  useEffect(() => {
    if (!showMedicationEditor) return;

    const frame = window.requestAnimationFrame(() => {
      const editor = document.querySelector('[data-medication-editor]');
      if (!editor) return;

      const addButton = Array.from(editor.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === "+ Add" || button.textContent?.trim() === "Add a medicine",
      ) as HTMLButtonElement | undefined;

      addButton?.click();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [showMedicationEditor]);

  async function saveMedications() {
    if (saving) return;

    try {
      setSaving(true);
      await onboardingService.managePatientMedications(medicationValues);
      toast.success("Your medication list has been updated.");
      setShowMedicationEditor(false);
      await reload();
    } catch (requestError: any) {
      console.error("Failed to save medications:", requestError);
      const message = requestError?.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join(", ") : message || "Unable to update your medications.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to Health Home</Link>
          <Button type="button" onClick={openAddMedication} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#071f3a]"><Plus className="h-4 w-4" />Add medication</Button>
        </div>

        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0b2d54]"><Pill className="h-3.5 w-3.5" />My health</div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0b2d54] sm:text-4xl">Medications</h1>
          <p className="mt-2 max-w-2xl text-slate-500">Keep track of your current medicines, doses, schedules and prescribing information.</p>
        </div>

        {loading && <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading your medications...</div>}
        {error && !loading && <div className="mb-6 rounded-2xl border border-red-200 bg-white p-6"><h2 className="font-semibold text-[#0b2d54]">We couldn't load your medications</h2><button onClick={reload} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>}

        {showMedicationEditor && (
          <section data-medication-editor className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#0b2d54]">{editingMedications ? "Edit medications" : "Add a medication"}</h2>
                <p className="mt-1 text-sm text-slate-500">{editingMedications ? "Update your medicines, doses and schedules." : "Search for your medicine, then add the dose and schedule."}</p>
              </div>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setShowMedicationEditor(false)} className="w-fit rounded-xl border-slate-200">Cancel</Button>
            </div>

            <div className="px-5 py-6 sm:px-7 lg:px-10">
              <div className="[&>div>div:first-child]:hidden">
                <MedicationsStep values={medicationValues} onChange={setMedicationValues} />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setShowMedicationEditor(false)} className="rounded-xl">Cancel</Button>
              <Button type="button" disabled={saving || medicationValues.medications.length === 0} onClick={saveMedications} className="rounded-xl bg-[#0b2d54] text-white hover:bg-[#071f3a]">{saving ? "Saving..." : "Save medications"}</Button>
            </div>
          </section>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><Pill className="h-5 w-5 text-[#24c1c4]" /><p className="mt-4 text-2xl font-bold text-[#0b2d54]">{activeMedications.length}</p><p className="mt-1 text-sm text-slate-500">Current medications</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><Clock3 className="h-5 w-5 text-[#24c1c4]" /><p className="mt-4 text-2xl font-bold text-[#0b2d54]">{activeMedications.length}</p><p className="mt-1 text-sm text-slate-500">Active treatment plans</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><FileText className="h-5 w-5 text-[#24c1c4]" /><p className="mt-4 text-2xl font-bold text-[#0b2d54]">{medications.length}</p><p className="mt-1 text-sm text-slate-500">Medication records</p></div>
        </section>

        {!loading && !error && <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="mb-1 text-lg font-semibold text-[#0b2d54]">Current medications</h2><p className="text-sm text-slate-500">Medicines currently recorded in your Sympto health profile.</p></div>
            {medications.length > 0 && <Button type="button" variant="outline" onClick={openEditMedications} className="rounded-xl border-[#0b2d54]/20 text-[#0b2d54]">Edit medications</Button>}
          </div>
          {activeMedications.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <Pill className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-4 font-semibold text-[#0b2d54]">No current medications</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Add a medicine you take so Sympto can keep it in your health profile and Today view.</p>
              <Button type="button" onClick={openAddMedication} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add medication</Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeMedications.map((medication: any) => {
                const medicationName = String(medication?.medication?.name || medication?.medication?.genericName || medication?.name || "Medication");
                const dosage = String(medication?.dosage ?? "Not specified");
                const prescribedBy = medication?.prescribedBy != null ? String(medication.prescribedBy) : null;
                const isPrescription = medication?.source === "PRESCRIPTION";
                const adherenceId = medicationId(medication);
                return <article key={String(medication?.id ?? medicationName)} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Pill className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#0b2d54]">{medicationName}</h3><span className="inline-flex rounded-full bg-[#24c1c4]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0b2d54]">{isPrescription ? "Clinic prescription" : "My medication"}</span></div>
                      <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Active</span>
                      <div className="mt-4 space-y-2 text-sm text-slate-600"><p><b>Dose:</b> {dosage}</p><p><b>Frequency:</b> {formatEnum(medication?.frequency)}</p>{prescribedBy && <p><b>Prescribed by:</b> {prescribedBy}</p>}</div>
                      {adherenceId && <MedicationAdherenceActions medicationId={String(adherenceId)} medicationName={medicationName} adherencePercentage={medication?.adherencePercentage} />}
                      {adherenceId && <MedicationReminderButton medicationId={String(adherenceId)} medicationName={medicationName} dosage={dosage} />}
                    </div>
                  </div>
                </article>;
              })}
            </div>
          )}
        </section>}

        <div className="mt-8 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#0b2d54]" /><div><h3 className="font-semibold text-[#0b2d54]">Keep your medication list up to date</h3><p className="mt-1 text-sm leading-6 text-slate-500">Add medicines you take yourself here. Clinic or practitioner prescriptions are also shown automatically when they are issued to you.</p></div></div></div>
      </div>
    </main>
  );
}
