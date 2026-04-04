"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus, Trash, X, Upload, SlidersHorizontal, RefreshCw } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CategoryCascadingFilter from "@/components/CategoryCascadingFilter";
import { Skeleton } from "@/components/ui/skeleton";

import AddProduct from "@/components/dialogs/AddProduct";
import BulkImportModal from "@/components/dialogs/BulkImportModal";
import { InventoryTable } from "@/components/tables/InventoryTable";
import { InventoryProduct as Product, InventoryCategory as Category, InventoryProductImage as ProductImage } from "@/types/inventory.types";
import CustomPagination from "@/components/general-components/CustomPagination";
import AdminSearchInput from "@/components/general-components/AdminSearchInput";
import ViewProductDialog from "@/components/dialogs/ViewProductDialog";
import { toast } from "sonner";
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
import { AdminNoticeBanner } from "@/components/ui/admin-notice-banner";

interface InventoryManagementProps {
  initialAvailabilityFilter?: string;
}

const availabilityLabels: Record<string, string> = {
  "all": "All stock",
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "out-of-stock": "Out of stock",
  "stock-alerts": "Stock alerts",
  "no-image": "No image",
};

const visibilityLabels: Record<string, string> = {
  "all": "All visibility",
  "published": "Published",
  "unpublished": "Unpublished",
};

const sortLabels: Record<string, string> = {
  "newest": "Newest first",
  "oldest": "Oldest first",
  "az": "Name A to Z",
  "za": "Name Z to A",
};

export default function InventoryManagement({ initialAvailabilityFilter }: InventoryManagementProps) {
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

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ tone: "success" | "warning"; message: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState(initialAvailabilityFilter ?? "all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateSort, setDateSort] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [viewImages, setViewImages] = useState<ProductImage[]>([]);
  const [selectedViewImage, setSelectedViewImage] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const itemsPerPage = 10;
  const lowStockThreshold = 10;

  const fetchProducts = useCallback(async (showGlobalLoader = false) => {
    try {
      if (showGlobalLoader) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/admin/products', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const result = await response.json();
      setProducts(result.data || []);
      return true;
    } catch (err: unknown) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      return false;
    } finally {
      if (showGlobalLoader) setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/categories', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const result = await response.json();
      setCategories(result.data || []);
    } catch (err: unknown) {
      console.error('Error fetching categories:', err);
      setCategories([]);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    }
  }, []);

  useEffect(() => {
    const initializeInventory = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchProducts(false), fetchCategories()]);
      } finally {
        setLoading(false);
      }
    };
    initializeInventory();
  }, [fetchProducts, fetchCategories]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTypingTarget = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
      const isSearchFocused = activeElement === searchInputRef.current;

      if (event.key === "/" && !isTypingTarget) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.key === "Escape" && isSearchFocused) {
        event.preventDefault();
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyboardShortcuts);
    return () => document.removeEventListener("keydown", handleKeyboardShortcuts);
  }, []);

  useEffect(() => {
    router.replace(pathname);
  }, [searchQuery, visibilityFilter, availabilityFilter, categoryFilter, dateSort, router, pathname]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [Number(category.category_id), category])),
    [categories]
  );

  const childrenByParentId = useMemo(() => {
    const map = new Map<number | null, number[]>();
    categories.forEach((cat) => {
      const parentId = cat.parent_category;
      const existing = map.get(parentId) ?? [];
      existing.push(Number(cat.category_id));
      map.set(parentId, existing);
    });
    return map;
  }, [categories]);

  const getDescendantIds = useCallback((rootId: number): Set<number> => {
    const result = new Set<number>();
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.add(current);
      (childrenByParentId.get(current) ?? []).forEach((childId) => queue.push(childId));
    }
    return result;
  }, [childrenByParentId]);

  const filteredCategoryIds = useMemo(() => {
    if (categoryFilter === "all") return null;

    if (categoryFilter.startsWith("rootgroup:")) {
      const key = categoryFilter.slice("rootgroup:".length);
      const rootCats = categories.filter(
        (cat) => cat.parent_category === null && cat.category_name.trim().toLowerCase() === key
      );
      const result = new Set<number>();
      rootCats.forEach((cat) => {
        getDescendantIds(Number(cat.category_id)).forEach((id) => result.add(id));
      });
      return result;
    }

    const id = parseInt(categoryFilter);
    return isNaN(id) ? null : getDescendantIds(id);
  }, [categoryFilter, categories, getDescendantIds]);

  const buildCategoryPath = useCallback((id: number) => {
    const category = categoryById.get(id);
    if (!category) return 'Unknown';

    const path: string[] = [category.category_name];
    let parentId = category.parent_category;
    const visited = new Set<number>([id]);

    while (parentId !== null) {
      if (visited.has(parentId)) break;
      visited.add(parentId);
      const parent = categoryById.get(parentId);
      if (!parent) break;
      path.unshift(parent.category_name);
      parentId = parent.parent_category;
    }

    return path.join(" > ");
  }, [categoryById]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const categoryPath = buildCategoryPath(product.category_id).toLowerCase();
        const matchesSearch = normalizedQuery === ""
          || String(product.product_id).includes(normalizedQuery)
          || product.product_name.toLowerCase().includes(normalizedQuery)
          || product.product_brand.toLowerCase().includes(normalizedQuery)
          || (product.product_description || "").toLowerCase().includes(normalizedQuery)
          || categoryPath.includes(normalizedQuery);
        const matchesCategory = filteredCategoryIds === null || filteredCategoryIds.has(Number(product.category_id));
        const matchesAvailability = availabilityFilter === "all" ||
          (availabilityFilter === "in-stock" && product.product_stock >= lowStockThreshold) ||
          (availabilityFilter === "low-stock" && product.product_stock > 0 && product.product_stock < lowStockThreshold) ||
          (availabilityFilter === "out-of-stock" && product.product_stock === 0) ||
          (availabilityFilter === "stock-alerts" && product.product_stock < lowStockThreshold) ||
          (availabilityFilter === "no-image" && !product.image_id);
        const matchesVisibility = visibilityFilter === "all" ||
          (visibilityFilter === "published" && product.show_in_catalog) ||
          (visibilityFilter === "unpublished" && !product.show_in_catalog);
        return matchesSearch && matchesCategory && matchesAvailability && matchesVisibility;
      })
      .sort((firstProduct, secondProduct) => {
        const firstDateValue = new Date(firstProduct.created_at || 0).getTime();
        const secondDateValue = new Date(secondProduct.created_at || 0).getTime();
        
        if (dateSort === "oldest") return firstDateValue - secondDateValue;
        if (dateSort === "newest") return secondDateValue - firstDateValue;
        if (dateSort === "az") return firstProduct.product_name.localeCompare(secondProduct.product_name);
        if (dateSort === "za") return secondProduct.product_name.localeCompare(firstProduct.product_name);
        return 0;
      });
  }, [products, searchQuery, filteredCategoryIds, availabilityFilter, visibilityFilter, dateSort, lowStockThreshold, buildCategoryPath]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const getCategoryName = buildCategoryPath;

  const selectedCategoryLabel = useMemo(() => {
    if (categoryFilter === "all") return null;

    if (categoryFilter.startsWith("rootgroup:")) {
      const rootKey = categoryFilter.slice("rootgroup:".length);
      const rootMatch = categories.find(
        (category) => category.parent_category === null && category.category_name.trim().toLowerCase() === rootKey
      );
      return rootMatch?.category_name ?? "Category";
    }

    const categoryId = Number(categoryFilter);
    return Number.isNaN(categoryId) ? "Category" : getCategoryName(categoryId);
  }, [categories, categoryFilter, getCategoryName]);

  const activeFilterChips = useMemo(() => {
    return [
      searchQuery.trim()
        ? { key: "search", label: `Search: ${searchQuery.trim()}`, onRemove: () => setSearchQuery("") }
        : null,
      visibilityFilter !== "all"
        ? { key: "visibility", label: `Visibility: ${visibilityLabels[visibilityFilter] ?? visibilityFilter}`, onRemove: () => setVisibilityFilter("all") }
        : null,
      availabilityFilter !== "all"
        ? { key: "availability", label: `Availability: ${availabilityLabels[availabilityFilter] ?? availabilityFilter}`, onRemove: () => setAvailabilityFilter("all") }
        : null,
      categoryFilter !== "all" && selectedCategoryLabel
        ? { key: "category", label: `Category: ${selectedCategoryLabel}`, onRemove: () => setCategoryFilter("all") }
        : null,
      dateSort !== "newest"
        ? { key: "sort", label: `Sort: ${sortLabels[dateSort] ?? dateSort}`, onRemove: () => setDateSort("newest") }
        : null,
    ].filter((chip): chip is { key: string; label: string; onRemove: () => void } => Boolean(chip));
  }, [availabilityFilter, categoryFilter, dateSort, searchQuery, selectedCategoryLabel, visibilityFilter]);

  const quickFilterCards = useMemo(() => {
    const totalCount = products.length;
    const publishedCount = products.filter((product) => product.show_in_catalog).length;
    const hiddenCount = totalCount - publishedCount;
    const stockAlertCount = products.filter((product) => product.product_stock < lowStockThreshold).length;
    const noImageCount = products.filter((product) => !product.image_id).length;

    return [
      {
        key: "all",
        label: "All Products",
        count: totalCount,
        active: availabilityFilter === "all" && visibilityFilter === "all",
        onClick: () => {
          setAvailabilityFilter("all");
          setVisibilityFilter("all");
        },
      },
      {
        key: "published",
        label: "Published",
        count: publishedCount,
        active: visibilityFilter === "published",
        onClick: () => {
          setVisibilityFilter("published");
          setAvailabilityFilter("all");
        },
      },
      {
        key: "hidden",
        label: "Hidden",
        count: hiddenCount,
        active: visibilityFilter === "unpublished",
        onClick: () => {
          setVisibilityFilter("unpublished");
          setAvailabilityFilter("all");
        },
      },
      {
        key: "alerts",
        label: "Stock Alerts",
        count: stockAlertCount,
        active: availabilityFilter === "stock-alerts",
        onClick: () => {
          setAvailabilityFilter("stock-alerts");
          setVisibilityFilter("all");
        },
      },
      {
        key: "no-image",
        label: "No Image",
        count: noImageCount,
        active: availabilityFilter === "no-image",
        onClick: () => {
          setAvailabilityFilter("no-image");
          setVisibilityFilter("all");
        },
      },
    ];
  }, [availabilityFilter, lowStockThreshold, products, visibilityFilter]);

  const inventoryEmptyTitle = products.length === 0 ? "No products yet" : "No products matched your filters";
  const inventoryEmptyDescription = products.length === 0
    ? "Add a product or import your inventory to start managing products here."
    : "Try clearing one or more filters, or broaden your search to see more products.";

  const clearAllFilters = () => {
    setSearchQuery("");
    setVisibilityFilter("all");
    setAvailabilityFilter("all");
    setCategoryFilter("all");
    setDateSort("newest");
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingProduct(null);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(currentProducts.map(p => p.product_id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowAddModal(true);
  };

  const handleViewProduct = async (product: Product) => {
    setViewProduct(product);
    setSelectedViewImage(null);
    try {
      const response = await fetch(`/api/admin/images?product_id=${product.product_id}`);
      if (response.ok) {
        const result = await response.json();
        const images: ProductImage[] = result.data || [];
        setViewImages(images);
        const primaryImage = images.find((img) => img.is_primary) || images[0];
        setSelectedViewImage(primaryImage?.image_url || null);
      } else {
        setViewImages([]);
        setSelectedViewImage(null);
      }
    } catch (err) {
      console.error("Error fetching view images:", err);
      setViewImages([]);
      setSelectedViewImage(null);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setActionLoading(true);
    setError(null);
    setActionNotice(null);
    try {
      const { data: { session } } = await browserSupabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ product_id: productId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete product');
      setError(null);
      await fetchProducts();
      toast.success("Product deleted successfully.");
      setActionNotice({ tone: "success", message: "Product deleted. The inventory list has been refreshed." });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete product';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      setError("No products selected");
      return;
    }
    setActionLoading(true);
    setError(null);
    setActionNotice(null);
    try {
      const { data: { session } } = await browserSupabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await fetch('/api/admin/products/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ product_ids: Array.from(selectedProducts) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete products');
      setSelectedProducts(new Set());
      setError(null);
      await fetchProducts();
      toast.success("Selected products deleted successfully.");
      setActionNotice({ tone: "success", message: "Selected products were deleted and the inventory list is up to date." });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete products';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Inventory</h1>
          <p className="text-gray-500 text-sm">Create, update, and organize products and categories.</p>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchProducts(true)}
            className="h-10 border-[#E7A3B0]/30 text-[#b96d7d] hover:bg-[#fff5f7] hover:text-[#b96d7d]"
            disabled={loading || actionLoading}
            title="Refresh inventory"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${(loading || actionLoading) ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 cursor-pointer"
          >
            <Upload size={16} />
            Import
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] hover:from-[#d891a0] hover:to-[#E7A3B0] text-white rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {error && (
        <AdminNoticeBanner
          tone="error"
          title="Unable to load inventory"
          message={error}
          onDismiss={() => setError(null)}
          actionLabel="Try again"
          onAction={() => {
            void fetchProducts(true);
            void fetchCategories();
          }}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {quickFilterCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={card.onClick}
            className={`rounded-2xl border px-4 py-4 text-left transition-all ${
              card.active
                ? "border-[#E7A3B0] bg-[#fff5f7] shadow-sm"
                : "border-gray-200 bg-white hover:border-[#E7A3B0]/40 hover:bg-[#fffafb]"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b47c88]">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-[#121212]">
              {card.count}
            </p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <AdminSearchInput
          ref={searchInputRef}
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search products..."
          ariaLabel="Search inventory products"
          className="min-w-[240px]"
          clearLabel="Clear inventory search"
        />

        {/* Filters popover */}
        <div className="relative" ref={filtersRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((p) => !p)}
            className="flex items-center gap-2 h-9 text-xs hover:bg-[#fff5f7] hover:text-[#E7A3B0] hover:border-[#E7A3B0] hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-300"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {[visibilityFilter !== "all", availabilityFilter !== "all", categoryFilter !== "all"].filter(Boolean).length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E7A3B0] text-[9px] font-semibold text-white">
                {[visibilityFilter !== "all", availabilityFilter !== "all", categoryFilter !== "all"].filter(Boolean).length}
              </span>
            )}
          </Button>
          {showFilters && (
            <div className="absolute left-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-72 space-y-4">
              {/* Visibility */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Visibility</p>
                <div className="flex gap-1.5 flex-wrap">
                  {[["all", "All"], ["published", "Published"], ["unpublished", "Unpublished"]].map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setVisibilityFilter(v)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                        visibilityFilter === v
                          ? "bg-[#E7A3B0] text-white border-[#E7A3B0] shadow-sm"
                          : "border-gray-200 text-gray-600 hover:border-[#E7A3B0] hover:bg-[#fff5f7] hover:text-[#E7A3B0] hover:shadow-sm"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {/* Availability */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Availability</p>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    ["all", "All"],
                    ["in-stock", "In Stock"],
                    ["low-stock", "Low Stock"],
                    ["out-of-stock", "Out of Stock"],
                    ["stock-alerts", "Stock Alerts"],
                    ["no-image", "No Image"],
                  ].map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setAvailabilityFilter(v)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                        availabilityFilter === v
                          ? "bg-[#E7A3B0] text-white border-[#E7A3B0] shadow-sm"
                          : "border-gray-200 text-gray-600 hover:border-[#E7A3B0] hover:bg-[#fff5f7] hover:text-[#E7A3B0] hover:shadow-sm"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {/* Clear all */}
              {(visibilityFilter !== "all" || availabilityFilter !== "all" || categoryFilter !== "all") && (
                <button
                  onClick={() => {
                    setVisibilityFilter("all");
                    setAvailabilityFilter("all");
                    setCategoryFilter("all");
                  }}
                  className="w-full text-xs text-gray-500 py-1.5 hover:bg-[#fff5f7] hover:border-[#E7A3B0] hover:text-[#E7A3B0] rounded-md transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer border border-gray-200"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Category filter — inline beside the Filters button */}
        <CategoryCascadingFilter
          categories={categories}
          value={categoryFilter}
          onValueChange={setCategoryFilter}
        />

        <Select value={dateSort} onValueChange={(value) => setDateSort(value as "newest" | "oldest")}>
          <SelectTrigger className="w-[140px] h-9 text-xs text-gray-900 bg-white">
            <SelectValue placeholder="Sort Date" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 text-black">
            <SelectItem value="newest" className="cursor-pointer focus:bg-[#fff5f7] focus:text-[#E7A3B0]">Newest</SelectItem>
            <SelectItem value="oldest" className="cursor-pointer focus:bg-[#fff5f7] focus:text-[#E7A3B0]">Oldest</SelectItem>
            <SelectItem value="az" className="cursor-pointer focus:bg-[#fff5f7] focus:text-[#E7A3B0]">Name: A to Z</SelectItem>
            <SelectItem value="za" className="cursor-pointer focus:bg-[#fff5f7] focus:text-[#E7A3B0]">Name: Z to A</SelectItem>
          </SelectContent>
        </Select>

      </div>

      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E7A3B0]/15 bg-[#fffcfd] px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b47c88]">
            Active
          </span>
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-2 rounded-full border border-[#E7A3B0]/25 bg-white px-3 py-1.5 text-xs font-medium text-[#6f5058] transition-colors hover:bg-[#fff5f7]"
            >
              <span className="max-w-[280px] truncate">{chip.label}</span>
              <X className="h-3.5 w-3.5 text-[#b47c88]" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b47c88] transition-colors hover:text-[#8f5f69]"
          >
            Clear all
          </button>
        </div>
      )}

      {actionNotice && (
        <AdminNoticeBanner
          tone={actionNotice.tone === "success" ? "success" : "warning"}
          title={actionNotice.tone === "success" ? "Inventory updated" : "Check this update"}
          message={actionNotice.message}
          onDismiss={() => setActionNotice(null)}
        />
      )}

<div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div className="text-sm text-gray-600">
          Showing {filteredProducts.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} items
        </div>
        <div className="flex items-center gap-2">
          {selectedProducts.size > 0 && (
            <span className="rounded-md bg-[#fff0f3] px-2.5 py-1 text-xs font-semibold text-[#b96d7d]">
              {selectedProducts.size} selected
            </span>
          )}
          {selectedProducts.size > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="h-8 border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-700"
            >
              Clear selection
            </Button>
          )}
          {selectedProducts.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-white h-9 text-xs font-medium"
                  disabled={actionLoading}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Delete ({selectedProducts.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-gray-900">
                    {selectedProducts.size === 1 ? "Delete Product" : "Delete Multiple Products"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete <span className="font-semibold">{selectedProducts.size}</span> {selectedProducts.size === 1 ? "product" : "products"}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900">Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white cursor-pointer" onClick={handleBulkDelete}>
                    {selectedProducts.size === 1 ? "Delete" : "Delete All"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <Skeleton className="h-10 w-full rounded-md" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <InventoryTable
          currentProducts={currentProducts}
          selectedProducts={selectedProducts}
          toggleSelectAll={() => toggleSelectAll(selectedProducts.size !== currentProducts.length || currentProducts.length === 0)}
          toggleSelectProduct={toggleSelectProduct}
          getCategoryName={getCategoryName}
          handleViewProduct={handleViewProduct}
          handleEditProduct={handleEditProduct}
          handleDeleteProduct={handleDeleteProduct}
          onRowActivate={handleEditProduct}
          actionLoading={actionLoading}
          emptyTitle={inventoryEmptyTitle}
          emptyDescription={inventoryEmptyDescription}
        />
      )}

      <div className="flex flex-col gap-4 mt-2">
        <CustomPagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      {viewProduct && (
        <ViewProductDialog
          product={viewProduct}
          images={viewImages}
          selectedImage={selectedViewImage}
          onSelectedImageChange={setSelectedViewImage}
          onClose={() => {
            setViewProduct(null);
            setViewImages([]);
            setSelectedViewImage(null);
          }}
          getCategoryName={getCategoryName}
        />
      )}

      <AddProduct
        isOpen={showAddModal}
        onClose={closeModal}
        categories={categories}
        productToEdit={editingProduct}
        onProductSaved={async () => {
          closeModal();
          const refreshed = await fetchProducts(false);
          if (!refreshed) {
            setError('Saved successfully, but refresh was delayed. Data will update shortly.');
            setActionNotice({ tone: "warning", message: "Product saved, but the inventory list could not refresh immediately." });
          } else {
            setActionNotice({
              tone: "success",
              message: editingProduct ? "Product updated successfully." : "Product added successfully.",
            });
          }
        }}
      />

      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImportComplete={async () => {
          const refreshed = await fetchProducts(false);
          setActionNotice({
            tone: refreshed ? "success" : "warning",
            message: refreshed
              ? "Bulk import finished. Review the new products in the inventory list below."
              : "Bulk import finished, but the inventory list did not refresh immediately.",
          });
        }}
      />
    </div>
  );
}
