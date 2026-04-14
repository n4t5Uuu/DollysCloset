import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@dollys-closet/ui";
import { Checkbox } from "@dollys-closet/ui";
import { Button } from "@dollys-closet/ui";
import { Eye, Pencil, Archive, RotateCcw, Users, MoreHorizontal, X } from "lucide-react";
import { Employee } from "@dollys-closet/core";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@dollys-closet/ui";
import { useState } from "react";

interface EmployeeTableProps {
  mode: "active" | "archived";
  sortedEmployees: Employee[];
  selectedRows: Set<string>;
  hasSelectableRows: boolean;
  allSelectableRowsSelected: boolean;
  toggleSelectAll: () => void;
  toggleSelectRow: (id: string) => void;
  openViewModal: (employee: Employee) => void;
  openEditModal: (employee: Employee) => void;
  openPrimaryActionModal: (employee: Employee) => void;
  currentUserId?: string | null;
  onRowActivate?: (employee: Employee) => void;
  showingStart?: number;
  showingEnd?: number;
  totalFilteredCount?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onBulkScopeAction?: () => void;
  onClearSelection?: () => void;
  actionLoading?: boolean;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EmployeeTable({
  mode,
  sortedEmployees,
  selectedRows,
  hasSelectableRows,
  allSelectableRowsSelected,
  toggleSelectAll,
  toggleSelectRow,
  openViewModal,
  openEditModal,
  openPrimaryActionModal,
  currentUserId,
  onRowActivate,
  showingStart = 0,
  showingEnd = 0,
  totalFilteredCount = 0,
  emptyTitle = "No employees found",
  emptyDescription = "We couldn't find any employees matching your current search or filters.",
  onBulkScopeAction,
  onClearSelection,
  actionLoading = false,
}: EmployeeTableProps) {
  const [moreMenuId, setMoreMenuId] = useState<string | null>(null);

  const activateRow = (employee: Employee) => {
    if (onRowActivate) {
      onRowActivate(employee);
      return;
    }

    if (mode === "active") {
      openEditModal(employee);
    }
  };

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
              <span className="text-[11px] text-gray-400">
                {selectedRows.size > 0
                  ? `${selectedRows.size}/${totalFilteredCount} selected`
                  : `Showing ${showingStart}–${showingEnd} of ${totalFilteredCount}`}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                {selectedRows.size > 0 && (
                  <>
                    {onBulkScopeAction && (
                      <Button type="button" variant="outline" size="sm" onClick={onBulkScopeAction} disabled={actionLoading}
                        className={`h-6 w-6 p-0 ${mode === "active" ? "border-amber-200 text-amber-500 hover:bg-amber-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}
                        aria-label={mode === "active" ? "Archive selected" : "Restore selected"}
                      >
                        {mode === "active" ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                    {onClearSelection && (
                      <Button type="button" variant="outline" size="sm" onClick={onClearSelection}
                        className="h-6 w-6 p-0 border-zinc-200 text-zinc-400 hover:bg-zinc-50"
                        aria-label="Clear selection"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </>
                )}
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Select all</span>
                <Checkbox
                  checked={allSelectableRowsSelected}
                  disabled={!hasSelectableRows}
                  onCheckedChange={toggleSelectAll}
                />
              </div>
            </div>
            {sortedEmployees.map((employee) => {
              const isOwnRow = employee.user_id === currentUserId;
              const isSelected = selectedRows.has(employee.user_id);

              return (
                <div
                  key={employee.user_key}
                  className={`px-3 py-3 ${isSelected ? "bg-[#E7A3B0]/5" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 self-start pt-0.5">
                      {!isOwnRow && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectRow(employee.user_id)}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 flex items-baseline gap-1.5 overflow-hidden">
                          <span className="shrink-0 text-xs font-semibold text-gray-400">
                            {employee.user_key}
                          </span>
                          <button
                            type="button"
                            onClick={() => activateRow(employee)}
                            className="shrink-0 text-left font-medium text-sm text-gray-900 transition-colors hover:text-[#b96d7d]"
                          >
                            {[employee.first_name, employee.last_name].filter(Boolean).join(" ")}
                          </button>
                          <span className="min-w-0 text-xs text-gray-500 truncate">
                            {employee.username}
                          </span>
                        </div>

                        <div className="shrink-0 flex items-center gap-1">
                          {mode === "active" && (
                            <Button
                              size="icon"
                              variant="outline"
                              title="Edit employee"
                              aria-label={`Edit ${employee.first_name} ${employee.last_name}`}
                              className="h-7 w-7 bg-pink-50 border-pink-200 text-pink-600 hover:bg-pink-200 rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300"
                              onClick={() => openEditModal(employee)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                          <div className="relative">
                            <Button
                              size="icon"
                              variant="outline"
                              title="More actions"
                              aria-label={`More actions for ${employee.first_name} ${employee.last_name}`}
                              className="h-7 w-7 bg-white border border-black text-gray-500 rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoreMenuId(moreMenuId === employee.user_id ? null : employee.user_id);
                              }}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                            {moreMenuId === employee.user_id && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setMoreMenuId(null)} />
                                <div className="absolute right-0 bottom-full mb-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                                  <button
                                    type="button"
                                    onClick={() => { openViewModal(employee); setMoreMenuId(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-pink-500" />
                                    View
                                  </button>
                                  {!isOwnRow && (
                                    <button
                                      type="button"
                                      onClick={() => { openPrimaryActionModal(employee); setMoreMenuId(null); }}
                                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${mode === "active" ? "text-amber-700" : "text-emerald-700"}`}
                                    >
                                      {mode === "active" ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                      {mode === "active" ? "Archive" : "Restore"}
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={`grid ${mode === "archived" ? "grid-cols-3" : "grid-cols-2"} gap-2 text-xs text-gray-500`}>
                        <div>
                          <span className="block uppercase tracking-wide">Joined</span>
                          <span className="text-gray-700">{formatDate(employee.created_at)}</span>
                        </div>
                        <div>
                          <span className="block uppercase tracking-wide">Updated</span>
                          <span className="text-gray-700">{formatDate(employee.updated_at)}</span>
                        </div>
                        {mode === "archived" && employee.archived_at && (
                          <div>
                            <span className="block uppercase tracking-wide text-amber-600">Archived</span>
                            <span className="text-amber-700 font-medium">{formatDate(employee.archived_at)}</span>
                          </div>
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
                {mode === "archived" && (
                  <TableHead className="p-4 font-bold">Archived On</TableHead>
                )}
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
                      onDoubleClick={() => activateRow(employee)}
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
                          className="font-medium text-left text-gray-900 transition-colors hover:text-[#b96d7d] block max-w-[120px] md:max-w-[200px] lg:max-w-[250px] truncate"
                          title={employee.username}
                        >
                          {employee.username}
                        </button>
                      </TableCell>
                      <TableCell className="p-4 text-gray-700">
                        <button
                          type="button"
                          onClick={() => activateRow(employee)}
                          className="text-left transition-colors hover:text-[#b96d7d] block max-w-[80px] md:max-w-[120px] lg:max-w-[150px] truncate"
                          title={employee.first_name}
                        >
                          {employee.first_name}
                        </button>
                      </TableCell>
                      <TableCell className="p-4 text-gray-700">
                        <button
                          type="button"
                          onClick={() => activateRow(employee)}
                          className="text-left transition-colors hover:text-[#b96d7d] block max-w-[80px] md:max-w-[120px] lg:max-w-[150px] truncate"
                          title={employee.last_name}
                        >
                          {employee.last_name}
                        </button>
                      </TableCell>
                      <TableCell className="p-4 text-gray-600 text-sm">{formatDate(employee.created_at)}</TableCell>
                      <TableCell className="p-4 text-gray-600 text-sm">{formatDate(employee.updated_at)}</TableCell>
                      {mode === "archived" && (
                        <TableCell className="p-4 text-sm">
                          {employee.archived_at ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                              <Archive className="h-3 w-3" />
                              {formatDate(employee.archived_at)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      )}
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
                          {mode === "active" && (
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
                          )}
                          {!isOwnRow && (
                            <Button
                              size="icon"
                              variant="outline"
                              title={mode === "active" ? "Archive employee" : "Restore employee"}
                              aria-label={`${mode === "active" ? "Archive" : "Restore"} ${employee.first_name} ${employee.last_name}`}
                              className={mode === "active"
                                ? "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 hover:border-amber-300"
                                : "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300"}
                              onClick={() => openPrimaryActionModal(employee)}
                            >
                              {mode === "active" ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={mode === "archived" ? 9 : 8} className="p-0 border-none">
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

