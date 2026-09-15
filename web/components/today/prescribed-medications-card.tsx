"use client";

import { useRouter } from "next/navigation";
import { Pill, Target } from "lucide-react";
import type { PrescribedMedication } from "@/services/health-home.service";

type HealthGoal = {
  id?: string;
  category?: string;
  status?: string;
  title?: string;
  description?: string;
  patientMedicationId?: string | null;
  associatedMedicationId?: string | null;
  medicationId?: string | null;
  medication?: { id?: string | null; name?: string | null } | null;
  metricType?: string | null;
  metricConfig?: { metricType?: string | null; metricKey?: string | null } | null;
};

function normalise(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function getPatientMedicationId(medication: PrescribedMedication) {
  return medication.patientMedicationId || medication.patientMedication?.id || medication.id || null;
}

function isActiveMedicationGoal(goal: HealthGoal) {
  const status = normalise(goal.status).replace(/ /g, "_").toUpperCase();
  if (!["ACTIVE", "IN_PROGRESS"].includes(status)) return false;
  const category = normalise(goal.category).replace(/ /g, "_").toUpperCase();
  const metricType = normalise(goal.metricType).replace(/ /g, "_").toUpperCase();
  const metricConfigType = normalise(goal.metricConfig?.metricType).replace(/ /g, "_").toUpperCase();
  const metricKey = normalise(goal.metricConfig?.metricKey);
  return category === "MEDICATION" || metricType === "MEDICATION" || metricConfigType === "MEDICATION" || metricKey === "medication adherence";
}

function goalBelongsToMedication(goal: HealthGoal, medication: PrescribedMedication, allMedications: PrescribedMedication[]) {
  if (!isActiveMedicationGoal(goal)) return false;
  const patientMedicationId = getPatientMedicationId(medication);
  if (patientMedicationId) {
    if (goal.patientMedicationId && String(goal.patientMedicationId) === String(patientMedicationId)) return true;
    if (goal.associatedMedicationId && String(goal.associatedMedicationId) === String(patientMedicationId)) return true;
    if (goal.medicationId && String(goal.medicationId) === String(patientMedicationId)) return true;
    if (goal.medication?.id && String(goal.medication.id) === String(patientMedicationId)) return true;
  }

  const medicationId = String(medication.medicationId ?? "");
  if (medicationId && goal.medicationId && String(goal.medicationId) === medicationId) {
    const sameCatalogMedicationCount = allMedications.filter((item) => String(item.medicationId ?? "") === medicationId).length;
    if (sameCatalogMedicationCount === 1) return true;
  }

  const name = normalise(medication.name);
  const goalName = normalise(goal.medication?.name || goal.title);
  if (name && goalName && name === goalName) {
    const sameNameCount = allMedications.filter((item) => normalise(item.name) === name).length;
    if (sameNameCount === 1) return true;
  }
  return false;
}

export default function PrescribedMedicationsCard({ prescriptionsList, activeGoalsArray = [] }: { prescriptionsList: PrescribedMedication[]; activeGoalsArray?: HealthGoal[] }) {
  const router = useRouter();

  const handleAction = (medication: PrescribedMedication, hasGoal: boolean) => {
    const id = getPatientMedicationId(medication);
    if (hasGoal) {
      if (!id) return;
      const target = document.getElementById(`medication-adherence-card-${String(id)}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      else window.location.hash = `medication-adherence-card-${encodeURIComponent(String(id))}`;
      return;
    }

    const name = medication.name || "Medication";
    const dosage = medication.dosage || "";
    const frequency = medication.frequency || "";
    const params = new URLSearchParams({
      action: "create",
      category: "MEDICATION",
      open: "medication",
      name,
      medicationName: name,
      dosage,
      frequency,
      patientMedicationId: String(id ?? ""),
      associatedMedicationId: String(id ?? ""),
      medicationId: String(id ?? medication.medicationId ?? ""),
    });
    router.push(`/health-goals?${params.toString()}`);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Prescribed medications</p>
          <p className="text-xs text-slate-500">Your medication schedule for today</p>
        </div>
        <Pill className="h-5 w-5 text-slate-400" />
      </div>

      {prescriptionsList.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">No active prescribed medications today.</p>
      ) : (
        <div className="space-y-3">
          {prescriptionsList.map((medication) => {
            const hasGoal = activeGoalsArray.some((goal) => goalBelongsToMedication(goal, medication, prescriptionsList));
            const id = getPatientMedicationId(medication);
            return (
              <div key={String(id ?? medication.name)} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{medication.name}</p>
                  <p className="text-xs text-slate-500">{medication.dosage}{medication.frequency ? ` · ${medication.frequency}` : ""}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">Today</span>
                  <button type="button" onClick={() => handleAction(medication, hasGoal)} className={hasGoal ? "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-800" : "inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-slate-700"}>
                    {hasGoal ? <Target className="h-3.5 w-3.5" /> : null}
                    {hasGoal ? "View Goal" : "Set medication goal"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
