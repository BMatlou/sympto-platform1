"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, UserPlus, Users, X } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useDashboard } from "@/hooks/use-dashboard";
import api from "@/services/api";

export default function FamilyPage() {
  const { data, loading, reload } = useDashboard();
  const family = data?.family ?? [];
  const [open, setOpen] = useState(false);
  const [memberPatientId, setMemberPatientId] = useState("");
  const [relationship, setRelationship] = useState("");
  const [canViewRecords, setCanViewRecords] = useState(true);
  const [canManageAppointments, setCanManageAppointments] = useState(false);
  const [canReceiveAlerts, setCanReceiveAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addFamilyMember = async () => {
    const ownerPatientId = String(data?.patient?.id ?? "");
    if (!ownerPatientId || !memberPatientId.trim() || !relationship.trim()) {
      setError("Enter the family member's Sympto patient ID and your relationship to them.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await api.post("/family/link", {
        ownerPatientId,
        memberPatientId: memberPatientId.trim(),
        relationship: relationship.trim(),
        canViewRecords,
        canManageAppointments,
        canReceiveAlerts,
      });
      setOpen(false);
      setMemberPatientId("");
      setRelationship("");
      await reload();
    } catch (requestError) {
      console.error("Failed to add family member:", requestError);
      setError("We couldn't add this family member. Check the patient ID and your permissions, then try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f7f9fc]">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#0b2d54] hover:text-[#24c1c4]"><ArrowLeft className="h-4 w-4" />Back to My Health</Link>
            <Link href="/settings" className="text-sm font-semibold text-[#0b2d54] hover:text-[#24c1c4]">Settings</Link>
          </div>
          <div className="mt-6 rounded-3xl border border-[#24c1c4]/20 bg-gradient-to-br from-[#24c1c4]/10 via-white to-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#24c1c4]/10 text-[#0b2d54]"><Users className="h-6 w-6" /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-[#24c1c4]">Care circle</p><h1 className="text-2xl font-bold text-[#0b2d54]">Family</h1><p className="text-sm text-slate-500">People whose health information you manage.</p></div></div>
              <button type="button" onClick={() => { setError(""); setOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2d54] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#071f3a]"><UserPlus className="h-4 w-4" />Add family member</button>
            </div>
          </div>
          {loading ? <div className="mt-6 rounded-2xl bg-white p-6 text-sm text-slate-500">Loading family members…</div> : family.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center"><Users className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-4 font-semibold text-[#0b2d54]">No family members yet</p><p className="mt-1 text-sm text-slate-500">Add someone you are authorised to manage and choose what you can do on their behalf.</p></div> : <div className="mt-6 grid gap-4 sm:grid-cols-2">{family.map((member) => <div key={String(member.id)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{String(member.name ?? "Family member")}</p><p className="mt-1 text-sm text-slate-500">{String(member.relationship ?? "Relationship not specified")}</p></div>{member.canReceiveAlerts && <CheckCircle2 className="h-5 w-5 text-[#24c1c4]" />}</div><div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">{member.canViewRecords && <span className="rounded-full bg-[#24c1c4]/10 px-2.5 py-1 text-[#0b2d54]">Can view records</span>}{member.canManageAppointments && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Can manage appointments</span>}{member.canReceiveAlerts && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Receives alerts</span>}</div></div>)}</div>}
        </div>

        {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="family-dialog-title"><div className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#24c1c4]">Care circle</p><h2 id="family-dialog-title" className="mt-1 text-xl font-bold text-[#0b2d54]">Add family member</h2><p className="mt-1 text-sm leading-5 text-slate-500">The person must already have a Sympto patient record that you are authorised to manage.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button></div><div className="mt-6 space-y-4"><label className="block"><span className="text-sm font-semibold text-slate-700">Sympto patient ID</span><input value={memberPatientId} onChange={(event) => setMemberPatientId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#24c1c4] focus:ring-2 focus:ring-[#24c1c4]/20" placeholder="Enter their patient ID" /></label><label className="block"><span className="text-sm font-semibold text-slate-700">Relationship</span><input value={relationship} onChange={(event) => setRelationship(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#24c1c4] focus:ring-2 focus:ring-[#24c1c4]/20" placeholder="e.g. Mother, child, spouse" /></label><div className="space-y-3 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Permissions</p>{[[canViewRecords, setCanViewRecords, "Can view health records"], [canManageAppointments, setCanManageAppointments, "Can manage appointments"] , [canReceiveAlerts, setCanReceiveAlerts, "Can receive health alerts"]].map(([value, setter, label]) => <label key={String(label)} className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" checked={Boolean(value)} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} className="h-4 w-4 accent-[#24c1c4]" />{String(label)}</label>)}</div>{error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<div className="flex gap-3 pt-2"><button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Cancel</button><button type="button" onClick={addFamilyMember} disabled={saving} className="flex-1 rounded-xl bg-[#0b2d54] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Adding…" : "Add family member"}</button></div></div></div></div>}
      </main>
    </ProtectedRoute>
  );
}
