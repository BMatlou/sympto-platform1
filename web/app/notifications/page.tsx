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
      <main className="min-h-screen bg-[#f5f8fb] pb-10 text-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Health Home
            </Link>

            <Link
              href="/notifications/preferences"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-xs font-bold text-[#0b2d54] hover:text-[#24c1c4]"
            >
              <Settings className="h-4 w-4" />
              Preferences
            </Link>
          </div>

          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Notifications
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#0b2d54] sm:text-4xl">
              Notifications
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
              Your reminders, care updates and important health messages.
            </p>
          </div>

          <section className="overflow-hidden rounded-[30px] bg-[#0b2d54] shadow-[0_18px_45px_rgba(11,45,84,0.14)]">
            <div className="p-5 sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#24c1c4]">
                    {range === "DAY"
                      ? "Today"
                      : range === "WEEK"
                        ? "This week"
                        : "This month"}
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    {categoryLabel(category)}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-white/55">
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

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">
                    Unread
                  </span>
                  <span className="grid h-10 min-w-10 place-items-center rounded-2xl bg-[#24c1c4] px-3 text-sm font-extrabold text-[#0b2d54]">
                    {unreadCount}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex max-w-md rounded-2xl bg-white/[0.08] p-1 ring-1 ring-white/10">
                {(["DAY", "WEEK", "MONTH"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRange(value)}
                    aria-pressed={range === value}
                    className={
                      "flex min-h-10 flex-1 items-center justify-center rounded-xl text-xs font-black transition " +
                      (range === value
                        ? "bg-white text-[#0b2d54] shadow-sm"
                        : "text-white/55 hover:bg-white/[0.06] hover:text-white")
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
            </div>
          </section><section className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Categories
                </p>
                <p className="mt-1 text-sm font-bold text-[#0b2d54]">
                  Available notifications
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUnreadOnly((current) => !current)}
                  aria-pressed={unreadOnly}
                  className={
                    "inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold transition " +
                    (unreadOnly
                      ? "bg-[#0b2d54] text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-[#24c1c4]/40 hover:text-[#0b2d54]")
                  }
                >
                  <span className={"h-2 w-2 rounded-full " + (unreadOnly ? "bg-[#24c1c4]" : "bg-slate-400")} />
                  Unread only
                </button>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    disabled={busyId === "all"}
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#123f70] disabled:opacity-50"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    {busyId === "all" ? "Updating…" : "Mark all read"}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
              <button
                type="button"
                onClick={() => setCategory("ALL")}
                className={
                  "flex min-h-11 items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition " +
                  (category === "ALL"
                    ? "border-[#0b2d54] bg-[#0b2d54] text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#24c1c4]/40 hover:bg-[#24c1c4]/5")
                }
              >
                <span className={"grid h-8 w-8 shrink-0 place-items-center rounded-lg " + (category === "ALL" ? "bg-white/10 text-[#24c1c4]" : "bg-[#f4fbfb] text-[#0b2d54]")}>
                  <Bell className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-black">All</span>
                  <span className={"mt-0.5 block text-[9px] font-semibold " + (category === "ALL" ? "text-white/60" : "text-slate-400")}>
                    {counts.ALL.total} total
                  </span>
                </span>
              </button>

              {visibleCategoryTabs.map((tab) => {
                const Icon = tab.icon;
                const active = category === tab.key;
                const count = counts[tab.key];

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setCategory(tab.key)}
                    className={
                      "flex min-h-11 items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition " +
                      (active
                        ? "border-[#0b2d54] bg-[#0b2d54] text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-[#24c1c4]/40 hover:bg-[#24c1c4]/5")
                    }
                  >
                    <span className={"grid h-8 w-8 shrink-0 place-items-center rounded-lg " + (active ? "bg-white/10 text-[#24c1c4]" : "bg-[#f4fbfb] text-[#0b2d54]")}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10px] font-black">{tab.label}</span>
                      <span className={"mt-0.5 block text-[9px] font-semibold " + (active ? "text-white/60" : "text-slate-400")}>
                        {count.unread > 0 ? count.unread + " new" : count.total + " total"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {notice && (
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 px-4 py-3 text-sm font-semibold text-[#0b2d54]">
              <Check className="h-4 w-4 text-[#24c1c4]" />
              {notice}
            </div>
          )}

          {loading && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-[26px] bg-white ring-1 ring-slate-200"
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <section className="mt-5 rounded-[26px] border border-red-200 bg-white p-7 shadow-sm">
              <TriangleAlert className="h-6 w-6 text-red-600" />
              <h2 className="mt-4 font-bold text-[#0b2d54]">
                Your notifications are temporarily unavailable
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-5 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-bold text-white"
              >
                Try again
              </button>
            </section>
          )}

          {!loading && !error && visible.length === 0 && (
            <section className="mt-5 rounded-[26px] border border-slate-200/80 bg-white p-10 text-center shadow-[0_10px_35px_rgba(11,45,84,0.06)]">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]">
                {iconFor(
                  notifications.find((item) => getCategory(item) === category) ??
                    ({
                      id: "empty",
                      type: category === "MEDICATIONS" ? "PRESCRIPTION" : "SYSTEM",
                      title: "",
                      body: "",
                      channel: "IN_APP",
                      status: "READ",
                      priority: "NORMAL",
                      createdAt: new Date().toISOString(),
                    } as PatientNotification),
                )}
              </div>
              <h2 className="mt-4 text-lg font-black text-[#0b2d54]">
                {unreadOnly
                  ? "You're all caught up"
                  : category === "ALL"
                    ? "No notifications yet"
                    : "Nothing in this category yet"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {unreadOnly
                  ? "There are no unread notifications waiting for you."
                  : "New activity for this category will appear here when Sympto has something to share."}
              </p>
            </section>
          )}

          {!loading && !error && visible.length > 0 && (
            <div className="mt-5 space-y-7">
              {renderedGroups.map((group) => (
                <section key={group}>
                  <div className="mb-3 flex items-center gap-3">
                    <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      {group}
                    </h2>
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                      {grouped[group].length}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
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
                            "rounded-[26px] border bg-white p-5 shadow-[0_10px_35px_rgba(11,45,84,0.06)] transition " +
                            (unread
                              ? "border-[#24c1c4]/35 bg-[#fbffff] ring-1 ring-[#24c1c4]/10"
                              : "border-slate-200/80")
                          }
                        >
                          <div className="flex items-start gap-3.5">
                            <span
                              className={
                                "grid h-11 w-11 shrink-0 place-items-center rounded-2xl " +
                                iconClasses(notification, unread)
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
                                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#24c1c4]/10 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#0b2d54]">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#24c1c4]" />
                                        New
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={
                                    "hidden shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold sm:inline-flex " +
                                    (unread
                                      ? "bg-[#24c1c4]/10 text-[#0b2d54]"
                                      : "bg-slate-100 text-slate-500")
                                  }
                                >
                                  {label(notification.type)}
                                </span>
                              </div>

                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                {notification.body}
                              </p>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {medicationReminder &&
                                notification.scheduledFor ? (
                                  <>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#24c1c4]/8 px-2.5 py-1.5 text-[10px] font-bold text-[#0b2d54]">
                                      <Clock className="h-3.5 w-3.5 text-[#24c1c4]" />
                                      {formatReminderTime(
                                        notification.scheduledFor,
                                      )}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1.5 text-[9px] font-semibold text-slate-500">
                                      {formatReminderDate(
                                        notification.scheduledFor,
                                      )}
                                    </span>
                                  </>
                                ) : (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1.5 text-[9px] font-semibold text-slate-500">
                                    {formatDate(relevantDate(notification))}
                                  </span>
                                )}

                                <span className="rounded-full bg-slate-100 px-2.5 py-1.5 text-[9px] font-semibold text-slate-500">
                                  {label(notification.channel)}
                                </span>

                                {notification.readAt && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1.5 text-[9px] font-semibold text-slate-500">
                                    <Check className="h-3 w-3" />
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
                                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-3.5 py-2 text-[11px] font-bold text-white transition hover:bg-[#123f70]"
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
                                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-bold text-[#0b2d54] transition hover:border-[#24c1c4]/30 hover:bg-[#24c1c4]/5 disabled:opacity-50"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    {busyId === notification.id
                                      ? "Saving…"
                                      : "Mark as read"}
                                  </button>
                                )}
                              </div>

                              {notification.priority === "URGENT" && (
                                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1.5 text-[10px] font-black text-red-700">
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

          <section className="mt-7 rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0b2d54] text-white">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#0b2d54]">
                  Choose how Sympto keeps you informed
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Your notification preferences control which in-app categories
                  are available here. Turning a channel off does not delete
                  your health information.
                </p>
                <Link
                  href="/notifications/preferences"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54] hover:text-[#24c1c4]"
                >
                  Manage preferences
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
