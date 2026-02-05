// app/admin/activity-logs/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useProducts, type FieldChange } from "@/contexts/ProductContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, X } from "lucide-react";

const actionLabels: Record<string, string> = {
  added: "Added",
  edited: "Edited",
  deleted: "Deleted",
  status_changed: "Status changed",
  viewed: "Viewed",
  opened_edit: "Opened edit",
};

const actionColors: Record<string, string> = {
  added: "bg-green-100 text-green-800",
  edited: "bg-blue-100 text-blue-800",
  deleted: "bg-red-100 text-red-800",
  status_changed: "bg-purple-100 text-purple-800",
  viewed: "bg-gray-100 text-gray-800",
  opened_edit: "bg-yellow-100 text-yellow-800",
};

export default function ActivityLogsPage() {
  const { activityLogs } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChanges, setSelectedChanges] = useState<FieldChange[] | null>(null);

  const logs = useMemo(() => {
    if (!activityLogs) return [];
    return activityLogs.filter((log) =>
      log.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actorEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activityLogs, searchQuery]);

  const handleResetLogs = () => {
    if (confirm("Are you sure you want to delete all activity logs? This cannot be undone.")) {
      localStorage.removeItem("dollys-activity-logs");
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Logs</h1>
          <p className="text-gray-600">Inventory actions by admin or employee.</p>
        </div>
        <Button
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={handleResetLogs}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Reset Logs
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by product, actor email, or action..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 max-w-md"
        />
        <span className="text-sm text-gray-600">
          Showing {logs.length} of {activityLogs?.length || 0} logs
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-600">
          {activityLogs?.length === 0 ? "No activity logs yet." : "No logs match your search."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="grid grid-cols-5 gap-4 border-b bg-gray-50 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-700">
            <div>Date & Time</div>
            <div>Action</div>
            <div>Product</div>
            <div>Changes</div>
            <div>Actor</div>
          </div>

          <div className="divide-y">
            {logs.map((log) => (
              <div key={log.id} className="grid grid-cols-5 gap-4 px-6 py-4 hover:bg-gray-50 transition">
                <div className="text-sm text-gray-700">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
                <div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${actionColors[log.action] || "bg-gray-100 text-gray-800"}`}>
                    {actionLabels[log.action] || log.action}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {log.productName || "—"}
                </div>
                <div className="text-sm">
                  {log.fieldChanges && log.fieldChanges.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      onClick={() => setSelectedChanges(log.fieldChanges || null)}
                    >
                      {log.fieldChanges.length === 1
                        ? log.fieldChanges[0].field
                        : `${log.fieldChanges.length} changes`}
                    </Button>
                  ) : log.statusFrom || log.statusTo ? (
                    <span className="capitalize text-gray-700">
                      <span className="text-gray-500">{log.statusFrom || "—"}</span>
                      <span className="mx-1 text-gray-400">→</span>
                      <span className="font-medium">{log.statusTo || "—"}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900 capitalize">{log.actorRole || "unknown"}</div>
                  <div className="text-xs text-gray-500">{log.actorEmail || "Unknown"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Changes Modal */}
      {selectedChanges && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative max-h-96 w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
            <button
              onClick={() => setSelectedChanges(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-4 text-lg font-semibold text-gray-900">Field Changes</h2>

            <div className="space-y-3">
              {selectedChanges.map((change, idx) => (
                <div key={idx} className="border-l-4 border-blue-400 bg-blue-50 p-3">
                  <p className="text-sm font-medium text-gray-900">{change.field}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                    <span className="line-through">{String(change.oldValue)}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-gray-900">{String(change.newValue)}</span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => setSelectedChanges(null)}
              className="mt-4 w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}