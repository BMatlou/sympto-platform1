"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  FileText,
  MessageCircle,
  Pill,
  Settings,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import {
  patientNotificationsService,
  type PatientNotification,
} from "@/services/patient-notifications.service";

type NotificationCategory =
  | "MEDICATIONS"
  | "APPOINTMENTS"
  | "RESULTS"
  | "MESSAGES"
  | "TELEMEDICINE"
  | "BILLING"
  | "ACCOUNT"
  | "CARE";

type NotificationRange = "DAY" | "WEEK" | "MONTH";

function isMedicationReminder(notification: PatientNotification) {
  const title = String(notification.title ?? "").toLowerCase();
  return notification.type === "REMINDER" && title.startsWith("medication reminder:");
}

function getCategory(notification: PatientNotification): NotificationCategory {
  if (
    notification.type === "PRESCRIPTION" ||
    isMedicationReminder(notification)
  ) {
    return "MEDICATIONS";
  }

  switch (notification.type) {
    case "APPOINTMENT":
      return "APPOINTMENTS";
    case "LAB_RESULT":
    case "IMAGING_RESULT":
      return "RESULTS";
    case "MESSAGE":
      return "MESSAGES";
    case "TELEMEDICINE":
      return "TELEMEDICINE";
    case "PAYMENT":
    case "CLAIM":
      return "BILLING";
    case "SECURITY":
    case "SYSTEM":
      return "ACCOUNT";
    case "REMINDER":
      return "CARE";
    default:
      return "CARE";
  }
}

function formatReminderTime(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-ZA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function relevantDate(notification: PatientNotification) {
  return notification.scheduledFor ?? notification.createdAt;
}

function dateGroup(value: unknown): "TODAY" | "YESTERDAY" | "OLDER" {
  if (!value) return "OLDER";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "OLDER";

  const today = new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();

  const timestamp = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();

  if (timestamp === startToday) return "TODAY";
  if (timestamp === startToday - 24 * 60 * 60 * 1000) return "YESTERDAY";
  return "OLDER";
}

function categoryLabel(notification: PatientNotification) {
  switch (getCategory(notification)) {
    case "MEDICATIONS":
      return "Medication";
    case "APPOINTMENTS":
      return "Appointment";
    case "RESULTS":
      return "Result";
    case "MESSAGES":
      return "Message";
    case "TELEMEDICINE":
      return "Telemedicine";
    case "BILLING":
      return "Billing";
    case "ACCOUNT":
      return "Account";
    case "CARE":
      return "Care";
    default:
      return "Notification";
  }
}

function iconFor(notification: PatientNotification) {
  switch (getCategory(notification)) {
    case "MEDICATIONS":
      return <Pill className="h-5 w-5" aria-hidden="true" />;
    case "APPOINTMENTS":
      return <CalendarDays className="h-5 w-5" aria-hidden="true" />;
    case "RESULTS":
      return <FileText className="h-5 w-5" aria-hidden="true" />;
    case "MESSAGES":
      return <MessageCircle className="h-5 w-5" aria-hidden="true" />;
    case "TELEMEDICINE":
      return <Smartphone className="h-5 w-5" aria-hidden="true" />;
    case "BILLING":
      return <FileText className="h-5 w-5" aria-hidden="true" />;
    case "ACCOUNT":
      return <ShieldCheck className="h-5 w-5" aria-hidden="true" />;
    case "CARE":
      return <Stethoscope className="h-5 w-5" aria-hidden="true" />;
    default:
      return <Bell className="h-5 w-5" aria-hidden="true" />;
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);
  const [range, setRange] = useState<NotificationRange>("DAY");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [payload, unreadCount] = await Promise.all([
        patientNotificationsService.list({ page: 1, limit: 100 }),
        patientNotificationsService.getUnreadCount(),
      ]);

      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      setNotifications(rows as PatientNotification[]);
      setServerUnreadCount(
        Number.isFinite(unreadCount) ? Math.max(0, unreadCount) : 0,
      );
    } catch {
      setError("We couldn't load your notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => void load(), 15_000);
    const refreshOnFocus = () => void load();

    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [load]);

  const unreadCount = serverUnreadCount;

  const rangeFiltered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(startOfToday);
    const day = startOfWeek.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - mondayOffset);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const rangeStart =
      range === "DAY"
        ? startOfToday
        : range === "WEEK"
          ? startOfWeek
          : startOfMonth;

    return notifications
      .filter((notification) => {
        const date = new Date(String(relevantDate(notification)));
        return (
          !Number.isNaN(date.getTime()) &&
          date >= rangeStart &&
          date <= now
        );
      })
      .sort((a, b) => {
        const aUnread = !a.readAt;
        const bUnread = !b.readAt;

        if (aUnread !== bUnread) return aUnread ? -1 : 1;

        return (
          new Date(String(b.createdAt)).getTime() -
          new Date(String(a.createdAt)).getTime()
        );
      });
  }, [notifications, range]);

  const grouped = useMemo(() => {
    const groups: Record<string, PatientNotification[]> = {};

    for (const notification of rangeFiltered) {
      const date = new Date(String(relevantDate(notification)));
      if (Number.isNaN(date.getTime())) continue;

      let key = "";
      if (range === "DAY") {
        key = dateGroup(relevantDate(notification));
      } else if (range === "WEEK") {
        key = new Intl.DateTimeFormat("en-ZA", {
          weekday: "long",
          day: "numeric",
          month: "short",
        }).format(date);
      } else {
        key = new Intl.DateTimeFormat("en-ZA", {
          day: "numeric",
          month: "long",
        }).format(date);
      }

      (groups[key] ??= []).push(notification);
    }

    return groups;
  }, [rangeFiltered, range]);

  async function markRead(id: string) {
    try {
      setBusyId(id);
      setNotice("");

      await patientNotificationsService.markRead(id);

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                readAt: new Date().toISOString(),
                status: "READ",
              }
            : notification,
        ),
      );

      setServerUnreadCount((current) => Math.max(0, current - 1));
    } catch {
      setNotice("We couldn't update that notification.");
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (!unreadCount) return;

    try {
      setBusyId("all");
      setNotice("");

      await patientNotificationsService.markAllRead();

      const now = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? now,
          status: notification.readAt ? notification.status : "READ",
        })),
      );

      setServerUnreadCount(0);
      setNotice("All notifications marked as read.");
    } catch {
      setNotice("We couldn't mark all notifications as read.");
    } finally {
      setBusyId(null);
    }
  }

  const renderedGroups = Object.keys(grouped).filter(
    (key) => grouped[key]?.length > 0,
  );

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f4fbfb] text-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] transition hover:text-[#24c1c4]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Health Home
            </Link>

            <Link
              href="/notifications/preferences"
              aria-label="Notification preferences"
              className="text-[#0b2d54] transition hover:text-[#24c1c4]"
              title="Preferences"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>

          <section className="relative mb-6 overflow-visible rounded-[32px] bg-gradient-to-br from-[#0b2d54] via-[#0f5261] to-[#24c1c4] text-white shadow-[0_24px_60px_rgba(11,45,84,0.20)]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]" aria-hidden="true">
              <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-black/10 blur-2xl" />
            </div>

            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Your notifications
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                    Stay on top of medicines, appointments, results and messages that matter to you.
                  </p>
                </div>

                {unreadCount > 0 && (
                  <div className="w-fit shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold text-white ring-1 ring-white/10">
                    {unreadCount} unread
                  </div>
                )}
              </div>

              <div className="mt-7 border-t border-white/15 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex w-full rounded-xl bg-white/10 p-1 ring-1 ring-white/10 sm:w-auto">
                    {(["DAY", "WEEK", "MONTH"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRange(value)}
                        aria-pressed={range === value}
                        className={
                          "min-h-10 flex-1 rounded-lg px-4 text-xs font-black transition sm:min-w-20 sm:flex-none " +
                          (range === value
                            ? "bg-white text-[#0b2d54] shadow-sm"
                            : "text-white/60 hover:text-white")
                        }
                      >
                        {value === "DAY"
                          ? "Day"
                          : value === "WEEK"
                            ? "Week"
                            : "Month"}
                      </button>
                    ))}
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void markAllRead()}
                      disabled={busyId === "all"}
                      className="shrink-0 text-xs font-bold text-white/80 transition hover:text-white disabled:opacity-50"
                    >
                      {busyId === "all" ? "Updating…" : "Mark all read"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {notice && (
            <div className="mt-4 border-l-2 border-[#24c1c4] px-3 py-2 text-sm font-semibold text-[#0b2d54]">
              {notice}
            </div>
          )}

          {loading && (
            <div className="divide-y divide-slate-200">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex gap-4 py-5">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="py-14 text-center">
              <TriangleAlert className="mx-auto h-6 w-6 text-red-600" />
              <h2 className="mt-3 font-bold text-[#0b2d54]">
                Your notifications are temporarily unavailable
              </h2>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-5 text-xs font-bold text-[#0b2d54] underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && rangeFiltered.length === 0 && (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0b2d54] shadow-sm ring-1 ring-slate-200">
                <Bell className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-extrabold text-[#0b2d54]">
                No notifications yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                New medication reminders, appointments, results and other important updates will appear here.
              </p>
            </div>
          )}

          {!loading && !error && rangeFiltered.length > 0 && (
            <div className="mt-2">
              {renderedGroups.map((group) => (
                <section key={group}>
                  <div className="flex items-center gap-3 border-b border-slate-200 py-4">
                    <h2 className="text-sm font-extrabold text-[#0b2d54]">
                      {range === "DAY"
                        ? new Intl.DateTimeFormat("en-ZA", {
                            day: "numeric",
                            month: "long",
                          }).format(new Date())
                        : group}
                    </h2>
                    {range !== "DAY" && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {grouped[group].length}
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-slate-200">
                    {grouped[group].map((notification) => {
                      const unread = !notification.readAt;
                      const medicationReminder =
                        isMedicationReminder(notification);

                      const fallbackUrl =
                        notification.type === "PRESCRIPTION"
                          ? "/medications"
                          : notification.type === "APPOINTMENT"
                            ? "/appointments"
                            : null;

                      return (
                        <article
                          key={notification.id}
                          className={
                            "py-5 transition " +
                            (unread ? "bg-white/60" : "")
                          }
                        >
                          <div className="flex items-start gap-4">
                            <span
                              className={
                                "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full " +
                                (unread
                                  ? "bg-[#24c1c4]/10 text-[#0b2d54]"
                                  : "bg-slate-100 text-slate-400")
                              }
                            >
                              {iconFor(notification)}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="mb-1 flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#177e89]">
                                      {categoryLabel(notification)}
                                    </span>
                                    {unread && (
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#24c1c4]" aria-label="Unread" />
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3
                                      className={
                                        "text-sm font-bold leading-5 " +
                                        (unread
                                          ? "text-[#0b2d54]"
                                          : "text-slate-700")
                                      }
                                    >
                                      {notification.title}
                                    </h3>
                                  </div>
                                  <p className="mt-1.5 max-w-3xl text-xs leading-5 text-slate-500">
                                    {notification.body}
                                  </p>
                                </div>

                                <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                                  {medicationReminder && notification.scheduledFor
                                    ? formatReminderTime(notification.scheduledFor)
                                    : new Intl.DateTimeFormat("en-ZA", {
                                        hour: "numeric",
                                        minute: "2-digit",
                                      }).format(new Date(relevantDate(notification)))}
                                </span>
                              </div>

                              {(notification.actionUrl || fallbackUrl || unread) && (
                                <div className="mt-3 flex items-center gap-3">
                                  {(notification.actionUrl || fallbackUrl) && (
                                    <Link
                                      href={String(
                                        notification.actionUrl || fallbackUrl,
                                      )}
                                      onClick={() => {
                                        if (unread) void markRead(notification.id);
                                      }}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0b2d54] hover:text-[#24c1c4]"
                                    >
                                      {String(
                                        notification.actionLabel ||
                                          (notification.type === "PRESCRIPTION"
                                            ? "View medications"
                                            : notification.type === "APPOINTMENT"
                                              ? "View appointments"
                                              : "Open"),
                                      )}
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                  )}

                                  {unread && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void markRead(notification.id)
                                      }
                                      disabled={busyId === notification.id}
                                      className="text-[11px] font-bold text-slate-400 hover:text-[#0b2d54] disabled:opacity-50"
                                    >
                                      {busyId === notification.id
                                        ? "Saving…"
                                        : "Mark as read"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
