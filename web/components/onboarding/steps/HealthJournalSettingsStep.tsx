"use client";

import {
  Activity,
  Apple,
  Bell,
  CalendarDays,
  Droplet,
  Heart,
  Moon,
  Pill,
  Smile,
  Stethoscope,
  Sun,
  Sunset,
  TrendingUp,
} from "lucide-react";

import { SectionTitle } from "@/components/onboarding/SectionTitle";
import { TextField } from "@/components/ui/forms/TextField";

import type {
  UpdateHealthJournalSettingsDto,
} from "@/types/onboarding";

interface HealthJournalSettingsStepProps {
  values: UpdateHealthJournalSettingsDto;

  onChange: (
    values: UpdateHealthJournalSettingsDto,
  ) => void;
}

type TrackingField =
  | "trackSymptoms"
  | "trackMood"
  | "trackSleep"
  | "trackWater"
  | "trackNutrition"
  | "trackExercise"
  | "trackMedications"
  | "trackVitals";

type ReminderTime =
  | "morningReminder"
  | "afternoonReminder"
  | "eveningReminder";

const JOURNAL_ITEMS = [
  {
    key: "trackSymptoms" as const,
    label: "Symptoms",
    description:
      "Track how you're feeling and any symptoms you notice.",
    icon: Stethoscope,
  },
  {
    key: "trackMood" as const,
    label: "Mood",
    description:
      "Track your emotional wellbeing.",
    icon: Smile,
  },
  {
    key: "trackSleep" as const,
    label: "Sleep",
    description:
      "Track your sleep patterns and quality.",
    icon: Moon,
  },
  {
    key: "trackWater" as const,
    label: "Water",
    description:
      "Track how much water you drink.",
    icon: Droplet,
  },
  {
    key: "trackNutrition" as const,
    label: "Food & nutrition",
    description:
      "Track your eating habits.",
    icon: Apple,
  },
  {
    key: "trackExercise" as const,
    label: "Exercise",
    description:
      "Track your physical activity.",
    icon: Activity,
  },
  {
    key: "trackMedications" as const,
    label: "Medicines",
    description:
      "Keep track of medicines you take.",
    icon: Pill,
  },
  {
    key: "trackVitals" as const,
    label: "Health measurements",
    description:
      "Track weight, blood pressure and other measurements.",
    icon: Heart,
  },
];

const REMINDER_TIMES = [
  {
    key: "morningReminder" as const,
    label: "Morning",
    icon: Sun,
  },
  {
    key: "afternoonReminder" as const,
    label: "Afternoon",
    icon: Sunset,
  },
  {
    key: "eveningReminder" as const,
    label: "Evening",
    icon: Moon,
  },
];

function Toggle({
  checked,
}: {
  checked: boolean;
}) {
  return (
    <div
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked
          ? "bg-[#24C1C4]"
          : "bg-slate-200"
      }`}
    >
      <div
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
          checked
            ? "left-6"
            : "left-1"
        }`}
      />
    </div>
  );
}

export function HealthJournalSettingsStep({
  values,
  onChange,
}: HealthJournalSettingsStepProps) {
  function update(
    field: keyof UpdateHealthJournalSettingsDto,
    value: boolean | string,
  ) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  function toggle(field: TrackingField) {
    update(
      field,
      !(values[field] ?? false),
    );
  }

  function toggleReminderTime(
    field: ReminderTime,
  ) {
    const currentlyEnabled =
      Boolean(values[field]);

    update(
      field,
      currentlyEnabled ? "" : "09:00",
    );
  }

  const remindersEnabled =
    values.remindersEnabled ?? false;

  return (
    <div>
      <SectionTitle
        step={9}
        title="Daily Health Tracking"
        description="Choose what you'd like Sympto to help you keep track of. You can change these preferences anytime."
      />

      <div className="space-y-8">
        {/* Daily journal */}
        <section>
          <div className="mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Your Daily Journal
            </h3>
          </div>

          <div className="grid gap-3">
            {JOURNAL_ITEMS.map((item) => {
              const Icon = item.icon;

              const isActive =
                values[item.key] ?? false;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    toggle(item.key)
                  }
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                    isActive
                      ? "border-[#24C1C4] bg-[#24C1C4]/5 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3.5 pr-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                        isActive
                          ? "border-[#24C1C4]/20 bg-[#24C1C4]/10 text-[#0B2D54]"
                          : "border-slate-200 bg-slate-50 text-slate-400"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800">
                        {item.label}
                      </h4>

                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <Toggle checked={isActive} />
                </button>
              );
            })}
          </div>
        </section>

        {/* Reminders */}
        <section className="border-t border-slate-100 pt-6">
          <div className="mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Reminders
            </h3>
          </div>

          <div
            className={`overflow-hidden rounded-xl border transition-all ${
              remindersEnabled
                ? "border-[#24C1C4] bg-[#24C1C4]/5"
                : "border-slate-200 bg-white"
            }`}
          >
            <button
              type="button"
              onClick={() =>
                update(
                  "remindersEnabled",
                  !remindersEnabled,
                )
              }
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                    remindersEnabled
                      ? "border-[#24C1C4]/20 bg-[#24C1C4]/10 text-[#0B2D54]"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <Bell className="h-5 w-5" />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Journal reminders
                  </h4>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Get a gentle reminder to complete your journal.
                  </p>
                </div>
              </div>

              <Toggle
                checked={remindersEnabled}
              />
            </button>

            {remindersEnabled && (
              <div className="border-t border-[#24C1C4]/10 px-4 pb-4 pt-4">
                <p className="mb-3 text-xs font-medium text-slate-500">
                  Choose your reminder times
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  {REMINDER_TIMES.map(
                    (time) => {
                      const Icon = time.icon;

                      const selected =
                        Boolean(
                          values[
                            time.key
                          ],
                        );

                      return (
                        <div
                          key={time.key}
                          className={`rounded-lg border p-3 transition-all ${
                            selected
                              ? "border-[#24C1C4] bg-white shadow-sm"
                              : "border-slate-200 bg-slate-50/50"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              toggleReminderTime(
                                time.key,
                              )
                            }
                            className="flex w-full items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Icon
                                className={`h-4 w-4 ${
                                  selected
                                    ? "text-[#24C1C4]"
                                    : "text-slate-400"
                                }`}
                              />

                              <span
                                className={`text-xs ${
                                  selected
                                    ? "font-semibold text-[#0B2D54]"
                                    : "text-slate-600"
                                }`}
                              >
                                {time.label}
                              </span>
                            </div>

                            <div
                              className={`h-4 w-4 rounded border ${
                                selected
                                  ? "border-[#24C1C4] bg-[#24C1C4]"
                                  : "border-slate-300 bg-white"
                              }`}
                            />
                          </button>

                          {selected && (
                            <div className="mt-3">
                              <TextField
                                type="time"
                                label=""
                                value={
                                  values[
                                    time.key
                                  ] ?? ""
                                }
                                onChange={(
                                  value,
                                ) =>
                                  update(
                                    time.key,
                                    value,
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Summaries */}
        <section className="border-t border-slate-100 pt-6">
          <div className="mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Health Summaries
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                update(
                  "weeklySummary",
                  !(
                    values.weeklySummary ??
                    false
                  ),
                )
              }
              className={`flex items-start justify-between rounded-xl border p-4 text-left transition-all ${
                values.weeklySummary
                  ? "border-[#24C1C4] bg-[#24C1C4]/5"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                    values.weeklySummary
                      ? "border-[#24C1C4]/20 bg-[#24C1C4]/10 text-[#0B2D54]"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <CalendarDays className="h-4 w-4" />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Weekly summary
                  </h4>

                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    Get a weekly overview of your health journal.
                  </p>
                </div>
              </div>

              <Toggle
                checked={
                  values.weeklySummary ??
                  false
                }
              />
            </button>

            <button
              type="button"
              onClick={() =>
                update(
                  "monthlySummary",
                  !(
                    values.monthlySummary ??
                    false
                  ),
                )
              }
              className={`flex items-start justify-between rounded-xl border p-4 text-left transition-all ${
                values.monthlySummary
                  ? "border-[#24C1C4] bg-[#24C1C4]/5"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                    values.monthlySummary
                      ? "border-[#24C1C4]/20 bg-[#24C1C4]/10 text-[#0B2D54]"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Monthly summary
                  </h4>

                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    Get a monthly overview of your health progress.
                  </p>
                </div>
              </div>

              <Toggle
                checked={
                  values.monthlySummary ??
                  false
                }
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}