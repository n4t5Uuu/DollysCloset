import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, Users } from "lucide-react";
import { Employee } from "@/types/employee.types";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

interface EmployeeTableProps {
  sortedEmployees: Employee[];
  selectedRows: Set<string>;
  hasSelectableRows: boolean;
  allSelectableRowsSelected: boolean;
  toggleSelectAll: () => void;
  toggleSelectRow: (id: string) => void;
  openViewModal: (employee: Employee) => void;
  openEditModal: (employee: Employee) => void;
  openDeleteModal: (employee: Employee) => void;
  currentUserId?: string | null;
  onRowActivate?: (employee: Employee) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EmployeeTable({
  sortedEmployees,
  selectedRows,
  hasSelectableRows,
  allSelectableRowsSelected,
  toggleSelectAll,
  toggleSelectRow,
  openViewModal,
  openEditModal,
  openDeleteModal,
  currentUserId,
  onRowActivate,
  emptyTitle = "No employees found",
  emptyDescription = "We couldn't find any employees matching your current search or filters.",
}: EmployeeTableProps) {
  const emptyState = (
    <Empty className="border-none rounded-none py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Users className="size-6 text-[#E7A3B0]" />
        </EmptyMedia>
        <EmptyTitle>{emptyTitle}</EmptyTitle>
        <EmptyDescription>{emptyDescription}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <>
      <div className="sm:hidden bg-white rounded-lg border divide-y">
        {sortedEmployees.length > 0 ? (
          <>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-t-lg">
              <Checkbox
                checked={allSelectableRowsSelected}
                disabled={!hasSelectableRows}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select all</span>
            </div>
            {sortedEmployees.map((employee) => {
              const isOwnRow = employee.user_id === currentUserId;
              const isSelected = selectedRows.has(employee.user_id);

              return (
                <div
                  key={employee.user_key}
                  className={`px-3 py-3 ${isSelected ? "bg-[#E7A3B0]/5" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-1">
                      {!isOwnRow && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectRow(employee.user_id)}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onRowActivate?.(employee)}
                            className="max-w-full text-left font-medium text-sm text-gray-900 transition-colors hover:text-[#b96d7d]"
                          >
                            <span className="block truncate">{employee.first_name} {employee.last_name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openViewModal(employee)}
                            className="max-w-full text-left text-xs text-gray-500 transition-colors hover:text-[#b96d7d]"
                          >
                            <span className="block truncate">{employee.username}</span>
                          </button>
                        </div>
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
                          {employee.user_key}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>
                          <span className="block uppercase tracking-wide">Joined</span>
                          <span className="text-gray-700">{formatDate(employee.created_at)}</span>
                        </div>
                        <div>
                          <span className="block uppercase tracking-wide">Updated</span>
                          <span className="text-gray-700">{formatDate(employee.updated_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          size="icon"
                          variant="outline"
                          title="View employee"
                          aria-label={`View ${employee.first_name} ${employee.last_name}`}
                          className="h-8 w-8 border-pink-200 text-pink-600 bg-pink-50 hover:bg-pink-200 hover:text-pink-700 hover:border-pink-300"
                          onClick={() => openViewModal(employee)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          title="Edit employee"
                          aria-label={`Edit ${employee.first_name} ${employee.last_name}`}
                          className="h-8 w-8 border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-200 hover:text-blue-700 hover:border-blue-300"
                          onClick={() => openEditModal(employee)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!isOwnRow && (
                          <Button
                            size="icon"
                            variant="outline"
                            title="Delete employee"
                            aria-label={`Delete ${employee.first_name} ${employee.last_name}`}
                            className="h-8 w-8 border-red-200 text-red-600 bg-red-50 hover:bg-red-200 hover:text-red-700 hover:border-red-300"
                            onClick={() => openDeleteModal(employee)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        ) : emptyState}
      </div>

      <div className="hidden sm:block bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="border-b bg-gray-50">
              <TableRow>
                <TableHead className="p-4 text-left w-12">
                  <Checkbox
                    checked={allSelectableRowsSelected}
                    disabled={!hasSelectableRows}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="p-4 font-bold">User ID</TableHead>
                <TableHead className="p-4 font-bold">Username</TableHead>
                <TableHead className="p-4 font-bold">First Name</TableHead>
                <TableHead className="p-4 font-bold">Last Name</TableHead>
                <TableHead className="p-4 font-bold">Joined</TableHead>
                <TableHead className="p-4 font-bold">Last Updated</TableHead>
                <TableHead className="p-4 text-center font-bold w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEmployees.length > 0 ? (
                sortedEmployees.map((employee) => {
                  const isOwnRow = employee.user_id === currentUserId;
                  return (
                    <TableRow
                      key={employee.user_key}
                      className={`border-b hover:bg-gray-50 ${selectedRows.has(employee.user_id) ? "bg-[#E7A3B0]/5" : ""}`}
                      onDoubleClick={() => onRowActivate?.(employee)}
                    >
                      <TableCell className="p-4">
                        {!isOwnRow && (
                          <Checkbox
                            checked={selectedRows.has(employee.user_id)}
                            onCheckedChange={() => toggleSelectRow(employee.user_id)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="p-4">
                        <span className="font-medium text-gray-900">{employee.user_key}</span>
                      </TableCell>
                      <TableCell className="p-4">
                        <button
                          type="button"
                          onClick={() => openViewModal(employee)}
                          className="font-medium text-left text-gray-900 transition-colors hover:text-[#b96d7d] break-words [overflow-wrap:anywhere] block max-w-[120px] md:max-w-[200px]"
                        >
                          {employee.username}
                        </button>
                      </TableCell>
                      <TableCell className="p-4 text-gray-700">
                        <button
                          type="button"
                          onClick={() => onRowActivate?.(employee)}
                          className="text-left transition-colors hover:text-[#b96d7d] break-words [overflow-wrap:anywhere] block max-w-[100px] md:max-w-[150px]"
                        >
                          {employee.first_name}
                        </button>
                      </TableCell>
                      <TableCell className="p-4 text-gray-700">
                        <button
                          type="button"
                          onClick={() => onRowActivate?.(employee)}
                          className="text-left transition-colors hover:text-[#b96d7d] break-words [overflow-wrap:anywhere] block max-w-[100px] md:max-w-[150px]"
                        >
                          {employee.last_name}
                        </button>
                      </TableCell>
                      <TableCell className="p-4 text-gray-600 text-sm">{formatDate(employee.created_at)}</TableCell>
                      <TableCell className="p-4 text-gray-600 text-sm">{formatDate(employee.updated_at)}</TableCell>
                      <TableCell className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            title="View employee"
                            aria-label={`View ${employee.first_name} ${employee.last_name}`}
                            className="border-pink-200 text-pink-600 bg-pink-50 hover:bg-pink-200 hover:text-pink-700 hover:border-pink-300"
                            onClick={() => openViewModal(employee)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            title="Edit employee"
                            aria-label={`Edit ${employee.first_name} ${employee.last_name}`}
                            className="border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-200 hover:text-blue-700 hover:border-blue-300"
                            onClick={() => openEditModal(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!isOwnRow && (
                            <Button
                              size="icon"
                              variant="outline"
                              title="Delete employee"
                              aria-label={`Delete ${employee.first_name} ${employee.last_name}`}
                              className="border-red-200 text-red-600 bg-red-50 hover:bg-red-200 hover:text-red-700 hover:border-red-300"
                              onClick={() => openDeleteModal(employee)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="p-0 border-none">
                    {emptyState}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
