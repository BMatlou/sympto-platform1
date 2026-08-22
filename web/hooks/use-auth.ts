"use client";

import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";

export function useAuth() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken")
      : null;

  const query = useQuery({
    queryKey: ["auth-user"],
    queryFn: authService.me,
    enabled: !!token,
    retry: false,
  });

  return {
    ...query,
    user: query.data,
    isAuthenticated: !!query.data,
    isAuthLoaded: !query.isLoading,
  };
}