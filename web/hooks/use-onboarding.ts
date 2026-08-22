"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { onboardingService } from "@/services/onboarding.service";

import type {
  OnboardingProgress,
} from "@/types/onboarding";

const TOTAL_STEPS = 10;

export function useOnboarding() {
  const [loading, setLoading] =
    useState(true);

  const [progress, setProgress] =
    useState<OnboardingProgress | null>(
      null,
    );

  const loadProgress = useCallback(async () => {
    setLoading(true);

    try {
      let nextProgress: OnboardingProgress;

      try {
        nextProgress =
          await onboardingService.getProgress();
      } catch {
        nextProgress =
          await onboardingService.createProgress();
      }

      setProgress(nextProgress);
    } catch (error) {
      console.error(
        "Failed to load onboarding progress:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Apply the progress returned directly
   * by a successful onboarding API request.
   */
  const applyProgress = useCallback(
    (
      nextProgress: OnboardingProgress,
    ) => {
      setProgress(nextProgress);
    },
    [],
  );

  /**
   * Move between onboarding screens locally.
   *
   * This does NOT save anything to the backend.
   */
  const goToStep = useCallback(
    (step: number) => {
      setProgress((previous) => {
        if (!previous) {
          return previous;
        }

        const safeStep = Math.min(
          Math.max(step, 1),
          TOTAL_STEPS,
        );

        return {
          ...previous,
          currentStep: safeStep,
        };
      });
    },
    [],
  );

  /**
   * Move one step backwards.
   *
   * Step 1 cannot move backwards.
   */
  const goToPreviousStep =
    useCallback(() => {
      setProgress((previous) => {
        if (!previous) {
          return previous;
        }

        const previousStep =
          Math.max(
            previous.currentStep - 1,
            1,
          );

        return {
          ...previous,
          currentStep: previousStep,
        };
      });
    }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  return {
    loading,
    progress,

    currentStep:
      progress?.currentStep ?? 1,

    completionPercentage:
      progress?.completionPercentage ?? 0,

    isCompleted:
      progress?.status === "COMPLETED",

    loadProgress,
    applyProgress,

    goToStep,
    goToPreviousStep,
  };
}