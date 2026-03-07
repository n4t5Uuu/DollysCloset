"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader2, X } from "lucide-react";
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
    onProductSaved: () => void | Promise<void>;
}

interface SessionWithAccessToken {
    access_token: string;
}

const MAX_META_LENGTH = 9;

const clampMetaText = (value: string) => value.trim().slice(0, MAX_META_LENGTH);

const normalizeCategoryId = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const raw = String(value).trim();
    if (!raw) return "";

    const numericId = Number.parseInt(raw, 10);
    if (!Number.isNaN(numericId)) {
        return String(numericId);
    }

    return raw;
};

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
                    category_id: normalizeCategoryId(productToEdit.category_id),
                    product_price: productToEdit.product_price.toString(),
                    product_brand: productToEdit.product_brand,
                    product_description: productToEdit.product_description,
                    product_stock: productToEdit.product_stock.toString(),
                    product_condition: (productToEdit.product_condition || "New").slice(0, MAX_META_LENGTH),
                    size_label: (productToEdit.size_label || "One Size").slice(0, MAX_META_LENGTH),
                    show_in_catalog: productToEdit.show_in_catalog,
                    image_id: productToEdit.image_id || "",
                });
                fetchProductImages(productToEdit.product_id);
            } else {
                resetForm();
            }
        }
    }, [isOpen, productToEdit]);

    useEffect(() => {
        if (!productToEdit) return;

        setFormData((prev) => {
            const availableIds = new Set(productImages.map((image) => String(image.image_id)));
            const currentImageId = String(prev.image_id || "");

            if (currentImageId && availableIds.has(currentImageId)) {
                return prev;
            }

            const fallbackImageId =
                productImages.find((image) => image.is_primary)?.image_id ||
                productImages[0]?.image_id ||
                "";

            return {
                ...prev,
                image_id: fallbackImageId ? String(fallbackImageId) : "",
            };
        });
    }, [productImages, productToEdit]);

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
        setStagedFiles((prev) => [...prev, ...files]);
    };

    const removeStagedFile = (index: number) => {
        setStagedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const uploadStagedImages = async (productId: string, session: SessionWithAccessToken) => {
        if (stagedFiles.length === 0) return { failedFiles: [] as string[] };

        const uploadResults = await Promise.all(
            stagedFiles.map(async (file) => {
                const imageFormData = new FormData();
                imageFormData.append("file", file);
                imageFormData.append("product_id", productId);

                const response = await fetch("/api/admin/upload-image", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: imageFormData,
                });

                if (!response.ok) {
                    return file.name;
                }

                return null;
            })
        );

        const failedFiles = uploadResults.filter((fileName): fileName is string => Boolean(fileName));

        if (failedFiles.length === 0) {
            setStagedFiles([]);
        }

        return { failedFiles };
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (actionLoading) return;
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
            const parsedCategoryId = Number.parseInt(formData.category_id, 10);

            if (Number.isNaN(parsedCategoryId)) {
                throw new Error('Invalid category. Please select a category.');
            }

            const parsedPrice = Number.parseFloat(formData.product_price);
            const parsedStock = Number.parseInt(formData.product_stock || "0", 10);

            if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
                throw new Error('Invalid price. Please enter a valid amount.');
            }

            if (Number.isNaN(parsedStock) || parsedStock < 0) {
                throw new Error('Invalid stock. Please enter 0 or a positive number.');
            }

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    ...(productToEdit && { product_id: productToEdit.product_id }),
                    product_name: formData.product_name.trim(),
                    category_id: parsedCategoryId,
                    product_price: parsedPrice,
                    product_brand: formData.product_brand.trim() || "Dolly's Closet",
                    product_description: formData.product_description.trim(),
                    product_stock: parsedStock,
                    product_condition: clampMetaText(formData.product_condition) || "New",
                    size_label: clampMetaText(formData.size_label) || "One Size",
                    show_in_catalog: formData.show_in_catalog,
                    image_id: formData.image_id || null,
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to save product');

            let failedUploads: string[] = [];

            // Upload staged images if this was a new product
            if (!productToEdit && data.product?.product_id && stagedFiles.length > 0) {
                const uploadResult = await uploadStagedImages(data.product.product_id, session as SessionWithAccessToken);
                failedUploads = uploadResult.failedFiles;
            }

            await onProductSaved();
            if (failedUploads.length > 0) {
                window.alert(`Product saved, but ${failedUploads.length} image(s) failed to upload. You can re-open Edit Product and upload again.`);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save product');
        } finally {
            setActionLoading(false);
        }
    };

    const categoryById = useMemo(
        () => new Map(categories.map((category) => [Number(category.category_id), category])),
        [categories]
    );

    const buildCategoryPathLabel = useCallback((category: Category) => {
        const path: string[] = [category.category_name];
        let parentId = category.parent_category;
        const visited = new Set<number>([Number(category.category_id)]);

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

    const categoriesWithChildren = useMemo(
        () => new Set(
            categories
                .map((category) => category.parent_category)
                .filter((parentId): parentId is number => parentId !== null)
        ),
        [categories]
    );

    const selectableCategories = useMemo(() => categories.filter((category) => {
        const categoryId = Number(category.category_id);
        const hasChildren = categoriesWithChildren.has(categoryId);
        const isRootCategory = category.parent_category === null;

        return !hasChildren && !isRootCategory;
    }), [categories, categoriesWithChildren]);

    const normalizedCategories = useMemo(() => [...selectableCategories]
        .sort((a, b) => Number(a.category_id) - Number(b.category_id))
        .map((cat) => ({
            ...cat,
            normalizedId: normalizeCategoryId(cat.category_id),
            displayLabel: buildCategoryPathLabel(cat),
        })), [selectableCategories, buildCategoryPathLabel]);

    const normalizedSelectedCategory = normalizeCategoryId(formData.category_id);

    const hasSelectedCategory = normalizedCategories.some(
        (cat) => cat.normalizedId === normalizedSelectedCategory
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0">
                <CardHeader className="flex flex-row items-center justify-between border-b p-6 space-y-0 text-gray-900">
                    <CardTitle className="text-gray-900">{productToEdit ? "Edit Product" : "Add Product"}</CardTitle>
                    <button onClick={onClose} disabled={actionLoading} className="text-gray-400 hover:text-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
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
                                <Select
                                    key={`category-${productToEdit?.product_id || "new"}-${normalizedSelectedCategory}-${normalizedCategories.length}`}
                                    value={normalizedSelectedCategory}
                                    onValueChange={(value) => setFormData({ ...formData, category_id: normalizeCategoryId(value) })}
                                >
                                    <SelectTrigger className="border-black text-black bg-white data-placeholder:text-black">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white text-black z-60">
                                        {normalizedSelectedCategory && !hasSelectedCategory && (
                                            <SelectItem value={normalizedSelectedCategory}>
                                                Current Category (ID: {normalizedSelectedCategory})
                                            </SelectItem>
                                        )}
                                        {normalizedCategories.length === 0 ? (
                                            <SelectItem value="none" disabled>No categories found</SelectItem>
                                        ) : (
                                            normalizedCategories.map((cat) => (
                                                <SelectItem key={cat.category_id} value={cat.normalizedId}>{cat.displayLabel}</SelectItem>
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
                                    onChange={(e) => setFormData({ ...formData, size_label: e.target.value.slice(0, MAX_META_LENGTH) })}
                                    maxLength={MAX_META_LENGTH}
                                    className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-800"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                                <Input
                                    placeholder="e.g., New, Good, 9/10"
                                    value={formData.product_condition}
                                    onChange={(e) => setFormData({ ...formData, product_condition: e.target.value.slice(0, MAX_META_LENGTH) })}
                                    maxLength={MAX_META_LENGTH}
                                    className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-800"
                                />
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
                        <Button type="button" variant="outline" onClick={onClose} disabled={actionLoading} className="flex-1 border-gray-300 text-gray-700 bg-white hover:bg-white hover:text-black transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-gray-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none">Cancel</Button>
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