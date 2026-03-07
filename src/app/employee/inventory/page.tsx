/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Trash, Loader2, AlertTriangle, Search, X } from "lucide-react";
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

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import AddProduct from "@/components/dialogs/AddProduct";
import { InventoryTable } from "@/components/tables/InventoryTable";
import { InventoryProduct as Product, InventoryCategory as Category, InventoryProductImage as ProductImage } from "@/types/inventory.types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function EmployeeInventoryPage() {
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

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const result = await response.json();
      setProducts(result.data || []);
      return true;

    } catch (err: unknown) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      return false;
    } finally {
      if (showGlobalLoader) {
        setLoading(false);
      }
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/fetch-categories', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

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

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const matchesSearch = product.product_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || product.category_id === parseInt(categoryFilter);
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

        if (dateSort === "oldest") {
          return firstDateValue - secondDateValue;
        }

        return secondDateValue - firstDateValue;
      });
  }, [products, searchQuery, categoryFilter, availabilityFilter, visibilityFilter, dateSort, lowStockThreshold]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [Number(category.category_id), category])),
    [categories]
  );

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
    if (!confirm("Are you sure you want to delete this product?")) return;
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      setError("No products selected");
      return;
    }
    if (!confirm(`Delete ${selectedProducts.size} product(s)?`)) return;
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete products');
    } finally {
      setActionLoading(false);
    }
  };

  const orderedViewImages = [...viewImages].sort((a, b) => {
    if (a.is_primary === b.is_primary) return a.display_order - b.display_order;
    return a.is_primary ? -1 : 1;
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Inventory</h1>
        <p className="text-gray-600 mt-2">Create, update, and organize products.</p>
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

      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div className="text-sm text-gray-600">
          Showing {filteredProducts.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} items
          <span className="ml-2 text-gray-500">• Date Sort: {dateSortLabel}</span>
        </div>
        <div className="flex gap-3">
          {selectedProducts.size > 0 && (
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleBulkDelete}
              disabled={actionLoading}
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete ({selectedProducts.size})
            </Button>
          )}
          <Button
            className="bg-green-500 hover:bg-green-600 text-white"
            onClick={openAddModal}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

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

      {/* Footer Stats & Pagination */}
      <div className="flex flex-col gap-4 mt-2">
        <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage((prev) => Math.max(1, prev - 1));
                  }} 
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(pageNum);
                      }}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                  }} 
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
      </div>

      {viewProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 text-gray-900">
            <CardHeader className="flex flex-row items-center justify-between border-b p-6 space-y-0 text-gray-900">
              <CardTitle className="text-gray-900">Product Details</CardTitle>
              <button
                type="button"
                onClick={() => {
                  setViewProduct(null);
                  setViewImages([]);
                  setSelectedViewImage(null);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-gray-600"
                aria-label="Close product details"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4 p-6 text-gray-900">
              <div className="w-full">
                {viewImages.length > 0 ? (
                  <>
                    <div className="w-full h-72 rounded-lg border bg-gray-50 flex items-center justify-center p-2">
                      <img
                        src={selectedViewImage || orderedViewImages[0].image_url}
                        alt={viewProduct.product_name}
                        className="w-full h-full object-contain rounded-md"
                      />
                    </div>
                    {orderedViewImages.length > 1 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {orderedViewImages.map((image) => {
                          const isSelected = (selectedViewImage || orderedViewImages[0].image_url) === image.image_url;
                          return (
                            <button
                              key={image.image_id}
                              type="button"
                              onClick={() => setSelectedViewImage(image.image_url)}
                              className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${isSelected ? "border-pink-400" : "border-transparent"}`}
                              aria-label="Select product image"
                            >
                              <img
                                src={image.image_url}
                                alt={`${viewProduct.product_name} thumbnail`}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-64 rounded-lg border bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
                    No image available
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Product Name</p>
                <p className="text-lg font-semibold">{viewProduct.product_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Category</p>
                  <p className="font-medium">{getCategoryName(viewProduct.category_id)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Brand</p>
                  <p className="font-medium">{viewProduct.product_brand}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Price</p>
                  <p className="font-medium">₱{viewProduct.product_price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Stock</p>
                  <p className="font-medium">{viewProduct.product_stock}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Condition</p>
                  <p className="font-medium">{viewProduct.product_condition}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Size</p>
                  <p className="font-medium">{viewProduct.size_label}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Visibility</p>
                  <p className="font-medium">{viewProduct.show_in_catalog ? "Listed" : "Hidden"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-sm text-gray-700">{viewProduct.product_description || "No description"}</p>
              </div>
            </CardContent>
            <CardFooter className="border-t flex justify-end gap-3 p-6 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => {
                  setViewProduct(null);
                  setViewImages([]);
                  setSelectedViewImage(null);
                }}
              >
                Close
              </Button>
            </CardFooter>
          </Card>
        </div>
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
    </div>
  );
}
