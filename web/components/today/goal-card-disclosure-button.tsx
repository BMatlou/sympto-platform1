"use client";

import { ChevronDown } from "lucide-react";

type GoalCardDisclosureButtonProps = {
  expanded: boolean;
  onToggle?: () => void;
  label?: string;
  dark?: boolean;
};

export default function GoalCardDisclosureButton({
  expanded,
  onToggle,
  label = "Show details",
  dark = false,
}: GoalCardDisclosureButtonProps) {
  if (!onToggle) return null;

  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={dark
        ? "mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-1 py-1 text-[10px] font-semibold text-white/80 transition-colors hover:text-[#8ef0ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24c1c4]"
        : "mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-1 py-1 text-[10px] font-semibold text-[#71839a] transition-colors hover:text-[#0b7b80] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24c1c4]"}
    >
      {expanded ? "Show less" : label}
      <ChevronDown className={expanded ? "h-3.5 w-3.5 rotate-180 transition-transform" : "h-3.5 w-3.5 transition-transform"} />
    </button>
  );
}
