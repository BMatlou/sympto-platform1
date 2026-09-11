"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/protected-route";

export default function ImmunizationsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/health-passport");
  }, [router]);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb]" aria-busy="true">
        <div className="mx-auto max-w-xl px-4 py-12 text-center text-sm text-slate-500">
          Opening your immunisation record…
        </div>
      </main>
    </ProtectedRoute>
  );
}
