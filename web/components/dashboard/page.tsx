"use client";

import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  Heart,
  HeartPulse,
  Lightbulb,
  Pill,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  UserRound,
  Users,
} from "lucide-react";

import ProtectedRoute from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { useDashboard } from "@/hooks/use-dashboard";

import Link from "next/link";


/*
 * =========================================================
 * LOCAL HELPERS
 * =========================================================
 *
 * These intentionally live in this file because your current
 * lib/utils.ts only exports `cn`.
 */

function formatEnum(value: unknown): string {
  if (!value) return "Not specified";

  return String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: unknown): string {
  if (!value) return "Date not available";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDisplayName(user: any): string {
  return (
    user?.preferredName ||
    user?.firstName ||
    user?.name ||
    user?.fullName ||
    user?.email?.split("@")[0] ||
    "there"
  );
}

/*
 * =========================================================
 * LOCAL DASHBOARD COMPONENTS
 * =========================================================
 */

function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">
        {title}
      </h2>

      {action && (
        <button
          type="button"
          onClick={onAction}
          className="text-sm font-semibold text-[#0B5CAD] hover:text-[#084987]"
        >
          {action}
        </button>
      )}
    </div>
  );
}

function EmptyCard({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: any;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F1FA] text-[#0B5CAD]">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-4 font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-5 text-slate-500">
        {description}
      </p>

      {action && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 text-sm font-semibold text-[#0B5CAD] hover:text-[#084987]"
        >
          {action}
        </button>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconClassName,
  iconBackground,
  label,
  value,
  description,
}: {
  icon: any;
  iconClassName: string;
  iconBackground: string;
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBackground} ${iconClassName}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <span className="text-xs font-medium text-slate-400">
          {label}
        </span>
      </div>

      <p className="mt-5 text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

/*
 * =========================================================
 * DASHBOARD PAGE
 * =========================================================
 */

export default function DashboardPage() {
  const {
    user,
    isAuthLoaded,
  } = useAuth();

  const {
    data: dashboard,
    loading: dashboardLoading,
    reload,
  } = useDashboard();

  /*
   * -------------------------------------------------------
   * REAL DASHBOARD DATA
   * -------------------------------------------------------
   */

  const profile = dashboard?.profile ?? null;
  const patient = dashboard?.patient ?? null;

  const healthPassport =
    dashboard?.healthPassport ??
    patient?.healthPassport ??
    null;

  const allergies = Array.isArray(dashboard?.allergies)
    ? dashboard.allergies
    : [];

  const conditions = Array.isArray(dashboard?.conditions)
    ? dashboard.conditions
    : [];

  const medications = Array.isArray(dashboard?.medications)
    ? dashboard.medications
    : [];

  const immunizations = Array.isArray(
    dashboard?.immunizations,
  )
    ? dashboard.immunizations
    : [];

  const healthGoals = Array.isArray(
    dashboard?.healthGoals,
  )
    ? dashboard.healthGoals
    : [];

  const emergencyContacts = Array.isArray(
    dashboard?.emergencyContacts,
  )
    ? dashboard.emergencyContacts
    : [];

  const symptoms = Array.isArray(dashboard?.symptoms)
    ? dashboard.symptoms
    : [];

  const appointments = Array.isArray(
    dashboard?.appointments,
  )
    ? dashboard.appointments
    : [];

  const journalSettings =
    dashboard?.healthJournalSettings ??
    patient?.healthJournalSettings ??
    null;

  /*
   * -------------------------------------------------------
   * PROFILE
   * -------------------------------------------------------
   */

  const firstName =
    profile?.preferredName ||
    profile?.firstName ||
    getDisplayName(user);

  const lastName = profile?.lastName || "";

  const fullName =
    [firstName, lastName]
      .filter(Boolean)
      .join(" ") || "there";

  /*
   * -------------------------------------------------------
   * COUNTS
   * -------------------------------------------------------
   */

  const symptomCount = symptoms.length;

  const appointmentCount = appointments.length;

  const activeMedications = medications.filter(
    (medication: any) =>
      medication?.ongoing === true ||
      medication?.status === "ACTIVE",
  );

  const medicationCount = activeMedications.length;

  const activeHealthGoals = healthGoals.filter(
    (goal: any) => goal?.status === "ACTIVE",
  );

  const healthGoalCount = activeHealthGoals.length;

  const allergyCount = allergies.filter(
    (allergy: any) =>
      allergy?.status === "ACTIVE" ||
      !allergy?.status,
  ).length;

  const activeConditions = conditions.filter(
    (condition: any) =>
      condition?.status === "ACTIVE" &&
      !condition?.resolvedAt,
  );

  const activeConditionCount = activeConditions.length;

  const emergencyContactCount =
    emergencyContacts.length;

  const immunizationCount = immunizations.length;

  /*
   * -------------------------------------------------------
   * NEXT APPOINTMENT
   * -------------------------------------------------------
   */

  const nextAppointment = appointments[0] ?? null;

  /*
   * -------------------------------------------------------
   * DISPLAY VALUES
   * -------------------------------------------------------
   */

  const medicationNames = activeMedications
    .map(
      (medication: any) =>
        medication?.medication?.name ||
        medication?.medication?.genericName ||
        medication?.name,
    )
    .filter(Boolean);

  const allergyNames = allergies
    .map(
      (allergy: any) =>
        allergy?.allergy?.name ||
        allergy?.name,
    )
    .filter(Boolean);

  const conditionNames = activeConditions
    .map(
      (condition: any) =>
        condition?.condition?.name ||
        condition?.name,
    )
    .filter(Boolean);

  /*
   * -------------------------------------------------------
   * ACTIONS
   * -------------------------------------------------------
   */

  const handleBookAppointment = () => {
    window.location.href = "/appointments";
  };

  const handleJournal = () => {
    window.location.href = "/journal";
  };

  const handleMedications = () => {
    window.location.href = "/medications";
  };

  const handleHealthRecords = () => {
    window.location.href = "/health-records";
  };

  const handleGoals = () => {
    window.location.href = "/health-goals";
  };

  const handleContacts = () => {
    window.location.href = "/emergency-contacts";
  };

  const handlePassport = () => {
    window.location.href = "/health-passport";
  };

  /*
   * -------------------------------------------------------
   * LOADING
   * -------------------------------------------------------
   */

  if (!isAuthLoaded || dashboardLoading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#F7F9FC]">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <img
                src="/logo-navbar.png"
                alt="Sympto"
                className="h-12 w-auto object-contain sm:h-14"
              />

              <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8">
              <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />

              <div className="mt-4 h-10 w-80 animate-pulse rounded-lg bg-slate-200" />

              <div className="mt-3 h-5 w-full max-w-2xl animate-pulse rounded bg-slate-200" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  /*
   * -------------------------------------------------------
   * PAGE
   * -------------------------------------------------------
   */

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#F7F9FC]">
        {/* =================================================
            TOP NAVIGATION
        ================================================== */}

        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <img
                src="/logo-navbar.png"
                alt="Sympto"
                className="h-12 w-auto object-contain sm:h-14"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Notifications"
                className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <Bell className="h-5 w-5" />
              </button>

              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F1FA] text-[#0B5CAD]">
                  <UserRound className="h-4 w-4" />
                </div>

                <span className="hidden sm:inline">
                  {firstName}
                </span>

                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* =================================================
              PAGE HEADING
          ================================================== */}

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EAF3FB] px-3 py-1 text-xs font-semibold text-[#0B5CAD]">
                <Heart className="h-3.5 w-3.5" />
                My health
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Good morning, {firstName}
              </h1>

              <p className="mt-2 max-w-2xl text-slate-500">
                Keep track of your health, appointments,
                records and everything you need for better
                care.
              </p>
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm sm:w-auto sm:min-w-64"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F1FA] text-[#0B5CAD]">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Viewing health for
                  </p>

                  <p className="font-semibold text-slate-900">
                    {fullName} · Me
                  </p>
                </div>
              </div>

              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {/* =================================================
              ERROR / EMPTY DASHBOARD
          ================================================== */}

          {!dashboard && (
            <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-amber-900">
                    We could not load your health information
                  </h2>

                  <p className="mt-1 text-sm text-amber-700">
                    Please try again. Your account and health
                    information have not been changed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={reload}
                  className="rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-950"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* =================================================
              HEALTH OVERVIEW
          ================================================== */}

          <section className="mb-8">
            <SectionHeading title="Your health at a glance" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={HeartPulse}
                iconClassName="text-rose-600"
                iconBackground="bg-rose-50"
                label="Health journal"
                value={symptomCount}
                description="Symptoms logged"
              />

              <StatCard
                icon={CalendarDays}
                iconClassName="text-blue-600"
                iconBackground="bg-blue-50"
                label="Appointments"
                value={appointmentCount}
                description="Upcoming appointments"
              />

              <StatCard
                icon={Pill}
                iconClassName="text-emerald-600"
                iconBackground="bg-emerald-50"
                label="Medications"
                value={medicationCount}
                description="Current medications"
              />

              <StatCard
                icon={Target}
                iconClassName="text-violet-600"
                iconBackground="bg-violet-50"
                label="Goals"
                value={healthGoalCount}
                description="Active health goals"
              />
            </div>
          </section>

          {/* =================================================
              QUICK ACTIONS
          ================================================== */}

          <section className="mb-8">
  <SectionHeading title="What would you like to do?" />

  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <Link
      href="/health-journal"
      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#BFD8EE] hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
        <Activity className="h-5 w-5" />
      </div>

      <p className="mt-3 font-semibold text-slate-900">
        Log a symptom
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Add how you are feeling
      </p>
    </Link>

    <Link
      href="/appointments"
      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#BFD8EE] hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <CalendarDays className="h-5 w-5" />
      </div>

      <p className="mt-3 font-semibold text-slate-900">
        Book appointment
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Find healthcare
      </p>
    </Link>

    <Link
      href="/medications"
      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#BFD8EE] hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        <Pill className="h-5 w-5" />
      </div>

      <p className="mt-3 font-semibold text-slate-900">
        Add medication
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Keep your list updated
      </p>
    </Link>

    <Link
      href="/health-records"
      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#BFD8EE] hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        <FileText className="h-5 w-5" />
      </div>

      <p className="mt-3 font-semibold text-slate-900">
        Add health record
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Upload or record information
      </p>
    </Link>
  </div>
</section>

          {/* =================================================
              HEALTH SNAPSHOT
          ================================================== */}

          <section className="mb-8">
            <SectionHeading title="Your health snapshot" />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium text-slate-400">
                  Blood type
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {healthPassport?.bloodType
                    ? formatEnum(
                        healthPassport.bloodType,
                      )
                    : "—"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Rhesus:{" "}
                  {healthPassport?.rhesusFactor
                    ? formatEnum(
                        healthPassport.rhesusFactor,
                      )
                    : "Not specified"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium text-slate-400">
                  Allergies
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {allergyCount}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {allergyNames.length > 0
                    ? allergyNames.join(", ")
                    : "No allergies recorded"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium text-slate-400">
                  Conditions
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {activeConditionCount}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {conditionNames.length > 0
                    ? conditionNames.join(", ")
                    : "No active conditions"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium text-slate-400">
                  Immunisations
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {immunizationCount}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Recorded immunisations
                </p>
              </div>
            </div>
          </section>

          {/* =================================================
              APPOINTMENT + HEALTH INSIGHTS
          ================================================== */}

          <section className="mb-8 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <SectionHeading
                title="Next appointment"
                action="View all"
                onAction={handleBookAppointment}
              />

              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#0B5CAD] shadow-sm">
                  <Stethoscope className="h-6 w-6" />
                </div>

                {nextAppointment ? (
                  <>
                    <h3 className="mt-4 font-semibold text-slate-900">
                      Appointment scheduled
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {formatDate(
                        nextAppointment?.date ||
                          nextAppointment?.startTime ||
                          nextAppointment?.scheduledAt,
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="mt-4 font-semibold text-slate-900">
                      No upcoming appointment
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      When you book an appointment, you will
                      see the practitioner, time and
                      appointment details here.
                    </p>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleBookAppointment}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0B2D54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#092541]"
                >
                  <CalendarDays className="h-4 w-4" />
                  Book an appointment
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#D8E7F4] bg-[#F5FAFE] p-6">
              <SectionHeading title="Health insights" />

              <div className="rounded-2xl border border-[#D8E7F4] bg-white p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F1FA] text-[#0B5CAD]">
                  <Sparkles className="h-6 w-6" />
                </div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  Your health assistant is ready
                </h3>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  As you add symptoms, medications,
                  measurements and journal entries, Sympto
                  can help you notice patterns and surface
                  useful health insights.
                </p>

                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0B5CAD]"
                >
                  <Lightbulb className="h-4 w-4" />
                  Learn about health insights
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          {/* =================================================
              MEDICATIONS
          ================================================== */}

          <section className="mb-8">
            <SectionHeading title="Current medications" />

            {activeMedications.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">
                  No current medications recorded.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeMedications.map(
                  (medication: any) => (
                    <div
                      key={medication.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <Pill className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900">
                            {medication?.medication?.name ||
                              medication?.medication
                                ?.genericName ||
                              medication?.name ||
                              "Medication"}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {medication?.dosage ||
                              "Dose not specified"}
                            {" · "}
                            {medication?.frequency
                              ? formatEnum(
                                  medication.frequency,
                                )
                              : "Frequency not specified"}
                          </p>

                          {medication?.prescribedBy && (
                            <p className="mt-2 text-xs text-slate-400">
                              Prescribed by{" "}
                              {medication.prescribedBy}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          {/* =================================================
              HEALTH JOURNAL
          ================================================== */}

          <section className="mb-8">
            <Link href="/health-journal" className="block">
  <SectionHeading
    title="Health journal"
    action="Open journal"
  />
</Link>

            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <ClipboardList className="h-7 w-7" />
                </div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  Your health story starts here
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Record symptoms, how you are feeling,
                  medications, measurements and notes. Over
                  time, this becomes a useful picture of your
                  health.
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {journalSettings?.trackSymptoms && (
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">
                      Symptoms
                    </span>
                  )}

                  {journalSettings?.trackMood && (
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-600">
                      Mood
                    </span>
                  )}

                  {journalSettings?.trackSleep && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                      Sleep
                    </span>
                  )}

                  {journalSettings?.trackWater && (
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-600">
                      Water
                    </span>
                  )}

                  {journalSettings?.trackExercise && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                      Exercise
                    </span>
                  )}

                  {journalSettings?.trackVitals && (
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">
                      Vitals
                    </span>
                  )}
                </div>

                <Link
  href="/health-journal"
  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B5CAD] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#084987]"
>
  <Plus className="h-4 w-4" />
  Make your first entry
</Link>
              </div>
            </div>
          </section>

          {/* =================================================
              HEALTH INFORMATION
          ================================================== */}

          <section className="mb-8">
  <SectionHeading title="Your health information" />

  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

    {/* Health records */}
    <Link href="/health-records" className="block">
      <EmptyCard
        icon={FileText}
        title="Health records"
        description={`${activeConditionCount} active condition${
          activeConditionCount === 1 ? "" : "s"
        } recorded.`}
        action="View records"
      />
    </Link>

    {/* Health conditions */}
    <Link href="/health-conditions" className="block">
      <EmptyCard
        icon={Activity}
        title="Health conditions"
        description={`${activeConditionCount} active condition${
          activeConditionCount === 1 ? "" : "s"
        } recorded.`}
        action="View conditions"
      />
    </Link>

    {/* Medications */}
    <Link href="/medications" className="block">
      <EmptyCard
        icon={Pill}
        title="Medications"
        description={`${medicationCount} current medication${
          medicationCount === 1 ? "" : "s"
        } recorded.`}
        action="Manage medications"
      />
    </Link>

    {/* Health passport */}
    <Link href="/health-passport" className="block">
      <EmptyCard
        icon={ShieldCheck}
        title="Health passport"
        description={
          healthPassport?.bloodType
            ? `Blood type: ${formatEnum(
                healthPassport.bloodType,
              )}. Organ donor: ${
                healthPassport.organDonor
                  ? "Yes"
                  : "No"
              }.`
            : "Your important health passport information."
        }
        action="View health passport"
      />
    </Link>

    {/* Tests & results */}
    <Link href="/tests-results" className="block">
      <EmptyCard
        icon={Activity}
        title="Tests & results"
        description="Keep track of laboratory results and imaging studies as they become available."
        action="View results"
      />
    </Link>

    {/* Health goals */}
    <Link href="/health-goals" className="block">
      <EmptyCard
        icon={Target}
        title="Health goals"
        description={`${healthGoalCount} active health goal${
          healthGoalCount === 1 ? "" : "s"
        }.`}
        action="Manage goals"
      />
    </Link>

    {/* Emergency contacts */}
    <Link href="/emergency-contacts" className="block">
      <EmptyCard
        icon={Users}
        title="Emergency contacts"
        description={`${emergencyContactCount} emergency contact${
          emergencyContactCount === 1 ? "" : "s"
        } on file.`}
        action="Manage contacts"
      />
    </Link>

  </div>
</section>

          {/* =================================================
              HEALTH GOALS
          ================================================== */}

          <section className="mb-8">
            <SectionHeading title="Your health goals" />

            {activeHealthGoals.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">
                  You have not added any active health goals
                  yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeHealthGoals.map((goal: any) => (
                  <div
                    key={goal.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                        <Target className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900">
                            {goal.title ||
                              "Health goal"}
                          </h3>

                          {goal.priority && (
                            <span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600">
                              {formatEnum(
                                goal.priority,
                              )}
                            </span>
                          )}
                        </div>

                        {goal.description && (
                          <p className="mt-1 text-sm text-slate-500">
                            {goal.description}
                          </p>
                        )}

                        {goal.targetValue !==
                          undefined &&
                          goal.targetValue !== null && (
                            <p className="mt-3 text-sm font-medium text-slate-700">
                              Target: {goal.targetValue}{" "}
                              {goal.unit || ""}
                            </p>
                          )}

                        {goal.targetDate && (
                          <p className="mt-1 text-xs text-slate-400">
                            Target date:{" "}
                            {formatDate(
                              goal.targetDate,
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* =================================================
              EMERGENCY CONTACTS
          ================================================== */}

          <section className="mb-8">
            <SectionHeading title="Emergency contacts" />

            {emergencyContacts.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">
                  No emergency contacts are currently on
                  file.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {emergencyContacts.map(
                  (contact: any) => (
                    <div
                      key={contact.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <Users className="h-5 w-5" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {contact.fullName ||
                                contact.name ||
                                "Emergency contact"}
                            </h3>

                            {contact.isPrimary && (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600">
                                Primary
                              </span>
                            )}
                          </div>

                          {contact.relationship && (
                            <p className="mt-1 text-sm text-slate-500">
                              {formatEnum(
                                contact.relationship,
                              )}
                            </p>
                          )}

                          {contact.phoneNumber && (
                            <p className="mt-2 text-sm font-medium text-slate-700">
                              {contact.phoneNumber}
                            </p>
                          )}

                          {contact.email && (
                            <p className="mt-1 text-sm text-slate-500">
                              {contact.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          {/* =================================================
              FAMILY
          ================================================== */}

          <section className="mb-8">
            <div className="overflow-hidden rounded-2xl bg-[#0B2D54] p-6 text-white sm:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <Users className="h-5 w-5" />
                  </div>

                  <h2 className="text-xl font-semibold">
                    Looking after someone else?
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                    Add a family member to your account so
                    you can help manage appointments, health
                    records, medications and more — with the
                    appropriate permissions.
                  </p>
                </div>

                <button
                  type="button"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0B2D54] hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                  Add family member
                </button>
              </div>
            </div>
          </section>

          {/* =================================================
              FOOTER
          ================================================== */}

          <div className="flex items-center justify-center gap-2 pb-6 text-center text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4" />
            Your health information is private and protected.
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}