"use client";

import { ReactNode } from "react";

interface DynamicListProps<T> {
  items: T[];

  onAdd: () => void;

  onRemove: (index: number) => void;

  renderItem: (
    item: T,
    index: number,
  ) => ReactNode;

  addButtonLabel: string;
}

export function DynamicList<T>({
  items,
  onAdd,
  onRemove,
  renderItem,
  addButtonLabel,
}: DynamicListProps<T>) {
  return (
    <div className="space-y-5">

      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          {renderItem(item, index)}

          <button
            type="button"
            onClick={() =>
              onRemove(index)
            }
            className="mt-5 text-sm font-medium text-red-600 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="rounded-lg bg-[#24C1C4] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1baeb0]"
      >
        {addButtonLabel}
      </button>

    </div>
  );
}