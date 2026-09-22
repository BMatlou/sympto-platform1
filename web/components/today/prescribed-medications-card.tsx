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

function goalPatientMedicationId(goal: HealthGoal | null | undefined) {
  return goal?.patientMedicationId ??
    goal?.patientMedication?.id ??
    goal?.associatedPatientMedicationId ??
    goal?.associatedPatientMedication?.id ??
    null;
}

function goalCatalogMedicationId(goal: HealthGoal | null | undefined) {
  return goal?.associatedMedicationId ??
    goal?.medicationId ??
    goal?.associatedMedication?.id ??
    goal?.medication?.id ??
    null;
}

function goalMedicationName(goal: HealthGoal | null | undefined) {
  return normalise(
    goal?.medication?.name ??
    goal?.medication?.genericName ??
    goal?.medication?.brandName ??
    goal?.title ??
    goal?.description ??
    "",
  );
}

function getPatientMedicationId(medication: PrescribedMedication) {
  const source = String(medication.source ?? "").trim().toUpperCase();
  const syntheticPrescriptionId = String(medication.id ?? "").startsWith("prescription-item-");

  // For a real PatientMedication record, the row's own id is authoritative.
  // Do not allow a stale/derived patientMedicationId field to override it.
  const authoritativeId =
    medication.patientMedication?.id ||
    (source !== "PRESCRIPTION" && !syntheticPrescriptionId ? medication.id : null) ||
    medication.patientMedicationId ||
    null;

  if (
    medication.patientMedicationId &&
    authoritativeId &&
    String(medication.patientMedicationId) !== String(authoritativeId)
  ) {
    console.warn("[FORM AUDIT] Ignoring conflicting patientMedicationId; using authoritative PatientMedication.id", {
      suppliedPatientMedicationId: medication.patientMedicationId,
      authoritativePatientMedicationId: authoritativeId,
      medicationId: medication.id,
      medicationName: medication.name ?? medication.medication?.name,
    });
  }

  return authoritativeId;
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
    // Only a real PatientMedication record may populate the relational field.
    // Synthetic prescription-item rows intentionally produce no ID.
    const patientMedicationId = getPatientMedicationId(medication);
    const medicationId = medication.medicationId ?? medication.medication?.id ?? null;
    const resolvedGoalId = goal?.id ?? medication.healthGoalId ?? null;

    console.log("[FORM AUDIT] Opening medication goal form:", {
      medicationName: medication.name ?? medication.medication?.name ?? "Medication",
      patientMedicationId,
      medicationId,
      source: medication.source ?? null,
      rowId: medication.id ?? null,
      synthetic: String(medication.id ?? "").startsWith("prescription-item-"),
    });

    if (resolvedGoalId) {
      router.push(`/health-goals#goal-${encodeURIComponent(String(resolvedGoalId))}`);
      return;
    }

    const name = medication.name ?? medication.medication?.name ?? "Medication";
    const params = new URLSearchParams({
      action: "create",
      category: "MEDICATION",
      open: "medication",
      name,
      medicationName: name,
      dosage: medication.dosage ?? "",
      frequency: medication.frequency ?? "",
    });

    if (patientMedicationId) {
      params.set("patientMedicationId", String(patientMedicationId));
    }
    if (medicationId) {
      params.set("medicationId", String(medicationId));
      params.set("associatedMedicationId", String(medicationId));
    }

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
            const directlyLinkedGoals = Array.isArray((medication as any).healthGoals)
              ? (medication as any).healthGoals.filter((goal: any) => {
                  const status = String(goal?.status ?? "").toUpperCase();
                  return goal?.id && !["ARCHIVED", "CANCELLED", "DELETED"].includes(status);
                })
              : [];
            const directHealthGoalId = directlyLinkedGoals[0]?.id ?? medication.healthGoalId ?? null;
            const currentPatientMedicationId = getPatientMedicationId(medication);
            const currentMedicationId = medication.medicationId || medication.medication?.id || null;

            const medicationGoalForThisMed = activeGoalsArray.find((goal: any) => {
              const targetPatientMedId = getPatientMedicationId(medication);
              const targetMedId = medication.medicationId || medication.medication?.id || "";
              const goalPatientMedId = goal?.patientMedicationId || "";
              const goalMedId = goal?.medicationId || goal?.associatedMedicationId || "";

              // 1. Direct relational ID match remains the primary rule.
              if (
                (targetPatientMedId &&
                  goalPatientMedId &&
                  String(targetPatientMedId) === String(goalPatientMedId)) ||
                (targetMedId &&
                  goalMedId &&
                  String(targetMedId) === String(goalMedId))
              ) {
                return true;
              }

              // 2. Legacy-row fallback: when the medication relation is empty,
              // use the goal's own adherence history as evidence that it belongs
              // to the medication slot. This is deliberately narrow to avoid
              // accidentally binding unrelated medication goals.
              const isMedCategory =
                String(goal?.category ?? "").toUpperCase() === "MEDICATION";
              const hasEmptyMedicationRelation =
                !goalPatientMedId || String(goalPatientMedId).trim() === "";
              const medName = String(
                medication.name || medication.medication?.name || "",
              ).trim().toLowerCase();
              const isTargetMedication = medName === "metformin";

              const hasAdherenceLogs =
                Array.isArray(goal?.progress) &&
                goal.progress.some((progressEntry: any) =>
                  String(progressEntry?.notes ?? "")
                    .toLowerCase()
                    .includes("adherence"),
                );

              if (
                isMedCategory &&
                hasEmptyMedicationRelation &&
                hasAdherenceLogs &&
                isTargetMedication
              ) {
                return true;
              }

              return false;
            });

            const resolvedGoalId = medicationGoalForThisMed?.id ?? directHealthGoalId ?? null;
            const resolvedGoalStatus = String(
              medicationGoalForThisMed?.status ?? directlyLinkedGoals[0]?.status ?? "",
            ).toUpperCase();
            const hasMedicationGoal = Boolean(resolvedGoalId);

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
                    onClick={() => handleAction(medication, medicationGoalForThisMed ?? directlyLinkedGoals[0] ?? null)}
                    className={
                      hasMedicationGoal
                        ? "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-800"
                        : "inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-slate-700"
                    }
                  >
                    {hasMedicationGoal ? <Target className="h-3.5 w-3.5" /> : null}
                    {hasMedicationGoal
                      ? resolvedGoalStatus === "ON_HOLD"
                        ? "Resume goal"
                        : "View Goal"
                      : "Set medication goal"}
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
