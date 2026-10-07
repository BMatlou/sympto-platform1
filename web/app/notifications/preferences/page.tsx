"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  FileText,
  Mail,
  MessageCircle,
  MessageSquareText,
  Pill,
  ShieldCheck,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { patientNotificationsService } from "@/services/patient-notifications.service";
import { enablePushNotifications } from "@/services/push-notifications.service";

const types = [
  { key: "APPOINTMENT", label: "Appointments", description: "Upcoming visits, changes and care scheduling.", icon: CalendarDays },
  { key: "PRESCRIPTION", label: "Prescriptions & medicines", description: "Prescription activity and medication updates.", icon: Pill },
  { key: "LAB_RESULT", label: "Laboratory results", description: "New laboratory results and result updates.", icon: FileText },
  { key: "IMAGING_RESULT", label: "Imaging results", description: "New imaging reports and updates.", icon: FileText },
  { key: "MESSAGE", label: "Care team messages", description: "Messages from practitioners and your care team.", icon: MessageCircle },
  { key: "TELEMEDICINE", label: "Telemedicine", description: "Telemedicine session updates and related reminders.", icon: Smartphone },
  { key: "REMINDER", label: "Health reminders", description: "Medication reminders and other scheduled health reminders.", icon: Bell },
  { key: "WEEKLY_HEALTH_REPORT", label: "Weekly health report", description: "A weekly overview of your recorded health activity and progress.", icon: CalendarDays },
  { key: "MONTHLY_HEALTH_REPORT", label: "Monthly health report", description: "A monthly overview of your recorded health activity and progress.", icon: TrendingUp },
  { key: "PAYMENT", label: "Payments", description: "Healthcare payment and invoice activity.", icon: FileText },
  { key: "CLAIM", label: "Medical aid claims", description: "Claim status and related updates.", icon: FileText },
  { key: "SECURITY", label: "Security", description: "Important account and health-data security notices.", icon: ShieldCheck },
  { key: "SYSTEM", label: "System updates", description: "Important updates about the Sympto service.", icon: Bell },
] as const;

const channels = [
  { key: "IN_APP", label: "In-app", icon: Bell, supported: true },
  { key: "EMAIL", label: "Email", icon: Mail, supported: false },
  { key: "SMS", label: "SMS", icon: MessageSquareText, supported: false },
  { key: "PUSH", label: "Push", icon: Smartphone, supported: true },
  { key: "WHATSAPP", label: "WhatsApp", icon: MessageCircle, supported: false },
] as const;

type PreferenceState = Record<string, boolean>;

function preferenceKey(type: string, channel: string) {
  return `${type}::${channel}`;
}

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<PreferenceState>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const saved = await patientNotificationsService.getPreferences();
      const next: PreferenceState = {};
      for (const preference of saved) {
        next[preferenceKey(preference.notificationType, preference.channel)] = preference.enabled;
      }
      setPreferences(next);
    } catch {
      setError("We couldn't load your notification preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(type: string, channel: string, supported: boolean) {
    if (!supported) return;

    const key = preferenceKey(type, channel);
    const existingPreference = Object.prototype.hasOwnProperty.call(preferences, key);
    const previous = preferences[key] ?? (channel === "IN_APP");
    const next = !previous;

    setSavingKey(key);
    setNotice("");
    setError("");

    try {
      if (channel === "PUSH" && next) {
        await enablePushNotifications();
      }

      await patientNotificationsService.updatePreference({
        notificationType: type,
        channel,
        enabled: next,
      });

      setPreferences((current) => ({ ...current, [key]: next }));


      setNotice(
        `${channel === "IN_APP" ? "In-app" : "Push"} notifications for this category are now ${next ? "on" : "off"}.`,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "That preference could not be saved. Your previous setting has been restored.",
      );
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:min-h-16 sm:px-6 lg:px-8">
            <Link href="/notifications" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]">
              <ArrowLeft className="h-4 w-4" />Back to Notifications
            </Link>
            <span className="text-xs font-bold text-slate-400">Manage notifications</span>
          </div>
        </header>


        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0b2d54] via-[#0f5261] to-[#24c1c4] text-white shadow-[0_24px_60px_rgba(11,45,84,0.18)]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px]" aria-hidden="true">
              <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-black/10 blur-2xl" />
            </div>

            <div className="relative p-6 sm:p-8">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">
                    Notifications
                  </p>
                  <h1 className="mt-1 max-w-[calc(100vw-120px)] text-2xl font-black tracking-tight sm:max-w-2xl sm:text-4xl">
                    Notification preferences
                  </h1>
                  <p className="mt-2 max-w-[calc(100vw-120px)] text-sm leading-6 text-white/75 sm:max-w-2xl">
                    Choose how you want Sympto to keep you informed about the things that matter to your health.
                  </p>
                </div>

                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-white/85 ring-1 ring-white/15 sm:h-16 sm:w-16">
                  <Bell className="h-5 w-5 sm:h-7 sm:w-7" />
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[11px] font-extrabold text-white ring-1 ring-white/10">
                  <Bell className="h-3.5 w-3.5" />
                  In-app
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[11px] font-extrabold text-white ring-1 ring-white/10">
                  <Smartphone className="h-3.5 w-3.5" />
                  Push
                </span>
              </div>
            </div>
          </section>

          {notice && (
            <div className="mt-5 rounded-2xl border border-[#24c1c4]/20 bg-white px-4 py-3 text-sm font-semibold text-[#0b2d54] shadow-sm">
              {notice}
            </div>
          )}
          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-sm">
              {error}
            </div>
          )}

          <section className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2 className="text-sm font-black text-[#0b2d54]">
                Choose your notifications
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Turn notifications on or off for each type of update.
              </p>
            </div>

            {loading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="px-5 py-5 sm:px-6">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-full max-w-md animate-pulse rounded bg-slate-100" />
                    <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-slate-100 sm:w-72" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {types.map(({ key: type, label, description, icon: Icon }) => (
                  <article key={type} className="px-5 py-5 sm:px-6 sm:py-6">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b2d54]/[0.06] text-[#0b2d54]">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-[#0b2d54]">
                          {label}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:max-w-md sm:flex-row">
                      {channels
                        .filter(({ supported }) => supported)
                        .map(({ key: channel, label: channelLabel, icon: ChannelIcon }) => {
                          const settingKey = preferenceKey(type, channel);
                          const enabled = preferences[settingKey] ?? (channel === "IN_APP");
                          const saving = savingKey === settingKey;

                          return (
                            <button
                              key={channel}
                              type="button"
                              onClick={() => void toggle(type, channel, true)}
                              disabled={saving}
                              role="switch"
                              aria-checked={enabled}
                              aria-label={
                                label +
                                ": " +
                                channelLabel +
                                " notifications " +
                                (enabled ? "on" : "off")
                              }
                              className={
                                "flex min-h-11 flex-1 items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition " +
                                (enabled
                                  ? "border-[#24c1c4]/35 bg-[#24c1c4]/10"
                                  : "border-slate-200 bg-white") +
                                " disabled:opacity-60"
                              }
                            >
                              <span className="flex min-w-0 items-center gap-2 text-left">
                                <span
                                  className={
                                    "grid h-8 w-8 shrink-0 place-items-center rounded-lg " +
                                    (enabled
                                      ? "bg-[#24c1c4]/15 text-[#0b2d54]"
                                      : "bg-slate-100 text-slate-400")
                                  }
                                >
                                  <ChannelIcon className="h-4 w-4" />
                                </span>
                                <span>
                                  <span className="block text-[11px] font-extrabold text-[#0b2d54]">
                                    {channelLabel}
                                  </span>
                                  <span className="block text-[10px] font-semibold text-slate-400">
                                    {saving ? "Saving…" : enabled ? "On" : "Off"}
                                  </span>
                                </span>
                              </span>

                              <span
                                aria-hidden="true"
                                className={
                                  "relative h-6 w-10 shrink-0 rounded-full p-1 transition " +
                                  (enabled ? "bg-[#24c1c4]" : "bg-slate-200")
                                }
                              >
                                <span
                                  className={
                                    "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform " +
                                    (enabled ? "translate-x-4" : "translate-x-0")
                                  }
                                />
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0b2d54]" />
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-[#0b2d54]">
                  About notification channels
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  In-app and Push are available now. Email, SMS and WhatsApp are not available yet and stay off until those delivery services are connected. Changing a notification preference never deletes your clinical records.
                </p>
              </div>
            </div>
          </section>

          <p className="mt-4 text-center text-[11px] font-semibold text-slate-400">
            Changes are saved automatically.
          </p>
        </div>
      </main>
    </ProtectedRoute>
  );
}