"use client";

import { CheckCircle2 } from "lucide-react";

function formatDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export interface PatientImmunizationCardRecord {
  id?: string;
  name?: string | null;
  administeredAt?: string | null;
  doseNumber?: number | null;
  nextDueDate?: string | null;
}

export function PatientImmunizationList({ records }: { records: PatientImmunizationCardRecord[] }) {
  if (!records.length) return null;

  return (
    <div className="mt-3 rounded-2xl bg-[#f5f8fb] p-4 ring-1 ring-[#24c1c4]/10">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-[#24c1c4]" />
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Vaccinations</p>
      </div>
      <div className="mt-3 space-y-2">
        {records.slice(0, 4).map((record, index) => (
          <div key={record.id ?? `${record.name ?? "vaccine"}-${index}`} className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-sm font-extrabold text-[#0b2d54]">{record.name || "Vaccination"}</p>
              {record.doseNumber != null && <span className="shrink-0 text-[11px] font-bold text-slate-500">Dose {record.doseNumber}</span>}
            </div>
            {record.administeredAt && <p className="mt-1 text-xs font-medium text-slate-500">Given {formatDate(record.administeredAt)}</p>}
            {record.nextDueDate && <p className="mt-0.5 text-xs font-bold text-[#0b2d54]">Next due {formatDate(record.nextDueDate)}</p>}
          </div>
        ))}
      </div>
      {records.length > 4 && <p className="mt-2 text-xs font-bold text-slate-500">+{records.length - 4} more vaccination{records.length - 4 === 1 ? "" : "s"}</p>}
    </div>
  );
}
