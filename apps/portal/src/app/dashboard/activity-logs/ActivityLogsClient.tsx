"use client";

import { ActiveFilterChips } from "@/components/general-components/ActiveFilterChips";
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
} from "@dollys-closet/ui";
import AdminSearchInput from "@/components/general-components/AdminSearchInput";
import { AdminNoticeBanner } from "@/components/ui/admin-notice-banner";
import { Calendar, ChevronDown, ClipboardList, X, Eye, SlidersHorizontal, RefreshCcw, Trash2 } from "lucide-react";
import { ExportPurgeDialog } from "@/components/dialogs/ExportPurgeDialog";
import type { ExportPurgeFormat } from "@/components/dialogs/ExportPurgeDialog";

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

function getLinkedEntityLabel(log: ActivityLog) {
  if (log.product_id !== null && log.product_id !== undefined) return "Product";
  if (log.business_details !== null && log.business_details !== undefined) return "Business Details";
  return "";
}

const actionLabels: Record<string, string> = {
  create_product: "Created Product",
  edit_product: "Edited Product",
  archive_product: "Archived Product",
  restore_product: "Restored Product",
  delete_product: "Deleted Product",
  create_category: "Created Category",
  edit_category: "Edited Category",
  delete_category: "Deleted Category",
  create_employee: "Created Employee",
  edit_employee: "Edited Employee",
  archive_employee: "Archived Employee",
  restore_employee: "Restored Employee",
  delete_employee: "Deleted Employee",
  upload_image: "Uploaded Image",
  set_primary_image: "Updated Image",
  delete_image: "Deleted Image",
  reorder_images: "Reordered Images",
  create_discount: "Created Discount",
  apply_discount: "Applied Discount",
  delete_discount: "Deleted Discount",
  create_faq: "Created FAQ",
  edit_faq: "Edited FAQ",
  delete_faq: "Deleted FAQ",
  create_season: "Created Season",
  edit_season: "Edited Season",
  delete_season: "Deleted Season",
  apply_season: "Applied Season",
  purge_activity_logs: "Purged Activity Logs",
  purge_products: "Purged Archived Products",
  edit_contact_details: "Updated Contact Details",
  edit_about_details: "Updated About Details",
  edit_announcement: "Edited Announcement",
  login: "Logged In",
  logout: "Logged Out",
};

const actionColors: Record<string, string> = {
  create_product: "bg-green-100 text-green-800",
  edit_product: "bg-blue-100 text-blue-800",
  archive_product: "bg-amber-100 text-amber-800",
  restore_product: "bg-emerald-100 text-emerald-800",
  delete_product: "bg-red-100 text-red-800",
  create_category: "bg-purple-100 text-purple-800",
  edit_category: "bg-indigo-100 text-indigo-800",
  delete_category: "bg-red-100 text-red-800",
  create_employee: "bg-green-100 text-green-800",
  edit_employee: "bg-blue-100 text-blue-800",
  archive_employee: "bg-amber-100 text-amber-800",
  restore_employee: "bg-emerald-100 text-emerald-800",
  delete_employee: "bg-red-100 text-red-800",
  upload_image: "bg-green-100 text-green-800",
  set_primary_image: "bg-blue-100 text-blue-800",
  delete_image: "bg-red-100 text-red-800",
  reorder_images: "bg-indigo-100 text-indigo-800",
  create_discount: "bg-green-100 text-green-800",
  apply_discount: "bg-emerald-100 text-emerald-800",
  delete_discount: "bg-red-100 text-red-800",
  create_faq: "bg-green-100 text-green-800",
  edit_faq: "bg-blue-100 text-blue-800",
  delete_faq: "bg-red-100 text-red-800",
  create_season: "bg-green-100 text-green-800",
  edit_season: "bg-blue-100 text-blue-800",
  delete_season: "bg-red-100 text-red-800",
  apply_season: "bg-teal-100 text-teal-800",
  purge_activity_logs: "bg-red-100 text-red-800",
  purge_products: "bg-red-100 text-red-800",
  edit_contact_details: "bg-amber-100 text-amber-800",
  edit_about_details: "bg-violet-100 text-violet-800",
  edit_announcement: "bg-pink-100 text-pink-800",
  login: "bg-amber-100 text-amber-800",
  logout: "bg-gray-100 text-gray-800",
};

const employeeManagementActions = new Set([
  "create_employee",
  "edit_employee",
  "archive_employee",
  "restore_employee",
  "delete_employee",
  "login",
  "logout",
]);

const actionTypeGroups: Record<string, { label: string; actions: string[] }> = {
  products:   { label: "Products",   actions: ["create_product", "edit_product", "archive_product", "restore_product", "delete_product"] },
  employees:  { label: "Employees",  actions: ["create_employee", "edit_employee", "archive_employee", "restore_employee", "delete_employee"] },
  images:     { label: "Images",     actions: ["upload_image", "set_primary_image", "delete_image", "reorder_images"] },
  discounts:  { label: "Discounts",  actions: ["create_discount", "apply_discount", "delete_discount"] },
  seasons:    { label: "Seasons",    actions: ["create_season", "edit_season", "delete_season", "apply_season"] },
  faqs:       { label: "FAQs",       actions: ["create_faq", "edit_faq", "delete_faq"] },
  content:    { label: "Content",    actions: ["edit_contact_details", "edit_about_details", "edit_announcement"] },
  system:     { label: "System",     actions: ["purge_activity_logs", "purge_products"] },
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
      window.history.replaceState(null, "", pathname);
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

  const [purgeOpen, setPurgeOpen] = useState(false);

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

      const ownsLoading = !isBackground && isMountedRef.current && requestVersion === requestVersionRef.current;
      setLoading((current) => (ownsLoading ? false : current));
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
    window.history.replaceState(null, "", pathname);
  }, [debouncedSearch, selectedMonth, actionTypeFilter, pathname]);

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

  const handleOpenPurge = () => setPurgeOpen(true);

  const handleLogsPreview = async (cutoffIso: string) => {
    const params = new URLSearchParams({ dryRun: "1", before: cutoffIso });
    const response = await fetch(`/api/admin/logs/reset?${params}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to preview purge");
    return { count: typeof data.count === "number" ? data.count : 0 };
  };

  const handleLogsDownload = async (cutoffIso: string, format: ExportPurgeFormat) => {
    const params = new URLSearchParams({ before: cutoffIso, format });
    const response = await fetch(`/api/admin/logs/export?${params}`, { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to export logs");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `activity-logs-export-${new Date().toISOString().replace(/[:.]/g, "-")}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleLogsPurge = async (cutoffIso: string) => {
    const response = await fetch("/api/admin/logs/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ before: cutoffIso, confirm: "DELETE", exportConfirmed: true }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to purge logs");
    return { purged: typeof data.purged === "number" ? data.purged : 0 };
  };

  const handleLogsPurgeSuccess = (purged: number, label: string) => {
    setActionNotice({
      type: "success",
      message: `Purged ${purged} activity log${purged === 1 ? "" : "s"} ${label}.`,
    });
    void fetchLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center justify-between sm:block">
          <div>
            <h1 className="text-2xl font-bold">Activity Logs</h1>
            <p className="text-gray-500 text-sm hidden sm:block">Inventory actions by admin or employee.</p>
          </div>
          {/* Mobile: icon refresh + full purge button */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={loading}
              className="p-1.5 text-[#b96d7d] hover:text-[#E7A3B0] disabled:opacity-50 transition-colors"
              title="Refresh"
            >
              <RefreshCcw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenPurge}
              className="h-9 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs px-3"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Export &amp; Purge
            </Button>
          </div>
        </div>
        {/* Desktop: full buttons */}
        <div className="hidden sm:flex flex-wrap items-center gap-3">
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
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenPurge}
            className="h-10 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Export &amp; Purge
          </Button>
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
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <AdminSearchInput
            ref={searchInputRef}
            value={searchQuery}
            onChange={setSearchQuery}
            onDebouncedChange={setDebouncedSearch}
            debounceMs={400}
            placeholder="Search by log ID, Linked ID, user key, editor"
            ariaLabel="Search activity logs"
            className="flex-1 min-w-0 sm:min-w-[240px] sm:flex-none"
            clearLabel="Clear activity log search"
          />

          <div className="relative" ref={filtersRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((p) => !p)}
              className="flex items-center gap-1.5 sm:gap-2 h-9 text-xs hover:bg-[#fff5f7] hover:text-[#E7A3B0] hover:border-[#E7A3B0] hover:scale-105 hover:shadow-md active:scale-95 transition duration-300"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E7A3B0] text-[9px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {showFilters && (
              <div className="absolute right-0 sm:left-0 sm:right-auto z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-[min(288px,calc(100vw-1rem))] space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Action Type</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(actionTypeGroups).map(([key, { label }]) => (
                      <button
                        key={key}
                        onClick={() => toggleActionType(key)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
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
                    className="w-full text-xs text-gray-500 py-1.5 hover:bg-[#fff5f7] hover:border-[#E7A3B0] hover:text-[#E7A3B0] rounded-md transition duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer border border-gray-200"
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
              className="flex items-center gap-1.5 sm:gap-2 h-9 text-xs hover:bg-[#fff5f7] hover:text-[#E7A3B0] hover:border-[#E7A3B0] hover:scale-105 hover:shadow-md active:scale-95 transition duration-300"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{selectedMonthLabel}</span>
              {selectedMonth && <span className="sm:hidden flex h-4 w-4 items-center justify-center rounded-full bg-[#E7A3B0] text-[9px] font-semibold text-white">1</span>}
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            {showPicker && (
              <div className="absolute right-0 sm:left-0 sm:right-auto z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-[min(288px,calc(100vw-1rem))]">
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
          <span className="hidden sm:inline text-sm text-gray-600">
            {totalCount > 0
              ? `Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, totalCount)} of ${totalCount} logs`
              : "Showing 0 logs"}
          </span>
        </div>

        {/* Mobile count */}
        <p className="sm:hidden text-xs text-gray-500">
          {totalCount > 0
            ? `${startIndex + 1}–${Math.min(startIndex + itemsPerPage, totalCount)} of ${totalCount} logs`
            : "No logs"}
        </p>

        <ActiveFilterChips chips={activeFilterChips} onClearAll={clearAllFilters} />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-600">{browseSummaryMessage}</p>
        </div>
      </div>

      {/* ── Mobile card list ── */}
      {loading ? (
        <div className="sm:hidden bg-white rounded-lg border p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : logs.length > 0 ? (
        <div className="sm:hidden divide-y divide-gray-100 bg-white rounded-lg border">
          {logs.map((log) => (
            <button
              key={log.log_id}
              type="button"
              className="w-full text-left px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              onClick={() => setViewLog(log)}
            >
              <div className="flex items-center gap-2">
                <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${actionColors[log.action_type] || "bg-gray-100 text-gray-800"}`}>
                  {actionLabels[log.action_type] || log.action_type}
                </span>
                <span className="text-[11px] font-semibold text-gray-600 shrink-0">#{log.log_id}</span>
                <span className="ml-auto text-[11px] text-gray-400 shrink-0">
                  {new Date(log.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              {log.editor && (
                <div className="mt-1.5 text-xs text-gray-500 truncate">{log.editor}</div>
              )}
              {employeeManagementActions.has(log.action_type) && (log.user_key || log.user_id) && (
                <div className="mt-0.5 text-[11px] text-gray-400">
                  User: {log.user_key || log.user_id}
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="sm:hidden bg-white rounded-lg border">
          <Empty className="border-none rounded-none py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardList className="size-6 text-[#E7A3B0]" />
              </EmptyMedia>
              <EmptyTitle>No activity logs found</EmptyTitle>
              <EmptyDescription>
                {!debouncedSearch && !selectedMonth && actionTypeFilter.size === 0
                  ? "No activity has been recorded yet."
                  : "No logs match your current filters."}
              </EmptyDescription>
              {hasActiveFilters && (
                <Button type="button" variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear filters
                </Button>
              )}
            </EmptyHeader>
          </Empty>
        </div>
      )}

      {/* ── Desktop table (unchanged) ── */}
      {loading ? (
        <div className="hidden sm:block bg-white rounded-lg border p-4 space-y-4">
          <Skeleton className="h-12 w-full rounded-md" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="hidden sm:block bg-white rounded-lg border overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="border-b bg-gray-50">
              <TableRow>
                <TableHead className="p-4 text-left font-bold min-w-[70px]">Log</TableHead>
                <TableHead className="p-4 font-bold min-w-[160px]">Date & Time</TableHead>
                <TableHead className="p-4 font-bold min-w-[150px]">Action</TableHead>
                <TableHead className="p-4 font-bold min-w-[100px]">Linked ID</TableHead>
                <TableHead className="p-4 font-bold min-w-[100px]">User</TableHead>
                <TableHead className="p-4 font-bold min-w-[200px]">Description</TableHead>
                <TableHead className="p-4 font-bold min-w-[150px]">Editor</TableHead>
                <TableHead className="p-4 font-bold text-center min-w-[100px]">Actions</TableHead>
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
                    <TableCell className="p-4">
                      <span className="font-medium text-gray-900">{log.log_id}</span>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-gray-700">
                      <div className="line-clamp-2 wrap-anywhere">{new Date(log.created_at).toLocaleString()}</div>
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
                      {log.product_id && (
                        <div className="text-[11px] text-gray-400 mt-0.5">Product</div>
                      )}
                      {!log.product_id && log.business_details && (
                        <div className="text-[11px] text-gray-400 mt-0.5">Business</div>
                      )}
                    </TableCell>
                    <TableCell className="p-4 text-sm text-gray-900">
                      <div className="line-clamp-2 break-all">
                        {employeeManagementActions.has(log.action_type) ? (log.user_key || log.user_id || "-") : "-"}
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-gray-600">
                      <div className="line-clamp-2 wrap-anywhere">{log.description || "-"}</div>
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
                  <TableCell colSpan={8} className="p-0 border-none">
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
        <dialog
          ref={(node) => {
            if (node && !node.open) node.showModal();
          }}
          aria-labelledby="activity-log-details-title"
          onClose={() => setViewLog(null)}
          {...{ closedby: "any" }}
          className="m-auto bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-0 backdrop:bg-black/50"
        >
          <div>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 id="activity-log-details-title" className="text-xl font-bold text-gray-900">Log Details</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Log #{viewLog.log_id}</p>
              </div>
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
                  <p className="text-sm font-semibold text-gray-900 break-all">{viewLog.product_id ?? viewLog.business_details ?? "-"}</p>
                  {viewLog.product_id && (
                    <p className="text-[11px] text-gray-400 mt-0.5">Product</p>
                  )}
                  {!viewLog.product_id && viewLog.business_details && (
                    <p className="text-[11px] text-gray-400 mt-0.5">Business</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">User</p>
                  <p className="text-sm font-semibold text-gray-900 wrap-anywhere">
                    {employeeManagementActions.has(viewLog.action_type) ? (viewLog.user_key || (viewLog.user_id ?? "-")) : "-"}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap wrap-anywhere">{viewLog.description || "-"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Editor</p>
                <p className="text-sm font-semibold text-gray-900 break-all">{viewLog.editor || "-"}</p>
              </div>
              <button
                onClick={() => setViewLog(null)}
                className="w-full px-4 py-3 bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] text-white rounded-xl hover:from-[#d891a0] hover:to-[#E7A3B0] font-medium transition shadow-md hover:shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </dialog>
      )}

      {totalCount > 0 && (
        <CustomPagination
          className="mt-4"
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      <ExportPurgeDialog
        open={purgeOpen}
        onClose={() => setPurgeOpen(false)}
        title="Export & Purge Activity Logs"
        description="Download older activity logs as a backup, then permanently delete them to keep the database lean. This action cannot be undone."
        entityLabel={{ singular: "log", plural: "logs" }}
        availableFormats={["xlsx", "csv"]}
        defaultFormat="xlsx"
        cutoffFieldLabel="created before"
        onPreview={handleLogsPreview}
        onDownload={handleLogsDownload}
        onPurge={handleLogsPurge}
        onPurgeSuccess={handleLogsPurgeSuccess}
      />
    </div>
  );
}

