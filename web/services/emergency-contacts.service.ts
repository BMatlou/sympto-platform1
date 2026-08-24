import { api } from "@/lib/api";

export interface EmergencyContact {
  id: string;
  patientId: string;
  fullName: string;
  relationship: string;
  phoneNumber: string;
  email?: string | null;
  isPrimary: boolean;
}

interface EmergencyContactsResponse {
  data: EmergencyContact[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class EmergencyContactsService {
  async getForPatient(patientId: string): Promise<EmergencyContact[]> {
    const response = await api.get<EmergencyContactsResponse | { data: EmergencyContactsResponse }>(
      "/emergency-contacts",
      {
        params: {
          patientId,
          page: 1,
          limit: 100,
        },
      },
    );

    const payload = response.data as EmergencyContactsResponse | { data: EmergencyContactsResponse };
    const result = "data" in payload && payload.data && !Array.isArray(payload.data)
      ? payload.data
      : payload as EmergencyContactsResponse;

    return Array.isArray(result.data) ? result.data : [];
  }
}

export const emergencyContactsService = new EmergencyContactsService();
