import { api } from '@/lib/api';

export interface PatientClinicalRecords {
  generatedAt: string;
  carePlans: any[];
  referrals: any[];
  labResults: any[];
  imagingStudies: any[];
  riskAssessments: any[];
}

class PatientClinicalRecordsService {
  async get(): Promise<PatientClinicalRecords> {
    const response = await api.get<{ success?: boolean; data?: PatientClinicalRecords } | PatientClinicalRecords>('/health-home/records');
    const payload = response.data as any;
    return payload?.data ?? payload;
  }
}

export const patientClinicalRecordsService = new PatientClinicalRecordsService();
