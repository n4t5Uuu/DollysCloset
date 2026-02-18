"use client";

import { useState, useEffect } from "react";
import { Plus, Trash, Loader2, AlertTriangle, Search, Eye, Pencil, Trash2, X } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AddProduct from "@/components/modals/AddProduct";
import AddCategory from "@/components/modals/AddCategory";
import { InventoryProduct as Product, InventoryCategory as Category, InventoryProductImage as ProductImage } from "@/types/inventory.types";

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [viewImages, setViewImages] = useState<ProductImage[]>([]);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/fetch-products');
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const result = await response.json();
      setProducts(result.data || []);

    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const response = await fetch('/api/admin/fetch-categories');
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const result = await response.json();
      setCategories(result.data || []);

    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setCategories([]);
      setError(err.message || 'Failed to load categories');
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category_id === parseInt(categoryFilter);
    const matchesAvailability = availabilityFilter === "all" || 
      (availabilityFilter === "in-stock" && product.product_stock > 0) ||
      (availabilityFilter === "no-stock" && product.product_stock === 0);
    const matchesVisibility = visibilityFilter === "all" || 
      (visibilityFilter === "published" && product.show_in_catalog) ||
      (visibilityFilter === "unpublished" && !product.show_in_catalog);
    return matchesSearch && matchesCategory && matchesAvailability && matchesVisibility;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const getCategoryName = (id: number) => categories.find(c => c.category_id === id)?.category_name || 'Unknown';

  const openAddModal = () => {
    setEditingProduct(null);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingProduct(null);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
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
    try {
      const response = await fetch(`/api/admin/fetch-images?product_id=${product.product_id}`);
      if (response.ok) {
        const result = await response.json();
        setViewImages(result.data || []);
      } else {
        setViewImages([]);
      }
    } catch (err) {
      console.error("Error fetching view images:", err);
      setViewImages([]);
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
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
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
    } catch (err: any) {
      setError(err.message || 'Failed to delete products');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Inventory</h1>
        <p className="text-gray-600 mt-2">Create, update, and organize products and categories.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
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
            <SelectItem value="no-stock">No Stock</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] text-gray-900 bg-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.length === 0 ? (
              <SelectItem value="none" disabled>No categories found</SelectItem>
            ) : (
              categories.map((cat) => (
                <SelectItem key={cat.category_id} value={cat.category_id.toString()}>
                  {cat.category_name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="text-sm text-gray-600">
          Showing {filteredProducts.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} items
        </div>
        <div className="flex gap-3">
          <Button 
            className="bg-purple-500 hover:bg-purple-600 text-white"
            onClick={() => setShowCategoryModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
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

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4 text-left w-12">
                <Checkbox
                  checked={selectedProducts.size === currentProducts.length && currentProducts.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="p-4 text-left font-bold">Product Name</th>
              <th className="p-4 text-left font-bold">Category</th>
              <th className="p-4 text-center font-bold">Stock</th>
              <th className="p-4 text-right font-bold">Price</th>
              <th className="p-4 text-center font-bold">Status</th>
              <th className="p-4 text-center font-bold w-[200px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.length > 0 ? (
              currentProducts.map((product) => (
                <tr key={product.product_id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <Checkbox
                      checked={selectedProducts.has(product.product_id)}
                      onCheckedChange={() => toggleSelectProduct(product.product_id)}
                    />
                  </td>
                  <td className="p-4 font-medium">{product.product_name}</td>
                  <td className="p-4 text-gray-600">{getCategoryName(product.category_id)}</td>
                  <td className="p-4 text-center">
                    <span className={product.product_stock < 10 ? "text-orange-600 font-medium" : ""}>
                      {product.product_stock}
                    </span>
                    {product.product_stock < 10 && (
                      <div className="text-xs text-orange-600 mt-1">⚠ Low</div>
                    )}
                  </td>
                  <td className="p-4 text-right font-medium">
                    ₱{product.product_price.toFixed(2)}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      product.show_in_catalog ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {product.show_in_catalog ? "Listed" : "Hidden"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Button size="icon" variant="outline" className="border-pink-200 text-pink-600 bg-pink-50 hover:bg-pink-200 hover:text-pink-700 hover:border-pink-300" onClick={() => handleViewProduct(product)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-200 hover:text-blue-700 hover:border-blue-300" onClick={() => handleEditProduct(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="border-red-200 text-red-600 bg-red-50 hover:bg-red-200 hover:text-red-700 hover:border-red-300" onClick={() => handleDeleteProduct(product.product_id)} disabled={actionLoading}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>&lt;</Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
            return (
              <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className={currentPage === pageNum ? "bg-[#E7A3B0] hover:bg-[#ca8c98]" : ""}>
                {pageNum}
              </Button>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>&gt;</Button>
        </div>
      )}

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
                  <img
                    src={(viewImages.find((img) => img.is_primary) || viewImages[0]).image_url}
                    alt={`${viewProduct.product_name} primary`}
                    className="w-full h-64 object-cover rounded-lg border"
                  />
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
        onProductSaved={() => {
          fetchProducts();
          closeModal();
        }}
      />

      <AddCategory
        isOpen={showCategoryModal}
        onClose={closeCategoryModal}
        categories={categories}
        onCategoryAdded={(newCategory) => {
          setCategories([...categories, newCategory]);
          closeCategoryModal();
        }}
      />
    </div>
  );
}
