"use client";

import Link from "next/link";
import { ArrowLeft, Users, UserPlus } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";

export default function FamilyPage() {
  const { data, loading } = useDashboard();
  const family = data?.family ?? [];

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f7f9fc]">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#0b5cad] hover:underline"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]"><Users className="h-6 w-6" /></span><div><h1 className="text-2xl font-bold text-[#0b2d54]">Family</h1><p className="text-sm text-slate-500">People whose health information you manage.</p></div></div>
              <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400" title="Family member creation API is not connected yet"><UserPlus className="h-4 w-4" />Add family member</button>
            </div>
            {loading ? <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">Loading family members…</div> : family.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center"><p className="font-semibold text-[#0b2d54]">No family members yet</p><p className="mt-1 text-sm text-slate-500">Family members you manage will appear here when they are connected to your account.</p></div> : <div className="mt-8 grid gap-3 sm:grid-cols-2">{family.map((member) => <div key={String(member.id)} className="rounded-2xl border border-slate-200 p-4"><p className="font-semibold text-slate-900">{String(member.name ?? "Family member")}</p><p className="mt-1 text-sm text-slate-500">{String(member.relationship ?? "Relationship not specified")}</p></div>)}</div>}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
