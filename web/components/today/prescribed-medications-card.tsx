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
  return medication.patientMedicationId ||
    medication.patientMedication?.id ||
    (source !== "PRESCRIPTION" && !syntheticPrescriptionId ? medication.id : null) ||
    null;
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
    const patientMedicationId = getPatientMedicationId(medication) || goalPatientMedicationId(goal);
    const medicationId = medication.medicationId || medication.medication?.id || null;
    const resolvedGoalId = goal?.id ?? medication.healthGoalId ?? null;

    if (patientMedicationId && resolvedGoalId) {
      const targetId = `medication-adherence-card-${String(patientMedicationId)}`;
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.location.hash = encodeURI(`#${targetId}`);
      }
      return;
    }

    if (resolvedGoalId) {
      router.push(`/health-goals#goal-${encodeURIComponent(String(resolvedGoalId))}`);
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
            const directlyLinkedGoals = Array.isArray((medication as any).healthGoals)
              ? (medication as any).healthGoals.filter((goal: any) => {
                  const status = String(goal?.status ?? "").toUpperCase();
                  return goal?.id && !["ARCHIVED", "CANCELLED", "DELETED"].includes(status);
                })
              : [];
            const directHealthGoalId = directlyLinkedGoals[0]?.id ?? medication.healthGoalId ?? null;
            const currentPatientMedicationId = getPatientMedicationId(medication);
            const currentMedicationId = medication.medicationId || medication.medication?.id || null;

            // Runtime diagnostics: leave these explicit while we verify the
            // production payload shape and the goal-to-medication mapping.
            console.log(`[TODAY DIAGNOSTIC] Processing medication: ${medication.name}`, {
              patientMedicationId: currentPatientMedicationId,
              medicationId: currentMedicationId,
              availableGoalsInPayload: activeGoalsArray,
            });

            const medicationGoalForThisMed = activeGoalsArray.find((goal: HealthGoal) => {
              if (!goal) return false;

              console.log("[TODAY DIAGNOSTIC] EXAMINING CANDIDATE GOAL OBJECT:", JSON.stringify(goal, null, 2));

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

              const goalPatientMedId = goalPatientMedicationId(goal);

              // Rule 0: the medication object already carries the goal id.
              if (medication.healthGoalId && goal.id && String(medication.healthGoalId) === String(goal.id)) {
                console.log("[TODAY DIAGNOSTIC] MATCH: direct medication.healthGoalId", {
                  medication: medication.name,
                  goalId: goal.id,
                });
                return true;
              }

              // Rule A: direct PatientMedication relational linkage.
              if (
                currentPatientMedicationId &&
                goalPatientMedId &&
                String(currentPatientMedicationId) === String(goalPatientMedId)
              ) {
                console.log("[TODAY DIAGNOSTIC] MATCH: patientMedicationId", {
                  medication: medication.name,
                  currentPatientMedicationId,
                  goalPatientMedId,
                  goalId: goal.id,
                });
                return true;
              }

              // Rule B: catalog Medication linkage.
              const linkedCatalogMedicationId = goalCatalogMedicationId(goal);
              if (
                currentMedicationId &&
                linkedCatalogMedicationId &&
                String(currentMedicationId) === String(linkedCatalogMedicationId)
              ) {
                console.log("[TODAY DIAGNOSTIC] MATCH: medicationId", {
                  medication: medication.name,
                  currentMedicationId,
                  linkedCatalogMedicationId,
                  goalId: goal.id,
                });
                return true;
              }

              // Rule C: normalized medication name/title fallback.
              const currentNormName = normalise(
                medication.name ??
                medication.medication?.name ??
                medication.medication?.genericName ??
                medication.medication?.brandName ??
                "",
              );
              const goalNormName = goalMedicationName(goal);
              const isGenericManageMedicationGoal = goalNormName === "manage medication";

              if (currentNormName !== "" && goalNormName !== "" && !isGenericManageMedicationGoal) {
                const nameMatch =
                  goalNormName.includes(currentNormName) ||
                  currentNormName.includes(goalNormName);
                if (nameMatch) {
                  console.log("[TODAY DIAGNOSTIC] MATCH: normalized medication name", {
                    medication: medication.name,
                    currentNormName,
                    goalNormName,
                    goalId: goal.id,
                  });
                }
                return nameMatch;
              }

              // Rule D: preserve the existing single-medication generic fallback.
              if (isGenericManageMedicationGoal && prescriptionsList.length === 1) {
                console.log("[TODAY DIAGNOSTIC] MATCH: single generic medication goal", {
                  medication: medication.name,
                  goalId: goal.id,
                });
                return true;
              }

              // Final safety baseline: when the backend has explicitly supplied a
              // single active MEDICATION goal, it is unambiguous which goal belongs
              // to this medication row even if legacy relational keys are absent.
              const goalTitleLower = String(goal?.title ?? "").toLowerCase();
              const medNameLower = String(medication.name ?? medication.medication?.name ?? "").toLowerCase().trim();
              const forceCategoryMatch =
                category === "MEDICATION" &&
                (
                  activeGoalsArray.length === 1 ||
                  (medNameLower !== "" && goalTitleLower.includes(medNameLower)) ||
                  (goalTitleLower !== "" && medNameLower.includes(goalTitleLower))
                );

              if (forceCategoryMatch) {
                console.log("[TODAY DIAGNOSTIC] FORCE MATCH VIA CATEGORY/TITLE FALLBACK", {
                  medication: medication.name,
                  goalId: goal.id,
                  category,
                  goalTitleLower,
                  medNameLower,
                  activeGoalsArrayLength: activeGoalsArray.length,
                });
                return true;
              }

              console.log("[TODAY DIAGNOSTIC] NO MATCH for candidate goal", {
                medication: medication.name,
                currentPatientMedicationId,
                goalPatientMedId,
                currentMedicationId,
                linkedCatalogMedicationId,
                currentNormName,
                goalNormName,
                goalTitleLower,
                medNameLower,
                goalId: goal.id,
              });
              return false;
            });

            const resolvedGoalId = medicationGoalForThisMed?.id ?? directHealthGoalId ?? null;
            const hasMedicationGoal = Boolean(resolvedGoalId);

            console.log(`[TODAY DIAGNOSTIC] Final medication state: ${medication.name}`, {
              hasMedicationGoal,
              resolvedGoalId,
              matchedGoal: medicationGoalForThisMed,
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
                    onClick={() => handleAction(medication, medicationGoalForThisMed ?? (resolvedGoalId ? { id: String(resolvedGoalId) } : null))}
                    className={
                      hasMedicationGoal
                        ? "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-800"
                        : "inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-slate-700"
                    }
                  >
                    {hasMedicationGoal ? <Target className="h-3.5 w-3.5" /> : null}
                    {hasMedicationGoal ? "View Goal" : "Set medication goal"}
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
