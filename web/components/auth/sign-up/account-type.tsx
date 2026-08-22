"use client";

import { Building, Network, BriefcaseBusiness, UserRound, Stethoscope } from "lucide-react";

interface AccountTypeProps {
  value: "INDIVIDUAL" | "PRACTITIONER" | "ORGANIZATION" | null;
  onChange: (value: "INDIVIDUAL" | "PRACTITIONER" | "ORGANIZATION") => void;
}

export default function AccountType({
  value,
  onChange,
}: AccountTypeProps) {
  return (
    <div className="space-y-4">

      <button
        type="button"
        onClick={() => onChange("INDIVIDUAL")}
        className={`w-full rounded-2xl border p-5 text-left transition ${
          value === "INDIVIDUAL"
            ? "border-[#24C1C4] bg-[#24C1C4]/10"
            : "border-slate-200 hover:border-[#24C1C4]"
        }`}
      >
        <div className="flex items-center gap-4">
          <UserRound className="h-20 w-20 text-[#24C1C4]" />

          <div>
            <h3 className="font-semibold text-[#0B2D54]">
              Individual
            </h3>

            <p className="text-sm text-slate-500">
              Track your health and understand your body, spot health trends, and share insights with your doctor or care team.
            </p>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange("PRACTITIONER")}
        className={`w-full rounded-2xl border p-5 text-left transition ${
          value === "PRACTITIONER"
            ? "border-[#24C1C4] bg-[#24C1C4]/10"
            : "border-slate-200 hover:border-[#24C1C4]"
        }`}
      >
        <div className="flex items-center gap-4">
          <Stethoscope className="h-10 w-10 text-[#24C1C4]" />

          <div>
            <h3 className="font-semibold text-[#0B2D54]">
              Healthcare Professional
            </h3>

            <p className="text-sm text-slate-500">
              Manage patients, view client insights and deliver connected care.
            </p>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange("ORGANIZATION")}
        className={`w-full rounded-2xl border p-5 text-left transition ${
          value === "ORGANIZATION"
            ? "border-[#24C1C4] bg-[#24C1C4]/10"
            : "border-slate-200 hover:border-[#24C1C4]"
        }`}
      >
        <div className="flex items-center gap-4">
          <BriefcaseBusiness className="h-15 w-15 text-[#24C1C4]" />

          <div>
            <h3 className="font-semibold text-[#0B2D54]">
              Organization
            </h3>

            <p className="text-sm text-slate-500">
              Register your healthcare facility, clinic, or organization to manage users and workflows.
            </p>
          </div>
        </div>
      </button>

    </div>
  );
}