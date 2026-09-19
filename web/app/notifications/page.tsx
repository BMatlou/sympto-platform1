"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  FileText,
  MessageCircle,
  Pill,
  Settings,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import {
  patientNotificationsService,
  type PatientNotification,
} from "@/services/patient-notifications.service";

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
  const lower = String(notification.type) + " " + notification.title + " " + notification.body;
  const normalized = lower.toLowerCase();
  if (normalized.includes("medication") || normalized.includes("medicine") || normalized.includes("dose") || notification.type === "PRESCRIPTION") {
    return <Pill className="h-5 w-5" aria-hidden="true" />;
  }
  if (normalized.includes("appointment") || normalized.includes("visit") || normalized.includes("clinic") || notification.type === "APPOINTMENT") {
    return <CalendarDays className="h-5 w-5" aria-hidden="true" />;
  }
  if (notification.type === "MESSAGE") return <MessageCircle className="h-5 w-5" aria-hidden="true" />;
  if (notification.type === "LAB_RESULT" || notification.type === "IMAGING_RESULT") {
    return <FileText className="h-5 w-5" aria-hidden="true" />;
  }
  if (notification.priority === "HIGH" || notification.priority === "URGENT") {
    return <TriangleAlert className="h-5 w-5" aria-hidden="true" />;
  }
  return <Bell className="h-5 w-5" aria-hidden="true" />;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const payload = await patientNotificationsService.list({ page: 1, limit: 100 });
      const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
      setNotifications(rows as PatientNotification[]);
    } catch {
      setError("We couldn't load your notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

  const visible = useMemo(
    () => filter === "unread" ? notifications.filter((notification) => !notification.readAt) : notifications,
    [filter, notifications],
  );

  async function markRead(id: string) {
    try {
      setBusyId(id);
      setNotice("");
      await patientNotificationsService.markRead(id);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, readAt: new Date().toISOString(), status: "READ" }
            : notification,
        ),
      );
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
      setNotice("All notifications marked as read.");
    } catch {
      setNotice("We couldn't mark all notifications as read.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]">
              <ArrowLeft className="h-4 w-4" />Back to Health Home
            </Link>
            <Link href="/notifications/preferences" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#0b2d54] hover:border-[#24c1c4]">
              <Settings className="h-4 w-4" />Notification preferences
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0b2d54]">
              <Bell className="h-3.5 w-3.5" />Notifications
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#0b2d54]">Your notifications</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Keep medication reminders, appointments, care updates and other health activity in one patient-owned inbox.</p>
              </div>
              {unreadCount > 0 && (
                <button type="button" onClick={() => void markAllRead()} disabled={busyId === "all"} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                  <CheckCheck className="h-4 w-4" />{busyId === "all" ? "Updating…" : "Mark all read · " + unreadCount}
                </button>
              )}
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2">
            {(["all", "unread"] as const).map((value) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={"rounded-full px-4 py-2 text-xs font-black " + (filter === value ? "bg-[#0b2d54] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200")}>
                {value === "all" ? "All · " + notifications.length : "Unread · " + unreadCount}
              </button>
            ))}
          </div>

          {notice && <div className="mb-4 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 px-4 py-3 text-sm font-semibold text-[#0b2d54]">{notice}</div>}

          {loading && <div className="rounded-2xl border border-slate-200 bg-white p-7 text-sm text-slate-500">Loading your notification history…</div>}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-white p-7">
              <ShieldCheck className="h-6 w-6 text-red-600" />
              <h2 className="mt-4 font-semibold text-[#0b2d54]">Your notifications are temporarily unavailable</h2>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
              <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-xs font-bold text-white">Try again</button>
            </div>
          )}

          {!loading && !error && visible.length === 0 && (
            <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]"><Bell className="h-7 w-7" /></div>
              <h2 className="mt-4 font-semibold text-[#0b2d54]">{filter === "unread" ? "You're all caught up" : "No notifications yet"}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{filter === "unread" ? "There are no unread reminders or health updates waiting for you." : "New health activity and reminders will appear here as they are created."}</p>
            </div>
          )}

          {!loading && !error && visible.length > 0 && (
            <div className="space-y-3">
              {visible.map((notification) => {
                const unread = !notification.readAt;
                const fallbackUrl = notification.type === "PRESCRIPTION" ? "/medications" : notification.type === "APPOINTMENT" ? "/appointments" : null;
                return (
                  <article key={notification.id} className={"rounded-[24px] border bg-white p-5 shadow-sm transition " + (unread ? "border-[#24c1c4]/30 ring-1 ring-[#24c1c4]/10" : "border-slate-200")}>
                    <div className="flex items-start gap-4">
                      <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl " + (unread ? "bg-[#24c1c4]/10 text-[#0b2d54]" : "bg-slate-100 text-slate-500")}>
                        {iconFor(notification)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-[#0b2d54]">{notification.title}</h2>
                          {unread && <span className="rounded-full bg-[#24c1c4]/10 px-2.5 py-1 text-[10px] font-black text-[#0b2d54]">New</span>}
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{label(notification.type)}</span>
                          {notification.priority === "URGENT" && <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">Urgent</span>}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{notification.body}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span>{formatDate(notification.scheduledFor ?? notification.createdAt)}</span>
                          <span>{label(notification.channel)}</span>
                          {notification.readAt && <span>Read · {formatDate(notification.readAt)}</span>}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {(notification.actionUrl || fallbackUrl) && (
                            <Link
                              href={String(notification.actionUrl || fallbackUrl)}
                              onClick={() => { if (unread) void markRead(notification.id); }}
                              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0b2d54] px-3.5 py-2.5 text-xs font-bold text-white"
                            >
                              {String(notification.actionLabel || (notification.type === "PRESCRIPTION" ? "View medications" : notification.type === "APPOINTMENT" ? "View appointments" : "Open"))}
                            </Link>
                          )}
                          {unread && (
                            <button type="button" onClick={() => void markRead(notification.id)} disabled={busyId === notification.id} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-[#0b2d54] disabled:opacity-50">
                              <Check className="h-3.5 w-3.5" />{busyId === notification.id ? "Saving…" : "Mark as read"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <section className="mt-8 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[#0b2d54]" />
              <div>
                <h3 className="font-semibold text-[#0b2d54]">Choose how Sympto keeps you informed</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Notification preferences are separate from your clinical record. Turning a channel off does not delete your health information.</p>
                <Link href="/notifications/preferences" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-[#0b2d54] ring-1 ring-[#24c1c4]/20">
                  <Settings className="h-3.5 w-3.5" />Manage preferences
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
