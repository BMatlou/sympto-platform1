"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  healthHomeService,
  type HealthHomeResponse,
} from "@/services/health-home.service";

const REFRESH_INTERVAL_MS = 15_000;

function getSelectedPatientId() {
  if (typeof window === "undefined") return undefined;
  const value = new URLSearchParams(window.location.search).get("patientId");
  return value || undefined;
}

export function useDashboard() {
  const [data, setData] = useState<HealthHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const firstLoad = useRef(true);

  const loadDashboard = useCallback(async () => {
    try {
      if (firstLoad.current) setLoading(true);
      setError(null);

      const result = await healthHomeService.getHealthHome(getSelectedPatientId());
      setData(result);
      firstLoad.current = false;
    } catch (requestError) {
      console.error("Failed to load Health Home:", requestError);
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();

    const handleNavigation = () => void loadDashboard();
    window.addEventListener("popstate", handleNavigation);

    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadDashboard();
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      window.clearInterval(refresh);
    };
  }, [loadDashboard]);

  return {
    data,
    loading,
    error,
    reload: loadDashboard,
  };
}
