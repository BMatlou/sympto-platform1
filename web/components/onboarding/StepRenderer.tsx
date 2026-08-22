"use client";

import { ProfileStep } from "@/components/onboarding/steps/ProfileStep";
import { HealthProfileStep } from "@/components/onboarding/steps/HealthProfileStep";
import { EmergencyContactStep } from "@/components/onboarding/steps/EmergencyContactStep";
import { AllergiesStep } from "@/components/onboarding/steps/AllergiesStep";
import { ConditionsStep } from "@/components/onboarding/steps/ConditionsStep";
import { MedicationsStep } from "@/components/onboarding/steps/MedicationsStep";
import { ImmunizationsStep } from "@/components/onboarding/steps/ImmunizationsStep";
import { HealthGoalsStep } from "@/components/onboarding/steps/HealthGoalsStep";
import { HealthJournalSettingsStep } from "@/components/onboarding/steps/HealthJournalSettingsStep";
import { ConsentStep } from "@/components/onboarding/steps/ConsentStep";

import type {
  EmergencyContactFormValues,
} from "@/types/onboarding-form";

import type {
  UpdateProfileDto,
  UpdateIndividualProfileDto,
  UpdatePatientAllergiesDto,
  UpdatePatientConditionsDto,
  UpdatePatientMedicationsDto,
  UpdatePatientImmunizationsDto,
  UpdateHealthGoalsDto,
  UpdateHealthJournalSettingsDto,
  UpdateConsentDto,
} from "@/types/onboarding";

interface StepRendererProps {
  currentStep: number;

  profileValues: UpdateProfileDto;
  onProfileChange: (
    values: UpdateProfileDto,
  ) => void;

  healthProfileValues: UpdateIndividualProfileDto;
  onHealthProfileChange: (
    values: UpdateIndividualProfileDto,
  ) => void;

  emergencyContactValues: EmergencyContactFormValues;
  onEmergencyContactChange: (
    values: EmergencyContactFormValues,
  ) => void;

  allergiesValues: UpdatePatientAllergiesDto;
  onAllergiesChange: (
    values: UpdatePatientAllergiesDto,
  ) => void;

  conditionsValues: UpdatePatientConditionsDto;
  onConditionsChange: (
    values: UpdatePatientConditionsDto,
  ) => void;

  medicationsValues: UpdatePatientMedicationsDto;
  onMedicationsChange: (
    values: UpdatePatientMedicationsDto,
  ) => void;

  immunizationsValues: UpdatePatientImmunizationsDto;
  onImmunizationsChange: (
    values: UpdatePatientImmunizationsDto,
  ) => void;

  goalsValues: UpdateHealthGoalsDto;
  onGoalsChange: (
    values: UpdateHealthGoalsDto,
  ) => void;

  journalSettingsValues: UpdateHealthJournalSettingsDto;
  onJournalSettingsChange: (
    values: UpdateHealthJournalSettingsDto,
  ) => void;

  consentValues: UpdateConsentDto;
  onConsentChange: (
    values: UpdateConsentDto,
  ) => void;

  onBack: () => void;

  onComplete: () => void;

  completing?: boolean;
}

export function StepRenderer({
  currentStep,

  profileValues,
  onProfileChange,

  healthProfileValues,
  onHealthProfileChange,

  emergencyContactValues,
  onEmergencyContactChange,

  allergiesValues,
  onAllergiesChange,

  conditionsValues,
  onConditionsChange,

  medicationsValues,
  onMedicationsChange,

  immunizationsValues,
  onImmunizationsChange,

  goalsValues,
  onGoalsChange,

  journalSettingsValues,
  onJournalSettingsChange,

  consentValues,
  onConsentChange,

  onBack,
  onComplete,
  completing = false,
}: StepRendererProps) {
  switch (currentStep) {
    case 1:
      return (
        <ProfileStep
          values={profileValues}
          onChange={onProfileChange}
        />
      );

    case 2:
      return (
        <HealthProfileStep
          values={healthProfileValues}
          onChange={onHealthProfileChange}
        />
      );

    case 3:
      return (
        <EmergencyContactStep
          values={emergencyContactValues}
          onChange={onEmergencyContactChange}
        />
      );

    case 4:
      return (
        <AllergiesStep
          values={allergiesValues}
          onChange={onAllergiesChange}
        />
      );

    case 5:
      return (
        <ConditionsStep
          values={conditionsValues}
          onChange={onConditionsChange}
        />
      );

    case 6:
      return (
        <MedicationsStep
          values={medicationsValues}
          onChange={onMedicationsChange}
        />
      );

    case 7:
      return (
        <ImmunizationsStep
          values={immunizationsValues}
          onChange={onImmunizationsChange}
        />
      );

    case 8:
      return (
        <HealthGoalsStep
          values={goalsValues}
          onChange={onGoalsChange}
        />
      );

    case 9:
      return (
        <HealthJournalSettingsStep
          values={journalSettingsValues}
          onChange={onJournalSettingsChange}
        />
      );

    case 10:
      return (
        <ConsentStep
          values={consentValues}
          onChange={onConsentChange}
          onBack={onBack}
          onComplete={onComplete}
          loading={completing}
        />
      );

    default:
      return null;
  }
}