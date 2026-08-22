"use client";

import { useEffect, useRef, useState } from "react";

import { SectionTitle } from "@/components/onboarding/SectionTitle";
import { TextField } from "@/components/ui/forms/TextField";
import { Button } from "@/components/ui/button";

import {
  ShieldAlert,
  Plus,
  
} from "lucide-react";

import { onboardingService } from "@/services/onboarding.service";

import type {
  UpdatePatientAllergiesDto,
} from "@/types/onboarding";

interface AllergiesStepProps {
  values: UpdatePatientAllergiesDto;
  onChange: (
    values: UpdatePatientAllergiesDto,
  ) => void;
}

interface AllergyOption {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  snomedCode?: string | null;
  common?: boolean;
}

type AllergySeverity =
  | "MILD"
  | "MODERATE"
  | "SEVERE"
  | "LIFE_THREATENING";

interface ChipStyle {
  container: string;
  divider: string;
  select: string;
  remove: string;
}

export function AllergiesStep({
  values,
  onChange,
}: AllergiesStepProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    AllergyOption[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingSelected, setLoadingSelected] =
    useState(false);
  const [error, setError] = useState("");
  const [showSearch, setShowSearch] =
    useState(false);

  /*
   * Stores the actual allergy names by ID.
   *
   * These are restored from the API when the
   * component mounts, so going Back and then
   * returning to this step does not lose the names.
   */
  const [
    selectedAllergyNames,
    setSelectedAllergyNames,
  ] = useState<Record<string, string>>({});

  const searchContainerRef =
    useRef<HTMLDivElement>(null);

  /*
   * Restore selected allergy names.
   *
   * values.allergies contains the allergy IDs
   * saved in onboarding progress.
   *
   * We query the allergies endpoint for each
   * selected ID so the chip can display the
   * actual allergy name after navigating back.
   */
  useEffect(() => {
    const selectedIds =
      values.allergies
        .map((item) => item.allergyId)
        .filter(Boolean);

    if (selectedIds.length === 0) {
      setSelectedAllergyNames({});
      return;
    }

    let cancelled = false;

    async function loadSelectedAllergyNames() {
      setLoadingSelected(true);

      try {
        const entries =
          await Promise.all(
            selectedIds.map(
              async (allergyId) => {
                try {
                  /*
                   * The API supports GET /allergies/:id.
                   *
                   * We use the service directly if
                   * available, otherwise fall back
                   * to searching by the ID.
                   */
                  const allergy =
                    await onboardingService.getAllergy(
                      allergyId,
                    );

                  return [
                    allergyId,
                    allergy?.name ??
                      null,
                  ] as const;
                } catch {
                  return [
                    allergyId,
                    null,
                  ] as const;
                }
              },
            ),
          );

        if (cancelled) return;

        setSelectedAllergyNames(
          (previous) => {
            const next = {
              ...previous,
            };

            for (const [
              allergyId,
              name,
            ] of entries) {
              if (name) {
                next[allergyId] =
                  name;
              }
            }

            return next;
          },
        );
      } finally {
        if (!cancelled) {
          setLoadingSelected(false);
        }
      }
    }

    loadSelectedAllergyNames();

    return () => {
      cancelled = true;
    };
  }, [values.allergies]);

  /*
   * Search allergies from the API.
   */
  useEffect(() => {
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    const timeout =
      window.setTimeout(
        async () => {
          try {
            setLoading(true);
            setError("");

            const allergyResults =
              await onboardingService.searchAllergies(
                trimmedSearch,
              );

            const normalizedResults =
              Array.isArray(
                allergyResults,
              )
                ? allergyResults
                : [];

            setResults(
              normalizedResults,
            );

            /*
             * Cache names returned by search.
             */
            if (
              normalizedResults.length >
              0
            ) {
              setSelectedAllergyNames(
                (previous) => {
                  const next = {
                    ...previous,
                  };

                  for (const allergy of normalizedResults) {
                    next[allergy.id] =
                      allergy.name;
                  }

                  return next;
                },
              );
            }
          } catch (error) {
            console.error(
              "[browser] ALLERGY SEARCH FAILED",
              error,
            );

            setResults([]);
            setError(
              "Unable to search allergies. Please try again.",
            );
          } finally {
            setLoading(false);
          }
        },
        300,
      );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [search]);

  /*
   * Close search when clicking outside.
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
   * Get allergy name.
   */
  function getAllergyName(
    allergyId: string,
  ) {
    return (
      selectedAllergyNames[
        allergyId
      ] ??
      results.find(
        (allergy) =>
          allergy.id === allergyId,
      )?.name ??
      "Selected allergy"
    );
  }

  /*
   * Add allergy.
   */
  function selectAllergy(
    allergy: AllergyOption,
  ) {
    const alreadySelected =
      values.allergies.some(
        (item) =>
          item.allergyId ===
          allergy.id,
      );

    if (alreadySelected) {
      setSearch("");
      setResults([]);
      setError("");
      setShowSearch(false);
      return;
    }

    setSelectedAllergyNames(
      (previous) => ({
        ...previous,
        [allergy.id]:
          allergy.name,
      }),
    );

    onChange({
      allergies: [
        ...values.allergies,
        {
          allergyId: allergy.id,
          severity: "MILD",
          reaction: "",
          reactionNotes: "",
          verified: false,
          status: "ACTIVE",
          notes: "",
        },
      ],
    });

    setSearch("");
    setResults([]);
    setError("");
    setShowSearch(false);
  }

  /*
   * Update severity.
   */
  function updateSeverity(
    index: number,
    severity: AllergySeverity,
  ) {
    const updatedAllergies =
      values.allergies.map(
        (
          allergy,
          allergyIndex,
        ) =>
          allergyIndex === index
            ? {
                ...allergy,
                severity,
              }
            : allergy,
      );

    onChange({
      allergies: updatedAllergies,
    });
  }

  /*
   * Remove allergy.
   */
  function removeAllergy(
    allergyId: string,
  ) {
    onChange({
      allergies:
        values.allergies.filter(
          (item) =>
            item.allergyId !==
            allergyId,
        ),
    });

    setSelectedAllergyNames(
      (previous) => {
        const next = {
          ...previous,
        };

        delete next[allergyId];

        return next;
      },
    );
  }

  const severityLabels: Record<
    AllergySeverity,
    string
  > = {
    MILD: "Mild",
    MODERATE: "Moderate",
    SEVERE: "Severe",
    LIFE_THREATENING:
      "Life Threatening",
  };

  const severityStyles: Record<
    AllergySeverity,
    ChipStyle
  > = {
    MILD: {
      container:
        "border-emerald-200 bg-emerald-50 text-emerald-900",
      divider:
        "text-emerald-300",
      select:
        "text-emerald-700 hover:text-emerald-900",
      remove:
        "text-emerald-400 hover:bg-emerald-200 hover:text-emerald-700",
    },

    MODERATE: {
      container:
        "border-amber-200 bg-amber-50 text-amber-900",
      divider:
        "text-amber-300",
      select:
        "text-amber-700 hover:text-amber-900",
      remove:
        "text-amber-400 hover:bg-amber-200 hover:text-amber-700",
    },

    SEVERE: {
      container:
        "border-red-200 bg-red-50 text-red-900 font-medium",
      divider:
        "text-red-300",
      select:
        "text-red-700 hover:text-red-900 font-bold",
      remove:
        "text-red-400 hover:bg-red-200 hover:text-red-700",
    },

    LIFE_THREATENING: {
      container:
        "border-rose-300 bg-rose-100 text-rose-950 font-bold uppercase animate-pulse",
      divider:
        "text-rose-400",
      select:
        "text-rose-800 hover:text-rose-950 font-black",
      remove:
        "text-rose-500 hover:bg-rose-200 hover:text-rose-800",
    },
  };

  return (
    <div>
      <SectionTitle
        step={4}
        title="Allergies"
        description="Search for any allergies you have and select them from the list."
      />

      <div className="space-y-6">
{/* Selected Allergies */}
<div>
  {/* Header Section */}
  <div className="mb-4 flex items-end justify-between gap-4">
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold tracking-tight text-slate-900">
          Selected Allergies
        </h3>

        {values.allergies.length > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#24C1C4]/10 px-1.5 text-[10px] font-bold text-[#159FA3]">
            {values.allergies.length}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs leading-normal text-slate-500">
        {values.allergies.length > 0
          ? "Review your allergies and set how strongly you react to each one."
          : "Keep your allergy information here so it can be considered when relevant."}
      </p>
    </div>

    {!showSearch &&
      values.allergies.length > 0 && (
        <Button
          type="button"
          size="sm"
          onClick={() => setShowSearch(true)}
          className="shrink-0 border border-[#24C1C4]/30 bg-[#24C1C4]/5 text-xs font-semibold text-[#159FA3] shadow-none transition-all duration-200 hover:border-[#24C1C4] hover:bg-[#24C1C4]/10"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add allergy
        </Button>
      )}
  </div>

  {/* Empty State */}
  {values.allergies.length === 0 ? (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-[#F2FEFE]/60 via-white to-slate-50/50 px-6 py-8">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#24C1C4]/5" />

      <div className="relative">
        <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#24C1C4]/10 text-[#159FA3]">
          <ShieldAlert className="h-5 w-5" />
        </div>

        <h4 className="text-sm font-bold text-[#0B2D54]">
          No allergies added yet
        </h4>

        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
          If you have any allergies, add them here so your
          health profile has the right information. You can
          also tell us how severe each reaction is.
        </p>

        {!showSearch && (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#24C1C4] px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-[#24C1C4]/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1faeb1] hover:shadow-md"
          >
            <Plus className="h-3.5 w-3.5" />
            Add an allergy
          </button>
        )}
      </div>
    </div>
  ) : (
    /* Allergy Cards List */
    <div className="space-y-3">
      {values.allergies.map(
        (allergy, index) => {
          const allergyName =
            getAllergyName(
              allergy.allergyId,
            );

          const severity =
            (allergy.severity ??
              "MILD") as AllergySeverity;

          const chipStyle =
            severityStyles[severity];

          return (
            <div
              key={`${allergy.allergyId}-${index}`}
              className={`group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md ${chipStyle.container}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Allergy Identity */}
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white/90 text-slate-500 shadow-sm">
                    <ShieldAlert className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-800">
                        {allergyName}
                      </span>

                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                        Allergy
                      </span>
                    </div>

                    <p className="mt-0.5 text-[11px] text-slate-500">
                      How strongly do you react to this?
                    </p>
                  </div>
                </div>

                {/* Severity + Remove */}
                <div className="flex items-center gap-2 self-end sm:shrink-0 sm:self-auto">
                  <div className="relative flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/90 py-1.5 pl-3 pr-2 shadow-sm focus-within:ring-2 focus-within:ring-[#24C1C4]/20">
                    <span className="select-none text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Severity
                    </span>

                    <div className="relative flex items-center">
                      <select
                        value={severity}
                        onChange={(event) =>
                          updateSeverity(
                            index,
                            event.target
                              .value as AllergySeverity,
                          )
                        }
                        className={`cursor-pointer appearance-none rounded-lg border-none bg-transparent p-0 pr-5 text-xs font-bold focus:outline-none focus:ring-0 ${chipStyle.select}`}
                        aria-label={`Change severity for ${allergyName}`}
                      >
                        {Object.entries(
                          severityLabels,
                        ).map(
                          ([
                            value,
                            label,
                          ]) => (
                            <option
                              key={value}
                              value={value}
                              className="bg-white font-normal text-slate-900"
                            >
                              {label}
                            </option>
                          ),
                        )}
                      </select>

                      <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-current opacity-60">
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m19.5 8.25-7.5 7.5-7.5-7.5"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeAllergy(
                        allergy.allergyId,
                      )
                    }
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white/90 shadow-sm transition-all duration-150 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-current/25 ${chipStyle.remove}`}
                    title={`Remove ${allergyName}`}
                    aria-label={`Remove ${allergyName}`}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        },
      )}
    </div>
  )}
</div>
        {/* Search */}
        {showSearch && (
          <div
            ref={
              searchContainerRef
            }
            className="relative rounded-lg border border-slate-200 bg-slate-50/50 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Search for allergy
                name or category
              </span>

              <button
                type="button"
                onClick={() => {
                  setShowSearch(
                    false,
                  );
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
              placeholder="e.g. Peanut, Penicillin, Pollen..."
              value={search}
              onChange={(value) =>
                setSearch(value)
              }
            />

            {(loading ||
              error ||
              results.length >
                0 ||
              search.trim() !==
                "") && (
              <div className="allergy-search-results absolute left-4 right-4 top-full z-50 mt-1 max-h-72 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                {loading && (
                  <div className="px-4 py-3 text-sm text-slate-500">
                    Searching...
                  </div>
                )}

                {!loading &&
                  error && (
                    <div className="px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                {!loading &&
                  !error &&
                  results.length ===
                    0 &&
                  search.trim() !==
                    "" && (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      No allergies
                      found.
                    </div>
                  )}

                {!loading &&
                  !error &&
                  results.length >
                    0 &&
                  results.map(
                    (
                      allergy,
                    ) => {
                      const selected =
                        values.allergies.some(
                          (
                            item,
                          ) =>
                            item.allergyId ===
                            allergy.id,
                        );

                      return (
                        <button
                          key={
                            allergy.id
                          }
                          type="button"
                          disabled={
                            selected
                          }
                          onClick={() =>
                            selectAllergy(
                              allergy,
                            )
                          }
                          className="block w-full border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">
                              {
                                allergy.name
                              }
                            </span>

                            {allergy.category && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                                {
                                  allergy.category
                                }
                              </span>
                            )}
                          </div>

                          {allergy.description && (
                            <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                              {
                                allergy.description
                              }
                            </div>
                          )}
                        </button>
                      );
                    },
                  )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

