export interface OnboardingProgress {
  currentStep: number;

  completionPercentage: number;

  status:
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'COMPLETED';

  completedAt?: string;
}

export type HealthGoalCategory =
  | 'WEIGHT'
  | 'EXERCISE'
  | 'NUTRITION'
  | 'BLOOD_PRESSURE'
  | 'BLOOD_GLUCOSE'
  | 'CHOLESTEROL'
  | 'MEDICATION'
  | 'SLEEP'
  | 'MENTAL_HEALTH'
  | 'HYDRATION'
  | 'SMOKING'
  | 'ALCOHOL'
  | 'HEART_RATE'
  | 'OTHER';

export type HealthGoalPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export interface UpdateProfileDto {
  preferredName?: string;
  dateOfBirth?: string;
  gender?:
    | 'MALE'
    | 'FEMALE'
    | 'OTHER'
    | 'PREFER_NOT_TO_SAY';
  profileImageUrl?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  suburb?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

export interface UpdateIndividualProfileDto {
  dateOfBirth?: string;
  gender?:
    | 'MALE'
    | 'FEMALE'
    | 'OTHER'
    | 'PREFER_NOT_TO_SAY';
  heightCm?: number;
  weightKg?: number;

  bloodType?: string;
  rhesusFactor?: string;

  dominantHand?: string;
  occupation?: string;

  smokingStatus?: string;
  alcoholConsumption?: string;
  exerciseFrequency?: string;

  organDonor?: boolean;
  emergencyNotes?: string;
  shareByDefault?: boolean;
}

export type EmergencyContactRelationship =
  | 'PARENT'
  | 'CHILD'
  | 'SPOUSE'
  | 'SIBLING'
  | 'CAREGIVER'
  | 'GUARDIAN'
  | 'DEPENDANT'
  | 'OTHER';

export interface UpdateEmergencyContactDto {
  fullName: string;
  relationship: EmergencyContactRelationship;
  phoneNumber: string;
  email?: string;
  isPrimary?: boolean;
}

export interface AllergyItem {
  allergyId: string;
  severity?: string;
  reaction?: string;
  reactionNotes?: string;
  onsetDate?: string;
  lastReaction?: string;
  verified?: boolean;
  verifiedBy?: string;
  status?: string;
  notes?: string;
}

export interface UpdatePatientAllergiesDto {
  allergies: AllergyItem[];
}
