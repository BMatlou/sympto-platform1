"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowLeft, CalendarDays, Check, ChevronRight, Edit3, HeartPulse, Phone, ShieldCheck, Syringe, UserRound, X } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

const text = (value: unknown, fallback = "Not recorded") => value === null || value === undefined || value === "" ? fallback : String(value);
const human = (value: unknown) => text(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "Not recorded";
const age = (value: unknown) => {
  if (!value) return "Not recorded";
  const dob = new Date(String(value));
  if (Number.isNaN(dob.getTime())) return "Not recorded";
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) years -= 1;
  return `${years} years`;
};
function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) { return <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(11,45,84,0.06)] sm:p-6"><div className="mb-4 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-[#0b2d54]">{icon}</div><h2 className="text-base font-bold text-[#0b2d54]">{title}</h2></div>{children}</section>; }
function Empty({ children }: { children: ReactNode }) { return <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{children}</p>; }
function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "blue" | "rose" | "green" }) { const styles = { slate: "bg-slate-100 text-slate-600", blue: "bg-blue-50 text-blue-700", rose: "bg-rose-50 text-rose-700", green: "bg-emerald-50 text-emerald-700" }; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[tone]}`}>{children}</span>; }
function ClinicalMarker({ item, label }: { item?: any; label?: string }) {
  const clinical = item?.source === "CLINICAL";
  return <span className={"mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold " + (clinical ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600")}>
    {clinical ? <ShieldCheck className="h-3 w-3" /> : null}
    {label ?? (clinical ? "Clinical · view only" : "Patient entered · editable")}
  </span>;
}
function DetailGrid({ items }: { items: Array<[string, ReactNode]> }) {
  const recordedItems = items.filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (!recordedItems.length) return null;

  return <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
    {recordedItems.map(([label, value]) => <div key={label} className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-slate-100">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">{value}</p>
    </div>)}
  </div>;
}
function yesNo(value: unknown) { return value === null || value === undefined ? "Not recorded" : value ? "Yes" : "No"; }
const genderOptions = ["MALE", "FEMALE", "OTHER"];

export default function HealthPassportPremium() {
  const { data, loading: dashboardLoading, error: dashboardError, reload: reloadDashboard } = useDashboard();
  const [card, setCard] = useState<any>(null); const [cardLoading, setCardLoading] = useState(true); const [cardError, setCardError] = useState("");
  const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(""); const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({ preferredName: "", dateOfBirth: "", gender: "", heightCm: "", weightKg: "", bloodType: "", rhesusFactor: "", organDonor: "", emergencyNotes: "" });

  const loadCard = async () => { setCardLoading(true); setCardError(""); try { const response = await api.get("/clinic-card"); const payload: any = response.data; const clinicCard = payload?.data ?? payload; if (!clinicCard?.patient?.id) throw new Error("Clinic Card returned an invalid response."); setCard(clinicCard); } catch (error: any) { setCardError(error?.response?.data?.message || error?.message || "We couldn't load your Clinic Card."); } finally { setCardLoading(false); } };
  useEffect(() => { void loadCard(); }, []);
  useEffect(() => { if (!card) return; setForm({ preferredName: text(card.patient?.preferredName, ""), dateOfBirth: card.patient?.dateOfBirth ? String(card.patient.dateOfBirth).slice(0, 10) : "", gender: text(card.patient?.gender, ""), heightCm: card.vitals?.heightCm != null ? String(card.vitals.heightCm) : "", weightKg: card.vitals?.weightKg != null ? String(card.vitals.weightKg) : "", bloodType: text(card.emergency?.bloodType, ""), rhesusFactor: text(card.emergency?.rhesusFactor, ""), organDonor: card.emergency?.organDonorRecorded ? (card.emergency?.organDonor ? "true" : "false") : "", emergencyNotes: text(card.emergency?.emergencyNotes, "") }); }, [card]);

  const save = async () => {
    setSaving(true); setMessage(""); setErrorMessage("");
    try {
      await api.patch("/clinic-card/profile", { preferredName: form.preferredName || undefined, dateOfBirth: form.dateOfBirth || undefined, gender: form.gender || undefined, heightCm: form.heightCm ? Number(form.heightCm) : undefined, weightKg: form.weightKg ? Number(form.weightKg) : undefined, bloodType: form.bloodType || undefined, rhesusFactor: form.rhesusFactor || undefined, organDonor: form.organDonor === "" ? undefined : form.organDonor === "true", emergencyNotes: form.emergencyNotes || undefined });
      setEditing(false); setMessage("Your Clinic Card has been updated."); await Promise.all([loadCard(), reloadDashboard()]);
    } catch (error: any) { setErrorMessage(error?.response?.data?.message || "We couldn't save your changes. Please try again."); } finally { setSaving(false); }
  };

  const computed = useMemo(() => { if (!card) return null; const dashboardSnapshot = data?.healthSnapshot as any; const bmi = card.vitals?.bmi ?? dashboardSnapshot?.baseline?.bmi ?? dashboardSnapshot?.bmi ?? null; const fullName = [card.patient?.preferredName || card.patient?.firstName, card.patient?.lastName].filter(Boolean).join(" ") || "Patient"; return { ...card, bmi, fullName }; }, [card, data]);
  const loading = dashboardLoading || cardLoading; const error = dashboardError || cardError;
  const donorLabel = computed?.emergency?.organDonor ? "Yes" : "No";
  const availableGenders = computed?.patient?.gender && !genderOptions.includes(String(computed.patient.gender)) ? [String(computed.patient.gender), ...genderOptions] : genderOptions;
  const clinicalLocks = computed?.clinicalLocks ?? { bloodType: false, rhesusFactor: false, organDonor: false, emergencyNotes: false };

  if (loading && !computed) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-5"><div className="mx-auto max-w-5xl space-y-4"><div className="h-60 animate-pulse rounded-[30px] bg-slate-200" /><div className="grid gap-4 md:grid-cols-2"><div className="h-52 animate-pulse rounded-[26px] bg-slate-200" /><div className="h-52 animate-pulse rounded-[26px] bg-slate-200" /></div></div></main></ProtectedRoute>;
  if (error || !computed) return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] p-5"><div className="mx-auto max-w-lg rounded-[26px] bg-white p-7 shadow-sm"><h1 className="text-xl font-bold text-[#0b2d54]">We couldn't load your Clinic Card</h1><p className="mt-2 text-sm text-slate-500">{text(error, "Please try again.")}</p><button onClick={() => { void loadCard(); void reloadDashboard(); }} className="mt-5 rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-bold text-white">Try again</button></div></main></ProtectedRoute>;

  return <ProtectedRoute><main className="min-h-screen bg-[#f5f8fb] pb-10 text-slate-800"><div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-7">
    <div className="mb-4 flex items-center justify-between gap-3"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54]"><ArrowLeft className="h-4 w-4" />Back to My Health</Link><Link href="/health-conditions" className="text-xs font-bold text-[#0b2d54] hover:underline">Manage health records</Link></div>
    {message && <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><Check className="h-4 w-4" />{message}</div>}{errorMessage && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{errorMessage}</div>}
    <div className="mb-5 rounded-[22px] border border-blue-100 bg-blue-50/70 px-4 py-4 sm:px-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" /><div><p className="text-sm font-bold text-[#0b2d54]">Clinical records are protected</p><p className="mt-1 text-xs leading-5 text-slate-600">Records entered or updated by a doctor, nurse, clinic or other authorised practitioner are marked <span className="font-bold text-blue-700">Clinical</span> and are view-only from your patient account.</p><p className="mt-1 text-[11px] text-slate-500">Only recorded information is shown in each section; empty database fields are intentionally hidden.</p></div></div></div>
    <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-rose-700 via-rose-600 to-[#a61b42] p-6 text-white shadow-[0_24px_60px_rgba(159,32,67,0.24)] sm:p-8"><div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" /><div className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-black/10 blur-2xl" /><div className="relative"><div className="flex items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80"><ShieldCheck className="h-3.5 w-3.5" />My Clinic Card</div><h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{computed.fullName}</h1><p className="mt-2 text-sm text-white/75">Patient number · {text(computed.patient?.patientNumber)}</p></div><div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15"><HeartPulse className="h-7 w-7" /></div></div><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Age", age(computed.patient?.dateOfBirth)], ["Gender", human(computed.patient?.gender)], ["Blood group", human(computed.emergency?.bloodType)], ["Rhesus", human(computed.emergency?.rhesusFactor)]].map(([name, value]) => <div key={name} className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/10"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">{name}</p>{((name === "Blood group" && clinicalLocks.bloodType) || (name === "Rhesus" && clinicalLocks.rhesusFactor)) && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold text-white/85">Clinical</span>}</div><p className="mt-1.5 text-sm font-bold text-white">{value}</p></div>)}</div><button onClick={() => { setEditing(true); setMessage(""); setErrorMessage(""); }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0b2d54] shadow-sm"><Edit3 className="h-4 w-4" />Edit my information</button></div></section>

    {editing && <section className="mt-5 rounded-[26px] border border-rose-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-[#0b2d54]">Update your Clinic Card</h2><p className="mt-1 text-sm text-slate-500">Only your own patient information is editable here.</p></div><button onClick={() => setEditing(false)} className="rounded-xl p-2 text-slate-400"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">
      {[["Preferred name","preferredName","text"],["Date of birth","dateOfBirth","date"],["Height (cm)","heightCm","number"],["Weight (kg)","weightKg","number"]].map(([label,name,type]) => <label key={name} className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</span><input type={type} value={(form as any)[name]} onChange={(e) => setForm((v) => ({ ...v, [name]: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" /></label>)}
      <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">Gender</span><select value={form.gender} onChange={(e) => setForm((v) => ({ ...v, gender: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"><option value="">Not recorded</option>{availableGenders.map((value) => <option key={value} value={value}>{human(value)}</option>)}</select></label>
      <label className="block"><span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-500">Blood type {clinicalLocks.bloodType && <Badge tone="blue">Clinical · locked</Badge>}</span><select disabled={clinicalLocks.bloodType} value={form.bloodType} onChange={(e) => setForm((v) => ({ ...v, bloodType: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-600"><option value="">Not recorded</option>{["A_POSITIVE","A_NEGATIVE","B_POSITIVE","B_NEGATIVE","AB_POSITIVE","AB_NEGATIVE","O_POSITIVE","O_NEGATIVE","UNKNOWN"].map((v) => <option key={v} value={v}>{human(v)}</option>)}</select></label>
      <label className="block"><span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-500">Rhesus factor {clinicalLocks.rhesusFactor && <Badge tone="blue">Clinical · locked</Badge>}</span><select disabled={clinicalLocks.rhesusFactor} value={form.rhesusFactor} onChange={(e) => setForm((v) => ({ ...v, rhesusFactor: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-600"><option value="">Not recorded</option><option value="POSITIVE">Positive</option><option value="NEGATIVE">Negative</option><option value="UNKNOWN">Unknown</option></select></label>
      <label className="block"><span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-500">Organ donor {clinicalLocks.organDonor && <Badge tone="blue">Clinical · locked</Badge>}</span><select disabled={clinicalLocks.organDonor} value={form.organDonor} onChange={(e) => setForm((v) => ({ ...v, organDonor: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-600"><option value="">Not recorded</option><option value="true">Yes</option><option value="false">No</option></select></label>
      <label className="sm:col-span-2 block"><span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-500">Emergency notes {clinicalLocks.emergencyNotes && <Badge tone="blue">Clinical · locked</Badge>}</span><textarea disabled={clinicalLocks.emergencyNotes} rows={3} value={form.emergencyNotes} onChange={(e) => setForm((v) => ({ ...v, emergencyNotes: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-600" /></label>
    </div><p className="mt-3 text-[11px] text-slate-400">Clinical fields are locked once a practitioner has recorded or updated them. Ask your clinic to correct a clinical value.</p><div className="mt-5 flex justify-end gap-3"><button onClick={() => setEditing(false)} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button onClick={save} disabled={saving} className="rounded-xl bg-[#0b2d54] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button></div></section>}

    <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
      <section className="relative overflow-hidden rounded-[26px] border border-rose-100 bg-gradient-to-br from-white via-rose-50/70 to-rose-100/50 p-6 shadow-[0_16px_45px_rgba(159,32,67,0.10)] sm:p-7">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-rose-200/30 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-600">Organ Donor</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#0b2d54]">{donorLabel}</p>
              <p className="mt-1 text-sm text-slate-500">Your donation preference</p>
            </div>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-rose-100">
              <HeartPulse className="h-6 w-6 text-rose-600" />
            </div>
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-[#0b2d54] shadow-sm ring-1 ring-slate-100">
            <span className={`h-2.5 w-2.5 rounded-full ${computed.emergency?.organDonor ? "bg-emerald-500" : "bg-slate-400"}`} />
            {computed.emergency?.organDonor ? "Registered" : "Not registered"}
          </div>
        </div>
      </section>
      <Panel title="Current measurements" icon={<Activity className="h-5 w-5" />}>
        <div className="grid grid-cols-3 gap-3">
          {[
            [
              "Height",
              computed.vitals?.heightCm != null ? `${computed.vitals.heightCm} cm` : "—",
            ],
            [
              "Weight",
              computed.vitals?.weightKg != null ? `${computed.vitals.weightKg} kg` : "—",
            ],
            ["BMI", computed.bmi != null ? String(computed.bmi) : "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-extrabold text-[#0b2d54]">{value}</p>
            </div>
          ))}
        </div>

        {computed.baseline && (
          <DetailGrid
            items={[
              ["Baseline established", date(computed.baseline.establishedAt)],
              [
                "Baseline blood pressure",
                computed.baseline.systolicPressure != null ||
                computed.baseline.diastolicPressure != null
                  ? `${computed.baseline.systolicPressure ?? "—"} / ${computed.baseline.diastolicPressure ?? "—"} mmHg`
                  : null,
              ],
              [
                "Resting heart rate",
                computed.baseline.restingHeartRate != null
                  ? `${computed.baseline.restingHeartRate} bpm`
                  : null,
              ],
              [
                "Respiratory rate",
                computed.baseline.respiratoryRate != null
                  ? `${computed.baseline.respiratoryRate} /min`
                  : null,
              ],
              [
                "Oxygen saturation",
                computed.baseline.oxygenSaturation != null
                  ? `${computed.baseline.oxygenSaturation}%`
                  : null,
              ],
              [
                "Body temperature",
                computed.baseline.bodyTemperature != null
                  ? `${computed.baseline.bodyTemperature} °C`
                  : null,
              ],
              ["Blood glucose", computed.baseline.bloodGlucose],
              ["Cholesterol", computed.baseline.cholesterol],
              ["Baseline notes", computed.baseline.notes],
            ]}
          />
        )}

        <Link
          href="/health-vitals"
          className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]"
        >
          Open detailed vitals <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </Panel>
    </div>

    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <Panel title="Allergies" icon={<HeartPulse className="h-5 w-5" />}>
        {computed.allergies?.length ? <div className="space-y-3">{computed.allergies.map((item:any) => <article key={item.id} className="rounded-2xl bg-rose-50/55 p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{text(item.name,"Allergy")}</p><ClinicalMarker item={item} /></div><Badge tone="rose">{human(item.severity)}</Badge></div>
          <DetailGrid items={[
            ["Category", item.category], ["Reaction", item.reaction], ["Reaction details", item.reactionNotes],
            ["Onset", date(item.onsetDate)], ["Last reaction", date(item.lastReaction)], ["Verified", yesNo(item.verified)],
            ["Verified by", item.verifiedBy], ["Status", human(item.status)], ["Notes", item.notes], ["Updated", date(item.updatedAt)],
          ]} />
        </article>)}</div> : <Empty>No active allergies recorded.</Empty>}
        <Link href="/allergies" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">View allergies <ChevronRight className="h-3.5 w-3.5" /></Link>
      </Panel>
      <Panel title="Active conditions" icon={<Activity className="h-5 w-5" />}>
        {computed.conditions?.length ? <div className="space-y-3">{computed.conditions.map((item:any) => <article key={item.id} className="rounded-2xl bg-blue-50/55 p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{text(item.name,"Condition")}</p><ClinicalMarker item={item} /></div><Badge tone="blue">{human(item.status)}</Badge></div>
          <DetailGrid items={[
            ["Category", item.category], ["Body system", item.bodySystem], ["Severity", item.severity ? human(item.severity) : null],
            ["Stage", item.stage], ["Chronic", yesNo(item.chronic)], ["Primary condition", yesNo(item.primaryCondition)],
            ["Diagnosed / recorded", date(item.diagnosedAt)], ["Resolved", date(item.resolvedAt)], ["Diagnosed by", item.diagnosedBy],
            ["Treatment plan", item.treatmentPlan], ["Outcome", item.outcome], ["Notes", item.notes], ["Updated", date(item.updatedAt)],
          ]} />
        </article>)}</div> : <Empty>No active health conditions recorded.</Empty>}
        <Link href="/health-conditions" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">View health records <ChevronRight className="h-3.5 w-3.5" /></Link>
      </Panel>
      <Panel title="Practitioner diagnoses" icon={<ShieldCheck className="h-5 w-5" />}>
        {computed.diagnoses?.length ? <div className="space-y-3">{computed.diagnoses.map((item:any) => <article key={item.id} className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{text(item.name,"Clinical diagnosis")}</p><ClinicalMarker item={item} /></div><Badge tone="green">{human(item.status)}</Badge></div>
          <DetailGrid items={[
            ["Description", item.description], ["Category", item.category], ["Body system", item.bodySystem], ["Chronic", yesNo(item.chronic)],
            ["Diagnosed", date(item.diagnosedAt)], ["Resolved", date(item.resolvedAt)], ["Severity", item.severity ? human(item.severity) : null],
            ["Stage", item.stage], ["Primary diagnosis", yesNo(item.primaryDiagnosis)], ["Confirmed", yesNo(item.confirmed)],
            ["Diagnosed by", item.diagnosedBy || item.practitionerName], ["Treatment plan", item.treatmentPlan], ["Outcome", item.outcome],
            ["Clinical notes", item.notes], ["Updated", date(item.updatedAt)],
          ]} />
        </article>)}</div> : <Empty>No practitioner diagnoses are available yet.</Empty>}
        <Link href="/health-conditions" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">View clinical diagnoses <ChevronRight className="h-3.5 w-3.5" /></Link>
      </Panel>
      <Panel title="Procedures & surgical history" icon={<Activity className="h-5 w-5" />}>
        {computed.procedures?.length ? <div className="space-y-3">{computed.procedures.map((item:any) => <article key={item.id} className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{text(item.name,"Procedure")}</p><ClinicalMarker item={item} /></div><Badge>{human(item.status)}</Badge></div>
          <DetailGrid items={[
            ["Description", item.description], ["Category", item.category], ["Body system", item.bodySystem], ["Invasive", yesNo(item.invasive)], ["Surgical", yesNo(item.surgical)],
            ["Performed", date(item.performedAt)], ["Outcome", item.outcome], ["Performed by", item.performer || item.practitionerName], ["Facility", item.facility],
            ["Complications", item.complications], ["Follow-up required", yesNo(item.followUpRequired)], ["Follow-up date", date(item.followUpDate)],
            ["Clinical notes", item.notes], ["Updated", date(item.updatedAt)],
          ]} />
        </article>)}</div> : <Empty>No procedures or surgical history recorded.</Empty>}
      </Panel>
      <Panel title="Current medications" icon={<HeartPulse className="h-5 w-5" />}>
        {computed.medications?.length ? <div className="space-y-3">{computed.medications.map((item:any) => <article key={item.id} className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{text(item.name,"Medication")}</p><ClinicalMarker item={item} /></div><Badge tone="green">{human(item.status)}</Badge></div>
          <DetailGrid items={[
            ["Generic name", item.genericName], ["Brand name", item.brandName], ["Category", item.category], ["Dose", item.dosage],
            ["Frequency", item.frequency], ["Route", item.route], ["Indication", item.indication], ["Instructions", item.instructions],
            ["Prescribed by", item.prescribedBy || item.clinicalBy], ["Started", date(item.startedAt)], ["Ended", date(item.endedAt)],
            ["Ongoing", yesNo(item.ongoing)], ["Adherence", item.adherencePercentage != null ? String(item.adherencePercentage) + "%" : null],
            ["Missed doses", item.missedDoses], ["Side effects", item.sideEffects], ["Effectiveness", item.effectiveness],
            ["Notes", item.notes], ["Updated", date(item.updatedAt)],
          ]} />
        </article>)}</div> : <Empty>No active medications recorded.</Empty>}
        <Link href="/medications" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">View medications <ChevronRight className="h-3.5 w-3.5" /></Link>
      </Panel>
      <Panel title="Immunizations" icon={<Syringe className="h-5 w-5" />}>
        {computed.immunizations?.length ? <div className="space-y-3">{computed.immunizations.map((item:any) => <article key={item.id} className="rounded-2xl bg-emerald-50/55 p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{text(item.name,"Immunization")}</p><ClinicalMarker item={item} /></div><Badge tone="green">{human(item.status)}</Badge></div>
          <DetailGrid items={[
            ["Category", item.category], ["Disease protected", item.diseaseProtected], ["Administered", date(item.administeredAt)], ["Dose number", item.doseNumber],
            ["Batch number", item.batchNumber], ["Manufacturer", item.manufacturer], ["Administered by", item.administeredBy], ["Facility", item.facility],
            ["Route", item.route], ["Site", item.site], ["Adverse reaction", yesNo(item.adverseReaction)], ["Reaction details", item.adverseReactionNotes],
            ["Next due", date(item.nextDueDate)], ["Notes", item.notes], ["Updated", date(item.updatedAt)],
          ]} />
        </article>)}</div> : <Empty>No immunizations recorded yet.</Empty>}
        <Link href="/immunizations" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">View immunizations <ChevronRight className="h-3.5 w-3.5" /></Link>
      </Panel>
    </div>
    <div className="mt-5">
      <Panel title="Lifestyle & personal health" icon={<UserRound className="h-5 w-5" />}>
        <div className="mb-3"><ClinicalMarker label="Patient information · editable in My Health" /></div>
        {computed.lifestyle ? <DetailGrid items={[
          ["Occupation", computed.lifestyle.occupation], ["Dominant hand", computed.lifestyle.dominantHand ? human(computed.lifestyle.dominantHand) : null],
          ["Smoking status", computed.lifestyle.smokingStatus ? human(computed.lifestyle.smokingStatus) : null],
          ["Alcohol consumption", computed.lifestyle.alcoholConsumption ? human(computed.lifestyle.alcoholConsumption) : null],
          ["Exercise frequency", computed.lifestyle.exerciseFrequency ? human(computed.lifestyle.exerciseFrequency) : null],
        ]} /> : <Empty>No lifestyle information has been recorded.</Empty>}
      </Panel>
    </div>
    <div className="mt-5">
      <Panel title="Medical history" icon={<CalendarDays className="h-5 w-5" />}>
        <div className="mb-3"><ClinicalMarker label="Clinical record · view only" /></div>
        {computed.medicalHistory ? <DetailGrid items={[
          ["Past medical history", computed.medicalHistory.pastMedicalHistory], ["Family history", computed.medicalHistory.familyHistory],
          ["Social history", computed.medicalHistory.socialHistory], ["Surgical history", computed.medicalHistory.surgicalHistory],
          ["Recorded allergies", computed.medicalHistory.allergies], ["Chronic conditions", computed.medicalHistory.chronicConditions],
          ["Recorded medications", computed.medicalHistory.currentMedications], ["Immunization notes", computed.medicalHistory.immunizationNotes],
        ]} /> : <Empty>No additional medical history has been recorded.</Empty>}
      </Panel>
    </div>
    <div className="mt-5 grid gap-5 md:grid-cols-2"><Panel title="Emergency contacts" icon={<Phone className="h-5 w-5" />}>{computed.emergency?.emergencyNotes && <div className="mb-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><span className="font-bold">Emergency notes:</span> {computed.emergency.emergencyNotes}</div>}{computed.emergency?.contacts?.length ? <div className="space-y-3">{computed.emergency.contacts.map((item:any)=><div key={item.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-[#0b2d54]">{text(item.fullName,"Emergency contact")}</p>{item.isPrimary && <Badge tone="rose">Primary</Badge>}</div><DetailGrid items={[[ "Relationship", item.relationship ? human(item.relationship) : null],["Phone", item.phoneNumber],["Email", item.email],["Primary contact", yesNo(item.isPrimary)],["Updated", date(item.updatedAt)]]} /></div>)}</div>:<Empty>No emergency contacts recorded.</Empty>}<Link href="/emergency-contacts" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">Manage contacts <ChevronRight className="h-3.5 w-3.5" /></Link></Panel><Panel title="Coverage" icon={<ShieldCheck className="h-5 w-5" />}>{computed.coverage?.length ? <div className="space-y-3">{computed.coverage.map((item:any)=><div key={item.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#0b2d54]">{text(item.providerName,"Insurance provider")}</p><p className="mt-1 text-xs text-slate-500">{text(item.planName)} · {text(item.membershipNumber)}</p></div><Badge tone={String(item.planStatus ?? "ACTIVE").toUpperCase() === "ACTIVE" ? "green" : "slate"}>{human(item.planStatus)}</Badge></div><DetailGrid items={[[ "Provider phone", item.providerPhone],["Provider email", item.providerEmail],["Provider website", item.providerWebsite],["Plan code", item.planCode],["Plan description", item.planDescription],["Membership number", item.membershipNumber],["Dependant code", item.dependantCode],["Principal member", item.principalMemberName],["Relationship", item.relationship ? human(item.relationship) : null],["Effective from", date(item.effectiveFrom)],["Effective to", date(item.effectiveTo)],["Annual limit", item.annualLimit],["Deductible", item.deductible],["Co-payment", item.coPayment],["Active", yesNo(item.active)],["Updated", date(item.updatedAt)]]} /></div>)}</div>:<Empty>No active coverage recorded.</Empty>}<Link href="/health-finance" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0b2d54]">View coverage <ChevronRight className="h-3.5 w-3.5" /></Link></Panel></div>
    <div className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0b2d54] text-white"><UserRound className="h-5 w-5" /></div><div><h2 className="font-bold text-[#0b2d54]">Your record has two sources</h2><p className="mt-1 text-sm leading-6 text-slate-500">Patient-entered information can be managed by you. Practitioner diagnoses, procedures, treatments and administered vaccines are brought into the same view and remain clinically controlled.</p>{computed.lastUpdatedAt && <p className="mt-2 text-xs font-semibold text-slate-400">Last updated · {date(computed.lastUpdatedAt)}</p>}</div></div></div>
    <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-slate-400"><CalendarDays className="h-3.5 w-3.5" />Your Clinic Card is connected to your authenticated patient record.</p>
  </div></main></ProtectedRoute>;
}
