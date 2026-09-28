"use client";

import Link from "next/link";
import { ArrowLeft, Bell, BookHeart, ChevronRight, ShieldCheck } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";

const sections = [
  {
    title: "Preferences",
    description: "Control how Sympto communicates with you and how your Smart Health Journal uses your authorised activity.",
    items: [
      {
        href: "/notifications/preferences",
        icon: Bell,
        title: "Notifications & preferences",
        description: "Choose which notification channels Sympto can use for health and account updates.",
      },
      {
        href: "/health-journal/settings",
        icon: BookHeart,
        title: "Smart Journal settings",
        description: "Choose which authorised health activity Sympto uses for your journal timeline and summaries.",
      },
    ],
  },
];

export default function SettingsPage() {
  return <ProtectedRoute><main className="min-h-screen bg-slate-50"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6 lg:px-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to My Health</Link></div></header><div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"><div className="rounded-3xl border border-[#24c1c4]/20 bg-gradient-to-br from-[#24c1c4]/10 via-white to-white p-6 sm:p-8"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b2d54] text-white"><ShieldCheck className="h-6 w-6" /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-[#24c1c4]">Account</p><h1 className="text-3xl font-bold tracking-tight text-[#0b2d54]">Settings</h1></div></div><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">One place for your account preferences. Your clinical information stays in the health areas where it belongs, while account and app preferences live here.</p></div><div className="mt-8 space-y-8">{sections.map((section) => <section key={section.title}><div className="mb-3 px-1"><h2 className="text-lg font-bold text-[#0b2d54]">{section.title}</h2><p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">{section.description}</p></div><div className="grid gap-4 sm:grid-cols-2">{section.items.map(({ href, icon: Icon, title, description }) => <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#24c1c4]/40 hover:shadow-md"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0b2d54]"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="font-semibold text-[#0b2d54]">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{description}</p></div><ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#24c1c4]" /></div></Link>)}</div></section>)}</div><section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
  <h2 className="font-semibold text-[#0b2d54]">Your account</h2>
  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Profile, medical aid & payments, emergency contacts, privacy & consent, and other account areas are available from <span className="font-semibold text-[#0b2d54]">My Account</span> in the dashboard navigation.</p>
</section></div></main></ProtectedRoute>;
}