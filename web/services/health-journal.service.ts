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
  observationId: string;
  assessment: {
    tone: "calm" | "watch" | "urgent";
    title: string;
    message: string;
  };
  insights: string[];
  actions: Array<{ label: string; href: string }>;
  context: {
    activeMedicationCount: number;
    activeMedicationNames: string[];
    conditionCount: number;
    activeConditionNames: string[];
    allergyCount: number;
    activeAllergyNames: string[];
    activeGoalCount: number;
    activeGoalTitles: string[];
    recentSymptomCount: number;
    recentSymptoms: Array<{ title: string; severity: string | null; startedAt: string }>;
    recentJournalCount: number;
    recentVitals: Array<{ type: string; value: number; measuredAt: string }>;
    wearableHeartRate: Array<{ value: number; measuredAt: string }>;
    upcomingAppointment: string | null;
    recentLabOrderCount: number;
    recentImagingCount: number;
    recentAiAssessmentCount: number;
  };
};

export type TalkToSymptoResult = {
  journal: HealthJournal | null;
  intelligence: {
    inputType: "SYMPTOM" | "URGENT_CONCERN" | "GENERAL_HEALTH";
    understandingSource: "AI" | "RULES";
    draft: {
      symptomName: string | null;
      severity: string | null;
      onsetLabel: "Today" | "Yesterday" | "A few days ago" | "More than a week ago" | "I am not sure";
      progression: string | null;
      painScore: number | null;
      location: string | null;
      medicationName: string | null;
      followUpQuestion: string | null;
    };
    safetySignals: string[];
    assessment: SymptomIntelligenceResult["assessment"];
    insights: string[];
    actions: Array<{ label: string; href: string }>;
    context: SymptomIntelligenceResult["context"];
  };
};

export type SymptomMonitoringResult = {
  observationId: string;
  symptomLogId: string;
  observedAt: string;
  currentSeverity: string;
  status: string;
  progression: string | null;
  insight: {
    tone: "calm" | "watch" | "urgent";
    title: string;
    message: string;
  };
  summary: {
    updatesRecorded: number;
    timelinePoints: number;
    highestRecordedSeverity: string;
    stillPresent: boolean;
  };
};

class HealthJournalService {
  async create(dto: CreateHealthJournalDto): Promise<HealthJournal> {
    const { data } = await api.post("/health-journals", dto);
    const journal = data.data as HealthJournal;
    return journal;
  }

  async processSymptom(dto: {
    symptomName: string;
    location?: string;
    severity: "MILD" | "MODERATE" | "SEVERE" | "VERY_SEVERE";
    startedAt?: string;
    onsetUncertain?: boolean;
    resolved?: boolean;
    progression?: "IMPROVING" | "STABLE" | "WORSENING" | "FLUCTUATING" | "RESOLVED";
    frequency?: "CONSTANT" | "INTERMITTENT" | "OCCASIONAL" | "RARE" | "UNKNOWN";
    painCharacter?: "SHARP" | "DULL" | "THROBBING" | "STABBING" | "BURNING" | "CRAMPING" | "PRESSURE" | "TIGHTNESS" | "ACHING" | "OTHER";
    painScore?: number;
    durationMinutes?: number;
    intermittent?: boolean;
    recurring?: boolean;
    suspectedTrigger?: string;
    triggerDetails?: string;
    triggerConfirmed?: boolean;
    triggerExposureAt?: string;
    occurredBeforeHours?: number;
    triggerNotes?: string;
    aggravatingFactors?: string;
    relievingFactors?: string;
    details?: string;
    medicationId?: string;
    reportedMedicationName?: string;
    prescriptionId?: string;
    medicationImproved?: boolean;
    medicationEffectiveness?: number;
    medicationSideEffects?: string;
    medicationImprovementPercentage?: number;
    medicationStartedAt?: string;
    medicationImprovementObservedAt?: string;
    medicationStoppedAt?: string;
    medicationNotes?: string;
  }): Promise<SymptomIntelligenceResult> {
    const { data } = await api.post("/health-journals/process-symptom", dto);
    return data.data;
  }

  async monitorSymptom(
    id: string,
    dto: {
      severity: "NONE" | "MILD" | "MODERATE" | "SEVERE" | "VERY_SEVERE";
      progression?: "IMPROVING" | "STABLE" | "WORSENING" | "FLUCTUATING" | "RESOLVED";
      frequency?: "CONSTANT" | "INTERMITTENT" | "OCCASIONAL" | "RARE" | "UNKNOWN";
      durationMinutes?: number;
      painScore?: number;
      stillPresent?: boolean;
      suspectedTrigger?: string;
      aggravatingFactors?: string;
      relievingFactors?: string;
      notes?: string;
      medicationId?: string;
      reportedMedicationName?: string;
      prescriptionId?: string;
      medicationImproved?: boolean;
      medicationEffectiveness?: number;
      medicationSideEffects?: string;
    },
  ): Promise<SymptomMonitoringResult> {
    const { data } = await api.post(`/health-journals/symptoms/${id}/monitor`, dto);
    return data.data;
  }

  async getSymptom(id: string): Promise<any> {
    const { data } = await api.get(`/health-journals/symptoms/${id}`);
    return data.data;
  }

  async getSymptoms(params: { limit?: number } = {}): Promise<any[]> {
    const { data } = await api.get("/health-journals/symptoms", {
      params: {
        limit: params.limit ?? 100,
      },
    });

    const payload = data?.data ?? data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  async talkToSympto(message: string): Promise<TalkToSymptoResult> {
    const { data } = await api.post("/health-journals/talk-to-sympto", { message });
    return data.data;
  }

  async getAll(params: GetHealthJournalsParams = {}): Promise<HealthJournalListResponse> {
    const { data } = await api.get("/health-journals", {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        mood: params.mood,
        energyLevel: params.energyLevel,
        encounterId: params.encounterId,
        practitionerId: params.practitionerId,
      },
    });
    return data.data;
  }

  async getOne(id: string): Promise<HealthJournal> {
    const { data } = await api.get(`/health-journals/${id}`);
    return data.data;
  }

  async update(id: string, dto: Partial<CreateHealthJournalDto>): Promise<HealthJournal> {
    const { data } = await api.patch(`/health-journals/${id}`, dto);
    const journal = data.data as HealthJournal;
    return journal;
  }

  async remove(id: string): Promise<{ message: string }> {
    const { data } = await api.delete(`/health-journals/${id}`);
    return data.data;
  }
}

export const healthJournalService = new HealthJournalService();
