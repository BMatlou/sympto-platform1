"use client";

import { useEffect } from "react";
import { syncExistingPushSubscription } from "@/services/push-notifications.service";

const SYNC_INTERVAL_MS = 10_000;

export default function PushNotificationBridge() {
  useEffect(() => {
    let active = true;

    const sync = async () => {
      if (!active) return;
      await syncExistingPushSubscription();
    };

    void sync();
    const timer = window.setInterval(() => void sync(), SYNC_INTERVAL_MS);

    const syncOnFocus = () => void sync();
    const syncOnVisibility = () => {
      if (document.visibilityState === "visible") void sync();
    };

    window.addEventListener("focus", syncOnFocus);
    document.addEventListener("visibilitychange", syncOnVisibility);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", syncOnFocus);
      document.removeEventListener("visibilitychange", syncOnVisibility);
    };
  }, []);

  return null;
}
