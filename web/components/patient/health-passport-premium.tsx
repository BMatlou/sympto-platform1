"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Edit3,
  HeartPulse,
  Phone,
  ShieldCheck,
  Syringe,
  UserRound,
  X,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

const text = (value: unknown, fallback = "Not recorded") =>
  value === null || value === undefined || value === "" ? fallback : String(value);
const human = (value: unknown) => text(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "Not recorded";

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(11,45,84,0.06)] sm:p-6"><div className="mb-4 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-[#0b2d54]">{icon}</div><h2 className="text-base font-bold text-[#0b2d54]">{title}</h2></div>{children}</section>;
}
function Empty({ children }: { children: ReactNode }) { return <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{children}</p>; }
function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "blue" | "rose" | "green" }) {
  const styles = { slate: "bg-slate-100 text-slate-600", blue: "bg-blue-50 text-blue-700", rose: "bg-rose-50 text-rose-700", green: "bg-emerald-50 text-emerald-700" };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[tone]}`}>{children}</span>;
}

export default function HealthPassportPremium() {
  const { data, loading: dashboardLoading, error: dashboardError, reload: reloadDashboard } = useDashboard();
  const [card, setCard] = useState<any>(null);
  const [cardLoading, setCardLoading] = useState(true);
  const [cardError, setCardError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({ preferredName: "", dateOfBirth: "", gender: "", heightCm: "", weightKg: "", bloodType: "", rhesusFactor: "", organDonor: "", emergencyNotes: "" });

  const loadCard = async () => {
    setCardLoading(true);
    setCardError("");
    try {
      const response = await api.get("/clinic-card");
      const payload: any = response.data;
      const clinicCard = payload?.data ?? payload;
      if (!clinicCard?.patient?.id) throw new Error("Clinic Card returned an invalid response.");
      setCard(clinicCard);
    } catch (error: any) {
      setCardError(error?.response?.data?.message || error?.message || "We couldn't load your Clinic Card.");
    } finally {
      setCardLoading(false);
    }
  };

  useEffect(() => { void loadCard(); }, []);

  useEffect(() => {
    if (!card) return;
    setForm({
      preferredName: text(card.patient?.preferredName, ""),
      dateOfBirth: card.patient?.dateOfBirth ? String(card.patient.dateOfBirth).slice(0, 10) : "",
      gender: text(card.patient?.gender, ""),
      heightCm: card.vitals?.heightCm != null ? String(card.vitals.heightCm) : "",
      weightKg: card.vitals?.weightKg != null ? String(card.vitals.weightKg) : "",
      bloodType: text(card.emergency?.bloodType, ""),
      rhesusFactor: text(card.emergency?.rhesusFactor, ""),
      organDonor: card.emergency?.organDonor === true ? "true" : card.emergency?.organDonor === false ? "false" : "",
      emergencyNotes: text(card.emergency?.emergencyNotes, ""),
    });
  }, [card]);

  const save = async () => {
    setSaving(true); setMessage(""); setErrorMessage("");
    try {
      await Promise.all([
        api.patch("/onboarding/profile", { preferredName: form.preferredName || undefined, dateOfBirth: form.dateOfBirth || undefined, gender: form.gender || undefined }),
        api.patch("/onboarding/individual/profile", {
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          heightCm: form.heightCm ? Number(form.heightCm) : undefined,
          weightKg: form.weightKg ? Number(form.weightKg) : undefined,
          bloodType: form.bloodType || undefined,
          rhesusFactor: form.rhesusFactor || undefined,
          organDonor: form.organDonor === "" ? undefined : form.organDonor === "true",
          emergencyNotes: form.emergencyNotes || undefined,
        }),
      ]);
      setEditing(false);
      setMessage("Your Clinic Card has been updated.");
      await Promise.all([loadCard(), reloadDashboard()]);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || "We couldn't save your changes. Please try again.");
    } finally { setSaving(false); }
  };

  const computed = useMemo(() => {
    if (!card) return null;
    const dashboardSnapshot = data?.healthSnapshot as any;
    const bmi = card.vitals?.bmi ?? dashboardSnapshot?.baseline?.bmi ?? dashboardSnapshot?.bmi ?? null;
    const fullName = [card.patient?.preferredName || card.patient?.firstName, card.patient?.lastName].filter(Boolean).join(" ") || "Patient";
    return { ...card, bmi, fullName };
  }, [card, data]);

  const loading = dashboardLoading || cardLoading;
  const error = dashboardError || cardError;

  if (loading && !computed) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-5"><div className="mx-auto max-w-5xl space-y-4"><div className="h-60 animate-pulse rounded-[30px] bg-slate-200" /><div className="grid gap-4 md:grid-cols-2"><div className="h-52 animate-pulse rounded-[26px] bg-slate-200" /><div className="h-52 animate-pulse rounded-[26px] bg-slate-200" /></div></div></main></ProtectedRoute>;
  if (error || !computed) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-5"><div className="mx-auto max-w-lg rounded-[26px] bg-white p-7 shadow-sm"><h1 className="text-xl font-bold text-[#0b2d54]">We couldn't load your Clinic Card</h1><p className="mt-2 text-sm text-slate-500">{error instanceof Error ? error.message : text(error, "Please try again.")}</p><button onClick={() => { void loadCard(); void reloadDashboard(); }} className="mt-5 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-bold text-white">Try again</button></div></main></ProtectedRoute>;

  return <ProtectedRoute>
    <main className="min-h-screen bg-[#f5f8fb] pb-10 text-slate-800">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-4 flex items-center justify-between gap-3"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54]"><ArrowLeft className="h-4 w-4" />Back to My Health</Link><Link href="/health-conditions" className="text-xs font-bold text-[#0b2d54] hover:underline">Manage health records</Link></div>
        {message && <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><Check className="h-4 w-4" />{message}</div>}
        {errorMessage && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{errorMessage}</div>}

        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-rose-700 via-rose-600 to-[#a61b42] p-6 text-white shadow-[0_24px_60px_rgba(159,32,67,0.24)] sm:p-8">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" /><div className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-black/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80"><ShieldCheck className="h-3.5 w-3.5" />My Clinic Card</div><h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{computed.fullName}</h1><p className="mt-2 text-sm text-white/75">Patient number · {text(computed.patient?.patientNumber)}</p></div><div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15"><HeartPulse className="h-7 w-7" /></div></div>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Date of birth", date(computed.patient?.dateOfBirth)], ["Gender", human(computed.patient?.gender)], ["Blood group", human(computed.emergency?.bloodType)], ["Rhesus", human(computed.emergency?.rhesusFactor)]].map(([name, value]) => <div key={name} className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/10"><p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">{name}</p><p className="mt-1.5 text-sm font-bold text-white">{value}</p></div>)}</div>
            <button onClick={() => { setEditing(true); setMessage(""); setErrorMessage(""); }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0b2d54] shadow-sm"><Edit3 className="h-4 w-4" />Edit my information</button>
          </div>
        </section>

        {editing && <section className="mt-5 rounded-[26px] border border-rose-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-[#0b2d54]">Update your Clinic Card</h2><p className="mt-1 text-sm text-slate-500">Only your own patient information is editable here.</p></div><button onClick={() => setEditing(false)} className="rounded-xl p-2 text-slate-400"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{[["Preferred name","preferredName","text"],["Date of birth","dateOfBirth","date"],["Height (cm)","heightCm","number"],["Weight (kg)","weightKg","number"]].map(([label,name,type]) => <label key={name} className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</span><input type={type} value={(form as any)[name]} onChange={(e) => setForm((v) => ({ ...v, [name]: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" /></label>)}<label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">Blood type</span><select value={form.bloodType} onChange={(e) => setForm((v) => ({ ...v, bloodType: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"><option value="">Not recorded</option>{["A_POSITIVE","A_NEGATIVE","B_POSITIVE","B_NEGATIVE","AB_POSITIVE","AB_NEGATIVE","O_POSITIVE","O_NEGATIVE","UNKNOWN"].map((v) => <option key={v} value={v}>{human(v)}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">Rhesus factor</span><select value={form.rhesusFactor} onChange={(e) => setForm((v) => ({ ...v, rhesusFactor: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"><option value="">Not recorded</option><option value="POSITIVE">Positive</option><option value="NEGATIVE">Negative</option><option value="UNKNOWN">Unknown</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">Organ donor</span><select value={form.organDonor} onChange={(e) => setForm((v) => ({ ...v, organDonor: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"><option value="">Not recorded</option><option value="true">Yes</option><option value="false">No</option></select></label><label className="sm:col-span-2 block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">Emergency notes</span><textarea rows={3} value={form.emergencyNotes} onChange={(e) => setForm((v) => ({ ...v, emergencyNotes: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" /></label></div><div className="mt-5 flex justify-end gap-3"><button onClick={() => setEditing(false)} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button onClick={save} disabled={saving} className="rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button></div></section>}

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Panel title="Critical & emergency information" icon={<ShieldCheck className="h-5 w-5" />}><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-rose-50 p-4"><p className="text-[10px] font-bold uppercase text-rose-600">Organ donor</p><p className="mt-1 font-bold text-[#0b2d54]">{computed.emergency?.organDonor ? "Yes" : "No"}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-500">Emergency contact</p><p className="mt-1 font-bold text-[#0b2d54]">{text(computed.emergency?.contacts?.[0]?.fullName)}</p><p className="mt-1 text-xs text-slate-500">{text(computed.emergency?.contacts?.[0]?.phoneNumber)}</p></div></div>{computed.emergency?.emergencyNotes && <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><span className="font-bold">Emergency notes:</span> {computed.emergency.emergencyNotes}</div>}<Link href="/emergency-contacts" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">Manage emergency contacts <ChevronRight className="h-3.5 w-3.5" /></Link></Panel>

          <Panel title="Current measurements" icon={<Activity className="h-5 w-5" />}><div className="grid grid-cols-3 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-500">Height</p><p className="mt-1 text-lg font-extrabold text-[#0b2d54]">{computed.vitals?.heightCm != null ? `${computed.vitals.heightCm} cm` : "—"}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-500">Weight</p><p className="mt-1 text-lg font-extrabold text-[#0b2d54]">{computed.vitals?.weightKg != null ? `${computed.vitals.weightKg} kg` : "—"}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-500">BMI</p><p className="mt-1 text-lg font-extrabold text-[#0b2d54]">{computed.bmi != null ? String(computed.bmi) : "—"}</p></div></div><Link href="/health-vitals" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">Open detailed vitals <ChevronRight className="h-3.5 w-3.5" /></Link></Panel>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Panel title="Allergies" icon={<HeartPulse className="h-5 w-5" />}>{computed.allergies?.length ? <div className="space-y-2.5">{computed.allergies.slice(0, 5).map((item: any) => <div key={item.id} className="rounded-2xl bg-rose-50/70 px-4 py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{text(item.name, "Allergy")}</p><p className="mt-1 text-xs text-slate-500">{item.reaction ? `Reaction · ${item.reaction}` : "Reaction not recorded"}</p></div><Badge tone="rose">{item.source === "PRACTITIONER" ? "Clinician verified" : "Patient record"}</Badge></div></div>)}</div> : <Empty>No active allergies recorded.</Empty>}<Link href="/allergies" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">Manage allergies <ChevronRight className="h-3.5 w-3.5" /></Link></Panel>

          <Panel title="Active conditions" icon={<Activity className="h-5 w-5" />}>{computed.conditions?.length ? <div className="space-y-2.5">{computed.conditions.slice(0, 5).map((item: any) => <div key={item.id} className="rounded-2xl bg-blue-50/70 px-4 py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{text(item.name, "Condition")}</p><p className="mt-1 text-xs text-slate-500">{item.severity ? `Severity · ${human(item.severity)}` : item.chronic ? "Long-term condition" : "Active condition"}</p></div><Badge tone="blue">{item.source === "PRACTITIONER" ? "Clinical" : "Patient record"}</Badge></div></div>)}</div> : <Empty>No active health conditions recorded.</Empty>}<Link href="/health-conditions" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">Manage conditions <ChevronRight className="h-3.5 w-3.5" /></Link></Panel>

          <Panel title="Practitioner diagnoses" icon={<ShieldCheck className="h-5 w-5" />}>{computed.diagnoses?.length ? <div className="space-y-2.5">{computed.diagnoses.slice(0, 5).map((item: any) => <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{text(item.name, "Clinical diagnosis")}</p><p className="mt-1 text-xs text-slate-500">{item.diagnosedAt ? `Diagnosed · ${date(item.diagnosedAt)}` : item.practitionerName ? `By ${item.practitionerName}` : "Practitioner record"}</p></div><Badge tone="green">Practitioner record</Badge></div></div>)}</div> : <Empty>No practitioner diagnoses are available yet.</Empty>}<Link href="/health-conditions" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">View clinical diagnoses <ChevronRight className="h-3.5 w-3.5" /></Link></Panel>

          <Panel title="Procedures & surgical history" icon={<Activity className="h-5 w-5" />}>{computed.procedures?.length ? <div className="space-y-2.5">{computed.procedures.slice(0, 5).map((item: any) => <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{text(item.name, "Procedure")}</p><p className="mt-1 text-xs text-slate-500">{item.performedAt ? `Performed · ${date(item.performedAt)}` : item.facility || "Clinical procedure"}{item.surgical ? " · Surgical" : ""}</p></div><Badge>{human(item.status)}</Badge></div></div>)}</div> : <Empty>No procedures or surgical history recorded.</Empty>}</Panel>

          <Panel title="Current medications" icon={<HeartPulse className="h-5 w-5" />}>{computed.medications?.length ? <div className="space-y-2.5">{computed.medications.slice(0, 5).map((item: any) => <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3"><p className="font-semibold text-[#0b2d54]">{text(item.name, "Medication")}</p><p className="mt-1 text-xs text-slate-500">{[item.dosage, item.frequency, item.route].filter(Boolean).join(" · ") || "Dosage not recorded"}</p></div>)}</div> : <Empty>No active medications recorded.</Empty>}<Link href="/medications" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">View medications <ChevronRight className="h-3.5 w-3.5" /></Link></Panel>

          <Panel title="Immunizations" icon={<Syringe className="h-5 w-5" />}>{computed.immunizations?.length ? <div className="space-y-2.5">{computed.immunizations.slice(0, 5).map((item: any) => <div key={item.id} className="rounded-2xl bg-emerald-50/70 px-4 py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{text(item.name, "Immunization")}</p><p className="mt-1 text-xs text-slate-500">{item.administeredAt ? `Administered · ${date(item.administeredAt)}` : "Date not recorded"}{item.nextDueDate ? ` · Next due ${date(item.nextDueDate)}` : ""}</p></div><Badge tone="green">{item.source === "PRACTITIONER" ? "Clinical" : "Patient record"}</Badge></div></div>)}</div> : <Empty>No immunizations recorded yet.</Empty>}<Link href="/immunizations" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">View immunizations <ChevronRight className="h-3.5 w-3.5" /></Link></Panel>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2"><Panel title="Emergency contacts" icon={<Phone className="h-5 w-5" />}>{computed.emergency?.contacts?.length ? <div className="space-y-2">{computed.emergency.contacts.slice(0, 2).map((item: any) => <div key={item.id} className="rounded-2xl bg-slate-50 p-3"><p className="font-semibold text-[#0b2d54]">{text(item.fullName, "Emergency contact")}</p><p className="mt-1 text-xs text-slate-500">{text(item.phoneNumber)}</p></div>)}</div> : <Empty>No emergency contacts recorded.</Empty>}<Link href="/emergency-contacts" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">Manage contacts <ChevronRight className="h-3.5 w-3.5" /></Link></Panel><Panel title="Coverage" icon={<ShieldCheck className="h-5 w-5" />}>{computed.coverage?.length ? <div className="space-y-2">{computed.coverage.slice(0, 2).map((item: any) => <div key={item.id} className="rounded-2xl bg-slate-50 p-3"><p className="font-semibold text-[#0b2d54]">{text(item.providerName, "Insurance provider")}</p><p className="mt-1 text-xs text-slate-500">{text(item.planName)} · {text(item.membershipNumber)}</p></div>)}</div> : <Empty>No active coverage recorded.</Empty>}<Link href="/health-finance" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">View coverage <ChevronRight className="h-3.5 w-3.5" /></Link></Panel></div>

        <div className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0b2d54] text-white"><UserRound className="h-5 w-5" /></div><div><h2 className="font-bold text-[#0b2d54]">Your record has two sources</h2><p className="mt-1 text-sm leading-6 text-slate-500">Patient-entered information can be managed by you. Practitioner diagnoses, procedures, treatments and administered vaccines are brought into the same view and remain clinically controlled.</p>{computed.lastUpdatedAt && <p className="mt-2 text-xs font-semibold text-slate-400">Last updated · {date(computed.lastUpdatedAt)}</p>}</div></div></div>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-slate-400"><CalendarDays className="h-3.5 w-3.5" />Your Clinic Card is connected to your authenticated patient record.</p>
      </div>
    </main>
  </ProtectedRoute>;
}
