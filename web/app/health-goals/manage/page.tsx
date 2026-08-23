"use client";

import Link from "next/link";
import { ArrowLeft, Plus, Save, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { onboardingService } from "@/services/onboarding.service";
import type { HealthGoalCategory, HealthGoalPriority } from "@/types/onboarding";

const categories: HealthGoalCategory[] = [
  "WEIGHT", "EXERCISE", "NUTRITION", "BLOOD_PRESSURE", "BLOOD_GLUCOSE",
  "CHOLESTEROL", "MEDICATION", "SLEEP", "MENTAL_HEALTH", "HYDRATION",
  "SMOKING", "ALCOHOL", "HEART_RATE", "OTHER",
];

const priorities: HealthGoalPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

type DraftGoal = {
  title: string;
  description?: string;
  category: HealthGoalCategory | "";
  priority: HealthGoalPriority;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  targetDate?: string;
};

const emptyGoal = (): DraftGoal => ({
  title: "",
  description: "",
  category: "",
  priority: "MEDIUM",
  targetValue: undefined,
  currentValue: undefined,
  unit: "",
  targetDate: "",
});

function normalizeGoals(goals: any[]): DraftGoal[] {
  return goals.map((goal) => ({
    title: String(goal?.title ?? ""),
    description: goal?.description ?? "",
    category: goal?.category ?? "",
    priority: goal?.priority ?? "MEDIUM",
    targetValue: goal?.targetValue ?? undefined,
    currentValue: goal?.currentValue ?? goal?.latestValue ?? undefined,
    unit: goal?.unit ?? "",
    targetDate: goal?.targetDate ? String(goal.targetDate).slice(0, 10) : "",
  }));
}

export default function ManageHealthGoalsPage() {
  const { data, loading, error, reload } = useDashboard();
  const existingGoals = Array.isArray(data?.goals) ? data.goals : [];
  const [goals, setGoals] = useState<DraftGoal[] | null>(null);
  const [saving, setSaving] = useState(false);

  const drafts = goals ?? normalizeGoals(existingGoals);

  function updateGoal(index: number, patch: Partial<DraftGoal>) {
    setGoals(drafts.map((goal, i) => (i === index ? { ...goal, ...patch } : goal)));
  }

  function addGoal() {
    setGoals([...drafts, emptyGoal()]);
  }

  function removeGoal(index: number) {
    setGoals(drafts.filter((_, i) => i !== index));
  }

  async function save() {
    const invalid = drafts.some((goal) => !goal.title.trim() || !goal.category);
    if (invalid) {
      toast.error("Every goal needs a title and category.");
      return;
    }

    try {
      setSaving(true);
      await onboardingService.updateHealthGoals({
        goals: drafts.map((goal) => ({
          title: goal.title.trim(),
          description: goal.description?.trim() || undefined,
          category: goal.category as HealthGoalCategory,
          priority: goal.priority,
          targetValue: goal.targetValue,
          currentValue: goal.currentValue,
          unit: goal.unit?.trim() || undefined,
          targetDate: goal.targetDate || undefined,
        })),
      });
      toast.success("Health goals updated.");
      setGoals(null);
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
            <Link href="/health-goals" className="inline-flex items-center gap-2 text-sm font-medium text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to health goals</Link>
            <button type="button" onClick={addGoal} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add goal</button>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0b2d54]"><Target className="h-3.5 w-3.5" />Health goals</div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0b2d54]">Manage your health goals</h1>
            <p className="mt-2 text-slate-500">Add, update or remove goals. Changes are saved to the same patient health profile used by Health Home.</p>
          </div>

          {loading && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your goals...</div>}
          {error && !loading && <div className="rounded-2xl border border-red-200 bg-white p-6"><p className="font-semibold text-[#0b2d54]">We couldn't load your goals.</p><button onClick={reload} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>}

          {!loading && !error && (
            <div className="space-y-4">
              {drafts.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Target className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-4 font-semibold text-[#0b2d54]">No health goals yet</h2><p className="mt-2 text-sm text-slate-500">Create your first goal to start tracking progress.</p><button onClick={addGoal} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Create a goal</button></div>}

              {drafts.map((goal, index) => (
                <section key={index} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-semibold text-[#0b2d54]">Goal {index + 1}</h2><button type="button" onClick={() => removeGoal(index)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" />Remove</button></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="md:col-span-2"><span className="text-xs font-semibold text-slate-500">Title *</span><input value={goal.title} onChange={(e) => updateGoal(index, { title: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#24c1c4]" placeholder="e.g. Walk 30 minutes every day" /></label>
                    <label className="md:col-span-2"><span className="text-xs font-semibold text-slate-500">Description</span><textarea value={goal.description} onChange={(e) => updateGoal(index, { description: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#24c1c4]" /></label>
                    <label><span className="text-xs font-semibold text-slate-500">Category *</span><select value={goal.category} onChange={(e) => updateGoal(index, { category: e.target.value as HealthGoalCategory })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Select category</option>{categories.map((category) => <option key={category} value={category}>{category.replace(/_/g, " ")}</option>)}</select></label>
                    <label><span className="text-xs font-semibold text-slate-500">Priority</span><select value={goal.priority} onChange={(e) => updateGoal(index, { priority: e.target.value as HealthGoalPriority })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
                    <label><span className="text-xs font-semibold text-slate-500">Current value</span><input type="number" value={goal.currentValue ?? ""} onChange={(e) => updateGoal(index, { currentValue: e.target.value === "" ? undefined : Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
                    <label><span className="text-xs font-semibold text-slate-500">Target value</span><input type="number" value={goal.targetValue ?? ""} onChange={(e) => updateGoal(index, { targetValue: e.target.value === "" ? undefined : Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
                    <label><span className="text-xs font-semibold text-slate-500">Unit</span><input value={goal.unit} onChange={(e) => updateGoal(index, { unit: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="kg, steps, hours..." /></label>
                    <label><span className="text-xs font-semibold text-slate-500">Target date</span><input type="date" value={goal.targetDate} onChange={(e) => updateGoal(index, { targetDate: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
                  </div>
                </section>
              ))}

              {drafts.length > 0 && <div className="flex justify-end gap-3"><Link href="/health-goals" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</Link><button disabled={saving} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save goals"}</button></div>}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
