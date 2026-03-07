import BaseModalDialog from "@/components/dialogs/BaseModalDialog";
import { AlertTriangle, Loader2 } from "lucide-react";

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
    <BaseModalDialog onClose={onClose} title="Delete Multiple Employees">
      <div className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-200">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Are you sure?</h3>
            <p className="text-sm text-gray-600">
              This will permanently delete <span className="font-semibold">{selectedCount} employee{selectedCount !== 1 ? 's' : ''}</span> and all
              associated data. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={actionLoading}
            className="flex-1 px-4 py-3 border border-[#E7A3B0]/40 text-[#cc7f8f] rounded-xl hover:bg-[#fff5f7] hover:text-[#b96d7d] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            disabled={actionLoading}
            className="flex-1 px-4 py-3 bg-linear-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete ${selectedCount} Employee${selectedCount !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </BaseModalDialog>
  );
}
