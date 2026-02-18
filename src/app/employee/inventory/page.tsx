//employee/inventory/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, Search, Eye, X } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InventoryProduct as Product, InventoryCategory as Category } from "@/types/inventory.types";

export default function EmployeeInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const itemsPerPage = 10;

  // Fetch products and categories
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await browserSupabase
        .from('tbl_product')
        .select('*')
        .eq('show_in_catalog', true); // Only show listed products to employees
        
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
      const { data, error } = await browserSupabase
        .from('tbl_category')
        .select('*');
        
      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setCategories([]);
      setError(err.message || 'Failed to load categories');
    }
  }

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.product_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || product.category_id === parseInt(categoryFilter);
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "in-stock" && product.product_stock > 0) ||
      (availabilityFilter === "no-stock" && product.product_stock === 0);

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const getCategoryName = (id: number) => categories.find(c => c.category_id === id)?.category_name || 'Unknown';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
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

      {/* Search and Filters */}
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

        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-[180px] text-gray-900 bg-white">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="no-stock">Out of Stock</SelectItem>
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

      {/* Info */}
      <div className="text-sm text-gray-600">
        Showing {filteredProducts.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} items
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4 text-left font-bold">Product Name</th>
              <th className="p-4 text-left font-bold">Category</th>
              <th className="p-4 text-center font-bold">Stock</th>
              <th className="p-4 text-right font-bold">Price</th>
              <th className="p-4 text-center font-bold">Condition</th>
              <th className="p-4 text-center font-bold w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.length > 0 ? (
              currentProducts.map((product) => (
                <tr key={product.product_id} className="border-b hover:bg-gray-50">
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
                  <td className="p-4 text-center text-sm">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {product.product_condition}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="icon"
                        variant="outline"
                        className="border-pink-200 text-pink-600 bg-pink-50 hover:bg-pink-200 hover:text-pink-700 hover:border-pink-300"
                        onClick={() => setViewProduct(product)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            &lt;
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(pageNum)}
                className={
                  currentPage === pageNum
                    ? "bg-[#E7A3B0] hover:bg-[#ca8c98]"
                    : ""
                }
              >
                {pageNum}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            &gt;
          </Button>
        </div>
      )}

      {/* View Product Modal */}
      {viewProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white w-full max-w-lg p-0">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle>Product Details</CardTitle>
              <button onClick={() => setViewProduct(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4 py-6">
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
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewProduct.product_description || "No description"}</p>
              </div>
            </CardContent>
            <CardFooter className="border-t flex justify-end gap-3">
              <Button 
                variant="outline"
                onClick={() => setViewProduct(null)}
              >
                Close
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
