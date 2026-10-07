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
  type NotificationPreference,
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

type NotificationRange = "DAY" | "WEEK" | "MONTH";

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

// Category visibility is intentionally stricter than the preferences page
// default. A category belongs in this page only when the user has explicitly
// enabled at least one underlying notification type for In-app delivery AND
// there is an actual notification message in that category.
const categoryPreferenceTypes: Record<
  Exclude<NotificationCategory, "ALL">,
  string[]
> = {
  MEDICATIONS: ["PRESCRIPTION", "REMINDER"],
  APPOINTMENTS: ["APPOINTMENT"],
  RESULTS: ["LAB_RESULT", "IMAGING_RESULT"],
  MESSAGES: ["MESSAGE"],
  TELEMEDICINE: ["TELEMEDICINE"],
  BILLING: ["PAYMENT", "CLAIM"],
  ACCOUNT: ["SECURITY", "SYSTEM"],
  CARE: ["REMINDER"],
};

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

  const timestamp = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();

  if (timestamp === startToday) return "TODAY";
  if (timestamp === startToday - 24 * 60 * 60 * 1000) return "YESTERDAY";
  return "OLDER";
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

function iconClasses(notification: PatientNotification, unread: boolean) {
  const category = getCategory(notification);
  if (!unread) return "bg-slate-100 text-slate-400";

  const classes: Record<NotificationCategory, string> = {
    ALL: "bg-[#24c1c4]/10 text-[#0b2d54]",
    MEDICATIONS: "bg-[#0b2d54]/[0.08] text-[#0b2d54]",
    APPOINTMENTS: "bg-[#24c1c4]/12 text-[#0b2d54]",
    RESULTS: "bg-sky-50 text-sky-700",
    MESSAGES: "bg-violet-50 text-violet-700",
    TELEMEDICINE: "bg-indigo-50 text-indigo-700",
    BILLING: "bg-amber-50 text-amber-700",
    ACCOUNT: "bg-slate-100 text-slate-600",
    CARE: "bg-emerald-50 text-emerald-700",
  };

  return classes[category];
}

function categoryLabel(category: NotificationCategory) {
  if (category === "ALL") return "Everything";
  return categoryTabs.find((tab) => tab.key === category)?.label ?? "Notifications";
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);
  const [category, setCategory] = useState<NotificationCategory>("ALL");
  const [range, setRange] = useState<NotificationRange>("DAY");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [payload, unreadCount, savedPreferences] = await Promise.all([
        patientNotificationsService.list({ page: 1, limit: 100 }),
        patientNotificationsService.getUnreadCount(),
        patientNotificationsService.getPreferences(),
      ]);

      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      setNotifications(rows as PatientNotification[]);
      setPreferences(savedPreferences);
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

  const visibleCategoryTabs = useMemo(
    () =>
      categoryTabs.filter((tab) => {
        const hasExplicitInAppPreference = categoryPreferenceTypes[tab.key].some(
          (type) =>
            preferences.some(
              (item) =>
                item.notificationType === type &&
                item.channel === "IN_APP" &&
                item.enabled,
            ),
        );

        const hasNotification = notifications.some(
          (notification) => getCategory(notification) === tab.key,
        );

        return hasExplicitInAppPreference && hasNotification;
      }),
    [notifications, preferences],
  );

  useEffect(() => {
    if (
      category !== "ALL" &&
      !visibleCategoryTabs.some((tab) => tab.key === category)
    ) {
      setCategory("ALL");
    }
  }, [category, visibleCategoryTabs]);

  const visible = useMemo(() => {
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
        const categoryMatch =
          category === "ALL" || getCategory(notification) === category;
        const unreadMatch = !unreadOnly || !notification.readAt;
        const inRange =
          !Number.isNaN(date.getTime()) && date >= rangeStart && date <= now;

        return categoryMatch && unreadMatch && inRange;
      })
      .sort((a, b) => {
        const aUnread = !a.readAt;
        const bUnread = !b.readAt;

        // "New" means unread in the Notification Center. Surface unread
        // notifications first, then keep each group newest-first.
        if (aUnread !== bUnread) return aUnread ? -1 : 1;

        return (
          new Date(String(b.createdAt)).getTime() -
          new Date(String(a.createdAt)).getTime()
        );
      });
  }, [category, notifications, unreadOnly, range]);

  const grouped = useMemo(() => {
    const groups: Record<string, PatientNotification[]> = {};

    for (const notification of visible) {
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
  }, [visible, range]);

  const counts = useMemo(() => {
    const result: Record<
      NotificationCategory,
      { total: number; unread: number }
    > = {
      ALL: { total: notifications.length, unread: unreadCount },
      MEDICATIONS: { total: 0, unread: 0 },
      APPOINTMENTS: { total: 0, unread: 0 },
      RESULTS: { total: 0, unread: 0 },
      MESSAGES: { total: 0, unread: 0 },
      TELEMEDICINE: { total: 0, unread: 0 },
      BILLING: { total: 0, unread: 0 },
      ACCOUNT: { total: 0, unread: 0 },
      CARE: { total: 0, unread: 0 },
    };

    for (const notification of notifications) {
      const key = getCategory(notification);
      result[key].total += 1;
      if (!notification.readAt) result[key].unread += 1;
    }

    return result;
  }, [notifications, unreadCount]);

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
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <div className="mb-7 flex items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] transition hover:text-[#24c1c4]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Health Home
            </Link>

            <div className="flex items-center gap-4">
              {unreadCount > 0 && (
                <span className="inline-flex items-center gap-2 text-xs font-bold text-[#0b2d54]">
                  <span className="h-2 w-2 rounded-full bg-[#24c1c4]" />
                  {unreadCount} unread
                </span>
              )}
              <Link
                href="/notifications/preferences"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#0b2d54] transition hover:text-[#24c1c4]"
              >
                <Settings className="h-4 w-4" />
                Preferences
              </Link>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0b2d54] sm:text-4xl">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Your health reminders and important updates.
            </p>
          </div>

          <section className="overflow-hidden rounded-[28px] border border-[#0b2d54]/10 bg-white shadow-[0_12px_35px_rgba(11,45,84,0.07)]">
            <div className="bg-[#0b2d54] px-5 pt-5 sm:px-7 sm:pt-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#24c1c4]">
                    {range === "DAY"
                      ? "Today"
                      : range === "WEEK"
                        ? "This week"
                        : "This month"}
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white">
                    {categoryLabel(category)}
                  </h2>
                </div>
                <p className="hidden pb-0.5 text-xs font-medium text-white/55 sm:block">
                  {range === "DAY"
                    ? new Intl.DateTimeFormat("en-ZA", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }).format(new Date())
                    : range === "WEEK"
                      ? "Monday to today"
                      : new Intl.DateTimeFormat("en-ZA", {
                          month: "long",
                          year: "numeric",
                        }).format(new Date())}
                </p>
              </div>

              <div className="mt-5 flex gap-6 overflow-x-auto">
                {(["DAY", "WEEK", "MONTH"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRange(value)}
                    aria-pressed={range === value}
                    className={
                      "relative min-h-11 shrink-0 px-0.5 text-xs font-black transition " +
                      (range === value
                        ? "text-white"
                        : "text-white/45 hover:text-white/80")
                    }
                  >
                    {value === "DAY"
                      ? "Day"
                      : value === "WEEK"
                        ? "Week"
                        : "Month"}
                    {range === value && (
                      <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#24c1c4]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-b border-slate-200 bg-white px-5 sm:px-7">
              <div className="flex items-center justify-between gap-4 overflow-x-auto">
                <div className="flex min-w-0 items-center gap-5">
                  <button
                    type="button"
                    onClick={() => setCategory("ALL")}
                    className={
                      "relative min-h-12 shrink-0 text-xs font-bold transition " +
                      (category === "ALL"
                        ? "text-[#0b2d54]"
                        : "text-slate-400 hover:text-[#0b2d54]")
                    }
                  >
                    All
                    {counts.ALL.unread > 0 && (
                      <span className="ml-1.5 text-[10px] font-black text-[#24c1c4]">
                        {counts.ALL.unread}
                      </span>
                    )}
                    {category === "ALL" && (
                      <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#24c1c4]" />
                    )}
                  </button>

                  {visibleCategoryTabs.map((tab) => {
                    const active = category === tab.key;
                    const count = counts[tab.key];

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setCategory(tab.key)}
                        className={
                          "relative min-h-12 shrink-0 text-xs font-bold transition " +
                          (active
                            ? "text-[#0b2d54]"
                            : "text-slate-400 hover:text-[#0b2d54]")
                        }
                      >
                        {tab.label}
                        {count.unread > 0 && (
                          <span className="ml-1.5 text-[10px] font-black text-[#24c1c4]">
                            {count.unread}
                          </span>
                        )}
                        {active && (
                          <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#24c1c4]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setUnreadOnly((current) => !current)}
                    aria-pressed={unreadOnly}
                    className={
                      "text-[11px] font-bold transition " +
                      (unreadOnly
                        ? "text-[#0b2d54]"
                        : "text-slate-400 hover:text-[#0b2d54]")
                    }
                  >
                    {unreadOnly ? "Showing unread" : "Unread only"}
                  </button>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void markAllRead()}
                      disabled={busyId === "all"}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0b2d54] transition hover:text-[#24c1c4] disabled:opacity-50"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      {busyId === "all" ? "Updating…" : "Mark all read"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {notice && (
              <div className="border-b border-[#24c1c4]/20 bg-[#24c1c4]/5 px-5 py-3 text-sm font-semibold text-[#0b2d54] sm:px-7">
                {notice}
              </div>
            )}

            {loading && (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex gap-4 px-5 py-5 sm:px-7">
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
                      <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="px-5 py-12 text-center sm:px-7">
                <TriangleAlert className="mx-auto h-6 w-6 text-red-600" />
                <h2 className="mt-3 font-bold text-[#0b2d54]">
                  Your notifications are temporarily unavailable
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-5 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-xs font-bold text-white"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && visible.length === 0 && (
              <div className="px-5 py-14 text-center sm:px-7">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f4fbfb] text-[#0b2d54]">
                  {iconFor(
                    notifications.find((item) => getCategory(item) === category) ??
                      ({
                        id: "empty",
                        type:
                          category === "MEDICATIONS"
                            ? "PRESCRIPTION"
                            : "SYSTEM",
                        title: "",
                        body: "",
                        channel: "IN_APP",
                        status: "READ",
                        priority: "NORMAL",
                        createdAt: new Date().toISOString(),
                      } as PatientNotification),
                  )}
                </div>
                <h2 className="mt-4 text-base font-extrabold text-[#0b2d54]">
                  {unreadOnly
                    ? "You're all caught up"
                    : category === "ALL"
                      ? "No notifications yet"
                      : "Nothing in this category yet"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {unreadOnly
                    ? "There are no unread notifications waiting for you."
                    : "New activity will appear here when Sympto has something to share."}
                </p>
              </div>
            )}

            {!loading && !error && visible.length > 0 && (
              <div className="divide-y divide-slate-100">
                {renderedGroups.map((group) => (
                  <div key={group}>
                    <div className="flex items-center gap-3 bg-[#f8fafc] px-5 py-2.5 sm:px-7">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                        {group}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300">
                        {grouped[group].length}
                      </span>
                    </div>

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
                            "px-5 py-5 transition sm:px-7 " +
                            (unread ? "bg-[#fbffff]" : "bg-white")
                          }
                        >
                          <div className="flex items-start gap-3.5">
                            <span
                              className={
                                "grid h-10 w-10 shrink-0 place-items-center rounded-xl " +
                                (unread
                                  ? "bg-[#24c1c4]/10 text-[#0b2d54]"
                                  : "bg-slate-100 text-slate-400")
                              }
                            >
                              {iconFor(notification)}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
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
                                    {unread && (
                                      <span className="text-[9px] font-black uppercase tracking-wide text-[#24c1c4]">
                                        New
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1.5 max-w-3xl text-xs leading-5 text-slate-500">
                                    {notification.body}
                                  </p>
                                </div>

                                <span className="hidden shrink-0 text-[10px] font-semibold text-slate-400 sm:block">
                                  {medicationReminder && notification.scheduledFor
                                    ? formatReminderTime(notification.scheduledFor)
                                    : formatDate(relevantDate(notification))}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-400">
                                {medicationReminder && notification.scheduledFor && (
                                  <span>
                                    {formatReminderDate(notification.scheduledFor)}
                                  </span>
                                )}
                                <span>{label(notification.channel)}</span>
                                {notification.readAt && (
                                  <span className="inline-flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Read
                                  </span>
                                )}
                                {notification.priority === "URGENT" && (
                                  <span className="inline-flex items-center gap-1 font-black text-red-700">
                                    <TriangleAlert className="h-3 w-3" />
                                    Urgent
                                  </span>
                                )}
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
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
