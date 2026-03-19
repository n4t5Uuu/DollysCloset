// app/admin/employees/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, AlertTriangle, Trash, Loader2 } from "lucide-react";
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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "user_key", direction: "asc" });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
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



  // Fetch employees 
  useEffect(() => {
    fetchEmployees();
  }, []);

  /**
   * Fetches all employee records from the backend.
   * Sends a GET request to /api/admin/fetch-employees and populates the employee list.
   */
  async function fetchEmployees() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/fetch-employees')
      
      if (!response.ok) {
        throw new Error('Failed to fetch employees')
      }
      
      const result = await response.json()
      console.log('Successfully fetched employees:', result.data?.length || 0, 'records')
      setEmployees(result.data)

    } catch (err: unknown) {
      console.error('CRITICAL ERROR fetching employees:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    const query = searchTerm.toLowerCase();

    const username = (emp.username ?? "").toLowerCase();
    const firstName = (emp.first_name ?? "").toLowerCase();
    const lastName = (emp.last_name ?? "").toLowerCase();

    return (
      username.includes(query) ||
      firstName.includes(query) ||
      lastName.includes(query)
    );
  });


  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const aValue = a[sortConfig.key as keyof typeof a];
    const bValue = b[sortConfig.key as keyof typeof b];

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedEmployees.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = sortedEmployees.slice(startIndex, endIndex);

  // Reset page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  const toggleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc",
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === currentEmployees.length && currentEmployees.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(currentEmployees.map((e) => e.user_id)));
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

  // Modal handlers
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



  /**
   * Deletes a specific employee from the system.
   * Calls the /api/admin/delete-employee backend endpoint using the selected employee's ID.
   * Refreshes the employee list after a successful deletion.
   */
  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    setActionLoading(true);
    setError(null);

    try {
      // Get current session token
      const { data: { session } } = await browserSupabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the API route
      const response = await fetch('/api/admin/delete-employee', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          employee_id: selectedEmployee.user_id, 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete employee');
      }

      // Refresh employee list
      await fetchEmployees();
      selectedRows.delete(selectedEmployee.user_id);
      setSelectedRows(new Set(selectedRows));
      setShowDeleteModal(false);
      setSelectedEmployee(null);
      toast.success("Employee deleted successfully.");
    } catch (err: unknown) {
      console.error('Error deleting employee:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete employee';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };


  // Bulk delete handler
  /**
   * Deletes multiple selected employees from the system.
   * Interacts with the /api/admin/bulk-delete-employees backend endpoint using an array of employee IDs.
   * Clears selection and refreshes the employee list after success.
   */
  const handleBulkDelete = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const idsToDelete = Array.from(selectedRows);

      // Get current session token
      const { data: { session } } = await browserSupabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the API route
      const response = await fetch('/api/admin/bulk-delete-employees', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          employee_ids: idsToDelete,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete employees');
      }

      // Refresh employee list
      await fetchEmployees();
      setSelectedRows(new Set());
      setShowBulkDeleteModal(false);
      toast.success("Selected employees deleted successfully.");
    } catch (err: unknown) {
      console.error('Error bulk deleting employees:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete employees';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };



  return (
    <div className="p-6 min-h-screen bg-linear-to-br from-[#faf8f8] via-white to-[#f5f0f0]">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Manage Employees
            </h1>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] hover:from-[#d891a0] hover:to-[#E7A3B0] text-white rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer"
            >
              <Plus size={18} />
              Add Employee
            </button>
          </div>
          <p className="text-gray-600 text-sm">Manage staff members, roles, and permissions</p>
        </div>

        {/* Global Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 rounded-full border-gray-300 text-gray-900 bg-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="text-sm text-gray-600">
            Showing {currentEmployees.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, sortedEmployees.length)} of {sortedEmployees.length} employees
          </div>
          <div className="flex gap-3">
            {selectedRows.size > 0 && (
              <Button
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => setShowBulkDeleteModal(true)}
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete ({selectedRows.size})
              </Button>
            )}
          </div>
        </div>

        {/* Table Container */}
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
            toggleSelectAll={toggleSelectAll}
            toggleSelectRow={toggleSelectRow}
            sortConfig={sortConfig}
            toggleSort={toggleSort}
            openViewModal={openViewModal}
            openEditModal={openEditModal}
            openDeleteModal={openDeleteModal}
          />
        )}
        
        {/* Footer Stats & Pagination */}
        <div className="flex flex-col gap-4 mt-2">
          <CustomPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Add Employee Modal */}
      <AddEmployee 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onEmployeeSaved={fetchEmployees}
      />

      {showEditModal && selectedEmployee && (
        <AddEmployee 
            isOpen={showEditModal} 
            onClose={() => { setShowEditModal(false); setSelectedEmployee(null); }} 
            employeeToEdit={selectedEmployee}
            onEmployeeSaved={fetchEmployees}
        />
      )}

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <ViewEmployeeDialog
          employee={selectedEmployee}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEmployee && (
        <DeleteEmployeeDialog
          employee={selectedEmployee}
          onClose={() => setShowDeleteModal(false)}
          onDelete={handleDeleteEmployee}
          actionLoading={actionLoading}
          error={error}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
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