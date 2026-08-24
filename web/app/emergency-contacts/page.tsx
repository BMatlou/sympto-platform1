"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Phone, Plus, RefreshCw, ShieldAlert, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/hooks/use-dashboard";
import { emergencyContactsService, type EmergencyContact } from "@/services/emergency-contacts.service";

function formatRelationship(value: unknown) {
  if (!value) return "Relationship not specified";
  return String(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function EmergencyContactsPage() {
  const searchParams = useSearchParams();
  const requestedPatientId = searchParams.get("patientId") || undefined;
  const { data: dashboard, loading: dashboardLoading, error: dashboardError, reload: reloadDashboard } = useDashboard();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState<unknown>(null);

  // Health Home establishes the authorised patient. The dedicated endpoint then
  // reads that patient's actual EmergencyContact rows from the backend.
  const selectedPatientId = dashboard?.patient?.id || requestedPatientId;

  const loadContacts = useCallback(async () => {
    if (!selectedPatientId) {
      if (dashboardLoading) return;
      setContacts([]);
      setContactsLoading(false);
      return;
    }

    setContactsLoading(true);
    setContactsError(null);
    try {
      const result = await emergencyContactsService.getForPatient(selectedPatientId);
      setContacts(result);
    } catch (error) {
      // Do not convert a failed dedicated request into an empty state. If Health
      // Home already contains real patient-scoped contacts, keep those records.
      const healthHomeContacts = (dashboard?.emergencyContacts ?? []) as EmergencyContact[];
      if (healthHomeContacts.length > 0) setContacts(healthHomeContacts);
      else setContactsError(error);
    } finally {
      setContactsLoading(false);
    }
  }, [selectedPatientId, dashboard?.emergencyContacts, dashboardLoading]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const loading = dashboardLoading || contactsLoading;
  const error = dashboardError || contactsError;
  const dashboardHref = selectedPatientId ? `/dashboard?patientId=${encodeURIComponent(selectedPatientId)}` : "/dashboard";
  const onboardingHref = selectedPatientId ? `/onboarding?patientId=${encodeURIComponent(selectedPatientId)}` : "/onboarding";
  const patientName = dashboard?.patient?.name || [dashboard?.profile?.preferredName || dashboard?.profile?.firstName, dashboard?.profile?.lastName].filter(Boolean).join(" ");

  const retry = async () => {
    await reloadDashboard();
    await loadContacts();
  };

  return (
    <main className="min-h-screen bg-[#F7F9FC]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href={dashboardHref} className="inline-flex items-center gap-2 text-sm font-medium text-[#0B2D54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to Health Home</Link>
          <div className="hidden items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1.5 text-xs font-semibold text-[#0B2D54] sm:inline-flex"><ShieldAlert className="h-3.5 w-3.5" />Private health information</div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0B2D54]"><ShieldAlert className="h-3.5 w-3.5" />Safety</div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0B2D54] sm:text-4xl">Emergency contacts</h1>
            <p className="mt-2 max-w-2xl text-slate-500">{patientName ? `Trusted contacts for ${patientName}. ` : ""}These details come directly from the selected patient record. No sample or placeholder contact data is shown.</p>
          </div>
          <Link href={onboardingHref} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B2D54] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#092541]"><Plus className="h-4 w-4" />Manage contacts</Link>
        </div>

        {loading && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading the selected patient's emergency contacts…</div>}

        {!loading && error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div className="min-w-0 flex-1"><h2 className="font-semibold text-amber-950">We couldn't load the contact record</h2><p className="mt-1 text-sm leading-6 text-amber-800">Sympto could not confirm the selected patient's saved emergency-contact records. We will not turn a failed request into a false “no contacts” state.</p><button type="button" onClick={() => void retry()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0B2D54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#092541]"><RefreshCw className="h-4 w-4" />Try again</button></div></div></div>}

        {!loading && !error && contacts.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#24c1c4]/10 text-[#0B2D54]"><UserRound className="h-7 w-7" /></div><h2 className="mt-4 text-lg font-semibold text-[#0B2D54]">No emergency contacts saved yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">No emergency-contact records were returned for the selected patient. If a contact has been saved in their profile, it should appear here automatically.</p><Link href={onboardingHref} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B2D54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#092541]"><Plus className="h-4 w-4" />Manage emergency contacts</Link></div>}

        {!loading && !error && contacts.length > 0 && <div className="grid gap-4 md:grid-cols-2">{contacts.map((contact, index) => <article key={contact.id ?? `${contact.fullName}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#24c1c4]/50 hover:shadow-md sm:p-6"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0B2D54]"><UserRound className="h-6 w-6" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-[#0B2D54]">{contact.fullName}</h2>{contact.isPrimary && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Primary</span>}</div><p className="mt-1 text-sm text-slate-500">{formatRelationship(contact.relationship)}</p><div className="mt-4 space-y-2">{contact.phoneNumber && <a href={`tel:${contact.phoneNumber}`} className="flex items-center gap-2 text-sm font-medium text-[#0B2D54] hover:text-[#24c1c4]"><Phone className="h-4 w-4 text-[#24c1c4]" />{contact.phoneNumber}</a>}{contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2 break-all text-sm text-slate-500 hover:text-[#0B2D54]"><Mail className="h-4 w-4 shrink-0 text-[#24c1c4]" />{contact.email}</a>}</div></div></div></article>)}</div>}

        <section className="mt-8 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-6"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#0B2D54]" /><div><h2 className="font-semibold text-[#0B2D54]">One contact record across Sympto</h2><p className="mt-1 text-sm leading-6 text-slate-600">Emergency contacts are stored against the patient and reused by Health Home and Health Passport. When a family member is selected, this page follows that patient's authorised patientId context.</p></div></div></section>
        <div className="pb-6 pt-8 text-center text-xs text-slate-400">Your emergency contact information is private and protected.</div>
      </div>
    </main>
  );
}
