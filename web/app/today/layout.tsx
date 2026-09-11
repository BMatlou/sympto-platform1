"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ClipboardCheck } from "lucide-react";

export default function TodayLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onCheckInPage = pathname === "/today/check-in";

  return (
    <>
      {children}
      {!onCheckInPage && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 px-4 sm:px-6">
          <div className="pointer-events-auto mx-auto max-w-4xl">
            <Link
              href="/today/check-in"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-[#d7e9eb] bg-white/95 px-4 py-3 shadow-[0_14px_40px_rgba(11,45,84,0.14)] backdrop-blur sm:px-5"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f9fa] text-[#0b7b80]">
                  <ClipboardCheck className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-black text-[#0b2d54]">Daily health check-in</span>
                  <span className="mt-0.5 block truncate text-[10px] text-[#71839a]">Mood, stress, sleep, exercise and water — a few quick taps.</span>
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0b2d54] px-3 py-2 text-[10px] font-black text-white transition group-hover:bg-[#123d66]">
                Check in
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
