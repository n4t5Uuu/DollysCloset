//admin/inventory/page.tsx
"use client";

import { useState } from "react";
import { Product } from "@/data/product-test-data";
import { useProducts } from "@/contexts/ProductContext";
import { Plus } from "lucide-react";
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
import { Eye, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const categoryTypes: { [key: string]: string[] } = {
  "Men's Top": ["Teenagers", "Long Sleeves", "Polo"],
  "Women's Top": ["Blouses", "Tees"],
  "Coords": ["Hoodies", "Training"],
  "Seasonal": ["Jackets", "Raincoats"],
};

export default function AdminInventoryPage() {
  const { productList, catalogStatus, addProduct, updateProduct, deleteProduct, cycleCatalogStatus, logActivity } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    type: "",
    price: "",
    size: "",
    brand: "",
    stock: "",
    description: "",
    isNewArrival: false,
    isPublished: true,
    isFeatured: false,
    images: [] as string[],
  });

  const itemsPerPage = 10;

  // Filter products
  const filteredProducts = productList.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "in-stock" && product.stock > 0) ||
      (availabilityFilter === "no-stock" && product.stock === 0);
    const matchesVisibility =
      visibilityFilter === "all" ||
      (visibilityFilter === "published" && catalogStatus[product.id] !== "unlisted") ||
      (visibilityFilter === "unpublished" && catalogStatus[product.id] === "unlisted");

    return (
      matchesSearch && matchesCategory && matchesAvailability && matchesVisibility
    );
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const categories = Object.keys(categoryTypes);
  const availableTypes = formData.category ? categoryTypes[formData.category] || [] : [];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const imageUrls = fileArray.map(file => URL.createObjectURL(file));
      setImageFiles([...imageFiles, ...imageUrls]);
      setFormData({ ...formData, images: [...formData.images, ...imageUrls] });
    }
  };

  const removeImage = (index: number) => {
    const newImages = imageFiles.filter((_, i) => i !== index);
    setImageFiles(newImages);
    setFormData({ ...formData, images: newImages });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(currentProducts.map((p) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
    }
  };

  const handleEditProduct = (product: Product) => {
    logActivity({
      action: "opened_edit",
      productId: product.id,
      productName: product.name,
    });
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      type: product.type,
      price: product.price.toString(),
      size: product.size,
      brand: product.brand,
      stock: product.stock.toString(),
      description: product.description,
      isNewArrival: product.isNewArrival,
      isPublished: catalogStatus[product.id] !== "unlisted",
      isFeatured: catalogStatus[product.id] === "featured",
      images: product.images,
    });
    setImageFiles(product.images);
    setShowAddModal(true);
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      deleteProduct(productId);
    }
  };

  const handleAddProduct = () => {
    // Validate form
    if (!formData.name || !formData.category || !formData.type || !formData.price) {
      alert("Please fill in all required fields");
      return;
    }
    
    if (editingProduct) {
      // Update existing product
      const updatedProduct: Product = {
        ...editingProduct,
        name: formData.name,
        category: formData.category,
        type: formData.type,
        price: parseFloat(formData.price),
        brand: formData.brand || "Dolly's Closet",
        size: formData.size || "One Size",
        description: formData.description,
        stock: parseInt(formData.stock) || 0,
        isNewArrival: formData.isNewArrival,
        images: formData.images.length > 0 ? formData.images : ["/placeholder.jpg"],
      };
      
      let updatedStatus: "featured" | "standard" | "unlisted";
      if (!formData.isPublished) {
        updatedStatus = "unlisted";
      } else if (formData.isFeatured) {
        updatedStatus = "featured";
      } else {
        updatedStatus = "standard";
      }
      
      updateProduct(updatedProduct, updatedStatus);
      setEditingProduct(null);
    } else {
      // Create new product
      const newProduct: Product = {
        id: `product-${Date.now()}`,
        name: formData.name,
        category: formData.category,
        type: formData.type,
        price: parseFloat(formData.price),
        brand: formData.brand || "Dolly's Closet",
        size: formData.size || "One Size",
        condition: "New",
        description: formData.description,
        stock: parseInt(formData.stock) || 0,
        isNewArrival: formData.isNewArrival,
        images: formData.images.length > 0 ? formData.images : ["/placeholder.jpg"],
      };
      
      let initialStatus: "featured" | "standard" | "unlisted";
      if (!formData.isPublished) {
        initialStatus = "unlisted";
      } else if (formData.isFeatured) {
        initialStatus = "featured";
      } else {
        initialStatus = "standard";
      }
      
      addProduct(newProduct, initialStatus);
    }
    
    // Reset form and close modal
    setFormData({
      name: "",
      category: "",
      type: "",
      price: "",
      size: "",
      brand: "",
      stock: "",
      description: "",
      isNewArrival: false,
      isPublished: true,
      isFeatured: false,
      images: [],
    });
    setImageFiles([]);
    setEditingProduct(null);
    setShowAddModal(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md rounded-full border-gray-300"
          />
        </div>

        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="unpublished">Unpublished</SelectItem>
          </SelectContent>
        </Select>

        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="no-stock">No Stock</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of{" "}
          {filteredProducts.length} items
        </div>
        <div className="flex gap-3">
          <Button 
            className="bg-green-500 hover:bg-green-600 text-white"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4" />
            Add Products
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4 text-left w-12">
                <Checkbox
                  checked={
                    selectedProducts.length === currentProducts.length &&
                    currentProducts.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="p-4 text-left font-bold">Product Name</th>
              <th className="p-4 text-left font-bold">Category</th>
              <th className="p-4 text-left font-bold">Type</th>
              <th className="p-4 text-center font-bold">Stocks</th>
              <th className="p-4 text-center font-bold">Catalog</th>
              <th className="p-4 text-right font-bold">Price</th>
              <th className="p-4 text-center font-bold w-[200px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={(checked) =>
                      handleSelectProduct(product.id, checked as boolean)
                    }
                  />
                </td>
                <td className="p-4 font-medium">
                  <div className="flex items-center gap-2">
                    {product.name}
                    {product.isNewArrival && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                        NEW
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-gray-600">{product.category}</td>
                <td className="p-4 text-gray-600">{product.type}</td>
                <td className="p-4 text-center">
                  <span className={product.stock < 10 ? "text-orange-600 font-medium" : ""}>
                    {product.stock}
                  </span>
                  {product.stock < 10 && (
                    <div className="text-xs text-orange-600 mt-1">⚠ Low Stock</div>
                  )}
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => cycleCatalogStatus(product.id)}
                    className={`cursor-pointer px-3 py-1 rounded text-sm font-medium ${
                      catalogStatus[product.id] === "featured"
                        ? "bg-purple-100 text-purple-800"
                        : catalogStatus[product.id] === "standard"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {catalogStatus[product.id] === "featured" ? "Featured" : 
                    catalogStatus[product.id] === "standard" ? "Standard" : "Unlisted"}
                  </button>
                </td>
                <td className="p-4 text-right font-medium">
                  ₱{product.price.toFixed(2)}
                </td>
                <td className="p-4">
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-pink-200 text-pink-600 bg-pink-50 hover:bg-pink-200 hover:text-pink-700 hover:border-pink-300"
                      onClick={() => {
                        logActivity({
                          action: "viewed",
                          productId: product.id,
                          productName: product.name,
                        });
                        setViewProduct(product);
                      }}
                      title="View product details"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-200 hover:text-blue-700 hover:border-blue-300"
                      onClick={() => handleEditProduct(product)}
                      title="Edit product"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-red-200 text-red-600 bg-red-50 hover:bg-red-200 hover:text-red-700 hover:border-red-300"
                      onClick={() => handleDeleteProduct(product.id)}
                      title="Delete product"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Product Overview</p>
                <h3 className="text-xl font-semibold text-gray-900">{viewProduct.name}</h3>
              </div>
              <button
                className="cursor-pointer text-gray-500 hover:text-gray-700 text-2xl leading-none"
                onClick={() => setViewProduct(null)}
                aria-label="Close product overview"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase text-gray-500">Category</p>
                  <p className="font-medium">{viewProduct.category}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Type</p>
                  <p className="font-medium">{viewProduct.type}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Brand</p>
                  <p className="font-medium">{viewProduct.brand || "Dolly's Closet"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Size</p>
                  <p className="font-medium">{viewProduct.size || "One Size"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Stock</p>
                  <p className="font-medium">{viewProduct.stock}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Price</p>
                  <p className="font-medium">₱{viewProduct.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Catalog Status</p>
                  <p className="font-medium capitalize">{catalogStatus[viewProduct.id]}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">New Arrival</p>
                  <p className="font-medium">{viewProduct.isNewArrival ? "Yes" : "No"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500 mb-1">Description</p>
                <p className="text-gray-800 whitespace-pre-line">{viewProduct.description || "No description"}</p>
              </div>

              {viewProduct.images?.length > 0 && (
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-2">Images</p>
                  <div className="grid grid-cols-3 gap-2">
                    {viewProduct.images.slice(0, 3).map((src, idx) => (
                      <img
                        key={idx}
                        src={src}
                        alt={`${viewProduct.name} ${idx + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setViewProduct(null)}
                  className="border-gray-300"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center items-center gap-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="cursor-pointer hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200"
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
                  ? "bg-[#E7A3B0] hover:bg-[#ca8c98] cursor-pointer"
                  : "cursor-pointer hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200"
              }
            >
              {pageNum}
            </Button>
          );
        })}
        {totalPages > 5 && currentPage < totalPages - 2 && (
          <span className="px-2">...</span>
        )}
        {totalPages > 5 && currentPage < totalPages - 2 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            className="cursor-pointer hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200"
          >
            {totalPages}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setCurrentPage((prev) => Math.min(totalPages, prev + 1))
          }
          disabled={currentPage === totalPages}
          className="cursor-pointer hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200"
        >
          &gt;
        </Button>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto border-gray-200 p-0 gap-0">
            {/* Modal Header */}
            <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-gray-100 space-y-0">
              <CardTitle className="text-2xl font-bold text-gray-900">{editingProduct ? "Edit Product" : "Add Product"}</CardTitle>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProduct(null);
                }}
                className="cursor-pointer text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </CardHeader>

            {/* Modal Form */}
            <CardContent className="space-y-5 p-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter product name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-pink-500 focus:ring-pink-500"
                />
              </div>

              {/* Category and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value, type: "" })
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-pink-500">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="cursor-pointer text-gray-900 focus:bg-gray-100 focus:text-gray-900">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger 
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-pink-500"
                      disabled={!formData.category}
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      {availableTypes.map((type) => (
                        <SelectItem key={type} value={type} className="cursor-pointer text-gray-900 focus:bg-gray-100 focus:text-gray-900">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price and Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size
                  </label>
                  <Input
                    placeholder="e.g., XL, M, S"
                    value={formData.size}
                    onChange={(e) =>
                      setFormData({ ...formData, size: e.target.value })
                    }
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* Brand and Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand
                  </label>
                  <Input
                    placeholder="e.g., Gucci"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Available
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Enter product description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full bg-white border border-gray-200 text-gray-900 rounded px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 bg-gray-50">
                  <input
                    type="file"
                    id="imageUpload"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label htmlFor="imageUpload" className="cursor-pointer block">
                    <svg
                      className="w-12 h-12 mx-auto text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <p className="text-gray-600 text-sm">
                      Click to upload images
                    </p>
                  </label>
                </div>
                {imageFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {imageFiles.map((img, index) => (
                      <div key={index} className="relative group">
                        <img src={img} alt={`Preview ${index + 1}`} className="w-full h-20 object-cover rounded" />
                        <button
                          onClick={() => removeImage(index)}
                          className="cursor-pointer absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="newArrival"
                    checked={formData.isNewArrival}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isNewArrival: checked as boolean })
                    }
                    className="bg-white border-black data-[state=checked]:bg-pink-500 data-[state=checked]:border-white"
                  />
                  <label
                    htmlFor="newArrival"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    New Arrival
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="publishToCatalog"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isPublished: checked as boolean })
                    }
                    className="bg-white border-black data-[state=checked]:bg-pink-500 data-[state=checked]:border-white"
                  />
                  <label
                    htmlFor="isPublished"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Publish to Catalog
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="isFeatured"
                    checked={formData.isFeatured}
                    disabled={!formData.isPublished}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isFeatured: checked as boolean })
                    }
                    className="bg-white border-black data-[state=checked]:bg-pink-500 data-[state=checked]:border-white"
                  />
                  <label
                    htmlFor="isFeatured"
                    className={`text-sm font-medium cursor-pointer ${
                      formData.isPublished ? "text-gray-700" : "text-gray-500"
                    }`}
                  >
                    Featured (Show in Carousel)
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
            </CardContent>
              <CardFooter className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const price = parseFloat(formData.price) || 0;
                    const stock = parseInt(formData.stock) || 0;
                    const status = (!formData.isPublished ? "unlisted" : (formData.isFeatured ? "featured" : "standard")) as "featured" | "standard" | "unlisted";
                    
                    if (editingProduct) {
                      updateProduct({
                        ...editingProduct,
                        ...formData,
                        price,
                        stock,
                      }, status);
                    } else {
                      addProduct({
                        id: (Math.random() * 10000).toString(),
                        ...formData,
                        price,
                        stock,
                        condition: "New",
                      }, status);
                    }
                    setShowAddModal(false);
                  }}
                  className="flex-1 bg-[#E7A3B0] hover:bg-[#ca8c98] text-white font-medium cursor-pointer"
                >
                  {editingProduct ? "✓ Update Product" : "✚ Add Product"}
                </Button>
              </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}