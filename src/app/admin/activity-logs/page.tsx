// app/admin/activity-logs/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, Search, X } from "lucide-react";

interface ActivityLog {
  log_id: number;
  created_at: string;
  action_type: string;
  product_id: number | null;
  description: string;
}

const actionLabels: Record<string, string> = {
  create_product: "Created Product",
  edit_product: "Edited Product",
  delete_product: "Deleted Product",
  create_category: "Created Category",
  edit_category: "Edited Category",
  delete_category: "Deleted Category",
};

const actionColors: Record<string, string> = {
  create_product: "bg-green-100 text-green-800",
  edit_product: "bg-blue-100 text-blue-800",
  delete_product: "bg-red-100 text-red-800",
  create_category: "bg-purple-100 text-purple-800",
  edit_category: "bg-indigo-100 text-indigo-800",
  delete_category: "bg-red-100 text-red-800",
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/fetch-logs');
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const result = await response.json();
      setLogs(result.data || []);

    } catch (err: any) {
      console.error('Error fetching logs:', err);
      setError(err.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter((log) =>
    log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.product_id?.toString().includes(searchQuery)
  );


  const handleResetLogs = async () => {
    if (confirm("Are you sure you want to delete all activity logs? This cannot be undone.")) {
      try {
        const response = await fetch('/api/admin/reset-activity-logs', {
          method: 'POST',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to reset logs');
        }

        setLogs([]);
      } catch (err: any) {
        setError(err.message || 'Failed to reset logs');
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
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
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
        <span className="text-sm text-gray-600">
          Showing {filteredLogs.length} of {logs.length} logs
        </span>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-600">
          {logs.length === 0 ? "No activity logs yet." : "No logs match your search."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="grid grid-cols-5 gap-4 border-b bg-gray-50 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-700">
            <div>Date & Time</div>
            <div>Action</div>
            <div>Product ID</div>
            <div>Description</div>
          </div>

          <div className="divide-y">
            {filteredLogs.map((log) => (
              <div key={log.log_id} className="grid grid-cols-5 gap-4 px-6 py-4 hover:bg-gray-50 transition">
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
                <div className="text-sm text-gray-600">
                  {log.description || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}