"use client";

import Link from "next/link";
import { ArrowRight, Pill, Target } from "lucide-react";

type PrescribedMedication = {
  id?: string | null;
  patientMedicationId?: string | null;
  medication?: { id?: string | null; name?: string | null; genericName?: string | null } | null;
  name?: string | null;
  dosage?: string | number | null;
  dose?: string | number | null;
  frequency?: string | null;
  schedule?: string | null;
  instructions?: string | null;
  doctorName?: string | null;
  practitioner?: { name?: string | null; firstName?: string | null; lastName?: string | null } | null;
  prescription?: { practitioner?: { name?: string | null; firstName?: string | null; lastName?: string | null } | null; doctorName?: string | null } | null;
};

type ActiveGoal = {
  id?: string | null;
  associatedMedicationId?: string | null;
  medicationId?: string | null;
  patientMedicationId?: string | null;
  status?: string | null;
};

function firstText(...values: unknown[]) {
  const value = values.find((item) => item !== null && item !== undefined && String(item).trim() !== "");
  return value === undefined ? "" : String(value);
}

function medicationRecordId(medication: PrescribedMedication) {
  return firstText(medication.patientMedicationId, medication.id, medication.medication?.id);
}

function medicationName(medication: PrescribedMedication) {
  return firstText(medication.medication?.name, medication.name, medication.medication?.genericName, "Your medicine");
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

function goalMedicationId(goal: ActiveGoal) {
  return firstText(goal.associatedMedicationId, goal.patientMedicationId, goal.medicationId);
}

export default function PrescribedMedicationsCard({ prescriptionsList, activeGoalsArray }: { prescriptionsList: PrescribedMedication[]; activeGoalsArray: ActiveGoal[] }) {
  const prescriptions = Array.isArray(prescriptionsList) ? prescriptionsList : [];
  const activeGoals = Array.isArray(activeGoalsArray) ? activeGoalsArray : [];

  return (
    <section className="mt-3.5 overflow-hidden rounded-[28px] border border-[#dce9ee] bg-white shadow-[0_12px_34px_rgba(11,45,84,.055)]">
      <header className="flex items-center justify-between gap-3 border-b border-[#edf2f5] bg-gradient-to-br from-[#f9fdfd] via-white to-[#eef9f8] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b6f73] ring-1 ring-[#d3efed]"><Pill className="h-5 w-5" /></span>
          <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#0b7b80]">Prescribed medications</p><h3 className="mt-0.5 text-base font-black tracking-[-.035em] text-[#0b2d54]">Medication today</h3></div>
        </div>
        <span className="shrink-0 rounded-full bg-[#f1f6f8] px-2.5 py-1 text-[9px] font-black text-[#71839a]">{prescriptions.length} {prescriptions.length === 1 ? "prescription" : "prescriptions"}</span>
      </header>

      {prescriptions.length === 0 ? (
        <div className="p-5 text-sm text-[#74859a]">No medication is scheduled for today.</div>
      ) : (
        <div className="p-4 sm:p-5">
          {prescriptions.map((medication, index) => {
            const recordId = medicationRecordId(medication);
            const isGoalSetForThisMed = activeGoals.some((goal) => {
              const status = String(goal?.status ?? "").toUpperCase();
              return Boolean(recordId) && goalMedicationId(goal) === recordId && (status === "IN_PROGRESS" || status === "ACTIVE");
            });
            const name = medicationName(medication);
            const doctor = medicationDoctor(medication);
            const goalAnchor = recordId ? `#medication-goal-card-${recordId}` : "#today-goals";

            return (
              <article key={recordId || `${name}-${index}`} className="mb-4 last:mb-0 rounded-[24px] border border-[#e6eef1] bg-white p-5 shadow-[0_6px_20px_rgba(11,45,84,.035)]">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1f6f8] text-[#0b2d54]"><Pill className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1"><h4 className="text-sm font-black text-slate-900">{name}</h4><p className="mt-1 text-xs font-semibold uppercase tracking-[.04em] text-slate-500">{medicationSchedule(medication)}</p>{doctor && <p className="mt-1 text-[10px] font-semibold text-[#80909e]">Prescribed by {doctor}</p>}</div>
                </div>

                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-700">{medicationInstructions(medication)}</p>

                <div className="mt-4 border-t border-dashed border-[#dfe8ec] pt-3.5">
                  {isGoalSetForThisMed ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-500">🟢 This medication is linked to an active health goal.</p>
                      <Link href={goalAnchor} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100">
                        View your Adherence Progress &amp; Log Today&apos;s Doses <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2 rounded-xl bg-amber-50/70 p-3 text-xs font-semibold leading-5 text-amber-800">💡 New Prescription! You haven&apos;t set a tracking goal for this medication yet.</p>
                      <Link href="/health-goals" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-3 py-2.5 text-xs font-black text-white shadow-[0_9px_22px_rgba(11,45,84,.12)] transition hover:bg-[#123d63]">
                        <Target className="h-3.5 w-3.5 text-[#24c1c4]" />
                        Set a Medication Goal for {name} +
                      </Link>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
