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
    const response = await api.get('/health-home', { params: patientId ? { patientId } : undefined });
    const payload: any = response.data;
    const healthHome: HealthHomeResponse = payload?.data ?? payload;
    if (!healthHome?.patient?.id) throw new Error('Health Home returned an invalid response.');

    // PatientImmunization is the source of truth for vaccines. Prefer the
    // dedicated top-level collection returned by Health Home and only fall
    // back to the snapshot when necessary. Never replace a populated list
    // with an empty legacy/canonical list.
    const healthHomeImmunizations = Array.isArray(healthHome.immunizations)
      ? healthHome.immunizations
      : (Array.isArray(healthHome.healthSnapshot?.immunizations) ? healthHome.healthSnapshot.immunizations : []);

    let canonical: any = null;
    if (!patientId || patientId === healthHome.patient?.id) {
      try {
        const onboardingResponse = await api.get('/onboarding/dashboard');
        const onboardingPayload: any = onboardingResponse.data;
        canonical = onboardingPayload?.data ?? onboardingPayload;
      } catch (error) {
        console.warn('Canonical onboarding dashboard unavailable; using Health Home data.', error);
      }
    }

    if (!canonical || canonical.patient?.id !== healthHome.patient?.id) {
      return {
        ...healthHome,
        immunizations: healthHomeImmunizations,
        healthSnapshot: { ...healthHome.healthSnapshot, immunizations: healthHomeImmunizations },
        wearables: healthHome.wearables ?? {
          devices: healthHome.healthSnapshot.connectedDevices,
          latestMeasurements: healthHome.healthSnapshot.latestMeasurements.map((m: any, index) => ({ id: `${m.type}-${index}`, type: m.type, value: m.value, unit: m.unit, measuredAt: m.measuredAt, source: m.source })),
        },
      };
    }

    const canonicalImmunizations = Array.isArray(canonical.immunizations) ? canonical.immunizations : [];
    const immunizations = healthHomeImmunizations.length > 0 ? healthHomeImmunizations : canonicalImmunizations;
    const canonicalEmergencyContacts = Array.isArray(canonical.emergencyContacts) ? canonical.emergencyContacts : [];
    const emergencyContacts = canonicalEmergencyContacts.length > 0 ? canonicalEmergencyContacts : (healthHome.emergencyContacts ?? []);

    return {
      ...healthHome,
      profile: canonical.profile ?? healthHome.profile,
      patient: { ...healthHome.patient, ...(canonical.patient ?? {}) },
      healthPassport: canonical.healthPassport ?? healthHome.healthPassport,
      emergencyContacts,
      allergies: canonical.allergies ?? healthHome.allergies,
      conditions: canonical.conditions ?? healthHome.conditions,
      medications: canonical.medications ?? healthHome.medications,
      immunizations,
      healthGoals: canonical.healthGoals ?? healthHome.healthGoals,
      healthSnapshot: {
        ...healthHome.healthSnapshot,
        activeAllergies: canonical.allergies ?? healthHome.healthSnapshot.activeAllergies,
        activeConditions: canonical.conditions ?? healthHome.healthSnapshot.activeConditions,
        allergies: canonical.allergies ?? healthHome.healthSnapshot.allergies,
        immunizations,
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
    const payload: any = response.data;
    return payload?.data ?? payload;
  }
}

export const healthHomeService = new HealthHomeService();
