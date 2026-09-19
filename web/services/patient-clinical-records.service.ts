import { api } from '@/lib/api';

export interface PatientClinicalRecords {
  generatedAt: string;
  carePlans: any[];
  referrals: any[];
  labResults: any[];
  imagingStudies: any[];
  riskAssessments: any[];
}

export type PatientCarePlanTaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

class PatientClinicalRecordsService {
  async get(): Promise<PatientClinicalRecords> {
    const response = await api.get<{ success?: boolean; data?: PatientClinicalRecords } | PatientClinicalRecords>('/health-home/records');
    const payload = response.data as any;
    return payload?.data ?? payload;
  }

  async updateCarePlanTaskStatus(
    taskId: string,
    status: PatientCarePlanTaskStatus,
  ) {
    const response = await api.patch(
      `/patient-care-plan-tasks/${encodeURIComponent(taskId)}/status`,
      { status },
    );
    const payload = response.data as any;
    return payload?.data ?? payload;
  }
}

export const patientClinicalRecordsService = new PatientClinicalRecordsService();