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
  patientMedication?: { id?: string | null } | null;
  associatedPatientMedicationId?: string | null;
  associatedPatientMedication?: { id?: string | null } | null;
  metricType?: string | null;
  metricConfig?: { metricType?: string | null; metricKey?: string | null } | null;
};

function normalise(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function getPatientMedicationId(medication: PrescribedMedication) {
  const source = normalise(medication.source);
  const syntheticPrescriptionId = String(medication.id ?? "").startsWith("prescription-item-");
  return medication.patientMedicationId ||
    medication.patientMedication?.id ||
    (source !== "prescription" && !syntheticPrescriptionId ? medication.id : null) ||
    null;
}

function findMedicationGoal(
  medication: PrescribedMedication,
  goals: HealthGoal[],
  medicationCount: number,
) {
  const medicationPatientId = getPatientMedicationId(medication);
  const medicationCatalogId =
    medication.medicationId ??
    medication.medication?.id ??
    medication.medication?.medicationId ??
    null;
  const medicationName = normalise(
    medication.name ??
    medication.medication?.name ??
    medication.medication?.genericName ??
    medication.medication?.brandName ??
    "",
  );

  return goals.find((goal) => {
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

    const linkedPatientMedicationId =
      goal.patientMedicationId ??
      (goal as any).patientMedication?.id ??
      (goal as any).associatedPatientMedicationId ??
      (goal as any).associatedPatientMedication?.id ??
      null;

    if (linkedPatientMedicationId && medicationPatientId) {
      return String(linkedPatientMedicationId) === String(medicationPatientId);
    }

    // Prescription-only rows do not have a patientMedicationId. In that case
    // fall through to the canonical medication id/name so a saved goal can
    // still be resolved to the correct prescribed medicine.
    const linkedMedicationId =
      goal.associatedMedicationId ??
      goal.medicationId ??
      (goal as any).associatedMedication?.id ??
      (goal as any).medication?.id ??
      null;

    if (linkedMedicationId && medicationCatalogId) {
      return String(linkedMedicationId) === String(medicationCatalogId);
    }

    const goalMedicationName = normalise(
      (goal as any).medication?.name ??
      (goal as any).medication?.genericName ??
      (goal as any).medication?.brandName ??
      (goal as any).title ??
      (goal as any).description ??
      "",
    );

    if (medicationName && goalMedicationName) {
      return goalMedicationName === medicationName ||
        goalMedicationName.includes(medicationName) ||
        medicationName.includes(goalMedicationName);
    }

    return normalise(goal.title) === "manage medication" && medicationCount === 1;
  }) ?? null;
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
    const patientMedicationId = getPatientMedicationId(medication) || goal?.patientMedicationId || goal?.patientMedication?.id || null;
    const medicationId = medication.medicationId || medication.medication?.id || null;

    if (goal) {
      const goalTarget = goal.id ? document.getElementById(`health-goal-card-${String(goal.id)}`) : null;
      if (goalTarget) {
        goalTarget.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (patientMedicationId) {
        const target = document.getElementById(`medication-adherence-card-${String(patientMedicationId)}`);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        window.location.hash = `medication-adherence-card-${encodeURIComponent(String(patientMedicationId))}`;
      } else if (goal.id) {
        window.location.hash = `health-goal-card-${encodeURIComponent(String(goal.id))}`;
      }
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
            const matchedGoal = findMedicationGoal(medication, activeGoalsArray, prescriptionsList.length);
            const isGoalSetForThisMed = Boolean(matchedGoal);

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
                    onClick={() => handleAction(medication, matchedGoal)}
                    className={
                      isGoalSetForThisMed
                        ? "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-800"
                        : "inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-slate-700"
                    }
                  >
                    {isGoalSetForThisMed ? <Target className="h-3.5 w-3.5" /> : null}
                    {isGoalSetForThisMed ? "View Goal" : "Set medication goal"}
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
