"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  MapPin,
  Save,
  Settings,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { authService } from "@/services/auth.service";
import { healthPassportService } from "@/services/health-passport.service";
import { onboardingService } from "@/services/onboarding.service";

type ProfileForm = {
  preferredName: string;
  dateOfBirth: string;
  gender: string;
  heightCm: string;
  weightKg: string;
  bloodType: string;
  rhesusFactor: string;
  dominantHand: string;
  occupation: string;
  smokingStatus: string;
  alcoholConsumption: string;
  exerciseFrequency: string;
};

const emptyForm: ProfileForm = {
  preferredName: "",
  dateOfBirth: "",
  gender: "PREFER_NOT_TO_SAY",
  heightCm: "",
  weightKg: "",
  bloodType: "",
  rhesusFactor: "",
  dominantHand: "",
  occupation: "",
  smokingStatus: "",
  alcoholConsumption: "",
  exerciseFrequency: "",
};

function valueOf(source: unknown, ...keys: string[]): string {
  if (!source || typeof source !== "object") return "";
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return "";
}

function nestedValue(source: unknown, ...keys: string[]): string {
  const direct = valueOf(source, ...keys);
  if (direct) return direct;
  if (!source || typeof source !== "object") return "";
  const record = source as Record<string, unknown>;
  for (const wrapper of ["user", "account", "person", "profile", "patient", "data"]) {
    const found = valueOf(record[wrapper], ...keys);
    if (found) return found;
  }
  return "";
}

function nestedRecord(source: unknown, key: string): Record<string, unknown> | null {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  const direct = record[key];
  if (direct && typeof direct === "object") return direct as Record<string, unknown>;
  for (const wrapper of ["user", "account", "person", "profile", "patient", "data"]) {
    const nested = record[wrapper];
    if (nested && typeof nested === "object") {
      const value = (nested as Record<string, unknown>)[key];
      if (value && typeof value === "object") return value as Record<string, unknown>;
    }
  }
  return null;
}

function labelize(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [account, setAccount] = useState<unknown>(null);
  const [patientNumber, setPatientNumber] = useState("");

  useEffect(() => {
    Promise.all([healthPassportService.getHealthPassport(), authService.me()])
      .then(([dashboard, me]) => {
        const profile = dashboard.profile ?? {};
        const patient = dashboard.patient ?? {};
        const passport = dashboard.healthPassport ?? {};
        setAccount(me);
        setPatientNumber(valueOf(patient, "patientNumber"));
        setForm({
          preferredName:
            valueOf(profile, "preferredName") || valueOf(patient, "preferredName"),
          dateOfBirth: (
            valueOf(profile, "dateOfBirth") || valueOf(patient, "dateOfBirth")
          ).slice(0, 10),
          gender:
            valueOf(profile, "gender") ||
            valueOf(patient, "gender") ||
            "PREFER_NOT_TO_SAY",
          heightCm: valueOf(profile, "heightCm") || valueOf(patient, "heightCm"),
          weightKg: valueOf(profile, "weightKg") || valueOf(patient, "weightKg"),
          bloodType:
            valueOf(profile, "bloodType") ||
            valueOf(patient, "bloodType") ||
            valueOf(passport, "bloodType"),
          rhesusFactor:
            valueOf(profile, "rhesusFactor") ||
            valueOf(patient, "rhesusFactor") ||
            valueOf(passport, "rhesusFactor"),
          dominantHand: valueOf(profile, "dominantHand") || valueOf(patient, "dominantHand"),
          occupation: valueOf(profile, "occupation") || valueOf(patient, "occupation"),
          smokingStatus: valueOf(profile, "smokingStatus") || valueOf(patient, "smokingStatus"),
          alcoholConsumption:
            valueOf(profile, "alcoholConsumption") || valueOf(patient, "alcoholConsumption"),
          exerciseFrequency:
            valueOf(profile, "exerciseFrequency") || valueOf(patient, "exerciseFrequency"),
        });
      })
      .catch(() => setMessage("We couldn't load your profile right now."))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof ProfileForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function save() {
    try {
      setSaving(true);
      setMessage("");
      await onboardingService.updateProfile({
        preferredName: form.preferredName || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender as "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY",
      });
      await onboardingService.updateIndividualProfile({
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        bloodType: form.bloodType || undefined,
        rhesusFactor: form.rhesusFactor || undefined,
        dominantHand: form.dominantHand || undefined,
        occupation: form.occupation || undefined,
        smokingStatus: form.smokingStatus || undefined,
        alcoholConsumption: form.alcoholConsumption || undefined,
        exerciseFrequency: form.exerciseFrequency || undefined,
      });
      setMessage("Your profile has been updated.");
    } catch (error: unknown) {
      const response = (error as { response?: { data?: { message?: string } } })?.response;
      setMessage(response?.data?.message || "We couldn't update your profile.");
    } finally {
      setSaving(false);
    }
  }

  const person = nestedRecord(account, "person");
  const address = nestedRecord(person, "address");
  const country = nestedRecord(person, "country") || nestedRecord(address, "country");

  const firstName = valueOf(person, "firstName") || nestedValue(account, "firstName", "givenName");
  const middleName = valueOf(person, "middleName");
  const lastName = valueOf(person, "lastName") || nestedValue(account, "lastName", "familyName");
  const preferredName = valueOf(person, "preferredName") || form.preferredName;
  const profileImageUrl = valueOf(person, "profileImageUrl");
  const email = nestedValue(account, "email", "emailAddress");
  const phone = nestedValue(account, "phoneNumber", "phone", "mobileNumber");
  const countryName = valueOf(country, "name");
  const initials = useMemo(
    () => `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U",
    [firstName, lastName],
  );

  const addressParts = [
    valueOf(address, "line1"),
    valueOf(address, "line2"),
    valueOf(address, "suburb"),
    valueOf(address, "city"),
    valueOf(address, "province"),
    valueOf(address, "postalCode"),
    countryName,
  ].filter(Boolean);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b2d54] transition hover:text-[#24c1c4]"
            >
              <ArrowLeft className="h-4 w-4" />
              Health Home
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#0b2d54] shadow-sm transition hover:border-[#24c1c4]"
            >
              <Settings className="h-4 w-4" />
              Account settings
            </Link>
          </div>

          <header className="mt-8 overflow-hidden rounded-3xl bg-[#0b2d54] p-6 text-white shadow-lg sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-xl font-bold ring-1 ring-white/20">
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                  <div className="absolute bottom-1 right-1 rounded-full bg-[#24c1c4] p-1 text-[#0b2d54]">
                    <Camera className="h-3 w-3" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#bff8f7]">
                    <UserRound className="h-3.5 w-3.5" />
                    My profile
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Personal profile</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                    One place for your personal identity and baseline health information. Account security belongs in Settings; clinical records remain in Health Records.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Patient number</p>
                <p className="mt-1 font-mono text-sm font-semibold text-white">{patientNumber || "Not assigned yet"}</p>
                <p className="mt-1 text-xs text-slate-300">Read-only identifier</p>
              </div>
            </div>
          </header>

          {loading ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading your profile…</div>
          ) : (
            <div className="mt-5 space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-[#0b2d54]">Identity & contact</h2>
                    <p className="mt-1 text-sm text-slate-500">These values come from your persisted Person and User records. Email and phone are managed as account-level information.</p>
                  </div>
                  <Link href="/settings" className="text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]">Manage account →</Link>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["First name", firstName],
                    ["Middle name", middleName],
                    ["Last name", lastName],
                    ["Preferred name", preferredName],
                    ["Email", email],
                    ["Phone", phone],
                    ["Country", countryName],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-1 break-words font-medium text-slate-800">{value || "Not recorded yet"}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-[#24c1c4]/10 p-2 text-[#0b2d54]"><MapPin className="h-5 w-5" /></div>
                  <div>
                    <h2 className="font-semibold text-[#0b2d54]">Address</h2>
                    <p className="mt-1 text-sm text-slate-500">Your primary address recorded during sign-up. It is shown from the persisted PersonAddress record, not recreated in the frontend.</p>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  {addressParts.length ? (
                    <p className="leading-7 text-slate-800">{addressParts.join(", ")}</p>
                  ) : (
                    <p className="text-sm text-slate-500">No primary address has been recorded yet. Once address information is saved to your account, it will appear here automatically.</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-[#0b2d54]">Personal details</h2>
                <p className="mt-1 text-sm text-slate-500">These are the personal profile fields currently supported by the onboarding profile API.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Preferred name</span>
                    <input value={form.preferredName} onChange={(e) => set("preferredName", e.target.value)} placeholder="Add a preferred name" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none transition focus:border-[#24c1c4] focus:ring-2 focus:ring-[#24c1c4]/10" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Date of birth</span>
                    <input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none transition focus:border-[#24c1c4] focus:ring-2 focus:ring-[#24c1c4]/10" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Gender</span>
                    <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-[#24c1c4] focus:ring-2 focus:ring-[#24c1c4]/10">
                      <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                      <option value="FEMALE">Female</option>
                      <option value="MALE">Male</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-[#0b2d54]">Health profile basics</h2>
                <p className="mt-1 text-sm text-slate-500">Baseline information stored against the Patient and Health Passport records. Nothing is invented when a value is missing.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label><span className="text-sm font-medium text-slate-700">Height (cm)</span><input type="number" min="0" value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} placeholder="Not recorded" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#24c1c4]" /></label>
                  <label><span className="text-sm font-medium text-slate-700">Weight (kg)</span><input type="number" min="0" value={form.weightKg} onChange={(e) => set("weightKg", e.target.value)} placeholder="Not recorded" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#24c1c4]" /></label>
                  <label><span className="text-sm font-medium text-slate-700">Blood type</span><input value={form.bloodType} onChange={(e) => set("bloodType", e.target.value)} placeholder="Not recorded" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#24c1c4]" /></label>
                  <label><span className="text-sm font-medium text-slate-700">Rhesus factor</span><input value={form.rhesusFactor} onChange={(e) => set("rhesusFactor", e.target.value)} placeholder="Not recorded" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#24c1c4]" /></label>
                  <label><span className="text-sm font-medium text-slate-700">Dominant hand</span><select value={form.dominantHand} onChange={(e) => set("dominantHand", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#24c1c4]"><option value="">Not recorded</option><option value="LEFT">Left</option><option value="RIGHT">Right</option><option value="AMBIDEXTROUS">Ambidextrous</option></select></label>
                  <label><span className="text-sm font-medium text-slate-700">Occupation</span><input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} placeholder="Not recorded" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#24c1c4]" /></label>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-[#0b2d54]">Lifestyle context</h2>
                <p className="mt-1 text-sm text-slate-500">Optional information used by the health experience. Empty fields stay empty until the user provides real information.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label><span className="text-sm font-medium text-slate-700">Smoking</span><select value={form.smokingStatus} onChange={(e) => set("smokingStatus", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#24c1c4]"><option value="">Not recorded</option><option value="NEVER">Never</option><option value="FORMER">Former</option><option value="OCCASIONAL">Occasional</option><option value="DAILY">Daily</option></select></label>
                  <label><span className="text-sm font-medium text-slate-700">Alcohol</span><select value={form.alcoholConsumption} onChange={(e) => set("alcoholConsumption", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#24c1c4]"><option value="">Not recorded</option><option value="NEVER">Never</option><option value="OCCASIONAL">Occasional</option><option value="WEEKLY">Weekly</option><option value="DAILY">Daily</option></select></label>
                  <label><span className="text-sm font-medium text-slate-700">Exercise frequency</span><select value={form.exerciseFrequency} onChange={(e) => set("exerciseFrequency", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#24c1c4]"><option value="">Not recorded</option><option value="NONE">None</option><option value="ONCE_PER_WEEK">Once per week</option><option value="TWO_TO_THREE_PER_WEEK">2–3 times/week</option><option value="FOUR_TO_FIVE_PER_WEEK">4–5 times/week</option><option value="DAILY">Daily</option></select></label>
                </div>
              </section>

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#24c1c4]" />
                  <p className="max-w-2xl text-sm leading-6 text-slate-500">Saving this page writes through the existing onboarding profile endpoints, so Patient and Health Passport values stay in their respective backend tables. Account identity remains managed separately.</p>
                </div>
                <button onClick={save} disabled={saving} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 font-semibold text-white transition hover:bg-[#123e6d] disabled:cursor-not-allowed disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving…" : "Save profile"}
                </button>
              </div>

              {message && <div className="rounded-xl border border-[#24c1c4]/30 bg-[#24c1c4]/10 px-4 py-3 text-sm text-[#0b2d54]">{message}</div>}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
