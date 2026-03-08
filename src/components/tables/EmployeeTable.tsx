import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, Search } from "lucide-react";
import { SortableHeader } from "./SortableHeader";
import { Employee } from "@/types/employee.types";

interface EmployeeTableProps {
  sortedEmployees: Employee[];
  selectedRows: Set<string>;
  toggleSelectAll: () => void;
  toggleSelectRow: (id: string) => void;
  sortConfig: { key: string; direction: string };
  toggleSort: (key: string) => void;
  openViewModal: (employee: Employee) => void;
  openEditModal: (employee: Employee) => void;
  openDeleteModal: (employee: Employee) => void;
}

export function EmployeeTable({
  sortedEmployees,
  selectedRows,
  toggleSelectAll,
  toggleSelectRow,
  sortConfig,
  toggleSort,
  openViewModal,
  openEditModal,
  openDeleteModal,
}: EmployeeTableProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader className="border-b bg-gray-50">
            <TableRow>
              {/* Checkbox column for bulk selection */}
              <TableHead className="p-4 text-left w-12">
                <Checkbox
                  checked={selectedRows.size === sortedEmployees.length && sortedEmployees.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <SortableHeader label="User ID" sortKey="user_key" sortConfig={sortConfig} onSort={toggleSort} />
              <SortableHeader label="Username" sortKey="username" sortConfig={sortConfig} onSort={toggleSort} />
              <SortableHeader label="First Name" sortKey="first_name" sortConfig={sortConfig} onSort={toggleSort} />
              <SortableHeader label="Last Name" sortKey="last_name" sortConfig={sortConfig} onSort={toggleSort} />
              <SortableHeader label="Joined" sortKey="created_at" sortConfig={sortConfig} onSort={toggleSort} />
              <SortableHeader label="Last Updated" sortKey="updated_at" sortConfig={sortConfig} onSort={toggleSort} />
              <TableHead className="p-4 text-center font-bold w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEmployees.length > 0 ? (
              sortedEmployees.map((employee) => (
                <TableRow
                  key={employee.user_key}
                  className={`border-b hover:bg-gray-50 ${selectedRows.has(employee.user_id) ? "bg-[#E7A3B0]/5" : ""}`}
                >
                  <TableCell className="p-4">
                    <Checkbox
                      checked={selectedRows.has(employee.user_id)}
                      onCheckedChange={() => toggleSelectRow(employee.user_id)}
                    />
                  </TableCell>
                  <TableCell className="p-4">
                    <span className="font-medium text-gray-900">{employee.user_key}</span>
                  </TableCell>
                  <TableCell className="p-4">
                    <span className="font-medium text-gray-900">{employee.username}</span>
                  </TableCell>
                  <TableCell className="p-4 text-gray-700">{employee.first_name}</TableCell>
                  <TableCell className="p-4 text-gray-700">{employee.last_name}</TableCell>
                  <TableCell className="p-4 text-gray-600 text-sm">
                    {new Date(employee.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="p-4 text-gray-600 text-sm">
                    {new Date(employee.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button size="icon" variant="outline" className="border-pink-200 text-pink-600 bg-pink-50 hover:bg-pink-200 hover:text-pink-700 hover:border-pink-300" onClick={() => openViewModal(employee)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-200 hover:text-blue-700 hover:border-blue-300" onClick={() => openEditModal(employee)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="border-red-200 text-red-600 bg-red-50 hover:bg-red-200 hover:text-red-700 hover:border-red-300" onClick={() => openDeleteModal(employee)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="p-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-10 h-10 text-gray-300" />
                    <p className="text-gray-600 font-medium">No employees found</p>
                    <p className="text-gray-400 text-sm">Try adjusting your search terms</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
