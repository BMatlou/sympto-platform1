"use client";

import Link from "next/link";
import { ArrowRight, Pill, Target } from "lucide-react";

type PrescribedMedication = {
  id?: string | null;
  patientMedicationId?: string | null;
  patientMedication?: {
    id?: string | null;
    medicationId?: string | null;
    medication?: {
      id?: string | null;
      name?: string | null;
      genericName?: string | null;
      brandName?: string | null;
    } | null;
  } | null;
  medication?: {
    id?: string | null;
    name?: string | null;
    genericName?: string | null;
    brandName?: string | null;
  } | null;
  name?: string | null;
  dosage?: string | number | null;
  dose?: string | number | null;
  frequency?: string | null;
  schedule?: string | null;
  instructions?: string | null;
  doctorName?: string | null;
  practitioner?: { name?: string | null; firstName?: string | null; lastName?: string | null } | null;
  prescription?: {
    practitioner?: { name?: string | null; firstName?: string | null; lastName?: string | null } | null;
    doctorName?: string | null;
  } | null;
};

type ActiveGoal = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  associatedMedicationId?: string | null;
  medicationId?: string | null;
  patientMedicationId?: string | null;
  medication?: { id?: string | null; name?: string | null; genericName?: string | null; brandName?: string | null } | null;
  metricConfig?: { guidanceText?: string | null; metricKey?: string | null } | null;
  status?: string | null;
};

function firstText(...values: unknown[]) {
  const value = values.find((item) => item !== null && item !== undefined && String(item).trim() !== "");
  return value === undefined ? "" : String(value);
}

function medicationRecordId(medication: PrescribedMedication) {
  return firstText(medication.patientMedicationId, medication.patientMedication?.id, medication.id);
}

function medicationName(medication: PrescribedMedication) {
  return firstText(
    medication.medication?.name,
    medication.name,
    medication.medication?.genericName,
    "Your medicine",
  );
}

function medicationDoctor(medication: PrescribedMedication) {
  const practitioner = medication.practitioner ?? medication.prescription?.practitioner;
  return firstText(
    medication.doctorName,
    medication.prescription?.doctorName,
    practitioner?.name,
    practitioner ? [practitioner.firstName, practitioner.lastName].filter(Boolean).join(" ") : "",
  );
}

function medicationSchedule(medication: PrescribedMedication) {
  const dose = firstText(medication.dosage, medication.dose, "Dose not recorded");
  const frequency = firstText(medication.frequency, medication.schedule, "Schedule not recorded").replaceAll("_", " ");
  return `${dose} · ${frequency}`;
}

function medicationInstructions(medication: PrescribedMedication) {
  return firstText(medication.instructions, "Follow your prescribed instructions.");
}

export default function PrescribedMedicationsCard({
  prescriptionsList,
  activeGoalsArray,
}: {
  prescriptionsList: PrescribedMedication[];
  activeGoalsArray: ActiveGoal[];
}) {
  const prescriptions = Array.isArray(prescriptionsList) ? prescriptionsList : [];
  const activeGoals = Array.isArray(activeGoalsArray) ? activeGoalsArray : [];

  return (
    <section className="mt-3.5 overflow-hidden rounded-[30px] border border-[#d8e9ed] bg-white shadow-[0_18px_48px_rgba(11,45,84,.07)]">
      <header className="relative overflow-hidden border-b border-[#e6eff2] bg-gradient-to-br from-[#08284a] via-[#0c3f68] to-[#0f6178] px-5 py-5 text-white sm:px-6 sm:py-5.5">
        <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[#24c1c4]/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 left-1/2 h-28 w-44 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-white/12 text-[#63e0e0] ring-1 ring-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,.16)]">
              <Pill className="h-5.5 w-5.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#8fe6e5]">Prescribed medications</p>
              <h3 className="mt-1 text-[18px] font-black tracking-[-.04em] text-white">Medication today</h3>
              <p className="mt-0.5 text-[11px] text-white/60">Keep today&apos;s treatment close and clear.</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-black tracking-[.02em] text-white/75 ring-1 ring-white/15">
            {prescriptions.length} {prescriptions.length === 1 ? "prescription" : "prescriptions"}
          </span>
        </div>
      </header>

      {prescriptions.length === 0 ? (
        <div className="p-5 text-sm text-[#74859a]">No medication is scheduled for today.</div>
      ) : (
        <div className="bg-[#f8fcfc] p-4 sm:p-5">
          {prescriptions.map((medication, index) => {
            const isGoalSetForThisMed = activeGoals.some(
              (goal) =>
                goal.associatedMedicationId === medication.id &&
                goal.status === "IN_PROGRESS",
            );
            const medicationId = medication.id ?? medicationRecordId(medication);
            const goalForThisMedication = isGoalSetForThisMed
              ? activeGoals.find(
                  (goal) =>
                    goal.associatedMedicationId === medication.id &&
                    goal.status === "IN_PROGRESS",
                )
              : undefined;
            const name = medicationName(medication);
            const doctor = medicationDoctor(medication);
            const recordId = medicationRecordId(medication);
            const goalHref = goalForThisMedication?.id
              ? `/health-goals/${encodeURIComponent(goalForThisMedication.id)}`
              : "/health-goals";
            const setupHref = medicationId
              ? `/health-goals/manage?medicationId=${encodeURIComponent(medicationId)}`
              : "/health-goals/manage";

            return (
              <article
                key={recordId || `${name}-${index}`}
                className="mb-4 overflow-hidden rounded-[25px] border border-[#deebee] bg-white shadow-[0_10px_28px_rgba(11,45,84,.055)] last:mb-0"
              >
                <div className="p-5 sm:p-5.5">
                  <div className="flex items-start gap-3.5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#e8f7f7] text-[#087d82] ring-1 ring-[#d4eeee]">
                      <Pill className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-[17px] font-black tracking-[-.035em] text-[#0b2d54]">{name}</h4>
                        <span className="rounded-full bg-[#edf5f7] px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] text-[#6d8190]">Today</span>
                      </div>
                      <p className="mt-1.5 text-[11px] font-black uppercase tracking-[.1em] text-[#0d8589]">{medicationSchedule(medication)}</p>
                      {doctor && <p className="mt-1.5 text-[10px] font-semibold text-[#8595a2]">Prescribed by {doctor}</p>}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[18px] border border-[#e7eff2] bg-[#f8fbfc] px-4 py-3.5">
                    <p className="text-[11px] font-semibold leading-5 text-[#526577]">{medicationInstructions(medication)}</p>
                  </div>

                  <div className="mt-4 border-t border-[#e7eff2] pt-4">
                    {isGoalSetForThisMed ? (
                      <div>
                        <div className="mb-3 flex items-center gap-2 text-[11px] font-bold text-emerald-700">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          This medication is linked to an active health goal.
                        </div>
                        <Link
                          href={goalHref}
                          className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[16px] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100"
                        >
                          View {name} adherence progress &amp; log today&apos;s doses
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-3 rounded-[17px] border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3.5">
                          <p className="text-[11px] font-black text-amber-900">💡 New prescription</p>
                          <p className="mt-1 text-[10px] leading-5 text-amber-800/80">You haven&apos;t set a tracking goal for this medication yet.</p>
                        </div>
                        <Link
                          href={setupHref}
                          className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[17px] bg-[#0b2d54] px-3 py-3 text-[11px] font-black text-white shadow-[0_12px_24px_rgba(11,45,84,.14)] transition hover:bg-[#123d63]"
                        >
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#24c1c4]/15 text-[#63e0e0] ring-1 ring-[#24c1c4]/25">
                            <Target className="h-3.5 w-3.5" />
                          </span>
                          <span>Set a Medication Goal for {name}</span>
                          <ArrowRight className="ml-0.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
