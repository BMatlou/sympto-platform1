"use client";

import Link from "next/link";
import { FileKey2, Menu, Settings, UserRound, Users, X } from "lucide-react";
import { useState } from "react";

/**
 * Keeps account and sharing tools available without adding health-feature
 * choices to the main Health Home. Health navigation remains handled by the
 * three primary actions on the dashboard.
 */
export default function HealthAccountNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/95 text-[#0b2d54] shadow-[0_12px_35px_rgba(11,45,84,0.12)] backdrop-blur transition hover:border-[#24c1c4]/40 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]/60"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(11,45,84,0.16)]">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Account</p>
          <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10"><UserRound className="h-4 w-4" />Profile</Link>
          <Link href="/family" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10"><Users className="h-4 w-4" />Family</Link>
          <Link href="/smart-file" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10"><FileKey2 className="h-4 w-4" />Share Smart File</Link>
          <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10"><Settings className="h-4 w-4" />Settings</Link>
        </div>
      )}
    </div>
  );
}
