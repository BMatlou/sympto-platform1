
"use client";

import { Check, Pill, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { healthJournalService } from "@/services/health-journal.service";

type PickerValue = {
  medicationId?: string;
  reportedMedicationName?: string;
  medicationImproved?: boolean;
};

type Props = {
  activeMedications?: any[];
  recentMedications?: any[];
  value: PickerValue;
  onChange: (value: PickerValue) => void;
};

function medicationName(medication: any) {
  return String(
    medication?.reportedMedicationName ||
      medication?.medication?.name ||
      medication?.medication?.genericName ||
      medication?.medication?.brandName ||
      medication?.name ||
      "",
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

function mergeMedicines(...groups: any[][]) {
  const seen = new Set<string>();
  const merged: any[] = [];

  for (const group of groups) {
    for (const item of group) {
      const id = medicationId(item);
      const name = medicationName(item);
      const key = id ? "id:" + id : "name:" + name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  return merged;
}

export default function SymptomMedicationPicker({
  activeMedications = [],
  recentMedications = [],
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
      activeMedications.find(
        (item) => medicationId(item) === String(value.medicationId ?? ""),
      ) ?? null,
    [activeMedications, value.medicationId],
  );

  const selectedLabel =
    value.reportedMedicationName?.trim() || medicationName(currentMedication);

  const quickMedicines = useMemo(
    () => mergeMedicines(recentMedications, activeMedications),
    [recentMedications, activeMedications],
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
        setResults(await healthJournalService.searchMedicationReference(term, 10));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 220);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const clearSelection = () => {
    setQuery("");
    setResults([]);
    onChange({});
  };

  const choose = (item: any, reported = false) => {
    const id = medicationId(item);
    const name = medicationName(item);

    setQuery("");
    setResults([]);
    setOpen(false);

    if (id && !reported) {
      onChange({
        ...value,
        medicationId: id,
        reportedMedicationName: undefined,
      });
      return;
    }

    onChange({
      ...value,
      medicationId: undefined,
      reportedMedicationName: name || undefined,
    });
  };

  const chooseReference = (item: any) => {
    const id = medicationId(item);
    const activeMatch = activeMedications.some(
      (candidate) => medicationId(candidate) === id,
    );
    choose(item, !activeMatch);
  };

  return (
    <section className="rounded-[24px] border border-[#dfeaec] bg-white p-4 shadow-[0_8px_28px_rgba(11,45,84,0.035)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80]">
          <Pill className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#0b2d54]">Medicine taken</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Search by name, or choose a medicine you already use or previously recorded for this symptom.
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="flex items-center gap-2 rounded-[18px] border-2 border-slate-200 bg-white px-3.5 shadow-sm focus-within:border-[#24c1c4] focus-within:ring-4 focus-within:ring-[#24c1c4]/10">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            autoComplete="off"
            placeholder="Search medicine"
            className="min-h-12 min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-[#0b2d54] outline-none placeholder:text-slate-400"
          />
          {searching && (
            <span className="text-[10px] font-bold text-slate-400">Searching…</span>
          )}
        </div>

        {open && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(11,45,84,0.12)]">
            {query.trim().length < 2 && quickMedicines.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Recently used
                </p>
                {quickMedicines.slice(0, 8).map((item) => {
                  const id = medicationId(item);
                  const isCurrent = activeMedications.some(
                    (candidate) => medicationId(candidate) === id,
                  );
                  const isReported = Boolean(item?.reportedMedicationName) && !id;

                  return (
                    <button
                      key={id || medicationName(item)}
                      type="button"
                      onClick={() => choose(item, isReported)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#24c1c4]/5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-[#0b2d54]">
                          {medicationName(item)}
                        </span>
                        <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                          {isReported ? "Recorded for this symptom" : isCurrent ? "Current medicine" : "Previously recorded"}
                        </span>
                      </span>
                      <ArrowHint />
                    </button>
                  );
                })}
              </div>
            )}

            {results.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Sympto medicine library
                </p>
                {results.map((item) => {
                  const id = medicationId(item);
                  const active = activeMedications.some(
                    (candidate) => medicationId(candidate) === id,
                  );

                  return (
                    <button
                      key={String(item.id)}
                      type="button"
                      onClick={() => chooseReference(item)}
                      className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#24c1c4]/5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-[#0b2d54]">
                          {medicationName(item)}
                        </span>
                        <span className="mt-1 block text-[10px] text-slate-400">
                          {item.genericName
                            ? String(item.genericName)
                            : item.category
                              ? String(item.category)
                              : "Medicine reference"}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">
                        {active ? "Current" : "Report"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-sm font-bold text-[#0b2d54]">No medicine found</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  You can still record the medicine exactly as you know it.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const name = query.trim();
                    setOpen(false);
                    onChange({ ...value, medicationId: undefined, reportedMedicationName: name });
                  }}
                  className="mt-3 rounded-xl bg-[#0b2d54] px-3.5 py-2.5 text-[10px] font-black text-white"
                >
                  Record “{query.trim()}”
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedLabel ? (
        <div className="mt-4 rounded-[18px] bg-[#f7fbfb] p-3.5 ring-1 ring-[#dfeaec]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#0b2d54]">{selectedLabel}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                {currentMedication ? "Linked to your medication" : "Patient-reported"}
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-white"
              aria-label="Clear medicine"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
              Did it help?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["", "Not sure"],
                ["YES", "Helped"],
                ["NO", "No help"],
              ].map(([key, label]) => {
                const active =
                  (value.medicationImproved === true && key === "YES") ||
                  (value.medicationImproved === false && key === "NO") ||
                  (value.medicationImproved == null && key === "");

                return (
                  <button
                    key={key || "unknown"}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onChange({
                        ...value,
                        medicationImproved:
                          key === "YES" ? true : key === "NO" ? false : undefined,
                      })
                    }
                    className={"min-h-11 rounded-xl border text-[10px] font-black transition " + (active ? "border-[#24c1c4] bg-[#24c1c4]/10 text-[#0b2d54]" : "border-slate-200 bg-white text-slate-500 hover:border-[#24c1c4]/40")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ArrowHint() {
  return <Check className="h-4 w-4 shrink-0 text-[#24c1c4]" />;
}
