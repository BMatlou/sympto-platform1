"use client";

import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/protected-route";
import { HealthGoalsStep } from "@/components/onboarding/HealthGoalsStep";
import { useDashboard } from "@/hooks/use-dashboard";
import { onboardingService } from "@/services/onboarding.service";
import type { UpdateHealthGoalsDto } from "@/types/onboarding";

export default function ManageHealthGoalsPage() {
  const { data, loading, error, reload } = useDashboard();
  const [values, setValues] = useState<UpdateHealthGoalsDto | null>(null);
  const [saving, setSaving] = useState(false);

  const dashboardGoals = Array.isArray(data?.goals) ? data.goals : [];
  const currentValues: UpdateHealthGoalsDto = values ?? { goals: dashboardGoals };

  async function handleChange(next: UpdateHealthGoalsDto) {
    setValues(next);
  }

  async function save() {
    if (!currentValues.goals?.every((goal) => goal.title?.trim() && goal.category && goal.priority)) {
      toast.error("Each health goal needs a name, category and priority.");
      return;
    }

    try {
      setSaving(true);
      await onboardingService.updateHealthGoals(currentValues);
      toast.success("Health goals updated.");
      setValues(null);
      await reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to save your health goals.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/health-goals" className="inline-flex items-center gap-2 text-sm font-medium text-[#0b2d54] hover:text-[#24c1c4]">
              <ArrowLeft className="h-4 w-4" />
              Back to health goals
            </Link>
            <button disabled={saving} type="button" onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save goals"}
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {loading && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your goals...</div>}
          {error && !loading && <div className="rounded-2xl border border-red-200 bg-white p-6"><p className="font-semibold text-[#0b2d54]">We couldn't load your goals.</p><button onClick={reload} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>}

          {!loading && !error && (
            <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-8">
              <HealthGoalsStep values={currentValues} onChange={handleChange} />
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
