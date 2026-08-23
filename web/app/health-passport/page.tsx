"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Droplets, HeartPulse, ShieldCheck, Syringe, UserRound } from "lucide-react";
import { healthPassportService, type HealthPassportDashboardData } from "@/services/health-passport.service";

function formatEnum(value: unknown) {
  if (!value) return "Not recorded";
  return String(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function activeRecord(record: Record<string, any>) {
  return record?.status !== "INACTIVE" && record?.status !== "RESOLVED" && !record?.resolvedAt;
}

function InfoCard({ label, value, description, href }: { label: string; value: string; description: string; href?: string }) {
  const content = (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${href ? "transition hover:border-[#24c1c4] hover:shadow-sm" : ""}`}>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-[#0b2d54]">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {href && <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0b2d54]">Manage <ArrowRight className="h-3 w-3" /></span>}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function HealthPassportPage() {
  const [data, setData] = useState<HealthPassportDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setData(await healthPassportService.getHealthPassport());
    } catch (requestError) {
      console.error("Failed to load Health Passport:", requestError);
      setError("We couldn't load your health passport.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const profile = data?.profile as Record<string, any> | null | undefined;
  const patient = data?.patient as Record<string, any> | null | undefined;
  const healthPassport = data?.healthPassport as Record<string, any> | null | undefined;
  const allergies = data?.allergies ?? [];
  const conditions = data?.conditions ?? [];
  const immunizations = data?.immunizations ?? [];
  const emergencyContacts = data?.emergencyContacts ?? [];
  const activeAllergies = allergies.filter(activeRecord);
  const activeConditions = conditions.filter(activeRecord);
  const firstName = profile?.preferredName || profile?.firstName || patient?.firstName || "Patient";
  const fullName = [firstName, profile?.lastName || patient?.lastName].filter(Boolean).join(" ") || "Patient";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#0b2d54] hover:text-[#24c1c4]">
          <ArrowLeft className="h-4 w-4" />Back to Health Home
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0b2d54]"><ShieldCheck className="h-3.5 w-3.5" />My health</div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0b2d54] sm:text-4xl">Health passport</h1>
            <p className="mt-2 max-w-2xl text-slate-500">Your essential health information in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/health-goals" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0b2d54] hover:border-[#24c1c4]">Health goals</Link>
            <Link href="/health-journal" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0b2d54] hover:border-[#24c1c4]">Health journal</Link>
            <Link href="/emergency-contacts" className="rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white hover:bg-[#071f3a]">Emergency contacts</Link>
          </div>
        </div>

        {loading && <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading your health passport...</div>}
        {error && !loading && <div className="mb-6 rounded-2xl border border-red-200 bg-white p-6"><h2 className="font-semibold text-[#0b2d54]">{error}</h2><button onClick={() => void load()} className="mt-4 rounded-xl bg-[#0b2d54] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>}

        {data && (
          <>
            <section className="mb-6 rounded-2xl bg-[#0b2d54] p-6 text-white sm:p-8">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10"><UserRound className="h-8 w-8" /></div>
                <div>
                  <p className="text-sm text-slate-300">Health passport for</p>
                  <h2 className="mt-1 text-2xl font-bold">{fullName}</h2>
                  {profile?.dateOfBirth && <p className="mt-2 text-sm text-slate-300">Date of birth: {profile.dateOfBirth}</p>}
                </div>
              </div>
            </section>

            <section className="mb-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0b2d54]">Blood information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard label="Blood type" value={formatEnum(healthPassport?.bloodType)} description="Blood group" />
                <InfoCard label="Rhesus factor" value={formatEnum(healthPassport?.rhesusFactor)} description="Rhesus status" />
              </div>
            </section>

            <section className="mb-6">
              <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-[#0b2d54]">Important information</h2><Link href="/health-passport" className="text-xs font-semibold text-[#0b2d54]">Refresh data</Link></div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <InfoCard label="Organ donor" value={healthPassport?.organDonor === true ? "Yes" : healthPassport?.organDonor === false ? "No" : "Not recorded"} description="Organ donation preference" />
                <InfoCard label="Allergies" value={String(activeAllergies.length)} description={activeAllergies.length ? "Active allergies recorded" : "No active allergies recorded"} href="/health-passport#allergies" />
                <InfoCard label="Health conditions" value={String(activeConditions.length)} description={activeConditions.length ? "Active conditions recorded" : "No active conditions recorded"} href="/health-conditions" />
                <InfoCard label="Immunizations" value={String(immunizations.length)} description={immunizations.length ? "Immunizations recorded" : "No immunizations recorded"} href="/health-passport#immunizations" />
                <InfoCard label="Emergency contacts" value={String(emergencyContacts.length)} description="Contacts available in an emergency" href="/emergency-contacts" />
              </div>
            </section>

            <section id="allergies" className="mb-6 scroll-mt-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0b2d54]">Allergies</h2>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">{activeAllergies.length ? <div className="flex flex-wrap gap-2">{activeAllergies.map((allergy: any) => <span key={allergy?.id ?? allergy?.name} className="rounded-full bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600">{allergy?.allergy?.name || allergy?.name || "Allergy"}</span>)}</div> : <p className="text-sm text-slate-500">No allergies are currently recorded.</p>}</div>
            </section>

            <section className="mb-6">
              <h2 className="mb-4 text-lg font-semibold text-[#0b2d54]">Active conditions</h2>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">{activeConditions.length ? <div className="grid gap-3 sm:grid-cols-2">{activeConditions.map((condition: any) => <div key={condition?.id ?? condition?.name} className="rounded-xl bg-slate-50 p-4"><p className="font-medium text-[#0b2d54]">{condition?.condition?.name || condition?.name || "Health condition"}</p></div>)}</div> : <p className="text-sm text-slate-500">No active health conditions are currently recorded.</p>}</div>
            </section>

            <section id="immunizations" className="mb-6 scroll-mt-6">
              <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Syringe className="h-5 w-5 text-[#24c1c4]" /><h2 className="text-lg font-semibold text-[#0b2d54]">Immunizations</h2></div><Link href="/onboarding" className="text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]">Add or update</Link></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                {immunizations.length ? <div className="grid gap-3 sm:grid-cols-2">{immunizations.map((item: any) => <div key={item?.id ?? `${item?.immunizationId}-${item?.doseNumber}`} className="rounded-xl bg-slate-50 p-4"><p className="font-medium text-[#0b2d54]">{item?.immunization?.name || item?.name || "Immunization"}</p>{item?.administeredAt && <p className="mt-1 text-sm text-slate-500">Administered: {new Date(item.administeredAt).toLocaleDateString("en-ZA")}</p>}{item?.doseNumber != null && <p className="mt-1 text-sm text-slate-500">Dose {item.doseNumber}</p>}{item?.facility && <p className="mt-1 text-sm text-slate-500">Facility: {item.facility}</p>}</div>)}</div> : <div className="flex items-center gap-3"><Syringe className="h-5 w-5 text-slate-400" /><p className="text-sm text-slate-500">No immunizations are currently recorded.</p></div>}
              </div>
            </section>

            <section className="mb-6 grid gap-4 md:grid-cols-2">
              <Link href="/health-goals" className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#24c1c4]"><p className="text-xs font-medium text-slate-400">Personal health</p><h3 className="mt-1 text-lg font-semibold text-[#0b2d54]">Health goals</h3><p className="mt-1 text-sm text-slate-500">Review and manage the goals you're working toward.</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0b2d54]">Open goals <ArrowRight className="h-3 w-3" /></span></Link>
              <Link href="/health-journal" className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#24c1c4]"><p className="text-xs font-medium text-slate-400">Daily tracking</p><h3 className="mt-1 text-lg font-semibold text-[#0b2d54]">Health journal</h3><p className="mt-1 text-sm text-slate-500">Record symptoms, mood, sleep, exercise and other health information.</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0b2d54]">Open journal <ArrowRight className="h-3 w-3" /></span></Link>
            </section>

            <div className="mt-8 rounded-2xl border border-[#24c1c4]/20 bg-[#24c1c4]/5 p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#0b2d54]" /><div><h3 className="font-semibold text-[#0b2d54]">Your health passport is private</h3><p className="mt-1 text-sm leading-6 text-slate-500">Keep this information accurate and up to date. Changes made through the linked health pages use your authenticated patient Health Passport.</p></div></div></div>
          </>
        )}
      </div>
    </main>
  );
}
