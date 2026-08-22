"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Apple,
  Brain,
  Calendar,
  Cigarette,
  Dumbbell,
  Droplet,
  Edit2,
  GlassWater,
  Heart,
  HeartPulse,
  HelpCircle,
  Moon,
  Pill,
  Weight,
  ShieldAlert,
  Target,
  Wine,
} from "lucide-react";

import { SectionTitle } from "@/components/onboarding/SectionTitle";
import { TextField } from "@/components/ui/forms/TextField";

import type {
  HealthGoalCategory,
  HealthGoalItem,
  HealthGoalPriority,
  UpdateHealthGoalsDto,
} from "@/types/onboarding";

interface HealthGoalsStepProps {
  values: UpdateHealthGoalsDto;
  onChange: (values: UpdateHealthGoalsDto) => void;
}

type GoalConfig = {
  label: string;
  icon: typeof Target;
  unit: string;
  placeholder: string;
};

const GOAL_CATEGORIES: Record<
  HealthGoalCategory,
  GoalConfig
> = {
  WEIGHT: {
    label: "Lose weight",
    icon: Weight,
    unit: "kg",
    placeholder: "e.g. 5",
  },

  NUTRITION: {
    label: "Eat healthier",
    icon: Apple,
    unit: "servings/day",
    placeholder: "e.g. 5",
  },

  EXERCISE: {
    label: "Exercise more",
    icon: Dumbbell,
    unit: "mins/week",
    placeholder: "e.g. 150",
  },

  SLEEP: {
    label: "Sleep better",
    icon: Moon,
    unit: "hours/night",
    placeholder: "e.g. 8",
  },

  MENTAL_HEALTH: {
    label: "Improve mental health",
    icon: Brain,
    unit: "",
    placeholder: "",
  },

  HYDRATION: {
    label: "Drink more water",
    icon: GlassWater,
    unit: "glasses/day",
    placeholder: "e.g. 8",
  },

  MEDICATION: {
    label: "Manage medication",
    icon: Pill,
    unit: "",
    placeholder: "",
  },

  SMOKING: {
    label: "Stop smoking",
    icon: Cigarette,
    unit: "cigarettes/day",
    placeholder: "e.g. 0",
  },

  ALCOHOL: {
    label: "Reduce alcohol use",
    icon: Wine,
    unit: "drinks/week",
    placeholder: "e.g. 2",
  },

  BLOOD_PRESSURE: {
    label: "Improve blood pressure",
    icon: HeartPulse,
    unit: "mmHg",
    placeholder: "e.g. 120/80",
  },

  BLOOD_GLUCOSE: {
    label: "Improve blood glucose",
    icon: Droplet,
    unit: "mmol/L",
    placeholder: "e.g. 5.5",
  },

  CHOLESTEROL: {
    label: "Improve cholesterol",
    icon: HeartPulse,
    unit: "mmol/L",
    placeholder: "e.g. 5",
  },

  HEART_RATE: {
    label: "Improve heart health",
    icon: Heart,
    unit: "bpm",
    placeholder: "e.g. 70",
  },

  OTHER: {
    label: "Other",
    icon: HelpCircle,
    unit: "",
    placeholder: "",
  },
};

const GOAL_OPTIONS = (
  Object.entries(GOAL_CATEGORIES) as [
    HealthGoalCategory,
    GoalConfig,
  ][]
).map(([value, config]) => ({
  label: config.label,
  value,
}));

const PRIORITY_OPTIONS: {
  label: string;
  value: HealthGoalPriority;
}[] = [
  {
    label: "Low",
    value: "LOW",
  },
  {
    label: "Medium",
    value: "MEDIUM",
  },
  {
    label: "High",
    value: "HIGH",
  },
];

function createEmptyGoal(): HealthGoalItem {
  return {
    title: "",
    description: "",
    category: "",
    priority: undefined,
    targetValue: undefined,
    unit: "",
    targetDate: "",
  };
}

function getGoalConfig(
  category: HealthGoalCategory | "",
): GoalConfig {
  if (!category) {
    return {
      label: "",
      unit: "",
      placeholder: "",
      icon: Target,
    };
  }

  return GOAL_CATEGORIES[category];
}

function getPriorityClasses(
  priority?: HealthGoalPriority,
) {
  switch (priority) {
    case "HIGH":
      return "bg-red-50 text-red-600 border-red-100";

    case "MEDIUM":
      return "bg-amber-50 text-amber-600 border-amber-100";

    case "LOW":
      return "bg-slate-100 text-slate-600 border-slate-200";

    default:
      return "bg-slate-100 text-slate-500 border-slate-200";
  }
}

function formatTargetDate(date?: string) {
  if (!date) {
    return "";
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getGoalTargetHeading(
  category: HealthGoalCategory | "",
) {
  switch (category) {
    case "SMOKING":
      return "Set your smoking target";

    case "ALCOHOL":
      return "Set your drinking target";

    case "NUTRITION":
      return "Set your nutrition target";

    case "EXERCISE":
      return "Set your activity target";

    case "SLEEP":
      return "Set your sleep target";

    case "HYDRATION":
      return "Set your hydration target";

    case "WEIGHT":
      return "Set your weight target";

    case "MENTAL_HEALTH":
      return "Set a wellbeing target";

    case "MEDICATION":
      return "Set a medication target";

    case "BLOOD_PRESSURE":
      return "Set your blood pressure target";

    case "BLOOD_GLUCOSE":
      return "Set your blood glucose target";

    case "CHOLESTEROL":
      return "Set your cholesterol target";

    case "HEART_RATE":
      return "Set your heart health target";

    default:
      return "Set your target";
  }
}

function getGoalTargetDescription(
  category: HealthGoalCategory | "",
) {
  switch (category) {
    case "SMOKING":
      return "Choose a daily cigarette target you'd like to work towards.";

    case "ALCOHOL":
      return "Choose how much you'd like to reduce your drinking.";

    case "NUTRITION":
      return "Choose something simple and realistic that you can track.";

    case "EXERCISE":
      return "Set an activity target that feels achievable for you.";

    case "SLEEP":
      return "Choose how much sleep you'd like to aim for each night.";

    case "HYDRATION":
      return "Set a daily water intake target that feels realistic.";

    case "WEIGHT":
      return "Set the weight you'd like to work towards.";

    case "MENTAL_HEALTH":
      return "Choose a simple wellbeing target if you'd like something measurable.";

    case "MEDICATION":
      return "Add a target if there is something specific you'd like to track.";

    default:
      return "Give yourself something specific to work towards.";
  }
}

function getGoalTargetLabel(
  category: HealthGoalCategory | "",
) {
  switch (category) {
    case "SMOKING":
      return "Target cigarettes per day";

    case "ALCOHOL":
      return "Target drinks per week";

    case "NUTRITION":
      return "Target servings per day";

    case "EXERCISE":
      return "Target minutes per week";

    case "SLEEP":
      return "Target hours per night";

    case "HYDRATION":
      return "Target amount per day";

    case "WEIGHT":
      return "Target weight";

    case "BLOOD_PRESSURE":
      return "Target reading";

    case "BLOOD_GLUCOSE":
      return "Target reading";

    case "CHOLESTEROL":
      return "Target reading";

    case "HEART_RATE":
      return "Target heart rate";

    default:
      return "Target amount";
  }
}

function getDescriptionPlaceholder(
  category: HealthGoalCategory | "",
) {
  switch (category) {
    case "NUTRITION":
      return "e.g. I'd like to eat more vegetables and cook at home.";

    case "EXERCISE":
      return "e.g. I'd like to feel more energetic and move more each week.";

    case "SLEEP":
      return "e.g. I'd like to wake up feeling more rested.";

    case "SMOKING":
      return "e.g. I'd like to stop smoking because I want to improve my health.";

    case "ALCOHOL":
      return "e.g. I'd like to drink less during the week and feel better in the mornings.";

    case "HYDRATION":
      return "e.g. I often forget to drink water during the day.";

    case "WEIGHT":
      return "e.g. I'd like to feel healthier and more comfortable in my body.";

    case "MENTAL_HEALTH":
      return "e.g. I'd like to feel calmer and make more time for myself.";

    case "MEDICATION":
      return "e.g. I'd like to stay consistent with my medication routine.";

    default:
      return "e.g. Tell us what motivates you or what you'd like to change.";
  }
}

export function HealthGoalsStep({
  values,
  onChange,
}: HealthGoalsStepProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] =
    useState<number | null>(null);

  const [form, setForm] =
    useState<HealthGoalItem>(createEmptyGoal());

  const selectedConfig =
    form.category === ""
      ? null
      : getGoalConfig(form.category);

  const isQualitative =
    !!selectedConfig && !selectedConfig.unit;

  useEffect(() => {
    if (!isModalOpen || !form.category) {
      return;
    }

    const config = getGoalConfig(form.category);

    setForm((current) => ({
      ...current,
      unit: config.unit,
      targetValue: config.unit
        ? current.targetValue
        : undefined,
    }));
  }, [form.category, isModalOpen]);

  function openAddModal(
    category?: HealthGoalCategory,
  ) {
    setEditingIndex(null);

    if (category) {
      const config = getGoalConfig(category);

      setForm({
        ...createEmptyGoal(),
        category,
        title: config.label,
        unit: config.unit,
      });
    } else {
      setForm(createEmptyGoal());
    }

    setIsModalOpen(true);
  }

  function openEditModal(index: number) {
    const existing = values.goals[index];

    setEditingIndex(index);
    setForm({
      ...existing,
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingIndex(null);
    setForm(createEmptyGoal());
  }

  function updateForm(
    field: keyof HealthGoalItem,
    value: unknown,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSaveGoal() {
    if (!form.category) {
      return;
    }

    if (!form.title.trim()) {
      return;
    }

    if (!form.priority) {
      return;
    }

    const goal: HealthGoalItem = {
      ...form,
      title: form.title.trim(),
      description: form.description?.trim() || "",
      unit: isQualitative
        ? ""
        : form.unit || "",
      targetValue: isQualitative
        ? undefined
        : form.targetValue,
      targetDate: form.targetDate || undefined,
    };

    const updatedGoals = [...values.goals];

    if (editingIndex !== null) {
      updatedGoals[editingIndex] = goal;
    } else {
      updatedGoals.push(goal);
    }

    onChange({
      goals: updatedGoals,
    });

    closeModal();
  }

  function removeGoal(index: number) {
    onChange({
      goals: values.goals.filter(
        (_, i) => i !== index,
      ),
    });
  }

  return (
    <div>
      <SectionTitle
        step={8}
        title="Your Health Goals"
        description="Choose the areas you'd like to focus on. Select as many as you'd like."
      />

      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#24C1C4]">
              Your focus areas
            </span>

            <h3 className="mt-1 text-base font-bold tracking-tight text-[#0B2D54]">
              What would you like to work on?
            </h3>

            <p className="mt-1 max-w-lg text-xs leading-5 text-slate-500">
              Pick the areas that matter to you right now.
              You can update your goals later.
            </p>
          </div>

          <div className="flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1">
            <span className="text-[10px] font-bold text-slate-500">
              {values.goals.length}
            </span>

            <span className="ml-1 text-[10px] font-medium text-slate-400">
              {values.goals.length === 1
                ? "goal"
                : "goals"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GOAL_OPTIONS.map((option) => {
            const existingGoal = values.goals.find(
              (goal) =>
                goal.category === option.value,
            );

            const isSelected =
              Boolean(existingGoal);

            const config =
              getGoalConfig(option.value);

            const Icon = config.icon;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    const index =
                      values.goals.findIndex(
                        (goal) =>
                          goal.category ===
                          option.value,
                      );

                    if (index !== -1) {
                      removeGoal(index);
                    }
                  } else {
                    openAddModal(option.value);
                  }
                }}
                className={`group relative flex min-h-[84px] items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-[#24C1C4]/60 bg-[#24C1C4]/[0.06] shadow-[0_6px_20px_rgba(36,193,196,0.10)] ring-1 ring-[#24C1C4]/10"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#24C1C4]/40 hover:bg-[#F9FEFE] hover:shadow-[0_8px_22px_rgba(15,23,42,0.06)]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                      isSelected
                        ? "bg-white shadow-sm"
                        : "bg-slate-50 group-hover:scale-105 group-hover:bg-[#24C1C4]/10"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 transition-colors ${
                        isSelected
                          ? "text-[#159FA3]"
                          : "text-slate-400 group-hover:text-[#159FA3]"
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <h4
                      className={`truncate text-xs font-bold ${
                        isSelected
                          ? "text-[#0B2D54]"
                          : "text-slate-800"
                      }`}
                    >
                      {option.label}
                    </h4>

                    <p
                      className={`mt-1 text-[11px] font-medium ${
                        isSelected
                          ? "text-[#159FA3]"
                          : "text-slate-400 group-hover:text-slate-500"
                      }`}
                    >
                      {isSelected
                        ? "Selected — tap to remove"
                        : "Tap to add this focus area"}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                    isSelected
                      ? "border-[#24C1C4] bg-[#24C1C4] text-white shadow-sm"
                      : "border-slate-200 bg-white group-hover:border-[#24C1C4]/50"
                  }`}
                >
                  {isSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3 w-3"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.42 0l-3.25-3.25a1 1 0 111.42-1.42l2.54 2.54 6.54-6.54a1 1 0 011.42 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {values.goals.length > 0 && (
  <div className="mt-5 overflow-hidden rounded-2xl border border-[#24C1C4]/20 bg-gradient-to-br from-[#F2FEFE] via-white to-slate-50 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
    <div className="flex items-center justify-between border-b border-[#24C1C4]/10 px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#24C1C4]/15 text-[#159FA3]">
          <Target className="h-4 w-4" />
        </div>

        <div>
          <p className="text-xs font-bold text-[#0B2D54]">
            Your focus is taking shape
          </p>

          <p className="mt-0.5 text-[10px] text-slate-400">
            {values.goals.length === 1
              ? "1 area selected"
              : `${values.goals.length} areas selected`}
          </p>
        </div>
      </div>

      <div className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#0B2D54] px-2.5 text-[10px] font-bold text-white shadow-sm">
        {values.goals.length}
      </div>
    </div>

    <div className="px-4 py-3.5">
      <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
        You're focusing on
      </p>

      <div className="flex flex-wrap gap-2">
        {values.goals.map((goal, index) => {
  const config = getGoalConfig(goal.category);
  const Icon = config.icon;

  return (
    <button
      key={`${goal.category}-${index}`}
      type="button"
      onClick={() => openEditModal(index)}
      className="group flex min-w-[180px] flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#24C1C4]/50 hover:shadow-md"
      title="Edit goal"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#24C1C4]/10 text-[#159FA3] transition-transform duration-200 group-hover:scale-105">
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-bold text-[#0B2D54]">
          {goal.title ||
            config.label ||
            goal.category}
        </span>

        {(goal.targetValue !== undefined ||
          goal.targetDate) && (
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-medium text-slate-400">
            {goal.targetValue !== undefined &&
              goal.unit && (
                <span>
                  Target: {goal.targetValue} {goal.unit}
                </span>
              )}

            {goal.targetDate && (
              <span className="inline-flex items-center gap-1 text-[#159FA3]">
                <Calendar className="h-2.5 w-2.5" />
                By {formatTargetDate(goal.targetDate)}
              </span>
            )}
          </span>
        )}
      </span>

      <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#24C1C4]/10 text-[#159FA3] opacity-0 transition-all duration-200 group-hover:opacity-100">
        <Edit2 className="h-2.5 w-2.5" />
      </span>
    </button>
  );
})}
      </div>
    </div>

    <div className="flex items-start gap-2.5 border-t border-[#24C1C4]/10 bg-[#24C1C4]/[0.035] px-4 py-3">

      <p className="text-[10px] leading-5 text-slate-500">
        Start with what matters most to you. You can refine your
        targets, add more focus areas, or change your goals anytime.
      </p>
    </div>
  </div>
)}

</div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B2D54]/45 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(11,45,84,0.18)]">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#24C1C4]/10 text-[#159FA3]">
                    {selectedConfig ? (
                      (() => {
                        const GoalIcon =
                          selectedConfig.icon;

                        return (
                          <GoalIcon className="h-5 w-5" />
                        );
                      })()
                    ) : (
                      <Target className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#24C1C4]">
                      Health goal
                    </p>

                    <h2 className="mt-0.5 text-base font-bold tracking-tight text-[#0B2D54]">
                      {editingIndex !== null
                        ? "Update your goal"
                        : selectedConfig?.label ||
                          "Let's personalize this"}
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      A few details will help make this
                      goal specific and easier to track.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              <div className="space-y-5">
                

                <div>
                  <div className="mb-2.5">
                    <h3 className="text-xs font-semibold text-slate-800">
                      Give your goal a name
                    </h3>

                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Keep it simple and personal.
                    </p>
                  </div>

                  <TextField
                    label=""
                    placeholder={
                      selectedConfig?.label ||
                      "What would you like to achieve?"
                    }
                    value={form.title}
                    onChange={(value) =>
                      updateForm("title", value)
                    }
                  />
                </div>

                <div>
                  <div className="mb-2.5">
                    <h3 className="text-xs font-semibold text-slate-800">
                      How important is this right now?
                    </h3>

                    <p className="mt-0.5 text-[11px] text-slate-400">
                      This helps us understand what matters
                      most to you.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {PRIORITY_OPTIONS.map(
                      (option) => {
                        const selected =
                          form.priority ===
                          option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              updateForm(
                                "priority",
                                option.value,
                              )
                            }
                            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                              selected
                                ? "border-[#24C1C4] bg-[#24C1C4]/10 text-[#159FA3] shadow-sm"
                                : "border-slate-200 bg-white text-slate-500 hover:border-[#24C1C4]/40 hover:bg-[#F9FEFE]"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                {!isQualitative && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold text-slate-800">
                        {getGoalTargetHeading(
                          form.category,
                        )}
                      </h3>

                      <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                        {getGoalTargetDescription(
                          form.category,
                        )}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <TextField
                        type="number"
                        label={getGoalTargetLabel(
                          form.category,
                        )}
                        placeholder={
                          selectedConfig?.placeholder ||
                          "Enter target"
                        }
                        value={
                          form.targetValue?.toString() ??
                          ""
                        }
                        onChange={(value) =>
                          updateForm(
                            "targetValue",
                            value === ""
                              ? undefined
                              : Number(value),
                          )
                        }
                      />

                      <TextField
                        label="Unit"
                        placeholder={
                          selectedConfig?.unit ||
                          "e.g. times/week"
                        }
                        value={
                          form.unit ?? ""
                        }
                        onChange={(value) =>
                          updateForm(
                            "unit",
                            value,
                          )
                        }
                      />
                    </div>

                    <div className="mt-3">
                      <TextField
                        type="date"
                        label="Target date"
                        value={
                          form.targetDate ?? ""
                        }
                        onChange={(value) =>
                          updateForm(
                            "targetDate",
                            value,
                          )
                        }
                      />
                    </div>
                  </div>
                )}

                {isQualitative && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-800">
                        Give yourself something to work towards
                      </h3>

                      <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                        You don't need a number for this goal.
                        Add a target date if you'd like.
                      </p>
                    </div>

                    <div className="mt-3">
                      <TextField
                        type="date"
                        label="Target date"
                        value={
                          form.targetDate ?? ""
                        }
                        onChange={(value) =>
                          updateForm(
                            "targetDate",
                            value,
                          )
                        }
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold text-slate-800">
                        Anything you'd like to add?
                      </h3>

                      <span className="text-[10px] font-medium text-slate-400">
                        Optional
                      </span>
                    </div>

                    <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                      Add a reason, motivation, or detail that
                      helps give your goal context.
                    </p>
                  </div>

                  <TextField
                    label=""
                    placeholder={getDescriptionPlaceholder(
                      form.category,
                    )}
                    value={
                      form.description ?? ""
                    }
                    onChange={(value) =>
                      updateForm(
                        "description",
                        value,
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={
                  !form.category ||
                  !form.title.trim() ||
                  !form.priority
                }
                className="inline-flex items-center gap-2 rounded-lg bg-[#0B2D54] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#082443] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {editingIndex !== null
                  ? "Save changes"
                  : "Add this goal"}

                <span className="text-sm">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
