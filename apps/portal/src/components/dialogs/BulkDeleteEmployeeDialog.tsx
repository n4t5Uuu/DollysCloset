import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dollys-closet/ui";

interface BulkDeleteEmployeeDialogProps {
  selectedCount: number;
  mode: "archive" | "restore";
  onClose: () => void;
  onDelete: () => void;
  actionLoading: boolean;
  error: string | null;
}

const plural = (count: number) => (count !== 1 ? "s" : "");

const MODE_COPY = {
  archive: {
    title: "Archive Multiple Employees",
    describe: (count: number) => (
      <>
        Archive <span className="font-semibold">{count} employee{plural(count)}</span>? Archived accounts are hidden from active dashboards and blocked from portal access until restored.
      </>
    ),
    pending: "Archiving...",
    action: (count: number) => `Archive ${count} Employee${plural(count)}`,
    actionClass: "bg-amber-500 hover:bg-amber-600",
  },
  restore: {
    title: "Restore Multiple Employees",
    describe: (count: number) => (
      <>
        Restore <span className="font-semibold">{count} employee{plural(count)}</span> to the active employee directory?
      </>
    ),
    pending: "Restoring...",
    action: (count: number) => `Restore ${count} Employee${plural(count)}`,
    actionClass: "bg-emerald-600 hover:bg-emerald-700",
  },
} as const;

export default function BulkDeleteEmployeeDialog({
  selectedCount,
  mode,
  onClose,
  onDelete,
  actionLoading,
  error
}: BulkDeleteEmployeeDialogProps) {
  const copy = MODE_COPY[mode];

  return (
    <AlertDialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900">
            {copy.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {copy.describe(selectedCount)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onClose} 
            className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900" 
            disabled={actionLoading}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => { e.preventDefault(); onDelete(); }} 
            className={`${copy.actionClass} text-white cursor-pointer flex items-center justify-center gap-2`} 
            disabled={actionLoading}
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {copy.pending}
              </>
            ) : (
              copy.action(selectedCount)
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
