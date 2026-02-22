// app/admin/activity-logs/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, Search, X } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
};

const employeeManagementActions = new Set([
  "create_employee",
  "edit_employee",
  "delete_employee",
]);

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const authTokenRef = useRef<string | null>(null);

  const getAuthToken = useCallback(async () => {
    if (authTokenRef.current) {
      return authTokenRef.current;
    }

    const {
      data: { session },
    } = await browserSupabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    authTokenRef.current = session.access_token;
    return session.access_token;
  }, []);

  const fetchLogs = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
      setError(null);

      const token = await getAuthToken();

      const response = await fetch('/api/admin/fetch-logs', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch logs');
      }
      
      const result = await response.json();
      setLogs(result.data || []);

    } catch (err: unknown) {
      console.error('Error fetching logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity logs');
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      fetchLogs(true);
    }, 15000);

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


  const handleResetLogs = async () => {
    if (confirm("Are you sure you want to delete all activity logs? This cannot be undone.")) {
      try {
        const token = await getAuthToken();

        const response = await fetch('/api/admin/reset-activity-logs', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to reset logs');
        }

        setLogs([]);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to reset logs');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Logs</h1>
          <p className="text-gray-600">Inventory actions by admin or employee.</p>
        </div>
        <Button
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700"
          onClick={handleResetLogs}
        >
          Reset Logs
        </Button>
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

      {filteredLogs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-600">
          {logs.length === 0 ? "No activity logs yet." : "No logs match your search."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="grid grid-cols-7 gap-4 border-b bg-gray-50 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-700">
            <div>Date & Time</div>
            <div>Action</div>
            <div>Product ID</div>
            <div>User ID</div>
            <div>Description</div>
            <div>Editor</div>
          </div>

          <div className="divide-y">
            {paginatedLogs.map((log) => (
              <div key={log.log_id} className="grid grid-cols-7 gap-4 px-6 py-4 hover:bg-gray-50 transition">
                <div className="text-sm text-gray-700">
                  {new Date(log.created_at).toLocaleString()}
                </div>
                <div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${actionColors[log.action_type] || "bg-gray-100 text-gray-800"}`}>
                    {actionLabels[log.action_type] || log.action_type}
                  </span>
                </div>
                <div className="text-sm text-gray-900">
                  {log.product_id || "—"}
                </div>
                <div className="text-sm text-gray-900">
                  {employeeManagementActions.has(log.action_type) ? (log.user_id || "—") : "—"}
                </div>
                <div className="text-sm text-gray-600">
                  {log.description || "—"}
                </div>
                <div className="text-sm text-gray-600">
                  {log.editor || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredLogs.length > 0 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  if (safePage > 1) setCurrentPage((prev) => Math.max(1, prev - 1));
                }} 
                className={safePage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = totalPages <= 5
                ? i + 1
                : safePage <= 3
                  ? i + 1
                  : safePage >= totalPages - 2
                    ? totalPages - 4 + i
                    : safePage - 2 + i;

              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(pageNum);
                    }}
                    isActive={safePage === pageNum}
                    className="cursor-pointer"
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
                  if (safePage < totalPages) setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                }} 
                className={safePage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}