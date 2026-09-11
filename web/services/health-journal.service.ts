import { api } from "@/lib/api";

import type {
  CreateHealthJournalDto,
  HealthJournal,
  HealthJournalListResponse,
  HealthJournalMood,
  EnergyLevel,
} from "@/types/health-journal";

interface GetHealthJournalsParams {
  page?: number;
  limit?: number;
  mood?: HealthJournalMood;
  energyLevel?: EnergyLevel;
  encounterId?: string;
  practitionerId?: string;
}

export type SymptomIntelligenceResult = {
  symptomLogId: string;
  episodeId: string;
  assessment: {
    tone: "calm" | "watch" | "urgent";
    title: string;
    message: string;
  };
  insights: string[];
  actions: Array<{ label: string; href: string }>;
  context: {
    activeMedicationCount: number;
    conditionCount: number;
    allergyCount: number;
    recentSymptomCount: number;
    recentVitals: Array<{ type: string; value: number; measuredAt: string }>;
    wearableHeartRate: Array<{ value: number; measuredAt: string }>;
    upcomingAppointment: string | null;
    recentLabOrderCount: number;
    recentImagingCount: number;
    recentAiAssessmentCount: number;
  };
};

export type TalkToSymptoResult = {
  journal: HealthJournal;
  intelligence: {
    assessment: SymptomIntelligenceResult["assessment"];
    insights: string[];
    actions: Array<{ label: string; href: string }>;
    context: SymptomIntelligenceResult["context"];
  };
};

class HealthJournalService {
  async create(
    dto: CreateHealthJournalDto,
  ): Promise<HealthJournal> {
    const { data } = await api.post(
      "/health-journals",
      dto,
    );

    return data.data;
  }

  async processSymptom(
    dto: {
      symptomName: string;
      severity: "MILD" | "MODERATE" | "SEVERE" | "VERY_SEVERE";
      startedAt?: string;
      details?: string;
    },
  ): Promise<SymptomIntelligenceResult> {
    const { data } = await api.post(
      "/health-journals/process-symptom",
      dto,
    );

    return data.data;
  }

  async talkToSympto(message: string): Promise<TalkToSymptoResult> {
    const { data } = await api.post(
      "/health-journals/talk-to-sympto",
      { message },
    );

    return data.data;
  }

  async getAll(
    params: GetHealthJournalsParams = {},
  ): Promise<HealthJournalListResponse> {
    const { data } = await api.get(
      "/health-journals",
      {
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          mood: params.mood,
          energyLevel: params.energyLevel,
          encounterId: params.encounterId,
          practitionerId: params.practitionerId,
        },
      },
    );

    return data.data;
  }

  async getOne(
    id: string,
  ): Promise<HealthJournal> {
    const { data } = await api.get(
      `/health-journals/${id}`,
    );

    return data.data;
  }

  async update(
    id: string,
    dto: Partial<CreateHealthJournalDto>,
  ): Promise<HealthJournal> {
    const { data } = await api.patch(
      `/health-journals/${id}`,
      dto,
    );

    return data.data;
  }

  async remove(
    id: string,
  ): Promise<{ message: string }> {
    const { data } = await api.delete(
      `/health-journals/${id}`,
    );

    return data.data;
  }
}

export const healthJournalService =
  new HealthJournalService();
