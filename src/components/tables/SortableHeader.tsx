import { TableHead } from "@/components/ui/table";
import { ChevronUp, ChevronDown } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SortableHeader({ label, sortKey, sortConfig, onSort }: any) {
    const isActive = sortConfig.key === sortKey;

    return (
        <TableHead
        onClick={() => onSort(sortKey)}
        className="p-4 text-left font-bold cursor-pointer hover:text-[#E7A3B0] transition-colors select-none"
        >
        <div className="flex items-center gap-2">
            {label}
            {isActive && (
            <span className="text-[#E7A3B0]">
                {sortConfig.direction === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
            )}
        </div>
        </TableHead>
    );
}
