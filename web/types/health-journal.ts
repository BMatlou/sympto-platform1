export type HealthJournalMood =
  | "VERY_BAD"
  | "BAD"
  | "NEUTRAL"
  | "GOOD"
  | "VERY_GOOD";

export type SleepQuality =
  | "VERY_POOR"
  | "POOR"
  | "FAIR"
  | "GOOD"
  | "EXCELLENT";

export type EnergyLevel =
  | "VERY_LOW"
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "VERY_HIGH";

export interface CreateHealthJournalDto {
  encounterId?: string;
  practitionerId?: string;

  title?: string;
  journal: string;

  mood?: HealthJournalMood;

  sleepQuality?: SleepQuality;
  sleepHours?: string;

  energyLevel?: EnergyLevel;
  stressLevel?: number;

  exerciseMinutes?: number;
  waterIntakeMl?: number;

  weightKg?: string;
  temperature?: string;

  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;

  heartRate?: number;
  oxygenSaturation?: string;
  respiratoryRate?: number;

  notes?: string;
}

export interface HealthJournal
  extends CreateHealthJournalDto {
  id: string;
  patientId: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthJournalPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HealthJournalListResponse {
  data: HealthJournal[];
  pagination: HealthJournalPagination;
}