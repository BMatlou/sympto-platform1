"use client";

interface SectionTitleProps {
  step: number;
  title: string;
  description: string;
}

export function SectionTitle({
  step,
  title,
  description,
}: SectionTitleProps) {
  return (
    <div className="mb-8">
      <p className="text-sm font-semibold text-[#24C1C4]">
        Step {step}
      </p>

      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0B2D54]">
        {title}
      </h1>

      <p className="mt-3 max-w-2xl text-slate-600">
        {description}
      </p>
    </div>
  );
}