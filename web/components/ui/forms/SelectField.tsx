"use client";

interface Option {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label: string;
  value?: string;
  placeholder?: string;
  options: Option[];
  onChange: (value: string) => void;
}

export function SelectField({
  label,
  value,
  placeholder = "Select...",
  options,
  onChange,
}: SelectFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20"
      >
        <option value="">
          {placeholder}
        </option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}