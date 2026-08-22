"use client";

import { useEffect, useRef, useState } from "react";

import { SectionTitle } from "@/components/onboarding/SectionTitle";
import { TextField } from "@/components/ui/forms/TextField";
import { Button } from "@/components/ui/button";

import { api } from "@/lib/api";

import type {
  UpdatePatientMedicationsDto,
} from "@/types/onboarding";

interface MedicationsStepProps {
  values: UpdatePatientMedicationsDto;
  onChange: (
    values: UpdatePatientMedicationsDto,
  ) => void;
}

interface MedicationOption {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
}

const FREQUENCY_OPTIONS = [
  {
    label: "Once a day",
    value: "ONCE_DAILY",
  },
  {
    label: "Twice a day",
    value: "TWICE_DAILY",
  },
  {
    label: "Three times a day",
    value: "THREE_TIMES_DAILY",
  },
  {
    label: "Four times a day",
    value: "FOUR_TIMES_DAILY",
  },
  {
    label: "As needed",
    value: "AS_NEEDED",
  },
  {
    label: "Weekly",
    value: "WEEKLY",
  },
  {
    label: "Other",
    value: "OTHER",
  },
];

const ROUTE_OPTIONS = [
  {
    label: "By mouth",
    value: "ORAL",
  },
  {
    label: "Inhaled",
    value: "INHALATION",
  },
  {
    label: "Injection",
    value: "INJECTION",
  },
  {
    label: "Applied to skin",
    value: "TOPICAL",
  },
  {
    label: "Eye drops",
    value: "OPHTHALMIC",
  },
  {
    label: "Ear drops",
    value: "OTIC",
  },
  {
    label: "Other",
    value: "OTHER",
  },
];

export function MedicationsStep({
  values,
  onChange,
}: MedicationsStepProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    MedicationOption[]
  >([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [showSearch, setShowSearch] =
    useState(false);

  /*
   * Keeps medication names available after
   * search results are cleared.
   */
  const [
    selectedMedicationNames,
    setSelectedMedicationNames,
  ] = useState<Record<string, string>>({});

  const searchContainerRef =
    useRef<HTMLDivElement>(null);

  /*
   * --------------------------------------------------------------------------
   * SEARCH MEDICATIONS
   * --------------------------------------------------------------------------
   */
  useEffect(() => {
    const trimmedSearch =
      search.trim();

    if (!trimmedSearch) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    const timeout =
      window.setTimeout(async () => {
        try {
          setLoading(true);
          setError("");

          const { data } =
            await api.get(
              "/medications",
              {
                params: {
                  search:
                    trimmedSearch,
                  limit: 10,
                  page: 1,
                },
              },
            );

          const medicationResults =
            data?.data?.data;

          setResults(
            Array.isArray(
              medicationResults,
            )
              ? medicationResults
              : [],
          );
        } catch (error) {
          console.error(
            "[browser] MEDICATION SEARCH FAILED",
            error,
          );

          setResults([]);
          setError(
            "Unable to search medicines. Please try again.",
          );
        } finally {
          setLoading(false);
        }
      }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [search]);

  /*
   * --------------------------------------------------------------------------
   * REMEMBER MEDICATION NAMES
   * --------------------------------------------------------------------------
   */
  useEffect(() => {
    if (results.length === 0) {
      return;
    }

    setSelectedMedicationNames(
      (previous) => {
        const next = {
          ...previous,
        };

        for (const medication of results) {
          next[medication.id] =
            medication.name;
        }

        return next;
      },
    );
  }, [results]);

  /*
   * --------------------------------------------------------------------------
   * RESTORE MEDICATION NAMES
   * --------------------------------------------------------------------------
   */
  useEffect(() => {
    const selectedIds =
      values.medications
        .map(
          (medication) =>
            medication.medicationId,
        )
        .filter(Boolean);

    if (selectedIds.length === 0) {
      return;
    }

    const missingIds =
      selectedIds.filter(
        (id) =>
          !selectedMedicationNames[id],
      );

    if (missingIds.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadMedicationNames() {
      for (const medicationId of missingIds) {
        try {
          const { data } =
            await api.get(
              `/medications/${medicationId}`,
            );

          const medication =
            data?.data;

          if (
            cancelled ||
            !medication
          ) {
            continue;
          }

          const name =
            medication.name;

          if (!name) {
            continue;
          }

          setSelectedMedicationNames(
            (previous) => ({
              ...previous,
              [medicationId]:
                name,
            }),
          );
        } catch (error) {
          console.error(
            "[browser] MEDICATION NAME LOAD FAILED",
            error,
          );
        }
      }
    }

    loadMedicationNames();

    return () => {
      cancelled = true;
    };
  }, [
    values.medications,
    selectedMedicationNames,
  ]);

  /*
   * --------------------------------------------------------------------------
   * CLOSE SEARCH WHEN CLICKING OUTSIDE
   * --------------------------------------------------------------------------
   */
  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(
          event.target as Node,
        )
      ) {
        setShowSearch(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  /*
   * --------------------------------------------------------------------------
   * GET MEDICATION NAME
   * --------------------------------------------------------------------------
   */
  function getMedicationName(
    medicationId: string,
  ) {
    return (
      selectedMedicationNames[
        medicationId
      ] ??
      results.find(
        (medication) =>
          medication.id ===
          medicationId,
      )?.name ??
      "Selected medicine"
    );
  }

  /*
   * --------------------------------------------------------------------------
   * GET DATE INPUT VALUE
   * --------------------------------------------------------------------------
   *
   * API values are ISO strings.
   *
   * HTML date inputs require YYYY-MM-DD.
   */
  function getDateInputValue(
    value?: string | null,
  ) {
    if (!value) {
      return "";
    }

    return value.slice(0, 10);
  }

  /*
   * --------------------------------------------------------------------------
   * SELECT MEDICATION
   * --------------------------------------------------------------------------
   *
   * New medications are automatically considered
   * ongoing/current.
   *
   * IMPORTANT:
   * Optional dates use undefined, NOT "".
   */
  function selectMedication(
    medication: MedicationOption,
  ) {
    const alreadySelected =
      values.medications.some(
        (item) =>
          item.medicationId ===
          medication.id,
      );

    if (alreadySelected) {
      setSearch("");
      setResults([]);
      setShowSearch(false);
      return;
    }

    setSelectedMedicationNames(
      (previous) => ({
        ...previous,
        [medication.id]:
          medication.name,
      }),
    );

    onChange({
      medications: [
        ...values.medications,
        {
          medicationId:
            medication.id,

          /*
           * New medication is currently being taken.
           */
          ongoing: true,

          dosage: undefined,
          frequency: undefined,
          route: undefined,
          prescribedBy: undefined,
          startedAt: undefined,
          endedAt: undefined,

          indication: undefined,
          instructions: undefined,
          notes: undefined,
        },
      ],
    });

    setSearch("");
    setResults([]);
    setError("");
    setShowSearch(false);
  }

  /*
   * --------------------------------------------------------------------------
   * UPDATE MEDICATION FIELD
   * --------------------------------------------------------------------------
   */
  function updateItem(
    index: number,
    field: string,
    value: unknown,
  ) {
    const updated =
      values.medications.map(
        (
          medication,
          medicationIndex,
        ) =>
          medicationIndex === index
            ? {
                ...medication,
                [field]: value,
              }
            : medication,
      );

    onChange({
      medications: updated,
    });
  }

  /*
   * --------------------------------------------------------------------------
   * UPDATE STARTED DATE
   * --------------------------------------------------------------------------
   */
  function updateStartedDate(
    index: number,
    value: string,
  ) {
    updateItem(
      index,
      "startedAt",
      value
        ? new Date(
            `${value}T00:00:00.000Z`,
          ).toISOString()
        : undefined,
    );
  }

  /*
   * --------------------------------------------------------------------------
   * UPDATE ENDED DATE
   * --------------------------------------------------------------------------
   */
  function updateEndedDate(
    index: number,
    value: string,
  ) {
    updateItem(
      index,
      "endedAt",
      value
        ? new Date(
            `${value}T00:00:00.000Z`,
          ).toISOString()
        : undefined,
    );
  }

  /*
   * --------------------------------------------------------------------------
   * TOGGLE ONGOING
   * --------------------------------------------------------------------------
   *
   * ON:
   * - ongoing = true
   * - endedAt = undefined
   *
   * OFF:
   * - ongoing = false
   * - endedAt remains empty until user chooses
   *   a stopped date.
   */
  function toggleOngoing(
    index: number,
    ongoing: boolean,
  ) {
    const updated =
      values.medications.map(
        (
          medication,
          medicationIndex,
        ) =>
          medicationIndex === index
            ? {
                ...medication,
                ongoing,
                endedAt: ongoing
                  ? undefined
                  : medication.endedAt,
              }
            : medication,
      );

    onChange({
      medications: updated,
    });
  }

  /*
   * --------------------------------------------------------------------------
   * REMOVE MEDICATION
   * --------------------------------------------------------------------------
   */
  function removeMedication(
    medicationId: string,
  ) {
    onChange({
      medications:
        values.medications.filter(
          (medication) =>
            medication.medicationId !==
            medicationId,
        ),
    });

    setSelectedMedicationNames(
      (previous) => {
        const next = {
          ...previous,
        };

        delete next[medicationId];

        return next;
      },
    );
  }

  return (
    <div>
      <SectionTitle
        step={6}
        title="Medicines You Take"
        description="Search for any medicines you are currently taking."
      />

      <div className="space-y-6">
    {/* Selected Medicines */}
<div>
  <div className="mb-4 flex items-center justify-between gap-4">
    <div className="min-w-0">
      <h3 className="text-sm font-semibold tracking-tight text-slate-900">
        Medications
      </h3>

      <p className="mt-0.5 text-xs leading-5 text-slate-500">
        Add medicines you currently take or have taken in the past.
      </p>
    </div>

    {!showSearch && (
      <Button
        type="button"
        size="sm"
        onClick={() => setShowSearch(true)}
        className="h-8 shrink-0 rounded-full border border-[#24C1C4] bg-white px-3.5 text-xs font-semibold text-[#24C1C4] shadow-sm transition-all hover:bg-[#24C1C4]/5 hover:shadow-none"
      >
        + Add
      </Button>
    )}
  </div>

  {values.medications.length === 0 ? (
    /* Empty State */
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200/70">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.7}
          stroke="currentColor"
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 3.75h4.5a2.25 2.25 0 012.25 2.25v12a2.25 2.25 0 01-2.25 2.25h-4.5a2.25 2.25 0 01-2.25-2.25V6a2.25 2.25 0 012.25-2.25z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 7.5h4M10 11.25h4"
          />
        </svg>
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-700">
        No medications added yet
      </p>

      <p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-slate-400">
        Add medicines you take now or have taken in the past.
      </p>

      {!showSearch && (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="mt-3 text-xs font-semibold text-[#24C1C4] underline-offset-2 transition-colors hover:text-[#1faeb1] hover:underline"
        >
          Add a medicine
        </button>
      )}
    </div>
  ) : (
    /* Medication List */
    <div className="space-y-2">
      {values.medications.map((medication, index) => {
        const medicationName = getMedicationName(
          medication.medicationId,
        );

        const isOngoing = medication.ongoing ?? true;

        return (
          <div
            key={`${medication.medicationId}-${index}`}
            className={`overflow-hidden rounded-xl border transition-all ${
              isOngoing
                ? "border-emerald-100/80 bg-emerald-50/30"
                : "border-slate-200/80 bg-slate-50/50"
            }`}
          >
            {/* Header */}
            <div className="flex min-h-[46px] items-center justify-between gap-3 px-3.5 py-2.5">
              {/* Medicine Name */}
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ring-2 ${
                    isOngoing
                      ? "bg-emerald-500 ring-emerald-100"
                      : "bg-slate-400 ring-slate-200"
                  }`}
                />

                <h4 className="truncate text-xs font-semibold text-slate-800">
                  {medicationName}
                </h4>
              </div>

              {/* Status + Remove */}
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="flex items-center rounded-full bg-white p-0.5 shadow-sm ring-1 ring-slate-200/70">
                  <button
                    type="button"
                    onClick={() =>
                      toggleOngoing(index, true)
                    }
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all ${
                      isOngoing
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Current
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleOngoing(index, false)
                    }
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all ${
                      !isOngoing
                        ? "bg-slate-100 text-slate-700 shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Past
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeMedication(
                      medication.medicationId,
                    )
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 opacity-70 transition-all hover:bg-red-50 hover:text-red-500 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-100"
                  title="Remove medicine"
                  aria-label={`Remove ${medicationName}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Medication Details */}
            <div
              className={`border-t px-3.5 pb-3 pt-2.5 ${
                isOngoing
                  ? "border-emerald-100/70"
                  : "border-slate-200/70"
              }`}
            >
              <div className="mb-2.5">
                <h4 className="text-[11px] font-semibold text-slate-600">
                  {medicationName} details
                </h4>
              </div>

              {/* Dose / Frequency / Route / Started / Stopped */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {/* Dose */}
                <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 transition-colors focus-within:border-[#24C1C4]/40 focus-within:ring-2 focus-within:ring-[#24C1C4]/10">
                  <label
                    htmlFor={`medication-dosage-${index}`}
                    className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Dose
                  </label>

                  <input
                    id={`medication-dosage-${index}`}
                    type="text"
                    value={medication.dosage ?? ""}
                    placeholder="e.g. 500 mg"
                    onChange={(event) =>
                      updateItem(
                        index,
                        "dosage",
                        event.target.value || undefined,
                      )
                    }
                    className="mt-1 w-full border-0 bg-transparent p-0 text-xs font-medium text-slate-700 outline-none placeholder:text-slate-300 focus:ring-0"
                  />
                </div>

                {/* Frequency */}
                <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 transition-colors focus-within:border-[#24C1C4]/40 focus-within:ring-2 focus-within:ring-[#24C1C4]/10">
                  <label
                    htmlFor={`medication-frequency-${index}`}
                    className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Frequency
                  </label>

                  <select
                    id={`medication-frequency-${index}`}
                    value={medication.frequency ?? ""}
                    onChange={(event) =>
                      updateItem(
                        index,
                        "frequency",
                        event.target.value || undefined,
                      )
                    }
                    className="mt-1 w-full cursor-pointer border-0 bg-transparent p-0 pr-5 text-xs font-medium text-slate-700 outline-none focus:ring-0"
                  >
                    <option value="">
                      Select frequency
                    </option>

                    {FREQUENCY_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Route */}
                <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 transition-colors focus-within:border-[#24C1C4]/40 focus-within:ring-2 focus-within:ring-[#24C1C4]/10">
                  <label
                    htmlFor={`medication-route-${index}`}
                    className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                  >
                    How you take it
                  </label>

                  <select
                    id={`medication-route-${index}`}
                    value={medication.route ?? ""}
                    onChange={(event) =>
                      updateItem(
                        index,
                        "route",
                        event.target.value || undefined,
                      )
                    }
                    className="mt-1 w-full cursor-pointer border-0 bg-transparent p-0 pr-5 text-xs font-medium text-slate-700 outline-none focus:ring-0"
                  >
                    <option value="">
                      Select route
                    </option>

                    {ROUTE_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Started */}
                <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 transition-colors focus-within:border-[#24C1C4]/40 focus-within:ring-2 focus-within:ring-[#24C1C4]/10">
                  <label
                    htmlFor={`medication-started-${index}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Started
                    </span>

                    <span className="text-[10px] text-slate-300">
                      Optional
                    </span>
                  </label>

                  <input
                    id={`medication-started-${index}`}
                    type="date"
                    value={getDateInputValue(
                      medication.startedAt,
                    )}
                    onChange={(event) =>
                      updateStartedDate(
                        index,
                        event.target.value,
                      )
                    }
                    className="mt-1 w-full border-0 bg-transparent p-0 text-xs font-medium text-slate-700 outline-none focus:ring-0"
                  />
                </div>

                {/* Stopped */}
                {!isOngoing && (
                  <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 transition-colors focus-within:border-[#24C1C4]/40 focus-within:ring-2 focus-within:ring-[#24C1C4]/10">
                    <label
                      htmlFor={`medication-stopped-${index}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Stopped
                      </span>

                      <span className="text-[10px] text-slate-300">
                        Optional
                      </span>
                    </label>

                    <input
                      id={`medication-stopped-${index}`}
                      type="date"
                      value={getDateInputValue(
                        medication.endedAt,
                      )}
                      onChange={(event) =>
                        updateEndedDate(
                          index,
                          event.target.value,
                        )
                      }
                      className="mt-1 w-full border-0 bg-transparent p-0 text-xs font-medium text-slate-700 outline-none focus:ring-0"
                    />
                  </div>
                )}
              </div>

              {/* Prescriber + Notes */}
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 transition-colors focus-within:border-[#24C1C4]/40 focus-within:ring-2 focus-within:ring-[#24C1C4]/10">
                  <label
                    htmlFor={`medication-prescriber-${index}`}
                    className="sr-only"
                  >
                    Who prescribed it? (optional)
                  </label>

                  <input
                    id={`medication-prescriber-${index}`}
                    type="text"
                    value={medication.prescribedBy ?? ""}
                    onChange={(event) =>
                      updateItem(
                        index,
                        "prescribedBy",
                        event.target.value || undefined,
                      )
                    }
                    placeholder="Who prescribed it? (optional)"
                    className="w-full border-0 bg-transparent p-0 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0"
                  />
                </div>

                <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 transition-colors focus-within:border-[#24C1C4]/40 focus-within:ring-2 focus-within:ring-[#24C1C4]/10">
                  <label
                    htmlFor={`medication-notes-${index}`}
                    className="sr-only"
                  >
                    Anything else you'd like us to know? (optional)
                  </label>

                  <input
                    id={`medication-notes-${index}`}
                    type="text"
                    value={medication.notes ?? ""}
                    onChange={(event) =>
                      updateItem(
                        index,
                        "notes",
                        event.target.value || undefined,
                      )
                    }
                    placeholder="Anything else you'd like us to know? (optional)"
                    className="w-full border-0 bg-transparent p-0 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0"
                  />
                </div>
              </div>

              {/* Contextual Hint */}
              <div className="mt-2 flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.7}
                  stroke="currentColor"
                  className="h-3 w-3 shrink-0 text-slate-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.09.68v.84a.75.75 0 00.75.75h.118M12 8.25h.008v.008H12V8.25z"
                  />
                </svg>

                <p className="text-[10px] leading-4 text-slate-400">
                  {isOngoing
                    ? "This medicine is currently being taken. Add the dose, frequency and other details if you know them."
                    : "This medicine is from your past. Add the dates and other details if you remember them."}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>

{/* ---------------------------------------------------------------- */}
{/* SEARCH                                                           */}
{/* ---------------------------------------------------------------- */}

{showSearch && (
  <div
    ref={searchContainerRef}
    className="relative rounded-lg border border-slate-200 bg-slate-50/50 p-4"
  >
    <div className="mb-2 flex items-center justify-between">
      <span className="text-xs font-medium text-slate-500">
        Search for medicine name
      </span>

      <button
        type="button"
        onClick={() => {
          setShowSearch(false);
          setSearch("");
          setResults([]);
          setError("");
        }}
        className="text-xs text-slate-400 hover:text-slate-600"
      >
        Cancel
      </button>
    </div>

    <TextField
      label=""
      placeholder="e.g. Paracetamol, Metformin, Aspirin..."
      value={search}
      onChange={(value) => setSearch(value)}
    />

    {(loading ||
      error ||
      results.length > 0 ||
      search.trim() !== "") && (
      <div className="absolute left-4 right-4 top-full z-50 mt-1 max-h-72 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
        {loading && (
          <div className="px-4 py-3 text-sm text-slate-500">
            Searching...
          </div>
        )}

        {!loading && error && (
          <div className="px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          results.length === 0 &&
          search.trim() !== "" && (
            <div className="px-4 py-3 text-sm text-slate-500">
              No medicines found.
            </div>
          )}

        {!loading &&
          !error &&
          results.length > 0 &&
          results.map((medication) => {
            const selected =
              values.medications.some(
                (item) =>
                  item.medicationId === medication.id,
              );

            return (
              <button
                key={medication.id}
                type="button"
                disabled={selected}
                onClick={() =>
                  selectMedication(medication)
                }
                className="block w-full border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">
                    {medication.name}
                  </span>

                  {medication.category && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                      {medication.category}
                    </span>
                  )}
                </div>

                {medication.description && (
                  <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                    {medication.description}
                  </div>
                )}
              </button>
            );
          })}
      </div>
    )}
  </div>
)}

        {/* ---------------------------------------------------------------- */}
        {/* USER GUIDANCE                                                    */}
        {/* ---------------------------------------------------------------- */}

        {values.medications.length >
          0 &&
          !showSearch && (
          <p className="text-sm text-slate-500">
            Add each medicine you
            currently take. New medicines
            are marked as ongoing by
            default. Turn off Ongoing if
            you have stopped taking a
            medicine to enter the stopped
            date.
          </p>
        )}
      </div>
    </div>
  );
}