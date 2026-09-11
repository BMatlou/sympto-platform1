"use client";

import Link from "next/link";
import { ArrowRight, Droplets, HeartPulse, ShieldCheck } from "lucide-react";

type Props = {
  patient?: any;
  profile?: any;
  healthPassport?: any;
  healthSnapshot?: any;
  medicalRecord?: any;
  allergies?: any[];
  conditions?: any[];
  medications?: any[];
  emergencyContacts?: any[];
};

function text(value: unknown, fallback = "Not recorded") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function label(value: unknown) {
  return text(value).toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function names(items: any[], path: string) {
  return items
    .map((item) => path === "allergy" ? item?.allergy?.name ?? item?.name : path === "condition" ? item?.condition?.name ?? item?.name : item?.medication?.name ?? item?.name)
    .filter(Boolean);
}

function Chips({ values, empty }: { values: string[]; empty: string }) {
  if (!values.length) return <p className="text-xs font-medium text-slate-500">{empty}</p>;
  return <div className="flex flex-wrap gap-2">{values.slice(0, 4).map((value) => <span key={value} className="rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-[#0b2d54] ring-1 ring-slate-200">{value}</span>)}{values.length > 4 && <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">+{values.length - 4} more</span>}</div>;
}

export default function ClinicCardSummary({ patient, profile, healthPassport, healthSnapshot, medicalRecord, allergies = [], conditions = [], medications = [], emergencyContacts = [] }: Props) {
  const bloodType = healthPassport?.bloodType ?? healthSnapshot?.bloodType ?? medicalRecord?.bloodType;
  const rhesusFactor = healthPassport?.rhesusFactor ?? healthSnapshot?.rhesusFactor;
  const firstName = profile?.preferredName || profile?.firstName || patient?.firstName || "Patient";
  const fullName = [firstName, profile?.lastName || patient?.lastName].filter(Boolean).join(" ");
  const emergency = emergencyContacts.find((contact) => contact?.isPrimary) ?? emergencyContacts[0];

  return (
    <section className="mt-7 overflow-hidden rounded-[30px] border border-[#dfeaed] bg-white shadow-[0_10px_32px_rgba(11,45,84,0.045)]">
      <div className="bg-gradient-to-r from-[#0b2d54] to-[#174a76] px-5 py-5 text-white sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/65"><ShieldCheck className="h-4 w-4" /> My Clinic Card</div>
            <h2 className="mt-2 text-xl font-black tracking-[-0.03em]">{fullName}</h2>
            <p className="mt-1 text-[11px] text-white/65">Patient number: {text(patient?.patientNumber)}</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10"><HeartPulse className="h-5 w-5" /></div>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-rose-50/70 p-4 ring-1 ring-rose-100">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-rose-600">Allergies</p>
          <div className="mt-3"><Chips values={names(allergies, "allergy")} empty="No active allergies recorded" /></div>
        </div>

        <div className="rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-100">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-700">Conditions</p>
          <div className="mt-3"><Chips values={names(conditions, "condition")} empty="No active conditions recorded" /></div>
        </div>

        <div className="rounded-2xl bg-[#f3f8fc] p-4 ring-1 ring-[#dfeaed]">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#71839a]">Blood &amp; safety</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div><p className="text-[9px] font-bold text-slate-400">Blood</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{label(bloodType)}</p></div>
            <div><p className="text-[9px] font-bold text-slate-400">Rhesus</p><p className="mt-1 text-sm font-black text-[#0b2d54]">{label(rhesusFactor)}</p></div>
          </div>
          {emergency && <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-slate-500"><Droplets className="h-3.5 w-3.5" /> Emergency contact saved</div>}
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#71839a]">Current medicines</p><p className="mt-1 text-xs font-semibold text-slate-600">{medications.length ? `${medications.length} active medication${medications.length === 1 ? "" : "s"} on record` : "No active medicines recorded"}</p></div>
          <Link href="/health-passport" className="inline-flex items-center justify-center gap-2 text-[11px] font-black text-[#0b2d54]">Open Clinic Card <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </div>
    </section>
  );
}
