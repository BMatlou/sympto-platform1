"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FolderOpen,
  HeartPulse,
  Pill,
  Scale,
  ShieldCheck,
  TriangleAlert,
  Watch,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { healthHomeService } from "@/services/health-home.service";

function display(value: unknown): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function measurementValue(
  measurements: Array<Record<string, unknown>> | undefined,
  types: string[],
) {
  return measurements?.find((item) =>
    types.includes(String(item.type ?? item.measurementType ?? "").toUpperCase()),
  );
}

function calculateBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  return Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
}

function getWeightStatus(bmi?: number | null): {
  text: "(Underweight)" | "(Normal weight)" | "(Obese)" | "(Extreme obese)";
  textClass: string;
  badgeClass: string;
  activeClass: string;
} {
  if (bmi == null || Number.isNaN(bmi)) {
    return {
      text: "(Normal weight)",
      textClass: "text-slate-500",
      badgeClass: "bg-slate-100 text-slate-600",
      activeClass: "ring-slate-300",
    };
  }

  if (bmi < 18.5) {
    return {
      text: "(Underweight)",
      textClass: "text-amber-700",
      badgeClass: "bg-amber-100 text-amber-800",
      activeClass: "ring-amber-400",
    };
  }

  if (bmi <= 24.9) {
    return {
      text: "(Normal weight)",
      textClass: "text-emerald-700",
      badgeClass: "bg-emerald-100 text-emerald-800",
      activeClass: "ring-emerald-400",
    };
  }

  if (bmi <= 29.9) {
    return {
      text: "(Obese)",
      textClass: "text-orange-700",
      badgeClass: "bg-orange-100 text-orange-800",
      activeClass: "ring-orange-400",
    };
  }

  return {
    text: "(Extreme obese)",
    textClass: "text-red-700",
    badgeClass: "bg-red-100 text-red-800",
    activeClass: "ring-red-400",
  };
}

function LargeAction({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#0b2d54] shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"
    >
      {icon}
      {label}
    </Link>
  );
}

function CountPill({ icon, count, label }: { icon: ReactNode; count: number; label: string }) {
  return (
    <div className="flex min-h-12 items-center gap-2 rounded-2xl bg-white/90 px-4 py-2.5 text-[#0b2d54] shadow-sm ring-1 ring-slate-100">
      {icon}
      <span className="text-base font-extrabold">{count}</span>
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

function WeightBodySizeCard({
  weightKg,
  heightCm,
  bmi,
  patientId,
  reload,
}: {
  weightKg: number | null | undefined;
  heightCm: number | null | undefined;
  bmi: number | null | undefined;
  patientId?: string;
  reload: () => Promise<void>;
}) {
  const [editingWeight, setEditingWeight] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const canEdit = !patientId;
  const minWeight = 20;
  const maxWeight = 250;
  const currentWeight = editingWeight ?? (weightKg != null ? Number(weightKg) : 60);
  const liveBmi = calculateBmi(currentWeight, heightCm != null ? Number(heightCm) : null) ?? (bmi != null ? Number(bmi) : null);
  const weightStatus = getWeightStatus(liveBmi);
  const sliderPercent = ((currentWeight - minWeight) / (maxWeight - minWeight)) * 100;

  const thresholdPercent = (bmiValue: number) => {
    if (!heightCm) return null;
    const thresholdWeight = bmiValue * Math.pow(Number(heightCm) / 100, 2);
    return Math.max(0, Math.min(100, ((thresholdWeight - minWeight) / (maxWeight - minWeight)) * 100));
  };

  const lowEnd = thresholdPercent(18.5);
  const normalEnd = thresholdPercent(24.9);
  const obeseEnd = thresholdPercent(29.9);
  const trackBackground = lowEnd != null && normalEnd != null && obeseEnd != null
    ? `linear-gradient(to right, #f59e0b 0%, #f59e0b ${lowEnd}%, #10b981 ${lowEnd}%, #10b981 ${normalEnd}%, #f97316 ${normalEnd}%, #f97316 ${obeseEnd}%, #ef4444 ${obeseEnd}%, #ef4444 100%)`
    : "linear-gradient(to right, #f59e0b 0%, #f59e0b 33%, #10b981 33%, #10b981 66%, #ef4444 66%, #ef4444 100%)";

  const persistWeight = async () => {
    if (!canEdit || editingWeight == null || saveState === "saving") return;
    if (!heightCm) {
      setSaveState("error");
      return;
    }

    try {
      setSaveState("saving");
      await healthHomeService.updateWeight(editingWeight, Number(heightCm));
      setSaveState("saved");
      await reload();
    } catch (error) {
      console.error("Failed to update weight:", error);
      setSaveState("error");
    }
  };

  const handleWeightChange = (value: string) => {
    const nextWeight = Number(value);
    if (!Number.isFinite(nextWeight)) return;
    setEditingWeight(Number(nextWeight.toFixed(1)));
    setSaveState("idle");
  };

  const statusMessage = saveState === "saving"
    ? "Saving your weight…"
    : saveState === "saved"
      ? "Weight saved"
      : saveState === "error"
        ? "Could not save. Try again."
        : canEdit
          ? "Move the slider to update your weight"
          : "Family health information is view-only";

  return (
    <div className={`mt-5 rounded-[28px] bg-white p-5 shadow-sm ring-2 ${weightStatus.activeClass} sm:p-6`}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0b2d54]/8 text-3xl" aria-hidden="true">
              ⚖️
            </div>
            <div>
              <h3 className="text-xl font-black text-[#0b2d54]">Weight &amp; Body Size</h3>
              <p className="mt-1 text-sm font-bold text-slate-500">Your current body weight</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ${weightStatus.badgeClass}`}>
            {weightStatus.text.replace(/[()]/g, "")}
          </span>
        </div>

        <div className="rounded-3xl bg-slate-50 px-5 py-5 ring-1 ring-slate-100">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div>
              <p className="text-4xl font-black leading-none tracking-tight text-[#0b2d54] sm:text-5xl">
                {currentWeight.toFixed(1)} <span className="text-2xl font-extrabold text-slate-500">kg</span>
              </p>
            </div>
            <div className="pb-0.5 text-lg font-black text-slate-400">BMI</div>
            <div className={`pb-0.5 text-2xl font-black ${weightStatus.textClass}`}>
              {liveBmi != null ? liveBmi.toFixed(1) : "—"}
              <span className="ml-2 text-lg">{weightStatus.text}</span>
            </div>
          </div>
        </div>

        <div className="relative pt-2">
          <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500">
            <span>LOW</span>
            <span>JUST RIGHT</span>
            <span>HIGH</span>
          </div>

          <div className="relative h-14 overflow-visible rounded-2xl">
            <div
              className="absolute inset-x-0 top-1/2 h-12 -translate-y-1/2 rounded-2xl shadow-inner"
              style={{ background: trackBackground }}
              aria-hidden="true"
            />

            <div
              className="pointer-events-none absolute top-1/2 z-10 h-[62px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0b2d54] shadow-[0_4px_12px_rgba(11,45,84,0.35)] ring-4 ring-white transition-[left] duration-75"
              style={{ left: `${Math.max(0, Math.min(100, sliderPercent))}%` }}
              aria-hidden="true"
            >
              <span className="absolute -top-3 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[#0b2d54] ring-2 ring-white" />
            </div>

            <input
              type="range"
              min={minWeight}
              max={maxWeight}
              step="0.1"
              value={currentWeight}
              disabled={!canEdit || !heightCm}
              onChange={(event) => handleWeightChange(event.target.value)}
              onPointerUp={() => void persistWeight()}
              onKeyUp={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") {
                  void persistWeight();
                }
              }}
              onBlur={() => void persistWeight()}
              aria-label="Weight in kilograms"
              className="absolute inset-0 z-20 h-full w-full cursor-grab opacity-0 disabled:cursor-not-allowed"
            />
          </div>

          <div className="mt-3 flex justify-between text-xs font-bold text-slate-400">
            <span>{minWeight} kg</span>
            <span>{maxWeight} kg</span>
          </div>
        </div>

        <p className="text-xl font-black leading-8 text-[#0b2d54] sm:text-2xl">
          ⚖️ Weight &amp; Body Size: {currentWeight.toFixed(1)} kg <span className={weightStatus.textClass}>{weightStatus.text}</span>
        </p>

        <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-[#0b2d54]/5 px-4 py-3 text-sm font-bold">
          <span className={saveState === "error" ? "text-red-700" : saveState === "saved" ? "text-emerald-700" : "text-slate-600"}>
            {statusMessage}
          </span>
          {canEdit && (
            <button
              type="button"
              onClick={() => void persistWeight()}
              disabled={editingWeight == null || saveState === "saving" || !heightCm}
              className="min-h-11 rounded-xl bg-[#0b2d54] px-4 py-2 font-black text-white shadow-sm transition hover:bg-[#071f3a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saveState === "saving" ? "Saving…" : "Save weight"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HealthHome() {
  const { data, loading, error, reload } = useDashboard();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || undefined;

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5f8fb] p-4 sm:p-8">
          <div className="mx-auto max-w-5xl space-y-5" aria-busy="true">
            <div className="h-40 animate-pulse rounded-[32px] bg-white" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-[32px] bg-white" />
            ))}
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error || !data) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f5f8fb] p-4 sm:p-8">
          <div className="mx-auto max-w-xl rounded-[32px] border border-red-200 bg-white p-7 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <TriangleAlert className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-[#0b2d54]">Your health screen could not load</h1>
            <p className="mt-2 text-base leading-7 text-slate-500">Your health information has not been changed. Please try again.</p>
            <button type="button" onClick={reload} className="mt-6 min-h-12 rounded-2xl bg-[#0b2d54] px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-[#071f3a]">Try again</button>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  const firstName = data.patient?.firstName || data.profile?.preferredName || data.profile?.firstName || "there";
  const medications = data.today?.activeMedications ?? [];
  const appointments = data.today?.upcomingAppointments ?? [];
  const activeGoals = (data.goals ?? []).filter((goal) => String(goal.status).toUpperCase() !== "ACHIEVED").length;
  const attentionCount = data.attention?.length ?? 0;
  const conditions = data.healthSnapshot?.activeConditions ?? [];
  const allergies = data.healthSnapshot?.allergies ?? [];
  const immunizations = data.healthSnapshot?.immunizations ?? [];
  const measurements = data.healthSnapshot?.latestMeasurements ?? [];
  const watchMeasurements = data.wearables?.latestMeasurements ?? [];
  const devices = data.wearables?.devices ?? [];
  const bloodPressure = measurementValue(measurements, ["BLOOD_PRESSURE", "BP"]);
  const watchHeart = measurementValue(watchMeasurements as Array<Record<string, unknown>>, ["HEART_RATE", "HEART"]);
  const fallbackHeart = measurementValue(measurements, ["HEART_RATE", "HEART"]);
  const heart = watchHeart ?? fallbackHeart;
  const bpValue = bloodPressure ? `${display(bloodPressure.value)} ${display(bloodPressure.unit)}` : "—";
  const heartValue = heart ? `${display(heart.value)} ${display(heart.unit)}` : "—";
  const watchConnected = devices.length > 0;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb] text-slate-800">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-[72px] max-w-5xl items-center justify-between px-4 sm:px-6">
            <img src="/logo-navbar.png" alt="Sympto" className="h-11 w-auto" />
            <span className="rounded-full bg-[#0b2d54]/5 px-4 py-2 text-sm font-extrabold text-[#0b2d54]">My Health</span>
          </div>
        </header>

        <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-8">
          <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0b2d54] via-[#103e69] to-[#24c1c4] p-7 text-white shadow-[0_20px_50px_rgba(11,45,84,0.16)] sm:p-9">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-white/75">My Health</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Hello, {firstName} 👋</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-white/85">Your important health information is organised for you. Just choose what you need.</p>
            </div>
          </section>

          <section className="overflow-hidden rounded-[32px] border-2 border-[#24c1c4]/25 bg-gradient-to-br from-[#effcfc] via-white to-white shadow-[0_16px_45px_rgba(11,45,84,0.08)]">
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#24c1c4]/15 text-4xl" aria-hidden="true">🟢</div>
                  <h2 className="mt-5 text-3xl font-black tracking-tight text-[#0b2d54] sm:text-4xl">What do I do today?</h2>
                  <p className="mt-2 text-base font-medium leading-7 text-slate-600">Your medicines, clinic visits and care plan are here.</p>
                </div>
                <Link href="/today" aria-label="Open what to do today" className="flex min-h-12 min-w-12 items-center justify-center rounded-full bg-white text-[#0b2d54] shadow-md ring-1 ring-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"><ArrowRight className="h-6 w-6" /></Link>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <LargeAction href="/medications" icon={<Pill className="h-6 w-6" />} label={`${medications.length} medicine${medications.length === 1 ? "" : "s"}`} />
                <LargeAction href="/appointments" icon={<CalendarDays className="h-6 w-6" />} label={`${appointments.length} clinic visit${appointments.length === 1 ? "" : "s"}`} />
                <LargeAction href="/health-goals" icon={<CheckCircle2 className="h-6 w-6" />} label={`${activeGoals} care goal${activeGoals === 1 ? "" : "s"}`} />
              </div>
              {attentionCount > 0 && (
                <Link href="/today" className="mt-4 flex min-h-12 items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-base font-bold text-amber-900 ring-1 ring-amber-200">
                  <TriangleAlert className="h-6 w-6 shrink-0" />
                  <span>{attentionCount} thing{attentionCount === 1 ? "" : "s"} may need your attention</span>
                  <ArrowRight className="ml-auto h-5 w-5" />
                </Link>
              )}
              <div className="mt-7 border-t-2 border-[#24c1c4]/15 pt-5">
                <div className="flex flex-col gap-4 rounded-3xl bg-[#0b2d54] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Watch className="h-8 w-8" /></div>
                    <div><p className="text-lg font-black">⌚ Link Watch</p><p className="mt-1 text-sm font-medium text-white/70">{watchConnected ? "Your watch is connected" : "Bluetooth health watch"}</p></div>
                  </div>
                  <div className="flex min-h-12 items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                    <span className={`h-4 w-4 rounded-full ${watchConnected ? "bg-emerald-400" : "bg-slate-300"}`} aria-hidden="true" />
                    <span className="text-base font-extrabold">{watchConnected ? "Connected" : "Not linked"}</span>
                    <span role="switch" aria-checked={watchConnected} aria-label={watchConnected ? "Watch connected" : "Watch not linked"} className={`relative ml-2 h-8 w-14 rounded-full p-1 ${watchConnected ? "bg-emerald-500" : "bg-white/20"}`}><span className={`block h-6 w-6 rounded-full bg-white shadow ${watchConnected ? "translate-x-6" : "translate-x-0"}`} /></span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[32px] border-2 border-red-200 bg-gradient-to-br from-rose-50/70 via-white to-white shadow-[0_16px_45px_rgba(11,45,84,0.08)]">
            <div className="p-6 sm:p-8">
              <Link href="/health-passport" className="block rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100 text-4xl" aria-hidden="true">🔴</div>
                    <h2 className="mt-5 text-3xl font-black tracking-tight text-[#0b2d54] sm:text-4xl">My Clinic Card</h2>
                    <p className="mt-2 text-base font-medium leading-7 text-slate-600">Show this information when you visit a nurse or doctor.</p>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0b2d54] shadow-md ring-1 ring-slate-200"><ArrowRight className="h-6 w-6" /></span>
                </div>
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-red-100"><div className="flex items-center gap-3 text-sm font-bold text-slate-500"><HeartPulse className="h-6 w-6 text-red-500" />BLOOD PRESSURE</div><p className="mt-3 text-4xl font-black tracking-tight text-[#0b2d54] sm:text-5xl">{bpValue}</p></div>
                  <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-red-100"><div className="flex items-center gap-3 text-sm font-bold text-slate-500"><Watch className="h-6 w-6 text-red-500" />❤️ WATCH HEART</div><p className="mt-3 text-4xl font-black tracking-tight text-[#0b2d54] sm:text-5xl">{heartValue}</p></div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <CountPill icon={<ShieldCheck className="h-5 w-5" />} count={conditions.length} label="conditions" />
                  <CountPill icon={<TriangleAlert className="h-5 w-5" />} count={allergies.length} label="allergies" />
                  <CountPill icon={<CheckCircle2 className="h-5 w-5" />} count={immunizations.length} label="vaccines" />
                </div>
              </Link>

              <WeightBodySizeCard
                weightKg={data.healthSnapshot?.weightKg}
                heightCm={data.healthSnapshot?.heightCm}
                bmi={data.healthSnapshot?.bmi}
                patientId={patientId}
                reload={reload}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-[32px] border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-white shadow-[0_16px_45px_rgba(11,45,84,0.08)]">
            <Link href="/health-journal" className="block p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-4xl" aria-hidden="true">🔵</div>
                  <h2 className="mt-5 text-3xl font-black tracking-tight text-[#0b2d54] sm:text-4xl">My History &amp; Papers</h2>
                  <p className="mt-2 max-w-2xl text-base font-medium leading-7 text-slate-600">One simple folder for your health story and important papers.</p>
                </div>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#0b2d54] shadow-md ring-1 ring-slate-200"><ArrowRight className="h-6 w-6" /></span>
              </div>
              <div className="mt-7 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-blue-100">
                <div className="flex items-center gap-5">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-blue-50 text-blue-600"><FolderOpen className="h-10 w-10" /></div>
                  <div><p className="text-xl font-black text-[#0b2d54]">📁 Open my health folder</p><p className="mt-2 text-sm font-medium leading-6 text-slate-500">Episodes · Encounters · Lab results · Imaging · Documents</p></div>
                </div>
              </div>
            </Link>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
