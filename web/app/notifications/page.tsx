"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
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
  | "ALL"
  | "MEDICATIONS"
  | "APPOINTMENTS"
  | "RESULTS"
  | "MESSAGES"
  | "TELEMEDICINE"
  | "BILLING"
  | "ACCOUNT"
  | "CARE";

type CategoryTab = {
  key: Exclude<NotificationCategory, "ALL">;
  label: string;
  icon: typeof Pill;
};

const categoryTabs: CategoryTab[] = [
  { key: "MEDICATIONS", label: "Medications", icon: Pill },
  { key: "APPOINTMENTS", label: "Appointments", icon: CalendarDays },
  { key: "RESULTS", label: "Results", icon: FileText },
  { key: "MESSAGES", label: "Messages", icon: MessageCircle },
  { key: "TELEMEDICINE", label: "Telemedicine", icon: Smartphone },
  { key: "BILLING", label: "Billing & claims", icon: FileText },
  { key: "ACCOUNT", label: "Account", icon: ShieldCheck },
  { key: "CARE", label: "Care", icon: Stethoscope },
];

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

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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

function formatReminderDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

  const yesterday = startToday - 24 * 60 * 60 * 1000;
  const timestamp = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();

  if (timestamp === startToday) return "TODAY";
  if (timestamp === yesterday) return "YESTERDAY";
  return "OLDER";
}

function groupLabel(group: "TODAY" | "YESTERDAY" | "OLDER") {
  if (group === "TODAY") return "Today";
  if (group === "YESTERDAY") return "Yesterday";
  return "Earlier";
}

function label(value: unknown) {
  return value
    ? String(value)
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Notification";
}

function iconFor(notification: PatientNotification) {
  const category = getCategory(notification);

  switch (category) {
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

function iconShell(notification: PatientNotification, unread: boolean) {
  const category = getCategory(notification);

  const categoryClasses: Record<NotificationCategory, string> = {
    ALL: unread
      ? "bg-[#24c1c4]/10 text-[#0b2d54]"
      : "bg-slate-100 text-slate-500",
    MEDICATIONS: "bg-[#0b2d54]/[0.07] text-[#0b2d54]",
    APPOINTMENTS: "bg-[#24c1c4]/10 text-[#0b2d54]",
    RESULTS: "bg-sky-50 text-sky-700",
    MESSAGES: "bg-violet-50 text-violet-700",
    TELEMEDICINE: "bg-indigo-50 text-indigo-700",
    BILLING: "bg-amber-50 text-amber-700",
    ACCOUNT: "bg-slate-100 text-slate-600",
    CARE: "bg-emerald-50 text-emerald-700",
  };

  return categoryClasses[category];
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);
  const [category, setCategory] = useState<NotificationCategory>("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
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

  const availableCategories = useMemo(() => {
    const present = new Set(
      notifications.map((notification) => getCategory(notification)),
    );

    return categoryTabs.filter((tab) => present.has(tab.key));
  }, [notifications]);

  const visible = useMemo(
    () =>
      notifications.filter((notification) => {
        const categoryMatch =
          category === "ALL" || getCategory(notification) === category;
        const unreadMatch = !unreadOnly || !notification.readAt;

        return categoryMatch && unreadMatch;
      }),
    [category, notifications, unreadOnly],
  );

  const grouped = useMemo(() => {
    const groups: Record<
      "TODAY" | "YESTERDAY" | "OLDER",
      PatientNotification[]
    > = {
      TODAY: [],
      YESTERDAY: [],
      OLDER: [],
    };

    for (const notification of visible) {
      groups[dateGroup(relevantDate(notification))].push(notification);
    }

    return groups;
  }, [visible]);

  const activeTabCount = (tab: NotificationCategory) =>
    notifications.filter(
      (notification) =>
        tab === "ALL" || getCategory(notification) === tab,
    ).length;

  const activeTabUnread = (tab: NotificationCategory) =>
    notifications.filter(
      (notification) =>
        !notification.readAt &&
        (tab === "ALL" || getCategory(notification) === tab),
    ).length;

  async function markRead(id: string) {
    try {
      setBusyId(id);
      setNotice("");

      await patientNotificationsService.markRead(id);

      const readAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, readAt, status: "READ" }
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

  const renderedGroups = (["TODAY", "YESTERDAY", "OLDER"] as const).filter(
    (key) => grouped[key].length > 0,
  );

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Health Home
            </Link>

            <Link
              href="/notifications/preferences"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#0b2d54] hover:border-[#24c1c4]"
            >
              <Settings className="h-4 w-4" />
              Notification preferences
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="mb-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0b2d54]">
              <Bell className="h-3.5 w-3.5" />
              Notifications
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-[#0b2d54]">
                  Your notifications
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  One place for medication reminders, appointments, results,
                  messages and important health updates.
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  disabled={busyId === "all"}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  <CheckCheck className="h-4 w-4" />
                  {busyId === "all"
                    ? "Updating…"
                    : "Mark all read · " + unreadCount}
                </button>
              )}
            </div>
          </section>

          <section className="mb-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Browse by
                </span>
                <span className="hidden text-xs font-semibold text-slate-300 sm:inline">
                  ·
                </span>
                <span className="truncate text-xs font-semibold text-slate-500">
                  {category === "ALL"
                    ? "Everything"
                    : categoryTabs.find((tab) => tab.key === category)?.label}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setUnreadOnly((current) => !current)}
                className={
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[11px] font-black transition " +
                  (unreadOnly
                    ? "bg-[#0b2d54] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                }
                aria-pressed={unreadOnly}
              >
                <span
                  className={
                    "h-1.5 w-1.5 rounded-full " +
                    (unreadOnly ? "bg-[#24c1c4]" : "bg-slate-400")
                  }
                />
                Unread only
                {unreadCount > 0 && (
                  <span className={unreadOnly ? "text-[#24c1c4]" : "text-[#0b2d54]"}>
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="flex min-w-max items-center gap-1.5 p-2">
                <button
                  type="button"
                  onClick={() => setCategory("ALL")}
                  className={
                    "inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition " +
                    (category === "ALL"
                      ? "bg-[#0b2d54] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100")
                  }
                >
                  <Bell className="h-4 w-4" />
                  All
                  <span
                    className={
                      "rounded-full px-1.5 py-0.5 text-[10px] " +
                      (category === "ALL"
                        ? "bg-white/10 text-white"
                        : "bg-slate-100 text-slate-500")
                    }
                  >
                    {notifications.length}
                  </span>
                </button>

                {availableCategories.map((tab) => {
                  const Icon = tab.icon;
                  const active = category === tab.key;
                  const count = activeTabCount(tab.key);
                  const newCount = activeTabUnread(tab.key);

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setCategory(tab.key)}
                      className={
                        "inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition " +
                        (active
                          ? "bg-[#0b2d54] text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100")
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                      <span
                        className={
                          "rounded-full px-1.5 py-0.5 text-[10px] " +
                          (active
                            ? "bg-white/10 text-white"
                            : newCount > 0
                              ? "bg-[#24c1c4]/10 text-[#0b2d54]"
                              : "bg-slate-100 text-slate-500")
                        }
                      >
                        {newCount > 0 ? newCount : count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {notice && (
            <div className="mb-4 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 px-4 py-3 text-sm font-semibold text-[#0b2d54]">
              {notice}
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-[24px] bg-white"
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-[28px] border border-red-200 bg-white p-7">
              <ShieldCheck className="h-6 w-6 text-red-600" />
              <h2 className="mt-4 font-semibold text-[#0b2d54]">
                Your notifications are temporarily unavailable
              </h2>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-xs font-bold text-white"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && visible.length === 0 && (
            <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]">
                <Bell className="h-7 w-7" />
              </div>
              <h2 className="mt-4 font-semibold text-[#0b2d54]">
                {unreadOnly
                  ? "You're all caught up"
                  : category === "ALL"
                    ? "No notifications yet"
                    : "Nothing in this category yet"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {unreadOnly
                  ? "There are no unread notifications waiting for you."
                  : "New activity for this category will appear here when Sympto has something to share."}
              </p>
            </div>
          )}

          {!loading && !error && visible.length > 0 && (
            <div className="space-y-8">
              {renderedGroups.map((group) => (
                <section key={group} aria-labelledby={"notifications-" + group.toLowerCase()}>
                  <div className="mb-3 flex items-center gap-3">
                    <h2
                      id={"notifications-" + group.toLowerCase()}
                      className="text-xs font-black uppercase tracking-[0.16em] text-slate-400"
                    >
                      {groupLabel(group)}
                    </h2>
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[11px] font-semibold text-slate-400">
                      {grouped[group].length}
                    </span>
                  </div>

                  <div className="space-y-3">
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
                            "rounded-[24px] border bg-white p-5 shadow-sm transition " +
                            (unread
                              ? "border-[#24c1c4]/30 ring-1 ring-[#24c1c4]/10"
                              : "border-slate-200")
                          }
                        >
                          <div className="flex items-start gap-4">
                            <span
                              className={
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl " +
                                (unread
                                  ? iconShell(notification, true)
                                  : "bg-slate-100 text-slate-500")
                              }
                            >
                              {iconFor(notification)}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-semibold text-[#0b2d54]">
                                      {notification.title}
                                    </h3>

                                    {unread && (
                                      <span className="rounded-full bg-[#24c1c4]/10 px-2.5 py-1 text-[10px] font-black text-[#0b2d54]">
                                        New
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {notification.body}
                                  </p>
                                </div>

                                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                                  {label(notification.type)}
                                </span>
                              </div>

                              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                                {medicationReminder &&
                                notification.scheduledFor ? (
                                  <>
                                    <span className="inline-flex items-center gap-1.5 font-bold text-[#0b2d54]">
                                      <Clock
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      />
                                      Reminder time ·{" "}
                                      {formatReminderTime(
                                        notification.scheduledFor,
                                      )}
                                    </span>
                                    <span>
                                      {formatReminderDate(
                                        notification.scheduledFor,
                                      )}
                                    </span>
                                  </>
                                ) : (
                                  <span>{formatDate(relevantDate(notification))}</span>
                                )}

                                <span>
                                  Delivered via {label(notification.channel)}
                                </span>

                                {notification.readAt && (
                                  <span>
                                    Read · {formatDate(notification.readAt)}
                                  </span>
                                )}
                              </div>

                              <div className="mt-4 flex flex-wrap items-center gap-2">
                                {(notification.actionUrl || fallbackUrl) && (
                                  <Link
                                    href={String(
                                      notification.actionUrl || fallbackUrl,
                                    )}
                                    onClick={() => {
                                      if (unread) void markRead(notification.id);
                                    }}
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-3.5 py-2.5 text-xs font-bold text-white"
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
                                    onClick={() => void markRead(notification.id)}
                                    disabled={busyId === notification.id}
                                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-[#0b2d54] disabled:opacity-50"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    {busyId === notification.id
                                      ? "Saving…"
                                      : "Mark as read"}
                                  </button>
                                )}
                              </div>

                              {notification.priority === "URGENT" && (
                                <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black text-red-700">
                                  <TriangleAlert className="h-3.5 w-3.5" />
                                  Urgent
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

          <section className="mt-8 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[#0b2d54]" />
              <div>
                <h3 className="font-semibold text-[#0b2d54]">
                  Choose how Sympto keeps you informed
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Notification preferences are separate from your clinical
                  record. Turning a channel off does not delete your health
                  information.
                </p>
                <Link
                  href="/notifications/preferences"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-[#0b2d54] ring-1 ring-[#24c1c4]/20"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Manage preferences
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
