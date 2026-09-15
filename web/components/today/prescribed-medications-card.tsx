"use client";

import Link from "next/link";
import { ArrowRight, Pill, Target } from "lucide-react";

type PrescribedMedication = {
  id?: string | null;
  patientMedicationId?: string | null;
  medicationId?: string | null;
  patientMedication?: { id?: string | null } | null;
  medication?: { id?: string | null; medicationId?: string | null; name?: string | null; genericName?: string | null; brandName?: string | null } | null;
  name?: string | null;
  dosage?: string | number | null;
  dose?: string | number | null;
  frequency?: string | null;
  schedule?: string | null;
  source?: string | null;
};

type HealthGoal = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  associatedMedicationId?: string | null;
  patientMedicationId?: string | null;
  medicationId?: string | null;
  associatedMedication?: { id?: string | null } | null;
  patientMedication?: { id?: string | null } | null;
  medication?: { id?: string | null; name?: string | null; genericName?: string | null; brandName?: string | null } | null;
  metricConfig?: { metricType?: string | null; metricKey?: string | null } | null;
};

const ACTIVE_GOAL_STATUSES = new Set(["ACTIVE", "IN_PROGRESS", "ON_TRACK", "IMPROVING", "STAGNANT", "DECLINING"]);

function firstText(...values: unknown[]) {
  const value = values.find((item) => item !== null && item !== undefined && String(item).trim() !== "");
  return value === undefined ? "" : String(value);
}

function medicationName(medication: PrescribedMedication) {
  return firstText(medication.medication?.name, medication.name, medication.medication?.genericName, medication.medication?.brandName, "Your medicine");
}

function medicationSchedule(medication: PrescribedMedication) {
  const dose = firstText(medication.dosage, medication.dose, "Dose not recorded");
  const frequency = firstText(medication.frequency, medication.schedule, "Schedule not recorded").replaceAll("_", " ");
  return `${dose} · ${frequency}`;
}

function medicationIds(medication: PrescribedMedication) {
  return [
    medication.patientMedicationId,
    medication.patientMedication?.id,
    medication.id,
    medication.medicationId,
    medication.medication?.id,
    medication.medication?.medicationId,
  ].filter(Boolean).map(String);
}

function goalMedicationIds(goal: HealthGoal) {
  return [
    goal.associatedMedicationId,
    goal.patientMedicationId,
    goal.medicationId,
    goal.associatedMedication?.id,
    goal.patientMedication?.id,
    goal.medication?.id,
  ].filter(Boolean).map(String);
}

function normalise(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function goalMedicationNames(goal: HealthGoal) {
  return [
    goal.medication?.name,
    goal.medication?.genericName,
    goal.medication?.brandName,
    goal.title,
    goal.description,
  ].filter(Boolean).map(normalise).filter(Boolean);
}

function findMedicationGoal(medication: PrescribedMedication, goals: HealthGoal[]) {
  const ids = new Set(medicationIds(medication));
  const name = normalise(medicationName(medication));
  if (!ids.size && !name) return null;

  return goals.find((goal) => {
    const category = String(goal?.category ?? "").toUpperCase();
    const status = String(goal?.status ?? "").toUpperCase();
    const metricKey = String(goal?.metricConfig?.metricKey ?? "").toLowerCase();
    const isMedicationGoal = category === "MEDICATION" || metricKey === "medication.adherence";
    if (!isMedicationGoal || !ACTIVE_GOAL_STATUSES.has(status)) return false;

    const linkedIds = goalMedicationIds(goal);
    if (linkedIds.some((id) => ids.has(id))) return true;

    const goalNames = goalMedicationNames(goal);
    return Boolean(name && goalNames.some((goalName) => goalName === name || goalName.includes(name) || name.includes(goalName)));
  }) ?? null;
}

function medicationGoalAnchor(goal: HealthGoal) {
  return goal.id ? `/health-goals#goal-${encodeURIComponent(String(goal.id))}` : "/health-goals";
}

function setMedicationGoalHref(medication: PrescribedMedication) {
  const params = new URLSearchParams();
  params.set("open", "medication");
  const medicationId = medication.patientMedicationId || medication.patientMedication?.id || medication.id || medication.medicationId || medication.medication?.id || medication.medication?.medicationId;
  if (medicationId) params.set("medicationId", String(medicationId));
  params.set("name", medicationName(medication));
  params.set("dosage", firstText(medication.dosage, medication.dose, ""));
  params.set("frequency", firstText(medication.frequency, medication.schedule, ""));
  return `/health-goals?${params.toString()}`;
}

export default function PrescribedMedicationsCard({
  prescriptionsList,
  activeGoalsArray = [],
}: {
  prescriptionsList: PrescribedMedication[];
  activeGoalsArray?: HealthGoal[];
}) {
  const medications = Array.isArray(prescriptionsList) ? prescriptionsList : [];
  const goals = Array.isArray(activeGoalsArray) ? activeGoalsArray : [];

  return (
    <section className="mt-3.5 overflow-hidden rounded-[30px] border border-[#d8e9ed] bg-white shadow-[0_18px_48px_rgba(11,45,84,.07)]">
      <header className="relative overflow-hidden border-b border-[#e6eff2] bg-gradient-to-br from-[#08284a] via-[#0c3f68] to-[#0f6178] px-5 py-5 text-white sm:px-6">
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-white/12 text-[#63e0e0] ring-1 ring-white/20"><Pill className="h-5 w-5" /></span>
            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#8fe6e5]">Prescribed medications</p><h3 className="mt-1 text-[18px] font-black tracking-[-0.04em] text-white">Medication today</h3><p className="mt-0.5 text-[11px] text-white/60">Keep today&apos;s treatment close and clear.</p></div>
          </div>
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-black text-white/75 ring-1 ring-white/15">{medications.length} {medications.length === 1 ? "medication" : "medications"}</span>
        </div>
      </header>

      {medications.length === 0 ? <div className="p-5 text-sm text-[#74859a]">No medication is scheduled for today.</div> : (
        <div className="bg-[#f8fcfc] px-4 py-3 sm:px-5">
          <div className="divide-y divide-[#e6eff2]">
            {medications.map((medication, index) => {
              const name = medicationName(medication);
              const goal = findMedicationGoal(medication, goals);
              const isClinicPrescription = String(medication.source ?? "").toUpperCase() === "PRESCRIPTION";
              const href = goal ? medicationGoalAnchor(goal) : setMedicationGoalHref(medication);
              return <div key={medication.patientMedicationId || medication.patientMedication?.id || medication.id || medication.medicationId || `${name}-${index}`} className="flex flex-col gap-3 py-4 first:pt-2 last:pb-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f7f7] text-[#087d82] ring-1 ring-[#d4eeee]"><Pill className="h-4 w-4" /></span>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="text-[15px] font-black tracking-[-.025em] text-[#0b2d54]">{name}</h4>{isClinicPrescription && <span className="rounded-full bg-[#edf4ff] px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] text-[#315b88]">Clinic prescription</span>}</div><p className="mt-1 text-[11px] font-black uppercase tracking-[.08em] text-[#0d8589]">{medicationSchedule(medication)}</p></div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-[#71839a] ring-1 ring-[#e1ecef]">Today</span>
                  <Link href={href} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#d7e4e8] bg-white px-3 py-2 text-[10px] font-black text-[#0b2d54] transition hover:border-[#24c1c4] hover:bg-[#f2fbfb]" aria-label={goal ? `View the active medication goal for ${name}` : `Set a medication goal for ${name}`}>
                    <Target className="h-3.5 w-3.5 text-[#0b7d82]" />
                    {goal ? "View Goal" : "Set medication goal"}
                  </Link>
                </div>
              </div>;
            })}
          </div>
          <div className="mt-2 border-t border-[#e2ecef] pt-4"><Link href="/medications" className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[16px] bg-[#0b2d54] px-4 py-2.5 text-[11px] font-black text-white shadow-[0_10px_22px_rgba(11,45,84,.12)] transition hover:bg-[#123d63]">View and manage medications<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link></div>
        </div>
      )}
    </section>
  );
}
