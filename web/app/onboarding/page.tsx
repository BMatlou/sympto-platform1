"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import ProtectedRoute from "@/components/auth/protected-route";

import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { ProgressSidebar } from "@/components/onboarding/ProgressSidebar";
import { NavigationButtons } from "@/components/onboarding/NavigationButtons";
import { StepRenderer } from "@/components/onboarding/StepRenderer";

import { useOnboarding } from "@/hooks/use-onboarding";

import { onboardingService } from "@/services/onboarding.service";

import { defaultOnboardingForm } from "@/types/onboarding-form";

import type {
  UpdatePatientAllergiesDto,
  UpdatePatientConditionsDto,
  UpdatePatientMedicationsDto,
  UpdatePatientImmunizationsDto,
  UpdateHealthGoalsDto,
  UpdateHealthJournalSettingsDto,
  UpdateConsentDto,
} from "@/types/onboarding";

export default function OnboardingPage() {
  const router = useRouter();

  const {
  loading,
  currentStep,
  progress,
  isCompleted,
  applyProgress,
  goToPreviousStep,
} = useOnboarding();

  const [saving, setSaving] =
    useState(false);

    useEffect(() => {
  if (!loading && isCompleted) {
    router.replace("/dashboard");
  }
}, [
  loading,
  isCompleted,
  router,
]);

  const [form, setForm] = useState(
    defaultOnboardingForm,
  );

  async function next() {
    if (saving) {
      return;
    }

    try {
      setSaving(true);

      let result;

      switch (currentStep) {
        /**
         * STEP 1
         * Personal Profile
         */
        case 1: {
          if (
            !form.profile.preferredName?.trim()
          ) {
            toast.error(
              "Please enter your preferred name.",
            );
            return;
          }

          if (!form.profile.dateOfBirth) {
            toast.error(
              "Please enter your date of birth.",
            );
            return;
          }

          if (!form.profile.gender) {
            toast.error(
              "Please select your gender.",
            );
            return;
          }

          result =
            await onboardingService.updateProfile(
              form.profile,
            );

          break;
        }

        /**
         * STEP 2
         * Health Profile
         */
        case 2: {
          if (
            form.healthProfile.heightCm ===
              undefined ||
            form.healthProfile.heightCm ===
              null ||
            Number.isNaN(
              Number(
                form.healthProfile.heightCm,
              ),
            ) ||
            Number(
              form.healthProfile.heightCm,
            ) <= 0
          ) {
            toast.error(
              "Please enter your height.",
            );
            return;
          }

          if (
            form.healthProfile.weightKg ===
              undefined ||
            form.healthProfile.weightKg ===
              null ||
            Number.isNaN(
              Number(
                form.healthProfile.weightKg,
              ),
            ) ||
            Number(
              form.healthProfile.weightKg,
            ) <= 0
          ) {
            toast.error(
              "Please enter your weight.",
            );
            return;
          }

          if (
            !form.healthProfile.bloodType
          ) {
            toast.error(
              "Please select your blood type.",
            );
            return;
          }

          if (
            !form.healthProfile.rhesusFactor
          ) {
            toast.error(
              "Please select your Rh factor.",
            );
            return;
          }

          if (
            !form.healthProfile.occupation?.trim()
          ) {
            toast.error(
              "Please enter your occupation.",
            );
            return;
          }

          if (
            !form.healthProfile.dominantHand
          ) {
            toast.error(
              "Please select your dominant hand.",
            );
            return;
          }

          result =
            await onboardingService.updateIndividualProfile(
              form.healthProfile,
            );

          break;
        }

        /**
         * STEP 3
         * Emergency Contact
         */
        case 3: {
          const emergencyContact =
            form.emergencyContact;

          if (
            !emergencyContact.fullName.trim()
          ) {
            toast.error(
              "Please enter the emergency contact's full name.",
            );
            return;
          }

          if (
            !emergencyContact.phoneNumber.trim()
          ) {
            toast.error(
              "Please enter the emergency contact's phone number.",
            );
            return;
          }

          if (
            !emergencyContact.relationship
          ) {
            toast.error(
              "Please select the emergency contact's relationship.",
            );
            return;
          }

          const payload = {
            fullName:
              emergencyContact.fullName.trim(),

            relationship:
              emergencyContact.relationship,

            phoneNumber:
              emergencyContact.phoneNumber.trim(),

            email:
              emergencyContact.email?.trim() ||
              undefined,

            isPrimary:
              emergencyContact.isPrimary ??
              true,
          };

          result =
            await onboardingService.updateEmergencyContact(
              payload,
            );

          break;
        }

        /**
         * STEP 4
         * Allergies
         */
        case 4: {
          result =
            await onboardingService.updatePatientAllergies(
              form.allergies,
            );

          break;
        }

        /**
         * STEP 5
         * Conditions
         */
        case 5: {
          result =
            await onboardingService.updatePatientConditions(
              form.conditions,
            );

          break;
        }

        /**
         * STEP 6
         * Medications
         */
        case 6: {
          result =
            await onboardingService.updatePatientMedications(
              form.medications,
            );

          break;
        }

        /**
         * STEP 7
         * Immunizations
         */
        case 7: {
          result =
            await onboardingService.updatePatientImmunizations(
              form.immunizations,
            );

          break;
        }

        /**
         * STEP 8
         * Health Goals
         */
        case 8: {
          if (
            !form.healthGoals.goals ||
            form.healthGoals.goals.length === 0
          ) {
            toast.error(
              "Please add at least one health goal.",
            );
            return;
          }

          const hasIncompleteGoal =
            form.healthGoals.goals.some(
              (goal) =>
                !goal.title?.trim() ||
                !goal.category ||
                !goal.priority,
            );

          if (hasIncompleteGoal) {
            toast.error(
              "Please complete all required health goal fields.",
            );
            return;
          }

          result =
            await onboardingService.updateHealthGoals(
              form.healthGoals,
            );

          break;
        }

        /**
         * STEP 9
         * Health Journal Settings
         */
        case 9: {
          result =
            await onboardingService.updateHealthJournalSettings(
              form.journalSettings,
            );

          break;
        }

        /**
         * STEP 10
         * Consent + Complete Onboarding
         */
        case 10: {
          const {
            acceptTerms,
            acceptPrivacyPolicy,
            acceptDataProcessing,
          } = form.consent;

          if (!acceptTerms) {
            toast.error(
              "Please accept the Terms and Conditions.",
            );
            return;
          }

          if (!acceptPrivacyPolicy) {
            toast.error(
              "Please accept the Privacy Policy.",
            );
            return;
          }

          if (!acceptDataProcessing) {
            toast.error(
              "Please accept the data processing agreement.",
            );
            return;
          }

          /**
           * Save consent first.
           */
          const consentResult =
            await onboardingService.updateConsent(
              form.consent,
            );

          applyProgress(
            consentResult.data,
          );

          console.log(
            "STEP 10 CONSENT SAVED:",
            consentResult.data,
          );

          /**
           * Mark onboarding as complete.
           */
          const completedResult =
            await onboardingService.complete();

          applyProgress(
            completedResult.data,
          );

          console.log(
            "ONBOARDING COMPLETED:",
            completedResult.data,
          );

          if (
            completedResult.data.status ===
            "COMPLETED"
          ) {
            toast.success(
              "Your onboarding is complete.",
            );

            router.replace("/dashboard");
          }

          return;
        }

        default:
          return;
      }

      /**
       * The backend response is authoritative
       * after a successful save.
       */
      applyProgress(result.data);

      console.log(
        "ONBOARDING STEP SAVED:",
        {
          completedStep: currentStep,
          persistedProgress: result.data,
        },
      );
    } catch (error: any) {
      const responseData =
        error?.response?.data;

      const backendMessage =
        responseData?.error?.message ??
        responseData?.message;

      console.error(
        "ONBOARDING STEP FAILED",
        {
          currentStep,

          payload:
            currentStep === 1
              ? form.profile
              : currentStep === 2
                ? form.healthProfile
                : currentStep === 3
                  ? form.emergencyContact
                  : currentStep === 4
                    ? form.allergies
                    : currentStep === 5
                      ? form.conditions
                      : currentStep === 6
                        ? form.medications
                        : currentStep === 7
                          ? form.immunizations
                          : currentStep === 8
                            ? form.healthGoals
                            : currentStep === 9
                              ? form.journalSettings
                              : currentStep === 10
                                ? form.consent
                                : undefined,

          status:
            error?.response?.status,

          response:
            responseData,

          message:
            error?.message,
        },
      );

      const displayMessage =
        Array.isArray(backendMessage)
          ? backendMessage.join(", ")
          : backendMessage ||
            "Unable to save this step.";

      toast.error(displayMessage);
    } finally {
      setSaving(false);
    }
  }

  function previous() {
    if (saving) {
      return;
    }

    if (currentStep <= 1) {
      return;
    }

    goToPreviousStep();
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="grid min-h-screen place-items-center">
          Loading...
        </main>
      </ProtectedRoute>
    );
  }

  console.log(
    "Current Step:",
    currentStep,
  );

  console.log(
    "Progress:",
    progress,
  );

  return (
    <ProtectedRoute>
      <OnboardingLayout
        sidebar={
          <ProgressSidebar
            currentStep={currentStep}
          />
        }
      >
        <StepRenderer
          currentStep={currentStep}
          onBack={previous}
          onComplete={next}
          completing={saving}

          profileValues={form.profile}
          onProfileChange={(values) =>
            setForm((previous) => ({
              ...previous,
              profile: values,
            }))
          }

          healthProfileValues={
            form.healthProfile
          }
          onHealthProfileChange={(values) =>
            setForm((previous) => ({
              ...previous,
              healthProfile: values,
            }))
          }

          emergencyContactValues={
            form.emergencyContact
          }
          onEmergencyContactChange={(values) =>
            setForm((previous) => ({
              ...previous,
              emergencyContact: values,
            }))
          }

          allergiesValues={
            form.allergies
          }
          onAllergiesChange={(
            values: UpdatePatientAllergiesDto,
          ) =>
            setForm((previous) => ({
              ...previous,
              allergies: values,
            }))
          }

          conditionsValues={
            form.conditions
          }
          onConditionsChange={(
            values: UpdatePatientConditionsDto,
          ) =>
            setForm((previous) => ({
              ...previous,
              conditions: values,
            }))
          }

          medicationsValues={
            form.medications
          }
          onMedicationsChange={(
            values: UpdatePatientMedicationsDto,
          ) =>
            setForm((previous) => ({
              ...previous,
              medications: values,
            }))
          }

          immunizationsValues={
            form.immunizations
          }
          onImmunizationsChange={(
            values: UpdatePatientImmunizationsDto,
          ) =>
            setForm((previous) => ({
              ...previous,
              immunizations: values,
            }))
          }

          goalsValues={
            form.healthGoals
          }
          onGoalsChange={(
            values: UpdateHealthGoalsDto,
          ) =>
            setForm((previous) => ({
              ...previous,
              healthGoals: values,
            }))
          }

          journalSettingsValues={
            form.journalSettings
          }
          onJournalSettingsChange={(
            values: UpdateHealthJournalSettingsDto,
          ) =>
            setForm((previous) => ({
              ...previous,
              journalSettings: values,
            }))
          }

          consentValues={
            form.consent
          }
          onConsentChange={(
            values: UpdateConsentDto,
          ) =>
            setForm((previous) => ({
              ...previous,
              consent: values,
            }))
          }
        />

        {currentStep !== 10 && (
          <NavigationButtons
            loading={saving}
            currentStep={currentStep}
            totalSteps={10}
            onBack={previous}
            onNext={next}
          />
        )}
      </OnboardingLayout>
    </ProtectedRoute>
  );
}