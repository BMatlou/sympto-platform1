"use client";

import Link from "next/link";
import {
  Activity,
  Bell,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileHeart,
  FileText,
  HeartPulse,
  House,
  Menu,
  MessageCircle,
  Pill,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Watch,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/health-records", label: "Health Records", icon: FileText },
  { href: "/health-vitals", label: "Vitals & Measurements", icon: Activity },
  { href: "/medications", label: "Medications", icon: Pill },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
] as const;

const MORE_NAV = [
  { href: "/today", label: "Today", icon: ShieldCheck },
  { href: "/health-passport", label: "Clinic Card", icon: FileHeart },
  { href: "/health-journal", label: "Health Journal", icon: FileText },
  { href: "/health-goals", label: "Health Goals", icon: HeartPulse },
  { href: "/log-symptom", label: "Log a symptom", icon: HeartPulse },
  { href: "/care-plans", label: "Care Plans", icon: ClipboardList },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/wearables", label: "Connected devices", icon: Watch },
  { href: "/family", label: "Family", icon: Users },
  { href: "/health-finance", label: "Medical aid & payments", icon: CreditCard },
  { href: "/emergency-contacts", label: "Emergency contacts", icon: ShieldCheck },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export default function HealthNavigation() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="fixed inset-x-2 top-2 z-50 flex h-14 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_12px_35px_rgba(11,45,84,0.12)] backdrop-blur lg:inset-y-4 lg:left-4 lg:right-auto lg:h-auto lg:w-[64px] lg:flex-col lg:rounded-[26px] lg:p-2">
      <Link
        href="/dashboard"
        aria-label="Sympto home"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0B2D54] text-white shadow-[0_8px_20px_rgba(11,45,84,0.15)]"
      >
        <HeartPulse className="h-4.5 w-4.5" aria-hidden="true" />
      </Link>

      <nav className="flex min-w-0 flex-1 items-center justify-center gap-1 lg:min-h-0 lg:flex-col lg:gap-2" aria-label="Primary health navigation">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className="group relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-slate-400 transition hover:bg-slate-50 hover:text-[#0B2D54] lg:h-11 lg:w-11"
          >
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-[#0B2D54] px-3 py-2 text-[10px] font-black text-white shadow-[0_12px_28px_rgba(11,45,84,0.22)] lg:block lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
              {label}
            </span>
          </Link>
        ))}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={open ? "Close more navigation" : "More navigation"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-slate-400 transition hover:bg-slate-50 hover:text-[#0B2D54] lg:h-11 lg:w-11"
        >
          {open ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
        </button>
      </nav>

      {open && (
        <div
          role="menu"
          aria-label="More health navigation"
          className="absolute right-0 top-16 max-h-[calc(100vh-5rem)] w-[min(20rem,calc(100vw-1rem))] overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(11,45,84,0.18)] lg:left-[76px] lg:right-auto lg:top-0"
        >
          <div className="px-3 pb-2 pt-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Your health</p>
            <p className="mt-1 text-sm font-bold text-[#0B2D54]">More of your health tools</p>
          </div>
          <div className="border-t border-slate-100 px-1 py-2">
            <div className="space-y-0.5">
              {MORE_NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-[#0B2D54] transition hover:bg-[#24C1C4]/10"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0B2D54]/[0.06]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
