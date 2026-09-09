"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FlaskConical,
  FolderOpen,
  HeartPulse,
  Image as ImageIcon,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UsersRound,
  Target,
  Stethoscope,
} from "lucide-react";

const folderClass =
  "group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#24c1c4]/50 hover:shadow-md sm:p-6";

const itemClass =
  "flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left transition hover:border-[#24c1c4]/40 hover:bg-[#24c1c4]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] focus-visible:ring-offset-2";

export default function HealthRecordsPage() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");
  const withPatient = (path: string) =>
    patientId ? `${path}?patientId=${encodeURIComponent(patientId)}` : path;

  const reports = [
    {
      label: "Laboratory results",
      description: "Blood tests and other results",
      href: "/lab-results",
      icon: FlaskConical,
    },
    {
      label: "Imaging & scans",
      description: "Scans and clinical reports",
      href: "/imaging",
      icon: ImageIcon,
    },
    {
      label: "Risk assessments",
      description: "Recorded health risk checks",
      href: "/risk-assessments",
      icon: ShieldAlert,
    },
  ];

  const visits = [
    {
      label: "Care plans",
      description: "Your care goals and tasks",
      href: "/care-plans",
      icon: ClipboardCheck,
    },
    {
      label: "Referrals",
      description: "Specialist referrals and follow-up",
      href: "/referrals",
      icon: ArrowRight,
    },
    {
      label: "Appointments",
      description: "Upcoming and past clinic visits",
      href: "/appointments",
      icon: CalendarDays,
    },
    {
      label: "Clinical records",
      description: "Your connected health record",
      href: "/health-records",
      icon: Stethoscope,
    },
  ];

  const setup = [
    {
      label: "Personal profile",
      description: "Your personal information",
      href: "/profile",
      icon: UserRound,
    },
    {
      label: "Emergency contacts",
      description: "People to contact when needed",
      href: "/emergency-contacts",
      icon: UsersRound,
    },
    {
      label: "Health goals",
      description: "Your active and completed goals",
      href: "/health-goals",
      icon: Target,
    },
  ];

  const Folder = ({
    emoji,
    title,
    description,
    items,
  }: {
    emoji: string;
    title: string;
    description: string;
    items: typeof reports;
  }) => (
    <section className={folderClass} aria-labelledby={title.replaceAll(" ", "-") }>
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#24c1c4]/10 text-3xl" aria-hidden="true">
          {emoji}
        </div>
        <div>
          <h2 id={title.replaceAll(" ", "-")} className="text-xl font-bold tracking-tight text-[#0B2D54] sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map(({ label, description: itemDescription, href, icon: Icon }) => (
          <Link key={label} href={withPatient(href)} className={itemClass} aria-label={`${label}: ${itemDescription}`}>
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0B2D54] shadow-sm" aria-hidden="true">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#0B2D54]">{label}</span>
                <span className="block truncate text-xs text-slate-500">{itemDescription}</span>
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-[#24c1c4]" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-[#F7F9FC]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href={withPatient("/dashboard")}
          className="mb-7 inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#0B2D54] shadow-sm transition hover:border-[#24c1c4]/50 hover:text-[#24c1c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Back to Home
        </Link>

        <header className="mb-8">
          <div className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#24c1c4]/10 px-4 py-2 text-xs font-bold text-[#0B2D54]">
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
            My Health Records
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0B2D54] sm:text-4xl">
            My Health Documents & Records
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Your health story, organised in three simple folders. Visits, symptoms, results, prescriptions and documents stay connected to your health record.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          <Folder
            emoji="📁"
            title="My Reports & Scans"
            description="Tests, scans and health assessments"
            items={reports}
          />
          <Folder
            emoji="📁"
            title="Clinic Visits & Plans"
            description="Your care, appointments and clinical history"
            items={visits}
          />
          <Folder
            emoji="📁"
            title="My Setup & Profile"
            description="Your personal information and goals"
            items={setup}
          />
        </div>

        <div className="mt-7 flex min-h-12 items-center gap-3 rounded-2xl border border-[#24c1c4]/20 bg-white px-4 py-3 shadow-sm sm:px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#24c1c4]/10 text-[#0B2D54]" aria-hidden="true">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-[#0B2D54]">
            🔒 Safe & Connected: These papers update automatically from your clinic.
          </p>
        </div>
      </div>
    </main>
  );
}
