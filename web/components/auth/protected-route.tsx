"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, isAuthLoaded } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  // Wait until the component has mounted in the browser.
  // This prevents server/client hydration mismatches.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect unauthenticated users after auth state has loaded.
  useEffect(() => {
    if (!mounted || !isAuthLoaded) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/auth/sign-in");
    }
  }, [mounted, isAuthenticated, isAuthLoaded, router]);

  // Server render and first client render must match.
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  // Wait for authentication state to load.
  if (!isAuthLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  // User isn't authenticated.
  // The useEffect above will redirect them.
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated user can access the protected page.
  return <>{children}</>;
}