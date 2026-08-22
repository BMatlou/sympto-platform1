"use client";

import { ChangeEvent } from "react";

import type {
  UpdateProfileDto,
} from "@/types/onboarding";

interface ProfileStepProps {
  values: UpdateProfileDto;

  onChange: (
    values: UpdateProfileDto,
  ) => void;
}

export function ProfileStep({
  values,
  onChange,
}: ProfileStepProps) {
  function update(
    field: keyof UpdateProfileDto,
    value: string,
  ) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-7 py-2">
      {/* HEADER */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#24C1C4]">
          Step 1
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0B2D54]">
          Tell us about yourself
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          This information helps personalize
          your health record.
        </p>
      </div>

      {/* PERSONAL INFORMATION */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Personal Information
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Just the basics to get your profile started.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* PREFERRED NAME */}
          <div className="space-y-2">
            <label
              htmlFor="preferred-name"
              className="text-sm font-medium text-slate-700"
            >
              Preferred Name
            </label>

            <input
              id="preferred-name"
              type="text"
              placeholder="What should we call you?"
              value={values.preferredName ?? ""}
              onChange={(
                e: ChangeEvent<HTMLInputElement>,
              ) =>
                update(
                  "preferredName",
                  e.target.value,
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/10"
            />
          </div>

          {/* DATE OF BIRTH */}
          <div className="space-y-2">
            <label
              htmlFor="date-of-birth"
              className="text-sm font-medium text-slate-700"
            >
              Date of Birth
            </label>

            <input
              id="date-of-birth"
              type="date"
              value={values.dateOfBirth ?? ""}
              onChange={(
                e: ChangeEvent<HTMLInputElement>,
              ) =>
                update(
                  "dateOfBirth",
                  e.target.value,
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/10"
            />
          </div>

          {/* GENDER */}
          <div className="space-y-2 md:col-span-2">
            <label
              htmlFor="gender"
              className="text-sm font-medium text-slate-700"
            >
              Gender
            </label>

            <select
              id="gender"
              value={values.gender ?? ""}
              onChange={(e) =>
                update(
                  "gender",
                  e.target.value,
                )
              }
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/10"
            >
              <option value="">
                Select...
              </option>

              <option value="MALE">
                Male
              </option>

              <option value="FEMALE">
                Female
              </option>

              <option value="OTHER">
                Other
              </option>

              <option value="PREFER_NOT_TO_SAY">
                Prefer not to say
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* LOCATION NOTE */}
      <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#24C1C4]/10">
            <span className="text-sm text-[#0B8E91]">
              ✓
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Location
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Your country, province, and city were
              collected during signup and will be used
              to personalize your healthcare experience.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}