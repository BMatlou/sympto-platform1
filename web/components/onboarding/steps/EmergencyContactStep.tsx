"use client";

import { Phone, Mail, UserRound, HeartHandshake } from "lucide-react";

import { SectionTitle } from "@/components/onboarding/SectionTitle";
import { TextField } from "@/components/ui/forms/TextField";
import { SwitchField } from "@/components/ui/forms/SwitchField";

import type {
  UpdateEmergencyContactDto,
} from "@/types/onboarding";

import type {
  EmergencyContactFormValues,
} from "@/types/onboarding-form";

interface EmergencyContactStepProps {
  values: EmergencyContactFormValues;

  onChange: (
    values: EmergencyContactFormValues,
  ) => void;
}

const RELATIONSHIP_OPTIONS = [
  {
    value: "PARENT",
    label: "Parent",
  },
  {
    value: "CHILD",
    label: "Child",
  },
  {
    value: "SPOUSE",
    label: "Spouse",
  },
  {
    value: "SIBLING",
    label: "Sibling",
  },
  {
    value: "CAREGIVER",
    label: "Caregiver",
  },
  {
    value: "GUARDIAN",
    label: "Guardian",
  },
  {
    value: "DEPENDANT",
    label: "Dependant",
  },
  {
    value: "OTHER",
    label: "Other",
  },
] as const;

export function EmergencyContactStep({
  values,
  onChange,
}: EmergencyContactStepProps) {
  function update<
    K extends keyof EmergencyContactFormValues
  >(
    field: K,
    value: EmergencyContactFormValues[K],
  ) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-7">
      {/* HEADER */}
      <SectionTitle
        step={3}
        title="Emergency Contact"
        description="Add someone we can contact if you need help."
      />

      {/* INFO CARD */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#24C1C4]/20 bg-[#24C1C4]/5 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#24C1C4]/10">
          <HeartHandshake className="h-4 w-4 text-[#0B8E91]" />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700">
            Choose someone you trust
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            This person may be contacted if there is
            an emergency and you need assistance.
          </p>
        </div>
      </div>

      {/* CONTACT DETAILS */}
      <section className="space-y-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Contact Details
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Enter the details of your emergency contact.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* FULL NAME */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-slate-400" />

              <span className="text-sm font-semibold text-slate-700">
                Full Name
              </span>
            </div>

            <TextField
              label=""
              placeholder="e.g. Jane Doe"
              value={values.fullName ?? ""}
              onChange={(value) =>
                update("fullName", value)
              }
            />
          </div>

          {/* RELATIONSHIP */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-slate-400" />

              <label
                htmlFor="emergency-contact-relationship"
                className="text-sm font-semibold text-slate-700"
              >
                Relationship
              </label>
            </div>

            <select
              id="emergency-contact-relationship"
              value={values.relationship ?? ""}
              onChange={(event) =>
                update(
                  "relationship",
                  event.target.value as UpdateEmergencyContactDto["relationship"],
                )
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20"
            >
              <option value="">
                Select relationship
              </option>

              {RELATIONSHIP_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* PHONE */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />

              <span className="text-sm font-semibold text-slate-700">
                Phone Number
              </span>
            </div>

            <TextField
              type="text"
              label=""
              placeholder="e.g. +27 82 123 4567"
              value={values.phoneNumber ?? ""}
              onChange={(value) =>
                update(
                  "phoneNumber",
                  value,
                )
              }
            />

            <p className="mt-2 text-[11px] text-slate-400">
              Include the country code if possible.
            </p>
          </div>

          {/* EMAIL */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />

              <span className="text-sm font-semibold text-slate-700">
                Email Address
              </span>
            </div>

            <TextField
              type="email"
              label=""
              placeholder="e.g. jane@example.com"
              value={values.email ?? ""}
              onChange={(value) =>
                update("email", value)
              }
            />
          </div>
        </div>
      </section>

      {/* PRIMARY CONTACT */}
      <section>
        <SwitchField
          label="Primary Emergency Contact"
          description="Use this person as your primary emergency contact."
          checked={values.isPrimary ?? true}
          onChange={(checked) =>
            update(
              "isPrimary",
              checked,
            )
          }
        />
      </section>
    </div>
  );
}