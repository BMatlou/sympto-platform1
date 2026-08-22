"use client";

interface TextFieldProps {
  label: string;
  value?: string | number;
  type?: "text" | "number" | "date" | "type" | "time" | "email";
  placeholder?: string;
  compact?: boolean;
  onChange: (value: string) => void;
}

export function TextField({
  label,
  value,
  type = "text",
  placeholder,
  compact = false,
  onChange,
}: TextFieldProps) {
  return (
    <div>
      <label
        className={
          compact
            ? "mb-1.5 block text-xs font-medium text-slate-700"
            : "mb-2 block text-sm font-medium text-slate-700"
        }
      >
        {label}
      </label>

      <input
  type={type}
  value={value ?? ""}
  placeholder={placeholder}
  onChange={(e) =>
    onChange(e.target.value)
  }
  className={
    compact
      ? "box-border h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal leading-5 text-slate-700 placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20"
      : "box-border h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal leading-5 text-slate-700 placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 outline-none transition focus:border-[#24C1C4] focus:ring-2 focus:ring-[#24C1C4]/20"
  }
/>
    </div>
  );
}