"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, ImageOff, Loader2, Package, Pencil } from "lucide-react";
import { cn } from "@dollys-closet/core";
import { Button, Skeleton } from "@dollys-closet/ui";
import { ActivityLog, InventoryCategory, InventoryProduct } from "@dollys-closet/core";
import { toast } from "sonner";
import AddProduct from "@/components/dialogs/AddProduct";
import { DashboardCardLayout, type DashboardCardDefinition } from "@/components/dashboard-layout/DashboardCardLayout";
import type { DashboardSurfaceKey } from "@/lib/dashboard-layout/config";

const actionLabels: Record<string, string> = {
  create_product: "Listed Product",
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

const lowStockThreshold = 10;
const DASHBOARD_ROW_ACTION_BUTTON_CLASS =
  "shrink-0 border-[#f5d4dc] bg-[#fff5f7] text-[#b96d7d] hover:border-[#E7A3B0]/40 hover:bg-[#fdecef] hover:text-[#a25767]";

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

function formatCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

const roleConfig = {
  admin: {
    label: "Admin Home",
    fallbackName: "Admin",
    surface: "admin_dashboard_home" as DashboardSurfaceKey,
  },
  employee: {
    label: "Employee Home",
    fallbackName: "Employee",
    surface: "employee_dashboard_home" as DashboardSurfaceKey,
  },
} as const;

interface DashboardProps {
  role: "admin" | "employee";
}

export default function Dashboard({ role }: DashboardProps) {
  const { label, fallbackName, surface } = roleConfig[role];
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
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

  const fetchDashboardData = useCallback(
    async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);
        setError(null);

        const [productsResponse, logsResponse] = await Promise.all([
          fetch("/api/admin/products", { cache: "no-store" }),
          fetch("/api/admin/logs?pageSize=200", { cache: "no-store" }),
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
        console.error(`Error loading ${role} dashboard:`, err);
        const errorMsg = err instanceof Error ? err.message : "Failed to load dashboard";

        if (errorMsg === "Not authenticated") {
          window.location.replace("/unauthorized");
          return;
        }

        setError(errorMsg);
      } finally {
        if (!isBackground) setLoading(false);
      }
    },
    [role]
  );

  const handleEditClick = useCallback(
    async (productId: string) => {
      setLoadingProductId(productId);
      try {
        const product = products.find((item) => String(item.product_id) === productId);
        if (!product) return;

        const categoriesResponse = await fetch("/api/admin/categories");
        const categoriesResult = await categoriesResponse.json();
        setCategories(categoriesResult.data ?? []);
        setEditingProduct(product);
      } catch (err: unknown) {
        console.error("Error preparing product for edit:", err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to load product details. Please try again."
        );
      } finally {
        setLoadingProductId(null);
      }
    },
    [products]
  );

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
    }, 20_000);

    const handleFocus = () => {
      fetchDashboardData(true);
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchDashboardData]);

  const productById = useMemo(
    () => new Map(products.map((product) => [String(product.product_id), product])),
    [products]
  );

  const weekStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  }, []);

  const monthStart = useMemo(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }, []);

  const myProductLogs = useMemo(() => {
    return logs.filter(
      (log) =>
        ["create_product", "edit_product", "delete_product"].includes(log.action_type) &&
        currentUserId !== null &&
        String(log.user_id) === currentUserId
    );
  }, [currentUserId, logs]);

  const itemsAddedThisWeek = useMemo(() => {
    return myProductLogs.filter((log) => {
      if (log.action_type !== "create_product") return false;
      return new Date(log.created_at).getTime() >= weekStart.getTime();
    }).length;
  }, [myProductLogs, weekStart]);

  const itemsAddedThisMonth = useMemo(() => {
    return myProductLogs.filter((log) => {
      if (log.action_type !== "create_product") return false;
      return new Date(log.created_at).getTime() >= monthStart.getTime();
    }).length;
  }, [monthStart, myProductLogs]);

  const listedCount = useMemo(
    () => products.filter((product) => product.show_in_catalog).length,
    [products]
  );
  const unlistedCount = useMemo(
    () => products.filter((product) => !product.show_in_catalog).length,
    [products]
  );
  const lowStockItems = useMemo(
    () =>
      products.filter(
        (product) => product.product_stock > 0 && product.product_stock < lowStockThreshold
      ),
    [products]
  );
  const outOfStockItems = useMemo(
    () => products.filter((product) => product.product_stock === 0),
    [products]
  );
  const missingPhotoItems = useMemo(
    () => products.filter((product) => !product.image_id),
    [products]
  );

  const recentlyEdited = useMemo(() => {
    return myProductLogs
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
      .map((log) => {
        const productName = extractProductName(log.description || "", log.product_id);
        const product =
          log.product_id !== null ? productById.get(String(log.product_id)) : undefined;
        const statusLabel = product
          ? product.show_in_catalog
            ? "Listed"
            : "Unlisted"
          : log.action_type === "delete_product"
            ? "Deleted"
            : "Updated";

        return {
          logId: log.log_id,
          name: productName,
          status: statusLabel,
          timestamp: formatDateTime(log.created_at),
        };
      });
  }, [myProductLogs, productById]);

  const myAllLogs = useMemo(() => {
    return logs.filter(
      (log) => currentUserId !== null && String(log.user_id) === currentUserId
    );
  }, [currentUserId, logs]);

  const recentActivity = useMemo(() => {
    return myAllLogs
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  }, [myAllLogs]);

  const dashboardCards = useMemo<DashboardCardDefinition[]>(() => {
    const stockAlertCount = outOfStockItems.length + lowStockItems.length;

    return [
      {
        id: "stock-alerts",
        title: "Stock Alerts",
        description: "Out of stock or running low (10 or fewer remaining).",
        icon: <AlertTriangle className="h-4 w-4" />,
        className: "xl:col-span-1",
        headerMeta: (
          <span className="rounded-full border border-[#f5d4dc] bg-[#fff5f7] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b96d7d]">
            {loading ? "Updating" : formatCountLabel(stockAlertCount, "alert")}
          </span>
        ),
        minimizedSummary: loading
          ? "checking stock..."
          : stockAlertCount === 0
            ? "all clear"
            : formatCountLabel(stockAlertCount, "alert"),
        contentClassName: "p-4 pt-3",
        render: () => (
          <div className="space-y-1.5">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-lg" />
              ))
            ) : stockAlertCount === 0 ? (
              <p className="text-sm text-gray-500">All products are well stocked.</p>
            ) : (
              <>
                {[
                  ...outOfStockItems.map((product) => ({ ...product, status: "out" as const })),
                  ...lowStockItems.map((product) => ({ ...product, status: "low" as const })),
                ]
                  .slice(0, 5)
                  .map((product) => (
                    <div
                      key={product.product_id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-1.5"
                    >
                      <div className="min-w-0 flex flex-1 items-center gap-2">
                        <p className="truncate text-sm font-medium text-[#121212]">
                          {product.product_name}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                            product.status === "out"
                              ? "bg-red-50 text-red-500"
                              : "bg-amber-50 text-amber-500"
                          )}
                        >
                          {product.status === "out"
                            ? "Out of stock"
                            : `${product.product_stock} left`}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        className={DASHBOARD_ROW_ACTION_BUTTON_CLASS}
                        onClick={() => handleEditClick(String(product.product_id))}
                        disabled={loadingProductId === String(product.product_id)}
                      >
                        {loadingProductId === String(product.product_id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}

                <div className="pt-2">
                  <a
                    href="/dashboard/inventory?availability=stock-alerts"
                    className="flex items-center gap-1 text-xs font-medium text-[#E7A3B0]"
                  >
                    View all {stockAlertCount} in Inventory <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </>
            )}
          </div>
        ),
      },
      {
        id: "missing-images",
        title: "Missing Images",
        description: "Products without a photo that still need catalog-ready images.",
        icon: <ImageOff className="h-4 w-4" />,
        className: "xl:col-span-1",
        minimizedSummary: loading
          ? "checking image coverage..."
          : formatCountLabel(missingPhotoItems.length, "item"),
        render: () => (
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-lg" />
              ))
            ) : missingPhotoItems.length === 0 ? (
              <p className="text-sm text-gray-500">All products have images.</p>
            ) : (
              <>
                {missingPhotoItems.slice(0, 5).map((product) => (
                  <div
                    key={product.product_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"
                  >
                    <p className="truncate text-sm font-medium text-[#121212]">
                      {product.product_name}
                    </p>
                    <Button
                      size="icon"
                      variant="outline"
                      className={DASHBOARD_ROW_ACTION_BUTTON_CLASS}
                      onClick={() => handleEditClick(String(product.product_id))}
                      disabled={loadingProductId === String(product.product_id)}
                    >
                      {loadingProductId === String(product.product_id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}

                <div className="pt-1">
                  <a
                    href="/dashboard/inventory?availability=no-image"
                    className="flex items-center gap-1 text-xs font-medium text-[#E7A3B0]"
                  >
                    View all {missingPhotoItems.length} in Inventory <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </>
            )}
          </div>
        ),
      },
      {
        id: "recently-edited",
        title: "Recently Edited",
        description: "Your latest product updates from the past 48 hours.",
        icon: <Pencil className="h-4 w-4" />,
        className: "xl:col-span-1",
        minimizedSummary: loading
          ? "loading recent edits..."
          : recentlyEdited.length === 0
            ? "no recent edits"
            : formatCountLabel(recentlyEdited.length, "recent edit"),
        render: () => (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-lg" />
              ))
            ) : recentlyEdited.length === 0 ? (
              <p className="text-sm text-gray-500">No recent edits yet.</p>
            ) : (
              recentlyEdited.map((item) => (
                <div
                  key={item.logId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#121212]">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.timestamp}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs font-medium",
                      item.status === "Listed"
                        ? "bg-green-100 text-green-700"
                        : item.status === "Unlisted"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        ),
      },
      {
        id: "activity-log",
        title: "Activity Log",
        description: "Recent actions from your account only.",
        icon: <Package className="h-4 w-4" />,
        className: "xl:col-span-1",
        minimizedSummary: loading
          ? "loading recent activity..."
          : recentActivity.length === 0
            ? "no recent activity"
            : formatCountLabel(recentActivity.length, "recent action"),
        render: () => (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-lg" />
              ))
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No activity yet.</p>
            ) : (
              recentActivity.map((log) => (
                <div
                  key={log.log_id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#121212]">
                      {actionLabels[log.action_type] || log.action_type}
                      {log.product_id
                        ? ` - ${extractProductName(log.description || "", log.product_id)}`
                        : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {formatDateTime(log.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#f5d4dc] bg-[#fdf2f5] px-2 py-0.5 text-xs font-medium text-[#E7A3B0]">
                    {actionLabels[log.action_type]?.split(" ")[0] || "Action"}
                  </span>
                </div>
              ))
            )}
          </div>
        ),
      },
    ];
  }, [
    handleEditClick,
    loading,
    loadingProductId,
    lowStockItems,
    missingPhotoItems,
    outOfStockItems,
    recentActivity,
    recentlyEdited,
  ]);
  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{label}</p>
        <h1 className="mt-1 text-3xl font-bold text-[#121212]">
          Good day, {firstName?.split(" ")[0] || fallbackName}
        </h1>
        <p className="mt-1 text-gray-500">Here&apos;s what needs your attention today.</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-gray-400">Items Added</p>
              <p className="mt-1 text-2xl font-bold text-[#121212]">{itemsAddedThisMonth}</p>
              <p className="mt-1 text-sm text-green-600">+{itemsAddedThisWeek} this week</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-gray-400">Listed</p>
              <p className="mt-1 text-2xl font-bold text-[#121212]">{listedCount}</p>
              <p className="mt-1 text-sm text-gray-500">Live in catalog</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-gray-400">Unpublished</p>
              <p className="mt-1 text-2xl font-bold text-[#121212]">{unlistedCount}</p>
              <p
                className={cn(
                  "mt-1 text-sm",
                  unlistedCount > 0 ? "text-amber-600" : "text-green-600"
                )}
              >
                {unlistedCount > 0 ? "Needs attention" : "All published"}
              </p>
            </div>
            <div className="rounded-xl border border-[#f2dfb3] bg-[#fffaf0] p-4">
              <p className="text-xs uppercase tracking-wider text-gray-400">Alerts</p>
              <p className="mt-1 text-2xl font-bold text-[#121212]">
                {outOfStockItems.length + lowStockItems.length + missingPhotoItems.length}
              </p>
              <p className="mt-1 text-sm text-[#c28b16]">
                {outOfStockItems.length} out of stock
              </p>
            </div>
          </>
        )}
      </div>

      <DashboardCardLayout
        surface={surface}
        cards={dashboardCards}
        gridClassName="grid grid-cols-1 gap-4 xl:auto-rows-max xl:grid-cols-2 xl:grid-flow-row-dense"
      />

      {editingProduct ? (
        <AddProduct
          isOpen={true}
          onClose={() => setEditingProduct(null)}
          categories={categories}
          productToEdit={editingProduct}
          onProductSaved={() => {
            setEditingProduct(null);
            fetchDashboardData(true);
          }}
        />
      ) : null}
    </div>
  );
}


