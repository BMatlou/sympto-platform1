import { api } from '@/lib/api';

export interface PrescribedMedication {
  id?: string | null;
  patientMedicationId?: string | null;
  medicationId?: string | null;
  name?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  route?: string | null;
  indication?: string | null;
  instructions?: string | null;
  prescribedBy?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  ongoing?: boolean | null;
  adherencePercentage?: number | null;
  missedDoses?: number | null;
  sideEffects?: string | null;
  effectiveness?: string | null;
  status?: string | null;
  notes?: string | null;
  prescriptionId?: string | null;
  prescriptionItemId?: string | null;
  source?: string | null;
  healthGoalId?: string | null;
  healthGoals?: Array<{ id?: string | null; status?: string | null; title?: string | null }> | null;
  patientMedication?: { id?: string | null } | null;
  medication?: { id?: string | null; name?: string | null; genericName?: string | null; brandName?: string | null } | null;
}

export interface HealthGoalRecord {
  id: string;
  [key: string]: any;
}

export interface HealthHomeResponse {
  generatedAt: string;
  profile?: { firstName?: string | null; lastName?: string | null; preferredName?: string | null; dateOfBirth?: string | null; gender?: string | null; profileImageUrl?: string | null } | null;
  patient: { id: string; patientNumber?: string | null; name?: string; firstName?: string; lastName?: string; profileImageUrl?: string | null; heightCm?: number | null; weightKg?: number | null; bmi?: number | null; bmiCategory?: string | null };
  healthPassport?: Record<string, unknown> | null;
  medicalRecord?: Record<string, any> | null;
  healthSnapshot: { activeAllergies?: Array<Record<string, any>>; activeConditions: Array<Record<string, any>>; allergies: Array<Record<string, any>>; immunizations: Array<Record<string, any>>; bloodType?: string | null; rhesusFactor?: string | null; baseline?: Record<string, unknown> | null; weightKg?: number | null; heightCm?: number | null; bmi?: number | null; bmiCategory?: string | null; latestMeasurements: Array<Record<string, any>>; normalizedVitals?: Array<Record<string, any>>; connectedDevices: Array<Record<string, any>> };
  today: { upcomingAppointments: Array<Record<string, any>>; activeMedications: PrescribedMedication[]; activeMedicationCount?: number; activeGoalCount?: number; notifications?: Array<Record<string, any>> };
  medications?: PrescribedMedication[];
  appointments?: Array<Record<string, any>>;
  goals: HealthGoalRecord[];
  healthGoals?: HealthGoalRecord[];
  activeGoalsArray?: HealthGoalRecord[];
  family: Array<Record<string, any>>;
  allergies?: Array<Record<string, any>>;
  conditions?: Array<Record<string, any>>;
  immunizations?: Array<Record<string, any>>;
  emergencyContacts?: Array<Record<string, any>>;
  wearables: { devices: Array<Record<string, any>>; latestMeasurements: Array<{ id?: string; type: string; value: number | string; unit: string; measuredAt: string; source?: string | null }> };
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

export interface UpdateWeightResponse { weightKg: number; heightCm: number | null; bmi: number | null; bmiCategory: string | null; recordedAt: string }
export interface ManualVitalsInput { systolicPressure?: number; diastolicPressure?: number; restingHeartRate?: number; respiratoryRate?: number; oxygenSaturation?: number; bodyTemperature?: number; weightKg?: number; heightCm?: number; measuredAt?: string }
export interface ManualVitalsResponse { recordedAt: string; bmi: number | null; bmiCategory: string | null }

function normalizeMedications(medications: any[]): any[] {
  return medications.map((medication: any) => {
    const source = String(medication?.source ?? "").trim().toUpperCase();
    const syntheticPrescriptionId = String(medication?.id ?? "").startsWith("prescription-item-");
    const patientMedicationId =
      medication?.patientMedication?.id ??
      (source !== "PRESCRIPTION" && !syntheticPrescriptionId ? medication?.id : null) ??
      medication?.patientMedicationId ??
      null;

    return {
      ...medication,
      patientMedicationId,
      medicationId:
        medication?.medicationId ??
        medication?.medication?.id ??
        medication?.medication?.medicationId ??
        null,
    };
  });
}

function normalizeGoals(...sources: any[]): any[] {
  const result: any[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const goal of source) {
      if (!goal || typeof goal !== 'object') continue;
      const key = String(goal.id ?? `${goal.category ?? ''}|${goal.title ?? ''}|${goal.createdAt ?? ''}`);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(goal);
    }
  }
  return result;
}

function mergeMedicationGoalLinks(canonicalMedications: any[], healthHomeMedications: any[]) {
  const byPatientMedicationId = new Map<string, any>();
  const byMedicationId = new Map<string, any>();

  for (const medication of healthHomeMedications) {
    const patientMedicationId =
      medication?.patientMedicationId ??
      medication?.patientMedication?.id ??
      medication?.id ??
      null;
    const medicationId =
      medication?.medicationId ??
      medication?.medication?.id ??
      null;

    if (patientMedicationId) byPatientMedicationId.set(String(patientMedicationId), medication);
    if (medicationId) byMedicationId.set(String(medicationId), medication);
  }

  return canonicalMedications.map((medication) => {
    const patientMedicationId =
      medication?.patientMedicationId ??
      medication?.patientMedication?.id ??
      null;
    const medicationId =
      medication?.medicationId ??
      medication?.medication?.id ??
      null;
    const source =
      (patientMedicationId && byPatientMedicationId.get(String(patientMedicationId))) ??
      (medicationId && byMedicationId.get(String(medicationId))) ??
      null;

    return source?.healthGoalId
      ? { ...source, ...medication, healthGoalId: source.healthGoalId }
      : medication;
  });
}

function mergePrescriptionMedications(patientMedications: any[], prescriptions: any[]) {
  const result = normalizeMedications(patientMedications);
  const existingMedicationIds = new Set(result.map((item: any) => String(item?.medicationId ?? '')).filter(Boolean));

  for (const prescription of Array.isArray(prescriptions) ? prescriptions : []) {
    if (String(prescription?.status ?? '').toUpperCase() !== 'ACTIVE') continue;
    const expiresAt = prescription?.expiresAt ? new Date(String(prescription.expiresAt)) : null;
    if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) continue;

    for (const item of Array.isArray(prescription?.items) ? prescription.items : []) {
      const medicationId = item?.medicationId ?? item?.medication?.id ?? null;
      if (!medicationId || existingMedicationIds.has(String(medicationId))) continue;
      const practitioner = prescription?.practitioner;
      const practitionerName = practitioner?.person ? [practitioner.person.firstName, practitioner.person.lastName].filter(Boolean).join(' ') : (practitioner?.name ?? '');
      result.push({
        id: `prescription-item-${item.id}`,
        patientMedicationId: null,
        medicationId,
        medication: item?.medication ?? null,
        dosage: item?.dosage ?? null,
        frequency: item?.frequency ?? null,
        route: item?.route ?? null,
        instructions: item?.instructions ?? prescription?.notes ?? null,
        prescribedBy: practitionerName || prescription?.practitionerId || null,
        prescriptionId: prescription.id,
        prescriptionItemId: item.id,
        source: 'PRESCRIPTION',
        status: 'ACTIVE',
        startedAt: prescription?.issuedAt ?? null,
        endedAt: prescription?.expiresAt ?? null,
      });
      existingMedicationIds.add(String(medicationId));
    }
  }
  return result;
}

class HealthHomeService {
  async getHealthHome(patientId?: string): Promise<HealthHomeResponse> {
    const response = await api.get('/health-home', { params: patientId ? { patientId } : undefined });
    const payload: any = response.data;
    const healthHome: HealthHomeResponse = payload?.data ?? payload;
    if (!healthHome?.patient?.id) throw new Error('Health Home returned an invalid response.');

    const healthHomeImmunizations = Array.isArray(healthHome.immunizations) && healthHome.immunizations.length > 0 ? healthHome.immunizations : (Array.isArray(healthHome.healthSnapshot?.immunizations) ? healthHome.healthSnapshot.immunizations : []);
    const healthHomeAllergies = Array.isArray(healthHome.allergies) && healthHome.allergies.length > 0 ? healthHome.allergies : (Array.isArray(healthHome.healthSnapshot?.activeAllergies) ? healthHome.healthSnapshot.activeAllergies : (healthHome.healthSnapshot?.allergies ?? []));
    const healthHomeConditions = Array.isArray(healthHome.conditions) && healthHome.conditions.length > 0 ? healthHome.conditions : (Array.isArray(healthHome.healthSnapshot?.activeConditions) ? healthHome.healthSnapshot.activeConditions : []);
    const healthHomeMedications = Array.isArray(healthHome.medications) && healthHome.medications.length > 0 ? healthHome.medications : (Array.isArray(healthHome.today?.activeMedications) ? healthHome.today.activeMedications : []);
    const healthHomeGoals = normalizeGoals(healthHome.goals, healthHome.healthGoals, healthHome.activeGoalsArray);

    let prescriptionRecords: any[] = Array.isArray(healthHome.prescriptions) ? healthHome.prescriptions : [];
    try {
      const prescriptionResponse = await api.get('/prescriptions/mine', { params: { page: 1, limit: 100 } });
      const prescriptionPayload: any = prescriptionResponse.data;
      const fetched = prescriptionPayload?.data ?? prescriptionPayload;
      if (Array.isArray(fetched)) prescriptionRecords = fetched;
      else if (Array.isArray(fetched?.data)) prescriptionRecords = fetched.data;
    } catch (error) {
      console.warn('Prescription feed unavailable; using Health Home medication data.', error);
    }

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

    const canonicalMedicationSource = canonical && canonical.patient?.id === healthHome.patient?.id && Array.isArray(canonical.medications) ? canonical.medications : healthHomeMedications;
    const canonicalMedications = mergeMedicationGoalLinks(canonicalMedicationSource, healthHomeMedications);
    const medications = mergePrescriptionMedications(canonicalMedications, prescriptionRecords);

    if (!canonical || canonical.patient?.id !== healthHome.patient?.id) {
      return { ...healthHome, allergies: healthHomeAllergies, conditions: healthHomeConditions, medications, immunizations: healthHomeImmunizations, goals: healthHomeGoals, healthGoals: healthHomeGoals, activeGoalsArray: healthHomeGoals.filter((goal: any) => !['CANCELLED', 'DELETED', 'ARCHIVED', 'ACHIEVED', 'EXPIRED', 'ON_HOLD'].includes(String(goal?.status ?? '').toUpperCase())), prescriptions: prescriptionRecords, healthSnapshot: { ...healthHome.healthSnapshot, activeAllergies: healthHomeAllergies, activeConditions: healthHomeConditions, allergies: healthHomeAllergies, immunizations: healthHomeImmunizations }, today: { ...healthHome.today, activeMedications: medications, activeMedicationCount: medications.length }, wearables: healthHome.wearables ?? { devices: healthHome.healthSnapshot.connectedDevices, latestMeasurements: healthHome.healthSnapshot.latestMeasurements.map((m: any, index) => ({ id: `${m.type}-${index}`, type: m.type, value: m.value, unit: m.unit, measuredAt: m.measuredAt, source: m.source })) } };
    }

    const canonicalImmunizations = Array.isArray(canonical.immunizations) ? canonical.immunizations : [];
    const immunizations = canonicalImmunizations.length > 0 ? canonicalImmunizations : healthHomeImmunizations;
    const canonicalEmergencyContacts = Array.isArray(canonical.emergencyContacts) ? canonical.emergencyContacts : [];
    const emergencyContacts = canonicalEmergencyContacts.length > 0 ? canonicalEmergencyContacts : (healthHome.emergencyContacts ?? []);
    const canonicalAllergies = Array.isArray(canonical.allergies) ? canonical.allergies : [];
    const canonicalConditions = Array.isArray(canonical.conditions) ? canonical.conditions : [];
    const allergies = canonicalAllergies.length > 0 ? canonicalAllergies : healthHomeAllergies;
    const conditions = canonicalConditions.length > 0 ? canonicalConditions : healthHomeConditions.map((condition: any) => condition?.status ? condition : { ...condition, status: 'ACTIVE' });
    const goals = normalizeGoals(canonical.healthGoals, canonical.goals, healthHomeGoals);

    return { ...healthHome, profile: canonical.profile ?? healthHome.profile, patient: { ...healthHome.patient, ...(canonical.patient ?? {}) }, healthPassport: canonical.healthPassport ?? healthHome.healthPassport, emergencyContacts, allergies, conditions, medications, immunizations, goals, healthGoals: goals, activeGoalsArray: goals.filter((goal: any) => !['CANCELLED', 'DELETED', 'ARCHIVED', 'ACHIEVED', 'EXPIRED', 'ON_HOLD'].includes(String(goal?.status ?? '').toUpperCase())), prescriptions: prescriptionRecords, healthSnapshot: { ...healthHome.healthSnapshot, activeAllergies: allergies, activeConditions: conditions, allergies, immunizations, bloodType: canonical.healthPassport?.bloodType ?? healthHome.healthSnapshot.bloodType, rhesusFactor: canonical.healthPassport?.rhesusFactor ?? healthHome.healthSnapshot.rhesusFactor }, today: { ...healthHome.today, activeMedications: medications, activeMedicationCount: medications.length }, wearables: healthHome.wearables ?? { devices: healthHome.healthSnapshot.connectedDevices, latestMeasurements: healthHome.healthSnapshot.latestMeasurements.map((m: any, index: number) => ({ id: `${m.type}-${index}`, type: m.type, value: m.value, unit: m.unit, measuredAt: m.measuredAt, source: m.source })) } };
  }

  async updateWeight(weightKg: number, heightCm?: number, patientId?: string): Promise<UpdateWeightResponse> {
    const response = await api.post<{ success: boolean; data: UpdateWeightResponse }>('/health-home/weight', { weightKg, ...(heightCm !== undefined ? { heightCm } : {}) }, { params: patientId ? { patientId } : undefined });
    const payload: any = response.data;
    return payload?.data ?? payload;
  }

  async recordManualVitals(input: ManualVitalsInput, patientId?: string): Promise<ManualVitalsResponse> {
    const response = await api.post<{ success: boolean; data: ManualVitalsResponse }>('/health-home/manual-vitals', input, { params: patientId ? { patientId } : undefined });
    const payload: any = response.data;
    return payload?.data ?? payload;
  }
}

export const healthHomeService = new HealthHomeService();