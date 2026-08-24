"use client";

import Link from "next/link";
import { ArrowLeft, Bell, BookHeart, ChevronRight, ShieldCheck, UserRound, Users } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";

const items = [
  { href: "/profile", icon: UserRound, title: "Personal profile", description: "Manage your personal details and health profile." },
  { href: "/notifications", icon: Bell, title: "Notifications", description: "Review reminders and notification activity." },
  { href: "/health-journal/settings", icon: BookHeart, title: "Smart Journal", description: "Choose what Sympto tracks and when you receive journal reminders." },
  { href: "/family", icon: Users, title: "Family & dependants", description: "Manage people whose health information you are authorised to manage." },
];

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6 lg:px-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to My Health</Link>
          </div>
        </header>
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#24c1c4]/20 bg-gradient-to-br from-[#24c1c4]/10 via-white to-white p-6 sm:p-8">
            <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b2d54] text-white"><ShieldCheck className="h-6 w-6" /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-[#24c1c4]">Account</p><h1 className="text-3xl font-bold tracking-tight text-[#0b2d54]">Settings</h1></div></div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Manage how Sympto works for you. Your health information remains connected to the same patient record across these settings.</p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {items.map(({ href, icon: Icon, title, description }) => (
              <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#24c1c4]/40 hover:shadow-md">
                <div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold text-[#0b2d54]">{title}</h2><p className="mt-1 text-sm leading-5 text-slate-500">{description}</p></div><ChevronRight className="mt-1 h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#24c1c4]" /></div>
              </Link>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-[#0b2d54]">Your health record</h2><p className="mt-1 text-sm text-slate-500">Clinical records, goals, medications, appointments and journal activity are managed in their dedicated areas so settings stay focused on your account preferences.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/health-records" className="rounded-xl bg-[#0b2d54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#071f3a]">Open Health Records</Link><Link href="/health-passport" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0b2d54] hover:bg-slate-50">Health Passport</Link></div></div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
