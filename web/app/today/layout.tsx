"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import DailyHealthCheckIn from "@/components/dashboard/daily-health-check-in";

export default function TodayLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      {children}
      {pathname === "/today" && (
        <div className="mx-auto max-w-4xl px-4 pb-10 sm:px-6">
          <div className="mb-4 mt-8 px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#71839a]">Your daily rhythm</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[#0b2d54]">Check in with yourself</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#71839a]">Mood, stress, sleep, movement and hydration — captured in one place and added to your health story.</p>
          </div>
          <DailyHealthCheckIn />
        </div>
      )}
    </>
  );
}
