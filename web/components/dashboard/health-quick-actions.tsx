"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ClipboardList,
  FileHeart,
  HeartPulse,
  Pill,
  ShieldPlus,
  Target,
  Users,
} from "lucide-react";

const actions = [
  { label: "Health Goals", href: "/health-goals", icon: Target, description: "Track and manage goals" },
  { label: "Medications", href: "/medications", icon: Pill, description: "Medicines and reminders" },
  { label: "Allergies & Conditions", href: "/health-conditions", icon: HeartPulse, description: "Conditions and allergies" },
  { label: "Emergency Contacts", href: "/emergency-contacts", icon: ShieldPlus, description: "People to contact in an emergency" },
  { label: "Health Records", href: "/health-records", icon: ClipboardList, description: "Your connected health record" },
  { label: "Health Passport", href: "/health-passport", icon: FileHeart, description: "Full health profile" },
  { label: "Family", href: "/family", icon: Users, description: "Manage family members" },
  { label: "Log Symptom", href: "/log-symptom", icon: Activity, description: "Record a symptom" },
];

export default function HealthQuickActions() {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(11,45,84,0.05)] sm:p-6">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#24c1c4]">Quick access</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[#0b2d54]">Manage your health</h2>
        <p className="mt-1 text-sm text-slate-500">Jump directly to the health area you want to review or update.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(({ label, href, icon: Icon, description }) => (
          <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 transition hover:-translate-y-0.5 hover:border-[#24c1c4]/40 hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]/50">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Icon className="h-5 w-5" /></span>
              <ArrowRight className="mt-1 h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0b2d54]" />
            </div>
            <p className="mt-4 text-sm font-bold text-[#0b2d54]">{label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
