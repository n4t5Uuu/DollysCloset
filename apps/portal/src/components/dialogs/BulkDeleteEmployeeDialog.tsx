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
} from "@/components/ui/alert-dialog";

interface BulkDeleteEmployeeDialogProps {
  selectedCount: number;
  onClose: () => void;
  onDelete: () => void;
  actionLoading: boolean;
  error: string | null;
}

export default function BulkDeleteEmployeeDialog({
  selectedCount,
  onClose,
  onDelete,
  actionLoading,
  error
}: BulkDeleteEmployeeDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900">Delete Multiple Employees</AlertDialogTitle>
          <AlertDialogDescription>
               Are you sure you want to delete <span className="font-semibold">{selectedCount} employee{selectedCount !== 1 ? 's' : ''}</span>? This will permanently delete the accounts and all associated data. This action cannot be undone.
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
            className="bg-red-500 hover:bg-red-600 text-white cursor-pointer flex items-center justify-center gap-2" 
            disabled={actionLoading}
          >
             {actionLoading ? (
               <>
                 <Loader2 className="w-4 h-4 animate-spin" />
                 Deleting...
               </>
             ) : (
               `Delete ${selectedCount} Employee${selectedCount !== 1 ? 's' : ''}`
             )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
