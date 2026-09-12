"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileHeart,
  HeartPulse,
  History,
  Menu,
  Pill,
  ShieldCheck,
  Stethoscope,
  Target,
  UserRound,
  Users,
  Watch,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: typeof HeartPulse;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: "MY HEALTH",
    items: [
      { label: "Health Home", href: "/dashboard", icon: HeartPulse },
      { label: "Health Passport", href: "/health-passport", icon: FileHeart },
      { label: "Health Timeline", href: "/health-timeline", icon: History },
      { label: "Health Journal", href: "/health-journal", icon: ClipboardList },
      { label: "Medications", href: "/medications", icon: Pill },
      { label: "Health Goals", href: "/health-goals", icon: Target },
      { label: "Appointments", href: "/appointments", icon: CalendarDays },
      { label: "Family & Sharing", href: "/family", icon: Users },
      { label: "Connected Devices", href: "/wearables", icon: Watch },
    ],
  },
  {
    title: "MY CARE",
    items: [
      { label: "Symptoms & Episodes", href: "/clinical-episodes", icon: Activity },
      { label: "Visits & Encounters", href: "/encounters", icon: Stethoscope },
      { label: "Vitals & Measurements", href: "/vitals", icon: HeartPulse },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "Privacy & Consent", href: "/settings/privacy", icon: ShieldCheck },
      { label: "Personal Profile", href: "/profile", icon: UserRound },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export default function HealthAccountNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <div className="fixed left-4 top-4 z-50 sm:left-6 sm:top-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open My Health navigation"
          aria-expanded={open}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/95 text-[#0b2d54] shadow-[0_12px_35px_rgba(11,45,84,0.12)] backdrop-blur transition hover:border-[#24c1c4]/40 hover:bg-[#24c1c4]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]/60"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div
        className={`fixed inset-0 z-[60] transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-[#071f3a]/45 backdrop-blur-[2px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />

        <aside
          aria-label="My Health navigation"
          className={`absolute left-0 top-0 flex h-full w-[min(88vw,380px)] flex-col bg-white shadow-[20px_0_60px_rgba(11,45,84,0.18)] transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0b2d54]">My Health</p>
                <p className="text-xs text-slate-400">Your health & care</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close My Health navigation"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#0b2d54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]/60"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Health areas">
            {sections.map((section, sectionIndex) => (
              <div key={section.title} className={sectionIndex > 0 ? "mt-7" : ""}>
                <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.18em] text-slate-400">{section.title}</p>
                <div className="space-y-1">
                  {section.items.map(({ label, href, icon: Icon }) => {
                    const active = isActive(pathname, href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]/60 ${
                          active
                            ? "bg-[#24c1c4]/10 text-[#0b2d54]"
                            : "text-slate-600 hover:bg-slate-50 hover:text-[#0b2d54]"
                        }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-white text-[#0b2d54] shadow-sm" : "bg-slate-50 text-slate-500 group-hover:text-[#0b2d54]"}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1">{label}</span>
                        <ChevronRight className={`h-4 w-4 transition-transform ${active ? "text-[#24c1c4]" : "text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500"}`} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-100 px-5 py-4">
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center justify-between rounded-2xl bg-[#0b2d54] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#071f3a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]/60">
              <span>Account settings</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
