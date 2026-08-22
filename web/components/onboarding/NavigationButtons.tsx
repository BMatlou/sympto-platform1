"use client";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface NavigationButtonsProps {
  loading?: boolean;

  currentStep: number;

  totalSteps: number;

  onBack: () => void;

  onNext: () => void;
}

export function NavigationButtons({
  loading = false,
  currentStep,
  totalSteps,
  onBack,
  onNext,
}: NavigationButtonsProps) {
  const isLastStep =
    currentStep === totalSteps;

  return (
    <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">

      <button
        type="button"
        disabled={
          currentStep === 1 || loading
        }
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={onNext}
        className="inline-flex items-center gap-2 rounded-lg bg-[#0B2D54] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#082443] disabled:opacity-60"
      >
        {loading
          ? "Saving..."
          : isLastStep
          ? "Finish"
          : "Continue"}

        {!isLastStep && (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}