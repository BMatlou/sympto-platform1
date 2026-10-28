"use client";

import { ReactNode, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

const subscribeToMount = () => () => undefined;
const getClientMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

export default function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, isAuthLoaded } = useAuth();
  const router = useRouter();

  // This snapshot keeps the server render stable and switches to mounted on the client.
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getClientMountedSnapshot,
    getServerMountedSnapshot,
  );

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