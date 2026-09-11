"use client";

import Link from "next/link";
import { Activity, CalendarDays, FileHeart, FileText, HeartPulse, Menu, MessageCircle, Pill, QrCode, Settings, ShieldCheck, UserRound, Users, Watch, X, CreditCard, ClipboardList } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NavItem = readonly [string, string, React.ComponentType<{ className?: string }>];
type NavGroup = readonly [string, readonly NavItem[]];

const groups: readonly NavGroup[] = [
  [
    "Today & care",
    [
      ["/today", "Today", ShieldCheck],
      ["/appointments", "Appointments", CalendarDays],
      ["/medications", "Medications", Pill],
      ["/care-plans", "Care Plans", ClipboardList],
      ["/health-goals", "Health Goals", HeartPulse],
      ["/log-symptom", "Log a symptom", HeartPulse],
    ],
  ],
  [
    "My health",
    [
      ["/health-passport", "Clinic Card", FileHeart],
      ["/health-vitals", "Measurements", Activity],
      ["/health-journal", "Health Journal", FileText],
      ["/health-records", "Health Records", FileText],
      ["/messages", "Messages", MessageCircle],
      ["/wearables", "Connected devices", Watch],
      ["/family", "Family", Users],
    ],
  ],
  [
    "My cover & account",
    [
      ["/health-finance", "Medical aid & payments", CreditCard],
      ["/emergency-contacts", "Emergency contacts", ShieldCheck],
      ["/profile", "Profile", UserRound],
      ["/settings", "Settings", Settings],
    ],
  ],
];

export default function HealthAccountNav() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="fixed right-4 top-4 z-50 flex items-center gap-2 sm:right-6 sm:top-5">
      <Link
        href="/smart-file"
        aria-label="Share Smart File"
        className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#0b2d54] px-4 py-3 text-xs font-black text-white shadow-[0_12px_35px_rgba(11,45,84,0.22)] ring-1 ring-white/60 transition hover:-translate-y-0.5 hover:bg-[#071f3a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"
      >
        <QrCode className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">Share Smart File</span>
        <span className="sm:hidden">Share</span>
      </Link>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close patient menu" : "Open patient menu"}
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/95 text-[#0b2d54] shadow-[0_12px_35px_rgba(11,45,84,0.12)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]/60"
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </button>

      {open && (
        <div role="menu" aria-label="Patient navigation" className="absolute right-0 top-14 max-h-[calc(100vh-5.5rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(11,45,84,0.18)] ring-1 ring-white">
          <div className="px-3 pb-2 pt-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Your health</p>
            <p className="mt-1 text-sm font-bold text-[#0b2d54]">Everything you need, organised around your health</p>
          </div>

          {groups.map(([title, items]) => (
            <div key={title} className="border-t border-slate-100 px-1 py-2">
              <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{title}</p>
              <div className="space-y-0.5">
                {items.map(([href, label, Icon]) => (
                  <Link key={href} href={href} role="menuitem" onClick={close} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-[#0b2d54] transition hover:bg-[#24c1c4]/10 focus:bg-[#24c1c4]/10 focus:outline-none">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0b2d54]/[0.06] text-[#0b2d54]"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t border-slate-100 px-3 py-3">
            <Link href="/smart-file" onClick={close} className="flex min-h-12 items-center gap-3 rounded-2xl bg-[#24c1c4]/10 px-3 py-3 text-sm font-black text-[#0b2d54] hover:bg-[#24c1c4]/15">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white"><QrCode className="h-4 w-4" aria-hidden="true" /></span>
              Share my Smart File
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
