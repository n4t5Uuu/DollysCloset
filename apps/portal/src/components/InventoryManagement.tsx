"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus, Archive, RotateCcw, X, Upload, SlidersHorizontal, RefreshCw, BadgePercent, Trash2, CalendarRange, ArrowUpDown, Info } from "lucide-react";
import { ExportPurgeDialog } from "@/components/dialogs/ExportPurgeDialog";
import type { ExportPurgeFormat } from "@/components/dialogs/ExportPurgeDialog";
import { 
  createClient,
  InventoryProduct as Product,
  InventoryProductImage as ProductImage,
  InventoryCategory as Category,
  ProductDiscount,
  Season,
  safeFetchJson,
} from "@dollys-closet/core";
import {
  Button,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  CustomPagination,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@dollys-closet/ui";
import AdminSearchInput from "@/components/general-components/AdminSearchInput";
import { AdminNoticeBanner } from "@/components/ui/admin-notice-banner";
import CategoryCascadingFilter from "@/components/CategoryCascadingFilter";
import AddProduct from "@/components/dialogs/AddProduct";
import BulkImportModal from "@/components/dialogs/BulkImportModal";
import { InventoryTable } from "@/components/tables/InventoryTable";
import ViewProductDialog from "@/components/dialogs/ViewProductDialog";
import { SeasonCalendar, getSeasonColor } from "@/components/seasons/SeasonCalendar";
import { toast } from "sonner";

interface InventoryManagementProps {
  initialAvailabilityFilter?: string;
  userRole?: string;
}

type InventoryScope = "active" | "archived";
type InventorySortOption =
  | "newest"
  | "oldest"
  | "updated"
  | "least-updated"
  | "az"
  | "za"
  | "price-asc"
  | "price-desc";

type InventoryDiscount = ProductDiscount & {
  productCount?: number;
};

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

const sortLabels: Record<InventorySortOption, string> = {
  "newest": "Newest first",
  "oldest": "Oldest first",
  "updated": "Last updated (newest)",
  "least-updated": "Last updated (oldest)",
  "az": "Name: A\u2013Z",
  "za": "Name: Z\u2013A",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
};

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const CLEAR_SEASON_OPTION = "__clear_season__";

function maxDayInMonth(month: number) {
  const date = new Date(2001, month, 0);
  return date.getDate();
}

export default function InventoryManagement({ initialAvailabilityFilter, userRole }: InventoryManagementProps) {
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
  const [inventoryScope, setInventoryScope] = useState<InventoryScope>("active");

  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState(initialAvailabilityFilter ?? "all");
  const [saleFilter, setSaleFilter] = useState<"all" | "on-sale">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOption, setSortOption] = useState<InventorySortOption>("newest");
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
  const [discounts, setDiscounts] = useState<InventoryDiscount[]>([]);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [showBatchSeasonModal, setShowBatchSeasonModal] = useState(false);
  const [batchSeasonSelection, setBatchSeasonSelection] = useState("");
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [seasonForm, setSeasonForm] = useState({
    name: "",
    startMonth: 1,
    startDay: 1,
    endMonth: 12,
    endDay: 31,
    isActive: true,
  });
  const [discountForm, setDiscountForm] = useState({
    discount_name: "",
    discount_type: "percent" as "percent" | "flat" | "fixed_price",
    discount_value: "",
    ends_at: "",
  });

  const [productPurgeOpen, setProductPurgeOpen] = useState(false);

  const itemsPerPage = 10;
  const lowStockThreshold = 10;

  const fetchProducts = useCallback(async (showGlobalLoader = false, scope = inventoryScope) => {
    try {
      if (showGlobalLoader) {
        setLoading(true);
      }
      setError(null);

      const { data, error, friendlyMessage } = await safeFetchJson<{ data: Product[] }>(`/api/admin/products?scope=${scope}`);
      
      if (error) {
        throw new Error(friendlyMessage || 'Failed to fetch products');
      }

      setProducts(data?.data || []);
      return true;
    } catch (err: unknown) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      return false;
    } finally {
      if (showGlobalLoader) setLoading(false);
    }
  }, [inventoryScope]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error, friendlyMessage } = await safeFetchJson<{ data: Category[] }>('/api/admin/categories');
      if (error) {
        throw new Error(friendlyMessage || 'Failed to fetch categories');
      }
      setCategories(data?.data || []);
    } catch (err: unknown) {
      console.error('Error fetching categories:', err);
      setCategories([]);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    }
  }, []);

  const fetchDiscounts = useCallback(async () => {
    try {
      setDiscountLoading(true);
      const { data, error } = await safeFetchJson<{ data: InventoryDiscount[] }>('/api/admin/discounts');
      if (error) throw error;
      setDiscounts(data?.data || []);
    } catch (err: unknown) {
      console.error('Error fetching discounts:', err);
      setDiscounts([]);
    } finally {
      setDiscountLoading(false);
    }
  }, []);

  const fetchSeasons = useCallback(async () => {
    try {
      setSeasonsLoading(true);
      const { data, error } = await safeFetchJson<{ data: Season[] }>('/api/admin/seasons');
      if (error) throw error;
      setSeasons(data?.data || []);
    } catch (err: unknown) {
      console.error('Error fetching seasons:', err);
      setSeasons([]);
    } finally {
      setSeasonsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializeInventory = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchProducts(false), fetchCategories(), fetchDiscounts(), fetchSeasons()]);
      } finally {
        setLoading(false);
      }
    };
    initializeInventory();
  }, [fetchProducts, fetchCategories, fetchDiscounts, fetchSeasons]);

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
  }, [searchQuery, visibilityFilter, availabilityFilter, saleFilter, categoryFilter, sortOption, router, pathname]);

  useEffect(() => {
    setSelectedProducts(new Set());
    setViewProduct(null);
    setViewImages([]);
    setSelectedViewImage(null);
    setEditingProduct(null);
    setShowAddModal(false);
    setShowBulkImport(false);
    setShowDiscountModal(false);
    setShowSeasonModal(false);
    setShowBatchSeasonModal(false);
    setBatchSeasonSelection("");
    setProducts([]);
  }, [inventoryScope]);

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
        const matchesSale = saleFilter === "all" || Boolean(product.isOnSale);
        const matchesVisibility = visibilityFilter === "all" ||
          (visibilityFilter === "published" && product.show_in_catalog) ||
          (visibilityFilter === "unpublished" && !product.show_in_catalog);
        return matchesSearch && matchesCategory && matchesAvailability && matchesSale && matchesVisibility;
      })
      .sort((firstProduct, secondProduct) => {
        const firstCreatedValue = new Date(firstProduct.created_at || 0).getTime();
        const secondCreatedValue = new Date(secondProduct.created_at || 0).getTime();
        const firstUpdatedValue = new Date((firstProduct.updated_at || firstProduct.time_updated || firstProduct.created_at || 0) as string).getTime();
        const secondUpdatedValue = new Date((secondProduct.updated_at || secondProduct.time_updated || secondProduct.created_at || 0) as string).getTime();
        const firstVisiblePrice = firstProduct.discountedPrice ?? firstProduct.product_price;
        const secondVisiblePrice = secondProduct.discountedPrice ?? secondProduct.product_price;
        
        if (sortOption === "oldest") return firstCreatedValue - secondCreatedValue;
        if (sortOption === "newest") return secondCreatedValue - firstCreatedValue;
        if (sortOption === "updated") return secondUpdatedValue - firstUpdatedValue;
        if (sortOption === "least-updated") return firstUpdatedValue - secondUpdatedValue;
        if (sortOption === "az") return firstProduct.product_name.localeCompare(secondProduct.product_name);
        if (sortOption === "za") return secondProduct.product_name.localeCompare(firstProduct.product_name);
        if (sortOption === "price-asc") return firstVisiblePrice - secondVisiblePrice;
        if (sortOption === "price-desc") return secondVisiblePrice - firstVisiblePrice;
        return 0;
      });
  }, [products, searchQuery, filteredCategoryIds, availabilityFilter, saleFilter, visibilityFilter, sortOption, lowStockThreshold, buildCategoryPath]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);
  const allCurrentProductsSelected = currentProducts.length > 0 && currentProducts.every((product) => selectedProducts.has(product.product_id));
  const someCurrentProductsSelected = !allCurrentProductsSelected && currentProducts.some((product) => selectedProducts.has(product.product_id));

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
      saleFilter !== "all"
        ? { key: "sale", label: "Sale: On Sale", onRemove: () => setSaleFilter("all") }
        : null,
      categoryFilter !== "all" && selectedCategoryLabel
        ? { key: "category", label: `Category: ${selectedCategoryLabel}`, onRemove: () => setCategoryFilter("all") }
        : null,
      sortOption !== "newest"
        ? { key: "sort", label: `Sort: ${sortLabels[sortOption] ?? sortOption}`, onRemove: () => setSortOption("newest") }
        : null,
    ].filter((chip): chip is { key: string; label: string; onRemove: () => void } => Boolean(chip));
  }, [availabilityFilter, categoryFilter, sortOption, saleFilter, searchQuery, selectedCategoryLabel, visibilityFilter]);

  const quickFilterCards = useMemo(() => {
    const totalCount = products.length;
    const publishedCount = products.filter((product) => product.show_in_catalog).length;
    const hiddenCount = totalCount - publishedCount;
    const stockAlertCount = products.filter((product) => product.product_stock < lowStockThreshold).length;
    const noImageCount = products.filter((product) => !product.image_id).length;
    const saleCount = products.filter((product) => Boolean(product.isOnSale)).length;

    return [
      {
        key: "all",
        label: "All Products",
        count: totalCount,
        active: availabilityFilter === "all" && visibilityFilter === "all" && saleFilter !== "on-sale",
        onClick: () => {
          setAvailabilityFilter("all");
          setVisibilityFilter("all");
          setSaleFilter("all");
        },
      },
      {
        key: "published",
        label: "Published",
        count: publishedCount,
        active: visibilityFilter === "published" && saleFilter !== "on-sale",
        onClick: () => {
          setVisibilityFilter("published");
          setAvailabilityFilter("all");
          setSaleFilter("all");
        },
      },
      {
        key: "hidden",
        label: "Hidden",
        count: hiddenCount,
        active: visibilityFilter === "unpublished" && saleFilter !== "on-sale",
        onClick: () => {
          setVisibilityFilter("unpublished");
          setAvailabilityFilter("all");
          setSaleFilter("all");
        },
      },
      {
        key: "alerts",
        label: "Stock Alerts",
        count: stockAlertCount,
        active: availabilityFilter === "stock-alerts" && saleFilter !== "on-sale",
        onClick: () => {
          setAvailabilityFilter("stock-alerts");
          setVisibilityFilter("all");
          setSaleFilter("all");
        },
      },
      {
        key: "no-image",
        label: "No Image",
        count: noImageCount,
        active: availabilityFilter === "no-image" && saleFilter !== "on-sale",
        onClick: () => {
          setAvailabilityFilter("no-image");
          setVisibilityFilter("all");
          setSaleFilter("all");
        },
      },
      {
        key: "sale",
        label: "On Sale",
        count: saleCount,
        active: saleFilter === "on-sale",
        onClick: () => {
          setSaleFilter("on-sale");
          setAvailabilityFilter("all");
          setVisibilityFilter("all");
        },
      },
    ];
  }, [availabilityFilter, lowStockThreshold, products, saleFilter, visibilityFilter]);

  const outOfStockActiveCount = useMemo(() => {
    if (inventoryScope !== "active") return 0;
    return products.filter((p) => p.product_stock === 0).length;
  }, [products, inventoryScope]);

  const inventoryEmptyTitle = products.length === 0
    ? inventoryScope === "active"
      ? "No products yet"
      : "No archived products"
    : "No products matched your filters";
  const inventoryEmptyDescription = products.length === 0
    ? inventoryScope === "active"
      ? "Add a product or import your inventory to start managing products here."
      : "Archived products will appear here and can be restored when needed."
    : "Try clearing one or more filters, or broaden your search to see more products.";

  const clearAllFilters = () => {
    setSearchQuery("");
    setVisibilityFilter("all");
    setAvailabilityFilter("all");
    setSaleFilter("all");
    setCategoryFilter("all");
    setSortOption("newest");
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
    setSelectedProducts((previousSelected) => {
      const nextSelected = new Set(previousSelected);

      if (checked) {
        currentProducts.forEach((product) => nextSelected.add(product.product_id));
      } else {
        currentProducts.forEach((product) => nextSelected.delete(product.product_id));
      }

      return nextSelected;
    });
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
      const { data, error } = await safeFetchJson<{ data: ProductImage[] }>(`/api/admin/images?product_id=${product.product_id}`);
      
      if (error) throw error;
      
      const images: ProductImage[] = data?.data || [];
      setViewImages(images);
      const primaryImage = images.find((img) => img.is_primary) || images[0];
      setSelectedViewImage(primaryImage?.image_url || null);
    } catch (err) {
      console.error("Error fetching view images:", err);
      toast.error("Failed to load product images.");
      setViewImages([]);
      setSelectedViewImage(null);
    }
  };

  const handleArchiveProduct = async (productId: string) => {
    setActionLoading(true);
    setError(null);
    setActionNotice(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const { error, friendlyMessage } = await safeFetchJson('/api/admin/products/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ product_id: productId })
      });

      if (error) throw new Error(friendlyMessage || 'Failed to archive product');

      setError(null);
      await fetchProducts();
      toast.success("Product archived successfully.");
      setActionNotice({ tone: "success", message: "Product archived. It has been moved to the archive view." });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive product';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreProduct = async (productId: string) => {
    setActionLoading(true);
    setError(null);
    setActionNotice(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error, friendlyMessage } = await safeFetchJson('/api/admin/products/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ product_id: productId })
      });

      if (error) throw new Error(friendlyMessage || 'Failed to restore product');

      setError(null);
      await fetchProducts();
      toast.success("Product restored successfully.");
      setActionNotice({ tone: "success", message: "Product restored and returned to the active inventory list." });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore product';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkScopeAction = async () => {
    if (selectedProducts.size === 0) {
      setError("No products selected");
      return;
    }
    setActionLoading(true);
    setError(null);
    setActionNotice(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const endpoint = inventoryScope === "active" ? '/api/admin/products/archive' : '/api/admin/products/restore';
      const { error, friendlyMessage } = await safeFetchJson(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ product_ids: Array.from(selectedProducts) })
      });

      if (error) throw new Error(friendlyMessage || (inventoryScope === "active" ? 'Failed to archive products' : 'Failed to restore products'));

      setSelectedProducts(new Set());
      setError(null);
      await fetchProducts();
      if (inventoryScope === "active") {
        toast.success("Selected products archived successfully.");
        setActionNotice({ tone: "success", message: "Selected products were archived and moved to the archive view." });
      } else {
        toast.success("Selected products restored successfully.");
        setActionNotice({ tone: "success", message: "Selected products were restored to the active inventory list." });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : (inventoryScope === "active" ? 'Failed to archive products' : 'Failed to restore products');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProductsPreview = async (cutoffIso: string) => {
    const params = new URLSearchParams({ dryRun: "1", before: cutoffIso });
    const response = await fetch(`/api/admin/products/reset?${params}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to preview purge");
    return { count: typeof data.count === "number" ? data.count : 0 };
  };

  const handleProductsDownload = async (cutoffIso: string, _format: ExportPurgeFormat) => {
    const params = new URLSearchParams({ before: cutoffIso });
    const response = await fetch(`/api/admin/products/export?${params}`, { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to export products");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `products-archive-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleProductsPurge = async (cutoffIso: string) => {
    const response = await fetch("/api/admin/products/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ before: cutoffIso, confirm: "DELETE", exportConfirmed: true }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to purge products");
    return { purged: typeof data.purged === "number" ? data.purged : 0 };
  };

  const handleProductsPurgeSuccess = (purged: number, label: string) => {
    setActionNotice({
      tone: "success",
      message: `Permanently deleted ${purged} archived product${purged === 1 ? "" : "s"} ${label}.`,
    });
    void fetchProducts(true);
  };

  const formatDiscountSummary = useCallback((discount: ProductDiscount) => {
    if (discount.discount_type === "percent") {
      return `${discount.discount_value}% off`;
    }

    if (discount.discount_type === "fixed_price") {
      return `Final price ₱${Number(discount.discount_value).toFixed(2)}`;
    }

    return `₱${Number(discount.discount_value).toFixed(2)} off`;
  }, []);

  const handleCreateDiscount = async () => {
    const discountName = discountForm.discount_name.trim();
    const discountValue = Number.parseFloat(discountForm.discount_value);

    if (!discountName) {
      toast.error('Enter a discount name.');
      return;
    }

    if (discountName.length > 30) {
      toast.error('Discount name must be 30 characters or less.');
      return;
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      toast.error('Enter a valid discount value greater than 0.');
      return;
    }

    if (discountForm.discount_type === 'percent' && (discountValue < 1 || discountValue > 100)) {
      toast.error('Percentage discount must be between 1 and 100.');
      return;
    }

    setActionLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          discount_name: discountName,
          discount_type: discountForm.discount_type,
          discount_value: discountValue,
          ends_at: discountForm.ends_at || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create discount');

      setDiscountForm({
        discount_name: "",
        discount_type: "percent",
        discount_value: "",
        ends_at: "",
      });
      await fetchDiscounts();
      setShowDiscountModal(false);
      toast.success('Discount code created successfully.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create discount');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyDiscount = async (discountId: string) => {
    if (selectedProducts.size === 0) {
      toast.error('Select at least one product first.');
      return;
    }

    setActionLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/discounts/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          discount_id: discountId,
          product_ids: Array.from(selectedProducts),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to apply discount');

      await Promise.all([fetchProducts(false), fetchDiscounts()]);
      setSelectedProducts(new Set());
      toast.success('Discount applied to selected products.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply discount');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplySeason = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Select at least one product first.');
      return;
    }

    if (!batchSeasonSelection) {
      toast.error('Choose a season option first.');
      return;
    }

    setActionLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/seasons/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          season_id: batchSeasonSelection === CLEAR_SEASON_OPTION ? null : batchSeasonSelection,
          product_ids: Array.from(selectedProducts),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to apply season');

      await fetchProducts(false);
      setSelectedProducts(new Set());
      setBatchSeasonSelection("");
      setShowBatchSeasonModal(false);
      toast.success(result.message || 'Season updated for selected products.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply season');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDiscount = async (discountId: string, discountName: string) => {
    const shouldDelete = window.confirm(`Delete discount code "${discountName}"? This will remove it from all products.`);
    if (!shouldDelete) {
      return;
    }

    setActionLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/discounts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ discount_id: discountId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete discount');

      await Promise.all([fetchProducts(false), fetchDiscounts()]);
      toast.success('Discount code deleted successfully.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete discount');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDiscount = async (discountId: string, isActive: boolean) => {
    setActionLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/discounts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ discount_id: discountId, is_active: isActive }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update discount');

      await fetchDiscounts();
      toast.success(isActive ? 'Discount activated.' : 'Discount deactivated.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update discount');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeasonCalendarChange = useCallback((sm: number, sd: number, em: number, ed: number) => {
    setSeasonForm((prev) => ({ ...prev, startMonth: sm, startDay: sd, endMonth: em, endDay: ed }));
  }, []);

  const resetSeasonForm = useCallback(() => {
    setSeasonForm({
      name: "",
      startMonth: 1,
      startDay: 1,
      endMonth: 12,
      endDay: 31,
      isActive: true,
    });
    setEditingSeasonId(null);
  }, []);

  const handleEditSeason = (season: Season) => {
    setEditingSeasonId(season.id);
    setSeasonForm({
      name: season.name,
      startMonth: season.startMonth,
      startDay: season.startDay,
      endMonth: season.endMonth,
      endDay: season.endDay,
      isActive: season.isActive !== false,
    });
  };

  const handleSaveSeason = async () => {
    const trimmedName = seasonForm.name.trim();
    if (!trimmedName) {
      toast.error('Enter a season name.');
      return;
    }

    if (trimmedName.length > 30) {
      toast.error('Season name must be 30 characters or less.');
      return;
    }

    const startMax = maxDayInMonth(seasonForm.startMonth);
    const endMax = maxDayInMonth(seasonForm.endMonth);
    if (seasonForm.startDay < 1 || seasonForm.startDay > startMax) {
      toast.error('Start day is invalid for the selected month.');
      return;
    }
    if (seasonForm.endDay < 1 || seasonForm.endDay > endMax) {
      toast.error('End day is invalid for the selected month.');
      return;
    }

    setActionLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const method = editingSeasonId ? 'PUT' : 'POST';
      const response = await fetch('/api/admin/seasons', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...(editingSeasonId ? { season_id: editingSeasonId } : {}),
          season_name: trimmedName,
          start_month: seasonForm.startMonth,
          start_day: seasonForm.startDay,
          end_month: seasonForm.endMonth,
          end_day: seasonForm.endDay,
          is_active: seasonForm.isActive,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save season');

      await fetchSeasons();
      resetSeasonForm();
      toast.success(editingSeasonId ? 'Season updated successfully.' : 'Season created successfully.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save season');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSeason = async (season: Season) => {
    const shouldDelete = window.confirm(`Delete season "${season.name}"? Linked products will be set to no season.`);
    if (!shouldDelete) return;

    setActionLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/seasons', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ season_id: season.id }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete season');

      await fetchSeasons();
      if (editingSeasonId === season.id) {
        resetSeasonForm();
      }
      toast.success('Season deleted successfully.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete season');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="space-y-3">
        {/* Top row: Title + scope toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center sm:block">
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-2xl font-bold">Manage Inventory</h1>
              </div>
              <p className="text-gray-500 text-sm sm:hidden">
                {inventoryScope === "active"
                  ? "Create, update, archive, and organize products and categories."
                  : "Review archived products and restore them when they should return to the active catalog."}
              </p>
              <p className="hidden sm:block text-gray-500 text-sm">
                {inventoryScope === "active"
                  ? "Create, update, archive, and organize products and categories."
                  : "Review archived products and restore them when they should return to the active catalog."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchProducts(true)}
              disabled={loading || actionLoading}
              title="Refresh inventory"
              className="sm:hidden ml-auto p-1.5 text-[#b96d7d] hover:text-[#E7A3B0] disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${(loading || actionLoading) ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="flex items-center rounded-lg border border-[#E7A3B0]/20 bg-[#fff9fb] p-1 sm:shrink-0">
            <button
              type="button"
              onClick={() => { setProducts([]); setInventoryScope("active"); }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                inventoryScope === "active"
                  ? "bg-[#E7A3B0] text-white"
                  : "text-[#8f5f69] hover:bg-white"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => { setProducts([]); setInventoryScope("archived"); }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                inventoryScope === "archived"
                  ? "bg-[#E7A3B0] text-white"
                  : "text-[#8f5f69] hover:bg-white"
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        {/* Bottom row: Refresh left, action buttons right */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchProducts(true)}
            className="hidden sm:flex h-9 border-[#E7A3B0]/30 text-[#b96d7d] hover:bg-[#fff5f7] hover:text-[#b96d7d]"
            disabled={loading || actionLoading}
            title="Refresh inventory"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${(loading || actionLoading) ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {inventoryScope === "archived" && userRole === "admin" && (
            <button
              onClick={() => setProductPurgeOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md hover:bg-red-50 hover:border-red-400 hover:scale-105 cursor-pointer"
            >
              <Trash2 size={16} />
              Export &amp; Purge Archived
            </button>
          )}
          {inventoryScope === "active" && (
            <div className="grid grid-cols-4 gap-2 w-full">
              <button
                onClick={() => {
                  resetSeasonForm();
                  setShowSeasonModal(true);
                }}
                className="flex items-center justify-center gap-1.5 px-2 py-3 h-11 w-full bg-white border border-[#E7A3B0]/30 text-[#b96d7d] rounded-lg text-[11px] sm:text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md hover:border-[#E7A3B0] hover:bg-[#fff5f7] hover:scale-105 cursor-pointer"
              >
                <CalendarRange size={14} className="shrink-0" />
                <span className="whitespace-nowrap">Seasons</span>
              </button>
              <button
                onClick={() => setShowDiscountModal(true)}
                className="flex items-center justify-center gap-1.5 px-2 py-3 h-11 w-full bg-white border border-[#E7A3B0]/30 text-[#b96d7d] rounded-lg text-[11px] sm:text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md hover:border-[#E7A3B0] hover:bg-[#fff5f7] hover:scale-105 cursor-pointer"
              >
                <BadgePercent size={14} className="shrink-0" />
                <span className="whitespace-nowrap">Discount</span>
              </button>
              <button
                onClick={() => setShowBulkImport(true)}
                className="flex items-center justify-center gap-1.5 px-2 py-3 h-11 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[11px] sm:text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 cursor-pointer"
              >
                <Upload size={14} className="shrink-0" />
                <span className="whitespace-nowrap">Import</span>
              </button>
              <button
                onClick={openAddModal}
                className="flex items-center justify-center gap-1.5 px-2 py-3 h-11 w-full bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] hover:from-[#d891a0] hover:to-[#E7A3B0] text-white rounded-lg text-[11px] sm:text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer"
              >
                <Plus size={16} />
                <span className="whitespace-nowrap">Add Product</span>
              </button>
            </div>
          )}
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

      {outOfStockActiveCount > 0 && (
        <AdminNoticeBanner
          tone="info"
          title="Out-of-stock products detected"
          message={`${outOfStockActiveCount} product${outOfStockActiveCount === 1 ? " is" : "s are"} currently out of stock. Consider archiving ${outOfStockActiveCount === 1 ? "it" : "them"} to keep your active inventory clean.`}
          onDismiss={() => {}}
          actionLabel="View out-of-stock"
          onAction={() => {
            setAvailabilityFilter("out-of-stock");
            setVisibilityFilter("all");
          }}
        />
      )}

      <div className="hidden sm:grid gap-2 grid-cols-3 xl:grid-cols-6">
        {quickFilterCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={card.onClick}
            className={`rounded-xl border px-3 py-3 text-left transition-all ${
              card.active
                ? "border-[#E7A3B0] bg-[#fff5f7] shadow-sm"
                : "border-gray-200 bg-white hover:border-[#E7A3B0]/40 hover:bg-[#fffafb]"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b47c88] truncate">
              {card.label}
            </p>
            <p className="mt-1 text-xl font-bold text-[#121212]">
              {card.count}
            </p>
          </button>
        ))}
      </div>

      {/* Active filter chips — compact strip, mobile only, above search */}
      {activeFilterChips.length > 0 && (
        <div className="sm:hidden flex flex-wrap items-center gap-1">
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1 rounded-full border border-[#E7A3B0]/30 bg-[#fffcfd] px-2 py-0.5 text-[10px] font-medium text-[#6f5058]"
            >
              <span className="max-w-[160px] truncate">{chip.label}</span>
              <X className="h-2.5 w-2.5 text-[#b47c88]" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-[10px] font-semibold text-[#b47c88] px-1"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 sm:flex-wrap sm:gap-3">
        <AdminSearchInput
          ref={searchInputRef}
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="search products or product id"
          ariaLabel="Search inventory products"
          className="flex-1 min-w-0 sm:min-w-[240px] sm:flex-none"
          inputClassName="h-8 sm:h-9"
          clearLabel="Clear inventory search"
        />
        {/* Filters popover */}
        <div className="relative shrink-0" ref={filtersRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((p) => !p)}
            className="flex items-center gap-1.5 h-8 sm:h-9 sm:gap-2 text-xs hover:bg-[#fff5f7] hover:text-[#E7A3B0] hover:border-[#E7A3B0] hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-300"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {[visibilityFilter !== "all", availabilityFilter !== "all", categoryFilter !== "all"].filter(Boolean).length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E7A3B0] text-[9px] font-semibold text-white">
                {[visibilityFilter !== "all", availabilityFilter !== "all", categoryFilter !== "all"].filter(Boolean).length}
              </span>
            )}
          </Button>
          {showFilters && (
            <div className="absolute right-0 sm:left-0 sm:right-auto z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-[min(288px,calc(100vw-1rem))] max-h-[80vh] overflow-y-auto space-y-4">
              {/* Category - mobile only; desktop keeps it inline */}
              <div className="sm:hidden">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</p>
                <CategoryCascadingFilter
                  categories={categories}
                  value={categoryFilter}
                  onValueChange={(value: string) => {
                    setCategoryFilter(value);
                    setShowFilters(false);
                  }}
                  triggerClassName="w-full"
                />
              </div>
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
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Discounts</p>
                <div className="flex gap-1.5 flex-wrap">
                  {[["all", "All"], ["on-sale", "On Sale"]].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setSaleFilter(value as "all" | "on-sale")}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                        saleFilter === value
                          ? "bg-[#E7A3B0] text-white border-[#E7A3B0] shadow-sm"
                          : "border-gray-200 text-gray-600 hover:border-[#E7A3B0] hover:bg-[#fff5f7] hover:text-[#E7A3B0] hover:shadow-sm"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Clear all */}
              {(visibilityFilter !== "all" || availabilityFilter !== "all" || saleFilter !== "all" || categoryFilter !== "all") && (
                <button
                  onClick={() => {
                    setVisibilityFilter("all");
                    setAvailabilityFilter("all");
                    setSaleFilter("all");
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

        {/* Category - desktop only; on mobile it lives inside the Filters panel */}
        <div className="hidden sm:block shrink-0">
          <CategoryCascadingFilter
            categories={categories}
            value={categoryFilter}
            onValueChange={(value: string) => setCategoryFilter(value)}
          />
        </div>

        {/* Sort - mobile: icon button with native select overlay */}
        <div className="relative shrink-0 sm:hidden">
          <button
            type="button"
            className={`h-8 w-8 flex items-center justify-center rounded-md border bg-white transition-colors ${sortOption !== "newest" ? "border-[#E7A3B0] text-[#b96d7d]" : "border-gray-200 text-gray-500"}`}
            title="Sort"
            tabIndex={-1}
          >
            <ArrowUpDown className="h-3.5 w-3.5 pointer-events-none" />
          </button>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as InventorySortOption)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label="Sort inventory"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="updated">Last updated (newest)</option>
            <option value="least-updated">Last updated (oldest)</option>
            <option value="az">Name: A–Z</option>
            <option value="za">Name: Z–A</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        {/* Sort - desktop: full labeled select */}
        <div className="hidden sm:block shrink-0">
          <Select value={sortOption} onValueChange={(value) => setSortOption(value as InventorySortOption)}>
            <SelectTrigger className="w-[190px] h-9 text-xs text-gray-900 bg-white">
              <SelectValue placeholder="Sort inventory" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-black">
              <SelectItem value="newest" className="cursor-pointer focus:bg-[#fff5f7] focus:text-[#E7A3B0]">Newest first</SelectItem>
              <SelectItem value="oldest" className="cursor-pointer focus:bg-[#fff5f7] focus:text-[#E7A3B0]">Oldest first</SelectItem>
              <SelectItem value="updated" className="cursor-pointer focus:bg-[#fff5f7] focus:text-[#E7A3B0]">Last updated (newest)</SelectItem>
              <SelectItem value="least-updated" className="cursor-pointer focus:bg-[#fff5f7] focus:text-[#E7A3B0]">Last updated (oldest)</SelectItem>
              <SelectItem value="az" className="cursor-pointer focus:bg-[#fff5f7] focus:text-[#E7A3B0]">Name: A–Z</SelectItem>
              <SelectItem value="za" className="cursor-pointer focus:bg-[#fff5f7] focus:text-[#E7A3B0]">Name: Z–A</SelectItem>
              <SelectItem value="price-asc" className="cursor-pointer focus:bg-[#fff5f7] focus:text-[#E7A3B0]">Price: Low to High</SelectItem>
              <SelectItem value="price-desc" className="cursor-pointer focus:bg-[#fff5f7] focus:text-[#E7A3B0]">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeFilterChips.length > 0 && (
        <div className="hidden sm:flex flex-wrap items-center gap-2 rounded-xl border border-[#E7A3B0]/15 bg-[#fffcfd] px-4 py-3">
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

<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 sm:mb-4">
        <div className="hidden sm:block text-sm text-gray-600">
          Showing {filteredProducts.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} items
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedProducts.size > 0 && (
            <span className="hidden sm:inline rounded-md bg-[#fff0f3] px-2.5 py-1 text-xs font-semibold text-[#b96d7d]">
              {selectedProducts.size} selected
            </span>
          )}
          {selectedProducts.size > 0 && inventoryScope === "active" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setBatchSeasonSelection("");
                setShowBatchSeasonModal(true);
              }}
              className="h-8 border-[#E7A3B0]/35 text-[#b96d7d] hover:bg-[#fff5f7] hover:text-[#b96d7d]"
            >
              <CalendarRange className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Batch </span>Set Season
            </Button>
          )}
          {selectedProducts.size > 0 && inventoryScope === "active" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDiscountModal(true)}
              className="h-8 border-[#E7A3B0]/35 text-[#b96d7d] hover:bg-[#fff5f7] hover:text-[#b96d7d]"
            >
              <BadgePercent className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Batch </span>Add Discount
            </Button>
          )}
          {selectedProducts.size > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="h-8 border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-700"
            >
              <span className="hidden sm:inline">Clear selection</span>
              <span className="sm:hidden">Clear</span>
            </Button>
          )}
          {selectedProducts.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className={inventoryScope === "active" ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
                  disabled={actionLoading}
                >
                  {inventoryScope === "active" ? <Archive className="w-4 h-4 mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  {inventoryScope === "active" ? "Archive" : "Restore"} ({selectedProducts.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-gray-900">
                    {inventoryScope === "active"
                      ? selectedProducts.size === 1 ? "Archive Product" : "Archive Multiple Products"
                      : selectedProducts.size === 1 ? "Restore Product" : "Restore Multiple Products"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {inventoryScope === "active"
                      ? <>Archive <span className="font-semibold">{selectedProducts.size}</span> {selectedProducts.size === 1 ? "product" : "products"}? Archived products are hidden from active dashboards and can be restored later.</>
                      : <>Restore <span className="font-semibold">{selectedProducts.size}</span> {selectedProducts.size === 1 ? "product" : "products"} to the active inventory list?</>}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={`${inventoryScope === "active" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"} text-white cursor-pointer`}
                    onClick={handleBulkScopeAction}
                  >
                    {inventoryScope === "active"
                      ? selectedProducts.size === 1 ? "Archive" : "Archive All"
                      : selectedProducts.size === 1 ? "Restore" : "Restore All"}
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
          mode={inventoryScope}
          currentProducts={currentProducts}
          seasons={seasons}
          selectedProducts={selectedProducts}
          totalFilteredCount={filteredProducts.length}
          showingStart={filteredProducts.length > 0 ? startIndex + 1 : 0}
          showingEnd={Math.min(endIndex, filteredProducts.length)}
          allCurrentProductsSelected={allCurrentProductsSelected}
          someCurrentProductsSelected={someCurrentProductsSelected}
          toggleSelectAll={toggleSelectAll}
          toggleSelectProduct={toggleSelectProduct}
          getCategoryName={getCategoryName}
          handleViewProduct={handleViewProduct}
          handleEditProduct={handleEditProduct}
          handleArchiveProduct={handleArchiveProduct}
          handleRestoreProduct={handleRestoreProduct}
          onRowActivate={inventoryScope === "active" ? handleEditProduct : undefined}
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

      {showBatchSeasonModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => {
            setShowBatchSeasonModal(false);
            setBatchSeasonSelection("");
          }}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#E7A3B0]/20 bg-white shadow-[0_24px_80px_rgba(17,24,39,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E7A3B0]/15 bg-[#fffafc] px-6 py-5">
              <div>
                <div className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                  <CalendarRange className="h-5 w-5 text-[#E7A3B0]" />
                  Batch Set Season
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Apply one season to {selectedProducts.size} selected product{selectedProducts.size === 1 ? "" : "s"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBatchSeasonModal(false);
                  setBatchSeasonSelection("");
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-white hover:text-gray-700"
                aria-label="Close batch season modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-[#E7A3B0]/15 bg-[#fffafc] px-4 py-3 text-sm text-[#6f5058]">
                Choose an existing season to assign, or select <span className="font-semibold">Clear season assignment</span> to remove the current season from all selected products.
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Season Option</label>
                <Select
                  value={batchSeasonSelection || "__placeholder__"}
                  onValueChange={(value) => setBatchSeasonSelection(value === "__placeholder__" ? "" : value)}
                >
                  <SelectTrigger className="border-gray-300 bg-white text-gray-900">
                    <SelectValue placeholder="Select a season option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__placeholder__" disabled>Select a season option</SelectItem>
                    <SelectItem value={CLEAR_SEASON_OPTION}>Clear season assignment</SelectItem>
                    {seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id}>
                        {season.name}
                        {season.isActive === false ? " (Inactive)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-gray-500">
                  Season colors in the table will match the Manage Seasons palette.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowBatchSeasonModal(false);
                    setBatchSeasonSelection("");
                  }}
                  className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleApplySeason}
                  disabled={actionLoading || !batchSeasonSelection}
                  className="bg-[#E7A3B0] text-white hover:bg-[#d891a0]"
                >
                  {actionLoading ? "Applying..." : "Apply Season"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDiscountModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setShowDiscountModal(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-[#E7A3B0]/20 bg-white shadow-[0_24px_80px_rgba(17,24,39,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E7A3B0]/15 bg-[#fffafc] px-6 py-5">
              <div>
                <div className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                  <BadgePercent className="h-5 w-5 text-[#E7A3B0]" />
                  Sales Codes
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Create discount codes, set their end date, and apply them to selected products.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDiscountModal(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-white hover:text-gray-700"
                aria-label="Close discount modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid max-h-[calc(90vh-5.5rem)] gap-6 overflow-y-auto p-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-[#E7A3B0]/15 bg-[#fffafc] p-5 shadow-sm lg:sticky lg:top-0 lg:self-start">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Discount Name</label>
                    <Input
                      value={discountForm.discount_name}
                      onChange={(event) => setDiscountForm((prev) => ({ ...prev, discount_name: event.target.value.slice(0, 30) }))}
                      maxLength={30}
                      placeholder="Back to School Sale"
                      className="border-gray-300 bg-white text-gray-900"
                    />
                    <p className="mt-1 text-xs text-gray-400 text-right">{discountForm.discount_name.length}/30</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Discount Type</label>
                      <Select
                        value={discountForm.discount_type}
                        onValueChange={(value) => setDiscountForm((prev) => ({ ...prev, discount_type: value as "percent" | "flat" | "fixed_price" }))}
                      >
                        <SelectTrigger className="border-gray-300 bg-white text-gray-900">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percentage</SelectItem>
                          <SelectItem value="flat">Flat amount</SelectItem>
                          <SelectItem value="fixed_price">Set final price</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        {discountForm.discount_type === "percent"
                          ? "Percent Off"
                          : discountForm.discount_type === "fixed_price"
                            ? "Final Price"
                            : "Flat Amount"}
                      </label>
                      <Input
                        type="number"
                        min="0.01"
                        max={discountForm.discount_type === "percent" ? "100" : undefined}
                        step={discountForm.discount_type === "percent" ? "1" : "0.01"}
                        value={discountForm.discount_value}
                        onChange={(event) => setDiscountForm((prev) => ({ ...prev, discount_value: event.target.value }))}
                        placeholder={discountForm.discount_type === "percent"
                          ? "30"
                          : discountForm.discount_type === "fixed_price"
                            ? "99.00"
                            : "250.00"}
                        className="border-gray-300 bg-white text-gray-900"
                      />
                      {discountForm.discount_type === "fixed_price" && (
                        <p className="mt-1 text-xs text-gray-500">This sets each selected product to the same final price.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Ends At</label>
                    <Input
                      type="datetime-local"
                      value={discountForm.ends_at}
                      onChange={(event) => setDiscountForm((prev) => ({ ...prev, ends_at: event.target.value }))}
                      className="border-gray-300 bg-white text-gray-900"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleCreateDiscount}
                    disabled={actionLoading}
                    className="w-full bg-[#E7A3B0] text-white hover:bg-[#d891a0]"
                  >
                    {actionLoading ? "Saving..." : "Create Discount Code"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Existing Codes</h3>
                  <span className="rounded-full bg-[#fff0f5] px-3 py-1 text-xs font-semibold text-[#b96d7d]">
                    {discounts.length}
                  </span>
                </div>

                {discountLoading ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
                    Loading discount codes...
                  </div>
                ) : discounts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
                    No discount codes yet. Create one above to start a sale.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {discounts.map((discount) => {
                      const isExpired = Boolean(discount.ends_at && new Date(discount.ends_at).getTime() <= Date.now());
                      return (
                        <div key={discount.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="space-y-3">
                            <div className="min-w-0 space-y-1">
                              <p className="truncate text-base font-semibold text-gray-900">{discount.discount_name}</p>
                              <p className="text-sm text-gray-600">
                                {formatDiscountSummary(discount)}
                                {discount.ends_at ? ` • Ends ${new Date(discount.ends_at).toLocaleString()}` : " • No end date"}
                              </p>
                              <p className={`text-xs font-medium ${isExpired ? "text-rose-600" : discount.is_active ? "text-emerald-600" : "text-gray-500"}`}>
                                {isExpired ? "Expired" : discount.is_active ? "Active" : "Inactive"}
                                {typeof discount.productCount === "number" ? ` • ${discount.productCount} product(s)` : ""}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void handleApplyDiscount(String(discount.id))}
                                disabled={actionLoading || selectedProducts.size === 0}
                                className="bg-[#121212] text-white hover:bg-[#2a2a2a]"
                              >
                                Apply to selected
                              </Button>
                              {!isExpired && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleToggleDiscount(String(discount.id), !discount.is_active)}
                                  disabled={actionLoading}
                                  className={discount.is_active
                                    ? "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                                    : "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"}
                                >
                                  {discount.is_active ? "Deactivate" : "Activate"}
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void handleDeleteDiscount(String(discount.id), discount.discount_name)}
                                disabled={actionLoading}
                                className="border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                                aria-label={`Delete discount code ${discount.discount_name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSeasonModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => {
            setShowSeasonModal(false);
            resetSeasonForm();
          }}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-[#E7A3B0]/20 bg-white shadow-[0_24px_80px_rgba(17,24,39,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E7A3B0]/15 bg-[#fffafc] px-6 py-5">
              <div>
                <div className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                  <CalendarRange className="h-5 w-5 text-[#E7A3B0]" />
                  Seasons
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Create, edit, and remove seasons. Date windows cannot overlap.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSeasonModal(false);
                  resetSeasonForm();
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-white hover:text-gray-700"
                aria-label="Close seasons modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid max-h-[calc(90vh-5.5rem)] gap-5 overflow-y-auto p-6 lg:grid-cols-[3fr_2fr]">
              {/* LEFT — calendar */}
              <div className="lg:sticky lg:top-0 lg:self-start">
                <SeasonCalendar
                  seasons={seasons}
                  editingSeasonId={editingSeasonId}
                  startMonth={seasonForm.startMonth}
                  startDay={seasonForm.startDay}
                  endMonth={seasonForm.endMonth}
                  endDay={seasonForm.endDay}
                  onChange={handleSeasonCalendarChange}
                />
              </div>

              {/* RIGHT — form + list */}
              <div className="space-y-5">
                {/* Form */}
                <div className="rounded-2xl border border-[#E7A3B0]/15 bg-[#fffafc] p-5 shadow-sm">
                  <div className="space-y-4">
                    {/* Step 1 — name */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E7A3B0]/25 text-[10px] font-bold text-[#b96d7d]">1</span>
                          <label className="text-sm font-medium text-gray-700">Season Name</label>
                        </div>
                        <span className={`text-xs tabular-nums ${seasonForm.name.length >= 30 ? "font-medium text-rose-500" : "text-gray-400"}`}>
                          {seasonForm.name.length}/30
                        </span>
                      </div>
                      <Input
                        value={seasonForm.name}
                        onChange={(event) => setSeasonForm((previous) => ({ ...previous, name: event.target.value.slice(0, 30) }))}
                        maxLength={30}
                        placeholder="Summer Sale"
                        className="border-gray-300 bg-white text-gray-900"
                      />
                      <p className="mt-1.5 text-xs text-gray-400">
                        {MONTH_OPTIONS.find((m) => m.value === seasonForm.startMonth)?.label} {seasonForm.startDay}
                        <span className="mx-1 text-gray-300">→</span>
                        {MONTH_OPTIONS.find((m) => m.value === seasonForm.endMonth)?.label} {seasonForm.endDay}
                        <span className="ml-1.5 opacity-60">· pick dates on the calendar</span>
                      </p>
                    </div>

                    {/* Step 2 — active */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E7A3B0]/25 text-[10px] font-bold text-[#b96d7d]">2</span>
                        <span className="text-sm font-medium text-gray-700">Status</span>
                      </div>
                      <label className="flex items-center gap-3 rounded-xl border border-[#E7A3B0]/15 bg-white px-4 py-3 text-sm text-gray-700">
                        <Checkbox
                          checked={seasonForm.isActive}
                          onCheckedChange={(checked) => setSeasonForm((previous) => ({ ...previous, isActive: Boolean(checked) }))}
                        />
                        <span>Season is active</span>
                      </label>
                    </div>

                    {/* Save / Cancel */}
                    <div className="flex items-center gap-2">
                      {!editingSeasonId && seasons.length >= 20 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex-1">
                              <Button type="button" disabled className="w-full bg-[#E7A3B0] text-white opacity-50">
                                Create Season
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Maximum of 20 seasons reached. Delete one to create a new season.
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => void handleSaveSeason()}
                          disabled={actionLoading}
                          className="flex-1 bg-[#E7A3B0] text-white hover:bg-[#d891a0]"
                        >
                          {actionLoading ? "Saving..." : editingSeasonId ? "Update Season" : "Create Season"}
                        </Button>
                      )}
                      {editingSeasonId && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetSeasonForm}
                          disabled={actionLoading}
                          className="border-gray-300 text-gray-700"
                        >
                          Cancel Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Season list */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Existing Seasons</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${seasons.length >= 20 ? "bg-rose-50 text-rose-600" : "bg-[#fff0f5] text-[#b96d7d]"}`}>
                      {seasons.length}/20
                    </span>
                  </div>

                  {seasonsLoading ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
                      Loading seasons...
                    </div>
                  ) : seasons.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
                      No seasons yet. Create one from the form.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {seasons.map((season) => {
                        const startMonth = MONTH_OPTIONS.find((month) => month.value === season.startMonth)?.label || season.startMonth;
                        const endMonth = MONTH_OPTIONS.find((month) => month.value === season.endMonth)?.label || season.endMonth;
                        const color = getSeasonColor(season.id, seasons, editingSeasonId);
                        return (
                          <div key={season.id} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                            <div className="flex items-center gap-3">
                              <span
                                className="h-8 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: color.border }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-gray-900">{season.name}</p>
                                <p className="text-xs text-gray-500">
                                  {startMonth} {season.startDay} – {endMonth} {season.endDay}
                                  <span className={`ml-2 font-medium ${season.isActive !== false ? "text-emerald-600" : "text-gray-400"}`}>
                                    · {season.isActive !== false ? "Active" : "Inactive"}
                                  </span>
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleEditSeason(season)}
                                  disabled={actionLoading}
                                  className="bg-[#121212] text-white hover:bg-[#2a2a2a]"
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleDeleteSeason(season)}
                                  disabled={actionLoading}
                                  className="border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                                  aria-label={`Delete season ${season.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
          seasons={seasons}
        />
      )}

      <AddProduct
        isOpen={showAddModal}
        onClose={closeModal}
        categories={categories}
        productToEdit={editingProduct}
        existingProducts={products}
        discounts={discounts}
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
        existingProducts={products}
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

      <ExportPurgeDialog
        open={productPurgeOpen}
        onClose={() => setProductPurgeOpen(false)}
        title="Export & Purge Archived Products"
        description="Download archived products (with their images) as a ZIP backup, then permanently delete them from the database and storage. This action cannot be undone."
        entityLabel={{ singular: "product", plural: "products" }}
        availableFormats={["zip"]}
        defaultFormat="zip"
        cutoffFieldLabel="archived before"
        onPreview={handleProductsPreview}
        onDownload={handleProductsDownload}
        onPurge={handleProductsPurge}
        onPurgeSuccess={handleProductsPurgeSuccess}
      />
    </div>
  );
}
