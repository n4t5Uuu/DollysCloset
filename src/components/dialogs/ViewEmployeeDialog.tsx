import { Employee } from "@/types/employee.types";
import BaseModalDialog from "@/components/dialogs/BaseModalDialog";

interface ViewEmployeeDialogProps {
  employee: Employee;
  onClose: () => void;
}

export default function ViewEmployeeDialog({ employee, onClose }: ViewEmployeeDialogProps) {
  return (
    <BaseModalDialog onClose={onClose} title="Employee Details">
      <div className="space-y-4">
        <div className="bg-linear-to-br from-[#E7A3B0]/10 to-pink-50 rounded-xl p-4 border border-[#E7A3B0]/20">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email Address</p>
              <p className="font-semibold text-gray-900 break-all">{employee.username}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Role</p>
              <p className="font-semibold text-gray-900 capitalize">{employee.role}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">First Name</p>
            <p className="font-semibold text-gray-900">{employee.first_name}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last Name</p>
            <p className="font-semibold text-gray-900">{employee.last_name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Joined Date</p>
            <p className="font-semibold text-gray-900">
              {new Date(employee.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last Updated</p>
            <p className="font-semibold text-gray-900">
              {new Date(employee.updated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] text-white rounded-xl hover:from-[#d891a0] hover:to-[#E7A3B0] font-medium transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          Close
        </button>
      </div>
    </BaseModalDialog>
  );
}
