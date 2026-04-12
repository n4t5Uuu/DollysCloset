import { Employee } from "@dollys-closet/core";
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
} from "@dollys-closet/ui";

interface DeleteEmployeeDialogProps {
  employee: Employee;
  mode: "archive" | "restore";
  onClose: () => void;
  onDelete: () => void;
  actionLoading: boolean;
  error: string | null;
}

export default function DeleteEmployeeDialog({ employee, mode, onClose, onDelete, actionLoading, error }: DeleteEmployeeDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900">{mode === "archive" ? "Archive Employee" : "Restore Employee"}</AlertDialogTitle>
          <AlertDialogDescription>
            {mode === "archive"
              ? <>Archive <span className="font-semibold">{employee.username}</span>? The account will be hidden from active dashboards and blocked from portal access until restored.</>
              : <>Restore <span className="font-semibold">{employee.username}</span> to the active employee directory?</>}
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
            className={`${mode === "archive" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"} text-white cursor-pointer flex items-center justify-center gap-2`} 
            disabled={actionLoading}
          >
             {actionLoading ? (
               <>
                 <Loader2 className="w-4 h-4 animate-spin" />
                 {mode === "archive" ? "Archiving..." : "Restoring..."}
               </>
             ) : (
               mode === "archive" ? "Archive Employee" : "Restore Employee"
             )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

