"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  FileText,
  Pill,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { MedicationReminderButton } from "@/components/medications/MedicationReminderButton";

function formatEnum(value: unknown) {
  if (!value) return "Not specified";

  return String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function MedicationsPage() {
  const { data, loading } = useDashboard();

  const medications = Array.isArray(data?.medications)
    ? data.medications
    : [];

  const activeMedications = medications.filter(
    (medication: any) =>
      medication?.ongoing === true ||
      medication?.status === "ACTIVE",
  );

  return (
    <main className="min-h-screen bg-[#F7F9FC]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#0B5CAD] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EAF3FB] px-3 py-1 text-xs font-semibold text-[#0B5CAD]">
              <Pill className="h-3.5 w-3.5" />
              My health
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Medications
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Keep track of your current medicines, doses, schedules and prescribing information.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B5CAD] px-4 py-3 text-sm font-semibold text-white hover:bg-[#084987]"
          >
            <Plus className="h-4 w-4" />
            Add medication
          </button>
        </div>

        {loading && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Loading your medications...
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Pill className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">{activeMedications.length}</p>
            <p className="mt-1 text-sm text-slate-500">Current medications</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Clock3 className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">{activeMedications.length}</p>
            <p className="mt-1 text-sm text-slate-500">Active treatment plans</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <FileText className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">{medications.length}</p>
            <p className="mt-1 text-sm text-slate-500">Medication records</p>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Current medications</h2>
            <p className="mt-1 text-sm text-slate-500">
              Medicines currently marked as active.
            </p>
          </div>

          {activeMedications.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Pill className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">No current medications</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                You do not currently have any active medications recorded in your health profile.
              </p>
              <button
                type="button"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B2D54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#092541]"
              >
                <Plus className="h-4 w-4" />
                Add medication
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeMedications.map((medication: any) => {
                const medicationName =
                  medication?.medication?.name ||
                  medication?.medication?.genericName ||
                  medication?.name ||
                  "Medication";

                return (
                  <div
                    key={medication?.id ?? medicationName}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Pill className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{medicationName}</h3>
                            <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                              Active
                            </span>
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                        </div>

                        <div className="mt-4 space-y-2">
                          <p className="text-sm text-slate-600">
                            <span className="font-medium text-slate-700">Dose:</span>{" "}
                            {medication?.dosage || "Not specified"}
                          </p>
                          <p className="text-sm text-slate-600">
                            <span className="font-medium text-slate-700">Frequency:</span>{" "}
                            {formatEnum(medication?.frequency)}
                          </p>
                          {medication?.prescribedBy && (
                            <p className="text-sm text-slate-600">
                              <span className="font-medium text-slate-700">Prescribed by:</span>{" "}
                              {medication.prescribedBy}
                            </p>
                          )}
                        </div>

                        {medication?.id && (
                          <MedicationReminderButton
                            medicationId={medication.id}
                            medicationName={medicationName}
                            dosage={medication?.dosage}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-8 rounded-2xl border border-[#D8E7F4] bg-[#F5FAFE] p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0B5CAD]" />
            <div>
              <h3 className="font-semibold text-slate-900">Keep your medication list up to date</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Always check medication changes with your healthcare professional. Sympto does not replace professional medical advice.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 pb-6 text-center text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4" />
          Your health information is private and protected.
        </div>
      </div>
    </main>
  );
}
