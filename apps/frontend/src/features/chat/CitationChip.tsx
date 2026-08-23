"use client";

import { cn } from "@/lib/utils";

type CitationChipProps = {
  number: number;
  title: string;
  active: boolean;
  onSelect: (number: number) => void;
};

export function CitationChip({ number, title, active, onSelect }: CitationChipProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={`Xem nguồn ${number}: ${title}`}
      aria-pressed={active}
      className={cn(
        "mx-0.5 inline rounded-[4px] border-0 border-b-2 bg-accent-soft px-1 py-px align-super font-mono text-[15px] font-medium leading-none text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active ? "border-accent bg-[#f3ddd6]" : "border-transparent hover:bg-[#f3ddd6]",
      )}
      onClick={() => onSelect(number)}
    >
      [{number}]
    </button>
  );
}
