// app/admin/employees/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, AlertTriangle, Trash, Loader2 } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";
import AddEmployee from "@/components/modals/AddEmployee";
import { EmployeeTable } from "@/components/tables/EmployeeTable";
import { Employee } from "@/types/employee.types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import ViewEmployeeDialog from "@/components/dialogs/ViewEmployeeDialog";
import DeleteEmployeeDialog from "@/components/dialogs/DeleteEmployeeDialog";
import BulkDeleteEmployeeDialog from "@/components/dialogs/BulkDeleteEmployeeDialog";

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

  async function fetchEmployees() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/fetch-employees')
      
      if (!response.ok) {
        throw new Error('Failed to fetch employees')
      }
      
      const result = await response.json()
      console.log('fetch Data:', result.data)
      setEmployees(result.data)

    } catch (err: unknown) {
      console.error('Error fetching employees:', err)
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
    } catch (err: unknown) {
      console.error('Error deleting employee:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete employee');
    } finally {
      setActionLoading(false);
    }
  };


  // Bulk delete handler
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
    } catch (err: unknown) {
      console.error('Error bulk deleting employees:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete employees');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#faf8f8] via-white to-[#f5f0f0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#E7A3B0] animate-spin" />
          <p className="text-gray-600 font-medium">Loading employees...</p>
        </div>
      </div>
    );
  }

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

        {/* Bulk Actions Bar */}
        {selectedRows.size > 0 && (
          <div className="mb-6 p-4 bg-[#E7A3B0]/10 border border-[#E7A3B0]/30 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="text-[#E7A3B0] font-semibold">
              {selectedRows.size} employee{selectedRows.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedRows(new Set())}
                className="px-4 py-2 text-gray-700 hover:bg-white rounded-lg font-medium transition-all"
              >
                Clear Selection
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
              >
                <Trash size={16} />
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E7A3B0]/60 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-[#E7A3B0]/20 rounded-xl bg-white focus:outline-none focus:border-[#E7A3B0] focus:ring-2 focus:ring-[#E7A3B0]/20 transition-all duration-300 text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="text-sm text-gray-600">
            Showing {currentEmployees.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, sortedEmployees.length)} of {sortedEmployees.length} employees
          </div>
        </div>

        {/* Table Container */}
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
        
        {/* Footer Stats & Pagination */}
        <div className="flex flex-col gap-4 mt-2">
          {selectedRows.size > 0 && (
            <div className="p-4 bg-gray-50 border border-[#E7A3B0]/20 rounded-xl flex items-center justify-between text-sm text-gray-600">
              <span className="text-[#E7A3B0] font-medium">
                {selectedRows.size} employee{selectedRows.size !== 1 ? "s" : ""} selected
              </span>
            </div>
          )}
          
          <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage((prev) => Math.max(1, prev - 1));
                    }} 
                    className={currentPage === 1 ? "pointer-events-none opacity-50 border border-[#E7A3B0]/40 text-[#cc7f8f]" : "cursor-pointer border border-[#E7A3B0]/40 text-[#cc7f8f] hover:bg-[#fff5f7]"} 
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = totalPages <= 5 
                    ? i + 1 
                    : currentPage <= 3 
                      ? i + 1 
                      : currentPage >= totalPages - 2 
                        ? totalPages - 4 + i 
                        : currentPage - 2 + i;
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(pageNum);
                        }}
                        isActive={currentPage === pageNum}
                        className={
                          currentPage === pageNum
                            ? "cursor-pointer bg-[#E7A3B0] text-white hover:bg-[#d891a0] border border-[#E7A3B0]"
                            : "cursor-pointer border border-[#E7A3B0]/40 text-[#cc7f8f] hover:bg-[#fff5f7]"
                        }
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                    }} 
                    className={currentPage === totalPages ? "pointer-events-none opacity-50 border border-[#E7A3B0]/40 text-[#cc7f8f]" : "cursor-pointer border border-[#E7A3B0]/40 text-[#cc7f8f] hover:bg-[#fff5f7]"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
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