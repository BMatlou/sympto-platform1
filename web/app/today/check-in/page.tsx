"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import DailyHealthCheckIn from "@/components/dashboard/daily-health-check-in";

export default function DailyHealthCheckInPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb] text-[#14304d]">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
          <header className="mb-5 flex items-center justify-between">
            <Link href="/today" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#0b2d54] transition hover:bg-white">
              <ArrowLeft className="h-4 w-4" />
              What do I do today?
            </Link>
            <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#71839a] shadow-sm ring-1 ring-[#e0ebef]">Daily check-in</span>
          </header>
          <DailyHealthCheckIn />
        </div>
      </main>
    </ProtectedRoute>
  );
}
