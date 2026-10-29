import { X } from "lucide-react";

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export function ActiveFilterChips({ chips, onClearAll }: { chips: FilterChip[]; onClearAll: () => void }) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E7A3B0]/15 bg-[#fffcfd] px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b47c88]">Active</span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-2 rounded-full border border-[#E7A3B0]/25 bg-white px-3 py-1.5 text-xs font-medium text-[#6f5058] transition-colors hover:bg-[#fff5f7]"
        >
          <span className="max-w-[280px] truncate">{chip.label}</span>
          <X className="h-3.5 w-3.5 text-[#b47c88]" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b47c88] transition-colors hover:text-[#8f5f69]"
      >
        Clear all
      </button>
    </div>
  );
}
