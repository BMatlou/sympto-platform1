"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import TodaysHealthSignals from "@/components/dashboard/todays-health-signals";

export default function HealthJournalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showSignals = pathname === "/health-journal";

  return (
    <>
      {showSignals && <TodaysHealthSignals />}
      {children}
    </>
  );
}
