"use client";

import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/protected-route";
import { TextField } from "@/components/ui/forms/TextField";
import { useDashboard } from "@/hooks/use-dashboard";
import { onboardingService } from "@/services/onboarding.service";
import type { HealthGoalCategory, HealthGoalItem, HealthGoalPriority, UpdateHealthGoalsDto } from "@/types/onboarding";

const CATEGORIES: Array<{ value: HealthGoalCategory; label: string; unit?: string }> = [
  { value: "WEIGHT", label: "Weight", unit: "kg" },
  { value: "NUTRITION", label: "Nutrition", unit: "servings/day" },
  { value: "EXERCISE", label: "Exercise", unit: "mins/week" },
  { value: "SLEEP", label: "Sleep", unit: "hours/night" },
  { value: "MENTAL_HEALTH", label: "Mental health" },
  { value: "HYDRATION", label: "Hydration", unit: "glasses/day" },
  { value: "MEDICATION", label: "Medication" },
  { value: "SMOKING", label: "Smoking", unit: "cigarettes/day" },
  { value: "ALCOHOL", label: "Alcohol", unit: "drinks/week" },
  { value: "BLOOD_PRESSURE", label: "Blood pressure", unit: "mmHg" },
  { value: "BLOOD_GLUCOSE", label: "Blood glucose", unit: "mmol/L" },
  { value: "CHOLESTEROL", label: "Cholesterol", unit: "mmol/L" },
  { value: "HEART_RATE", label: "Heart health", unit: "bpm" },
  { value: "OTHER", label: "Other" },
];

const PRIORITIES: HealthGoalPriority[] = ["LOW", "MEDIUM", "HIGH"];

function emptyGoal(): HealthGoalItem {
  return { title: "", description: "", category: "", priority: undefined, targetValue: undefined, unit: "", targetDate: "" };
}

function categoryConfig(category: HealthGoalCategory | "") {
  return CATEGORIES.find((item) => item.value === category);
}

export default function ManageHealthGoalsPage() {
  const { data, loading, error, reload } = useDashboard();
  const [goals, setGoals] = useState<HealthGoalItem[]>([]);
  const [draft, setDraft] = useState<HealthGoalItem>(emptyGoal());
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setGoals((data.goals ?? []) as HealthGoalItem[]);
  }, [data]);

  function updateDraft<K extends keyof HealthGoalItem>(field: K, value: HealthGoalItem[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function selectCategory(category: HealthGoalCategory) {
    const config = categoryConfig(category);
    setDraft((current) => ({
      ...current,
      category,
      title: current.title || config?.label || "",
      unit: config?.unit || "",
      targetValue: config?.unit ? current.targetValue : undefined,
    }));
  }

  function openAdd() {
    setEditing(null);
    setDraft(emptyGoal());
  }

  function openEdit(index: number) {
    setEditing(index);
    setDraft({ ...goals[index] });
  }

  function closeEditor() {
    setEditing(null);
    setDraft(emptyGoal());
  }

  function saveDraft() {
    if (!draft.category || !draft.title.trim() || !draft.priority) {
      toast.error("Add a name, category and priority before saving the goal.");
      return;
    }

    const config = categoryConfig(draft.category);
    const goal: HealthGoalItem = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description?.trim() || "",
      unit: config?.unit || draft.unit || "",
      targetValue: config?.unit ? draft.targetValue : undefined,
      targetDate: draft.targetDate || undefined,
    };

    setGoals((current) => {
      const next = [...current];
      if (editing === null) next.push(goal);
      else next[editing] = goal;
      return next;
    });
    closeEditor();
  }

  function removeGoal(index: number) {
    setGoals((current) => current.filter((_, i) => i !== index));
  }

  async function saveAll() {
    if (goals.some((goal) => !goal.title?.trim() || !goal.category || !goal.priority)) {
      toast.error("Every goal needs a name, category and priority.");
      return;
    }

    try {
      setSaving(true);
      const payload: UpdateHealthGoalsDto = { goals };
      await onboardingService.updateHealthGoals(payload);
      await reload();
      toast.success("Health goals saved.");
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
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link href="/health-goals" className="inline-flex items-center gap-2 text-sm font-medium text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Health goals</Link>
            <button onClick={saveAll} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-wider text-[#24c1c4]">Health goals</p>
            <h1 className="mt-1 text-2xl font-bold text-[#0b2d54]">Manage the goals that matter to you</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Add, edit or remove goals. The goal categories, priority rules, targets and data format are the same ones used during onboarding, without showing the onboarding step itself.</p>
          </div>

          {loading && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your goals…</div>}
          {error && !loading && <div className="rounded-2xl border border-red-200 bg-white p-6"><p className="font-semibold text-[#0b2d54]">We couldn't load your goals.</p><button onClick={reload} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>}

          {!loading && !error && <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div><h2 className="font-bold text-[#0b2d54]">Your goals</h2><p className="mt-1 text-xs text-slate-500">{goals.length} {goals.length === 1 ? "goal" : "goals"}</p></div>
                <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-xl border border-[#24c1c4]/40 px-4 py-2.5 text-sm font-semibold text-[#159fa3] hover:bg-[#24c1c4]/5"><Plus className="h-4 w-4" />Add goal</button>
              </div>

              {goals.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center"><p className="font-semibold text-[#0b2d54]">No health goals yet</p><p className="mt-1 text-sm text-slate-500">Add your first goal to start tracking what matters to you.</p><button onClick={openAdd} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white">Add your first goal</button></div> : <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">{goals.map((goal, index) => <div key={`${goal.category}-${index}`} className="flex items-center gap-4 p-4"><div className="min-w-0 flex-1"><p className="font-semibold text-[#0b2d54]">{goal.title}</p><p className="mt-1 text-xs text-slate-500">{categoryConfig(goal.category)?.label || goal.category} · {goal.priority}</p>{(goal.targetValue !== undefined || goal.targetDate) && <p className="mt-1 text-xs text-[#159fa3]">{goal.targetValue !== undefined ? `Target: ${goal.targetValue} ${goal.unit || ""}` : ""}{goal.targetDate ? ` · By ${new Date(`${goal.targetDate}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>}</div><button onClick={() => openEdit(index)} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#159fa3] hover:bg-slate-50">Edit</button><button onClick={() => removeGoal(index)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${goal.title}`}><Trash2 className="h-4 w-4" /></button></div>)}</div>}
            </section>

            {draft.category !== "" || editing !== null ? <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between"><div><h2 className="font-bold text-[#0b2d54]">{editing === null ? "Add a health goal" : "Edit health goal"}</h2><p className="mt-1 text-xs text-slate-500">Use the same goal rules as onboarding.</p></div><button onClick={closeEditor} className="text-sm font-semibold text-slate-400 hover:text-slate-600">Cancel</button></div>
              <div className="mt-5"><p className="mb-2 text-sm font-semibold text-slate-700">What do you want to work on?</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{CATEGORIES.map((category) => <button key={category.value} onClick={() => selectCategory(category.value)} className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${draft.category === category.value ? "border-[#24c1c4] bg-[#24c1c4]/10 text-[#159fa3]" : "border-slate-200 text-slate-600 hover:border-[#24c1c4]/40"}`}>{category.label}</button>)}</div></div>
              {draft.category && <div className="mt-5 grid gap-4 sm:grid-cols-2"><TextField label="Goal name" placeholder={categoryConfig(draft.category)?.label || "What would you like to achieve?"} value={draft.title} onChange={(value) => updateDraft("title", value)} /><div><label className="mb-2 block text-sm font-medium text-slate-700">Priority</label><div className="grid grid-cols-3 gap-2">{PRIORITIES.map((priority) => <button key={priority} onClick={() => updateDraft("priority", priority)} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${draft.priority === priority ? "border-[#24c1c4] bg-[#24c1c4]/10 text-[#159fa3]" : "border-slate-200 text-slate-500"}`}>{priority}</button>)}</div></div>{categoryConfig(draft.category)?.unit && <><TextField type="number" label={`Target (${categoryConfig(draft.category)?.unit})`} placeholder="Enter target" value={draft.targetValue?.toString() ?? ""} onChange={(value) => updateDraft("targetValue", value === "" ? undefined : Number(value))} /><TextField label="Unit" value={draft.unit || ""} onChange={(value) => updateDraft("unit", value)} /></>}<TextField type="date" label="Target date" value={draft.targetDate || ""} onChange={(value) => updateDraft("targetDate", value)} /><TextField label="Why this goal matters" placeholder="Optional context or motivation" value={draft.description || ""} onChange={(value) => updateDraft("description", value)} /></div>}
              <div className="mt-6 flex justify-end"><button onClick={saveDraft} disabled={!draft.category || !draft.title.trim() || !draft.priority} className="rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{editing === null ? "Add goal" : "Update goal"}</button></div>
            </section> : null}
          </>}
        </div>
      </main>
    </ProtectedRoute>
  );
}
