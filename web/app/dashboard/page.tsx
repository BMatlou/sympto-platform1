"use client";

import HealthNavigation from "@/components/dashboard/health-navigation";
import HealthHome from "@/components/dashboard/health-home";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function DashboardContent() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || undefined;

  return (
    <>
      <HealthNavigation />
      <HealthHome patientId={patientId} />
    </>
  );
}

export default function DashboardRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5fafb]" aria-hidden="true" />}>
      <DashboardContent />
    </Suspense>
  );
}
