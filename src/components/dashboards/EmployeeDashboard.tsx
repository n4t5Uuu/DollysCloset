"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, Package, Pencil } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";

import { ActivityLog } from "@/types/logs.types";
import { InventoryProduct } from "@/types/inventory.types";

const actionLabels: Record<string, string> = {
    create_product: "Listed",
    edit_product: "Updated",
    delete_product: "Deleted",
};

const lowStockThreshold = 10;

function formatDateTime(value: string) {
    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) return "Unknown";

    return dateValue.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function extractProductName(description: string, productId: number | string | null) {
    const match = description?.match(/"([^"]+)"/);
    if (match?.[1]) return match[1];
    if (productId !== null && productId !== undefined) return `Product #${productId}`;
    return "Product";
}

export default function EmployeeDashboard() {
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState("there");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const authTokenRef = useRef<string | null>(null);

    const getSessionDetails = useCallback(async () => {
        const { data: { session } } = await browserSupabase.auth.getSession();

        if (!session?.access_token || !session.user) {
            throw new Error("Not authenticated");
        }

        authTokenRef.current = session.access_token;
        setCurrentUserId(session.user.id);

        const { data: userRow } = await browserSupabase
            .from("tbl_users")
            .select("first_name, last_name")
            .eq("user_id", session.user.id)
            .single();

        const firstNameFromTable = String(userRow?.first_name || "").trim();
        const lastNameFromTable = String(userRow?.last_name || "").trim();
        const fullNameFromTable = [firstNameFromTable, lastNameFromTable].filter(Boolean).join(" ").trim();

        const metadata = session.user.user_metadata || {};
        const firstName = String(metadata.first_name || "").trim();
        const lastName = String(metadata.last_name || "").trim();
        const fullNameFromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
        const fullNameFromMetadata = String(metadata.full_name || metadata.name || "").trim();
        const fallbackName = String(session.user.email?.split("@")[0] || "there").trim();

        setDisplayName(fullNameFromTable || fullNameFromParts || fullNameFromMetadata || fallbackName);

        return session.access_token;
    }, []);

    const fetchDashboardData = useCallback(async (isBackground = false) => {
        try {
            if (!isBackground) {
                setLoading(true);
            }
            setError(null);

            const token = authTokenRef.current || await getSessionDetails();

            const [productsResponse, logsResponse] = await Promise.all([
                fetch("/api/admin/fetch-products", { cache: "no-store" }),
                fetch("/api/admin/fetch-logs", {
                    cache: "no-store",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }),
            ]);

            if (!productsResponse.ok) {
                const result = await productsResponse.json();
                throw new Error(result.error || "Failed to fetch products");
            }

            if (!logsResponse.ok) {
                const result = await logsResponse.json();
                throw new Error(result.error || "Failed to fetch logs");
            }

            const productsResult = await productsResponse.json();
            const logsResult = await logsResponse.json();

            setProducts(productsResult.data || []);
            setLogs(logsResult.data || []);
        } catch (err: unknown) {
            console.error("Error loading employee dashboard:", err);
            setError(err instanceof Error ? err.message : "Failed to load dashboard");
        } finally {
            if (!isBackground) {
                setLoading(false);
            }
        }
    }, [getSessionDetails]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    useEffect(() => {
        const refreshInterval = window.setInterval(() => {
            fetchDashboardData(true);
        }, 20000);

        const onFocus = () => {
            fetchDashboardData(true);
        };

        window.addEventListener("focus", onFocus);
        return () => {
            window.clearInterval(refreshInterval);
            window.removeEventListener("focus", onFocus);
        };
    }, [fetchDashboardData]);

    const productById = useMemo(
        () => new Map(products.map((product) => [String(product.product_id), product])),
        [products]
    );

    const weekStart = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d;
    }, []);
    const monthStart = useMemo(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    }, []);

    const myProductLogs = useMemo(() => {
        return logs.filter((log) =>
            ["create_product", "edit_product", "delete_product"].includes(log.action_type) &&
            currentUserId !== null &&
            String(log.user_id) === currentUserId
        );
    }, [logs, currentUserId]);

    const itemsAddedThisWeek = useMemo(() => {
        return myProductLogs.filter((log) => {
            if (log.action_type !== "create_product") return false;
            const timestamp = new Date(log.created_at).getTime();
            return timestamp >= weekStart.getTime();
        }).length;
    }, [myProductLogs, weekStart]);

    const itemsAddedThisMonth = useMemo(() => {
        return myProductLogs.filter((log) => {
            if (log.action_type !== "create_product") return false;
            const timestamp = new Date(log.created_at).getTime();
            return timestamp >= monthStart.getTime();
        }).length;
    }, [myProductLogs, monthStart]);

    const listedCount = useMemo(() => products.filter((product) => product.show_in_catalog).length, [products]);
    const unlistedCount = useMemo(() => products.filter((product) => !product.show_in_catalog).length, [products]);
    const lowStockItems = useMemo(() => products.filter((product) => product.product_stock > 0 && product.product_stock < lowStockThreshold), [products]);
    const outOfStockItems = useMemo(() => products.filter((product) => product.product_stock === 0), [products]);
    const missingPhotoItems = useMemo(() => products.filter((product) => !product.image_id), [products]);
    const noPriceItems = useMemo(() => products.filter((product) => !product.product_price || Number(product.product_price) <= 0), [products]);

    const needsAttention = useMemo(() => {
        const list = [
            ...missingPhotoItems.slice(0, 3).map((product) => ({
                key: `photo-${product.product_id}`,
                label: "Missing photo",
                productName: product.product_name,
            })),
            ...noPriceItems.slice(0, 2).map((product) => ({
                key: `price-${product.product_id}`,
                label: "No price set",
                productName: product.product_name,
            })),
            ...lowStockItems.slice(0, 3).map((product) => ({
                key: `stock-${product.product_id}`,
                label: "Low stock",
                productName: `${product.product_name} (${product.product_stock} left)`,
            })),
            ...outOfStockItems.slice(0, 3).map((product) => ({
                key: `out-stock-${product.product_id}`,
                label: "Out of stock",
                productName: product.product_name,
            })),
        ];

        return list.slice(0, 6);
    }, [missingPhotoItems, noPriceItems, lowStockItems, outOfStockItems]);

    const recentlyEdited = useMemo(() => {
        return myProductLogs
            .slice()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 6)
            .map((log) => {
                const productName = extractProductName(log.description || "", log.product_id);
                const product = log.product_id !== null ? productById.get(String(log.product_id)) : undefined;
                const statusLabel = product ? (product.show_in_catalog ? "Listed" : "Unlisted") : (log.action_type === "delete_product" ? "Deleted" : "Updated");

                return {
                    logId: log.log_id,
                    name: productName,
                    status: statusLabel,
                    timestamp: formatDateTime(log.created_at),
                };
            });
    }, [myProductLogs, productById]);

    const recentActivity = useMemo(() => {
        return myProductLogs
            .slice()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);
    }, [myProductLogs]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#E7A3B0]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Employee Home</p>
                <h1 className="text-3xl font-bold text-[#121212] mt-1">Good day, {displayName} 👋</h1>
                <p className="text-gray-500 mt-1">Here’s what needs your attention today.</p>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-400">Items Added</p>
                    <p className="text-3xl font-bold text-[#121212] mt-1">{itemsAddedThisMonth}</p>
                    <p className="text-sm text-green-600 mt-1">+{itemsAddedThisWeek} this week</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-400">Listed</p>
                    <p className="text-3xl font-bold text-[#121212] mt-1">{listedCount}</p>
                    <p className="text-sm text-gray-500 mt-1">Live in catalog</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-400">Unpublished</p>
                    <p className="text-3xl font-bold text-[#121212] mt-1">{unlistedCount}</p>
                    <p className={`text-sm mt-1 ${unlistedCount > 0 ? "text-amber-600" : "text-green-600"}`}>
                        {unlistedCount > 0 ? "Needs attention" : "All published"}
                    </p>
                </div>
                <div className="rounded-xl border border-[#f2dfb3] bg-[#fffaf0] p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-400">Alerts</p>
                    <p className="text-3xl font-bold text-[#121212] mt-1">{needsAttention.length}</p>
                    <p className="text-sm text-[#c28b16] mt-1">{missingPhotoItems.length} missing photos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-[#121212] flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-[#E7A3B0]" />
                            Needs Attention
                        </h2>
                        <span className="text-xs text-gray-400">{needsAttention.length} items</span>
                    </div>
                    <div className="p-4 space-y-3">
                        {needsAttention.length === 0 ? (
                            <p className="text-sm text-gray-500">Everything looks good right now.</p>
                        ) : (
                            needsAttention.map((item) => (
                                <div key={item.key} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-[#E7A3B0]">{item.label}</p>
                                        <p className="text-sm text-gray-700 font-medium">{item.productName}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-[#121212] flex items-center gap-2">
                            <Pencil className="w-4 h-4 text-[#E7A3B0]" />
                            Recently Edited
                        </h2>
                        <span className="text-xs text-gray-400">your last 48 hrs</span>
                    </div>
                    <div className="p-4 space-y-3">
                        {recentlyEdited.length === 0 ? (
                            <p className="text-sm text-gray-500">No recent edits yet.</p>
                        ) : (
                            recentlyEdited.map((item) => (
                                <div key={item.logId} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-[#121212] truncate">{item.name}</p>
                                        <p className="text-xs text-gray-400">{item.timestamp}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        item.status === "Listed" ? "bg-green-100 text-green-700" :
                                        item.status === "Unlisted" ? "bg-amber-100 text-amber-700" :
                                        "bg-gray-100 text-gray-700"
                                    }`}>
                                        {item.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#E7A3B0]" />
                    <h2 className="text-sm font-semibold text-[#121212]">Activity Log</h2>
                    <span className="text-xs text-gray-400 ml-auto">your activity only</span>
                </div>
                <div className="p-4 space-y-3">
                    {recentActivity.length === 0 ? (
                        <p className="text-sm text-gray-500">No activity yet.</p>
                    ) : (
                        recentActivity.map((log) => (
                            <div key={log.log_id} className="flex items-start justify-between gap-3 border-l-2 border-[#E7A3B0]/30 pl-3">
                                <div>
                                    <p className="text-sm font-medium text-[#121212]">
                                        {actionLabels[log.action_type] || "Updated"} — {extractProductName(log.description || "", log.product_id)}
                                    </p>
                                    <p className="text-xs text-gray-500">{log.description || "No description"}</p>
                                </div>
                                <span className="text-xs text-gray-400 shrink-0">{formatDateTime(log.created_at)}</span>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
