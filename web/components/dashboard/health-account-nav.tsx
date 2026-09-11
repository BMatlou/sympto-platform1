"use client";

import Link from "next/link";
import { CalendarDays, FileHeart, HeartPulse, Menu, MessageCircle, QrCode, Settings, ShieldCheck, UserRound, Users, X } from "lucide-react";
import { useState } from "react";

/**
 * Patient navigation. Core patient journeys live here so the Health Home
 * can remain intentionally limited to its three primary action cards.
 */
export default function HealthAccountNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 sm:right-6 sm:top-5">
      <Link href="/smart-file" aria-label="Share Smart File" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#0b2d54] px-4 py-3 text-xs font-black text-white shadow-[0_12px_35px_rgba(11,45,84,0.22)] ring-1 ring-white/60 transition hover:-translate-y-0.5 hover:bg-[#071f3a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]">
        <QrCode className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">Share Smart File</span><span className="sm:hidden">Share</span>
      </Link>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/95 text-[#0b2d54] shadow-[0_12px_35px_rgba(11,45,84,0.12)] backdrop-blur transition hover:border-[#24c1c4]/40 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]/60">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <div className="absolute right-0 top-14 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(11,45,84,0.16)]">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">My Care</p>
          <Link href="/appointments" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10"><CalendarDays className="h-4 w-4" /> Appointments</Link>
          <Link href="/care-plans" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10"><HeartPulse className="h-4 w-4" /> Care Plans</Link>
          <Link href="/health-goals" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10"><HeartPulse className="h-4 w-4" /> Health Goals</Link>
          <Link href="/notifications" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10"><ShieldCheck className="h-4 w-4" /> Notifications</Link>
          <div className="my-2 border-t border-slate-100" />
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">My Health</p>
          <Link href="/health-passport" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10"><FileHeart className="h-4 w-4" /> Health Passport</Link>
          <Link href="/health-records" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10"><FileHeart className="h-4 w-4" /> Health Records</Link>
          <Link href="/messages" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10"><MessageCircle className="h-4 w-4" /> Messages</Link>
          <div className="my-2 border-t border-slate-100" />
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Account</p>
          <Link href="/profile" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10"><UserRound className="h-4 w-4" /> Profile</Link>
          <Link href="/family" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10"><Users className="h-4 w-4" /> Family</Link>
          <Link href="/settings" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#0b2d54] hover:bg-slate-50"><Settings className="h-4 w-4" /> Settings</Link>
        </div>
      )}
    </div>
  );
}
