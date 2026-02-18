"use client";

import { useState, useEffect } from "react";
import { Loader2, X, AlertTriangle } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import ProductImageUpload from "@/components/product-image-upload";
import ImageSelector from "@/components/image-selector";
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
import { InventoryProduct as Product, InventoryCategory as Category, InventoryProductImage as ProductImage } from "@/types/inventory.types";

// Define interfaces locally to match the usage in the inventory page
// Ideally these should be in a shared types file

interface AddProductProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    productToEdit?: Product | null;
    onProductSaved: () => void;
}

export default function AddProduct({ isOpen, onClose, categories, productToEdit, onProductSaved }: AddProductProps) {
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stagedFiles, setStagedFiles] = useState<File[]>([]);
    const [productImages, setProductImages] = useState<ProductImage[]>([]);

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

    useEffect(() => {
        if (isOpen) {
            if (productToEdit) {
                setFormData({
                    product_name: productToEdit.product_name,
                    category_id: productToEdit.category_id.toString(),
                    product_price: productToEdit.product_price.toString(),
                    product_brand: productToEdit.product_brand,
                    product_description: productToEdit.product_description,
                    product_stock: productToEdit.product_stock.toString(),
                    product_condition: productToEdit.product_condition,
                    size_label: productToEdit.size_label,
                    show_in_catalog: productToEdit.show_in_catalog,
                    image_id: productToEdit.image_id || "",
                });
                fetchProductImages(productToEdit.product_id);
            } else {
                resetForm();
            }
        }
    }, [isOpen, productToEdit]);

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
        setStagedFiles([]);
        setProductImages([]);
        setError(null);
    };

    const fetchProductImages = async (productId: string) => {
        try {
            const response = await fetch(`/api/admin/fetch-images?product_id=${productId}`);
            if (response.ok) {
                const result = await response.json();
                setProductImages(result.data || []);
            }
        } catch (err) {
            console.error('Error fetching images:', err);
        }
    };

    const addStagedFiles = (files: File[]) => {
        setStagedFiles([...stagedFiles, ...files]);
    };

    const removeStagedFile = (index: number) => {
        setStagedFiles(stagedFiles.filter((_, i) => i !== index));
    };

    const uploadStagedImages = async (productId: string, session: any) => {
        if (stagedFiles.length === 0) return;

        try {
            for (const file of stagedFiles) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("product_id", productId);

                const response = await fetch("/api/admin/upload-image", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: formData,
                });

                if (!response.ok) {
                    const error = await response.json();
                    const message = error.details
                        ? `${error.error}: ${error.details}`
                        : (error.error || "Image upload failed");
                    throw new Error(message);
                }
            }
            setStagedFiles([]);
        } catch (err) {
            throw err;
        }
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setError(null);
        try {
            if (!formData.product_name || !formData.category_id || !formData.product_price) {
                throw new Error('Please fill in all required fields');
            }
            const { data: { session } } = await browserSupabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const endpoint = productToEdit ? '/api/admin/edit-product' : '/api/admin/create-product';
            const method = productToEdit ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    ...(productToEdit && { product_id: productToEdit.product_id }),
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

            // Upload staged images if this was a new product
            if (!productToEdit && data.product?.product_id && stagedFiles.length > 0) {
                await uploadStagedImages(data.product.product_id, session);
            } else if (productToEdit) {
                // If editing, refreshing images might be handled by the parent or separate logic
                // usually ImageUpload component handles its own uploads visually, but staged files need handling
                // For this refactor, we assume staged files are for NEW products mainly, or editing existing calls ImageUpload
                // The original code passed 'loading={actionLoading}' to ProductImageUpload which suggests it might need it
                await fetchProductImages(productToEdit.product_id);
            }

            onProductSaved();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save product');
        } finally {
            setActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0">
                <CardHeader className="flex flex-row items-center justify-between border-b p-6 space-y-0 text-gray-900">
                    <CardTitle className="text-gray-900">{productToEdit ? "Edit Product" : "Add Product"}</CardTitle>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </CardHeader>

                <form onSubmit={handleSaveProduct}>
                    <CardContent className="space-y-5 p-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Product Name <span className="text-red-500">*</span></label>
                            <Input
                                placeholder="Enter product name"
                                value={formData.product_name}
                                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                                required
                                className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-800"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
                                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                                    <SelectTrigger className="border-black text-black bg-white data-placeholder:text-black">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white text-black z-60">
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
                                    className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-800"
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
                                    className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-800"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={formData.product_stock}
                                    onChange={(e) => setFormData({ ...formData, product_stock: e.target.value })}
                                    className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-800"
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
                                    className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-800"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                                <Select value={formData.product_condition} onValueChange={(value) => setFormData({ ...formData, product_condition: value })}>
                                    <SelectTrigger className="border-gray-300 text-gray-900 bg-white data-placeholder:text-gray-800">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent className="bg-white text-gray-900 z-60">
                                        <SelectItem value="New">New</SelectItem>
                                        <SelectItem value="Like New">Like New</SelectItem>
                                        <SelectItem value="Good">Good</SelectItem>
                                        <SelectItem value="Fair">Fair</SelectItem>
                                    </SelectContent>

                                </Select>
                            </div>
                        </div>

                        {!productToEdit ? (
                            <ImageSelector
                                stagedFiles={stagedFiles}
                                onFilesAdd={addStagedFiles}
                                onFileRemove={removeStagedFile}
                            />
                        ) : (
                            <ProductImageUpload
                                productId={productToEdit?.product_id || null}
                                images={productImages}
                                onImagesChange={setProductImages}
                                loading={actionLoading}
                            />
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <Textarea
                                placeholder="Enter product description"
                                value={formData.product_description}
                                onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
                                className="w-full border border-gray-300 rounded px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white text-gray-900 placeholder:text-gray-800 resize-none"
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
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-gray-300 text-gray-700 bg-white hover:bg-white hover:text-black transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-gray-400 active:scale-95">Cancel</Button>
                        <Button type="submit" className="flex-1 bg-[#E7A3B0] hover:bg-[#ca8c98] text-white transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-sm hover:shadow-md" disabled={actionLoading}>
                            {actionLoading ? (<>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>) : (
                                productToEdit ? "✓ Update" : "✚ Add"
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}