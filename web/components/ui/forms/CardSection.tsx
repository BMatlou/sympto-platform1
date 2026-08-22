"use client";

import { ReactNode } from "react";

interface CardSectionProps {
  children: ReactNode;

  title?: string;

  description?: string;

  className?: string;
}

export function CardSection({
  children,
  title,
  description,
  className = "",
}: CardSectionProps) {
  return (
    <section
      className={`
        rounded-xl
        border
        border-slate-200
        bg-white
        p-6
        shadow-sm
        ${className}
      `}
    >
      {(title || description) && (
        <div className="mb-6">

          {title && (
            <h3 className="text-lg font-semibold text-slate-900">
              {title}
            </h3>
          )}

          {description && (
            <p className="mt-2 text-sm text-slate-600">
              {description}
            </p>
          )}

        </div>
      )}

      {children}
    </section>
  );
}