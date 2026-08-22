"use client";

import { SignUpSchema } from "@/schemas/auth.schema";
import { ORGANIZATION_TYPES } from "@/data/organization-types";

interface OrganizationReviewProps {
  values: Partial<SignUpSchema>;
}

export default function OrganizationReview({
  values,
}: OrganizationReviewProps) {
  const organizationTypeLabel =
    ORGANIZATION_TYPES.find(
      (type) => type.id === values.organizationType
    )?.name ||
    values.organizationType ||
    "-";

  const contactName =
    `${values.firstName ?? ""} ${values.lastName ?? ""}`.trim() || "-";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-[#0B2D54]">
          Organization Details
        </h3>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Organization Name
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {values.organizationName ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Organization Type
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {organizationTypeLabel}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Registration Number
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {values.registrationNumber ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Website
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {values.website ?? "-"}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Address
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {values.addressLine1 ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Postal Code
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {values.postalCode ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Organization Email
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {values.organizationEmail ?? "-"}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Organization Phone
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {values.organizationPhone ?? "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-[#0B2D54]">
          Primary Contact
        </h3>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Contact Name
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {contactName}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Contact Email
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {values.email ?? "-"}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Contact Phone
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {values.phoneNumber ?? "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}