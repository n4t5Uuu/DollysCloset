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
        <Modal onClose={() => setShowViewModal(false)} title="Employee Details">
          <div className="space-y-4">
            <div className="bg-linear-to-br from-[#E7A3B0]/10 to-pink-50 rounded-xl p-4 border border-[#E7A3B0]/20">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email Address</p>
                  <p className="font-semibold text-gray-900 break-all">{selectedEmployee.username}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Role</p>
                  <p className="font-semibold text-gray-900 capitalize">{selectedEmployee.role}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">First Name</p>
                <p className="font-semibold text-gray-900">{selectedEmployee.first_name}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last Name</p>
                <p className="font-semibold text-gray-900">{selectedEmployee.last_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Joined Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date(selectedEmployee.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last Updated</p>
                <p className="font-semibold text-gray-900">
                  {new Date(selectedEmployee.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowViewModal(false)}
              className="w-full px-4 py-3 bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] text-white rounded-xl hover:from-[#d891a0] hover:to-[#E7A3B0] font-medium transition-all shadow-md hover:shadow-lg"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEmployee && (
        <Modal onClose={() => setShowDeleteModal(false)} title="Delete Employee">
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
                  This will permanently delete <span className="font-semibold">{selectedEmployee.username}</span> and all
                  associated data. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 border border-[#E7A3B0]/40 text-[#cc7f8f] rounded-xl hover:bg-[#fff5f7] hover:text-[#b96d7d] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEmployee}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-linear-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Employee'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <Modal onClose={() => setShowBulkDeleteModal(false)} title="Delete Multiple Employees">
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
                  This will permanently delete <span className="font-semibold">{selectedRows.size} employee{selectedRows.size !== 1 ? 's' : ''}</span> and all
                  associated data. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 border border-[#E7A3B0]/40 text-[#cc7f8f] rounded-xl hover:bg-[#fff5f7] hover:text-[#b96d7d] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-linear-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  `Delete ${selectedRows.size} Employee${selectedRows.size !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Reusable Modal Component
function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}