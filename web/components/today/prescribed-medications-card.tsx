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
  medication?: { id?: string | null; name?: string | null; genericName?: string | null; brandName?: string | null } | null;
  healthGoalId?: string | null;
  patientMedication?: { id?: string | null } | null;
  associatedPatientMedicationId?: string | null;
  associatedPatientMedication?: { id?: string | null } | null;
  associatedMedication?: { id?: string | null } | null;
  metricType?: string | null;
  metricConfig?: { metricType?: string | null; metricKey?: string | null } | null;
};

function normalise(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function goalPatientMedicationId(goal: HealthGoal) {
  return goal.patientMedicationId ??
    goal.patientMedication?.id ??
    goal.associatedPatientMedicationId ??
    goal.associatedPatientMedication?.id ??
    null;
}

function goalCatalogMedicationId(goal: HealthGoal) {
  return goal.associatedMedicationId ??
    goal.medicationId ??
    goal.associatedMedication?.id ??
    goal.medication?.id ??
    null;
}

function goalMedicationName(goal: HealthGoal) {
  return normalise(
    goal.medication?.name ??
    goal.medication?.genericName ??
    goal.medication?.brandName ??
    goal.title ??
    goal.description ??
    "",
  );
}

function getPatientMedicationId(medication: PrescribedMedication) {
  return medication.patientMedicationId || medication.patientMedication?.id || medication.id || null;
}

export default function PrescribedMedicationsCard({
  prescriptionsList,
  activeGoalsArray = [],
}: {
  prescriptionsList: PrescribedMedication[];
  activeGoalsArray?: HealthGoal[];
}) {
  const router = useRouter();

  const handleAction = (medication: PrescribedMedication, goal: HealthGoal | null) => {
    const patientMedicationId = medication.patientMedicationId || medication.patientMedication?.id || null;
    const medicationId = medication.medicationId || medication.medication?.id || null;

    if (goal) {
      const targetMedicationId = goalPatientMedicationId(goal) ?? patientMedicationId;
      if (!targetMedicationId) return;
      const target = document.getElementById(`medication-adherence-card-${String(targetMedicationId)}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      else window.location.hash = `medication-adherence-card-${encodeURIComponent(String(targetMedicationId))}`;
      return;
    }

    const name = medication.name || medication.medication?.name || "Medication";
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
      ...(patientMedicationId ? { patientMedicationId: String(patientMedicationId) } : {}),
      ...(medicationId ? {
        associatedMedicationId: String(medicationId),
        medicationId: String(medicationId),
      } : {}),
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
            // 🔍 Next-Gen Matching Predicate resolving repository-level schema drift
            const medicationGoalForThisMed = activeGoalsArray.find((goal: HealthGoal) => {
              if (!goal) return false;
              const status = String(goal.status ?? "").toUpperCase();
              if (["ARCHIVED", "CANCELLED", "DELETED"].includes(status)) return false;

              const category = String(goal.category ?? "").toUpperCase();
              const metricType = String(goal.metricType ?? goal.metricConfig?.metricType ?? "").toUpperCase();
              const metricKey = String(goal.metricConfig?.metricKey ?? "").toLowerCase();
              const isMedicationGoal =
                category === "MEDICATION" ||
                metricType === "MEDICATION" ||
                metricKey === "medication.adherence";
              if (!isMedicationGoal) return false;

              if (medication.healthGoalId && goal.id && String(medication.healthGoalId) === String(goal.id)) {
                return true;
              }

              const medicationPatientId = getPatientMedicationId(medication);
              const linkedPatientMedicationId = goalPatientMedicationId(goal);
              if (linkedPatientMedicationId && medicationPatientId &&
                  String(linkedPatientMedicationId) === String(medicationPatientId)) {
                return true;
              }

              const medicationCatalogId =
                medication.medicationId ??
                medication.medication?.id ??
                medication.medication?.medicationId ??
                null;
              const linkedCatalogMedicationId = goalCatalogMedicationId(goal);
              if (linkedCatalogMedicationId && medicationCatalogId &&
                  String(linkedCatalogMedicationId) === String(medicationCatalogId)) {
                return true;
              }

              const medicationName = normalise(
                medication.name ??
                medication.medication?.name ??
                medication.medication?.genericName ??
                medication.medication?.brandName ??
                "",
              );
              const linkedGoalName = goalMedicationName(goal);
              if (medicationName && linkedGoalName && linkedGoalName !== "manage medication") {
                return linkedGoalName === medicationName ||
                  linkedGoalName.includes(medicationName) ||
                  medicationName.includes(linkedGoalName);
              }

              return linkedGoalName === "manage medication" && prescriptionsList.length === 1;
            });

            return (
              <div
                key={String(medication.id ?? medication.patientMedicationId ?? medication.name)}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{medication.name}</p>
                  <p className="text-xs text-slate-500">
                    {medication.dosage}{medication.frequency ? ` · ${medication.frequency}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">Today</span>
                  <button
                    type="button"
                    onClick={() => handleAction(medication, medicationGoalForThisMed)}
                    className={
                      medicationGoalForThisMed
                        ? "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-800"
                        : "inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-slate-700"
                    }
                  >
                    {medicationGoalForThisMed ? <Target className="h-3.5 w-3.5" /> : null}
                    {medicationGoalForThisMed ? "View Goal" : "Set medication goal"}
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
