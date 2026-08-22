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