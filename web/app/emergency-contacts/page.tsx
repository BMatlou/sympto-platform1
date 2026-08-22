"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Plus,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { useDashboard } from "@/hooks/use-dashboard";

function formatEnum(value: unknown) {
  if (!value) return "Relationship not specified";

  return String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function EmergencyContactsPage() {
  const { data: dashboard, loading } = useDashboard();

  const emergencyContacts = Array.isArray(
    dashboard?.emergencyContacts,
  )
    ? dashboard.emergencyContacts
    : [];

  return (
    <main className="min-h-screen bg-[#F7F9FC]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0B5CAD]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              <ShieldAlert className="h-3.5 w-3.5" />
              Safety
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Emergency contacts
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Keep trusted contacts available in case someone needs
              to reach a person you have listed as an emergency contact.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B5CAD] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#084987]"
          >
            <Plus className="h-4 w-4" />
            Add contact
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Loading your emergency contacts...
          </div>
        )}

        {/* Contacts */}
        {!loading && emergencyContacts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <UserRound className="h-7 w-7" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              No emergency contacts
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add someone you trust so their details are available
              when they may be needed.
            </p>

            <button
              type="button"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B5CAD] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#084987]"
            >
              <Plus className="h-4 w-4" />
              Add emergency contact
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {emergencyContacts.map((contact: any) => (
              <div
                key={contact?.id ?? contact?.fullName}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <UserRound className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">
                        {contact?.fullName || "Emergency contact"}
                      </h2>

                      {contact?.isPrimary && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                          Primary
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {formatEnum(contact?.relationship)}
                    </p>

                    <div className="mt-4 space-y-2">
                      {contact?.phoneNumber && (
                        <a
                          href={`tel:${contact.phoneNumber}`}
                          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-[#0B5CAD]"
                        >
                          <Phone className="h-4 w-4 text-slate-400" />
                          {contact.phoneNumber}
                        </a>
                      )}

                      {contact?.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-2 break-all text-sm text-slate-500 hover:text-[#0B5CAD]"
                        >
                          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                          {contact.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Safety information */}
        <section className="mt-8">
          <div className="rounded-2xl border border-[#D8E7F4] bg-[#F5FAFE] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#0B5CAD]" />

              <div>
                <h2 className="font-semibold text-slate-900">
                  Keep your contact information current
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Make sure the people listed here know they have been
                  added as emergency contacts and that their phone
                  number and email address are up to date.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="pb-6 pt-8 text-center text-xs text-slate-400">
          Your emergency contact information is private and protected.
        </div>
      </div>
    </main>
  );
}