"use client";

import {
  Dumbbell,
  Cigarette,
  Wine,
  ShieldCheck,
  Heart,
  BriefcaseBusiness,
  Hand,
} from "lucide-react";

import { SectionTitle } from "@/components/onboarding/SectionTitle";

import { TextField } from "@/components/ui/forms/TextField";
import { SwitchField } from "@/components/ui/forms/SwitchField";

import type {
  UpdateIndividualProfileDto,
} from "@/types/onboarding";

interface HealthProfileStepProps {
  values: UpdateIndividualProfileDto;

  onChange: (
    values: UpdateIndividualProfileDto,
  ) => void;
}

const BLOOD_GROUPS = [
  {
    label: "A",
    positive: "A_POSITIVE",
    negative: "A_NEGATIVE",
  },
  {
    label: "B",
    positive: "B_POSITIVE",
    negative: "B_NEGATIVE",
  },
  {
    label: "AB",
    positive: "AB_POSITIVE",
    negative: "AB_NEGATIVE",
  },
  {
    label: "O",
    positive: "O_POSITIVE",
    negative: "O_NEGATIVE",
  },
] as const;

const SMOKING_OPTIONS = [
  {
    label: "Never",
    value: "NEVER",
  },
  {
    label: "Former",
    value: "FORMER",
  },
  {
    label: "Occasionally",
    value: "OCCASIONAL",
  },
  {
    label: "Daily",
    value: "DAILY",
  },
] as const;

const ALCOHOL_OPTIONS = [
  {
    label: "Don't drink",
    value: "NEVER",
  },
  {
    label: "Occasionally",
    value: "OCCASIONAL",
  },
  {
    label: "Weekly",
    value: "WEEKLY",
  },
  {
    label: "Daily",
    value: "DAILY",
  },
] as const;

const EXERCISE_OPTIONS = [
  {
    label: "Never",
    shortLabel: "Never",
    value: "NONE",
  },
  {
    label: "Once a week",
    shortLabel: "1× / wk",
    value: "ONCE_PER_WEEK",
  },
  {
    label: "2–3 times per week",
    shortLabel: "2–3×",
    value: "TWO_TO_THREE_PER_WEEK",
  },
  {
    label: "4–5 times per week",
    shortLabel: "4–5×",
    value: "FOUR_TO_FIVE_PER_WEEK",
  },
  {
    label: "Every day",
    shortLabel: "Daily",
    value: "DAILY",
  },
] as const;

const DOMINANT_HAND_OPTIONS = [
  {
    label: "Left",
    value: "LEFT",
  },
  {
    label: "Right",
    value: "RIGHT",
  },
  {
    label: "Ambidextrous",
    value: "AMBIDEXTROUS",
  },
] as const;

export function HealthProfileStep({
  values,
  onChange,
}: HealthProfileStepProps) {
  function update<
    K extends keyof UpdateIndividualProfileDto
  >(
    field: K,
    value: UpdateIndividualProfileDto[K],
  ) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  /**
   * Returns A / B / AB / O based on the
   * complete bloodType value.
   */
  function getSelectedBloodGroup() {
    if (
      !values.bloodType ||
      values.bloodType === "UNKNOWN"
    ) {
      return "";
    }

    const match = BLOOD_GROUPS.find(
      (group) =>
        group.positive === values.bloodType ||
        group.negative === values.bloodType,
    );

    return match?.label ?? "";
  }

  /**
   * Select a blood group.
   *
   * IMPORTANT:
   * If the user previously selected
   * "I don't know", we explicitly restore
   * a known blood state here.
   *
   * If no Rh factor is known yet, we default
   * to Positive. The user can immediately
   * switch to Negative.
   */
  function selectBloodGroup(
    group: (typeof BLOOD_GROUPS)[number],
  ) {
    const rhesus =
      values.rhesusFactor;

    if (rhesus === "NEGATIVE") {
      onChange({
        ...values,
        bloodType: group.negative,
        rhesusFactor: "NEGATIVE",
      });

      return;
    }

    onChange({
      ...values,
      bloodType: group.positive,
      rhesusFactor: "POSITIVE",
    });
  }

  /**
   * Select Positive / Negative.
   *
   * This also explicitly clears UNKNOWN by
   * writing a real blood type when a blood
   * group has already been selected.
   */
  function selectRhesusFactor(
    value:
      | "POSITIVE"
      | "NEGATIVE"
      | "UNKNOWN",
  ) {
    if (value === "UNKNOWN") {
      onChange({
        ...values,
        bloodType: "UNKNOWN",
        rhesusFactor: "UNKNOWN",
      });

      return;
    }

    const selectedGroup =
      getSelectedBloodGroup();

    /*
     * No blood group has been selected yet.
     * We can still save the Rh selection.
     */
    if (!selectedGroup) {
      onChange({
        ...values,
        rhesusFactor: value,
      });

      return;
    }

    const group =
      BLOOD_GROUPS.find(
        (item) =>
          item.label === selectedGroup,
      );

    if (!group) {
      onChange({
        ...values,
        rhesusFactor: value,
      });

      return;
    }

    onChange({
      ...values,
      bloodType:
        value === "POSITIVE"
          ? group.positive
          : group.negative,
      rhesusFactor: value,
    });
  }

  /**
   * Explicitly mark the complete blood
   * information as unknown.
   */
  function markBloodTypeUnknown() {
    onChange({
      ...values,
      bloodType: "UNKNOWN",
      rhesusFactor: "UNKNOWN",
    });
  }

  const selectedBloodGroup =
    getSelectedBloodGroup();

  /**
   * Unknown is a real DTO state.
   *
   * There is intentionally NO local React
   * state here. The DTO is the single source
   * of truth.
   */
  const bloodTypeUnknown =
    values.bloodType === "UNKNOWN" ||
    values.rhesusFactor === "UNKNOWN";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-7 py-2">
      {/* HEADER */}
      <SectionTitle
        step={2}
        title="Your Health Profile"
        description="Tell us a little more about your health, lifestyle and everyday life."
      />

      {/* ========================================================= */}
      {/* BODY MEASUREMENTS */}
      {/* ========================================================= */}

      <section className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Body Measurements
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            A few basic measurements help personalise
            your health profile.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* HEIGHT */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                Height
              </label>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                cm
              </span>
            </div>

            <TextField
              label=""
              type="number"
              value={
                values.heightCm?.toString() ?? ""
              }
              onChange={(value) => {
                if (value === "") {
                  update(
                    "heightCm",
                    undefined,
                  );
                  return;
                }

                update(
                  "heightCm",
                  Number(value),
                );
              }}
            />
          </div>

          {/* WEIGHT */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                Weight
              </label>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                kg
              </span>
            </div>

            <TextField
              label=""
              type="number"
              value={
                values.weightKg?.toString() ?? ""
              }
              onChange={(value) => {
                if (value === "") {
                  update(
                    "weightKg",
                    undefined,
                  );
                  return;
                }

                update(
                  "weightKg",
                  Number(value),
                );
              }}
            />
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* BLOOD INFORMATION */}
      {/* ========================================================= */}

      <section className="space-y-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-5 shadow-sm">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Blood Information
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Select your blood group and Rh factor.
          </p>
        </div>

        {/* BLOOD GROUP */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              Blood Type
            </label>

            {selectedBloodGroup &&
              !bloodTypeUnknown && (
                <span className="rounded-full bg-[#24C1C4]/10 px-2.5 py-1 text-xs font-semibold text-[#0B8E91]">
                  {selectedBloodGroup}
                </span>
              )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {BLOOD_GROUPS.map((group) => {
              const selected =
                selectedBloodGroup ===
                group.label;

              return (
                <button
                  key={group.label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    selectBloodGroup(group)
                  }
                  className={`flex h-14 items-center justify-center rounded-xl border text-base font-semibold transition-all ${
                    selected
                      ? "border-[#24C1C4] bg-[#24C1C4]/10 text-[#0B8E91] shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* RH FACTOR */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700">
            Rh Factor
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={
                values.rhesusFactor ===
                "POSITIVE"
              }
              onClick={() =>
                selectRhesusFactor(
                  "POSITIVE",
                )
              }
              className={`flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition-all ${
                values.rhesusFactor ===
                "POSITIVE"
                  ? "border-[#24C1C4] bg-[#24C1C4] text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              + Positive
            </button>

            <button
              type="button"
              aria-pressed={
                values.rhesusFactor ===
                "NEGATIVE"
              }
              onClick={() =>
                selectRhesusFactor(
                  "NEGATIVE",
                )
              }
              className={`flex h-11 items-center justify-center rounded-xl border text-sm font-medium transition-all ${
                values.rhesusFactor ===
                "NEGATIVE"
                  ? "border-[#0B2D54] bg-[#0B2D54] text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              − Negative
            </button>
          </div>
        </div>

        {/* UNKNOWN ACTION */}
        <button
          type="button"
          onClick={markBloodTypeUnknown}
          className={`inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-medium transition-all ${
            bloodTypeUnknown
              ? "border-[#24C1C4] bg-[#24C1C4]/10 text-[#0B8E91]"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {bloodTypeUnknown
            ? "Blood type unknown"
            : "I don't know my blood type"}
        </button>

        {bloodTypeUnknown && (
          <p className="text-xs leading-5 text-slate-400">
            That's completely fine. Select A, B,
            AB or O above whenever you know your
            blood type.
          </p>
        )}
      </section>

      {/* ========================================================= */}
      {/* WORK & LIFESTYLE */}
      {/* ========================================================= */}

      <section className="space-y-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Work &amp; Lifestyle
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            A few everyday details help us understand
            your health profile better.
          </p>
        </div>

        {/* OCCUPATION + DOMINANT HAND */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.35fr_1fr]">
          {/* OCCUPATION */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-slate-400" />

              <label className="text-sm font-semibold text-slate-700">
                Work &amp; Occupation
              </label>
            </div>

            <TextField
              label=""
              placeholder="e.g. Software Engineer"
              value={
                values.occupation ?? ""
              }
              onChange={(value) =>
                update(
                  "occupation",
                  value,
                )
              }
            />
          </div>

          {/* DOMINANT HAND */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Hand className="h-4 w-4 text-slate-400" />

              <label className="text-sm font-semibold text-slate-700">
                Dominant Hand
              </label>
            </div>

            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {DOMINANT_HAND_OPTIONS.map(
                (option) => {
                  const selected =
                    values.dominantHand ===
                    option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        update(
                          "dominantHand",
                          option.value,
                        )
                      }
                      className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
                        selected
                          ? "bg-white text-[#0B8E91] shadow-sm ring-1 ring-[#24C1C4]/30"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </div>

        {/* SMOKING + ALCOHOL */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* SMOKING */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Cigarette className="h-4 w-4 text-slate-400" />

              <label className="text-sm font-semibold text-slate-700">
                Smoking
              </label>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {SMOKING_OPTIONS.map(
                (option) => {
                  const selected =
                    values.smokingStatus ===
                    option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        update(
                          "smokingStatus",
                          option.value,
                        )
                      }
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                        selected
                          ? "border-[#24C1C4] bg-[#24C1C4]/10 text-[#0B8E91]"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* ALCOHOL */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Wine className="h-4 w-4 text-slate-400" />

              <label className="text-sm font-semibold text-slate-700">
                Alcohol Consumption
              </label>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {ALCOHOL_OPTIONS.map(
                (option) => {
                  const selected =
                    values.alcoholConsumption ===
                    option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        update(
                          "alcoholConsumption",
                          option.value,
                        )
                      }
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                        selected
                          ? "border-[#24C1C4] bg-[#24C1C4]/10 text-[#0B8E91]"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </div>

        {/* EXERCISE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-slate-400" />

              <label className="text-sm font-semibold text-slate-700">
                Exercise Frequency
              </label>
            </div>

            {values.exerciseFrequency && (
              <span className="hidden rounded-full bg-[#24C1C4]/10 px-2.5 py-1 text-[10px] font-semibold text-[#0B8E91] sm:inline-flex">
                Selected
              </span>
            )}
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {EXERCISE_OPTIONS.map(
              (option) => {
                const selected =
                  values.exerciseFrequency ===
                  option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    title={option.label}
                    onClick={() =>
                      update(
                        "exerciseFrequency",
                        option.value,
                      )
                    }
                    className={`min-h-[52px] rounded-xl border px-1.5 py-2 text-center transition-all ${
                      selected
                        ? "border-[#24C1C4] bg-[#24C1C4]/10 text-[#0B8E91] shadow-sm"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-[11px] font-semibold sm:text-xs">
                      {option.shortLabel}
                    </span>

                    <span className="mt-0.5 hidden text-[9px] leading-tight text-slate-400 lg:block">
                      {option.label}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* PRIVACY & PREFERENCES */}
      {/* ========================================================= */}

      <section className="space-y-3 pt-1">
        {/* ORGAN DONOR */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition-all hover:bg-slate-50/50">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
              <Heart className="h-4 w-4 text-red-500" />
            </div>

            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-800">
                Organ Donor
              </h4>

              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Include your status in your health
                passport.
              </p>
            </div>
          </div>

          <SwitchField
            label=""
            description=""
            checked={
              values.organDonor ?? false
            }
            onChange={(value) =>
              update(
                "organDonor",
                value,
              )
            }
          />
        </div>

        {/* SHARE PROFILE */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition-all hover:bg-slate-50/50">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
            </div>

            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-800">
                Share Profile by Default
              </h4>

              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Allow approved healthcare providers to
                access your health profile when you choose
                to share it.
              </p>
            </div>
          </div>

          <SwitchField
            label=""
            description=""
            checked={
              values.shareByDefault ??
              false
            }
            onChange={(value) =>
              update(
                "shareByDefault",
                value,
              )
            }
          />
        </div>
      </section>
    </div>
  );
}