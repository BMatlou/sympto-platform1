
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
  // Kept for compatibility with existing callers. Search must never use this list.
  activeMedications?: any[];
  // MedicationEffect rows already recorded against this symptom.
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
      medication?.id ||
      "",
  ).trim();
}

function medicineDate(medicine: any) {
  const raw =
    medicine?.createdAt ??
    medicine?.improvementObservedAt ??
    medicine?.startedMedicationAt ??
    medicine?.observedAt ??
    null;

  if (!raw) return "Date not recorded";

  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) return "Date not recorded";

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function medicineOutcome(medicine: any) {
  if (medicine?.improved === true) return "Helped";
  if (medicine?.improved === false) return "No help";

  const effectiveness = Number(medicine?.effectiveness);
  if (Number.isFinite(effectiveness)) return "Effectiveness " + effectiveness + "/10";

  return "Effect recorded";
}

export default function SymptomMedicationPicker({
  activeMedications: _activeMedications = [],
  recentMedications = [],
  value,
  onChange,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedReference, setSelectedReference] = useState<any | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const history = useMemo(() => {
    return recentMedications
      .filter((item) => Boolean(medicationName(item)))
      .slice()
      .sort(
        (a, b) =>
          new Date(
            String(
              a?.createdAt ??
                a?.improvementObservedAt ??
                a?.startedMedicationAt ??
                a?.observedAt ??
                "",
            ),
          ).getTime() -
          new Date(
            String(
              b?.createdAt ??
                b?.improvementObservedAt ??
                b?.startedMedicationAt ??
                b?.observedAt ??
                "",
            ),
          ).getTime(),
      );
  }, [recentMedications]);

  const selectedHistoryMedicine = useMemo(() => {
    const id = String(value.medicationId ?? "");
    const reportedName = String(value.reportedMedicationName ?? "").trim().toLowerCase();

    return (
      history.find((item) => {
        if (id && medicationId(item) === id) return true;
        if (reportedName && medicationName(item).toLowerCase() === reportedName) return true;
        return false;
      }) ?? null
    );
  }, [history, value.medicationId, value.reportedMedicationName]);

  const selectedLabel =
    String(value.reportedMedicationName ?? "").trim() ||
    medicationName(selectedReference) ||
    medicationName(selectedHistoryMedicine);

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
        // This endpoint searches the application's seeded Medication library.
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
    setSelectedReference(null);
    onChange({});
  };

  const choose = (item: any) => {
    const id = medicationId(item);
    const name = medicationName(item);

    setQuery("");
    setResults([]);
    setOpen(false);
    setSelectedReference(item);

    if (id) {
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

  return (
    <section className="rounded-[24px] border border-[#dfeaec] bg-white p-4 shadow-[0_8px_28px_rgba(11,45,84,0.035)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e8f8f7] text-[#0b7b80]">
          <Pill className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#0b2d54]">Medicine taken</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Search Sympto&apos;s medication library to record a medicine used during this update.
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <p className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
          Add medicine for this update
        </p>

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
            placeholder="Search Sympto medications"
            className="min-h-12 min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-[#0b2d54] outline-none placeholder:text-slate-400"
          />
          {searching && (
            <span className="text-[10px] font-bold text-slate-400">Searching…</span>
          )}
        </div>

        {open && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(11,45,84,0.12)]">
            {query.trim().length < 2 ? (
              <div className="p-4">
                <p className="text-sm font-black text-[#0b2d54]">
                  Search the Sympto medication library
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Type at least 2 characters to find a medicine from the medications already seeded in Sympto.
                </p>
              </div>
            ) : results.length > 0 ? (
              <div className="p-2">
                <p className="px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Sympto medication library
                </p>

                {results.map((item) => (
                  <button
                    key={String(item.id)}
                    type="button"
                    onClick={() => choose(item)}
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
                            : "Medication reference"}
                      </span>
                    </span>
                    <Check className="h-4 w-4 shrink-0 text-[#24c1c4]" />
                  </button>
                ))}
              </div>
            ) : !searching ? (
              <div className="p-4 text-center">
                <p className="text-sm font-bold text-[#0b2d54]">No match in the Sympto library</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  You can still record the name exactly as reported.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const name = query.trim();
                    setSelectedReference(null);
                    setOpen(false);
                    onChange({
                      ...value,
                      medicationId: undefined,
                      reportedMedicationName: name,
                    });
                  }}
                  className="mt-3 rounded-xl bg-[#0b2d54] px-3.5 py-2.5 text-[10px] font-black text-white"
                >
                  Record “{query.trim()}”
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {selectedLabel ? (
        <div className="mt-4 rounded-[18px] bg-[#f7fbfb] p-3.5 ring-1 ring-[#dfeaec]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#0b2d54]">{selectedLabel}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                Selected for this update
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
                    className={
                      "min-h-11 rounded-xl border text-[10px] font-black transition " +
                      (active
                        ? "border-[#24c1c4] bg-[#24c1c4]/10 text-[#0b2d54]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-[#24c1c4]/40")
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="mt-5 border-t border-[#e8eff0] pt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#0b2d54]">Medicine history for this symptom</p>
              <p className="mt-1 text-[10px] text-slate-500">
                From the first medicine recorded through the latest update.
              </p>
            </div>
            <span className="rounded-full bg-[#f2f7f7] px-2.5 py-1 text-[9px] font-black text-slate-500">
              {history.length} {history.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <div className="mt-3 space-y-2.5">
            {history.map((item, index) => (
              <div
                key={String(item.id ?? index)}
                className="relative rounded-[18px] border border-slate-200 bg-white p-3.5"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8f8f7] text-[10px] font-black text-[#0b7b80]">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-black text-[#0b2d54]">
                        {medicationName(item)}
                      </p>
                      {index === history.length - 1 && (
                        <span className="shrink-0 rounded-full bg-[#0b2d54] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-white">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">{medicineDate(item)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#f6f9f9] px-2 py-1 text-[9px] font-bold text-slate-500">
                        {medicineOutcome(item)}
                      </span>
                      {item?.sideEffects ? (
                        <span className="rounded-full bg-[#fff8f3] px-2 py-1 text-[9px] font-bold text-amber-700">
                          Side effects recorded
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
