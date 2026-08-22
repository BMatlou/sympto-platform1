"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Droplets,
  HeartPulse,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";

function formatEnum(value: unknown) {
  if (!value) return "Not recorded";

  return String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function InfoCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-900">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

export default function HealthPassportPage() {
  const { data, loading } = useDashboard();

  const profile = data?.profile ?? null;
  const patient = data?.patient ?? null;

  const healthPassport =
    data?.healthPassport ??
    patient?.healthPassport ??
    null;

  const allergies = Array.isArray(data?.allergies)
    ? data.allergies
    : [];

  const conditions = Array.isArray(data?.conditions)
    ? data.conditions
    : [];

  const emergencyContacts = Array.isArray(
    data?.emergencyContacts,
  )
    ? data.emergencyContacts
    : [];

  const firstName =
    profile?.preferredName ||
    profile?.firstName ||
    "Patient";

  const lastName = profile?.lastName || "";

  const fullName =
    [firstName, lastName]
      .filter(Boolean)
      .join(" ") || "Patient";

  const activeAllergies = allergies.filter(
    (allergy: any) =>
      allergy?.status === "ACTIVE" ||
      !allergy?.status,
  );

  const activeConditions = conditions.filter(
    (condition: any) =>
      condition?.status === "ACTIVE" &&
      !condition?.resolvedAt,
  );

  return (
    <main className="min-h-screen bg-[#F7F9FC]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Back */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#0B5CAD] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EAF3FB] px-3 py-1 text-xs font-semibold text-[#0B5CAD]">
            <ShieldCheck className="h-3.5 w-3.5" />
            My health
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Health passport
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Your essential health information in one place,
            ready to reference when you need it.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Loading your health passport...
          </div>
        )}

        {/* Identity */}
        <section className="mb-6">
          <div className="overflow-hidden rounded-2xl bg-[#0B2D54] p-6 text-white sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <UserRound className="h-8 w-8" />
              </div>

              <div>
                <p className="text-sm text-slate-300">
                  Health passport for
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  {fullName}
                </h2>

                {profile?.dateOfBirth && (
                  <p className="mt-2 text-sm text-slate-300">
                    Date of birth:{" "}
                    {profile.dateOfBirth}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Blood information */}
        <section className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Blood information
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Droplets className="h-5 w-5" />
              </div>

              <p className="mt-4 text-xs font-medium text-slate-400">
                Blood type
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {healthPassport?.bloodType
                  ? formatEnum(
                      healthPassport.bloodType,
                    )
                  : "Not recorded"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <HeartPulse className="h-5 w-5" />
              </div>

              <p className="mt-4 text-xs font-medium text-slate-400">
                Rhesus factor
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {healthPassport?.rhesusFactor
                  ? formatEnum(
                      healthPassport.rhesusFactor,
                    )
                  : "Not recorded"}
              </p>
            </div>
          </div>
        </section>

        {/* Passport details */}
        <section className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Important information
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard
              label="Organ donor"
              value={
                healthPassport?.organDonor
                  ? "Yes"
                  : healthPassport?.organDonor === false
                    ? "No"
                    : "Not recorded"
              }
              description="Organ donation preference"
            />

            <InfoCard
              label="Allergies"
              value={String(
                activeAllergies.length,
              )}
              description={
                activeAllergies.length === 0
                  ? "No active allergies recorded"
                  : "Active allergies recorded"
              }
            />

            <InfoCard
              label="Health conditions"
              value={String(
                activeConditions.length,
              )}
              description={
                activeConditions.length === 0
                  ? "No active conditions recorded"
                  : "Active conditions recorded"
              }
            />

            <InfoCard
              label="Emergency contacts"
              value={String(
                emergencyContacts.length,
              )}
              description="Contacts available in an emergency"
            />
          </div>
        </section>

        {/* Allergies */}
        <section className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Allergies
          </h2>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            {activeAllergies.length === 0 ? (
              <p className="text-sm text-slate-500">
                No allergies are currently recorded.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeAllergies.map(
                  (allergy: any) => (
                    <span
                      key={
                        allergy?.id ??
                        allergy?.name
                      }
                      className="rounded-full bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600"
                    >
                      {allergy?.allergy?.name ||
                        allergy?.name ||
                        "Allergy"}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
        </section>

        {/* Conditions */}
        <section className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Active conditions
          </h2>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            {activeConditions.length === 0 ? (
              <p className="text-sm text-slate-500">
                No active health conditions are currently
                recorded.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeConditions.map(
                  (condition: any) => (
                    <div
                      key={
                        condition?.id ??
                        condition?.name
                      }
                      className="rounded-xl bg-slate-50 p-4"
                    >
                      <p className="font-medium text-slate-900">
                        {condition?.condition?.name ||
                          condition?.name ||
                          "Health condition"}
                      </p>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </section>

        {/* Privacy */}
        <div className="mt-8 rounded-2xl border border-[#D8E7F4] bg-[#F5FAFE] p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0B5CAD]" />

            <div>
              <h3 className="font-semibold text-slate-900">
                Your health passport is private
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Keep this information accurate and up to
                date. Always confirm important medical
                information with your healthcare professional
                when necessary.
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