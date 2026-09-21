"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Edit3, Plus, Target, Trash2, X, LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthGoalsService, type HealthGoalInput } from "@/services/health-goals.service";
import { TextField } from "@/components/ui/forms/TextField";

type GoalDraft = {
  title: string;
  description: string;
  category: string;
  priority: string;
  targetValue: string;
  unit: string;
  targetDate: string;
  weightDirection: "LOSE" | "GAIN" | "MAINTAIN";
  patientMedicationId?: string;
};

const CATEGORIES = [
  { value: "WEIGHT", label: "Weight", unit: "kg", metricType: "WEIGHT", metricKey: "weight.kg", frequency: "TOTAL", aggregation: "LATEST", comparison: "DECREASE_TO", targetLabel: "Target weight" },
  { value: "EXERCISE", label: "Exercise", unit: "mins/week", metricType: "EXERCISE", metricKey: "exercise.minutes", frequency: "WEEKLY", aggregation: "SUM", comparison: "AT_LEAST", targetLabel: "Minutes" },
  { value: "NUTRITION", label: "Nutrition", unit: "calories/day", metricType: "NUTRITION", metricKey: "nutrition.calories", frequency: "DAILY", aggregation: "SUM", comparison: "AT_MOST", targetLabel: "Calories" },
  { value: "BLOOD_PRESSURE", label: "Blood pressure", unit: "mmHg", metricType: "BLOOD_PRESSURE", metricKey: "blood_pressure.systolic", frequency: "DAILY", aggregation: "LATEST", comparison: "AT_MOST", targetLabel: "Systolic target" },
  { value: "BLOOD_GLUCOSE", label: "Blood glucose", unit: "mmol/L", metricType: "BLOOD_GLUCOSE", metricKey: "blood_glucose.value", frequency: "DAILY", aggregation: "LATEST", comparison: "AT_MOST", targetLabel: "Target level" },
  { value: "CHOLESTEROL", label: "Cholesterol", unit: "mmol/L", metricType: "CHOLESTEROL", metricKey: "cholesterol.total", frequency: "TOTAL", aggregation: "LATEST", comparison: "AT_MOST", targetLabel: "Target level" },
  { value: "MEDICATION", label: "Medication", unit: "%", metricType: "MEDICATION", metricKey: "medication.adherence", frequency: "WEEKLY", aggregation: "AVERAGE", comparison: "AT_LEAST", targetLabel: "Adherence target" },
  { value: "SLEEP", label: "Sleep", unit: "hours/night", metricType: "SLEEP", metricKey: "sleep.hours", frequency: "DAILY", aggregation: "LATEST", comparison: "AT_LEAST", targetLabel: "Hours" },
  { value: "MENTAL_HEALTH", label: "Mental health", unit: "score", metricType: "MENTAL_HEALTH", metricKey: "mental.stress", frequency: "DAILY", aggregation: "LATEST", comparison: "AT_MOST", targetLabel: "Maximum score" },
  { value: "HYDRATION", label: "Hydration", unit: "ml/day", metricType: "HYDRATION", metricKey: "hydration.ml", frequency: "DAILY", aggregation: "SUM", comparison: "AT_LEAST", targetLabel: "Daily amount" },
  { value: "SMOKING", label: "Smoking", unit: "cigarettes/day", metricType: "SMOKING", metricKey: "smoking.cigarettes", frequency: "DAILY", aggregation: "LATEST", comparison: "AT_MOST", targetLabel: "Maximum" },
  { value: "ALCOHOL", label: "Alcohol", unit: "drinks/week", metricType: "ALCOHOL", metricKey: "alcohol.drinks", frequency: "WEEKLY", aggregation: "SUM", comparison: "AT_MOST", targetLabel: "Maximum" },
  { value: "HEART_RATE", label: "Heart rate", unit: "bpm", metricType: "HEART_RATE", metricKey: "heart_rate.bpm", frequency: "DAILY", aggregation: "LATEST", comparison: "AT_MOST", targetLabel: "Target rate" },
  { value: "OTHER", label: "Personal goal", unit: "", metricType: "OTHER", metricKey: "other.value", frequency: "TOTAL", aggregation: "LATEST", comparison: "CLOSEST", targetLabel: "Target" },
] as const;
const TARGET_RULES: Record<string, { label: string; placeholder: string; helper: string; allowZero?: boolean }> = {
  WEIGHT: { label: "Target amount", placeholder: "e.g. 5", helper: "For Lose/Gain, enter the amount of weight change. Maintenance uses your current recorded weight." },
  EXERCISE: { label: "Minutes per week", placeholder: "e.g. 150", helper: "Tracks total exercise minutes recorded during the week." },
  NUTRITION: { label: "Daily calorie target", placeholder: "e.g. 2000", helper: "Tracks the total calories recorded for each day." },
  BLOOD_PRESSURE: { label: "Systolic target", placeholder: "e.g. 130", helper: "This goal currently tracks the systolic component of your blood-pressure readings." },
  BLOOD_GLUCOSE: { label: "Target glucose", placeholder: "e.g. 7.0", helper: "Tracks the latest blood-glucose value recorded for the day." },
  CHOLESTEROL: { label: "Total cholesterol target", placeholder: "e.g. 5.0", helper: "Tracks the latest total-cholesterol result you record." },
  MEDICATION: { label: "Adherence target", placeholder: "e.g. 90", helper: "Tracks adherence for the selected prescribed medication on a weekly basis." },
  SLEEP: { label: "Hours per night", placeholder: "e.g. 8", helper: "Tracks the sleep duration recorded for each day." },
  MENTAL_HEALTH: { label: "Maximum stress score", placeholder: "1–10", helper: "Uses the Daily Health Check-in stress score, where 1 is calm and 10 is very stressed." },
  HYDRATION: { label: "Daily water target", placeholder: "e.g. 2500", helper: "Tracks the total water intake recorded for the day." },
  SMOKING: { label: "Daily cigarette ceiling", placeholder: "0 for smoke-free", helper: "Set the maximum cigarettes you want to record for a day. Zero is valid.", allowZero: true },
  ALCOHOL: { label: "Weekly drink ceiling", placeholder: "0 for no drinks", helper: "Set the maximum drinks you want to record for a week. Zero is valid.", allowZero: true },
  HEART_RATE: { label: "Maximum resting rate", placeholder: "e.g. 80", helper: "Tracks the latest heart-rate measurement recorded for the day." },
  OTHER: { label: "Target value", placeholder: "Enter your target", helper: "Use this for a measurable personal target that does not fit the health categories above." },
};


const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function emptyDraft(): GoalDraft {
  return { title: "", description: "", category: "", priority: "MEDIUM", targetValue: "", unit: "", targetDate: "", weightDirection: "LOSE", patientMedicationId: "" };
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
  if (!Number.isFinite(latest)) return 0;
  const category = String(goal?.category ?? "").toUpperCase();
  const comparison = String(goal?.metricConfig?.comparison ?? "").toUpperCase();
  if (category === "WEIGHT" && (comparison === "INCREASE_TO" || comparison === "DECREASE_TO")) {
    return Math.max(-100, Math.min(100, Math.round(latest)));
  }
  return Math.max(0, Math.min(100, Math.round(latest)));
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
  const comparison = String(goal?.metricConfig?.comparison ?? "").toUpperCase();
  const numericTarget = Number(goal?.targetValue);
  const isWeight = category === "WEIGHT" && Number.isFinite(numericTarget);
  const target = isWeight
    ? comparison === "INCREASE_TO"
      ? `Gain ${numericTarget.toFixed(1)} kg`
      : comparison === "DECREASE_TO"
        ? `Lose ${numericTarget.toFixed(1)} kg`
        : comparison === "CLOSEST"
          ? "Maintain baseline"
          : `${numericTarget.toFixed(1)} kg`
    : goal?.targetValue != null
      ? `${goal.targetValue}${config.unit ? ` ${config.unit}` : ""}`
      : "Target not set";
  const progress = goalProgress(goal);
  const isDirectionalWeight = category === "WEIGHT" && (comparison === "INCREASE_TO" || comparison === "DECREASE_TO");
  const progressWidth = isDirectionalWeight ? Math.abs(progress) : progress;
  const progressLabel = isDirectionalWeight && String(goal?.status ?? "").toUpperCase() !== "ACHIEVED"
    ? (progress > 0 ? "+" : "") + progress + "%" + (progress < 0 ? " away" : "")
    : progress + "%";
  return { config, progress, progressWidth, progressLabel, current: goalCurrent(goal), target, achieved: String(goal?.status ?? "").toUpperCase() === "ACHIEVED" };
}

function bmiFor(weightKg: number | null, heightCm: number | null) {
  if (weightKg == null || heightCm == null || heightCm <= 0) return null;
  return weightKg / ((heightCm / 100) ** 2);
}

function weightAdvice(weight: number | null, height: number | null, requestedChangeKg: number | null, direction: "LOSE" | "GAIN" | "MAINTAIN", targetDate: string) {
  if (weight == null || (direction !== "MAINTAIN" && (requestedChangeKg == null || requestedChangeKg <= 0))) return null;
  const bmi = bmiFor(weight, height);
  const targetWeight = direction === "MAINTAIN"
    ? weight
    : direction === "GAIN"
      ? weight + requestedChangeKg!
      : weight - requestedChangeKg!;
  const targetBmi = bmiFor(targetWeight, height);
  const lowerHealthyWeight = height ? 18.5 * ((height / 100) ** 2) : null;
  const upperHealthyWeight = height ? 24.9 * ((height / 100) ** 2) : null;
  const days = targetDate ? Math.max(0, Math.ceil((new Date(`${targetDate}T23:59:59`).getTime() - Date.now()) / 86400000)) : null;
  const weeks = days != null && days > 0 ? days / 7 : null;
  const weekly = weeks && requestedChangeKg != null ? requestedChangeKg / weeks : null;
  const underweightNow = bmi != null && bmi < 18.5;
  const targetBelowHealthy = targetBmi != null && targetBmi < 18.5;
  const targetAboveHealthy = targetBmi != null && targetBmi >= 25;
  const targetInObesityRange = targetBmi != null && targetBmi >= 30;
  const targetBmiClass = targetBmi == null ? null : targetBmi < 18.5 ? "UNDERWEIGHT" : targetBmi < 25 ? "HEALTHY" : targetBmi < 30 ? "OVERWEIGHT" : targetBmi < 35 ? "OBESITY_CLASS_1" : targetBmi < 40 ? "OBESITY_CLASS_2" : "OBESITY_CLASS_3";
  return { bmi, requestedChangeKg, targetWeight, targetBmi, targetBmiClass, lowerHealthyWeight, upperHealthyWeight, weekly, underweightNow, targetBelowHealthy, targetAboveHealthy, targetInObesityRange };
}

export default function HealthGoalsPage() {
  const { data: dashboard, loading, error, reload } = useDashboard();
  const searchParams = useSearchParams();
  const medicationPrefillHandled = useRef(false);
  const goalEditHandled = useRef(false);
  const [draft, setDraft] = useState<GoalDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const healthGoals = useMemo(() => (Array.isArray(dashboard?.goals) ? dashboard.goals : []).filter((goal: any) => ["ACTIVE", "ACHIEVED", "ON_TRACK", "IMPROVING", "STAGNANT", "DECLINING"].includes(String(goal?.status ?? "").toUpperCase())), [dashboard?.goals]);
  const filteredGoals = useMemo(() => { const query = search.trim().toLowerCase(); if (!query) return healthGoals; return healthGoals.filter((goal: any) => `${goal?.title ?? ""} ${goal?.category ?? ""} ${goal?.description ?? ""}`.toLowerCase().includes(query)); }, [healthGoals, search]);
  const editingGoal = editingId ? healthGoals.find((goal: any) => String(goal.id) === editingId) : null;
  const selectedCategory = CATEGORIES.find((item) => item.value === draft.category);
  const targetRule = TARGET_RULES[draft.category] ?? TARGET_RULES.OTHER;
  const availableMedications = useMemo(() => {
    const source = Array.isArray(dashboard?.medications) && dashboard.medications.length > 0
      ? dashboard.medications
      : Array.isArray(dashboard?.today?.activeMedications) ? dashboard.today.activeMedications : [];
    return source.filter((medication: any) => {
      const status = String(medication?.status ?? "ACTIVE").toUpperCase();
      return !["ENDED", "INACTIVE", "DISCONTINUED", "CANCELLED"].includes(status);
    });
  }, [dashboard?.medications, dashboard?.today?.activeMedications]);
  const selectedMedication = useMemo(() => availableMedications.find((medication: any) => String(medication?.patientMedicationId ?? medication?.patientMedication?.id ?? medication?.id ?? "") === String(draft.patientMedicationId)), [availableMedications, draft.patientMedicationId]);
  const editorTargetNumber = Number(draft.targetValue);
  const editorTargetValid = draft.targetValue.trim() !== "" && Number.isFinite(editorTargetNumber) && editorTargetNumber >= 0 && (editorTargetNumber > 0 || Boolean(targetRule.allowZero)) && (draft.category !== "MEDICATION" || (Boolean(draft.patientMedicationId) && editorTargetNumber >= 1 && editorTargetNumber <= 100)) && (draft.category !== "MENTAL_HEALTH" || (editorTargetNumber >= 1 && editorTargetNumber <= 10));
  const currentWeight = Number(dashboard?.patient?.weightKg);
  const currentHeight = Number(dashboard?.patient?.heightCm);
  const advisor = draft.category === "WEIGHT" ? weightAdvice(Number.isFinite(currentWeight) ? currentWeight : null, Number.isFinite(currentHeight) ? currentHeight : null, Number(draft.targetValue) > 0 ? Number(draft.targetValue) : null, draft.weightDirection, draft.targetDate) : null;
  const reviseLossTarget = advisor?.lowerHealthyWeight != null && Number.isFinite(currentWeight) ? Math.max(0, currentWeight - advisor.lowerHealthyWeight) : null;
  const canReviseLossTarget = Boolean(advisor?.targetBelowHealthy && draft.weightDirection === "LOSE" && reviseLossTarget != null && reviseLossTarget < currentWeight);

  useEffect(() => {
    if (!editorOpen || !editingGoal) return;
    const category = CATEGORIES.find((item) => item.value === String(editingGoal.category ?? "")) ?? CATEGORIES[CATEGORIES.length - 1];
    setDraft({ title: String(editingGoal.title ?? ""), description: String(editingGoal.description ?? ""), category: category.value, priority: String(editingGoal.priority ?? "MEDIUM"), targetValue: editingGoal.targetValue == null ? "" : String(editingGoal.targetValue), unit: String(editingGoal.unit ?? category.unit), targetDate: editingGoal.targetDate ? String(editingGoal.targetDate).slice(0, 10) : "", weightDirection: String(editingGoal?.metricConfig?.comparison ?? "DECREASE_TO").toUpperCase() === "INCREASE_TO" ? "GAIN" : String(editingGoal?.metricConfig?.comparison ?? "").toUpperCase() === "CLOSEST" ? "MAINTAIN" : "LOSE" });
  }, [editingGoal, editorOpen]);

  useEffect(() => {
    if (!editorOpen || !editingGoal) return;
    setDraft((current) => ({ ...current, patientMedicationId: String(editingGoal?.patientMedicationId ?? editingGoal?.patientMedication?.id ?? current.patientMedicationId ?? "") }));
  }, [editingGoal, editorOpen]);

  useEffect(() => {
    if (loading || !healthGoals.length || typeof window === "undefined") return;
    if (searchParams.get("open") || searchParams.get("edit")) return;
    const hash = window.location.hash;
    if (!hash.startsWith("#goal-")) return;
    const goalId = decodeURIComponent(hash.slice("#goal-".length));
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scrollToGoal = () => {
      const target = document.getElementById(`goal-${goalId}`);
      if (target) { target.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      if (attempts < 12) { attempts += 1; timer = setTimeout(scrollToGoal, 100); }
    };
    requestAnimationFrame(scrollToGoal);
    return () => { if (timer) clearTimeout(timer); };
  }, [healthGoals, loading, searchParams]);

  useEffect(() => {
    if (goalEditHandled.current || loading || searchParams.get("open") || !dashboard?.goals) return;
    const editId = searchParams.get("edit")?.trim();
    if (!editId) return;
    const goal = healthGoals.find((item: any) => String(item?.id) === editId);
    if (!goal) return;
    goalEditHandled.current = true;
    const category = CATEGORIES.find((item) => item.value === String(goal?.category ?? "")) ?? CATEGORIES[CATEGORIES.length - 1];
    if (String(goal?.status ?? "").toUpperCase() === "ACHIEVED") {
      toast.info("This goal is completed. Start a new goal to begin another journey.");
      return;
    }
    setEditingId(String(goal.id));
    setDraft({ title: String(goal.title ?? ""), description: String(goal.description ?? ""), category: category.value, priority: String(goal.priority ?? "MEDIUM"), targetValue: goal.targetValue == null ? "" : String(goal.targetValue), unit: String(goal.unit ?? category.unit), targetDate: goal.targetDate ? String(goal.targetDate).slice(0, 10) : "", weightDirection: String(goal?.metricConfig?.comparison ?? "DECREASE_TO").toUpperCase() === "INCREASE_TO" ? "GAIN" : String(goal?.metricConfig?.comparison ?? "").toUpperCase() === "CLOSEST" ? "MAINTAIN" : "LOSE" });
    setEditorOpen(true);
  }, [dashboard?.goals, healthGoals, loading, searchParams]);

  useEffect(() => {
    if (medicationPrefillHandled.current || !dashboard?.patient?.id || loading || searchParams.get("open") !== "medication") return;
    medicationPrefillHandled.current = true;
    const name = searchParams.get("name")?.trim() || "Medication adherence";
    const dosage = searchParams.get("dosage")?.trim() || "";
    const frequency = searchParams.get("frequency")?.trim() || "";
    const details = [dosage && `Dosage: ${dosage}`, frequency && `Frequency: ${frequency.replaceAll("_", " ")}`].filter(Boolean).join(" · ");
    setEditingId(null); setDraft({ title: name, description: details ? `Medication: ${name} · ${details}` : `Medication: ${name}`, category: "MEDICATION", priority: "MEDIUM", targetValue: "90", unit: "%", targetDate: "", weightDirection: "LOSE", patientMedicationId: searchParams.get("patientMedicationId")?.trim() || "" }); setEditorOpen(true);
  }, [dashboard?.patient?.id, loading, searchParams]);

  function openAdd() { setEditingId(null); setDraft(emptyDraft()); setEditorOpen(true); }
  function openEdit(goal: any) {
    if (String(goal?.status ?? "").toUpperCase() === "ACHIEVED") {
      toast.info("This goal is completed. Start a new goal to begin another journey.");
      return;
    }
    setEditingId(String(goal.id));
    const category = CATEGORIES.find((item) => item.value === String(goal.category ?? "")) ?? CATEGORIES[CATEGORIES.length - 1];
    setDraft({ title: String(goal.title ?? ""), description: String(goal.description ?? ""), category: category.value, priority: String(goal.priority ?? "MEDIUM"), targetValue: goal.targetValue == null ? "" : String(goal.targetValue), unit: String(goal.unit ?? category.unit), targetDate: goal.targetDate ? String(goal.targetDate).slice(0, 10) : "", weightDirection: String(goal?.metricConfig?.comparison ?? "DECREASE_TO").toUpperCase() === "INCREASE_TO" ? "GAIN" : String(goal?.metricConfig?.comparison ?? "").toUpperCase() === "CLOSEST" ? "MAINTAIN" : "LOSE" });
    setEditorOpen(true);
  }
  function closeEditor() { if (saving) return; setEditorOpen(false); setEditingId(null); setDraft(emptyDraft()); }
  function chooseCategory(category: string) { if (editingId) return; const config = CATEGORIES.find((item) => item.value === category); setDraft((current) => ({ ...current, category, unit: config?.unit ?? "", title: current.title || config?.label || "", targetValue: category === "WEIGHT" && current.weightDirection === "MAINTAIN" && Number.isFinite(currentWeight) ? currentWeight.toFixed(1) : category === current.category ? current.targetValue : "", weightDirection: category === "WEIGHT" ? current.weightDirection : "LOSE", patientMedicationId: category === "MEDICATION" ? current.patientMedicationId : "" })); }

  async function saveGoal() {
    if (!dashboard?.patient?.id) { toast.error("Your patient profile could not be identified."); return; }
    if (!draft.category || !draft.title.trim() || !draft.priority || draft.targetValue.trim() === "") { toast.error("Add a goal name, category, priority and target."); return; }
    const targetNumber = Number(draft.targetValue);
    const categoryConfig = CATEGORIES.find((item) => item.value === draft.category);
    const allowsZero = draft.category === "SMOKING" || draft.category === "ALCOHOL";
    if (!categoryConfig || !Number.isFinite(targetNumber) || targetNumber < 0 || (targetNumber === 0 && !allowsZero)) { toast.error(allowsZero ? "Enter a valid target of 0 or more." : "Enter a positive target."); return; }
    if (draft.category === "MEDICATION" && (!draft.patientMedicationId || targetNumber < 1 || targetNumber > 100)) { toast.error("Select a prescribed medication and set adherence between 1% and 100%."); return; }
    if (draft.category === "MENTAL_HEALTH" && (targetNumber < 1 || targetNumber > 10)) { toast.error("Stress target must be between 1 and 10."); return; }
    const config = CATEGORIES.find((item) => item.value === draft.category);
    if (!config) return;
    if (draft.category === "WEIGHT") {
      const amount = Number(draft.targetValue);
      const weight = Number(dashboard?.patient?.weightKg);
      if (!Number.isFinite(amount) || amount <= 0) { toast.error("Enter a positive target weight."); return; }
      const height = Number(dashboard?.patient?.heightCm);      const analysis = weightAdvice(Number.isFinite(weight) ? weight : null, Number.isFinite(height) ? height : null, amount, draft.weightDirection, draft.targetDate);      if (!analysis) { toast.error(draft.weightDirection === "MAINTAIN" ? "Add your current weight before setting a weight-maintenance goal." : "Add your current weight and height before setting a weight goal."); return; }
    }    try {
      setSaving(true);
      const comparison: HealthGoalInput["comparison"] = draft.category === "WEIGHT" ? draft.weightDirection === "GAIN" ? "INCREASE_TO" : draft.weightDirection === "MAINTAIN" ? "CLOSEST" : "DECREASE_TO" : config.comparison;
      const input: HealthGoalInput = { patientId: dashboard.patient.id, patientMedicationId: draft.category === "MEDICATION" ? draft.patientMedicationId || undefined : undefined, title: draft.title.trim(), description: draft.description.trim() || undefined, category: config.value, priority: draft.priority, targetValue: draft.targetValue, unit: draft.unit || config.unit || undefined, targetDate: draft.targetDate || undefined, metricType: config.metricType, metricKey: config.metricKey, frequency: config.frequency, frequencyTarget: draft.targetValue, aggregation: config.aggregation, comparison };
      if (editingId) {
        await healthGoalsService.update(editingId, input);
        await healthGoalsService.configureMetric(editingId, { metricType: config.metricType, metricKey: config.metricKey, frequency: config.frequency, frequencyTarget: draft.targetValue, aggregation: config.aggregation, comparison });
        toast.success("Health goal updated. Its weight journey now starts from your current recorded weight.");
      } else { await healthGoalsService.create(input); toast.success("Health goal added."); }
      closeEditor(); await reload();
    } catch (err: any) { toast.error(String(err?.response?.data?.message || "We could not save this health goal.")); }
    finally { setSaving(false); }
  }

  async function deleteGoal(goal: any) {
    const id = String(goal?.id ?? ""); if (!id) return;
    if (!window.confirm(`Delete “${String(goal?.title || "this health goal")}” and its recorded goal progress? This cannot be undone.`)) return;
    try { setDeletingId(id); await healthGoalsService.remove(id); toast.success("Health goal deleted."); if (editingId === id) closeEditor(); await reload(); }
    catch (err: any) { toast.error(String(err?.response?.data?.message || "We could not delete this health goal.")); }
    finally { setDeletingId(null); }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5fafb] text-[#17314e]">
        <div className="mx-auto max-w-[1180px] px-4 pb-12 pt-4 sm:px-7 sm:pt-6">
          <header className="mb-6 flex items-center justify-between gap-4"><Link href="/today" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#0b2d54] transition hover:bg-white"><ArrowLeft className="h-4 w-4" />Back to Today</Link><button type="button" onClick={openAdd} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#123d63]"><Plus className="h-4 w-4" />Add health goal</button></header>
          <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#08284a] via-[#0e4773] to-[#24babe] p-7 text-white shadow-[0_20px_55px_rgba(11,45,84,0.12)] sm:p-9"><div className="absolute right-[-70px] top-[-80px] h-52 w-52 rounded-full bg-white/10 blur-3xl" /><div className="relative"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/85 ring-1 ring-white/10"><Target className="h-3.5 w-3.5" />Health goals</span><h1 className="mt-4 text-3xl font-black tracking-[-.045em] sm:text-4xl">Goals you are working toward</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Create, update and remove the health goals that shape how Sympto helps you track your progress.</p><div className="mt-6 flex flex-wrap gap-2.5"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 ring-1 ring-white/10">{healthGoals.length} {healthGoals.length === 1 ? "goal" : "goals"}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 ring-1 ring-white/10">Progress stays connected to your health data</span></div></div></section>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black tracking-[-.04em] text-[#0b2d54]">Your goals</h2><p className="mt-1 text-xs text-[#74859a]">Active goals can be revised. Completed goals stay here as history and are locked.</p></div><input aria-label="Search health goals" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search goals" className="min-h-10 rounded-xl border border-[#dce8ec] bg-white px-3.5 text-xs font-semibold text-[#0b2d54] outline-none placeholder:text-[#9aa8b5] focus:border-[#24c1c4] focus:ring-2 focus:ring-[#24c1c4]/15" /></div>
          {loading && <div className="mt-4 rounded-[24px] border border-[#dce8ec] bg-white p-6 text-sm text-[#74859a]">Loading your health goals…</div>}
          {error && !loading && <div className="mt-4 rounded-[24px] border border-red-200 bg-white p-6"><h2 className="font-black text-[#0b2d54]">We couldn&apos;t load your goals</h2><button type="button" onClick={reload} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-xs font-black text-white">Try again</button></div>}
          {!loading && !error && filteredGoals.length === 0 && <section className="mt-4 rounded-[28px] border border-[#dce8ec] bg-white p-10 text-center shadow-[0_14px_36px_rgba(11,45,84,.045)]"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b6f73]"><Target className="h-6 w-6" /></div><h2 className="mt-5 text-xl font-black text-[#0b2d54]">{search ? "No goals match your search" : "No health goals yet"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#74859a]">{search ? "Try another goal name or category." : "Create your first health goal and Sympto can connect your activity, measurements and tracking to it."}</p>{!search && <button type="button" onClick={openAdd} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-xs font-black text-white"><Plus className="h-4 w-4" />Create your first goal</button>}</section>}
          {!loading && !error && filteredGoals.length > 0 && <div className="mt-4 grid gap-4 lg:grid-cols-2">{filteredGoals.map((goal: any) => { const presentation = goalPresentation(goal); const status = String(goal?.status ?? "ACTIVE").toUpperCase(); return <article id={`goal-${String(goal.id)}`} key={String(goal.id)} className="group relative scroll-mt-6 overflow-hidden rounded-[26px] border border-[#dce8ec] bg-white p-5 shadow-[0_12px_30px_rgba(11,45,84,.045)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(11,45,84,.075)] sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3.5"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e5f7f6] text-[#0b6f73]"><Target className="h-5 w-5" /></div><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b6f73]">{presentation.config.label}</p><h3 className="mt-1 truncate text-[17px] font-black tracking-[-.03em] text-[#0b2d54]">{String(goal?.title || "Health goal")}</h3>{goal?.description && <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#74859a]">{String(goal.description)}</p>}
{Array.isArray(goal?.connectedGoals) && goal.connectedGoals.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="text-[9px] font-black uppercase tracking-[.12em] text-[#97a7b4]">Connected</span>{goal.connectedGoals.slice(0, 4).map((relation: any) => <span key={String(relation.id)} title={String(relation.rationale ?? "")} className="rounded-full bg-[#e9f9fa] px-2.5 py-1 text-[9px] font-bold text-[#0b6f73]">{String(relation.goal?.title ?? relation.goal?.category ?? "Related goal")}</span>)}{goal.connectedGoals.length > 4 && <span className="rounded-full bg-[#f3f6f7] px-2.5 py-1 text-[9px] font-bold text-[#74859a]">+{goal.connectedGoals.length - 4} more</span>}</div>}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${presentation.achieved ? "bg-[#e9f8f1] text-[#168660]" : status === "DECLINING" ? "bg-red-50 text-red-700" : "bg-[#e9f9fa] text-[#0b6f73]"}`}>{presentation.achieved ? "Completed" : status === "DECLINING" ? "Needs attention" : "Active"}</span></div><div className="mt-5 rounded-[20px] bg-[#f7fbfc] p-4"><div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#97a7b4]">Progress</p><p className="mt-1 text-3xl font-black tracking-[-.06em] text-[#0b2d54]">{presentation.progressLabel}</p></div><div className="text-right"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#97a7b4]">Target</p><p className="mt-1 text-xs font-black text-[#0b2d54]">{presentation.target}</p></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className={`h-full rounded-full transition-all duration-500 ${presentation.progress < 0 ? "bg-amber-400" : "bg-gradient-to-r from-[#0b6f73] to-[#24c1c4]"}`} style={{ width: `${presentation.progressWidth}%` }} /></div></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-[#e8eff1] bg-white p-3.5"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#97a7b4]">Current</p><p className="mt-1 text-xs font-bold text-[#0b2d54]">{presentation.current || "Not recorded yet"}</p></div><div className="rounded-2xl border border-[#e8eff1] bg-white p-3.5"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#97a7b4]">Target date</p><p className="mt-1 text-xs font-bold text-[#0b2d54]">{formatDate(goal?.targetDate) || "No date set"}</p></div></div><div className="mt-4 flex items-center justify-between border-t border-[#edf2f5] pt-4"><div className="flex items-center gap-2 text-[10px] font-semibold text-[#74859a]">{presentation.achieved ? <><LockKeyhole className="h-3.5 w-3.5" />Completed goal · history is locked</> : <><CheckCircle2 className="h-3.5 w-3.5 text-[#168660]" />Connected tracking</>}</div><div className="flex items-center gap-2">{presentation.achieved ? <button type="button" onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7e4e8] px-3 py-2 text-[10px] font-black text-[#0b2d54] transition hover:bg-[#f6fafb]"><Plus className="h-3.5 w-3.5" />New goal</button> : <button type="button" onClick={() => openEdit(goal)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7e4e8] px-3 py-2 text-[10px] font-black text-[#0b2d54] transition hover:bg-[#f6fafb]"><Edit3 className="h-3.5 w-3.5" />Edit</button>}<button type="button" disabled={deletingId === String(goal.id)} onClick={() => void deleteGoal(goal)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black text-red-600 transition hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{deletingId === String(goal.id) ? "Deleting…" : "Delete"}</button></div></div></article>; })}</div>}
          <Link href="/today" className="mt-6 inline-flex items-center gap-2 text-[10px] font-black text-[#0b2d54]">Back to Today <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        {editorOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#08284a]/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[30px] bg-white shadow-[0_30px_90px_rgba(8,40,74,.28)] sm:rounded-[30px]"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf2f5] bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0b6f73]">Health goals</p><h2 className="mt-1 text-xl font-black tracking-[-.04em] text-[#0b2d54]">{editingId ? "Edit health goal" : "Add health goal"}</h2></div><button type="button" onClick={closeEditor} className="grid h-10 w-10 place-items-center rounded-xl bg-[#f4f7f8] text-[#617487] transition hover:bg-[#eaf0f2]" aria-label="Close editor"><X className="h-4 w-4" /></button></div>
          <div className="space-y-6 p-5 sm:p-7">
            <div><p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-[#74859a]">What are you working on?</p>{editingId && <p className="mb-3 -mt-1 text-[10px] font-semibold leading-4 text-[#0b6f73]">This goal is already connected to your health tracking. Its category and core meaning are protected while you edit it.</p>}<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{CATEGORIES.map((category) => <button key={category.value} type="button" disabled={Boolean(editingId)} onClick={() => chooseCategory(category.value)} className={`rounded-2xl border px-3 py-3 text-left text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-100 ${draft.category === category.value ? "border-[#24c1c4] bg-[#e9f9fa] text-[#0b6f73]" : "border-[#dfe9ec] bg-white text-[#526779] hover:border-[#b9d8dc]"}`}>{category.label}<span className="mt-1 block text-[9px] font-semibold text-[#8a9aa7]">{category.unit || "Personal"}</span></button>)}</div></div>
            {draft.category && <>
              {draft.category === "WEIGHT" && <div className="rounded-[22px] border border-[#dce9ee] bg-[#f7fbfc] p-4 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#74859a]">First, choose the direction</p><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"><button type="button" disabled={Boolean(editingId)} onClick={() => setDraft((current) => ({ ...current, weightDirection: "LOSE", targetValue: current.weightDirection === "MAINTAIN" ? "" : current.targetValue }))} className={`rounded-2xl border px-4 py-3 text-left ${draft.weightDirection === "LOSE" ? "border-[#24c1c4] bg-white text-[#0b6f73]" : "border-[#dfe9ec] bg-white text-[#526779]"}`}><span className="block text-sm font-black">Lose weight</span><span className="mt-1 block text-[10px] font-semibold text-[#8a9aa7]">Choose how many kilograms you want to lose. Sympto calculates the destination from your baseline.</span></button><button type="button" disabled={Boolean(editingId)} onClick={() => setDraft((current) => ({ ...current, weightDirection: "MAINTAIN", targetValue: Number.isFinite(currentWeight) ? currentWeight.toFixed(1) : "" }))} className={`rounded-2xl border px-4 py-3 text-left ${draft.weightDirection === "MAINTAIN" ? "border-[#24c1c4] bg-white text-[#0b6f73]" : "border-[#dfe9ec] bg-white text-[#526779]"}`}><span className="block text-sm font-black">Maintain weight</span><span className="mt-1 block text-[10px] font-semibold text-[#8a9aa7]">Track staying close to your current recorded weight.</span></button><button type="button" disabled={Boolean(editingId)} onClick={() => setDraft((current) => ({ ...current, weightDirection: "GAIN", targetValue: current.weightDirection === "MAINTAIN" ? "" : current.targetValue }))} className={`rounded-2xl border px-4 py-3 text-left ${draft.weightDirection === "GAIN" ? "border-[#24c1c4] bg-white text-[#0b6f73]" : "border-[#dfe9ec] bg-white text-[#526779]"}`}><span className="block text-sm font-black">Gain weight</span><span className="mt-1 block text-[10px] font-semibold text-[#8a9aa7]">Choose how many kilograms you want to gain. Sympto calculates the destination from your baseline.</span></button></div>{advisor && <div className={`mt-4 rounded-2xl border p-4 ${advisor.underweightNow || advisor.targetBelowHealthy || advisor.targetAboveHealthy ? "border-amber-200 bg-amber-50" : "border-[#dce9ee] bg-white"}`}><p className="text-xs font-black text-[#0b2d54]">Your current numbers matter</p><p className="mt-1.5 text-[11px] leading-5 text-[#66798a]">You are currently {currentWeight.toFixed(1)} kg{advisor.bmi != null ? ` with a BMI of ${advisor.bmi.toFixed(1)}` : ""}. Saving this weight goal will use {currentWeight.toFixed(1)} kg as the new baseline.{draft.weightDirection === "MAINTAIN" ? ` Your maintenance target will remain at ${advisor.targetWeight.toFixed(1)} kg${advisor.targetBmi != null ? ` (BMI ${advisor.targetBmi.toFixed(1)})` : ""}.` : ` Your destination is ${advisor.targetWeight.toFixed(1)} kg${advisor.targetBmi != null ? ` (BMI ${advisor.targetBmi.toFixed(1)})` : ""}.`}</p>{advisor.underweightNow && draft.weightDirection === "LOSE" ? <><p className="mt-2 text-[11px] font-bold leading-5 text-amber-800">Your current BMI is below the adult screening range. Sympto will not encourage further weight loss here. The next step is to switch this goal to a weight-gain focus or discuss an appropriate target with a healthcare professional.</p><button type="button" onClick={() => setDraft((current) => ({ ...current, weightDirection: "GAIN", targetValue: "" }))} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3.5 py-2 text-[10px] font-black text-white shadow-sm transition hover:bg-[#123d63]">Switch to weight gain <ArrowRight className="h-3 w-3" /></button></> : draft.weightDirection === "MAINTAIN" ? <p className="mt-2 text-[11px] font-bold leading-5 text-[#0b6f73]">This goal uses your current recorded weight of {currentWeight.toFixed(1)} kg as the maintenance target. Sympto will continue monitoring your weight and show changes from this baseline.</p> : advisor.targetBelowHealthy && draft.weightDirection === "LOSE" ? <><p className="mt-2 text-[11px] font-bold leading-5 text-amber-800">This target would move you below BMI 18.5. Do not continue toward this planned target without reviewing it. For now, maintain your current weight or revise the loss target so the planned weight is not below the screening threshold.</p><div className="mt-3 rounded-2xl border border-amber-200 bg-white/70 p-3"><p className="text-[10px] font-black uppercase tracking-[.12em] text-amber-900">Next step</p><p className="mt-1 text-[10px] leading-5 text-amber-900/80">This weight goal is not finalized until you resolve the target review.</p><div className="mt-2.5 flex flex-wrap gap-2">{canReviseLossTarget && <button type="button" onClick={() => setDraft((current) => ({ ...current, targetValue: reviseLossTarget!.toFixed(1) }))} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2 text-[10px] font-black text-amber-900 transition hover:bg-amber-100">Revise loss to {reviseLossTarget!.toFixed(1)} kg</button>}<button type="button" onClick={() => setDraft((current) => ({ ...current, weightDirection: "GAIN", targetValue: "" }))} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3 py-2 text-[10px] font-black text-white transition hover:bg-[#123d63]">Switch to weight gain <ArrowRight className="h-3 w-3" /></button></div></div></> : draft.weightDirection === "GAIN" && advisor.targetAboveHealthy ? <><p className="mt-2 text-[11px] font-bold leading-5 text-amber-800">A gain of {advisor.requestedChangeKg?.toFixed(1)} kg projects a destination of {advisor.targetWeight?.toFixed(1)} kg, which corresponds to a BMI of {advisor.targetBmi?.toFixed(1)} at your recorded height and is outside the adult healthy-weight screening range. {advisor.targetInObesityRange ? "It falls in the adult obesity BMI screening category." : "It falls in the adult overweight BMI screening category."} This does not by itself determine whether the target is appropriate because BMI does not distinguish muscle from fat. Review the target with a healthcare professional before pursuing it.</p><div className="mt-3 rounded-2xl border border-amber-200 bg-white/70 p-3"><p className="text-[10px] font-black uppercase tracking-[.12em] text-amber-900">Target review</p><p className="mt-1 text-[10px] leading-5 text-amber-900/80">At your recorded height, BMI 24.9 corresponds to about {advisor.upperHealthyWeight?.toFixed(1)} kg. Use this as screening context, not as a diagnosis or a required target.</p></div></> : draft.weightDirection === "GAIN" && advisor.underweightNow ? <p className="mt-2 text-[11px] font-bold leading-5 text-[#0b6f73]">Because your current BMI is below 18.5, the priority should be healthy weight restoration rather than simply chasing a number. A clinician or dietitian can help set an appropriate gain target.</p> : advisor.weekly != null && <p className="mt-2 text-[11px] font-black text-[#0b2d54]">Plan: about {advisor.weekly.toFixed(1)} kg/week for the requested change, reaching a projected {advisor.targetWeight?.toFixed(1)} kg by {formatDate(draft.targetDate)}.</p>}{advisor.weekly != null && !(advisor.targetBelowHealthy && draft.weightDirection === "LOSE") && !(advisor.targetAboveHealthy && draft.weightDirection === "GAIN") && !(advisor.underweightNow && draft.weightDirection === "LOSE") && draft.targetDate && advisor.weekly > 0.9 && <p className="mt-1 text-[10px] font-semibold text-amber-800">That is a relatively fast planned rate. Consider a longer target date and discuss the plan with a healthcare professional.</p>}</div>}</div>}
              <div className="grid gap-4 sm:grid-cols-2"><TextField label="Goal name" value={draft.title} placeholder={selectedCategory?.label || "Name this goal"} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} /><div><label className="mb-2 block text-sm font-medium text-slate-700">Priority</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{PRIORITIES.map((priority) => <button key={priority} type="button" onClick={() => setDraft((current) => ({ ...current, priority }))} className={`rounded-xl border px-2 py-2.5 text-[10px] font-black ${draft.priority === priority ? "border-[#24c1c4] bg-[#e9f9fa] text-[#0b6f73]" : "border-slate-200 text-slate-500"}`}>{formatEnum(priority)}</button>)}</div></div></div>
               <div className="space-y-4">
                 {draft.category === "MEDICATION" && <div className="rounded-2xl border border-[#dce9ee] bg-[#f7fbfc] p-4"><label className="block"><span className="text-[10px] font-black uppercase tracking-[0.13em] text-[#74859a]">Prescribed medication</span><select value={draft.patientMedicationId} disabled={Boolean(editingId)} onChange={(event) => setDraft((current) => ({ ...current, patientMedicationId: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-[#d7e4e8] bg-white px-3 text-sm font-bold text-[#0b2d54] outline-none focus:border-[#24c1c4] disabled:bg-[#f3f6f7]"><option value="">Select the medication this goal tracks</option>{availableMedications.map((medication: any) => { const id = String(medication?.patientMedicationId ?? medication?.patientMedication?.id ?? medication?.id ?? ""); const name = String(medication?.name ?? medication?.medication?.name ?? medication?.medication?.genericName ?? "Medication"); const details = [medication?.dosage, medication?.frequency].filter(Boolean).join(" · "); return <option key={id} value={id}>{name}{details ? ` · ${details}` : ""}</option>; })}</select></label>{availableMedications.length === 0 && <p className="mt-2 text-[10px] font-semibold text-amber-800">No active prescribed medication is available. Add or activate a medication first.</p>}{selectedMedication && <p className="mt-2 text-[10px] font-semibold text-[#0b6f73]">Tracking: {String(selectedMedication?.name ?? selectedMedication?.medication?.name ?? "Medication")}.</p>}</div>}
                 <div className="grid gap-4 sm:grid-cols-2">
                   <TextField type="number" label={`${draft.category === "WEIGHT" ? draft.weightDirection === "MAINTAIN" ? "Maintenance weight" : draft.weightDirection === "GAIN" ? "How much do you want to gain" : "How much do you want to lose" : targetRule.label}${selectedCategory?.unit ? ` (${selectedCategory.unit})` : ""}`} value={draft.targetValue} placeholder={draft.category === "WEIGHT" && draft.weightDirection === "MAINTAIN" ? "Current weight" : targetRule.placeholder} disabled={draft.category === "WEIGHT" && draft.weightDirection === "MAINTAIN"} onChange={(value) => setDraft((current) => ({ ...current, targetValue: value }))} />
                   {draft.category === "OTHER" ? <TextField label="Unit" value={draft.unit} placeholder="e.g. sessions, pages, points" onChange={(value) => setDraft((current) => ({ ...current, unit: value }))} /> : <div className="rounded-xl border border-[#e1eaed] bg-[#f8fbfc] px-3.5 py-3"><p className="text-[9px] font-black uppercase tracking-[.12em] text-[#91a0ae]">Unit</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{selectedCategory?.unit || "As recorded"}</p></div>}
                   <TextField type="date" label="Target date" value={draft.targetDate} onChange={(value) => setDraft((current) => ({ ...current, targetDate: value }))} />
                 </div>
                 {selectedCategory && <div className="rounded-2xl border border-[#e1eaed] bg-[#fbfdfd] px-4 py-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e9f9fa] px-2.5 py-1 text-[9px] font-black text-[#0b6f73]">{selectedCategory.frequency === "DAILY" ? "Daily" : selectedCategory.frequency === "WEEKLY" ? "Weekly" : "Journey"}</span><span className="rounded-full bg-[#f3f6f7] px-2.5 py-1 text-[9px] font-black text-[#74859a]">{selectedCategory.comparison === "AT_LEAST" ? "At least target" : selectedCategory.comparison === "AT_MOST" ? "At most target" : selectedCategory.comparison === "CLOSEST" ? "Stay close to target" : selectedCategory.comparison === "INCREASE_TO" ? "Increase toward target" : "Decrease toward target"}</span></div><p className="mt-2 text-[10px] leading-5 text-[#74859a]">{targetRule.helper}</p></div>}
               </div>
              <TextField label="Why this goal matters" value={draft.description} placeholder="Optional context or motivation" onChange={(value) => setDraft((current) => ({ ...current, description: value }))} />
              <div className="rounded-2xl border border-[#dce9ee] bg-[#f7fbfc] p-4"><div className="flex items-start gap-3"><Target className="mt-0.5 h-4 w-4 shrink-0 text-[#0b6f73]" /><div><p className="text-xs font-black text-[#0b2d54]">Sympto will connect this goal to your health data</p><p className="mt-1 text-[11px] leading-5 text-[#74859a]">{draft.category === "WEIGHT" ? `${draft.weightDirection === "LOSE" ? "Loss" : draft.weightDirection === "GAIN" ? "Gain" : "Maintenance"} goal · directional target is the requested amount of weight change; destination is calculated from your baseline` : `${selectedCategory?.frequency === "DAILY" ? "Daily" : selectedCategory?.frequency === "WEEKLY" ? "Weekly" : "Overall"} tracking · ${selectedCategory?.comparison === "AT_LEAST" ? "at least" : selectedCategory?.comparison === "AT_MOST" ? "at most" : String(selectedCategory?.comparison ?? "") === "DECREASE_TO" ? "decrease toward" : "target comparison"} your target.`}</p></div></div></div>
            </>}
          </div>
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[#edf2f5] bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><button type="button" onClick={closeEditor} className="rounded-xl px-4 py-2.5 text-xs font-black text-[#74859a]">Cancel</button><button type="button" onClick={() => void saveGoal()} disabled={saving || !draft.category || !draft.title.trim() || !editorTargetValid} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Saving…" : editingId ? "Save changes" : "Add goal"}<ArrowRight className="h-3.5 w-3.5" /></button></div>
        </div></div>}
      </main>
    </ProtectedRoute>
  );
}