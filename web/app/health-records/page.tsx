"use client";

import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  Plus,
  ShieldCheck,
  Upload,
} from "lucide-react";

export default function HealthRecordsPage() {
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
            <FileText className="h-3.5 w-3.5" />
            My health
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Health records
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Keep your important healthcare documents and
            medical records organised in one secure place.
          </p>
        </div>

        {/* Actions */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B5CAD] px-4 py-3 text-sm font-semibold text-white hover:bg-[#084987]"
          >
            <Plus className="h-4 w-4" />
            Add health record
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" />
            Upload document
          </button>
        </div>

        {/* Record categories */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Record categories
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            {/* Clinical records */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                Clinical records
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Consultations, clinical notes, diagnoses and
                other healthcare records.
              </p>
            </div>

            {/* Medical documents */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <FolderOpen className="h-5 w-5" />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                Medical documents
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Referrals, letters, prescriptions and other
                healthcare documents.
              </p>
            </div>

            {/* Uploaded files */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Upload className="h-5 w-5" />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                Uploaded documents
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Documents that you have uploaded to your
                personal health record.
              </p>
            </div>
          </div>
        </section>

        {/* Empty state */}
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FileText className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              No health records yet
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Your healthcare records and documents will
              appear here once they are added to your health
              profile.
            </p>

            <button
              type="button"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B2D54] px-5 py-3 text-sm font-semibold text-white hover:bg-[#092541]"
            >
              <Plus className="h-4 w-4" />
              Add your first record
            </button>
          </div>
        </section>

        {/* Privacy */}
        <div className="mt-8 flex items-center justify-center gap-2 pb-6 text-center text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4" />
          Your health information is private and protected.
        </div>
      </div>
    </main>
  );
}