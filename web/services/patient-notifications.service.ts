import { api } from "@/lib/api";

export type PatientNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  priority: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
  scheduledFor?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type NotificationPreference = {
  id: string;
  notificationType: string;
  channel: string;
  enabled: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  createdAt: string;
  updatedAt: string;
};

class PatientNotificationsService {
  async list(params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) {
    const response = await api.get("/patient-notifications", {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 50,
        unreadOnly: params.unreadOnly ?? false,
      },
    });
    return response.data?.data ?? response.data;
  }

  async getUnreadCount(): Promise<number> {
    const response = await api.get("/patient-notifications/unread-count");
    const payload = response.data?.data ?? response.data;
    return Number(payload?.count ?? 0);
  }

  async markRead(id: string) {
    const response = await api.patch(`/patient-notifications/${encodeURIComponent(id)}/read`);
    return response.data?.data ?? response.data;
  }

  async markAllRead() {
    const response = await api.patch("/patient-notifications/read-all");
    return response.data?.data ?? response.data;
  }

  async getPushPublicKey(): Promise<string> {
    const response = await api.get("/patient-notifications/push/public-key");
    return String(response.data?.data?.publicKey ?? response.data?.publicKey ?? "");
  }

  async registerPushSubscription(subscription: PushSubscription): Promise<void> {
    await api.post("/patient-notifications/push-subscription", {
      subscription: JSON.stringify(subscription.toJSON()),
    });
  }

  async getPreferences(): Promise<NotificationPreference[]> {
    const response = await api.get("/patient-notifications/preferences");
    const payload = response.data?.data ?? response.data;
    return Array.isArray(payload) ? payload : [];
  }

  async updatePreference(input: {
    notificationType: string;
    channel: string;
    enabled: boolean;
  }): Promise<NotificationPreference> {
    const response = await api.patch("/patient-notifications/preferences", input);
    return response.data?.data ?? response.data;
  }
}

export const patientNotificationsService = new PatientNotificationsService();
