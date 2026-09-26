"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  Mail,
  MessageCircle,
  MessageSquareText,
  Pill,
  ShieldCheck,
  Smartphone,
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
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const saved = await patientNotificationsService.getPreferences();
      setSavedCount(saved.length);
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

      if (!existingPreference) setSavedCount((count) => count + 1);

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
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <Link href="/notifications" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]">
              <ArrowLeft className="h-4 w-4" />Back to Notifications
            </Link>
            <span className="text-xs font-bold text-slate-400">{savedCount} saved preference{savedCount === 1 ? "" : "s"}</span>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-[30px] border border-[#24c1c4]/20 bg-gradient-to-br from-[#24c1c4]/10 via-white to-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0b2d54] text-white"><Bell className="h-6 w-6" /></span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#24c1c4]">Communication</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-[#0b2d54]">Notification preferences</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Choose which channels Sympto may use for different types of health and account updates. Your clinical records stay intact when you turn a channel off.</p>
              </div>
            </div>
          </section>

          {notice && <div className="mt-5 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 px-4 py-3 text-sm font-semibold text-[#0b2d54]">{notice}</div>}
          {error && <div className="mt-5 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid grid-cols-[1fr_repeat(5,56px)] gap-2 border-b border-slate-100 pb-3">
              <div><span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Update type</span></div>
              {channels.map(({ key, label, icon: Icon, supported }) => (
                <div
                  key={key}
                  className={`flex flex-col items-center gap-1 text-center ${supported ? "text-[#24c1c4]" : "text-slate-300"}`}
                  title={supported ? label : `${label} notifications are coming soon`}
                >
                  <Icon className="h-4 w-4" />
                  <span className={`text-[9px] font-black ${supported ? "text-slate-500" : "text-slate-300"}`}>{label}</span>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3 pt-4">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-50" />)}</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {types.map(({ key: type, label, description, icon: Icon }) => (
                  <article key={type} className="grid grid-cols-[1fr_repeat(5,56px)] items-center gap-2 py-5">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0b2d54]/[0.05] text-[#0b2d54] sm:grid"><Icon className="h-4 w-4" /></span>
                        <div>
                          <h2 className="text-sm font-bold text-[#0b2d54]">{label}</h2>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                        </div>
                      </div>
                    </div>
                    {channels.map(({ key: channel, supported }) => {
                      const settingKey = preferenceKey(type, channel);
                      const enabled = preferences[settingKey] ?? (channel === "IN_APP");
                      const saving = savingKey === settingKey;
                      return (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => void toggle(type, channel, supported)}
                          disabled={saving || !supported}
                          aria-pressed={supported ? enabled : false}
                          aria-label={
                            supported
                              ? `${label}: ${channel} notifications ${enabled ? "on" : "off"}`
                              : `${label}: ${channel} notifications coming soon`
                          }
                          title={!supported ? `${channel} notifications are coming soon` : undefined}
                          className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-black transition ${
                            !supported
                              ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 opacity-60"
                              : enabled
                                ? "border-[#24c1c4]/35 bg-[#24c1c4]/10 text-[#0b2d54]"
                                : "border-slate-200 bg-slate-50 text-slate-400"
                          } disabled:opacity-60`}
                        >
                          {saving ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                          ) : !supported ? (
                            <span className="text-[8px] font-black uppercase tracking-tight">Soon</span>
                          ) : enabled ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span className="text-[10px]">Off</span>
                          )}
                        </button>
                      );
                    })}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0b2d54]" />
              <div>
                <h2 className="font-semibold text-[#0b2d54]">A note about channels</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">In-app and Push notifications are available now. Email, SMS and WhatsApp are muted until their delivery services are connected. Turning a channel off never deletes your clinical records.</p>
              </div>
            </div>
          </section>

          <div className="mt-6 flex items-center justify-center text-[11px] text-slate-400">
            <ChevronDown className="mr-1 h-3.5 w-3.5" />Changes are saved as you make them
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}