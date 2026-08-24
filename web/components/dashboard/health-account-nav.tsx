"use client";

import Link from "next/link";
import { ChevronRight, Settings, UserRound, Users } from "lucide-react";

/**
 * Account-level navigation only.
 * Health features such as Journal, Passport and Records belong in the
 * health navigation, not in the account/settings navigation.
 */
export default function HealthAccountNav() {
  return (
    <div className="fixed right-4 top-4 z-40 sm:right-6 sm:top-5">
      <div className="flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_12px_35px_rgba(11,45,84,0.12)] backdrop-blur">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#0b2d54] transition hover:bg-[#24c1c4]/10"
          title="Personal profile"
        >
          <UserRound className="h-4 w-4" />
          <span className="hidden md:inline">Profile</span>
        </Link>
        <Link
          href="/family"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#0b2d54] transition hover:bg-[#24c1c4]/10"
          title="Family accounts"
        >
          <Users className="h-4 w-4" />
          <span className="hidden md:inline">Family</span>
        </Link>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#071f3a]"
          title="Account settings"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
          <ChevronRight className="hidden h-3.5 w-3.5 sm:inline" />
        </Link>
      </div>
    </div>
  );
}
