"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Edit3, Plus, Target, Trash2, X, LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthGoalsService } from "@/services/health-goals.service";
import { TextField } from "@/components/ui/forms/TextField";

type GoalDraft = {
  title: string;
  description: string;
  category: string;
  priority: string;
  targetValue: string;
  unit: string;
  targetDate: string;
};

const CATEGORIES: Array<{ value: string; label: string; unit: string; metricType: string; metricKey: string; frequency: "DAILY" | "WEEKLY" | "TOTAL"; aggregation: "SUM" | "LATEST" | "AVERAGE" | "MIN" | "MAX"; comparison: "AT_LEAST" | "AT_MOST" | "CLOSEST" | "INCREASE_TO" | "DECREASE_TO"; targetLabel: string }> = [
  { value: "WEIGHT", label: "Weight", unit: "kg", metricType: "WEIGHT", metricKey: "weight.kg", frequency: "TOTAL", aggregation: "LATEST", comparison: "DECREASE_TO", targetLabel: "Amount to lose" },
  { value: "EXERCISE", label: "Exercise", unit: "mins/week", metricType: "EXERCISE", metricKey: "exercise.minutes", frequency: "DAILY", aggregation: "SUM", comparison: "AT_LEAST", targetLabel: "Minutes" },
  { value: "NUTRITION", label: "Nutrition", unit: "calories/day", metricType: "NUTRITION", metricKey: "nutrition.calories", frequency: "DAILY", aggregation: "SUM", comparison: "AT_MOST", targetLabel: "Calories" },
  { value: "BLOOD_PRESSURE", label: "Blood pressure", unit: "mmHg", metricType: "BLOOD_PRESSURE", metricKey: "blood_pressure.systolic", frequency: "DAILY", aggregation: "LATEST", comparison: "AT_MOST", targetLabel: "Systolic target" },
  { value: "BLOOD_GLUCOSE", label: "Blood glucose", unit: "mmol/L", metricType: "BLOOD_GLUCOSE", metricKey: "blood_glucose.value", frequency: "DAILY", aggregation: "LATEST", comparison: "AT_MOST", targetLabel: "Target level" },
  { value: "CHOLESTEROL", label: "Cholesterol", unit: "mmol/L", metricType: "CHOLESTEROL", metricKey: "cholesterol.total", frequency: "TOTAL", aggregation: "LATEST", comparison: "AT_MOST", targetLabel: "Target level" },
  { value: "MEDICATION", label: "Medication", unit: "%", metricType: "MEDICATION", metricKey: "medication.adherence", frequency: "WEEKLY", aggregation: "AVERAGE", comparison: "AT_LEAST", targetLabel: "Adherence target" },
  { value: "SLEEP", label: "Sleep", unit: "hours/night", metricType: "SLEEP", metricKey: "sleep.hours", frequency: "DAILY", aggregation: "LATEST", comparison: "AT_LEAST", targetLabel: "Hours" },
  { value: "MENTAL_HEALTH", label: "Mental health", unit: "score", metricType: "MENTAL_HEALTH", metricKey: "mental.stress", frequency: "DAILY", aggregation: "LATEST", comparison: "AT_MOST", targetLabel: "Maximum score" },
  { value: "HYDRATION", label: "Hydration", unit: "ml/day", metricType: "HYDRATION", metricKey: "hydration.ml", frequency: "DAILY", aggregation: "SUM", comparison: "AT_LEAST", targetLabel: "Daily amount" },
  { value: "SMOKING", label: "Smoking", unit: "cigarettes/day", metricType: "SMOKING", metricKey: "smoking.status", frequency: "TOTAL", aggregation: "LATEST", comparison: "AT_MOST", targetLabel: "Maximum" },
  { value: "ALCOHOL", label: "Alcohol", unit: "drinks/week", metricType: "ALCOHOL", metricKey: "alcohol.frequency", frequency: "WEEKLY", aggregation: "LATEST", comparison: "AT_MOST", targetLabel: "Maximum" },
  { value: "HEART_RATE", label: "Heart rate", unit: "bpm", metricType: "HEART_RATE", metricKey: "heart_rate.bpm", frequency: "DAILY", aggregation: "LATEST", comparison: "AT_MOST", targetLabel: "Target rate" },
  { value: "OTHER", label: "Personal goal", unit: "", metricType: "OTHER", metricKey: "other.value", frequency: "TOTAL", aggregation: "LATEST", comparison: "CLOSEST", targetLabel: "Target" },
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function emptyDraft(): GoalDraft {
  return { title: "", description: "", category: "", priority: "MEDIUM", targetValue: "", unit: "", targetDate: "" };
}

function formatEnum(value: unknown) {
  if (!value) return "Not specified";
  return String(value).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

function goalProgress(goal: any) {
  if (String(goal?.status ?? "").toUpperCase() === "ACHIEVED") return 100;
  const latest = Number(goal?.latestProgress?.progressPercent ?? goal?.progressPercent ?? goal?.progress?.[0]?.progressPercent ?? 0);
  return Number.isFinite(latest) ? Math.max(0, Math.min(100, Math.round(latest))) : 0;
}

function goalCurrent(goal: any) {
  const value = goal?.latestValue ?? goal?.latestProgress?.currentValue ?? goal?.progress?.[0]?.currentValue ?? goal?.currentValue;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const unit = String(goal?.unit ?? "").trim();
  return `${Number.isInteger(number) ? number : number.toFixed(1)}${unit ? ` ${unit}` : ""}`;
}

function goalPresentation(goal: any) {
  const category = String(goal?.category ?? "OTHER").toUpperCase();
  const config = CATEGORIES.find((item) => item.value === category) ?? CATEGORIES[CATEGORIES.length - 1];
  const progress = goalProgress(goal);
  const current = goalCurrent(goal);
  const target = goal?.targetValue != null ? `${goal.targetValue}${config.unit ? ` ${config.unit}` : ""}` : "Target not set";
  const achieved = String(goal?.status ?? "").toUpperCase() === "ACHIEVED";
  return { config, progress, current, target, achieved };
}

export default function HealthGoalsPage() {
  const { data: dashboard, loading, error, reload } = useDashboard();
  const [draft, setDraft] = useState<GoalDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const healthGoals = useMemo(
    () => (Array.isArray(dashboard?.goals) ? dashboard.goals : []).filter((goal: any) => ["ACTIVE", "ACHIEVED", "ON_TRACK", "IMPROVING", "STAGNANT", "DECLINING"].includes(String(goal?.status ?? "").toUpperCase())),
    [dashboard?.goals],
  );

  const filteredGoals = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return healthGoals;
    return healthGoals.filter((goal: any) => `${goal?.title ?? ""} ${goal?.category ?? ""} ${goal?.description ?? ""}`.toLowerCase().includes(query));
  }, [healthGoals, search]);

  const editingGoal = editingId ? healthGoals.find((goal: any) => String(goal.id) === editingId) : null;
  const selectedCategory = CATEGORIES.find((item) => item.value === draft.category);

  useEffect(() => {
    if (!editorOpen) return;
    if (!editingGoal) return;
    const category = CATEGORIES.find((item) => item.value === String(editingGoal.category ?? "")) ?? CATEGORIES[CATEGORIES.length - 1];
    setDraft({
      title: String(editingGoal.title ?? ""),
      description: String(editingGoal.description ?? ""),
      category: category.value,
      priority: String(editingGoal.priority ?? "MEDIUM"),
      targetValue: editingGoal.targetValue == null ? "" : String(editingGoal.targetValue),
      unit: String(editingGoal.unit ?? category.unit),
      targetDate: editingGoal.targetDate ? String(editingGoal.targetDate).slice(0, 10) : "",
    });
  }, [editingGoal, editorOpen]);

  function openAdd() {
    setEditingId(null);
    setDraft(emptyDraft());
    setEditorOpen(true);
  }

  function openEdit(goal: any) {
    setEditingId(String(goal.id));
    const category = CATEGORIES.find((item) => item.value === String(goal.category ?? "")) ?? CATEGORIES[CATEGORIES.length - 1];
    setDraft({
      title: String(goal.title ?? ""),
      description: String(goal.description ?? ""),
      category: category.value,
      priority: String(goal.priority ?? "MEDIUM"),
      targetValue: goal.targetValue == null ? "" : String(goal.targetValue),
      unit: String(goal.unit ?? category.unit),
      targetDate: goal.targetDate ? String(goal.targetDate).slice(0, 10) : "",
    });
    setEditorOpen(true);
  }

  function closeEditor() {
    if (saving) return;
    setEditorOpen(false);
    setEditingId(null);
    setDraft(emptyDraft());
  }

  function chooseCategory(category: string) {
    const config = CATEGORIES.find((item) => item.value === category);
    setDraft((current) => ({ ...current, category, unit: config?.unit ?? "", title: current.title || config?.label || "" }));
  }

  async function saveGoal() {
    if (!dashboard?.patient?.id) {
      toast.error("Your patient profile could not be identified.");
      return;
    }
    if (!draft.category || !draft.title.trim() || !draft.priority || !draft.targetValue || Number(draft.targetValue) <= 0) {
      toast.error("Add a goal name, category, priority and a positive target.");
      return;
    }

    const config = CATEGORIES.find((item) => item.value === draft.category);
    if (!config) return;

    try {
      setSaving(true);
      const input = {
        patientId: dashboard.patient.id,
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        category: config.value,
        priority: draft.priority,
        targetValue: draft.targetValue,
        unit: draft.unit || config.unit || undefined,
        targetDate: draft.targetDate || undefined,
        metricType: config.metricType,
        metricKey: config.metricKey,
        frequency: config.frequency,
        frequencyTarget: draft.targetValue,
        aggregation: config.aggregation,
        comparison: config.comparison,
      };

      if (editingId) {
        await healthGoalsService.update(editingId, input);
        await healthGoalsService.configureMetric(editingId, {
          metricType: config.metricType,
          metricKey: config.metricKey,
          frequency: config.frequency,
          frequencyTarget: draft.targetValue,
          aggregation: config.aggregation,
          comparison: config.comparison,
        });
        toast.success("Health goal updated.");
      } else {
        await healthGoalsService.create(input);
        toast.success("Health goal added.");
      }

      closeEditor();
      await reload();
    } catch (err: any) {
      toast.error(String(err?.response?.data?.message || "We could not save this health goal."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(goal: any) {
    const id = String(goal?.id ?? "");
    if (!id) return;
    const confirmed = window.confirm(`Delete “${String(goal?.title || "this health goal")}” and its recorded goal progress? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await healthGoalsService.remove(id);
      toast.success("Health goal deleted.");
      if (editingId === id) closeEditor();
      await reload();
    } catch (err: any) {
      toast.error(String(err?.response?.data?.message || "We could not delete this health goal."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5fafb] text-[#17314e]">
        <div className="mx-auto max-w-[1180px] px-4 pb-12 pt-4 sm:px-7 sm:pt-6">
          <header className="mb-6 flex items-center justify-between gap-4">
            <Link href="/today" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#0b2d54] transition hover:bg-white">
              <ArrowLeft className="h-4 w-4" />Back to Today
            </Link>
            <button type="button" onClick={openAdd} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#123d63]"><Plus className="h-4 w-4" />Add health goal</button>
          </header>

          <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#08284a] via-[#0e4773] to-[#24babe] p-7 text-white shadow-[0_20px_55px_rgba(11,45,84,0.12)] sm:p-9">
            <div className="absolute right-[-70px] top-[-80px] h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/85 ring-1 ring-white/10"><Target className="h-3.5 w-3.5" />Health goals</span>
              <h1 className="mt-4 text-3xl font-black tracking-[-.045em] sm:text-4xl">Goals you are working toward</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Create, update and remove the health goals that shape how Sympto helps you track your progress.</p>
              <div className="mt-6 flex flex-wrap gap-2.5"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 ring-1 ring-white/10">{healthGoals.length} {healthGoals.length === 1 ? "goal" : "goals"}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 ring-1 ring-white/10">Progress stays connected to your health data</span></div>
            </div>
          </section>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-black tracking-[-.04em] text-[#0b2d54]">Your goals</h2><p className="mt-1 text-xs text-[#74859a]">Choose a goal to edit it, or remove it when it no longer reflects what you are working toward.</p></div>
            <input aria-label="Search health goals" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search goals" className="min-h-10 rounded-xl border border-[#dce8ec] bg-white px-3.5 text-xs font-semibold text-[#0b2d54] outline-none placeholder:text-[#9aa8b5] focus:border-[#24c1c4] focus:ring-2 focus:ring-[#24c1c4]/15" />
          </div>

          {loading && <div className="mt-4 rounded-[24px] border border-[#dce8ec] bg-white p-6 text-sm text-[#74859a]">Loading your health goals…</div>}
          {error && !loading && <div className="mt-4 rounded-[24px] border border-red-200 bg-white p-6"><h2 className="font-black text-[#0b2d54]">We couldn&apos;t load your goals</h2><button type="button" onClick={reload} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-xs font-black text-white">Try again</button></div>}

          {!loading && !error && filteredGoals.length === 0 && <section className="mt-4 rounded-[28px] border border-[#dce8ec] bg-white p-10 text-center shadow-[0_14px_36px_rgba(11,45,84,.045)]"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b6f73]"><Target className="h-6 w-6" /></div><h2 className="mt-5 text-xl font-black text-[#0b2d54]">{search ? "No goals match your search" : "No health goals yet"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#74859a]">{search ? "Try another goal name or category." : "Create your first health goal and Sympto can connect your activity, measurements and tracking to it."}</p>{!search && <button type="button" onClick={openAdd} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-xs font-black text-white"><Plus className="h-4 w-4" />Create your first goal</button>}</section>}

          {!loading && !error && filteredGoals.length > 0 && <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {filteredGoals.map((goal: any) => {
              const presentation = goalPresentation(goal);
              const status = String(goal?.status ?? "ACTIVE").toUpperCase();
              return <article key={String(goal.id)} className="group relative overflow-hidden rounded-[26px] border border-[#dce8ec] bg-white p-5 shadow-[0_12px_30px_rgba(11,45,84,.045)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(11,45,84,.075)] sm:p-6">
                <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3.5"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b6f73]"><Target className="h-5 w-5" /></div><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b6f73]">{presentation.config.label}</p><h3 className="mt-1 truncate text-[17px] font-black tracking-[-.03em] text-[#0b2d54]">{String(goal?.title || "Health goal")}</h3>{goal?.description && <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#74859a]">{String(goal.description)}</p>}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${presentation.achieved ? "bg-[#e9f8f1] text-[#168660]" : status === "DECLINING" ? "bg-red-50 text-red-700" : "bg-[#e9f9fa] text-[#0b6f73]"}`}>{presentation.achieved ? "Completed" : status === "DECLINING" ? "Needs attention" : "Active"}</span></div>

                <div className="mt-5 rounded-[20px] bg-[#f7fbfc] p-4"><div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#97a7b4]">Progress</p><p className="mt-1 text-3xl font-black tracking-[-.06em] text-[#0b2d54]">{presentation.progress}<span className="text-base text-[#7b8d9d]">%</span></p></div><div className="text-right"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#97a7b4]">Target</p><p className="mt-1 text-xs font-black text-[#0b2d54]">{presentation.target}</p></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-gradient-to-r from-[#0b6f73] to-[#24c1c4] transition-all duration-500" style={{ width: `${presentation.progress}%` }} /></div></div>

                <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-[#e8eff1] bg-white p-3.5"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#97a7b4]">Current</p><p className="mt-1 text-xs font-bold text-[#0b2d54]">{presentation.current || "Not recorded yet"}</p></div><div className="rounded-2xl border border-[#e8eff1] bg-white p-3.5"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#97a7b4]">Target date</p><p className="mt-1 text-xs font-bold text-[#0b2d54]">{formatDate(goal?.targetDate) || "No date set"}</p></div></div>

                <div className="mt-4 flex items-center justify-between border-t border-[#edf2f5] pt-4"><div className="flex items-center gap-2 text-[10px] font-semibold text-[#74859a]">{presentation.achieved ? <><LockKeyhole className="h-3.5 w-3.5" />Completed goal</> : <><CheckCircle2 className="h-3.5 w-3.5 text-[#168660]" />Connected tracking</>}</div><div className="flex items-center gap-2"><button type="button" onClick={() => openEdit(goal)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7e4e8] px-3 py-2 text-[10px] font-black text-[#0b2d54] transition hover:bg-[#f6fafb]"><Edit3 className="h-3.5 w-3.5" />Edit</button><button type="button" disabled={deletingId === String(goal.id)} onClick={() => void deleteGoal(goal)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black text-red-600 transition hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{deletingId === String(goal.id) ? "Deleting…" : "Delete"}</button></div></div>
              </article>;
            })}
          </div>}

          <Link href="/today" className="mt-6 inline-flex items-center gap-2 text-[10px] font-black text-[#0b2d54]">Back to Today <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        {editorOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#08284a]/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[30px] bg-white shadow-[0_30px_90px_rgba(8,40,74,.28)] sm:rounded-[30px]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf2f5] bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b6f73]">Health goals</p><h2 className="mt-1 text-xl font-black tracking-[-.04em] text-[#0b2d54]">{editingId ? "Edit health goal" : "Add health goal"}</h2></div><button type="button" onClick={closeEditor} className="grid h-10 w-10 place-items-center rounded-xl bg-[#f4f7f8] text-[#617487] transition hover:bg-[#eaf0f2]" aria-label="Close editor"><X className="h-4 w-4" /></button></div>
            <div className="space-y-6 p-5 sm:p-7">
              <div><p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-[#74859a]">What are you working on?</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{CATEGORIES.map((category) => <button key={category.value} type="button" onClick={() => chooseCategory(category.value)} className={`rounded-2xl border px-3 py-3 text-left text-xs font-black transition ${draft.category === category.value ? "border-[#24c1c4] bg-[#e9f9fa] text-[#0b6f73]" : "border-[#dfe9ec] bg-white text-[#526779] hover:border-[#b9d8dc]"}`}>{category.label}<span className="mt-1 block text-[9px] font-semibold text-[#8a9aa7]">{category.unit || "Personal"}</span></button>)}</div></div>

              {draft.category && <>
                <div className="grid gap-4 sm:grid-cols-2"><TextField label="Goal name" value={draft.title} placeholder={selectedCategory?.label || "Name this goal"} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} /><div><label className="mb-2 block text-sm font-medium text-slate-700">Priority</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{PRIORITIES.map((priority) => <button key={priority} type="button" onClick={() => setDraft((current) => ({ ...current, priority }))} className={`rounded-xl border px-2 py-2.5 text-[10px] font-black ${draft.priority === priority ? "border-[#24c1c4] bg-[#e9f9fa] text-[#0b6f73]" : "border-slate-200 text-slate-500"}`}>{formatEnum(priority)}</button>)}</div></div></div>
                <div className="grid gap-4 sm:grid-cols-2"><TextField type="number" label={`${selectedCategory?.targetLabel || "Target"}${selectedCategory?.unit ? ` (${selectedCategory.unit})` : ""}`} value={draft.targetValue} placeholder="Enter a positive target" onChange={(value) => setDraft((current) => ({ ...current, targetValue: value }))} /><TextField label="Unit" value={draft.unit} onChange={(value) => setDraft((current) => ({ ...current, unit: value }))} /><TextField type="date" label="Target date" value={draft.targetDate} onChange={(value) => setDraft((current) => ({ ...current, targetDate: value }))} /></div>
                <TextField label="Why this goal matters" value={draft.description} placeholder="Optional context or motivation" onChange={(value) => setDraft((current) => ({ ...current, description: value }))} />

                <div className="rounded-2xl border border-[#dce9ee] bg-[#f7fbfc] p-4"><div className="flex items-start gap-3"><Target className="mt-0.5 h-4 w-4 shrink-0 text-[#0b6f73]" /><div><p className="text-xs font-black text-[#0b2d54]">Sympto will connect this goal to your health data</p><p className="mt-1 text-[11px] leading-5 text-[#74859a]">{selectedCategory?.frequency === "DAILY" ? "Daily" : selectedCategory?.frequency === "WEEKLY" ? "Weekly" : "Overall"} tracking · {selectedCategory?.comparison === "AT_LEAST" ? "at least" : selectedCategory?.comparison === "AT_MOST" ? "at most" : selectedCategory?.comparison === "DECREASE_TO" ? "decrease toward" : "target comparison"} your target.</p></div></div></div>
              </>}
            </div>
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[#edf2f5] bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><button type="button" onClick={closeEditor} className="rounded-xl px-4 py-2.5 text-xs font-black text-[#74859a]">Cancel</button><button type="button" onClick={() => void saveGoal()} disabled={saving || !draft.category || !draft.title.trim() || !draft.targetValue || Number(draft.targetValue) <= 0} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Saving…" : editingId ? "Save changes" : "Add goal"}<ArrowRight className="h-3.5 w-3.5" /></button></div>
          </div>
        </div>}
      </main>
    </ProtectedRoute>
  );
}
