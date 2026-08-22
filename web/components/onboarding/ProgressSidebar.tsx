"use client";

import {
Check,
HeartPulse,
} from "lucide-react";

interface ProgressSidebarProps {
currentStep: number;
}

const STEPS = [
"About You",
"Health Profile",
"Emergency Contact",
"Allergies",
"Conditions",
"Medications",
"Immunizations",
"Health Goals",
"Journal Settings",
"Consent",
];

export function ProgressSidebar({
currentStep,
}: ProgressSidebarProps) {
return ( <div className="rounded-xl bg-[#0B2D54] px-5 py-4 text-white shadow-lg">

  {/* Header */}
  <div className="mb-5 flex items-center gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#24C1C4]">
      <HeartPulse className="h-5 w-5" />
    </div>

    <div>
      <h2 className="text-lg font-semibold leading-tight">
        Complete Your Profile
      </h2>

      <p className="mt-1 text-[11px] leading-4 text-slate-300">
        Finish setting up your health profile.
      </p>
    </div>
  </div>

  {/* Progress Steps */}
  <div className="relative">

    {/* Connecting line */}
    <div
      className="absolute left-[14px] top-[14px] bottom-[14px] w-px bg-slate-600"
      aria-hidden="true"
    />

    <div className="relative space-y-2.5">
      {STEPS.map((step, index) => {
        const stepNumber = index + 1;

        const completed =
          stepNumber < currentStep;

        const active =
          stepNumber === currentStep;

        return (
          <div
            key={step}
            className="relative flex min-h-[28px] items-center gap-3"
          >
            <div
              className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-all duration-200 ${
                completed
                  ? "border-[#24C1C4] bg-[#24C1C4] text-white"
                  : active
                  ? "border-white bg-[#0B2D54] text-white shadow-[0_0_0_3px_rgba(255,255,255,0.08)]"
                  : "border-slate-500 bg-[#0B2D54] text-slate-400"
              }`}
            >
              {completed ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                stepNumber
              )}
            </div>

            <span
              className={`text-[12px] leading-none transition-colors duration-200 ${
                active || completed
                  ? "font-semibold text-white"
                  : "font-medium text-slate-400"
              }`}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  </div>
</div>

);
}
