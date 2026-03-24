// app/admin/activity-logs/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Calendar, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Search, X, Eye } from "lucide-react";
import CustomPagination from "@/components/general-components/CustomPagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface ActivityLog {
  log_id: number;
  created_at: string;
  action_type: string;
  product_id: number | null;
  description: string;
  editor: string | null;
  user_id: number | null;
}

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

export default function ActivityLogsPage() {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<{ month: number; year: number } | null>(null);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [showPicker, setShowPicker] = useState(false);
  const [viewLog, setViewLog] = useState<ActivityLog | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 10;
  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);

  /**
   * Fetches activity logs from the backend and handles token refreshing if the session has expired.
   * Updates component state with the fetched logs on success.
   * @param isBackground - If true, prevents the global loading indicator from showing during the request.
   */
  const fetchLogs = useCallback(async (isBackground = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (!isBackground) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/admin/fetch-logs', {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch logs');
      }
      
      const result = await response.json();
      if (isMountedRef.current) {
        setLogs(result.data || []);
      }

    } catch (err: unknown) {
      console.error('Error fetching logs:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load activity logs');
      }
    } finally {
      isFetchingRef.current = false;
      if (!isBackground) {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchLogs();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchLogs]);

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      fetchLogs(true);
    }, 30000);

    const onFocus = () => {
      fetchLogs(true);
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchLogs]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch = !query || (
        log.description?.toLowerCase().includes(query) ||
        log.action_type?.toLowerCase().includes(query) ||
        log.product_id?.toString().includes(query) ||
        log.editor?.toLowerCase().includes(query) ||
        log.user_id?.toString().includes(query)
      );
      const matchesMonth = !selectedMonth || (() => {
        const d = new Date(log.created_at);
        return d.getMonth() === selectedMonth.month && d.getFullYear() === selectedMonth.year;
      })();
      return matchesSearch && matchesMonth;
    });
  }, [logs, searchQuery, selectedMonth]);

  useEffect(() => {
    router.replace(pathname);
  }, [searchQuery, selectedMonth, logs.length, router, pathname]);

  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [filteredLogs]);

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = useMemo(
    () => sortedLogs.slice(startIndex, endIndex),
    [sortedLogs, startIndex, endIndex]
  );


  /**
   * Interacts with the backend via the /api/admin/reset-activity-logs POST endpoint
   * to delete all activity logs from the database. Requires user confirmation first.
   */
  const handleResetLogs = async () => {
    try {
      const response = await fetch('/api/admin/reset-activity-logs', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset logs');
      }

      setLogs([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset logs');
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Logs</h1>
          <p className="text-gray-500 text-sm">Inventory actions by admin or employee.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-medium px-5 py-2.5 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer"
            >
              Reset Logs
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-900">Clear Activity Logs</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete all activity logs? This action cannot be undone and clears entire tracking tracks.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900">Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white cursor-pointer" onClick={handleResetLogs}>Reset All</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by action, product ID, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative" ref={pickerRef}>
          <Button
            variant="outline"
            onClick={() => setShowPicker((p) => !p)}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            {selectedMonth ? `${MONTHS[selectedMonth.month]} ${selectedMonth.year}` : "All Months"}
            <ChevronDown className="w-4 h-4" />
          </Button>
          {showPicker && (
            <div className="absolute left-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-60">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setPickerYear((y) => y - 1)}
                  className="p-1 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-medium text-sm">{pickerYear}</span>
                <button
                  onClick={() => setPickerYear((y) => y + 1)}
                  className="p-1 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS.map((month, index) => (
                  <button
                    key={month}
                    onClick={() => {
                      setSelectedMonth({ month: index, year: pickerYear });
                      setShowPicker(false);
                    }}
                    className={`text-xs py-2 rounded-md transition-colors cursor-pointer ${
                      selectedMonth?.month === index && selectedMonth?.year === pickerYear
                        ? "bg-[#E7A3B0] text-white"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    {month}
                  </button>
                ))}
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
          {filteredLogs.length > 0
            ? `Showing ${startIndex + 1}-${Math.min(endIndex, filteredLogs.length)} of ${filteredLogs.length} logs`
            : "Showing 0 logs"}
        </span>
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
                <TableHead className="p-4 font-bold">Product ID</TableHead>
                <TableHead className="p-4 font-bold">User ID</TableHead>
                <TableHead className="p-4 font-bold w-[30%]">Description</TableHead>
                <TableHead className="p-4 font-bold">Editor</TableHead>
                <TableHead className="p-4 font-bold text-center w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <TableRow key={log.log_id} className="border-b hover:bg-gray-50">
                    <TableCell className="p-4 text-sm text-gray-700">
                      <div className="line-clamp-2 wrap-break-word">{new Date(log.created_at).toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="line-clamp-2">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${actionColors[log.action_type] || "bg-gray-100 text-gray-800"}`}>
                          {actionLabels[log.action_type] || log.action_type}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-gray-900">
                      <div className="line-clamp-2 break-all">{log.product_id || "—"}</div>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-gray-900">
                      <div className="line-clamp-2 break-all">
                        {employeeManagementActions.has(log.action_type) ? (log.user_id || "—") : "—"}
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-gray-600 max-w-0 overflow-hidden">
                      <div className="line-clamp-2 break-words">{log.description || "—"}</div>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-gray-600">
                      <div className="line-clamp-2 break-all">
                        {log.editor || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex justify-center">
                        <Button
                          size="icon"
                          variant="outline"
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
                          {logs.length === 0 ? "No activity has been recorded yet." : "No logs match your current search or filter."}
                        </EmptyDescription>
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900">Log Details</h2>
              <button onClick={() => setViewLog(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700">
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
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Product ID</p>
                  <p className="text-sm font-semibold text-gray-900">{viewLog.product_id ?? "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">User ID</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {employeeManagementActions.has(viewLog.action_type) ? (viewLog.user_id ?? "—") : "—"}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewLog.description || "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Editor</p>
                <p className="text-sm font-semibold text-gray-900 break-all">{viewLog.editor || "—"}</p>
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

      {filteredLogs.length > 0 && (
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