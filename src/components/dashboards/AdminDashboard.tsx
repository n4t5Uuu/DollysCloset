"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Package, Pencil, ImageOff, ArrowRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import AddProduct from "@/components/modals/AddProduct";

import { ActivityLog } from "@/types/logs.types";
import { InventoryProduct, InventoryCategory } from "@/types/inventory.types";

const actionLabels: Record<string, string> = {
    create_product: "Listed",
    edit_product: "Updated",
    delete_product: "Deleted",
    login: "Logged In",
    logout: "Logged Out",
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

export default function AdminDashboard() {
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [firstName, setFirstName] = useState<string>("");
    const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
    const [categories, setCategories] = useState<InventoryCategory[]>([]);
    const [loadingProductId, setLoadingProductId] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        const response = await fetch("/api/auth/profile", { cache: "no-store" });
        if (!response.ok) {
            throw new Error("Not authenticated");
        }

        const result = await response.json();
        setCurrentUserId(result?.data?.userId ?? null);
        setFirstName(result?.data?.firstName ?? "");
    }, []);

    const fetchDashboardData = useCallback(async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            setError(null);

            const [productsResponse, logsResponse] = await Promise.all([
                fetch("/api/admin/fetch-products", { cache: "no-store" }),
                fetch("/api/admin/fetch-logs", { cache: "no-store" }),
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
            console.error("Error loading admin dashboard:", err);
            const errorMsg = err instanceof Error ? err.message : "Failed to load dashboard";

            if (errorMsg === "Not authenticated") {
                window.location.replace("/unauthorized");
                return;
            }

            setError(errorMsg);
        } finally {
            if (!isBackground) setLoading(false);
        }
    }, []);

    const handleEditClick = useCallback(async (productId: string) => {
        setLoadingProductId(productId);
        try {
            const product = products.find(p => String(p.product_id) === productId);
            if (!product) return;

            const categoriesRes = await fetch("/api/admin/fetch-categories");
            const categoriesJson = await categoriesRes.json();
            setCategories(categoriesJson.data ?? []);
            setEditingProduct(product);
        } catch { /* silently fail */ }
        finally { setLoadingProductId(null); }
    }, [products]);

    useEffect(() => {
        fetchProfile().catch(() => {
            window.location.replace("/unauthorized");
        });
    }, [fetchProfile]);

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

    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Admin Home</p>
                <h1 className="text-3xl font-bold text-[#121212] mt-1">Good day, {firstName || "Admin"}</h1>
                <p className="text-gray-500 mt-1">Here’s what needs your attention today.</p>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))
                ) : (
                    <>
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
                            <p className="text-3xl font-bold text-[#121212] mt-1">{outOfStockItems.length + lowStockItems.length + missingPhotoItems.length}</p>
                            <p className="text-sm text-[#c28b16] mt-1">{outOfStockItems.length} out of stock</p>
                        </div>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="px-4 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-[#121212] flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            Stock Alerts
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">Out of stock or running low (10 or fewer remaining)</p>
                    </div>
                    <div className="p-4 space-y-2">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full rounded-lg" />
                            ))
                        ) : outOfStockItems.length === 0 && lowStockItems.length === 0 ? (
                            <p className="text-sm text-gray-500">All products are well stocked.</p>
                        ) : (
                            [...outOfStockItems.map(p => ({ ...p, status: "out" as const })), ...lowStockItems.map(p => ({ ...p, status: "low" as const }))]
                                .slice(0, 5)
                                .map((p) => (
                                    <div key={p.product_id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                                        <div className="min-w-0 flex-1 flex items-center gap-2">
                                            <p className="text-sm font-medium text-[#121212] truncate">{p.product_name}</p>
                                            <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${p.status === "out" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"}`}>
                                                {p.status === "out" ? "Out of stock" : `${p.product_stock} left`}
                                            </span>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="shrink-0 border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-200 hover:text-blue-700 hover:border-blue-300"
                                            onClick={() => handleEditClick(String(p.product_id))}
                                            disabled={loadingProductId === String(p.product_id)}
                                        >
                                            {loadingProductId === String(p.product_id)
                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                : <Pencil className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                ))
                        )}
                    </div>
                    {(outOfStockItems.length + lowStockItems.length) > 0 && (
                        <div className="px-4 pb-4">
                            <a href="/admin/inventory?availability=stock-alerts" className="flex items-center gap-1 text-xs font-medium text-[#E7A3B0]">
                                View all {outOfStockItems.length + lowStockItems.length} in Inventory <ArrowRight className="w-3 h-3" />
                            </a>
                        </div>
                    )}
                </section>

                <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="px-4 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-[#121212] flex items-center gap-2">
                            <ImageOff className="w-4 h-4 text-amber-500" />
                            Missing Images
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">Products without a photo — add one so they show up in the catalog</p>
                    </div>
                    <div className="p-4 space-y-2">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full rounded-lg" />
                            ))
                        ) : missingPhotoItems.length === 0 ? (
                            <p className="text-sm text-gray-500">All products have images.</p>
                        ) : (
                            missingPhotoItems.slice(0, 5).map((p) => (
                                <div key={p.product_id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                                    <p className="text-sm font-medium text-[#121212] truncate">{p.product_name}</p>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="shrink-0 border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-200 hover:text-blue-700 hover:border-blue-300"
                                        onClick={() => handleEditClick(String(p.product_id))}
                                        disabled={loadingProductId === String(p.product_id)}
                                    >
                                        {loadingProductId === String(p.product_id)
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <Pencil className="h-4 w-4" />}
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                    {missingPhotoItems.length > 0 && (
                        <div className="px-4 pb-4">
                            <a href="/admin/inventory?availability=no-image" className="flex items-center gap-1 text-xs font-medium text-[#E7A3B0]">
                                View all {missingPhotoItems.length} in Inventory <ArrowRight className="w-3 h-3" />
                            </a>
                        </div>
                    )}
                </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-[#121212] flex items-center gap-2">
                            <Pencil className="w-4 h-4 text-[#E7A3B0]" />
                            Recently Edited
                        </h2>
                        <span className="text-xs text-gray-400">your last 48 hrs</span>
                    </div>
                    <div className="p-4 space-y-3">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full rounded-lg" />
                            ))
                        ) : recentlyEdited.length === 0 ? (
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
                                            {actionLabels[log.action_type] || "Updated"} - {extractProductName(log.description || "", log.product_id)}
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

            {editingProduct && (
                <AddProduct
                    isOpen={true}
                    onClose={() => setEditingProduct(null)}
                    categories={categories}
                    productToEdit={editingProduct}
                    onProductSaved={() => { setEditingProduct(null); fetchDashboardData(true); }}
                />
            )}
        </div>
    );
}
