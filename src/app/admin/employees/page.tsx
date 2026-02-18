// app/admin/employees/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Eye, Search, ChevronUp, ChevronDown, X, AlertTriangle, Trash, Loader2 } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import AddEmployee from "@/components/modals/AddEmployee";
import { Employee } from "@/types/employee.types";

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "user_key", direction: "asc" });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

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

    } catch (err: any) {
      console.error('Error fetching employees:', err)
      setError(err.message)
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

  const toggleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc",
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === sortedEmployees.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedEmployees.map((e) => e.id)));
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
    } catch (err: any) {
      console.error('Error deleting employee:', err);
      setError(err.message || 'Failed to delete employee');
    } finally {
      setActionLoading(false);
    }
  };


  // Bulk delete handler (DISABLED FOR NOW)
  // const handleBulkDelete = async () => {
  //   setActionLoading(true);
  //   setError(null);

  //   try {
  //     const idsToDelete = Array.from(selectedRows);

  //     // Get current session token
  //     const { data: { session } } = await browserSupabase.auth.getSession();
      
  //     if (!session) {
  //       throw new Error('Not authenticated');
  //     }

  //     // Call the API route
  //     const response = await fetch('/api/admin/bulk-delete-employees', {
  //       method: 'DELETE',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${session.access_token}`
  //       },
  //       body: JSON.stringify({
  //         employee_ids: idsToDelete,
  //       })
  //     });

  //     const data = await response.json();

  //     if (!response.ok) {
  //       throw new Error(data.error || 'Failed to delete employees');
  //     }

  //     // Refresh employee list
  //     await fetchEmployees();
  //     setSelectedRows(new Set());
  //     setShowBulkDeleteModal(false);
  //   } catch (err: any) {
  //     console.error('Error bulk deleting employees:', err);
  //     setError(err.message || 'Failed to delete employees');
  //   } finally {
  //     setActionLoading(false);
  //   }
  // };

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
    <div className="min-h-screen bg-linear-to-br from-[#faf8f8] via-white to-[#f5f0f0]">
      <div className="max-w-7xl mx-auto">
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

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#E7A3B0]/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-linear-to-r from-[#faf8f8] to-white border-b border-[#E7A3B0]/10">

                {/* Checkbox column for bulk selection (DISABLED FOR NOW) */}
                  {/* <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === sortedEmployees.length && sortedEmployees.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-[#E7A3B0]/30 cursor-pointer"
                    />
                  </th> */}
                  <SortableHeader label="User ID" sortKey="user_key" sortConfig={sortConfig} onSort={toggleSort} />
                  <SortableHeader label="Username" sortKey="username" sortConfig={sortConfig} onSort={toggleSort} />
                  <SortableHeader label="First Name" sortKey="first_name" sortConfig={sortConfig} onSort={toggleSort} />
                  <SortableHeader label="Last Name" sortKey="last_name" sortConfig={sortConfig} onSort={toggleSort} />
                  <SortableHeader label="Joined" sortKey="created_at" sortConfig={sortConfig} onSort={toggleSort} />
                  <SortableHeader label="Last Updated" sortKey="updated_at" sortConfig={sortConfig} onSort={toggleSort} />
                  <th className="px-6 py-4 text-right text-gray-600 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.length > 0 ? (
                  sortedEmployees.map((employee, idx) => (
                    <tr
                      key={employee.user_key}
                      className={`border-b border-[#E7A3B0]/10 transition-all duration-200 hover:bg-[#E7A3B0]/3 ${
                        idx % 2 === 0 ? "bg-white" : "bg-[#faf8f8]"
                      } ${selectedRows.has(employee.user_key) ? "bg-[#E7A3B0]/5" : ""}`}
                    >
                      {/*  Checkbox column for bulk selection (DISABLED FOR NOW) */}
                      {/* <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(employee.user_key)}
                          onChange={() => toggleSelectRow(employee.user_key)}
                          className="w-4 h-4 rounded border-[#E7A3B0]/30 cursor-pointer"
                        />
                      </td> */}
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{employee.user_key}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{employee.username}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{employee.first_name}</td>
                      <td className="px-6 py-4 text-gray-700">{employee.last_name}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {new Date(employee.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {new Date(employee.updated_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openViewModal(employee)}
                            title="View"
                            className="p-2 hover:bg-[#E7A3B0]/10 rounded-lg transition-all duration-200 text-[#E7A3B0] hover:scale-110 cursor-pointer"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => openEditModal(employee)}
                            title="Edit"
                            className="p-2 hover:bg-blue-50 rounded-lg transition-all duration-200 text-blue-600 hover:scale-110 cursor-pointer"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(employee)}
                            title="Delete"
                            className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 text-red-600 hover:scale-110 cursor-pointer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-10 h-10 text-[#E7A3B0]/30" />
                        <p className="text-gray-600 font-medium">No employees found</p>
                        <p className="text-gray-400 text-sm">Try adjusting your search terms</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Stats */}
          <div className="px-6 py-4 bg-linear-to-r from-[#faf8f8] to-white border-t border-[#E7A3B0]/10 flex items-center justify-between text-sm text-gray-600">
            <div>
              {selectedRows.size > 0 && (
                <span className="text-[#E7A3B0] font-medium">
                  {selectedRows.size} employee{selectedRows.size !== 1 ? "s" : ""} selected
                </span>
              )}
            </div>
            <span>
              Showing {sortedEmployees.length} of {employees.length} employees
            </span>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {/* Add Employee Modal */}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email Address</p>
                  <p className="font-semibold text-gray-900">{selectedEmployee.username}</p>
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
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Bulk Delete Confirmation Modal (DISABLED) */}
      {/* {showBulkDeleteModal && (
        <Modal onClose={() => setShowBulkDeleteModal(false)} title="Delete Multiple Employees">
          <div className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-200">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
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
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                // onClick={handleBulkDelete}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      )} */}
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

// Sortable Column Header Component
function SortableHeader({ label, sortKey, sortConfig, onSort }: any) {
  const isActive = sortConfig.key === sortKey;

  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-6 py-4 text-left text-gray-600 font-semibold text-sm cursor-pointer hover:text-[#E7A3B0] transition-colors duration-200 select-none"
    >
      <div className="flex items-center gap-2">
        {label}
        {isActive && (
          <span className="text-[#E7A3B0]">
            {sortConfig.direction === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        )}
      </div>
    </th>
  );
}