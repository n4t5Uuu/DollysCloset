import { Employee } from "@/types/employee.types";
import { AlertTriangle, Loader2 } from "lucide-react";
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

interface DeleteEmployeeDialogProps {
  employee: Employee;
  onClose: () => void;
  onDelete: () => void;
  actionLoading: boolean;
  error: string | null;
}

export default function DeleteEmployeeDialog({ employee, onClose, onDelete, actionLoading, error }: DeleteEmployeeDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900">Delete Employee</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <span className="font-semibold">{employee.username}</span>? This will permanently delete the account and all associated data. This action cannot be undone.
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
               "Delete Employee"
             )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
