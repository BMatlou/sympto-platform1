"use client";

import { useEffect } from "react";
import { syncExistingPushSubscription } from "@/services/push-notifications.service";

export default function PushNotificationBridge() {
  useEffect(() => {
    void syncExistingPushSubscription();
  }, []);

  return null;
}
