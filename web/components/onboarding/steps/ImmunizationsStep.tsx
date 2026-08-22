"use client";

import { useEffect, useMemo, useState } from "react";

import { SectionTitle } from "@/components/onboarding/SectionTitle";
import { TextField } from "@/components/ui/forms/TextField";

import { toast } from "sonner";

import { onboardingService } from "@/services/onboarding.service";

import type {
  UpdatePatientImmunizationsDto,
} from "@/types/onboarding";

interface ImmunizationsStepProps {
  values: UpdatePatientImmunizationsDto;

  onChange: (
    values: UpdatePatientImmunizationsDto,
  ) => void;
}

interface ImmunizationReference {
  id: string;
  name: string;
  cvxCode?: string | null;
  category?: string | null;
  diseaseProtected?: string | null;
  dosageSchedule?: string | null;
  active?: boolean;
}

interface ImmunizationForm {
  immunizationId: string;
  administeredAt: string;
  doseNumber: number | undefined;
  batchNumber: string;
  manufacturer: string;
  administeredBy: string;
  facility: string;
  route: string;
  site: string;
  adverseReaction: boolean;
  adverseReactionNotes: string;
  nextDueDate: string;
  notes: string;
}

function createEmptyForm(
  immunizationId: string,
): ImmunizationForm {
  return {
    immunizationId,
    administeredAt: "",
    doseNumber: undefined,
    batchNumber: "",
    manufacturer: "",
    administeredBy: "",
    facility: "",
    route: "",
    site: "",
    adverseReaction: false,
    adverseReactionNotes: "",
    nextDueDate: "",
    notes: "",
  };
}

export function ImmunizationsStep({
  values,
  onChange,
}: ImmunizationsStepProps) {
  const [
    availableVaccines,
    setAvailableVaccines,
  ] = useState<ImmunizationReference[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [
    selectedImmunizationId,
    setSelectedImmunizationId,
  ] = useState<string | null>(null);

  const [
    isModalOpen,
    setIsModalOpen,
  ] = useState(false);

  const [form, setForm] =
    useState<ImmunizationForm | null>(null);

  /**
   * Load the seeded immunization reference
   * data from the backend.
   *
   * IMPORTANT:
   *
   * We use `id` from the database as
   * immunizationId.
   *
   * We do NOT use cvxCode.
   */
 useEffect(() => {
  let mounted = true;

  async function loadImmunizations() {
    try {
      setIsLoading(true);
      setLoadError(null);

      const vaccines =
  await onboardingService.getImmunizations();

      if (!mounted) {
        return;
      }

      setAvailableVaccines(
        Array.isArray(vaccines) ? vaccines : [],
      );
    } catch (error) {
      console.error(
        "Failed to load immunizations:",
        error,
      );

      if (!mounted) {
        return;
      }

      setLoadError(
        "Unable to load vaccinations. Please try again.",
      );
    } finally {
      if (mounted) {
        setIsLoading(false);
      }
    }
  }

  loadImmunizations();

  return () => {
    mounted = false;
  };
}, []);
  /**
   * IDs of currently selected vaccines.
   */
  const selectedIds = useMemo(
    () =>
      new Set(
        values.immunizations
          .map(
            (item) =>
              item.immunizationId,
          )
          .filter(Boolean),
      ),
    [values.immunizations],
  );

  /**
   * Open modal for a vaccine.
   *
   * If it already exists, load its existing
   * details for editing.
   *
   * Otherwise create a blank form.
   */
  function openVaccineModal(
    immunizationId: string,
  ) {
    const existing =
      values.immunizations.find(
        (item) =>
          item.immunizationId ===
          immunizationId,
      );

    if (existing) {
      setForm({
        immunizationId:
          existing.immunizationId,

        administeredAt:
          existing.administeredAt ?? "",

        doseNumber:
  existing.doseNumber ?? undefined,

        batchNumber:
          existing.batchNumber ?? "",

        manufacturer:
          existing.manufacturer ?? "",

        administeredBy:
          existing.administeredBy ?? "",

        facility:
          existing.facility ?? "",

        route:
          existing.route ?? "",

        site:
          existing.site ?? "",

        adverseReaction:
          existing.adverseReaction ?? false,

        adverseReactionNotes:
          existing.adverseReactionNotes ??
          "",

        nextDueDate:
          existing.nextDueDate ?? "",

        notes:
          existing.notes ?? "",
      });
    } else {
      setForm(
        createEmptyForm(
          immunizationId,
        ),
      );
    }

    setSelectedImmunizationId(
      immunizationId,
    );

    setIsModalOpen(true);
  }

  /**
   * Close the modal without saving.
   */
  function closeModal() {
    setIsModalOpen(false);
    setSelectedImmunizationId(null);
    setForm(null);
  }

 /**
 * Save vaccination details.
 *
 * The database UUID is retained in
 * immunizationId.
 */
function saveVaccination() {
  if (!form) {
    return;
  }

  if (!form.administeredAt) {
    toast.error(
  "Please enter the date you received this vaccination.",
);
    return;
  }

  const administeredDate = new Date(
    form.administeredAt,
  );

  if (Number.isNaN(administeredDate.getTime())) {
    alert(
  "Please enter a valid vaccination date.",
);
    return;
  }

  const vaccination = {
    ...form,

    doseNumber: form.doseNumber,

    administeredAt:
      administeredDate.toISOString(),

    nextDueDate: form.nextDueDate
      ? (() => {
          const date = new Date(
            form.nextDueDate,
          );

          return Number.isNaN(
            date.getTime(),
          )
            ? undefined
            : date.toISOString();
        })()
      : undefined,
  };

  const existingIndex =
    values.immunizations.findIndex(
      (item) =>
        item.immunizationId ===
        form.immunizationId,
    );

  if (existingIndex >= 0) {
    const updated = [
      ...values.immunizations,
    ];

    updated[existingIndex] = {
      ...updated[existingIndex],
      ...vaccination,
    };

    onChange({
      immunizations: updated,
    });
  } else {
    onChange({
      immunizations: [
        ...values.immunizations,
        vaccination,
      ],
    });
  }

  closeModal();
}
  /**
   * Remove a selected vaccination.
   */
  function removeVaccination(
    immunizationId: string,
  ) {
    onChange({
      immunizations:
        values.immunizations.filter(
          (item) =>
            item.immunizationId !==
            immunizationId,
        ),
    });

    if (
      selectedImmunizationId ===
      immunizationId
    ) {
      closeModal();
    }
  }

  /**
   * Update modal form.
   */
  function updateForm(
  field: keyof ImmunizationForm,
  value:
    | string
    | number
    | boolean
    | undefined,
) {
  setForm((current) => {
    if (!current) {
      return current;
    }

    return {
      ...current,
      [field]: value,
    };
  });
}

  /**
   * Find reference vaccine by ID.
   */
  function getVaccine(
    immunizationId: string,
  ) {
    return availableVaccines.find(
      (vaccine) =>
        vaccine.id ===
        immunizationId,
    );
  }

  return (
    <div>
      <SectionTitle
        step={7}
        title="Vaccinations"
        description="Add vaccinations you've received. You can add multiple vaccines and record the dates and dose details you remember."
      />

      <div className="space-y-7">
       {/* Vaccinations */}
<section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
  {/* Header */}
  <div className="mb-4 flex items-start justify-between gap-4">
    <div className="min-w-0">
      <h3 className="text-sm font-semibold tracking-tight text-slate-900">
        Vaccinations
      </h3>

      <p className="mt-0.5 text-xs leading-5 text-slate-500">
        Select the vaccinations you’ve received.
      </p>
    </div>

    {availableVaccines.length > 0 && (
      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
        {selectedIds.size} selected
      </span>
    )}
  </div>

  {/* Loading */}
  {isLoading && (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          className="h-10 animate-pulse rounded-lg bg-slate-100"
        />
      ))}
    </div>
  )}

  {/* Error */}
  {!isLoading && loadError && (
    <div className="rounded-lg border border-red-100 bg-red-50/70 px-4 py-3">
      <p className="text-xs font-medium text-red-700">
        {loadError}
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-1.5 text-xs font-semibold text-red-600 underline underline-offset-2 hover:text-red-700"
      >
        Try again
      </button>
    </div>
  )}

  {/* Vaccine options */}
  {!isLoading &&
    !loadError &&
    availableVaccines.length > 0 && (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {availableVaccines.map((vaccine) => {
          const isSelected = selectedIds.has(vaccine.id);

          return (
            <button
              key={vaccine.id}
              type="button"
              onClick={() => openVaccineModal(vaccine.id)}
              aria-pressed={isSelected}
              className={[
                "group flex min-h-10 items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-all duration-150",
                isSelected
                  ? "border-[#24C1C4]/60 bg-[#24C1C4]/5"
                  : "border-slate-200 bg-slate-50/40 hover:border-[#24C1C4]/40 hover:bg-[#24C1C4]/5",
              ].join(" ")}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {/* Selection indicator */}
                <span
                  className={[
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold transition-all",
                    isSelected
                      ? "border-[#24C1C4] bg-[#24C1C4] text-white"
                      : "border-slate-300 bg-white text-transparent group-hover:border-[#24C1C4]/60",
                  ].join(" ")}
                >
                  ✓
                </span>

                <span
                  className={[
                    "truncate text-xs",
                    isSelected
                      ? "font-semibold text-slate-900"
                      : "font-medium text-slate-700",
                  ].join(" ")}
                >
                  {vaccine.name}
                </span>
              </div>

              {/* Action indicator */}
              <span
                className={[
                  "shrink-0 text-[10px] font-medium transition-colors",
                  isSelected
                    ? "text-[#159FA3]"
                    : "text-slate-300 group-hover:text-[#159FA3]",
                ].join(" ")}
              >
                {isSelected ? "Edit" : "+"}
              </span>
            </button>
          );
        })}
      </div>
    )}

  {/* Empty */}
  {!isLoading &&
    !loadError &&
    availableVaccines.length === 0 && (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-5 text-center">
        <p className="text-xs font-medium text-slate-600">
          No vaccinations available
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          Please try again later.
        </p>
      </div>
    )}

  {/* Footer hint */}
  {!isLoading &&
    !loadError &&
    availableVaccines.length > 0 && (
      <p className="mt-3 text-[11px] text-slate-400">
        Select a vaccination to add or update its details.
      </p>
    )}
</section>

        {/* Selected vaccinations */}
        {values.immunizations.length >
          0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Your vaccinations
                </h3>

                <p className="mt-0.5 text-xs text-slate-500">
                  {values.immunizations.length}{" "}
                  vaccination
                  {values.immunizations
                    .length === 1
                    ? ""
                    : "s"}{" "}
                  added
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {values.immunizations.map(
                (immunization) => {
                  const vaccine =
                    getVaccine(
                      immunization.immunizationId,
                    );

                  return (
                    <div
                      key={
                        immunization.immunizationId
                      }
                      className="group relative overflow-hidden rounded-[18px] border border-[#24C1C4]/25 bg-gradient-to-br from-white via-[#F9FEFE] to-[#F1FCFC] p-4 shadow-[0_7px_24px_rgba(36,193,196,0.07)]"
                    >
                      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#24C1C4]/[0.06] blur-2xl" />

                      <div className="relative flex items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            openVaccineModal(
                              immunization.immunizationId,
                            )
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#24C1C4] text-sm font-extrabold text-white shadow-[0_4px_14px_rgba(36,193,196,0.25)]">
                            ✓
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold text-[#0B2D54]">
                              {vaccine?.name ??
                                "Vaccination"}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#24C1C4]/10 px-2 py-0.5 text-[9px] font-bold text-[#159FA3]">
                                Dose{" "}
                                {immunization.doseNumber ??
                                  1}
                              </span>

                              {immunization.administeredAt && (
                                <span className="text-[10px] text-slate-400">
                                  {formatDate(
                                    immunization.administeredAt,
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openVaccineModal(
                                immunization.immunizationId,
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-500 transition hover:border-[#24C1C4]/40 hover:text-[#159FA3]"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeVaccination(
                                immunization.immunizationId,
                              )
                            }
                            className="rounded-lg border border-red-100 bg-white px-2.5 py-1.5 text-[10px] font-bold text-red-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </section>
        )}
      </div>

      {/* Vaccination modal */}
      {isModalOpen && form && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
<div className="relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.25)]">            
<div className="absolute inset-x-8 top-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#24C1C4] to-transparent shadow-[0_0_12px_rgba(36,193,196,0.55)]" />

            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#24C1C4] text-base font-extrabold text-white shadow-[0_5px_16px_rgba(36,193,196,0.25)]">
                  ✓
                </div>

                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#159FA3]">
                    Vaccination details
                  </p>

                  <h2 className="mt-0.5 text-lg font-extrabold tracking-tight text-[#0B2D54]">
                    {getVaccine(
                      form.immunizationId,
                    )?.name ??
                      "Vaccination"}
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Add what you remember. You can
                    leave optional fields blank.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
<div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
  <div className="grid gap-3.5 md:grid-cols-2">                
             <TextField
              compact
                  type="date"
                  label="Date received *"
                  value={
                    form.administeredAt
                  }
                  onChange={(value) =>
                    updateForm(
                      "administeredAt",
                      value,
                    )
                  }
                />

        <TextField
        compact
  type="number"
  label="Dose number"
  placeholder="e.g. 1, 2, or 3"
  value={
    form.doseNumber === undefined
      ? ""
      : String(form.doseNumber)
  }
  onChange={(value) =>
    updateForm(
      "doseNumber",
      value === ""
        ? undefined
        : Math.max(1, Number(value)),
    )
  }
/>


                <TextField
                 compact
                  label="Given by (optional)"
                  placeholder="e.g. Dr. Smith"
                  value={
                    form.administeredBy
                  }
                  onChange={(value) =>
                    updateForm(
                      "administeredBy",
                      value,
                    )
                  }
                />

                <TextField
                 compact
                  label="Clinic or facility (optional)"
                  placeholder="e.g. Mediclinic Pretoria"
                  value={
                    form.facility
                  }
                  onChange={(value) =>
                    updateForm(
                      "facility",
                      value,
                    )
                  }
                />

                <TextField
                compact
  label="Route (optional)"
  placeholder="e.g.  injection, oral drops, under the skin"
  value={form.route}
  onChange={(value) =>
    updateForm("route", value)
  }
/>

                <TextField
                 compact
                  label="Site (optional)"
                  placeholder="e.g. Left arm, right arm, thigh"
                  value={form.site}
                  onChange={(value) =>
                    updateForm(
                      "site",
                      value,
                    )
                  }
                />

                <TextField
                 compact
                  type="date"
                  label="Next due date (optional)"
                  value={
                    form.nextDueDate
                  }
                  onChange={(value) =>
                    updateForm(
                      "nextDueDate",
                      value,
                    )
                  }
                />
              </div>

              {/* Adverse reaction */}
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={
                      form.adverseReaction
                    }
                    onChange={(event) =>
                      updateForm(
                        "adverseReaction",
                        event.target
                          .checked,
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#24C1C4] focus:ring-[#24C1C4]"
                  />

                  <span>
  <span className="block text-xs font-bold text-slate-800">
    I experienced an adverse reaction
  </span>
  <span className="block text-xs text-slate-500 font-normal mt-0.5">
    (e.g., severe rash, fever, swelling, or breathing issues)
  </span>


                    <span className="mt-0.5 block text-[10px] text-slate-400">
                      Optional
                    </span>
                  </span>
                </label>

                {form.adverseReaction && (
                  <div className="mt-4">
                    <TextField
                      label="Reaction details"
                      value={
                        form.adverseReactionNotes
                      }
                      onChange={(value) =>
                        updateForm(
                          "adverseReactionNotes",
                          value,
                        )
                      }
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="mt-5">
                <TextField
                  label="Notes (optional)"
                  placeholder="Anything else you remember..."
                  value={form.notes}
                  onChange={(value) =>
                    updateForm(
                      "notes",
                      value,
                    )
                  }
                />
              </div>

              {/* Vaccine information */}
              {getVaccine(
                form.immunizationId,
              )?.dosageSchedule && (
                <div className="mt-5 rounded-xl border border-[#24C1C4]/20 bg-[#24C1C4]/[0.04] p-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#159FA3]">
                    Typical schedule
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {
                      getVaccine(
                        form.immunizationId,
                      )?.dosageSchedule
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-7">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Cancel
              </button>

              <button
  type="button"
  onClick={saveVaccination}
  className="rounded-xl bg-[#24C1C4] px-5 py-2.5 text-xs font-extrabold text-white shadow-[0_5px_16px_rgba(36,193,196,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#20B5B8] hover:shadow-[0_7px_20px_rgba(36,193,196,0.28)] active:translate-y-0"
>
  Save vaccination
</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(
  date: string,
) {
  if (!date) {
    return "";
  }

  const parsed = new Date(date);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return date;
  }

  return parsed.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}