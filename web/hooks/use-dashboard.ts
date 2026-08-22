"use client";

import { useCallback, useEffect, useState } from "react";
import { onboardingService } from "@/services/onboarding.service";

export function useDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const result =
        await onboardingService.getDashboardData();

      setData(result.data);
    } catch (error) {
      console.error(
        "Failed to load dashboard data:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    data,
    loading,
    reload: loadDashboard,
  };
}