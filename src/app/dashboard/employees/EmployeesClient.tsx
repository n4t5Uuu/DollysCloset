"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus, Search, X, AlertTriangle, Trash, RefreshCcw } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddEmployee from "@/components/modals/AddEmployee";
import { EmployeeTable } from "@/components/tables/EmployeeTable";
import { Employee } from "@/types/employee.types";
import CustomPagination from "@/components/general-components/CustomPagination";

import ViewEmployeeDialog from "@/components/dialogs/ViewEmployeeDialog";
import DeleteEmployeeDialog from "@/components/dialogs/DeleteEmployeeDialog";
import BulkDeleteEmployeeDialog from "@/components/dialogs/BulkDeleteEmployeeDialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminNoticeBanner } from "@/components/ui/admin-notice-banner";

type ActionNotice = {
  type: "success" | "warning" | "info";
  message: string;
};

export default function EmployeesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const handlePageChange = (page: number) => {
    if (page <= 1) {
      router.replace(pathname);
    } else {
      router.replace(`${pathname}?page=${page}`);
    }
  };

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const itemsPerPage = 10;

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    browserSupabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const fetchEmployees = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/fetch-employees", {
        cache: "no-store",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }
      
      const result = await response.json();
      setEmployees(result.data);
      return true;

    } catch (err: unknown) {
      console.error("ERROR fetching employees:", err);
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filteredEmployees = useMemo(
    () =>
      employees.filter((emp) => {
        const query = searchTerm.toLowerCase();
        const username = (emp.username ?? "").toLowerCase();
        const firstName = (emp.first_name ?? "").toLowerCase();
        const lastName = (emp.last_name ?? "").toLowerCase();
        return username.includes(query) || firstName.includes(query) || lastName.includes(query);
      }),
    [employees, searchTerm]
  );

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

  useEffect(() => {
    router.replace(pathname);
  }, [searchTerm, router, pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (event.key === "/" && !isTypingTarget) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }

      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const selectableEmployees = currentUserId
    ? currentEmployees.filter((employee) => employee.user_id !== currentUserId)
    : [];
  const selectedVisibleCount = selectableEmployees.filter((employee) => selectedRows.has(employee.user_id)).length;
  const hasSelectableRows = selectableEmployees.length > 0;
  const allSelectableRowsSelected = hasSelectableRows && selectedVisibleCount === selectableEmployees.length;

  useEffect(() => {
    setSelectedRows(new Set());
  }, [searchTerm, safePage]);

  const toggleSelectAll = () => {
    if (allSelectableRowsSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(selectableEmployees.map((e) => e.user_id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const openAddModal = () => {
    setSelectedEmployee(null);
    setError(null);
    setShowAddModal(true);
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setError(null);
    setShowEditModal(true);
  };

  const openViewModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  const openDeleteModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setError(null);
    setShowDeleteModal(true);
  };

  const handleRefreshEmployees = async () => {
    const refreshed = await fetchEmployees();
    if (refreshed) {
      setActionNotice({
        type: "info",
        message: "Employee directory refreshed with the latest records.",
      });
    }
  };

  const handleEmployeeSaved = async (mode: "created" | "updated") => {
    const refreshed = await fetchEmployees();
    if (refreshed) {
      setActionNotice({
        type: "success",
        message:
          mode === "created"
            ? "Employee added and the directory is up to date."
            : "Employee details updated and the directory is up to date.",
      });
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;
    setActionLoading(true);
    setError(null);
    try {
      const { data: { session } } = await browserSupabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const response = await fetch('/api/admin/delete-employee', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ employee_id: selectedEmployee.user_id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete employee');
      await fetchEmployees();
      setSelectedRows((currentSelection) => {
        const nextSelection = new Set(currentSelection);
        nextSelection.delete(selectedEmployee.user_id);
        return nextSelection;
      });
      setShowDeleteModal(false);
      setSelectedEmployee(null);
      setActionNotice({
        type: "success",
        message: "Employee removed and the directory is up to date.",
      });
      toast.success("Employee deleted successfully.");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete employee';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const idsToDelete = Array.from(selectedRows);
      const { data: { session } } = await browserSupabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const response = await fetch('/api/admin/bulk-delete-employees', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ employee_ids: idsToDelete })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete employees');
      await fetchEmployees();
      const failedIds = Array.isArray(data.failed_ids) ? data.failed_ids : [];
      setSelectedRows(new Set(failedIds));
      setShowBulkDeleteModal(false);
      if ((data.failed_count ?? 0) > 0) {
        setActionNotice({
          type: "warning",
          message: data.message || "Some employees could not be deleted. Review the remaining rows and try again.",
        });
        toast.warning(data.message || 'Some employees could not be deleted.');
      } else {
        setActionNotice({
          type: "success",
          message: "Selected employees removed and the directory is up to date.",
        });
        toast.success("Selected employees deleted successfully.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete employees';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const selectedCount = selectedRows.size;
  const hasSearch = searchTerm.trim().length > 0;
  const rangeSummaryMessage = useMemo(() => {
    if (loading) {
      return "Preparing employee results...";
    }

    if (filteredEmployees.length === 0) {
      return hasSearch
        ? `No employees matched "${searchTerm.trim()}".`
        : "No employees have been added yet.";
    }

    const rangeStart = startIndex + 1;
    const rangeEnd = Math.min(endIndex, filteredEmployees.length);
    const suffix = hasSearch
      ? `matching "${searchTerm.trim()}"`
      : "in the directory";

    return `Showing ${rangeStart}-${rangeEnd} of ${filteredEmployees.length} employee${filteredEmployees.length === 1 ? "" : "s"} ${suffix}.`;
  }, [endIndex, filteredEmployees.length, hasSearch, loading, searchTerm, startIndex]);

  const emptyTitle = hasSearch ? "No employees matched your search" : "No employees yet";
  const emptyDescription = hasSearch
    ? "Try a different name or email, or clear the search to view the full employee directory."
    : "Create your first employee account to start managing staff access.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Employees</h1>
          <p className="text-gray-500 text-sm">Manage staff members, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleRefreshEmployees}
            disabled={loading}
            className="h-10 border-[#E7A3B0]/30 text-[#b96d7d] hover:bg-[#fff5f7] hover:text-[#b96d7d]"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] hover:from-[#d891a0] hover:to-[#E7A3B0] text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer sm:shrink-0"
          >
            <Plus size={16} />
            Add Employee
          </button>
        </div>
      </div>

        {error && (
          <AdminNoticeBanner
            tone="error"
            title="Unable to load employees"
            message={error}
            onDismiss={() => setError(null)}
            actionLabel="Try again"
            onAction={() => {
              void fetchEmployees();
            }}
          />
        )}

        {actionNotice && (
          <AdminNoticeBanner
            tone={actionNotice.type}
            title={
              actionNotice.type === "success"
                ? "Employee directory updated"
                : actionNotice.type === "warning"
                  ? "Employee action needs review"
                  : "Employee directory refreshed"
            }
            message={actionNotice.message}
            onDismiss={() => setActionNotice(null)}
          />
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search employees by name or email"
              className="w-full pl-9 pr-10 h-9 rounded-full border-gray-300 text-sm text-gray-900 bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                aria-label="Clear employee search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-gray-600">{rangeSummaryMessage}</p>
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-[#fff5f7] px-3 py-1 text-xs font-medium text-[#b96d7d]">
                  {selectedCount} selected
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRows(new Set())}
                  className="h-8 border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-700"
                >
                  Clear selection
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="text-sm text-gray-600" />
          <div className="flex gap-3">
            {selectedRows.size > 0 && (
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white h-9 text-xs font-medium"
                onClick={() => setShowBulkDeleteModal(true)}
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete ({selectedRows.size})
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border p-4 space-y-4">
            <Skeleton className="h-12 w-full rounded-md" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <EmployeeTable
            sortedEmployees={currentEmployees}
            selectedRows={selectedRows}
            hasSelectableRows={hasSelectableRows}
            allSelectableRowsSelected={allSelectableRowsSelected}
            toggleSelectAll={toggleSelectAll}
            toggleSelectRow={toggleSelectRow}
            openViewModal={openViewModal}
            openEditModal={openEditModal}
            openDeleteModal={openDeleteModal}
            currentUserId={currentUserId}
            onRowActivate={openEditModal}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        )}
        
      <div className="flex flex-col gap-4 mt-2">
        <CustomPagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      <AddEmployee 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onEmployeeSaved={() => handleEmployeeSaved("created")}
      />

      {showEditModal && selectedEmployee && (
        <AddEmployee 
            isOpen={showEditModal} 
            onClose={() => { setShowEditModal(false); setSelectedEmployee(null); }} 
            employeeToEdit={selectedEmployee}
            onEmployeeSaved={() => handleEmployeeSaved("updated")}
        />
      )}

      {showViewModal && selectedEmployee && (
        <ViewEmployeeDialog
          employee={selectedEmployee}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {showDeleteModal && selectedEmployee && (
        <DeleteEmployeeDialog
          employee={selectedEmployee}
          onClose={() => setShowDeleteModal(false)}
          onDelete={handleDeleteEmployee}
          actionLoading={actionLoading}
          error={error}
        />
      )}

      {showBulkDeleteModal && (
        <BulkDeleteEmployeeDialog
          selectedCount={selectedRows.size}
          onClose={() => setShowBulkDeleteModal(false)}
          onDelete={handleBulkDelete}
          actionLoading={actionLoading}
          error={error}
        />
      )}
    </div>
  );
}
