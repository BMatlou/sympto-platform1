"use client";

import Link from "next/link";
import { Activity, ArrowLeft, CalendarDays, ChevronRight, ClipboardList, FileHeart, HeartPulse, Pill, ShieldCheck, Sparkles, Stethoscope, Target, Users, Watch } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";

const sections = [
  { href: "/health-passport", label: "Health Passport", description: "Your core health identity, conditions, allergies, immunisations and emergency information.", icon: FileHeart },
  { href: "/health-records", label: "Health Records", description: "Your longitudinal medical record and supporting clinical information.", icon: ClipboardList },
  { href: "/health-timeline", label: "Health Timeline", description: "Episodes, encounters, notes and care history in chronological context.", icon: Activity },
  { href: "/clinical-episodes", label: "Clinical Episodes", description: "Health events that connect symptoms, diagnoses, notes and treatment.", icon: HeartPulse },
  { href: "/encounters", label: "Encounters", description: "Consultations and clinical interactions recorded during your care.", icon: Stethoscope },
  { href: "/medications", label: "Medications", description: "Current medicines, instructions, adherence and reminders.", icon: Pill },
  { href: "/appointments", label: "Appointments", description: "Upcoming and previous appointments with your care team.", icon: CalendarDays },
  { href: "/health-goals", label: "Health Goals", description: "Set, track and improve the goals that matter to you.", icon: Target },
  { href: "/health-journal", label: "Smart Journal", description: "Symptoms, daily signals, reflections and AI-supported health insights.", icon: Sparkles },
  { href: "/family", label: "Family Health", description: "Manage authorised family relationships and supported health journeys.", icon: Users },
  { href: "/wearables", label: "Connected Health", description: "Your connected devices, measurements and synchronisation history.", icon: Watch },
  { href: "/settings/privacy", label: "Privacy & Sharing", description: "Control how your health information is shared and who can access it.", icon: ShieldCheck },
];

export default function MyHealthPage() {
  return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] text-slate-800"><header className="border-b border-slate-200/80 bg-white"><div className="mx-auto flex min-h-[68px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8"><Link href="/dashboard" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#24c1c4]">Sympto</p><h1 className="text-lg font-bold text-[#0b2d54]">My Health</h1></div></div></header><div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8"><section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0b2d54] via-[#103e69] to-[#24c1c4] p-8 text-white shadow-[0_20px_50px_rgba(11,45,84,.16)] sm:p-10"><div className="relative max-w-3xl"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-white/70">Your health, your journey</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Everything that belongs to your health journey.</h2><p className="mt-4 text-sm leading-6 text-white/75 sm:text-base">A single place to understand your health, manage your care, follow your progress and decide what you share.</p></div></section><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sections.map(({ href, label, description, icon: Icon }) => <Link key={href} href={href} className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(11,45,84,.04)] transition hover:-translate-y-1 hover:border-[#24c1c4]/40 hover:shadow-[0_16px_40px_rgba(11,45,84,.08)]"><div className="flex items-start justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]"><Icon className="h-5 w-5" /></span><ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#24c1c4]" /></div><h3 className="mt-5 font-bold text-[#0b2d54]">{label}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></Link>)}</div></div></main></ProtectedRoute>;
}
