"use client";

import Link from 'next/link';
import { ArrowLeft, Save, Settings, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/protected-route';
import { authService } from '@/services/auth.service';
import { healthPassportService } from '@/services/health-passport.service';
import { onboardingService } from '@/services/onboarding.service';

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
  preferredName: '',
  dateOfBirth: '',
  gender: 'PREFER_NOT_TO_SAY',
  heightCm: '',
  weightKg: '',
  bloodType: '',
  rhesusFactor: '',
  dominantHand: '',
  occupation: '',
  smokingStatus: '',
  alcoholConsumption: '',
  exerciseFrequency: '',
};

function valueOf(source: Record<string, unknown> | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return '';
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [account, setAccount] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    Promise.all([healthPassportService.getHealthPassport(), authService.me()])
      .then(([dashboard, me]) => {
        const profile = dashboard.profile ?? {};
        const patient = dashboard.patient ?? {};
        const user = (me ?? {}) as Record<string, unknown>;
        setAccount(user);

        setForm({
          preferredName: valueOf(profile, 'preferredName', 'firstName') || valueOf(patient, 'preferredName', 'firstName'),
          dateOfBirth: valueOf(profile, 'dateOfBirth').slice(0, 10) || valueOf(patient, 'dateOfBirth').slice(0, 10),
          gender: valueOf(profile, 'gender') || valueOf(patient, 'gender') || 'PREFER_NOT_TO_SAY',
          heightCm: valueOf(profile, 'heightCm') || valueOf(patient, 'heightCm'),
          weightKg: valueOf(profile, 'weightKg') || valueOf(patient, 'weightKg'),
          bloodType: valueOf(profile, 'bloodType') || valueOf(patient, 'bloodType'),
          rhesusFactor: valueOf(profile, 'rhesusFactor') || valueOf(patient, 'rhesusFactor'),
          dominantHand: valueOf(profile, 'dominantHand') || valueOf(patient, 'dominantHand'),
          occupation: valueOf(profile, 'occupation') || valueOf(patient, 'occupation'),
          smokingStatus: valueOf(profile, 'smokingStatus') || valueOf(patient, 'smokingStatus'),
          alcoholConsumption: valueOf(profile, 'alcoholConsumption') || valueOf(patient, 'alcoholConsumption'),
          exerciseFrequency: valueOf(profile, 'exerciseFrequency') || valueOf(patient, 'exerciseFrequency'),
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
      setMessage('');
      await onboardingService.updateProfile({
        preferredName: form.preferredName || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY',
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
      setMessage('Your profile has been updated.');
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "We couldn't update your profile.");
    } finally {
      setSaving(false);
    }
  }

  const firstName = valueOf(account, 'firstName') || valueOf(account?.person as Record<string, unknown> | undefined, 'firstName');
  const lastName = valueOf(account, 'lastName') || valueOf(account?.person as Record<string, unknown> | undefined, 'lastName');
  const email = valueOf(account, 'email');
  const phone = valueOf(account, 'phoneNumber');

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#0b2d54] hover:text-[#24c1c4]">
              <ArrowLeft className="h-4 w-4" />
              Health Home
            </Link>
            <Link href="/settings" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#0b2d54] hover:border-[#24c1c4]">
              <Settings className="h-4 w-4" />
              Account settings
            </Link>
          </div>

          <div className="mb-8 mt-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-semibold text-[#0b2d54]">
              <UserRound className="h-3.5 w-3.5" />
              My profile
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0b2d54] sm:text-4xl">Personal profile</h1>
            <p className="mt-2 max-w-3xl text-slate-500">
              This is the place for information about you as a person. Account security and preferences remain in Settings, while clinical records such as conditions, medications and allergies remain in Health Records.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your profile…</div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h2 className="font-semibold text-[#0b2d54]">Identity & contact</h2>
                  <p className="mt-1 text-sm text-slate-500">Your account identity comes from your registered account. Use Account settings for account-level changes.</p>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">First name</p><p className="mt-1 font-medium text-slate-800">{firstName || 'Not recorded yet'}</p></div>
                  <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last name</p><p className="mt-1 font-medium text-slate-800">{lastName || 'Not recorded yet'}</p></div>
                  <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</p><p className="mt-1 font-medium text-slate-800 break-all">{email || 'Not recorded yet'}</p></div>
                  <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</p><p className="mt-1 font-medium text-slate-800">{phone || 'Not recorded yet'}</p></div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-[#0b2d54]">Personal details</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="text-sm font-medium text-slate-700">Preferred name</span><input value={form.preferredName} onChange={(e) => set('preferredName', e.target.value)} placeholder="Add a preferred name" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#24c1c4]" /></label>
                  <label className="block"><span className="text-sm font-medium text-slate-700">Date of birth</span><input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#24c1c4]" /></label>
                  <label className="block sm:col-span-2"><span className="text-sm font-medium text-slate-700">Gender</span><select value={form.gender} onChange={(e) => set('gender', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#24c1c4]"><option value="PREFER_NOT_TO_SAY">Prefer not to say</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option></select></label>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-[#0b2d54]">Health profile basics</h2>
                <p className="mt-1 text-sm text-slate-500">Baseline information about your body and everyday context. This is not your clinical record.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label><span className="text-sm font-medium text-slate-700">Height (cm)</span><input type="number" min="0" value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)} placeholder="Not recorded" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#24c1c4]" /></label>
                  <label><span className="text-sm font-medium text-slate-700">Weight (kg)</span><input type="number" min="0" value={form.weightKg} onChange={(e) => set('weightKg', e.target.value)} placeholder="Not recorded" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#24c1c4]" /></label>
                  <label><span className="text-sm font-medium text-slate-700">Blood type</span><input value={form.bloodType} onChange={(e) => set('bloodType', e.target.value)} placeholder="Not recorded" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#24c1c4]" /></label>
                  <label><span className="text-sm font-medium text-slate-700">Rhesus factor</span><input value={form.rhesusFactor} onChange={(e) => set('rhesusFactor', e.target.value)} placeholder="Not recorded" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#24c1c4]" /></label>
                  <label><span className="text-sm font-medium text-slate-700">Dominant hand</span><select value={form.dominantHand} onChange={(e) => set('dominantHand', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#24c1c4]"><option value="">Not recorded</option><option value="LEFT">Left</option><option value="RIGHT">Right</option><option value="AMBIDEXTROUS">Ambidextrous</option></select></label>
                  <label><span className="text-sm font-medium text-slate-700">Occupation</span><input value={form.occupation} onChange={(e) => set('occupation', e.target.value)} placeholder="Not recorded" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#24c1c4]" /></label>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-[#0b2d54]">Lifestyle context</h2>
                <p className="mt-1 text-sm text-slate-500">Optional information that can help Sympto understand your health context and personalise insights.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label><span className="text-sm font-medium text-slate-700">Smoking</span><select value={form.smokingStatus} onChange={(e) => set('smokingStatus', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#24c1c4]"><option value="">Not recorded</option><option value="NEVER">Never</option><option value="FORMER">Former</option><option value="OCCASIONAL">Occasional</option><option value="DAILY">Daily</option></select></label>
                  <label><span className="text-sm font-medium text-slate-700">Alcohol</span><select value={form.alcoholConsumption} onChange={(e) => set('alcoholConsumption', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#24c1c4]"><option value="">Not recorded</option><option value="NEVER">Never</option><option value="OCCASIONAL">Occasional</option><option value="WEEKLY">Weekly</option><option value="DAILY">Daily</option></select></label>
                  <label><span className="text-sm font-medium text-slate-700">Exercise frequency</span><select value={form.exerciseFrequency} onChange={(e) => set('exerciseFrequency', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#24c1c4]"><option value="">Not recorded</option><option value="NONE">None</option><option value="ONCE_PER_WEEK">Once per week</option><option value="TWO_TO_THREE_PER_WEEK">2–3 times/week</option><option value="FOUR_TO_FIVE_PER_WEEK">4–5 times/week</option><option value="DAILY">Daily</option></select></label>
                </div>
              </section>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">Health records, emergency contacts, family management and Journal settings have their own dedicated areas so the same information is not managed twice.</p>
                <button onClick={save} disabled={saving} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
              {message && <p className="rounded-xl bg-[#24c1c4]/10 px-4 py-3 text-sm font-medium text-[#0b2d54]">{message}</p>}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
