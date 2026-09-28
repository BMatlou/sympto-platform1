import { Suspense } from "react";
import HealthPassportPremium from "@/components/patient/health-passport-premium";

export default function HealthPassportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5fafb] px-4 py-8 text-sm text-[#74859a]">
          Loading your Health Passport…
        </div>
      }
    >
      <HealthPassportPremium />
    </Suspense>
  );
}
