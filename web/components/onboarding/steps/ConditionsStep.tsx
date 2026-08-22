"use client";

import { useEffect, useRef, useState } from "react";

import { SectionTitle } from "@/components/onboarding/SectionTitle";
import { TextField } from "@/components/ui/forms/TextField";
import { Button } from "@/components/ui/button";

import { onboardingService } from "@/services/onboarding.service";

import type {
  UpdatePatientConditionsDto,
} from "@/types/onboarding";

interface ConditionsStepProps {
  values: UpdatePatientConditionsDto;
  onChange: (
    values: UpdatePatientConditionsDto,
  ) => void;
}

interface ConditionOption {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
}

export function ConditionsStep({
  values,
  onChange,
}: ConditionsStepProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    ConditionOption[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSearch, setShowSearch] =
    useState(false);

  const [
    selectedConditionNames,
    setSelectedConditionNames,
  ] = useState<Record<string, string>>({});

  const searchContainerRef =
    useRef<HTMLDivElement>(null);

  /*
   * --------------------------------------------------------------------------
   * RESTORE SELECTED CONDITION NAMES
   * --------------------------------------------------------------------------
   *
   * When the user leaves this step and comes back,
   * the onboarding values contain only conditionId.
   *
   * Therefore we fetch each seeded Condition record
   * so the chip can display the actual condition name
   * instead of "Selected condition".
   */
  useEffect(() => {
    let cancelled = false;

    async function loadSelectedConditionNames() {
      if (!values.conditions.length) {
        setSelectedConditionNames({});
        return;
      }

      const names: Record<string, string> = {};

      await Promise.all(
        values.conditions.map(
          async (condition) => {
            try {
              const result =
                await onboardingService.getCondition(
                  condition.conditionId,
                );

              if (
                !cancelled &&
                result?.id &&
                result?.name
              ) {
                names[result.id] =
                  result.name;
              }
            } catch (error) {
              console.error(
                "[browser] CONDITION LOAD FAILED",
                condition.conditionId,
                error,
              );
            }
          },
        ),
      );

      if (!cancelled) {
        setSelectedConditionNames(
          (previous) => ({
            ...previous,
            ...names,
          }),
        );
      }
    }

    loadSelectedConditionNames();

    return () => {
      cancelled = true;
    };
  }, [values.conditions]);

  /*
   * --------------------------------------------------------------------------
   * SEARCH CONDITIONS
   * --------------------------------------------------------------------------
   *
   * GET /conditions?search=...
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

    let cancelled = false;

    setLoading(true);
    setError("");

    const timeout = setTimeout(
      async () => {
        try {
          const conditions =
            await onboardingService.searchConditions(
              trimmedSearch,
            );

          if (cancelled) {
            return;
          }

          setResults(
            Array.isArray(conditions)
              ? conditions
              : [],
          );
        } catch (error) {
          if (cancelled) {
            return;
          }

          console.error(
            "[browser] CONDITION SEARCH FAILED",
            error,
          );

          setResults([]);
          setError(
            "We couldn't search for conditions right now. Please try again.",
          );
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      },
      300,
    );

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search]);

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
   * GET CONDITION NAME
   * --------------------------------------------------------------------------
   */
  function getConditionName(
    conditionId: string,
  ) {
    return (
      selectedConditionNames[
        conditionId
      ] ??
      results.find(
        (condition) =>
          condition.id === conditionId,
      )?.name ??
      "Selected condition"
    );
  }

  /*
   * --------------------------------------------------------------------------
   * ADD CONDITION
   * --------------------------------------------------------------------------
   */
  function selectCondition(
    condition: ConditionOption,
  ) {
    const alreadySelected =
      values.conditions.some(
        (item) =>
          item.conditionId ===
          condition.id,
      );

    if (alreadySelected) {
      setSearch("");
      setResults([]);
      setShowSearch(false);
      return;
    }

    /*
     * Store the seeded condition name
     * immediately so the chip can display it.
     */
    setSelectedConditionNames(
      (previous) => ({
        ...previous,
        [condition.id]:
          condition.name,
      }),
    );

    onChange({
      conditions: [
        ...values.conditions,
        {
          conditionId: condition.id,

          /*
           * Empty strings are NOT valid ISO dates.
           *
           * Use undefined so the backend does not
           * receive an invalid date value.
           */
          diagnosedAt: undefined,
          resolvedAt: undefined,

          /*
           * Existing behaviour:
           * new conditions start as ongoing.
           */
          chronic: true,

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
   * --------------------------------------------------------------------------
   * UPDATE CONDITION FIELD
   * --------------------------------------------------------------------------
   */
  function updateCondition(
    index: number,
    field: string,
    value: unknown,
  ) {
    const updated =
      values.conditions.map(
        (
          condition,
          conditionIndex,
        ) =>
          conditionIndex === index
            ? {
                ...condition,
                [field]: value,
              }
            : condition,
      );

    onChange({
      conditions: updated,
    });
  }

  /*
   * --------------------------------------------------------------------------
   * UPDATE DIAGNOSED DATE
   * --------------------------------------------------------------------------
   *
   * HTML date input returns YYYY-MM-DD.
   *
   * Convert it to an ISO date before sending
   * it to the API.
   */
  function updateDiagnosedDate(
    index: number,
    value: string,
  ) {
    updateCondition(
      index,
      "diagnosedAt",
      value
        ? new Date(
            `${value}T00:00:00.000Z`,
          ).toISOString()
        : undefined,
    );
  }

  /*
   * --------------------------------------------------------------------------
   * UPDATE RESOLVED DATE
   * --------------------------------------------------------------------------
   */
  function updateResolvedDate(
    index: number,
    value: string,
  ) {
    updateCondition(
      index,
      "resolvedAt",
      value
        ? new Date(
            `${value}T00:00:00.000Z`,
          ).toISOString()
        : undefined,
    );
  }

  /*
   * --------------------------------------------------------------------------
   * DATE INPUT VALUE
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
   * TOGGLE ONGOING
   * --------------------------------------------------------------------------
   *
   * When ongoing is ON:
   * - chronic = true
   * - resolvedAt is removed
   *
   * When ongoing is OFF:
   * - chronic = false
   * - resolvedAt remains empty until the user selects it.
   */
  function toggleOngoing(
    index: number,
    ongoing: boolean,
  ) {
    const updated =
      values.conditions.map(
        (
          condition,
          conditionIndex,
        ) =>
          conditionIndex === index
            ? {
                ...condition,
                chronic: ongoing,
                resolvedAt:
                  ongoing
                    ? undefined
                    : condition.resolvedAt,
              }
            : condition,
      );

    onChange({
      conditions: updated,
    });
  }

  /*
   * --------------------------------------------------------------------------
   * REMOVE CONDITION
   * --------------------------------------------------------------------------
   */
  function removeCondition(
    conditionId: string,
  ) {
    onChange({
      conditions:
        values.conditions.filter(
          (condition) =>
            condition.conditionId !==
            conditionId,
        ),
    });

    setSelectedConditionNames(
      (previous) => {
        const next = {
          ...previous,
        };

        delete next[conditionId];

        return next;
      },
    );
  }

  return (
    <div>
      <SectionTitle
        step={5}
        title="Medical Conditions"
        description="Search for any health conditions you have now or have had in the past."
      />

      <div className="space-y-6">
       
{/* Selected Conditions */}
<div>
  <div className="mb-4 flex items-center justify-between gap-4">
    <div className="min-w-0">
      <h3 className="text-sm font-semibold tracking-tight text-slate-900">
        Medical History
      </h3>

      <p className="mt-0.5 text-xs leading-5 text-slate-500">
        Add any current or past conditions.
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

  {values.conditions.length === 0 ? (
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
            d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-700">
        No medical conditions added yet
      </p>

      <p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-slate-400">
        Add conditions you have now or have had in the past.
      </p>

      {!showSearch && (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="mt-3 text-xs font-semibold text-[#24C1C4] underline-offset-2 transition-colors hover:text-[#1faeb1] hover:underline"
        >
          Add a condition
        </button>
      )}
    </div>
  ) : (
    /* Compact Condition List */
    <div className="space-y-2">
      {values.conditions.map((condition, index) => {
        const conditionName = getConditionName(
          condition.conditionId,
        );

        const isOngoing = condition.chronic ?? false;

        return (
          <div
            key={`${condition.conditionId}-${index}`}
            className={`group rounded-xl border transition-all ${
              isOngoing
                ? "border-emerald-100/80 bg-emerald-50/30"
                : "border-slate-200/80 bg-slate-50/50"
            }`}
          >
            {/* Header */}
            <div className="flex min-h-[46px] items-center justify-between gap-3 px-3.5 py-2.5">
              {/* Condition */}
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ring-2 ${
                    isOngoing
                      ? "bg-emerald-500 ring-emerald-100"
                      : "bg-slate-400 ring-slate-200"
                  }`}
                />

                <h4 className="truncate text-xs font-semibold text-slate-800">
                  {conditionName}
                </h4>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1.5">
                {/* Status */}
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
                    Ongoing
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

                {/* Remove */}
                <button
                  type="button"
                  onClick={() =>
                    removeCondition(
                      condition.conditionId,
                    )
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 opacity-70 transition-all hover:bg-red-50 hover:text-red-500 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-100"
                  aria-label={`Remove ${conditionName}`}
                  title={`Remove ${conditionName}`}
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

            {/* Details */}
            <div
              className={`border-t px-3.5 pb-3 pt-2.5 ${
                isOngoing
                  ? "border-emerald-100/70"
                  : "border-slate-200/70"
              }`}
            >
              {/* Dates */}
              <div
                className={`grid gap-2 ${
                  isOngoing
                    ? "sm:grid-cols-1"
                    : "sm:grid-cols-2"
                }`}
              >
                {/* Diagnosed */}
                <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 transition-colors focus-within:border-[#24C1C4]/40 focus-within:ring-2 focus-within:ring-[#24C1C4]/10">
                  <label
                    htmlFor={`condition-diagnosed-${index}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Diagnosed
                    </span>

                    <span className="text-[10px] text-slate-300">
                      Optional
                    </span>
                  </label>

                  <input
                    id={`condition-diagnosed-${index}`}
                    type="date"
                    value={getDateInputValue(
                      condition.diagnosedAt,
                    )}
                    onChange={(event) =>
                      updateDiagnosedDate(
                        index,
                        event.target.value,
                      )
                    }
                    className="mt-1 w-full border-0 bg-transparent p-0 text-xs font-medium text-slate-700 outline-none focus:ring-0"
                  />
                </div>

                {/* Resolved */}
                {!isOngoing && (
                  <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 transition-colors focus-within:border-[#24C1C4]/40 focus-within:ring-2 focus-within:ring-[#24C1C4]/10">
                    <label
                      htmlFor={`condition-resolved-${index}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Resolved
                      </span>

                      <span className="text-[10px] text-slate-300">
                        Optional
                      </span>
                    </label>

                    <input
                      id={`condition-resolved-${index}`}
                      type="date"
                      value={getDateInputValue(
                        condition.resolvedAt,
                      )}
                      onChange={(event) =>
                        updateResolvedDate(
                          index,
                          event.target.value,
                        )
                      }
                      className="mt-1 w-full border-0 bg-transparent p-0 text-xs font-medium text-slate-700 outline-none focus:ring-0"
                    />
                  </div>
                )}
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
                    ? "This condition is currently ongoing. Add the diagnosis date if you know it."
                    : "This condition is from your past. Add the diagnosis and resolved dates if you remember them."}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>


        {/* Search */}
        {showSearch && (
          <div
            ref={searchContainerRef}
            className="relative rounded-lg border border-slate-200 bg-slate-50/50 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Search for condition name or
                category
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
              placeholder="e.g. Asthma, Diabetes, Migraine..."
              value={search}
              onChange={(value) =>
                setSearch(value)
              }
            />

            {(loading ||
              error ||
              results.length > 0 ||
              search.trim() !== "") && (
              <div className="absolute left-4 right-4 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
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
                      No conditions found.
                    </div>
                  )}

                {!loading &&
                  !error &&
                  results.length > 0 &&
                  results.map(
                    (condition) => {
                      const selected =
                        values.conditions.some(
                          (item) =>
                            item.conditionId ===
                            condition.id,
                        );

                      return (
                        <button
                          key={condition.id}
                          type="button"
                          disabled={selected}
                          onClick={() =>
                            selectCondition(
                              condition,
                            )
                          }
                          className="block w-full border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">
                              {
                                condition.name
                              }
                            </span>

                            {condition.category && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                                {
                                  condition.category
                                }
                              </span>
                            )}
                          </div>

                          {condition.description && (
                            <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                              {
                                condition.description
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

        {/* User guidance */}
        {values.conditions.length > 0 &&
          !showSearch && (
            <p className="text-sm text-slate-500">
              If you have another current or past
              condition, click "+ Add condition"
              above.
            </p>
          )}
      </div>
    </div>
  );
}