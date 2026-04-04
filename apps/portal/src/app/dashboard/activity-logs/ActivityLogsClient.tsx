"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  CustomPagination,
  Skeleton,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@dollys-closet/ui";
import AdminSearchInput from "@/components/general-components/AdminSearchInput";
import { AdminNoticeBanner } from "@/components/ui/admin-notice-banner";
import { Calendar, ChevronDown, ClipboardList, X, Eye, SlidersHorizontal, RefreshCcw, RefreshCw } from "lucide-react";

interface ActivityLog {
  log_id: number;
  created_at: string;
  action_type: string;
  product_id: number | null;
  business_details: number | null;
  description: string;
  editor: string | null;
  user_id: string | null;
  user_key: string | null;
}

interface AvailableLogMonth {
  value: string;
  label: string;
  year: number;
  month: number;
  count: number;
}

type ActionNotice = {
  type: "success" | "warning" | "info";
  message: string;
};

const actionLabels: Record<string, string> = {
  create_product: "Created Product",
  edit_product: "Edited Product",
  delete_product: "Deleted Product",
  create_category: "Created Category",
  edit_category: "Edited Category",
  delete_category: "Deleted Category",
  create_employee: "Created Employee",
  edit_employee: "Edited Employee",
  delete_employee: "Deleted Employee",
  upload_image: "Uploaded Image",
  set_primary_image: "Updated Image",
  delete_image: "Deleted Image",
  reorder_images: "Reordered Images",
  edit_contact_details: "Updated Contact Details",
  edit_about_details: "Updated About Details",
  edit_announcement: "Edited Announcement",
  login: "Logged In",
  logout: "Logged Out",
};

const actionColors: Record<string, string> = {
  create_product: "bg-green-100 text-green-800",
  edit_product: "bg-blue-100 text-blue-800",
  delete_product: "bg-red-100 text-red-800",
  create_category: "bg-purple-100 text-purple-800",
  edit_category: "bg-indigo-100 text-indigo-800",
  delete_category: "bg-red-100 text-red-800",
  create_employee: "bg-green-100 text-green-800",
  edit_employee: "bg-blue-100 text-blue-800",
  delete_employee: "bg-red-100 text-red-800",
  upload_image: "bg-green-100 text-green-800",
  set_primary_image: "bg-blue-100 text-blue-800",
  delete_image: "bg-red-100 text-red-800",
  reorder_images: "bg-indigo-100 text-indigo-800",
  edit_contact_details: "bg-amber-100 text-amber-800",
  edit_about_details: "bg-violet-100 text-violet-800",
  edit_announcement: "bg-pink-100 text-pink-800",
  login: "bg-amber-100 text-amber-800",
  logout: "bg-gray-100 text-gray-800",
};

const employeeManagementActions = new Set([
  "create_employee",
  "edit_employee",
  "delete_employee",
  "login",
  "logout",
]);

const actionTypeGroups: Record<string, { label: string; actions: string[] }> = {
  products:   { label: "Products",   actions: ["create_product", "edit_product", "delete_product"] },
  categories: { label: "Categories", actions: ["create_category", "edit_category", "delete_category"] },
  employees:  { label: "Employees",  actions: ["create_employee", "edit_employee", "delete_employee"] },
  images:     { label: "Images",     actions: ["upload_image", "set_primary_image", "delete_image", "reorder_images"] },
  content:    { label: "Content",    actions: ["edit_contact_details", "edit_about_details", "edit_announcement"] },
  auth:       { label: "Auth",       actions: ["login", "logout"] },
};

export default function ActivityLogsClient() {
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

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<{ month: number; year: number } | null>(null);
  const [availableMonths, setAvailableMonths] = useState<AvailableLogMonth[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [viewLog, setViewLog] = useState<ActivityLog | null>(null);
  const [actionTypeFilter, setActionTypeFilter] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const itemsPerPage = 10;
  const isMountedRef = useRef(true);
  const activeRequestControllerRef = useRef<AbortController | null>(null);
  const requestVersionRef = useRef(0);
  const fetchLogsRef = useRef<((isBackground?: boolean) => Promise<boolean>) | undefined>(undefined);

  const fetchLogs = useCallback(async (isBackground = false) => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    activeRequestControllerRef.current?.abort();
    const controller = new AbortController();
    activeRequestControllerRef.current = controller;

    try {
      if (!isBackground) setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("pageSize", String(itemsPerPage));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedMonth) {
        params.set("month", String(selectedMonth.month));
        params.set("year", String(selectedMonth.year));
      }
      if (actionTypeFilter.size > 0) {
        const allActions = [...actionTypeFilter].flatMap((k) => actionTypeGroups[k]?.actions ?? []);
        params.set("actionTypes", allActions.join(","));
      }

      const response = await fetch(`/api/admin/logs?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch logs");
      }

      const result = await response.json();
      if (isMountedRef.current && requestVersion === requestVersionRef.current) {
        setLogs(result.data || []);
        setTotalCount(result.count ?? 0);
        setAvailableMonths(result.availableMonths || []);
      }
      return true;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return false;
      }

      console.error("Error fetching logs:", err);
      if (isMountedRef.current && requestVersion === requestVersionRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load activity logs");
      }
      return false;
    } finally {
      if (activeRequestControllerRef.current === controller) {
        activeRequestControllerRef.current = null;
      }

      if (!isBackground && isMountedRef.current && requestVersion === requestVersionRef.current) {
        setLoading(false);
      }
    }
  }, [currentPage, debouncedSearch, selectedMonth, actionTypeFilter]);

  useEffect(() => {
    fetchLogsRef.current = fetchLogs;
  }, [fetchLogs]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchLogs();
    return () => {
      isMountedRef.current = false;
      activeRequestControllerRef.current?.abort();
    };
  }, [fetchLogs]);

  useEffect(() => {
    const interval = window.setInterval(() => fetchLogsRef.current?.(true), 30000);
    const onFocus = () => fetchLogsRef.current?.(true);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (event.key === "/" && !isTypingTarget && !viewLog) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }

      if (event.key === "Escape") {
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
        } else if (showPicker) {
          setShowPicker(false);
        } else if (showFilters) {
          setShowFilters(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showFilters, showPicker, viewLog]);

  useEffect(() => {
    if (!viewLog) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setViewLog(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [viewLog]);

  const toggleActionType = (key: string) => {
    setActionTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const activeFilterCount = actionTypeFilter.size;
  const selectedMonthValue = selectedMonth ? `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, "0")}` : null;
  const selectedMonthLabel = selectedMonthValue
    ? availableMonths.find((monthOption) => monthOption.value === selectedMonthValue)?.label ?? "Selected Month"
    : "All Months";
  const monthsByYear = availableMonths.reduce<Record<string, AvailableLogMonth[]>>((groups, monthOption) => {
    const yearKey = String(monthOption.year);
    if (!groups[yearKey]) groups[yearKey] = [];
    groups[yearKey].push(monthOption);
    return groups;
  }, {});
  const groupedMonthEntries = Object.entries(monthsByYear).sort(([firstYear], [secondYear]) => Number(secondYear) - Number(firstYear));

  useEffect(() => {
    router.replace(pathname);
  }, [debouncedSearch, selectedMonth, actionTypeFilter, router, pathname]);

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;

  const hasSearch = debouncedSearch.trim().length > 0;
  const hasActiveFilters = hasSearch || Boolean(selectedMonth) || actionTypeFilter.size > 0;
  const browseSummaryMessage = useMemo(() => {
    if (loading) {
      return "Loading activity logs...";
    }

    if (totalCount === 0) {
      return hasActiveFilters
        ? "No activity logs match the current search or filters."
        : "No activity has been recorded yet.";
    }

    if (hasActiveFilters) {
      return `Showing ${totalCount} matching log${totalCount === 1 ? "" : "s"}.`;
    }

    return `Showing ${totalCount} activity log${totalCount === 1 ? "" : "s"}.`;
  }, [hasActiveFilters, loading, totalCount]);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

    if (hasSearch) {
      chips.push({
        key: "search",
        label: `Search: ${debouncedSearch.trim()}`,
        onRemove: () => {
          setSearchQuery("");
          setDebouncedSearch("");
        },
      });
    }

    if (selectedMonth) {
      chips.push({
        key: "month",
        label: selectedMonthLabel,
        onRemove: () => setSelectedMonth(null),
      });
    }

    actionTypeFilter.forEach((key) => {
      const label = actionTypeGroups[key]?.label;
      if (!label) return;

      chips.push({
        key: `action-${key}`,
        label,
        onRemove: () => toggleActionType(key),
      });
    });

    return chips;
  }, [actionTypeFilter, debouncedSearch, hasSearch, selectedMonth, selectedMonthLabel]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedMonth(null);
    setActionTypeFilter(new Set());
    setShowFilters(false);
    setShowPicker(false);
  };

  const handleManualRefresh = async () => {
    await fetchLogs();
  };

  const handleResetLogs = async () => {
    try {
      const response = await fetch('/api/admin/logs/reset', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset logs');
      }

      setLogs([]);
      setTotalCount(0);
      setAvailableMonths([]);
      setSearchQuery("");
      setDebouncedSearch("");
      setSelectedMonth(null);
      setActionTypeFilter(new Set());
      setShowFilters(false);
      setShowPicker(false);
      setActionNotice({
        type: "success",
        message: "Activity logs cleared. New activity will appear here as it happens.",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset logs');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Activity Logs</h1>
          <p className="text-gray-500 text-sm">Inventory actions by admin or employee.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleManualRefresh}
            disabled={loading}
            className="h-10 border-[#E7A3B0]/30 text-[#b96d7d] hover:bg-[#fff5f7] hover:text-[#b96d7d]"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer sm:shrink-0"
              >
                Reset Logs
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-gray-900">Clear Activity Logs</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete every saved activity log entry? This cannot be undone and will clear the full activity history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900">Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white cursor-pointer" onClick={handleResetLogs}>Reset All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {error && (
        <AdminNoticeBanner
          tone="error"
          title="Unable to load activity logs"
          message={error}
          onDismiss={() => setError(null)}
          actionLabel="Try again"
          onAction={() => {
            void fetchLogs();
          }}
        />
      )}

      {actionNotice && (
        <AdminNoticeBanner
          tone={actionNotice.type}
          title={
            actionNotice.type === "success"
              ? "Activity logs updated"
              : actionNotice.type === "warning"
                ? "Activity log action needs review"
                : "Activity logs refreshed"
          }
          message={actionNotice.message}
          onDismiss={() => setActionNotice(null)}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <AdminSearchInput
            ref={searchInputRef}
            value={searchQuery}
            onChange={setSearchQuery}
            onDebouncedChange={setDebouncedSearch}
            debounceMs={400}
            placeholder="Search by log ID, product ID, user UUID or key, action, description, or editor..."
            ariaLabel="Search activity logs"
            className="min-w-[240px]"
            clearLabel="Clear activity log search"
          />

          <div className="relative" ref={filtersRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((p) => !p)}
              className="flex items-center gap-2 h-9 text-xs hover:bg-[#fff5f7] hover:text-[#E7A3B0] hover:border-[#E7A3B0] hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-300"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E7A3B0] text-[9px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {showFilters && (
              <div className="absolute left-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-72 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Action Type</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(actionTypeGroups).map(([key, { label }]) => (
                      <button
                        key={key}
                        onClick={() => toggleActionType(key)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                          actionTypeFilter.has(key)
                            ? "bg-[#E7A3B0] text-white border-[#E7A3B0] shadow-sm"
                            : "border-gray-200 text-gray-600 hover:border-[#E7A3B0] hover:bg-[#fff5f7] hover:text-[#E7A3B0] hover:shadow-sm"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setActionTypeFilter(new Set())}
                    className="w-full text-xs text-gray-500 py-1.5 hover:bg-[#fff5f7] hover:border-[#E7A3B0] hover:text-[#E7A3B0] rounded-md transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer border border-gray-200"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={pickerRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPicker((p) => !p)}
              className="flex items-center gap-2 h-9 text-xs hover:bg-[#fff5f7] hover:text-[#E7A3B0] hover:border-[#E7A3B0] hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-300"
            >
              <Calendar className="w-3.5 h-3.5" />
              {selectedMonthLabel}
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            {showPicker && (
              <div className="absolute left-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-72">
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Available Months</p>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                  {groupedMonthEntries.length > 0 ? (
                    groupedMonthEntries.map(([year, yearMonths]) => (
                      <div key={year} className="space-y-1.5">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{year}</p>
                        <div className="space-y-1">
                          {yearMonths.map((monthOption) => (
                            <button
                              key={monthOption.value}
                              onClick={() => {
                                setSelectedMonth({ month: monthOption.month, year: monthOption.year });
                                setShowPicker(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                selectedMonthValue === monthOption.value
                                  ? "bg-[#E7A3B0] text-white shadow-sm"
                                  : "text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              <span>{monthOption.label}</span>
                              <span className={`text-xs ${selectedMonthValue === monthOption.value ? "text-white/90" : "text-gray-400"}`}>
                                {monthOption.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 px-1 py-2">No months with logs yet.</p>
                  )}
                </div>
                {selectedMonth && (
                  <button
                    onClick={() => { setSelectedMonth(null); setShowPicker(false); }}
                    className="w-full mt-2 text-xs text-gray-500 hover:text-gray-700 py-1.5 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>
          <span className="text-sm text-gray-600">
            {totalCount > 0
              ? `Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, totalCount)} of ${totalCount} logs`
              : "Showing 0 logs"}
          </span>
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
          <p className="text-sm text-gray-600">{browseSummaryMessage}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <Skeleton className="h-12 w-full rounded-md" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="border-b bg-gray-50">
              <TableRow>
                <TableHead className="p-4 font-bold">Date & Time</TableHead>
                <TableHead className="p-4 font-bold">Action</TableHead>
                <TableHead className="p-4 font-bold">Linked ID</TableHead>
                <TableHead className="p-4 font-bold">User</TableHead>
                <TableHead className="p-4 font-bold w-[30%]">Description</TableHead>
                <TableHead className="p-4 font-bold">Editor</TableHead>
                <TableHead className="p-4 font-bold text-center w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow
                    key={log.log_id}
                    className="border-b hover:bg-gray-50"
                    onDoubleClick={() => setViewLog(log)}
                  >
                    <TableCell className="p-4 text-sm text-gray-700">
                      <div className="line-clamp-2 break-words [overflow-wrap:anywhere]">{new Date(log.created_at).toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="line-clamp-2">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${actionColors[log.action_type] || "bg-gray-100 text-gray-800"}`}>
                          {actionLabels[log.action_type] || log.action_type}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-gray-900">
                      <div className="line-clamp-2 break-all">{log.product_id ?? log.business_details ?? "-"}</div>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-gray-900">
                      <div className="line-clamp-2 break-all">
                        {employeeManagementActions.has(log.action_type) ? (log.user_key || log.user_id || "-") : "-"}
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-gray-600 max-w-0 overflow-hidden">
                      <div className="line-clamp-2 break-words [overflow-wrap:anywhere]">{log.description || "-"}</div>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-gray-600">
                      <div className="line-clamp-2 break-all">
                        {log.editor || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex justify-center">
                        <Button
                          size="icon"
                          variant="outline"
                          title="View log details"
                          aria-label={`View details for log ${log.log_id}`}
                          className="border-pink-200 text-pink-600 bg-pink-50 hover:bg-pink-200 hover:text-pink-700 hover:border-pink-300"
                          onClick={() => setViewLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="p-0 border-none">
                    <Empty className="border-none rounded-none py-12">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <ClipboardList className="size-6 text-[#E7A3B0]" />
                        </EmptyMedia>
                        <EmptyTitle>No activity logs found</EmptyTitle>
                        <EmptyDescription>
                          {totalCount === 0 && !debouncedSearch && !selectedMonth && actionTypeFilter.size === 0
                            ? "No activity has been recorded yet."
                            : "No activity logs match your current search or filters."}
                        </EmptyDescription>
                        {hasActiveFilters && (
                          <div className="flex items-center justify-center gap-3 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={clearAllFilters}
                            >
                              Clear filters
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleManualRefresh}
                              className="bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] text-white hover:from-[#d891a0] hover:to-[#E7A3B0]"
                            >
                              Refresh logs
                            </Button>
                          </div>
                        )}
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {viewLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewLog(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-log-details-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 id="activity-log-details-title" className="text-xl font-bold text-gray-900">Log Details</h2>
              <button onClick={() => setViewLog(null)} aria-label="Close log details" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date & Time</p>
                  <p className="text-sm font-semibold text-gray-900">{new Date(viewLog.created_at).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Action</p>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${actionColors[viewLog.action_type] || "bg-gray-100 text-gray-800"}`}>
                    {actionLabels[viewLog.action_type] || viewLog.action_type}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Linked ID</p>
                  <p className="text-sm font-semibold text-gray-900">{viewLog.product_id ?? viewLog.business_details ?? "-"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">User</p>
                  <p className="text-sm font-semibold text-gray-900 break-words [overflow-wrap:anywhere]">
                    {employeeManagementActions.has(viewLog.action_type) ? (viewLog.user_key || (viewLog.user_id ?? "-")) : "-"}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{viewLog.description || "-"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Editor</p>
                <p className="text-sm font-semibold text-gray-900 break-all">{viewLog.editor || "-"}</p>
              </div>
              <button
                onClick={() => setViewLog(null)}
                className="w-full px-4 py-3 bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] text-white rounded-xl hover:from-[#d891a0] hover:to-[#E7A3B0] font-medium transition-all shadow-md hover:shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {totalCount > 0 && (
        <CustomPagination
          className="mt-4"
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

