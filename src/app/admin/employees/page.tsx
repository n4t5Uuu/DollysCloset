// app/admin/employees/page.tsx
"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Eye, Search, ChevronUp, ChevronDown } from "lucide-react";

// Mock data - replace with Supabase fetch later
const mockEmployees = [
  {
    user_id: "1",
    username: "maria_garcia",
    first_name: "Maria",
    last_name: "Garcia",
    role: "employee",
    created_at: "2025-01-10",
  },
  {
    user_id: "2",
    username: "alex_thompson",
    first_name: "Alex",
    last_name: "Thompson",
    role: "employee",
    created_at: "2025-01-08",
  },
  {
    user_id: "3",
    username: "sarah_kim",
    first_name: "Sarah",
    last_name: "Kim",
    role: "employee",
    created_at: "2024-12-20",
  },
  {
    user_id: "4",
    username: "james_wilson",
    first_name: "James",
    last_name: "Wilson",
    role: "employee",
    created_at: "2024-12-15",
  },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState(mockEmployees);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "desc" });
  const [selectedRows, setSelectedRows] = useState(new Set());

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      setSelectedRows(new Set(sortedEmployees.map((e) => e.user_id)));
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

  const handleDelete = (id: string) => {
    setEmployees(employees.filter((e) => e.user_id !== id));
    selectedRows.delete(id);
    setSelectedRows(new Set(selectedRows));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f8] via-white to-[#f5f0f0] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Manage Employees
            </h1>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E7A3B0] to-[#f0b8c3] hover:from-[#d891a0] hover:to-[#E7A3B0] text-white rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105">
              <Plus size={18} />
              Add Employee
            </button>
          </div>
          <p className="text-gray-600 text-sm">Manage staff members, roles, and permissions</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E7A3B0]/60 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-[#E7A3B0]/20 rounded-xl bg-white focus:outline-none focus:border-[#E7A3B0] focus:ring-2 focus:ring-[#E7A3B0]/20 transition-all duration-300 text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#E7A3B0]/10 overflow-hidden">
          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-[#faf8f8] to-white border-b border-[#E7A3B0]/10">
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === sortedEmployees.length && sortedEmployees.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-[#E7A3B0]/30 cursor-pointer"
                    />
                  </th>
                  <SortableHeader
                    label="Username"
                    sortKey="username"
                    sortConfig={sortConfig}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="First Name"
                    sortKey="first_name"
                    sortConfig={sortConfig}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Last Name"
                    sortKey="last_name"
                    sortConfig={sortConfig}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Joined"
                    sortKey="created_at"
                    sortConfig={sortConfig}
                    onSort={toggleSort}
                  />
                  <th className="px-6 py-4 text-right text-gray-600 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.length > 0 ? (
                  sortedEmployees.map((employee, idx) => (
                    <tr
                      key={employee.user_id}
                      className={`border-b border-[#E7A3B0]/10 transition-all duration-200 hover:bg-[#E7A3B0]/3 ${
                        idx % 2 === 0 ? "bg-white" : "bg-[#faf8f8]"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(employee.user_id)}
                          onChange={() => toggleSelectRow(employee.user_id)}
                          className="w-4 h-4 rounded border-[#E7A3B0]/30 cursor-pointer"
                        />
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
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            title="View"
                            className="p-2 hover:bg-[#E7A3B0]/10 rounded-lg transition-all duration-200 text-[#E7A3B0] hover:scale-110"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            title="Edit"
                            className="p-2 hover:bg-blue-50 rounded-lg transition-all duration-200 text-blue-600 hover:scale-110"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(employee.user_id)}
                            title="Delete"
                            className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 text-red-600 hover:scale-110"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
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
          <div className="px-6 py-4 bg-gradient-to-r from-[#faf8f8] to-white border-t border-[#E7A3B0]/10 flex items-center justify-between text-sm text-gray-600">
            <div>
              {selectedRows.size > 0 && (
                <span className="text-[#E7A3B0] font-medium">
                  {selectedRows.size} employee{selectedRows.size !== 1 ? "s" : ""} selected
                </span>
              )}
            </div>
            <span>Showing {sortedEmployees.length} of {employees.length} employees</span>
          </div>
        </div>
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
            {sortConfig.direction === "asc" ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </span>
        )}
      </div>
    </th>
  );
}