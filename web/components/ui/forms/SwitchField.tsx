"use client";

interface SwitchFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SwitchField({
  label,
  description,
  checked,
  onChange,
}: SwitchFieldProps) {
  return (
    <div className="flex items-start justify-between rounded-lg border border-slate-200 p-4">

      <div className="pr-4">

        <p className="font-medium text-slate-900">
          {label}
        </p>

        {description && (
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        )}

      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition

          ${
            checked
              ? "bg-[#24C1C4]"
              : "bg-slate-300"
          }
        `}
      >
        <span
          className={`
            inline-block h-5 w-5 transform rounded-full bg-white transition

            ${
              checked
                ? "translate-x-5"
                : "translate-x-1"
            }
          `}
        />
      </button>

    </div>
  );
}