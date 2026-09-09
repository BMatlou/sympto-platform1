import { api } from '@/lib/api';

export interface HealthHomeResponse {
  generatedAt: string;
  profile?: { firstName?: string | null; lastName?: string | null; preferredName?: string | null; dateOfBirth?: string | null; gender?: string | null; profileImageUrl?: string | null } | null;
  patient: { id: string; patientNumber?: string | null; name?: string; firstName?: string; lastName?: string; profileImageUrl?: string | null; heightCm?: number | null; weightKg?: number | null };
  healthPassport?: Record<string, unknown> | null;
  medicalRecord?: Record<string, any> | null;
  healthSnapshot: { activeAllergies?: Array<Record<string, any>>; activeConditions: Array<Record<string, any>>; allergies: Array<Record<string, any>>; immunizations: Array<Record<string, any>>; bloodType?: string | null; rhesusFactor?: string | null; baseline?: Record<string, unknown> | null; weightKg?: number | null; heightCm?: number | null; bmi?: number | null; bmiCategory?: string | null; latestMeasurements: Array<Record<string, any>>; connectedDevices: Array<Record<string, any>> };
  today: { upcomingAppointments: Array<Record<string, any>>; activeMedications: Array<Record<string, any>>; activeMedicationCount?: number; activeGoalCount?: number; notifications?: Array<Record<string, any>> };
  medications?: Array<Record<string, any>>;
  appointments?: Array<Record<string, any>>;
  goals: Array<Record<string, any>>;
  healthGoals?: Array<Record<string, any>>;
  family: Array<Record<string, any>>;
  allergies?: Array<Record<string, any>>;
  conditions?: Array<Record<string, any>>;
  immunizations?: Array<Record<string, any>>;
  emergencyContacts?: Array<Record<string, any>>;
  wearables: { devices: Array<Record<string, any>>; latestMeasurements: Array<{ id: string; type: string; value: number | string; unit: string; measuredAt: string; source?: string | null }> };
  notifications?: Array<Record<string, any>>;
  medicationNotifications?: Array<Record<string, any>>;
  attention: Array<{ type: string; severity: string; title: string; description: string; actionUrl?: string | null; actionLabel?: string | null }>;
  symptoms?: Array<Record<string, any>>;
  recentResults?: { laboratory?: Array<Record<string, any>>; imaging?: Array<Record<string, any>> };
  carePlans?: Array<Record<string, any>>;
  encounters?: Array<Record<string, any>>;
  prescriptions?: Array<Record<string, any>>;
  attachments?: Array<Record<string, any>>;
  clinicalVitals?: Array<Record<string, any>>;
  patientInsurances?: Array<Record<string, any>>;
  journal: Record<string, any>;
  ai?: { recentObservations?: Array<Record<string, any>> };
  healthJournalSettings?: Record<string, unknown> | null;
}

export interface UpdateWeightResponse { weightKg: number; heightCm: number; bmi: number; bmiCategory: string | null; recordedAt: string; goals: Array<{ id: string; progressPercent: number; currentValue: number; status: string }> }

class HealthHomeService {
  async getHealthHome(patientId?: string): Promise<HealthHomeResponse> {
    const healthHomeResponse = await api.get<{ success: boolean; data: HealthHomeResponse }>('/health-home', { params: patientId ? { patientId } : undefined });
    const healthHome = healthHomeResponse.data.data;

    // Before the Health Home refactor, the dashboard loaded the patient's
    // canonical saved profile/passport data from /onboarding/dashboard. Keep
    // that source for the owner patient so the three-card refactor does not
    // lose data that was already working, while Health Home remains the source
    // for the newer aggregated dashboard/clinical data.
    let canonical: any = null;
    if (!patientId || patientId === healthHome.patient?.id) {
      try {
        const onboardingResponse = await api.get<{ success: boolean; data: any }>('/onboarding/dashboard');
        canonical = onboardingResponse.data.data;
      } catch (error) {
        console.warn('Canonical onboarding dashboard unavailable; using Health Home data.', error);
      }
    }

    if (!canonical || canonical.patient?.id !== healthHome.patient?.id) {
      return {
        ...healthHome,
        wearables: healthHome.wearables ?? {
          devices: healthHome.healthSnapshot.connectedDevices,
          latestMeasurements: healthHome.healthSnapshot.latestMeasurements.map((m: any, index) => ({ id: `${m.type}-${index}`, type: m.type, value: m.value, unit: m.unit, measuredAt: m.measuredAt, source: m.source })),
        },
      };
    }

    return {
      ...healthHome,
      profile: canonical.profile ?? healthHome.profile,
      patient: { ...healthHome.patient, ...(canonical.patient ?? {}) },
      healthPassport: canonical.healthPassport ?? healthHome.healthPassport,
      emergencyContacts: canonical.emergencyContacts ?? healthHome.emergencyContacts,
      allergies: canonical.allergies ?? healthHome.allergies,
      conditions: canonical.conditions ?? healthHome.conditions,
      medications: canonical.medications ?? healthHome.medications,
      immunizations: canonical.immunizations ?? healthHome.immunizations,
      healthGoals: canonical.healthGoals ?? healthHome.healthGoals,
      healthSnapshot: {
        ...healthHome.healthSnapshot,
        activeAllergies: canonical.allergies ?? healthHome.healthSnapshot.activeAllergies,
        activeConditions: canonical.conditions ?? healthHome.healthSnapshot.activeConditions,
        allergies: canonical.allergies ?? healthHome.healthSnapshot.allergies,
        immunizations: canonical.immunizations ?? healthHome.healthSnapshot.immunizations,
        bloodType: canonical.healthPassport?.bloodType ?? healthHome.healthSnapshot.bloodType,
        rhesusFactor: canonical.healthPassport?.rhesusFactor ?? healthHome.healthSnapshot.rhesusFactor,
      },
      today: {
        ...healthHome.today,
        activeMedications: canonical.medications ?? healthHome.today.activeMedications,
      },
      wearables: healthHome.wearables ?? {
        devices: healthHome.healthSnapshot.connectedDevices,
        latestMeasurements: healthHome.healthSnapshot.latestMeasurements.map((m: any, index) => ({ id: `${m.type}-${index}`, type: m.type, value: m.value, unit: m.unit, measuredAt: m.measuredAt, source: m.source })),
      },
    };
  }

  async updateWeight(weightKg: number, heightCm?: number, patientId?: string): Promise<UpdateWeightResponse> {
    const response = await api.post<{ success: boolean; data: UpdateWeightResponse }>('/health-home/weight', { weightKg, ...(heightCm !== undefined ? { heightCm } : {}) }, { params: patientId ? { patientId } : undefined });
    return response.data.data;
  }
}

export const healthHomeService = new HealthHomeService();