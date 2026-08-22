import type {
  EmergencyContactRelationship,
  UpdateConsentDto,
  UpdateEmergencyContactDto,
  UpdateHealthGoalsDto,
  UpdateHealthJournalSettingsDto,
  UpdateIndividualProfileDto,
  UpdatePatientAllergiesDto,
  UpdatePatientConditionsDto,
  UpdatePatientImmunizationsDto,
  UpdatePatientMedicationsDto,
  UpdateProfileDto,
} from "./onboarding";

/**
 * Emergency contact form state.
 *
 * The API requires a valid EmergencyContactRelationship,
 * but the frontend form must allow an empty value while
 * the user is completing the field.
 */
export type EmergencyContactFormValues =
  Omit<
    UpdateEmergencyContactDto,
    "relationship"
  > & {
    relationship:
      | EmergencyContactRelationship
      | "";
  };

/**
 * Complete onboarding form state.
 */
export interface OnboardingFormState {
  profile: UpdateProfileDto;

  healthProfile: UpdateIndividualProfileDto;

  emergencyContact: EmergencyContactFormValues;

  allergies: UpdatePatientAllergiesDto;

  conditions: UpdatePatientConditionsDto;

  medications: UpdatePatientMedicationsDto;

  immunizations: UpdatePatientImmunizationsDto;

  healthGoals: UpdateHealthGoalsDto;

  journalSettings: UpdateHealthJournalSettingsDto;

  consent: UpdateConsentDto;
}

/**
 * Default onboarding form values.
 */
export const defaultOnboardingForm: OnboardingFormState = {
  profile: {},

  healthProfile: {},

  emergencyContact: {
    fullName: "",
    relationship: "",
    phoneNumber: "",
    email: "",
    isPrimary: true,
  },

  allergies: {
    allergies: [],
  },

  conditions: {
    conditions: [],
  },

  medications: {
    medications: [],
  },

  immunizations: {
    immunizations: [],
  },

  healthGoals: {
    goals: [],
  },

  journalSettings: {},

  consent: {
    acceptTerms: false,
    acceptPrivacyPolicy: false,
    acceptDataProcessing: false,
    acceptMarketing: false,
  },
};