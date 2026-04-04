"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Loader2, X, ChevronDown } from "lucide-react";
import { 
    createClient,
    InventoryProduct as Product,
    InventoryCategory as Category,
    InventoryProductImage as ProductImage,
    sanitizeMultilineInput,
    sanitizeMultilineText,
    sanitizeSingleLineInput,
    sanitizeSingleLineText,
    schemaExactLimits,
    uiContentLimits,
    uploadProductImageFile
} from "@dollys-closet/core";
import { 
    Button,
    Input,
    Textarea,
    Checkbox,
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    FormNotice
} from "@dollys-closet/ui";
import ProductImageUpload from "@/components/product-image-upload";
import ImageSelector from "@/components/image-selector";
import CategoryCascadingSelect from "@/components/CategoryCascadingSelect";
import { toast } from "sonner";
import { AdminDialogHeader } from "./AdminDialogHeader";
import { AdminDialogFooter } from "./AdminDialogFooter";
import DiscardChangesDialog from "@/components/dialogs/DiscardChangesDialog";

const SIZE_OPTIONS = ["One Size", "Free Size", "XS", "S", "M", "L", "XL", "XXL"];
const CONDITION_OPTIONS = ["New", "Like New", "Good", "Used", "Fair"];

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

const PRODUCT_DESCRIPTION_LIMIT = uiContentLimits.productDescription.maxLength;

const renderLengthMeta = (value: string, maxLength: number, recommendedLength?: string) =>
    recommendedLength
        ? `${value.length}/${maxLength} characters - Recommended ${recommendedLength}`
        : `${value.length}/${maxLength} characters`;

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

/**
 * AddProduct Modal Component
 * 
 * A comprehensive form for listing new products or updating existing inventory.
 * Handles complex state for product metadata, category selection, and image management.
 * 
 * Features:
 * - Dual Workflow: Supports both "Create" (POST) and "Edit" (PUT) operations.
 * - Image Staging: Allows previewing and removing images before final submission.
 * - Form Guard: Intercepts close attempts if unsaved changes are detected.
 * - Real-time Validation: Disables save if required fields (Name, Category, Price) are missing.
 */
export default function AddProduct({ isOpen, onClose, categories, productToEdit, onProductSaved }: AddProductProps) {
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stagedFiles, setStagedFiles] = useState<File[]>([]);
    const [productImages, setProductImages] = useState<ProductImage[]>([]);
    const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
    const sizeDropdownRef = useRef<HTMLDivElement>(null);
    const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false);
    const conditionDropdownRef = useRef<HTMLDivElement>(null);

    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [formData, setFormData] = useState({
        product_name: "",
        category_id: "",
        product_price: "",
        product_brand: "",
        product_description: "",
        product_stock: "1",
        product_condition: "New",
        size_label: "",
        show_in_catalog: true,
        image_id: "",
    });

    useEffect(() => {
        if (!sizeDropdownOpen) return;
        const handleOutsideClick = (e: MouseEvent) => {
            if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(e.target as Node)) {
                setSizeDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [sizeDropdownOpen]);

    useEffect(() => {
        if (!conditionDropdownOpen) return;
        const handleOutsideClick = (e: MouseEvent) => {
            if (conditionDropdownRef.current && !conditionDropdownRef.current.contains(e.target as Node)) {
                setConditionDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [conditionDropdownOpen]);

    /**
     * Determines if the user has modified any form fields compared to the 
     * initial state or the loaded product data.
     * @returns Boolean indicating if there is unsaved progress.
     */
    const hasUnsavedChanges = useCallback(() => {
        const normalizeString = (str: string | null | undefined) => (str || "").trim();
        if (productToEdit) {
            return (
                formData.product_name !== productToEdit.product_name ||
                formData.category_id !== normalizeCategoryId(productToEdit.category_id) ||
                formData.product_price !== productToEdit.product_price.toString() ||
                formData.product_brand !== normalizeString(productToEdit.product_brand) ||
                formData.product_description !== normalizeString(productToEdit.product_description) ||
                formData.product_stock !== productToEdit.product_stock.toString() ||
                formData.product_condition !== sanitizeSingleLineInput(productToEdit.product_condition || "New", schemaExactLimits.productCondition) ||
                formData.size_label !== sanitizeSingleLineInput(productToEdit.size_label || "One Size", schemaExactLimits.productSizeLabel) ||
                formData.show_in_catalog !== productToEdit.show_in_catalog ||
                stagedFiles.length > 0
            );
        }
        return (
            formData.product_name !== "" ||
            formData.category_id !== "" ||
            formData.product_price !== "" ||
            formData.product_brand !== "" ||
            formData.product_description !== "" ||
            formData.product_stock !== "1" ||
            formData.product_condition !== "New" ||
            formData.size_label !== "" ||
            formData.show_in_catalog !== true ||
            stagedFiles.length > 0
        );
    }, [formData, productToEdit, stagedFiles.length]);

    const handleClose = useCallback(() => {
        if (hasUnsavedChanges()) {
            setShowDiscardConfirm(true);
        } else {
            onClose();
        }
    }, [hasUnsavedChanges, onClose]);

    const trimmedProductName = formData.product_name.trim();
    const trimmedCategoryId = formData.category_id.trim();
    const trimmedPrice = formData.product_price.trim();
    const trimmedStock = formData.product_stock.trim();
    const parsedPricePreview = trimmedPrice === "" ? null : Number.parseFloat(trimmedPrice);
    const parsedStockPreview = trimmedStock === "" ? 0 : Number.parseInt(trimmedStock, 10);

    const missingRequiredFields = useMemo(() => {
        const missingFields: string[] = [];

        if (!trimmedProductName) missingFields.push("product name");
        if (!trimmedCategoryId) missingFields.push("category");
        if (!trimmedPrice) missingFields.push("price");

        return missingFields;
    }, [trimmedCategoryId, trimmedPrice, trimmedProductName]);

    const hasInvalidPrice = trimmedPrice !== "" && (!Number.isFinite(parsedPricePreview) || (parsedPricePreview ?? 0) < 0);
    const hasInvalidStock = trimmedStock !== "" && (!Number.isInteger(parsedStockPreview) || parsedStockPreview < 0);
    const isSaveBlocked = actionLoading || missingRequiredFields.length > 0 || hasInvalidPrice || hasInvalidStock;
    const formStatusMessage = missingRequiredFields.length > 0
        ? `Add ${missingRequiredFields.join(", ")} to continue.`
        : hasInvalidPrice
            ? "Enter a valid price of 0 or higher."
            : hasInvalidStock
                ? "Stock must be a whole number of 0 or higher."
                : productToEdit
                    ? "Review your updates, then save when you're ready."
                    : "Required fields are complete. You can save this product now.";

    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !actionLoading) {
                handleClose();
            }
        };

        document.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [actionLoading, handleClose, isOpen]);

    useEffect(() => {
        if (isOpen) {
            if (productToEdit) {
                setFormData({
                    product_name: sanitizeSingleLineInput(productToEdit.product_name, schemaExactLimits.productName),
                    category_id: normalizeCategoryId(productToEdit.category_id),
                    product_price: productToEdit.product_price.toString(),
                    product_brand: sanitizeSingleLineInput(productToEdit.product_brand, schemaExactLimits.productBrand),
                    product_description: sanitizeMultilineInput(productToEdit.product_description, PRODUCT_DESCRIPTION_LIMIT),
                    product_stock: productToEdit.product_stock.toString(),
                    product_condition: sanitizeSingleLineInput(productToEdit.product_condition || "New", schemaExactLimits.productCondition),
                    size_label: sanitizeSingleLineInput(productToEdit.size_label || "One Size", schemaExactLimits.productSizeLabel),
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
            product_stock: "1",
            product_condition: "New",
            size_label: "",
            show_in_catalog: true,
            image_id: "",
        });
        setStagedFiles([]);
        setProductImages([]);
        setError(null);
    };

    /**
     * Fetches product images from the backend for a specific product.
     * Hits the /api/admin/images endpoint and stores the images in state.
     * @param productId - The unique identifier of the product.
     */
    const fetchProductImages = async (productId: string) => {
        try {
            const response = await fetch(`/api/admin/images?product_id=${productId}`);
            if (response.ok) {
                const result = await response.json();
                setProductImages(result.data || []);
            }
        } catch (err) {
            console.error('Error fetching images:', err);
        }
    };

    const addStagedFiles = (files: File[]) => {
        setStagedFiles((prev) => [...prev, ...files].slice(0, 5));
    };

    const removeStagedFile = (index: number) => {
        setStagedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    /**
     * Uploads any newly staged product images to the backend.
     * Specifically sends POST requests with a FormData payload to /api/admin/images.
     * @param productId - The unique identifier of the product for which images are being uploaded.
     * @param session - An object containing the current user's access token for authorization.
     * @returns An object containing a list of `failedFiles` which didn't successfully upload.
     */
    const uploadStagedImages = async (productId: string, session: SessionWithAccessToken) => {
        if (stagedFiles.length === 0) return { failedFiles: [] as string[] };

        const failedFiles: string[] = [];

        for (const [index, file] of stagedFiles.entries()) {
            try {
                await uploadProductImageFile({
                    accessToken: session.access_token,
                    displayOrder: index + 1,
                    file,
                    isPrimary: index === 0,
                    productId,
                });
            } catch (err) {
                console.error("Upload error for:", file.name, err);
                failedFiles.push(file.name);
            }
        }

        setStagedFiles([]);

        return { failedFiles };
    };

    /**
     * Handles creating or updating a product on the backend.
     * Communicates with either /api/admin/products or /api/admin/products endpoints.
     * Also triggers the uploading of staged image files after a successful product creation.
     * @param e - Form submission event.
     */
    /**
     * Orchestrates the final submission of product data.
     * 1. Validates input constraints (Price, Stock).
     * 2. Synchronizes metadata with the appropriate /api/admin endpoint.
     * 3. Triggers `uploadStagedImages` if the product was successfully created.
     * @param e - React FormEvent.
     */
    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (actionLoading) return;
        setActionLoading(true);
        setError(null);
        try {
            if (!formData.product_name || !formData.category_id || !formData.product_price) {
                throw new Error('Please fill in all required fields');
            }
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const endpoint = productToEdit ? '/api/admin/products' : '/api/admin/products';
            const method = productToEdit ? 'PUT' : 'POST';
            const parsedCategoryId = Number.parseInt(formData.category_id, 10);
            const normalizedProductName = sanitizeSingleLineText(formData.product_name, schemaExactLimits.productName);
            const normalizedBrand = sanitizeSingleLineText(formData.product_brand, schemaExactLimits.productBrand) || "Dolly's Closet";
            const normalizedDescription = sanitizeMultilineText(formData.product_description, PRODUCT_DESCRIPTION_LIMIT);
            const normalizedCondition = sanitizeSingleLineText(formData.product_condition, schemaExactLimits.productCondition) || "New";
            const normalizedSizeLabel = sanitizeSingleLineText(formData.size_label, schemaExactLimits.productSizeLabel) || "One Size";

            if (Number.isNaN(parsedCategoryId)) {
                throw new Error('Invalid category. Please select a category.');
            }

            if (!normalizedProductName) {
                throw new Error('Please enter a product name.');
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
                    product_name: normalizedProductName,
                    category_id: parsedCategoryId,
                    product_price: parsedPrice,
                    product_brand: normalizedBrand,
                    product_description: normalizedDescription,
                    product_stock: parsedStock,
                    product_condition: normalizedCondition,
                    size_label: normalizedSizeLabel,
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

            if (failedUploads.length > 0) {
                toast.warning(`Product saved, but ${failedUploads.length} image(s) failed to upload. You can re-open Edit Product and upload again.`);
            } else {
                toast.success(productToEdit ? "Product updated successfully." : "Product added successfully.");
            }

            try {
                await onProductSaved();
            } catch {
                // Product was saved — don't show an error, the success toast already fired
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save product';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(event) => {
            if (event.target === event.currentTarget && !actionLoading) {
                handleClose();
            }
        }}>
            <Card className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
                <AdminDialogHeader 
                    title={productToEdit ? "Edit Product" : "Add New Product"}
                    description={productToEdit ? "Update details for this curated piece." : "Add a new curator pick to your boutique's collection."}
                    onClose={handleClose}
                    isLoading={actionLoading}
                />

                <form onSubmit={handleSaveProduct} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 overflow-y-auto">
                    <fieldset disabled={actionLoading} className={`m-0 border-none p-0 ${actionLoading ? "pointer-events-none opacity-75" : ""}`}>
                        <CardContent className="space-y-5 pt-2 px-6 pb-6">
                            <FormNotice>
                                {formStatusMessage}
                            </FormNotice>
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
                                onChange={(e) => setFormData({ ...formData, product_name: sanitizeSingleLineInput(e.target.value, schemaExactLimits.productName) })}
                                maxLength={schemaExactLimits.productName}
                                required
                                aria-invalid={!trimmedProductName}
                                className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-400"
                            />
                            <p className="mt-1 flex items-center justify-between gap-3 text-xs text-gray-500">
                                <span>Use the name shoppers should recognize in the catalog.</span>
                                <span>{renderLengthMeta(formData.product_name, schemaExactLimits.productName)}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
                                <CategoryCascadingSelect
                                    categories={categories}
                                    value={formData.category_id}
                                    onValueChange={(value) => setFormData({ ...formData, category_id: normalizeCategoryId(value) })}
                                    placeholder="Select category"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Choose the most specific category available so filtering works well.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Price <span className="text-red-500">*</span></label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.product_price}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "" || Number(val) >= 0) {
                                            setFormData({ ...formData, product_price: val });
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (['-', '+', 'e', 'E'].includes(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                    required
                                    aria-invalid={hasInvalidPrice || !trimmedPrice}
                                    className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-400"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Enter the selling price in Philippine pesos.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                                <Input
                                    placeholder="e.g., Gucci"
                                    value={formData.product_brand}
                                    onChange={(e) => setFormData({ ...formData, product_brand: sanitizeSingleLineInput(e.target.value, schemaExactLimits.productBrand) })}
                                    maxLength={schemaExactLimits.productBrand}
                                    className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-400"
                                />
                                <p className="mt-1 text-right text-xs text-gray-500">
                                    {renderLengthMeta(formData.product_brand, schemaExactLimits.productBrand)}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={formData.product_stock}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "" || Number(val) >= 0) {
                                            setFormData({ ...formData, product_stock: val });
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                    aria-invalid={hasInvalidStock}
                                    className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-400"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Use <span className="font-medium">0</span> for sold out items.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Size Label</label>
                                <div className="relative" ref={sizeDropdownRef}>
                                    <div className="flex h-9 w-full rounded-md bg-white" style={{ border: '1px solid #101722' }}> 
                                        <input
                                            value={formData.size_label}
                                            readOnly
                                            onClick={() => setSizeDropdownOpen((prev) => !prev)}
                                            placeholder="e.g., M, L, One Size"
                                            className="flex-1 min-w-0 rounded-l-md px-3 text-sm text-gray-900 bg-transparent placeholder:text-gray-400 outline-none cursor-pointer"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setSizeDropdownOpen((prev) => !prev)}
                                            className="shrink-0 px-2 rounded-r-md bg-white hover:bg-gray-50 transition-colors"
                                            aria-label="Show size presets"
                                        >
                                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${sizeDropdownOpen ? "rotate-180" : ""}`} />
                                        </button>
                                    </div>
                                    {sizeDropdownOpen && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                                            {SIZE_OPTIONS.map((size) => (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setFormData({ ...formData, size_label: size });
                                                        setSizeDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-pink-50 hover:text-[#E7A3B0] transition-colors ${formData.size_label === size ? "bg-pink-50 text-[#E7A3B0] font-medium" : "text-gray-700"}`}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="mt-1 text-right text-xs text-gray-500">
                                    {renderLengthMeta(formData.size_label, schemaExactLimits.productSizeLabel)}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                                <div className="relative" ref={conditionDropdownRef}>
                                    <div className="flex h-9 w-full rounded-md bg-white" style={{ border: '1px solid #101722' }}>
                                        <input
                                            value={formData.product_condition}
                                            readOnly
                                            onClick={() => setConditionDropdownOpen((prev) => !prev)}
                                            placeholder="e.g., New, Good, Used"
                                            className="flex-1 min-w-0 rounded-l-md px-3 text-sm text-gray-900 bg-transparent placeholder:text-gray-400 outline-none cursor-pointer"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setConditionDropdownOpen((prev) => !prev)}
                                            className="shrink-0 px-2 rounded-r-md bg-white hover:bg-gray-50 transition-colors"
                                            aria-label="Show condition presets"
                                        >
                                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${conditionDropdownOpen ? "rotate-180" : ""}`} />
                                        </button>
                                    </div>
                                    {conditionDropdownOpen && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                                            {CONDITION_OPTIONS.map((cond) => (
                                                <button
                                                    key={cond}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setFormData({ ...formData, product_condition: cond });
                                                        setConditionDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-pink-50 hover:text-[#E7A3B0] transition-colors ${formData.product_condition === cond ? "bg-pink-50 text-[#E7A3B0] font-medium" : "text-gray-700"}`}
                                                >
                                                    {cond}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="mt-1 text-right text-xs text-gray-500">
                                    {renderLengthMeta(formData.product_condition, schemaExactLimits.productCondition)}
                                </p>
                            </div>
                        </div>

                        {!productToEdit ? (
                            <div className="space-y-2">
                                <ImageSelector
                                    stagedFiles={stagedFiles}
                                    onFilesAdd={addStagedFiles}
                                    onFileRemove={removeStagedFile}
                                />
                                <p className="text-xs text-gray-500">
                                    You can add up to 5 images. The first uploaded image becomes the primary one.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <ProductImageUpload
                                    productId={productToEdit?.product_id || null}
                                    images={productImages}
                                    onImagesChange={setProductImages}
                                    loading={actionLoading}
                                />
                                <p className="text-xs text-gray-500">
                                    Reorder images to control which photo appears first in the catalog.
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <Textarea
                                placeholder="Enter product description"
                                value={formData.product_description}
                                onChange={(e) => setFormData({ ...formData, product_description: sanitizeMultilineInput(e.target.value, PRODUCT_DESCRIPTION_LIMIT) })}
                                maxLength={PRODUCT_DESCRIPTION_LIMIT}
                                rows={5}
                                className="field-sizing-fixed w-full overflow-x-hidden whitespace-pre-wrap wrap-anywhere border border-gray-300 rounded px-3 py-2 min-h-[112px] focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white text-gray-900 placeholder:text-gray-400 resize-y"
                            />
                            <p className="mt-1 text-right text-xs text-gray-500">
                                {renderLengthMeta(formData.product_description, PRODUCT_DESCRIPTION_LIMIT, uiContentLimits.productDescription.recommendedLength)}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="show_in_catalog"
                                    checked={formData.show_in_catalog}
                                    onCheckedChange={(checked) => setFormData({ ...formData, show_in_catalog: checked as boolean })}
                                    className="border border-black data-[state=unchecked]:border-black"
                                />
                                <label htmlFor="show_in_catalog" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Show in Catalog
                                </label>
                            </div>
                            <p className="text-xs text-gray-500">
                                Turn this off if the item should stay in inventory but remain hidden from customers.
                            </p>
                        </div>
                        </CardContent>
                    </fieldset>
                    </div>

                    <AdminDialogFooter 
                        onCancel={handleClose}
                        statusMessage={formStatusMessage}
                        actionLabel={productToEdit ? "Save Changes" : "Add Product"}
                        isLoading={actionLoading}
                        isActionDisabled={isSaveBlocked}
                    />
                </form>
            </Card>

            <DiscardChangesDialog
                isOpen={showDiscardConfirm}
                onOpenChange={setShowDiscardConfirm}
                onDiscard={onClose}
            />
        </div>
    );
}
