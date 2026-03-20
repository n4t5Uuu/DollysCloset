"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Trash, AlertTriangle, Search, X, Upload } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CategoryCascadingFilter from "@/components/filters/CategoryCascadingFilter";
import { Skeleton } from "@/components/ui/skeleton";

import AddProduct from "@/components/modals/AddProduct";
import BulkImportModal from "@/components/modals/BulkImportModal";
import { InventoryTable } from "@/components/tables/InventoryTable";
import { InventoryProduct as Product, InventoryCategory as Category, InventoryProductImage as ProductImage } from "@/types/inventory.types";
import CustomPagination from "@/components/general-components/CustomPagination";
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

interface InventoryManagementProps {
  isAdmin?: boolean;
}

export default function InventoryManagement({ isAdmin = false }: InventoryManagementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [viewImages, setViewImages] = useState<ProductImage[]>([]);
  const [selectedViewImage, setSelectedViewImage] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const itemsPerPage = 10;
  const lowStockThreshold = 10;
  const dateSortLabel = dateSort === "oldest" ? "Oldest" : "Newest";

  const fetchProducts = useCallback(async (showGlobalLoader = false) => {
    try {
      if (showGlobalLoader) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/admin/fetch-products', { cache: 'no-store' });
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
      const response = await fetch('/api/admin/fetch-categories', { cache: 'no-store' });
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
      await Promise.all([fetchProducts(false), fetchCategories()]);
      setLoading(false);
    };
    initializeInventory();
  }, [fetchProducts, fetchCategories]);

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

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const matchesSearch = product.product_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filteredCategoryIds === null || filteredCategoryIds.has(Number(product.category_id));
        const matchesAvailability = availabilityFilter === "all" ||
          (availabilityFilter === "in-stock" && product.product_stock >= lowStockThreshold) ||
          (availabilityFilter === "low-stock" && product.product_stock > 0 && product.product_stock < lowStockThreshold) ||
          (availabilityFilter === "out-of-stock" && product.product_stock === 0);
        const matchesVisibility = visibilityFilter === "all" ||
          (visibilityFilter === "published" && product.show_in_catalog) ||
          (visibilityFilter === "unpublished" && !product.show_in_catalog);
        return matchesSearch && matchesCategory && matchesAvailability && matchesVisibility;
      })
      .sort((firstProduct, secondProduct) => {
        const firstDateValue = new Date(firstProduct.created_at || 0).getTime();
        const secondDateValue = new Date(secondProduct.created_at || 0).getTime();
        return dateSort === "oldest" ? firstDateValue - secondDateValue : secondDateValue - firstDateValue;
      });
  }, [products, searchQuery, filteredCategoryIds, availabilityFilter, visibilityFilter, dateSort, lowStockThreshold]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const getCategoryName = useCallback((id: number) => {
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

  const activeCategoryLabel = useMemo(() => {
    if (categoryFilter === "all") return null;
    if (categoryFilter.startsWith("rootgroup:")) {
      const key = categoryFilter.slice("rootgroup:".length);
      const rootCat = categories.find(
        (c) => c.parent_category === null && c.category_name.trim().toLowerCase() === key
      );
      return rootCat?.category_name ?? key;
    }
    const id = parseInt(categoryFilter);
    return isNaN(id) ? null : getCategoryName(id);
  }, [categoryFilter, categories, getCategoryName]);

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

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowAddModal(true);
  };

  const handleViewProduct = async (product: Product) => {
    setViewProduct(product);
    setSelectedViewImage(null);
    try {
      const response = await fetch(`/api/admin/fetch-images?product_id=${product.product_id}`);
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
    try {
      const { data: { session } } = await browserSupabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await fetch('/api/admin/delete-product', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ product_id: productId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete product');
      await fetchProducts();
      toast.success("Product deleted successfully.");
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
    try {
      const { data: { session } } = await browserSupabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await fetch('/api/admin/bulk-delete-products', {
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
      await fetchProducts();
      toast.success("Selected products deleted successfully.");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete products';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Manage Inventory
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 cursor-pointer"
            >
              <Upload size={18} />
              Import
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] hover:from-[#d891a0] hover:to-[#E7A3B0] text-white rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer"
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>
        </div>
        <p className="text-gray-600 text-sm">Create, update, and organize products and categories.</p>
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

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 rounded-full border-gray-300 text-gray-900 bg-white"
          />
        </div>

        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
          <SelectTrigger className="w-[180px] text-gray-900 bg-white">
            <SelectValue placeholder="Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="unpublished">Unpublished</SelectItem>
          </SelectContent>
        </Select>

        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-[180px] text-gray-900 bg-white">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>

        <CategoryCascadingFilter
          categories={categories}
          value={categoryFilter}
          onValueChange={setCategoryFilter}
        />

        <Select value={dateSort} onValueChange={(value) => setDateSort(value as "newest" | "oldest")}>
          <SelectTrigger className="w-[180px] text-gray-900 bg-white">
            <SelectValue placeholder="Sort Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activeCategoryLabel && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500">Category:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
            {activeCategoryLabel}
            <button
              onClick={() => setCategoryFilter("all")}
              className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
              aria-label="Clear category filter"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div className="text-sm text-gray-600">
          Showing {filteredProducts.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} items
          <span className="ml-2 text-gray-500">• Date Sort: {dateSortLabel}</span>
        </div>
        <div className="flex gap-3">
          {selectedProducts.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="bg-red-500 hover:bg-red-600 text-white"
                  disabled={actionLoading}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Delete ({selectedProducts.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-gray-900">Delete Multiple Products</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete <span className="font-semibold">{selectedProducts.size}</span> selected product(s)? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900">Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white cursor-pointer" onClick={handleBulkDelete}>Delete All</AlertDialogAction>
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
          actionLoading={actionLoading}
        />
      )}

      <div className="flex flex-col gap-4 mt-2">
        <CustomPagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
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
          }
        }}
      />

      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImportComplete={() => fetchProducts(false)}
      />
    </div>
  );
}
