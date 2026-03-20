// app/admin/activity-logs/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Search, X, Eye } from "lucide-react";
import CustomPagination from "@/components/general-components/CustomPagination";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewLog, setViewLog] = useState<ActivityLog | null>(null);
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

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return logs;

    return logs.filter((log) =>
      log.description?.toLowerCase().includes(query) ||
      log.action_type?.toLowerCase().includes(query) ||
      log.product_id?.toString().includes(query) ||
      log.editor?.toLowerCase().includes(query) ||
      log.user_id?.toString().includes(query)
    );
  }, [logs, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOrder, logs.length]);

  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });
  }, [filteredLogs, sortOrder]);

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
          <p className="text-gray-600">Inventory actions by admin or employee.</p>
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
        <Button
          variant="outline"
          onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
        >
          Sort: {sortOrder === "desc" ? "Newest" : "Oldest"}
        </Button>
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
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-600">
          {logs.length === 0 ? "No activity logs yet." : "No logs match your search."}
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
            <Table className="w-full table-fixed">
              <TableHeader className="border-b bg-gray-50">
                <TableRow>
                  <TableHead className="p-4 font-bold w-[194px]">Date & Time</TableHead>
                  <TableHead className="p-4 font-bold w-[235px]">Action</TableHead>
                  <TableHead className="p-4 font-bold w-[115px]">Product ID</TableHead>
                  <TableHead className="p-4 font-bold w-[158px]">User ID</TableHead>
                  <TableHead className="p-4 font-bold">Description</TableHead>
                  <TableHead className="p-4 font-bold w-[190px]">Editor</TableHead>
                  <TableHead className="p-4 font-bold w-[70px] text-center">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => (
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
                    <TableCell className="p-4 text-sm text-gray-600">
                      <div className="line-clamp-2">{log.description || "—"}</div>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-gray-600">
                      <div className="line-clamp-2 break-all">
                        {log.editor || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-center">
                      <Button
                        size="icon"
                        variant="outline"
                        className="border-pink-200 text-pink-600 bg-pink-50 hover:bg-pink-200 hover:text-pink-700 hover:border-pink-300"
                        onClick={() => setViewLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}