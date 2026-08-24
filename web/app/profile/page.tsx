"use client";

import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, Edit3, HeartPulse, MapPin, Settings, Users, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { authService } from "@/services/auth.service";
import { healthPassportService } from "@/services/health-passport.service";
import { onboardingService } from "@/services/onboarding.service";
import { profileService, type UpdateProfileRecord } from "@/services/profile.service";

type ProfileData = Record<string, unknown>;

type IdentityForm = UpdateProfileRecord & {
  firstName: string; middleName: string; lastName: string; preferredName: string;
  email: string; phoneNumber: string;
};

type AddressForm = Required<Pick<UpdateProfileRecord, "addressLine1" | "addressLine2" | "suburb" | "city" | "province" | "postalCode" | "country">>;

type HealthForm = {
  dateOfBirth: string; gender: string; heightCm: string; weightKg: string; bloodType: string;
  rhesusFactor: string; dominantHand: string; occupation: string; smokingStatus: string;
  alcoholConsumption: string; exerciseFrequency: string;
};

const emptyIdentity: IdentityForm = { firstName: "", middleName: "", lastName: "", preferredName: "", email: "", phoneNumber: "" };
const emptyAddress: AddressForm = { addressLine1: "", addressLine2: "", suburb: "", city: "", province: "", postalCode: "", country: "" };
const emptyHealth: HealthForm = { dateOfBirth: "", gender: "PREFER_NOT_TO_SAY", heightCm: "", weightKg: "", bloodType: "", rhesusFactor: "", dominantHand: "", occupation: "", smokingStatus: "", alcoholConsumption: "", exerciseFrequency: "" };

function str(value: unknown): string { return value === undefined || value === null ? "" : String(value); }
function field(source: ProfileData | null | undefined, key: string): string { return source ? str(source[key]) : ""; }
function label(value: string): string { return value.replaceAll("_", " ").toLowerCase().replace(/\\b\\w/g, c => c.toUpperCase()); }

export default function ProfilePage() {
  const [account, setAccount] = useState<ProfileData | null>(null);
  const [patient, setPatient] = useState<ProfileData | null>(null);
  const [passport, setPassport] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<"identity" | "address" | "health" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [identity, setIdentity] = useState(emptyIdentity);
  const [address, setAddress] = useState(emptyAddress);
  const [health, setHealth] = useState(emptyHealth);
  const [profileImageUrl, setProfileImageUrl] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [me, dashboard] = await Promise.all([authService.me(), healthPassportService.getHealthPassport()]);
      const person = (me as ProfileData)?.person as ProfileData | null;
      const addr = person?.address as ProfileData | null;
      const p = dashboard.patient ?? {};
      const hp = dashboard.healthPassport ?? {};
      setAccount(me as ProfileData);
      setPatient(p);
      setPassport(hp);
      setProfileImageUrl(field(person, "profileImageUrl"));
      setIdentity({ firstName: field(person, "firstName"), middleName: field(person, "middleName"), lastName: field(person, "lastName"), preferredName: field(person, "preferredName"), email: field(me as ProfileData, "email"), phoneNumber: field(me as ProfileData, "phoneNumber") });
      setAddress({ addressLine1: field(addr, "line1"), addressLine2: field(addr, "line2"), suburb: field(addr, "suburb"), city: field(addr, "city"), province: field(addr, "province"), postalCode: field(addr, "postalCode"), country: field((addr?.country as ProfileData | null), "name") || field(person?.country as ProfileData | null, "name") });
      setHealth({ dateOfBirth: field(p, "dateOfBirth").slice(0, 10), gender: field(p, "gender") || "PREFER_NOT_TO_SAY", heightCm: field(p, "heightCm"), weightKg: field(p, "weightKg"), bloodType: field(hp, "bloodType") || field(p, "bloodType"), rhesusFactor: field(hp, "rhesusFactor") || field(p, "rhesusFactor"), dominantHand: field(p, "dominantHand"), occupation: field(p, "occupation"), smokingStatus: field(p, "smokingStatus"), alcoholConsumption: field(p, "alcoholConsumption"), exerciseFrequency: field(p, "exerciseFrequency") });
    } catch { setMessage("We couldn't load your profile right now."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function saveIdentity() {
    setSaving(true); setMessage("");
    try { await profileService.update(identity); setEditing(null); setMessage("Personal information saved."); await load(); }
    catch (e: any) { setMessage(e?.response?.data?.message || "We couldn't save your personal information."); }
    finally { setSaving(false); }
  }

  async function saveAddress() {
    setSaving(true); setMessage("");
    try { await profileService.update(address); setEditing(null); setMessage("Address saved."); await load(); }
    catch (e: any) { setMessage(e?.response?.data?.message || "We couldn't save your address."); }
    finally { setSaving(false); }
  }

  async function saveHealth() {
    setSaving(true); setMessage("");
    try {
      await onboardingService.updateProfile({ dateOfBirth: health.dateOfBirth || undefined, gender: health.gender as any });
      await onboardingService.updateIndividualProfile({ heightCm: health.heightCm ? Number(health.heightCm) : undefined, weightKg: health.weightKg ? Number(health.weightKg) : undefined, bloodType: health.bloodType || undefined, rhesusFactor: health.rhesusFactor || undefined, dominantHand: health.dominantHand || undefined, occupation: health.occupation || undefined, smokingStatus: health.smokingStatus || undefined, alcoholConsumption: health.alcoholConsumption || undefined, exerciseFrequency: health.exerciseFrequency || undefined });
      setEditing(null); setMessage("Health profile saved."); await load();
    } catch (e: any) { setMessage(e?.response?.data?.message || "We couldn't save your health profile."); }
    finally { setSaving(false); }
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setMessage("Choose a PNG, JPEG, or WebP image up to 5 MB."); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    setSaving(true);
    try { await profileService.update({ profileImageUrl: dataUrl }); setProfileImageUrl(dataUrl); setMessage("Profile picture saved."); }
    catch (e: any) { setMessage(e?.response?.data?.message || "We couldn't save your profile picture."); }
    finally { setSaving(false); }
  }

  const person = account?.person as ProfileData | null;
  const addressText = [address.addressLine1, address.addressLine2, address.suburb, address.city, address.province, address.postalCode, address.country].filter(Boolean).join(", ");
  const displayName = identity.preferredName || [identity.firstName, identity.lastName].filter(Boolean).join(" ") || "Your profile";
  const patientNumber = field(patient, "patientNumber");

  const input = (value: string, onChange: (v: string) => void, type = "text") => <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#24c1c4] focus:ring-2 focus:ring-[#24c1c4]/15" />;
  const select = (value: string, onChange: (v: string) => void, options: string[]) => <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#24c1c4]">{options.map(o => <option key={o} value={o}>{label(o)}</option>)}</select>;

  return <ProtectedRoute><main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between gap-3"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Health Home</Link><Link href="/settings" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#0b2d54] shadow-sm hover:border-[#24c1c4]"><Settings className="h-4 w-4" />Account settings</Link></div>

    <header className="mt-7 rounded-3xl bg-[#0b2d54] p-6 text-white shadow-lg sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-5"><div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-2xl font-bold">{profileImageUrl ? <img src={profileImageUrl} alt="Profile" className="h-full w-full object-cover" /> : (identity.firstName?.[0] || "U") + (identity.lastName?.[0] || "") }<label className="absolute bottom-1 right-1 cursor-pointer rounded-full bg-[#24c1c4] p-1.5 text-[#0b2d54]"><Camera className="h-3.5 w-3.5" /><input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={saving} onChange={e => void uploadImage(e.target.files?.[0])} /></label></div><div><p className="text-xs font-semibold uppercase tracking-wider text-[#bff8f7]">My profile</p><h1 className="mt-1 text-3xl font-bold">{displayName}</h1><p className="mt-1 text-sm text-slate-300">Your personal identity and baseline health information.</p><label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#bff8f7]"><Camera className="h-3.5 w-3.5" />Change profile picture<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={saving} onChange={e => void uploadImage(e.target.files?.[0])} /></label></div></div><div className="rounded-2xl bg-white/10 px-4 py-3"><p className="text-xs uppercase tracking-wide text-slate-300">Patient number</p><p className="mt-1 font-mono font-semibold">{patientNumber || "Not assigned yet"}</p><p className="mt-1 text-xs text-slate-300">Read-only identifier</p></div></div></header>

    {message && <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#24c1c4]/30 bg-[#24c1c4]/10 px-4 py-3 text-sm text-[#0b2d54]"><CheckCircle2 className="h-4 w-4" />{message}</div>}
    {loading ? <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your real profile data…</div> : <div className="mt-5 grid gap-5 lg:grid-cols-2">

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-[#0b2d54]">Personal information</h2><p className="mt-1 text-sm text-slate-500">Name, preferred name and account contact details are saved to the appropriate Person and User records.</p></div>{editing !== "identity" && <button onClick={() => setEditing("identity")} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-3 py-2 text-sm font-semibold text-white hover:bg-[#123f70]"><Edit3 className="h-4 w-4" />Edit</button>}</div>{editing === "identity" ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{([["First name", identity.firstName, v => setIdentity({...identity, firstName:v})],["Middle name", identity.middleName, v => setIdentity({...identity, middleName:v})],["Last name", identity.lastName, v => setIdentity({...identity, lastName:v})],["Preferred name", identity.preferredName, v => setIdentity({...identity, preferredName:v})],["Email", identity.email, v => setIdentity({...identity, email:v})],["Phone", identity.phoneNumber, v => setIdentity({...identity, phoneNumber:v})] ] as [string,string,(v:string)=>void][]).map(([l,v,c]) => <div key={l}><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{l}</label>{input(v,c)}</div>)}<div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button disabled={saving} onClick={() => void saveIdentity()} className="rounded-xl bg-[#24c1c4] px-4 py-2.5 text-sm font-bold text-[#0b2d54]">{saving ? "Saving…" : "Save changes"}</button><button onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"><X className="mr-1 inline h-4 w-4" />Cancel</button></div></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[["First name",identity.firstName],["Middle name",identity.middleName],["Last name",identity.lastName],["Preferred name",identity.preferredName],["Email",identity.email],["Phone",identity.phoneNumber]].map(([l,v]) => <div key={l} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{l}</p><p className="mt-1 font-medium text-slate-800">{v || "Not recorded yet"}</p></div>)}</div>}</section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-[#0b2d54]">Address</h2><p className="mt-1 text-sm text-slate-500">The primary address captured during registration.</p></div>{editing !== "address" && <button onClick={() => setEditing("address")} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-3 py-2 text-sm font-semibold text-white"><Edit3 className="h-4 w-4" />Edit</button>}</div>{editing === "address" ? <div className="mt-5 space-y-3">{([["Address line 1","addressLine1"],["Address line 2","addressLine2"],["Suburb","suburb"],["City","city"],["Province","province"],["Postal code","postalCode"],["Country","country"]] as [string,keyof AddressForm][]).map(([l,k]) => <div key={k}><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{l}</label>{input(address[k], v => setAddress({...address,[k]:v}))}</div>)}<div className="flex gap-2"><button disabled={saving} onClick={() => void saveAddress()} className="rounded-xl bg-[#24c1c4] px-4 py-2.5 text-sm font-bold text-[#0b2d54]">{saving ? "Saving…" : "Save changes"}</button><button onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button></div></div> : <div className="mt-5 rounded-xl bg-slate-50 p-4"><MapPin className="mb-2 h-5 w-5 text-[#24c1c4]" /><p className="text-sm leading-6 text-slate-800">{addressText || "No address recorded yet. Add your address and it will be stored on your primary address record."}</p></div>}</section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-[#0b2d54]">Health profile</h2><p className="mt-1 text-sm text-slate-500">Baseline health details are stored against your Patient and Health Passport records.</p></div>{editing !== "health" && <button onClick={() => setEditing("health")} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-3 py-2 text-sm font-semibold text-white"><Edit3 className="h-4 w-4" />Edit</button>}</div>{editing === "health" ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{([["Date of birth","dateOfBirth","date"],["Gender","gender","select"],["Height (cm)","heightCm","number"],["Weight (kg)","weightKg","number"],["Blood type","bloodType","select"],["Rhesus factor","rhesusFactor","select"],["Dominant hand","dominantHand","select"],["Occupation","occupation","text"],["Smoking status","smokingStatus","select"],["Alcohol consumption","alcoholConsumption","select"],["Exercise frequency","exerciseFrequency","select"]] as [string,keyof HealthForm,string][]).map(([l,k,t]) => <div key={k}><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{l}</label>{t === "select" ? select(health[k], v => setHealth({...health,[k]:v}), k === "gender" ? ["PREFER_NOT_TO_SAY","MALE","FEMALE","OTHER"] : k === "bloodType" ? ["A_POSITIVE","A_NEGATIVE","B_POSITIVE","B_NEGATIVE","AB_POSITIVE","AB_NEGATIVE","O_POSITIVE","O_NEGATIVE","UNKNOWN"] : k === "rhesusFactor" ? ["POSITIVE","NEGATIVE","UNKNOWN"] : k === "dominantHand" ? ["RIGHT","LEFT","AMBIDEXTROUS"] : k === "smokingStatus" ? ["NEVER","FORMER","CURRENT"] : k === "alcoholConsumption" ? ["NONE","OCCASIONAL","MODERATE","HEAVY"] : ["NEVER","RARELY","1_2_PER_WEEK","3_4_PER_WEEK","5_PLUS_PER_WEEK"]) : input(health[k], v => setHealth({...health,[k]:v}), t)}</div>)}<div className="flex gap-2 sm:col-span-2"><button disabled={saving} onClick={() => void saveHealth()} className="rounded-xl bg-[#24c1c4] px-4 py-2.5 text-sm font-bold text-[#0b2d54]">{saving ? "Saving…" : "Save changes"}</button><button onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button></div></div> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{[["Date of birth",health.dateOfBirth],["Gender",health.gender],["Height",health.heightCm ? `${health.heightCm} cm` : ""],["Weight",health.weightKg ? `${health.weightKg} kg` : ""],["Blood type",health.bloodType],["Rhesus factor",health.rhesusFactor],["Dominant hand",health.dominantHand],["Occupation",health.occupation],["Smoking",health.smokingStatus],["Alcohol",health.alcoholConsumption],["Exercise",health.exerciseFrequency]].map(([l,v]) => <div key={l} className="rounded-xl bg-slate-50 p-3.5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{l}</p><p className="mt-1 text-sm font-medium text-slate-800">{v ? label(v) : "Not recorded yet"}</p></div>)}</div>}</section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2"><div className="grid gap-4 md:grid-cols-3"><Link href="/emergency-contacts" className="rounded-2xl border border-slate-100 bg-slate-50 p-5 transition hover:border-[#24c1c4] hover:bg-white"><ShieldAlert className="h-6 w-6 text-[#24c1c4]" /><h3 className="mt-3 font-semibold text-[#0b2d54]">Emergency contacts</h3><p className="mt-1 text-sm text-slate-500">Manage the real trusted contacts attached to your patient record.</p><span className="mt-3 inline-block text-sm font-semibold text-[#0b2d54]">Manage →</span></Link><Link href="/family" className="rounded-2xl border border-slate-100 bg-slate-50 p-5 transition hover:border-[#24c1c4] hover:bg-white"><Users className="h-6 w-6 text-[#24c1c4]" /><h3 className="mt-3 font-semibold text-[#0b2d54]">Family members</h3><p className="mt-1 text-sm text-slate-500">Manage authorised family accounts and switch patient context.</p><span className="mt-3 inline-block text-sm font-semibold text-[#0b2d54]">Manage →</span></Link><Link href="/settings" className="rounded-2xl border border-slate-100 bg-slate-50 p-5 transition hover:border-[#24c1c4] hover:bg-white"><Settings className="h-6 w-6 text-[#24c1c4]" /><h3 className="mt-3 font-semibold text-[#0b2d54]">Account settings</h3><p className="mt-1 text-sm text-slate-500">Security, preferences and account-level controls live here.</p><span className="mt-3 inline-block text-sm font-semibold text-[#0b2d54]">Manage →</span></Link></div></section>
    </div>}
  </div></main></ProtectedRoute>;
}
