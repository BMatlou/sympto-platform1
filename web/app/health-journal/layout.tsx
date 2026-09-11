"use client";

import { usePathname } from "next/navigation";
import TodaysHealthSignals from "@/components/dashboard/todays-health-signals";

export default function HealthJournalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSignals = pathname === "/health-journal";

  return (
    <>
      {showSignals && <TodaysHealthSignals />}
      {children}
    </>
  );
}
