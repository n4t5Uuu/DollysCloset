"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, BarChart3, Package, Activity } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";

import { ActivityLog } from "@/types/logs.types";

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
};

function formatLogDate(value: string) {
    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) return "Unknown date";

    return dateValue.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function extractProductNameFromDescription(description: string, productId: number | null) {
    const matchedName = description.match(/"([^"]+)"/);
    if (matchedName?.[1]) {
        return matchedName[1];
    }

    if (productId !== null) {
        return `Product #${productId}`;
    }

    return "Product Update";
}

function extractStockChangeFromDescription(description: string) {
    const matchedStock = description.match(/stock:\s*(.+)$/i);
    if (!matchedStock?.[1]) {
        return description || "No description";
    }

    return matchedStock[1].trim();
}

export default function AdminDashboard() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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

            const response = await fetch("/api/admin/fetch-logs", {
                cache: "no-store",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to fetch logs");
            }

            const result = await response.json();
            setLogs(result.data || []);
        } catch (err: unknown) {
            console.error("Error fetching dashboard logs:", err);
            setError(err instanceof Error ? err.message : "Failed to load dashboard data");
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

    const latestLogs = useMemo(() => {
        return [...logs]
            .sort((firstLog, secondLog) => new Date(secondLog.created_at).getTime() - new Date(firstLog.created_at).getTime())
            .slice(0, 5);
    }, [logs]);

    const movingProductsLogs = useMemo(() => {
        const stockChangeLogs = logs.filter((log) => {
            const description = log.description?.toLowerCase() || "";
            return description.includes("stock:");
        });

        return stockChangeLogs
            .sort((firstLog, secondLog) => new Date(secondLog.created_at).getTime() - new Date(firstLog.created_at).getTime())
            .slice(0, 5);
    }, [logs]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#E7A3B0]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-[#121212]">Admin Dashboard</h1>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <section className="xl:col-span-8 rounded-xl border border-gray-200 bg-white p-6 min-h-[260px]">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-[#E7A3B0]" />
                        <h2 className="text-lg font-semibold text-[#121212]">Analytics</h2>
                    </div>
                    <div className="h-[190px] rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                        <p className="text-sm text-gray-500 text-center">
                            Template placeholder for analytics widgets
                        </p>
                    </div>
                </section>

                <section className="xl:col-span-4 rounded-xl border border-gray-200 bg-white p-6 min-h-[260px]">
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="w-5 h-5 text-[#E7A3B0]" />
                        <h2 className="text-lg font-semibold text-[#121212]">Moving Products</h2>
                    </div>

                    {movingProductsLogs.length === 0 ? (
                        <p className="text-sm text-gray-500">No stock movement logs yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {movingProductsLogs.map((log) => (
                                <div key={log.log_id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#E7A3B0]">
                                        {extractProductNameFromDescription(log.description || "", log.product_id)}
                                    </p>
                                    <p className="text-sm text-gray-700 line-clamp-2 mt-1">{extractStockChangeFromDescription(log.description || "")}</p>
                                    <p className="text-xs text-gray-400 mt-2">{formatLogDate(log.created_at)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="xl:col-span-12 rounded-xl border border-gray-200 bg-white p-6 min-h-[220px]">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-[#E7A3B0]" />
                        <h2 className="text-lg font-semibold text-[#121212]">Latest Logs</h2>
                    </div>

                    {latestLogs.length === 0 ? (
                        <p className="text-sm text-gray-500">No activity logs yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {latestLogs.map((log) => (
                                <div key={log.log_id} className="rounded-lg border border-gray-100 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-medium text-[#121212]">
                                            {actionLabels[log.action_type] || log.action_type}
                                        </p>
                                        <p className="text-sm text-gray-600">{log.description || "No description"}</p>
                                    </div>
                                    <p className="text-xs text-gray-400 shrink-0">{formatLogDate(log.created_at)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
