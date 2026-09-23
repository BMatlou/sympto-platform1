"use client";

import { Check, Pill, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { healthJournalService } from "@/services/health-journal.service";

type PickerValue = {
  medicationId?: string;
  reportedMedicationName?: string;
};

type Props = {
  activeMedications?: any[];
  value: PickerValue;
  onChange: (value: PickerValue) => void;
};

function medicationName(medication: any) {
  return String(
    medication?.medication?.name ||
      medication?.medication?.genericName ||
      medication?.medication?.brandName ||
      medication?.name ||
      "Medicine",
  ).trim();
}

function medicationId(medication: any) {
  return String(
    medication?.medicationId ||
      medication?.medication?.id ||
      medication?.patientMedication?.medicationId ||
      "",
  ).trim();
}

export default function SymptomMedicationPicker({
  activeMedications = [],
  value,
  onChange,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentMedication = useMemo(
    () =>
      activeMedications.find((item) => medicationId(item) === String(value.medicationId ?? "")) ?? null,
    [activeMedications, value.medicationId],
  );

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        setSearching(true);
        const records = await healthJournalService.searchMedicationReference(term, 10);
        setResults(records);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const selectedLabel = value.reportedMedicationName?.trim() || medicationName(currentMedication);

  function clearSelection() {
    setQuery("");
    setResults([]);
    setOpen(false);
    onChange({});
  }

  function chooseActive(item: any) {
    const id = medicationId(item);
    if (!id) return;
    setQuery("");
    setResults([]);
    setOpen(false);
    onChange({ medicationId: id });
  }

  function chooseLibrary(item: any) {
    const name = medicationName(item);
    const id = medicationId(item);
    const activeMatch = activeMedications.find((active) => medicationId(active) === id);
    setQuery("");
    setResults([]);
    setOpen(false);
    onChange(activeMatch && id ? { medicationId: id } : { reportedMedicationName: name });
  }

  return (
    <section className="rounded-[24px] border border-[#dfeaec] bg-white p-4 shadow-[0_8px_28px_rgba(11,45,84,0.035)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80]">
          <Pill className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#0b2d54]">Did you take any medicine?</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Search your medicines or Sympto&apos;s reference library. This is recorded as context, not proof that the medicine caused or treated the symptom.
          </p>
        </div>
        {selectedLabel && (
          <button
            type="button"
            onClick={clearSelection}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-[#0b2d54]"
            aria-label="Clear medicine"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {selectedLabel ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[18px] bg-[#f7fbfb] p-3.5 ring-1 ring-[#dfeaec]">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#0b2d54]">{selectedLabel}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              {currentMedication ? "From your medications" : "Reported medicine"}
            </p>
          </div>
          <Check className="h-4 w-4 shrink-0 text-[#24aeb3]" />
        </div>
      ) : (
        <div className="relative mt-4">
          <div className="flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3.5 shadow-sm focus-within:border-[#24c1c4] focus-within:ring-4 focus-within:ring-[#24c1c4]/10">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search medicine name"
              className="min-h-12 min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-[#0b2d54] outline-none placeholder:text-slate-400"
            />
            {searching && <span className="text-[10px] font-bold text-slate-400">Searching…</span>}
          </div>

          {open && (
            <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(11,45,84,0.12)]">
              {activeMedications.length > 0 && (
                <div className="border-b border-slate-100 p-2">
                  <p className="px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Your medicines</p>
                  {activeMedications.slice(0, 5).map((item) => {
                    const id = medicationId(item);
                    return (
                      <button
                        key={id || medicationName(item)}
                        type="button"
                        onClick={() => chooseActive(item)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-[#24c1c4]/5"
                      >
                        <span className="text-sm font-bold text-[#0b2d54]">{medicationName(item)}</span>
                        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-[#0b7b80]">Current</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {results.length > 0 ? (
                <div className="p-2">
                  <p className="px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Sympto medicine library</p>
                  {results.map((item) => {
                    const id = medicationId(item);
                    const active = activeMedications.some((candidate) => medicationId(candidate) === id);
                    return (
                      <button
                        key={String(item.id)}
                        type="button"
                        onClick={() => chooseLibrary(item)}
                        className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#24c1c4]/5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-[#0b2d54]">{medicationName(item)}</span>
                          <span className="mt-1 block text-[10px] text-slate-400">
                            {item.genericName ? String(item.genericName) : item.category ? String(item.category) : "Medicine reference"}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">
                          {active ? "Current" : "Report"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : query.trim().length >= 2 && !searching ? (
                <div className="p-4 text-center">
                  <p className="text-sm font-bold text-[#0b2d54]">No medicine found</p>
                  <p className="mt-1 text-[11px] text-slate-500">Try the name on the packet, or keep the medicine unlisted.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const name = query.trim();
                      setOpen(false);
                      onChange({ reportedMedicationName: name });
                    }}
                    className="mt-3 rounded-xl bg-[#0b2d54] px-3.5 py-2.5 text-[10px] font-black text-white"
                  >
                    Record “{query.trim()}”
                  </button>
                </div>
              ) : (
                <div className="p-4 text-[11px] leading-5 text-slate-500">
                  Start typing to search the medicine library.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedLabel && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select
            value={(value as any).medicationImproved ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                medicationImproved: event.target.value || undefined,
              } as PickerValue & { medicationImproved?: string })
            }
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#0b2d54]"
          >
            <option value="">Did it help?</option>
            <option value="YES">Yes, it helped</option>
            <option value="NO">No improvement</option>
          </select>
        </div>
      )}
    </section>
  );
}
