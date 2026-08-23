"use client";

import { useState } from "react";
import { Bell, Check, Clock3, X } from "lucide-react";
import { api } from "@/lib/api";

interface MedicationReminderButtonProps {
  medicationId: string;
  medicationName: string;
  dosage?: string | null;
}

function defaultReminderTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

export function MedicationReminderButton({ medicationId, medicationName, dosage }: MedicationReminderButtonProps) {
  const [open, setOpen] = useState(false);
  const [scheduledFor, setScheduledFor] = useState(defaultReminderTime);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scheduleReminder() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/patient-medications/${medicationId}/reminder`, {
        scheduledFor: new Date(scheduledFor).toISOString(),
        channel: "IN_APP",
      });
      setSaved(true);
      setTimeout(() => setOpen(false), 900);
    } catch (err: any) {
      setError(err?.response?.data?.message || "We could not schedule the reminder. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="relative mt-4">
    <button type="button" onClick={() => { setOpen(true); setSaved(false); setError(null); }} className="inline-flex items-center gap-2 rounded-xl border border-[#24c1c4]/30 bg-[#24c1c4]/5 px-3 py-2 text-xs font-semibold text-[#0b2d54] hover:bg-[#24c1c4]/10">
      <Bell className="h-3.5 w-3.5" />Set reminder
    </button>
    {open && <div className="absolute right-0 top-12 z-20 w-[min(20rem,calc(100vw-3rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#0b2d54]">Medication reminder</p><p className="mt-1 text-xs leading-5 text-slate-500">{medicationName}{dosage ? ` · ${dosage}` : ""}</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close reminder"><X className="h-4 w-4" /></button></div>
      <label className="mt-4 block text-xs font-semibold text-slate-700">Remind me at<div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><Clock3 className="h-4 w-4 text-slate-400" /><input type="datetime-local" value={scheduledFor} min={defaultReminderTime()} onChange={(event) => setScheduledFor(event.target.value)} className="w-full bg-transparent text-sm text-slate-800 outline-none" /></div></label>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <button type="button" disabled={saving || saved} onClick={scheduleReminder} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#071f3a] disabled:cursor-not-allowed disabled:opacity-60">{saved ? <><Check className="h-4 w-4" />Reminder scheduled</> : saving ? "Scheduling..." : "Schedule reminder"}</button>
      <p className="mt-3 text-[11px] leading-4 text-slate-400">Sympto records the reminder in your notification queue. Delivery channels follow your notification preferences.</p>
    </div>}
  </div>;
}
