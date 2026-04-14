"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus, Archive, RotateCcw, RefreshCcw, X } from "lucide-react";
import { createClient, Employee } from "@dollys-closet/core";
import {
  Button,
  CustomPagination,
  Skeleton,
} from "@dollys-closet/ui";
import AdminSearchInput from "@/components/general-components/AdminSearchInput";
import { AdminNoticeBanner } from "@/components/ui/admin-notice-banner";

import AddEmployee from "@/components/dialogs/AddEmployee";
import { EmployeeTable } from "@/components/tables/EmployeeTable";
import ViewEmployeeDialog from "@/components/dialogs/ViewEmployeeDialog";
import DeleteEmployeeDialog from "@/components/dialogs/DeleteEmployeeDialog";
import BulkDeleteEmployeeDialog from "@/components/dialogs/BulkDeleteEmployeeDialog";
import { toast } from "sonner";

type ActionNotice = {
  type: "success" | "warning" | "info";
  message: string;
};

type EmployeeScope = "active" | "archived";

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
  const [employeeScope, setEmployeeScope] = useState<EmployeeScope>("active");
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
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const fetchEmployees = useCallback(async (isBackground = false, scope = employeeScope) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/employees?scope=${scope}`, {
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
  }, [employeeScope]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filteredEmployees = useMemo(
    () =>
      employees.filter((emp) => {
        const query = searchTerm.toLowerCase();
        const userId = (emp.user_id ?? "").toLowerCase();
        const username = (emp.username ?? "").toLowerCase();
        const firstName = (emp.first_name ?? "").toLowerCase();
        const lastName = (emp.last_name ?? "").toLowerCase();
        return String(emp.user_key).includes(query) || username.includes(query) || firstName.includes(query) || lastName.includes(query);
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
    setSelectedRows(new Set());
    setSelectedEmployee(null);
    setShowViewModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowBulkDeleteModal(false);
    setShowAddModal(false);
  }, [employeeScope]);

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
  }, [searchTerm]);

  const toggleSelectAll = () => {
    if (allSelectableRowsSelected) {
      const next = new Set(selectedRows);
      selectableEmployees.forEach((e) => next.delete(e.user_id));
      setSelectedRows(next);
    } else {
      const next = new Set(selectedRows);
      selectableEmployees.forEach((e) => next.add(e.user_id));
      setSelectedRows(next);
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

  const openPrimaryActionModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setError(null);
    setShowDeleteModal(true);
  };

  const handleRefreshEmployees = async () => {
    await fetchEmployees();
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

  const handlePrimaryEmployeeAction = async () => {
    if (!selectedEmployee) return;
    setActionLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const endpoint = employeeScope === "active" ? '/api/admin/employees/archive' : '/api/admin/employees/restore';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ employee_id: selectedEmployee.user_id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (employeeScope === "active" ? 'Failed to archive employee' : 'Failed to restore employee'));
      await fetchEmployees();
      setSelectedRows((currentSelection) => {
        const nextSelection = new Set(currentSelection);
        nextSelection.delete(selectedEmployee.user_id);
        return nextSelection;
      });
      setShowDeleteModal(false);
      setSelectedEmployee(null);
      if (employeeScope === "active") {
        setActionNotice({
          type: "success",
          message: "Employee archived and moved to the archived directory.",
        });
        toast.success("Employee archived successfully.");
      } else {
        setActionNotice({
          type: "success",
          message: "Employee restored to the active directory.",
        });
        toast.success("Employee restored successfully.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : (employeeScope === "active" ? 'Failed to archive employee' : 'Failed to restore employee');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkScopeAction = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const idsToDelete = Array.from(selectedRows);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const endpoint = employeeScope === "active" ? '/api/admin/employees/archive' : '/api/admin/employees/restore';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ employee_ids: idsToDelete })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (employeeScope === "active" ? 'Failed to archive employees' : 'Failed to restore employees'));
      await fetchEmployees();
      const failedIds = Array.isArray(data.failed_ids) ? data.failed_ids : [];
      setSelectedRows(new Set(failedIds));
      setShowBulkDeleteModal(false);
      if ((data.failed_count ?? 0) > 0) {
        setActionNotice({
          type: "warning",
          message: data.message || (employeeScope === "active"
            ? "Some employees could not be archived. Review the remaining rows and try again."
            : "Some employees could not be restored. Review the remaining rows and try again."),
        });
        toast.warning(data.message || (employeeScope === "active" ? 'Some employees could not be archived.' : 'Some employees could not be restored.'));
      } else {
        setActionNotice({
          type: "success",
          message: employeeScope === "active"
            ? "Selected employees were archived and moved to the archived directory."
            : "Selected employees were restored to the active directory.",
        });
        toast.success(employeeScope === "active" ? "Selected employees archived successfully." : "Selected employees restored successfully.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : (employeeScope === "active" ? 'Failed to archive employees' : 'Failed to restore employees');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const selectedCount = selectedRows.size;
  const hasSearch = searchTerm.trim().length > 0;
  const activeFilterChips = useMemo(() => {
    if (!hasSearch) return [];

    return [
      {
        key: "search",
        label: `Search: ${searchTerm.trim()}`,
        onRemove: () => setSearchTerm(""),
      },
    ];
  }, [hasSearch, searchTerm]);
  const rangeSummaryMessage = useMemo(() => {
    if (loading) {
      return "Preparing employee results...";
    }

    if (filteredEmployees.length === 0) {
      return hasSearch
        ? `No employees matched "${searchTerm.trim()}".`
        : employeeScope === "active"
          ? "No employees have been added yet."
          : "No employee accounts are currently archived.";
    }

    const rangeStart = startIndex + 1;
    const rangeEnd = Math.min(endIndex, filteredEmployees.length);
    const suffix = hasSearch
      ? `matching "${searchTerm.trim()}"`
      : "in the directory";

    return `Showing ${rangeStart}-${rangeEnd} of ${filteredEmployees.length} employee${filteredEmployees.length === 1 ? "" : "s"} ${suffix}.`;
  }, [employeeScope, endIndex, filteredEmployees.length, hasSearch, loading, searchTerm, startIndex]);

  const emptyTitle = hasSearch
    ? "No employees matched your search"
    : employeeScope === "active"
      ? "No employees yet"
      : "No archived employees";
  const emptyDescription = hasSearch
    ? "Try a different name or email, or clear the search to view the full employee directory."
    : employeeScope === "active"
      ? "Create your first employee account to start managing staff access."
      : "Archived employees will appear here and can be restored when they need access again.";
  const clearAllFilters = () => {
    setSearchTerm("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Manage Employees</h1>
            {/* Mobile: scope tabs inline with title */}
            <div className="sm:hidden flex items-center rounded-lg border border-[#E7A3B0]/20 bg-[#fff9fb] p-1">
              <button
                type="button"
                onClick={() => setEmployeeScope("active")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  employeeScope === "active" ? "bg-[#E7A3B0] text-white" : "text-[#8f5f69] hover:bg-white"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setEmployeeScope("archived")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  employeeScope === "archived" ? "bg-[#E7A3B0] text-white" : "text-[#8f5f69] hover:bg-white"
                }`}
              >
                Archived
              </button>
            </div>
            {/* Mobile: refresh icon on far right */}
            <button
              type="button"
              onClick={handleRefreshEmployees}
              disabled={loading}
              title="Refresh employees"
              className="sm:hidden ml-auto p-1.5 text-[#b96d7d] hover:text-[#E7A3B0] disabled:opacity-50 transition-colors"
            >
              <RefreshCcw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {employeeScope === "active"
              ? "Manage staff members, roles, and archive access when accounts should no longer be active."
              : "Review archived employee accounts and restore them when access should be re-enabled."}
          </p>
          {/* Mobile: Add Employee button below description */}
          {employeeScope === "active" && (
            <button
              onClick={openAddModal}
              className="sm:hidden mt-2 flex items-center gap-2 px-4 py-2 bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] hover:from-[#d891a0] hover:to-[#E7A3B0] text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer"
            >
              <Plus size={16} />
              Add Employee
            </button>
          )}
        </div>
        {/* Desktop: tabs + Refresh button + Add Employee */}
        <div className="hidden sm:flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-[#E7A3B0]/20 bg-[#fff9fb] p-1">
            <button
              type="button"
              onClick={() => setEmployeeScope("active")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                employeeScope === "active"
                  ? "bg-[#E7A3B0] text-white"
                  : "text-[#8f5f69] hover:bg-white"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setEmployeeScope("archived")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                employeeScope === "archived"
                  ? "bg-[#E7A3B0] text-white"
                  : "text-[#8f5f69] hover:bg-white"
              }`}
            >
              Archived
            </button>
          </div>
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
          {employeeScope === "active" && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] hover:from-[#d891a0] hover:to-[#E7A3B0] text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer sm:shrink-0"
            >
              <Plus size={16} />
              Add Employee
            </button>
          )}
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
          <div className="flex items-center gap-3 flex-wrap">
            <AdminSearchInput
              ref={searchInputRef}
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by user ID, username, and full name"
              ariaLabel="Search employees by user ID, username, and full name"
              className="min-w-[240px]"
              clearLabel="Clear employee search"
            />
          </div>

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E7A3B0]/15 bg-[#fffcfd] px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b47c88]">
                Active
              </span>
              {activeFilterChips.map((chip) => (
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
                onClick={clearAllFilters}
                className="inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b47c88] transition-colors hover:text-[#8f5f69]"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="hidden sm:block text-sm text-gray-600">{rangeSummaryMessage}</p>
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-md bg-[#fff0f3] px-2.5 py-1 text-xs font-semibold text-[#b96d7d]">
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
                  <Button
                    size="sm"
                    className={`${employeeScope === "active" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"} text-white h-9 text-xs font-medium`}
                    onClick={() => setShowBulkDeleteModal(true)}
                  >
                  {employeeScope === "active" ? <Archive className="w-4 h-4 mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  {employeeScope === "active" ? "Archive" : "Restore"} ({selectedCount})
                </Button>
              </div>
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
            mode={employeeScope}
            sortedEmployees={currentEmployees}
            selectedRows={selectedRows}
            hasSelectableRows={hasSelectableRows}
            allSelectableRowsSelected={allSelectableRowsSelected}
            toggleSelectAll={toggleSelectAll}
            toggleSelectRow={toggleSelectRow}
            openViewModal={openViewModal}
            openEditModal={openEditModal}
            openPrimaryActionModal={openPrimaryActionModal}
            currentUserId={currentUserId}
            onRowActivate={employeeScope === "active" ? openEditModal : undefined}
            showingStart={filteredEmployees.length > 0 ? startIndex + 1 : 0}
            showingEnd={Math.min(endIndex, filteredEmployees.length)}
            totalFilteredCount={filteredEmployees.length}
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
          mode={employeeScope === "active" ? "archive" : "restore"}
          onClose={() => setShowDeleteModal(false)}
          onDelete={handlePrimaryEmployeeAction}
          actionLoading={actionLoading}
          error={error}
        />
      )}

      {showBulkDeleteModal && (
        <BulkDeleteEmployeeDialog
          selectedCount={selectedRows.size}
          mode={employeeScope === "active" ? "archive" : "restore"}
          onClose={() => setShowBulkDeleteModal(false)}
          onDelete={handleBulkScopeAction}
          actionLoading={actionLoading}
          error={error}
        />
      )}
    </div>
  );
}
