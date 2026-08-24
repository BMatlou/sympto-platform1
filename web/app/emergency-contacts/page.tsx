"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Phone, Plus, RefreshCw, ShieldAlert, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "@/hooks/use-dashboard";

type EmergencyContact = {
  id?: string;
  fullName?: string | null;
  relationship?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  isPrimary?: boolean;
};

function formatRelationship(value: unknown) {
  if (!value) return "Relationship not specified";
  return String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function EmergencyContactsPage() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");
  const { data: dashboard, loading, error, reload } = useDashboard();

  const emergencyContacts = (dashboard?.emergencyContacts ?? []) as EmergencyContact[];
  const dashboardHref = patientId
    ? `/dashboard?patientId=${encodeURIComponent(patientId)}`
    : "/dashboard";
  const onboardingHref = patientId
    ? `/onboarding?patientId=${encodeURIComponent(patientId)}`
    : "/onboarding";
  const patientName = dashboard?.patient?.name ||
    [dashboard?.profile?.preferredName || dashboard?.profile?.firstName, dashboard?.profile?.lastName]
      .filter(Boolean)
      .join(" ");

  return (
    <main className="min-h-screen bg-[#F7F9FC]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href={dashboardHref} className="inline-flex items-center gap-2 text-sm font-medium text-[#0B2D54] hover:text-[#24c1c4]">
            <ArrowLeft className="h-4 w-4" />
            Back to Health Home
          </Link>
          <div className="hidden items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1.5 text-xs font-semibold text-[#0B2D54] sm:inline-flex">
            <ShieldAlert className="h-3.5 w-3.5" />
            Private health information
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0B2D54]">
              <ShieldAlert className="h-3.5 w-3.5" />
              Safety
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0B2D54] sm:text-4xl">Emergency contacts</h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              {patientName ? `Trusted contacts for ${patientName}. ` : ""}
              These details come directly from the selected patient record. No sample or placeholder contact data is shown.
            </p>
          </div>
          <Link href={onboardingHref} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B2D54] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#092541]">
            <Plus className="h-4 w-4" />
            Manage contacts
          </Link>
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading the selected patient's emergency contacts…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-amber-950">We couldn't load the contact record</h2>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  We will not turn a failed request into a false “no contacts” state. Your saved information remains in the patient record.
                </p>
                <button type="button" onClick={() => void reload()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0B2D54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#092541]">
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && emergencyContacts.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#24c1c4]/10 text-[#0B2D54]">
              <UserRound className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#0B2D54]">No emergency contacts saved yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              The selected patient's emergency-contact records are currently empty. Once a real contact is saved, it will appear here automatically.
            </p>
            <Link href={onboardingHref} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B2D54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#092541]">
              <Plus className="h-4 w-4" />
              Add emergency contact
            </Link>
          </div>
        )}

        {!loading && !error && emergencyContacts.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {emergencyContacts.map((contact, index) => (
              <article key={contact.id ?? `${contact.fullName ?? "contact"}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#24c1c4]/50 hover:shadow-md sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0B2D54]">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[#0B2D54]">{contact.fullName || "Emergency contact"}</h2>
                      {contact.isPrimary && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Primary</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{formatRelationship(contact.relationship)}</p>
                    <div className="mt-4 space-y-2">
                      {contact.phoneNumber && (
                        <a href={`tel:${contact.phoneNumber}`} className="flex items-center gap-2 text-sm font-medium text-[#0B2D54] hover:text-[#24c1c4]">
                          <Phone className="h-4 w-4 text-[#24c1c4]" />
                          {contact.phoneNumber}
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-2 break-all text-sm text-slate-500 hover:text-[#0B2D54]">
                          <Mail className="h-4 w-4 shrink-0 text-[#24c1c4]" />
                          {contact.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#0B2D54]" />
            <div>
              <h2 className="font-semibold text-[#0B2D54]">One contact record across Sympto</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Emergency contacts are stored against the patient and are reused by Health Home and Health Passport. When a family member is selected, this page follows that patient's authorised record through the patientId navigation context.
              </p>
            </div>
          </div>
        </section>

        <div className="pb-6 pt-8 text-center text-xs text-slate-400">Your emergency contact information is private and protected.</div>
      </div>
    </main>
  );
}