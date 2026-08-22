"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Plus,
  Stethoscope,
} from "lucide-react";

import ProtectedRoute from "@/components/auth/protected-route";

export default function AppointmentsPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#F7F9FC]">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0B5CAD]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EAF3FB] px-3 py-1 text-xs font-semibold text-[#0B5CAD]">
              <CalendarDays className="h-3.5 w-3.5" />
              Appointments
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Your appointments
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              View and manage your upcoming healthcare
              appointments in one place.
            </p>
          </div>

          <div className="mb-6 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B5CAD] px-5 py-3 text-sm font-semibold text-white hover:bg-[#084987]"
            >
              <Plus className="h-4 w-4" />
              Book appointment
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Stethoscope className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-xl font-semibold text-slate-900">
              No upcoming appointments
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              When you book an appointment, the practitioner,
              date, time and appointment details will appear
              here.
            </p>

            <button
              type="button"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B2D54] px-5 py-3 text-sm font-semibold text-white hover:bg-[#092541]"
            >
              <CalendarDays className="h-4 w-4" />
              Book an appointment
            </button>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}