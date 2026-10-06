"use client";

import { useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { patientNotificationsService, type PatientNotification } from "@/services/patient-notifications.service";

const POLL_INTERVAL_MS = 15_000;
const RECENT_DELIVERY_WINDOW_MS = 60_000;
const STORAGE_KEY = "sympto:shown-medication-reminders";

function isMedicationReminder(notification: PatientNotification) {
  const title = String(notification.title ?? "").toLowerCase();
  return notification.type === "REMINDER" && title.startsWith("medication reminder:");
}

function readShownIds() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set<string>(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function writeShownIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids).slice(-100)));
  } catch {
    // The inbox remains the source of truth if browser storage is unavailable.
  }
}

export default function MedicationReminderNotifier() {
  const shownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    shownIds.current = readShownIds();
    let active = true;

    const check = async () => {
      try {
        const payload = await patientNotificationsService.list({ page: 1, limit: 100 });
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        if (!active) return;

        const now = Date.now();
        let changed = false;

        for (const raw of rows as PatientNotification[]) {
          if (!isMedicationReminder(raw) || !raw.sentAt || shownIds.current.has(raw.id)) continue;

          const sentAt = new Date(String(raw.sentAt)).getTime();
          if (!Number.isFinite(sentAt)) continue;

          const age = now - sentAt;

          if (age >= 0 && age <= RECENT_DELIVERY_WINDOW_MS) {
            shownIds.current.add(raw.id);
            changed = true;

            toast(raw.title, {
              description: raw.body,
              duration: 10_000,
              style: {
                background: "#16A34A",
                border: "1px solid #16A34A",
                color: "#FFFFFF",
                boxShadow: "0 10px 30px rgba(22, 163, 74, 0.24)",
              },
              classNames: {
                toast: "text-white",
                title: "font-bold text-white",
                description: "text-white/90",
                icon: "text-white",
                actionButton: "bg-[#0b2d54] text-white hover:bg-[#0b2d54]/90",
                closeButton:
                  "border-white/30 bg-white/10 text-white hover:bg-white/20",
              },
              icon: <Bell className="h-4 w-4 text-white" />,
              action: {
                label: "View medication",
                onClick: () => window.location.assign(String(raw.actionUrl || "/medications")),
              },
            });
          } else if (age > RECENT_DELIVERY_WINDOW_MS) {
            shownIds.current.add(raw.id);
            changed = true;
          }
        }

        if (changed) writeShownIds(shownIds.current);
      } catch {
        // Authentication/network failures are intentionally silent.
      }
    };

    void check();
    const timer = window.setInterval(() => void check(), POLL_INTERVAL_MS);

    const refreshOnFocus = () => void check();
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") void check();
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, []);

  return null;
}
