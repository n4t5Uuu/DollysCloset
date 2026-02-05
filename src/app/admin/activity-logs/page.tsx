// app/admin/activity-logs/page.tsx
"use client";

import { useMemo } from "react";
import { useProducts } from "@/contexts/ProductContext";

const actionLabels: Record<string, string> = {
  added: "Added",
  edited: "Edited",
  deleted: "Deleted",
  status_changed: "Status changed",
  viewed: "Viewed",
  opened_edit: "Opened edit",
};

export default function ActivityLogsPage() {
  const { activityLogs } = useProducts();

  const logs = useMemo(() => activityLogs || [], [activityLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity Logs</h1>
        <p className="text-gray-600">Inventory actions by admin or employee.</p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-600">
          No activity logs yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="grid grid-cols-12 gap-3 border-b bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
            <div className="col-span-3">Date & Time</div>
            <div className="col-span-2">Action</div>
            <div className="col-span-3">Product</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Actor</div>
          </div>

          <div className="divide-y">
            {logs.map((log) => (
              <div key={log.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                <div className="col-span-3 text-gray-700">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
                <div className="col-span-2 font-medium text-gray-900">
                  {actionLabels[log.action] || log.action}
                </div>
                <div className="col-span-3 text-gray-700">
                  {log.productName || "—"}
                </div>
                <div className="col-span-2 text-gray-700">
                  {log.statusFrom || log.statusTo ? (
                    <span className="capitalize">
                      {log.statusFrom ? `${log.statusFrom} → ` : ""}
                      {log.statusTo || ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="col-span-2 text-gray-700">
                  <div className="capitalize">{log.actorRole || "unknown"}</div>
                  <div className="text-xs text-gray-500">{log.actorEmail || "Unknown"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}