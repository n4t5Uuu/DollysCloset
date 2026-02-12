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

interface Product {
  product_id: string;
  product_name: string;
  category_id: number;
  product_price: number;
  product_brand: string;
  product_description: string;
  product_stock: number;
  product_condition: string;
  size_label: string;
  show_in_catalog: boolean;
  image_id: string | null;
  created_at: string;
}

interface Category {
  category_id: number;
  category_name: string;
  category_description: string;
  parent_category: number | null;
}

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

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    product_name: "",
    category_id: "",
    product_price: "",
    product_brand: "",
    product_description: "",
    product_stock: "",
    product_condition: "New",
    size_label: "One Size",
    show_in_catalog: true,
    image_id: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    category_name: "",
    category_description: "",
    parent_category: "",
  });

  const itemsPerPage = 10;

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await browserSupabase.from('tbl_product').select('*');
      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await browserSupabase.from('tbl_category').select('*');
      if (error) throw error;
      setCategories(data || []);
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

  const resetForm = () => {
    setFormData({
      product_name: "",
      category_id: "",
      product_price: "",
      product_brand: "",
      product_description: "",
      product_stock: "",
      product_condition: "New",
      size_label: "One Size",
      show_in_catalog: true,
      image_id: "",
    });
    setEditingProduct(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setCategoryForm({ category_name: "", category_description: "", parent_category: "" });
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
    setFormData({
      product_name: product.product_name,
      category_id: product.category_id.toString(),
      product_price: product.product_price.toString(),
      product_brand: product.product_brand,
      product_description: product.product_description,
      product_stock: product.product_stock.toString(),
      product_condition: product.product_condition,
      size_label: product.size_label,
      show_in_catalog: product.show_in_catalog,
      image_id: product.image_id || "",
    });
    setShowAddModal(true);
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

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      if (!formData.product_name || !formData.category_id || !formData.product_price) {
        throw new Error('Please fill in all required fields');
      }
      const { data: { session } } = await browserSupabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const endpoint = editingProduct ? '/api/admin/edit-product' : '/api/admin/create-product';
      const method = editingProduct ? 'PUT' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...(editingProduct && { product_id: editingProduct.product_id }),
          product_name: formData.product_name,
          category_id: parseInt(formData.category_id),
          product_price: formData.product_price,
          product_brand: formData.product_brand || "Dolly's Closet",
          product_description: formData.product_description,
          product_stock: formData.product_stock,
          product_condition: formData.product_condition,
          size_label: formData.size_label,
          show_in_catalog: formData.show_in_catalog,
          image_id: formData.image_id || null,
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save product');
      await fetchProducts();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      if (!categoryForm.category_name) throw new Error('Please enter a category name');
      const { data: { session } } = await browserSupabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      console.log('Sending category data:', {
        category_name: categoryForm.category_name,
        category_description: categoryForm.category_description,
        parent_category: categoryForm.parent_category ? parseInt(categoryForm.parent_category) : null,
      });

      const response = await fetch('/api/admin/create-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          category_name: categoryForm.category_name,
          category_description: categoryForm.category_description,
          parent_category: categoryForm.parent_category && categoryForm.parent_category !== "none" ? parseInt(categoryForm.parent_category) : null,
        })
      });
      
      const data = await response.json();
      
      console.log('Category response:', { status: response.status, data });

      if (!response.ok) throw new Error(data.error || `Failed to add category (Status: ${response.status})`);
      
      // Add new category to local state instead of refetching all
      if (data.category) {
        setCategories([...categories, data.category]);
      }
      closeCategoryModal();
    } catch (err: any) {
      console.error('Error adding category:', err);
      setError(err.message || 'Failed to add category');
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
                      <Button size="icon" variant="outline" className="border-pink-200 text-pink-600 bg-pink-50 hover:bg-pink-200 hover:text-pink-700 hover:border-pink-300" onClick={() => setViewProduct(product)}>
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
                onClick={() => setViewProduct(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-gray-600"
                aria-label="Close product details"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4 p-6 text-gray-900">
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
              <Button variant="outline" onClick={() => setViewProduct(null)}>Close</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            <CardHeader className="flex flex-row items-center justify-between border-b p-6 space-y-0 text-gray-900">
              <CardTitle className="text-gray-900">{editingProduct ? "Edit Product" : "Add Product"}</CardTitle>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </CardHeader>

            <form onSubmit={handleAddProduct}>
              <CardContent className="space-y-5 p-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="Enter product name"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    required
                    className="border-gray-300 text-gray-900 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
                    <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                      <SelectTrigger className="border-gray-300 text-gray-900 bg-white">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-gray-900 z-[60]">
                        {categories.length === 0 ? (
                          <SelectItem value="none" disabled>No categories found</SelectItem>
                        ) : (
                          categories.map((cat) => (
                            <SelectItem key={cat.category_id} value={cat.category_id.toString()}>{cat.category_name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price <span className="text-red-500">*</span></label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.product_price}
                      onChange={(e) => setFormData({ ...formData, product_price: e.target.value })}
                      required
                      className="border-gray-300 text-gray-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                    <Input
                      placeholder="e.g., Gucci"
                      value={formData.product_brand}
                      onChange={(e) => setFormData({ ...formData, product_brand: e.target.value })}
                      className="border-gray-300 text-gray-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.product_stock}
                      onChange={(e) => setFormData({ ...formData, product_stock: e.target.value })}
                      className="border-gray-300 text-gray-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Size Label</label>
                    <Input
                      placeholder="e.g., One Size, M, L"
                      value={formData.size_label}
                      onChange={(e) => setFormData({ ...formData, size_label: e.target.value })}
                      className="border-gray-300 text-gray-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                    <Select value={formData.product_condition} onValueChange={(value) => setFormData({ ...formData, product_condition: value })}>
                      <SelectTrigger className="border-gray-300 text-gray-900 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-gray-900 z-[60]">
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Like New">Like New</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    placeholder="Enter product description"
                    value={formData.product_description}
                    onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white text-gray-900"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="show_in_catalog"
                      checked={formData.show_in_catalog}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_in_catalog: checked as boolean })}
                    />
                    <label htmlFor="show_in_catalog" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Show in Catalog
                    </label>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex gap-3 p-6 border-t bg-gray-50">
                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 bg-[#E7A3B0] hover:bg-[#ca8c98] text-white" disabled={actionLoading}>
                  {actionLoading ? ( <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </> ) : (
                    editingProduct ? "✓ Update" : "✚ Add"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white w-full max-w-lg p-0">
            <CardHeader className="flex flex-row items-center justify-between border-b p-6 space-y-0">
              <CardTitle>Add Category</CardTitle>
              <button onClick={closeCategoryModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </CardHeader>

            <form onSubmit={handleAddCategory}>
              <CardContent className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category Name <span className="text-red-500">*</span></label>
                  <Input
                    type="text"
                    placeholder="e.g., Men's Top"
                    value={categoryForm.category_name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, category_name: e.target.value })}
                    required
                    className="border-gray-300 text-gray-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <Input
                    type="text"
                    placeholder="e.g., Men's clothing items"
                    value={categoryForm.category_description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, category_description: e.target.value })}
                    className="border-gray-300 text-gray-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parent Category (Optional)</label>
                  <Select value={categoryForm.parent_category || "none"} onValueChange={(value) => setCategoryForm({ ...categoryForm, parent_category: value === "none" ? "" : value })}>
                    <SelectTrigger className="border-gray-300 text-gray-900 bg-white">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-[60]">
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.category_id} value={cat.category_id.toString()}>
                          {cat.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>

              <CardFooter className="flex gap-3 p-6 border-t bg-gray-50">
                <Button type="button" variant="outline" onClick={closeCategoryModal} className="flex-1">Cancel</Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white" 
                  disabled={actionLoading || !categoryForm.category_name}
                >
                  {actionLoading ? ( <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </> ) : (
                    "✚ Add Category"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
