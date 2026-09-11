"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, FolderOpen, HeartPulse, ShieldCheck, TriangleAlert } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import HealthVitalsSummary, { type DashboardVital } from "@/components/dashboard/health-vitals-summary";

function display(value: unknown): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function normalizeVitals(data: any): DashboardVital[] {
  const deviceVitals = Array.isArray(data?.healthSnapshot?.latestMeasurements)
    ? data.healthSnapshot.latestMeasurements.map((item: any) => ({
        type: item.type ?? item.measurementType,
        name: item.name,
        value: item.value,
        unit: item.unit,
        measuredAt: item.measuredAt,
        source: item.source,
      }))
    : [];

  const clinicalVitals = Array.isArray(data?.clinicalVitals)
    ? data.clinicalVitals.map((item: any) => ({
        type: item.vitalType?.code ?? item.vitalType?.name,
        name: item.vitalType?.name,
        value: item.value,
        unit: item.vitalType?.unit,
        measuredAt: item.measuredAt,
        source: "CLINICAL_RECORD",
      }))
    : [];

  const byType = new Map<string, DashboardVital>();
  for (const vital of [...deviceVitals, ...clinicalVitals]) {
    const key = String(vital.type ?? vital.name ?? "").toUpperCase();
    if (!key) continue;
    const previous = byType.get(key);
    if (!previous || new Date(String(vital.measuredAt ?? 0)).getTime() > new Date(String(previous.measuredAt ?? 0)).getTime()) {
      byType.set(key, vital);
    }
  }

  return Array.from(byType.values());
}

function itemNames(items: any[], kind: "allergy" | "condition" | "medication") {
  return items
    .map((item) => kind === "allergy" ? item?.allergy?.name ?? item?.name : kind === "condition" ? item?.condition?.name ?? item?.name : item?.medication?.name ?? item?.name)
    .filter(Boolean) as string[];
}

function detailLabel(value: unknown, fallback = "Not recorded") {
  return value === null || value === undefined || value === "" ? fallback : String(value).replaceAll("_", " ");
}

export default function HealthHome() {
  const { data, loading, error, reload } = useDashboard();

  if (loading) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-4 sm:p-8"><div className="mx-auto max-w-[1300px] space-y-4" aria-busy="true"><div className="h-80 animate-pulse rounded-[34px] bg-white" /><div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-60 animate-pulse rounded-[27px] bg-white" />)}</div></div></main></ProtectedRoute>;
  }

  if (error || !data) {
    return <ProtectedRoute><main className="min-h-screen bg-[#f4f9fb] p-4 sm:p-8"><div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-white p-6"><TriangleAlert className="h-6 w-6 text-red-600" /><h1 className="mt-4 text-xl font-extrabold text-[#0b2d54]">Your health screen could not load</h1><p className="mt-2 text-sm text-slate-500">Your health information has not been changed. Please try again.</p><button type="button" onClick={reload} className="mt-5 min-h-11 rounded-xl bg-[#0b2d54] px-5 text-sm font-extrabold text-white">Try again</button></div></main></ProtectedRoute>;
  }

  const firstName = data.patient?.firstName || data.profile?.preferredName || data.profile?.firstName || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 14 ? "Good day" : hour < 18 ? "Good afternoon" : "Good evening";
  const medications = data.today?.activeMedications ?? [];
  const appointments = data.today?.upcomingAppointments ?? [];
  const activeGoals = (data.goals ?? []).filter((goal) => String(goal.status).toUpperCase() !== "ACHIEVED").length;
  const todayActionCount = medications.length + appointments.length + activeGoals;
  const historyCount = (data.encounters?.length ?? 0) + (data.recentResults?.laboratory?.length ?? 0) + (data.recentResults?.imaging?.length ?? 0) + (data.attachments?.length ?? 0);
  const bmi = data.healthSnapshot?.bmi ?? data.patient?.bmi ?? null;
  const bmiCategory = data.healthSnapshot?.bmiCategory ?? data.patient?.bmiCategory ?? null;
  const healthVitals = normalizeVitals(data);
  const allergies = data.healthSnapshot?.activeAllergies ?? data.healthSnapshot?.allergies ?? data.allergies ?? [];
  const conditions = data.healthSnapshot?.activeConditions ?? data.conditions ?? [];
  const allergyNames = itemNames(allergies, "allergy");
  const conditionNames = itemNames(conditions, "condition");
  const bloodType = data.healthPassport?.bloodType ?? data.healthSnapshot?.bloodType ?? data.medicalRecord?.bloodType;
  const rhesusFactor = data.healthPassport?.rhesusFactor ?? data.healthSnapshot?.rhesusFactor;

  return <ProtectedRoute>
    <main className="min-h-screen bg-[#f4f9fb] text-[#14304d]">
      <div className="mx-auto max-w-[1300px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#08284a] via-[#0e4773] to-[#24babe] p-7 text-white shadow-[0_18px_52px_rgba(11,45,84,0.10)] sm:p-9 lg:p-10">
          <div className="pointer-events-none absolute -right-[205px] -top-[255px] h-[500px] w-[500px] rounded-full border border-white/15 shadow-[0_0_0_34px_rgba(255,255,255,0.035),0_0_0_68px_rgba(255,255,255,0.02)]" />
          <div className="pointer-events-none absolute bottom-[-180px] left-[42%] h-[230px] w-[230px] rounded-full bg-[#24c1c4]/30 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-medium tracking-[-0.01em] text-white/80">{greeting}, {firstName}</p>
            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-lg font-medium tracking-[-0.02em] text-white/95 sm:text-xl">{todayActionCount > 0 ? `${todayActionCount} ${todayActionCount === 1 ? "thing" : "things"} to take care of today.` : "Nothing urgent to take care of today."}</p>
                <p className="mt-1 text-sm leading-6 text-white/60">{todayActionCount > 0 ? "Start with what matters most." : "You’re all caught up."}</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Link href="/today" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-[#0b2d54] shadow-sm transition hover:-translate-y-0.5"><span>View today</span><ArrowRight className="h-3.5 w-3.5" /></Link>
                <Link href="/log-symptom" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/15"><HeartPulse className="h-4 w-4" /><span>Log a symptom</span></Link>
              </div>
            </div>
          </div>
        </section>

        <div className="my-7 px-1"><p className="text-[11px] font-black uppercase tracking-[0.21em] text-[#71839a]">Your health, at a glance</p><p className="mt-1 text-sm font-semibold text-[#71839a]">Choose what you need. Sympto will take you there.</p></div>

        <section className="grid gap-[15px] lg:grid-cols-3">
          <article className="relative min-h-[220px] overflow-hidden rounded-[27px] border border-[#e0ebef] bg-gradient-to-br from-white via-white to-[#f2fcf8] p-6 shadow-[0_5px_18px_rgba(11,45,84,0.035)] after:absolute after:-bottom-[68px] after:-right-[58px] after:h-[145px] after:w-[145px] after:rounded-full after:bg-[#168660]/10 after:content-['']"><div className="relative z-10"><div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-[15px] bg-[#e8f8f1] text-[#168660]"><CheckCircle2 className="h-5 w-5" /></div><span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#71839a]">Today</span></div><h3 className="mt-5 text-[19px] font-black tracking-[-0.04em] text-[#0b2d54]">What do I do today?</h3><p className="mt-2 max-w-[280px] text-xs leading-5 text-[#71839a]">{todayActionCount > 0 ? `${todayActionCount} ${todayActionCount === 1 ? "thing needs" : "things need"} your attention.` : "Nothing urgent is waiting for you today."}</p><div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-[#0b2d54]"><span className="rounded-full bg-[#f4f8fa] px-2.5 py-1.5">Medication {medications.length}</span><span className="rounded-full bg-[#f4f8fa] px-2.5 py-1.5">Visit {appointments.length}</span><span className="rounded-full bg-[#f4f8fa] px-2.5 py-1.5">Goal {activeGoals}</span></div><Link href="/today" className="mt-5 flex min-h-11 items-center justify-between rounded-xl bg-[#0b2d54] px-4 py-2 text-[11px] font-black text-white transition hover:bg-[#071f3a]"><span>Open today</span><ArrowRight className="h-3.5 w-3.5" /></Link></div></article>

          <article className="relative min-h-[220px] overflow-hidden rounded-[27px] border border-[#e0ebef] bg-gradient-to-br from-white via-white to-[#f3f8fc] p-6 shadow-[0_5px_18px_rgba(11,45,84,0.035)] after:absolute after:-bottom-[68px] after:-right-[58px] after:h-[145px] after:w-[145px] after:rounded-full after:bg-[#0b2d54]/10 after:content-['']"><div className="relative z-10"><div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-[15px] bg-[#edf4ff] text-[#0b2d54]"><ShieldCheck className="h-5 w-5" /></div><span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#71839a]">Safety</span></div><h3 className="mt-5 text-[19px] font-black tracking-[-0.04em] text-[#0b2d54]">My Clinic Card</h3><p className="mt-2 text-xs leading-5 text-[#71839a]">Your essential health information for quick reference and care.</p><div className="mt-4 space-y-2.5"><div className="rounded-2xl bg-white px-3.5 py-3 ring-1 ring-[#e0ebef]"><p className="text-[9px] font-black uppercase tracking-wide text-[#71839a]">Allergies</p><p className="mt-1 truncate text-[11px] font-bold text-[#0b2d54]">{allergyNames.length ? allergyNames.slice(0, 2).join(" · ") : "No active allergies recorded"}{allergyNames.length > 2 ? ` +${allergyNames.length - 2}` : ""}</p></div><div className="rounded-2xl bg-white px-3.5 py-3 ring-1 ring-[#e0ebef]"><p className="text-[9px] font-black uppercase tracking-wide text-[#71839a]">Conditions</p><p className="mt-1 truncate text-[11px] font-bold text-[#0b2d54]">{conditionNames.length ? conditionNames.slice(0, 2).join(" · ") : "No active conditions recorded"}{conditionNames.length > 2 ? ` +${conditionNames.length - 2}` : ""}</p></div><div className="grid grid-cols-2 gap-2"><div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[#e0ebef]"><p className="text-[8px] font-black uppercase tracking-wide text-[#9aa8b7]">Blood</p><p className="mt-1 text-[11px] font-black text-[#0b2d54]">{detailLabel(bloodType)}</p></div><div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[#e0ebef]"><p className="text-[8px] font-black uppercase tracking-wide text-[#9aa8b7]">Rhesus</p><p className="mt-1 text-[11px] font-black text-[#0b2d54]">{detailLabel(rhesusFactor)}</p></div></div></div><Link href="/health-passport" className="mt-4 flex min-h-11 items-center justify-between rounded-xl bg-[#0b2d54] px-4 py-2 text-[11px] font-black text-white transition hover:bg-[#071f3a]"><span>Open Clinic Card</span><ArrowRight className="h-3.5 w-3.5" /></Link></div></article>

          <article className="relative min-h-[220px] overflow-hidden rounded-[27px] border border-[#e0ebef] bg-gradient-to-br from-white via-white to-[#f2f7ff] p-6 shadow-[0_5px_18px_rgba(11,45,84,0.035)] after:absolute after:-bottom-[68px] after:-right-[58px] after:h-[145px] after:w-[145px] after:rounded-full after:bg-[#3f75bd]/10 after:content-['']"><div className="relative z-10"><div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-[15px] bg-[#edf4ff] text-[#3f75bd]"><FolderOpen className="h-5 w-5" /></div><span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#71839a]">History</span></div><h3 className="mt-5 text-[19px] font-black tracking-[-0.04em] text-[#0b2d54]">My History &amp; Papers</h3><p className="mt-2 text-xs leading-5 text-[#71839a]">Your health story, records, results, and documents in one place.</p><p className="mt-4 text-sm font-black text-[#0b2d54]">{historyCount} connected {historyCount === 1 ? "record" : "records"}</p><Link href="/health-journal" className="mt-6 flex min-h-11 items-center justify-between rounded-xl bg-[#0b2d54] px-4 py-2 text-[11px] font-black text-white transition hover:bg-[#071f3a]"><span>Open health history</span><ArrowRight className="h-3.5 w-3.5" /></Link></div></article>
        </section>

        <HealthVitalsSummary
          bmi={bmi}
          bmiCategory={bmiCategory}
          weightKg={data.healthSnapshot?.weightKg ?? data.patient?.weightKg ?? null}
          heightCm={data.healthSnapshot?.heightCm ?? data.patient?.heightCm ?? null}
          measurements={healthVitals}
        />
      </div>
    </main>
  </ProtectedRoute>;
}