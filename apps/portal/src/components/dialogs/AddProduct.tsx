"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { 
    createClient,
    InventoryProduct as Product,
    InventoryCategory as Category,
    InventoryProductImage as ProductImage,
    ProductDiscount,
    Season,
    discountHelper,
    sanitizeMultilineInput,
    sanitizeMultilineText,
    sanitizeSingleLineInput,
    sanitizeSingleLineText,
    schemaExactLimits,
    uiContentLimits,
    uploadProductImageFile
} from "@dollys-closet/core";
import { 
    Input,
    Textarea,
    Checkbox,
    Card,
    CardContent,
    FormNotice,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
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
    existingProducts?: Product[];
    discounts?: ProductDiscount[];
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
export default function AddProduct({ isOpen, onClose, categories, productToEdit, onProductSaved, existingProducts = [], discounts = [] }: AddProductProps) {
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stagedFiles, setStagedFiles] = useState<File[]>([]);
    const [productImages, setProductImages] = useState<ProductImage[]>([]);
    const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
    const sizeDropdownRef = useRef<HTMLDivElement>(null);
    const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false);
    const conditionDropdownRef = useRef<HTMLDivElement>(null);
    const [discountEnabled, setDiscountEnabled] = useState(false);
    const [selectedDiscountId, setSelectedDiscountId] = useState("");
    const [discountSearch, setDiscountSearch] = useState("");
    const [discountDropdownOpen, setDiscountDropdownOpen] = useState(false);
    const discountDropdownRef = useRef<HTMLDivElement>(null);
    const discountDropdownMobileRef = useRef<HTMLDivElement>(null);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loadingSeasons, setLoadingSeasons] = useState(false);

    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [formData, setFormData] = useState({
        product_name: "",
        category_id: "",
        product_price: "",
        product_brand: "",
        product_description: "",
        product_stock: "1",
        product_condition: "",
        size_label: "",
        show_in_catalog: true,
        season_id: "",
        image_id: "",
    });

    const selectedDiscount = useMemo(
        () => discounts.find((discount) => String(discount.id) === selectedDiscountId) || null,
        [discounts, selectedDiscountId]
    );

    const filteredDiscounts = useMemo(
        () => discounts.filter((d) => d.discount_name.toLowerCase().includes(discountSearch.toLowerCase())),
        [discounts, discountSearch]
    );

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

    useEffect(() => {
        if (!discountDropdownOpen) return;
        const handleOutsideClick = (e: MouseEvent) => {
            const inDesktop = discountDropdownRef.current?.contains(e.target as Node);
            const inMobile = discountDropdownMobileRef.current?.contains(e.target as Node);
            if (!inDesktop && !inMobile) {
                setDiscountDropdownOpen(false);
                setDiscountSearch("");
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [discountDropdownOpen]);

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
                formData.product_condition !== sanitizeSingleLineInput(productToEdit.product_condition || "", schemaExactLimits.productCondition) ||
                formData.size_label !== sanitizeSingleLineInput(productToEdit.size_label || "", schemaExactLimits.productSizeLabel) ||
                formData.show_in_catalog !== productToEdit.show_in_catalog ||
                discountEnabled !== Boolean(productToEdit.discount) ||
                selectedDiscountId !== String(productToEdit.discount?.id || "") ||
                formData.season_id !== String(productToEdit.season_id || "") ||
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
            formData.season_id !== "" ||
            discountEnabled !== false ||
            selectedDiscountId !== "" ||
            stagedFiles.length > 0
        );
    }, [discountEnabled, formData, productToEdit, selectedDiscountId, stagedFiles.length]);

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
    const previewDiscountedPrice = useMemo(() => {
        if (!selectedDiscount || !trimmedPrice) return null;
        const basePrice = Number.parseFloat(trimmedPrice);
        if (!Number.isFinite(basePrice)) return null;

        return discountHelper.calculateDiscountedPrice(basePrice, selectedDiscount);
    }, [selectedDiscount, trimmedPrice]);

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
    const filteredSizeOptions = useMemo(() => {
        const normalizedInput = (formData.size_label || "").trim().toLowerCase();
        if (!normalizedInput) return SIZE_OPTIONS;
        return SIZE_OPTIONS.filter((size) => size.toLowerCase().includes(normalizedInput));
    }, [formData.size_label]);

    const filteredConditionOptions = useMemo(() => {
        const normalizedInput = (formData.product_condition || "").trim().toLowerCase();
        if (!normalizedInput) return CONDITION_OPTIONS;
        return CONDITION_OPTIONS.filter((cond) => cond.toLowerCase().includes(normalizedInput));
    }, [formData.product_condition]);
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
                setError(null);
                setFormData({
                    product_name: sanitizeSingleLineInput(productToEdit.product_name, schemaExactLimits.productName),
                    category_id: normalizeCategoryId(productToEdit.category_id),
                    product_price: productToEdit.product_price.toString(),
                    product_brand: sanitizeSingleLineInput(productToEdit.product_brand, schemaExactLimits.productBrand),
                    product_description: sanitizeMultilineInput(productToEdit.product_description, PRODUCT_DESCRIPTION_LIMIT),
                    product_stock: productToEdit.product_stock.toString(),
                    product_condition: sanitizeSingleLineInput(productToEdit.product_condition || "", schemaExactLimits.productCondition),
                    size_label: sanitizeSingleLineInput(productToEdit.size_label || "", schemaExactLimits.productSizeLabel),
                    show_in_catalog: productToEdit.show_in_catalog,
                    season_id: String(productToEdit.season_id || ""),
                    image_id: productToEdit.image_id || "",
                });
                setDiscountEnabled(Boolean(productToEdit.discount));
                setSelectedDiscountId(String(productToEdit.discount?.id || ""));
                fetchProductImages(productToEdit.product_id);
            } else {
                resetForm();
                setDiscountEnabled(false);
                setSelectedDiscountId("");
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
        const lastCategoryId = existingProducts.length > 0
            ? normalizeCategoryId(existingProducts[0].category_id)
            : "";
        setFormData({
            product_name: "",
            category_id: lastCategoryId,
            product_price: "",
            product_brand: "",
            product_description: "",
            product_stock: "1",
            product_condition: "New",
            size_label: "",
            show_in_catalog: true,
            season_id: "",
            image_id: "",
        });
        setDiscountEnabled(false);
        setSelectedDiscountId("");
        setDiscountSearch("");
        setStagedFiles([]);
        setProductImages([]);
        setError(null);
    };

    useEffect(() => {
        if (!isOpen) return;

        const fetchSeasons = async () => {
            setLoadingSeasons(true);
            try {
                const response = await fetch("/api/admin/seasons", { cache: "no-store" });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || "Failed to fetch seasons");
                setSeasons(result.data || []);
            } catch (err) {
                console.error("Failed to load seasons:", err);
                setSeasons([]);
            } finally {
                setLoadingSeasons(false);
            }
        };

        fetchSeasons();
    }, [isOpen]);

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
            const normalizedCondition = sanitizeSingleLineText(formData.product_condition, schemaExactLimits.productCondition) || "";
            const normalizedSizeLabel = sanitizeSingleLineText(formData.size_label, schemaExactLimits.productSizeLabel) || "";

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

            const duplicateProduct = existingProducts.find((candidate) => {
                if (productToEdit && candidate.product_id === productToEdit.product_id) return false;
                return (
                    sanitizeSingleLineText(candidate.product_name, schemaExactLimits.productName).toLowerCase() === normalizedProductName.toLowerCase() &&
                    normalizeCategoryId(candidate.category_id) === String(parsedCategoryId) &&
                    Number(candidate.product_price) === parsedPrice
                );
            });

            if (duplicateProduct) {
                throw new Error('A product with the same name, category, and price already exists. Change at least one of these fields before saving.');
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
                    discount_id: discountEnabled ? selectedDiscountId || null : null,
                    season_id: formData.season_id || null,
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
            <Card className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0 md:gap-6" onClick={(event) => event.stopPropagation()}>
                <AdminDialogHeader 
                    title={productToEdit ? "Edit Product" : "Add New Product"}
                    description={productToEdit ? "Update details for this curated piece." : "Add a new curator pick to your boutique's collection."}
                    onClose={handleClose}
                    isLoading={actionLoading}
                />

                <form onSubmit={handleSaveProduct} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 overflow-y-auto">
                    <fieldset disabled={actionLoading} className={`m-0 border-none p-0 ${actionLoading ? "pointer-events-none opacity-75" : ""}`}>
                        <CardContent className="space-y-3 md:space-y-5 pt-2 px-4 md:px-6 pb-4 md:pb-6">
                            <FormNotice className="hidden md:block">
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
                                <span className="hidden md:inline">Use the name shoppers should recognize in the catalog.</span>
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
                                <p className="hidden md:block mt-1 text-xs text-gray-500">
                                    Choose the most specific category available so filtering works well.
                                </p>
                            </div>

                            {/* Desktop-only: Price next to Category */}
                            <div className="hidden md:block">
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
                                <p className="hidden md:block mt-1 text-xs text-gray-500">
                                    Enter the selling price in Philippine pesos.
                                </p>
                            </div>

                            {/* Mobile-only: Price + Stock side by side */}
                            <div className="col-span-full md:hidden grid grid-cols-2 gap-3">
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
                                        aria-invalid={hasInvalidPrice || !trimmedPrice}
                                        className="border-gray-300 text-gray-900 bg-white placeholder:text-gray-400"
                                    />
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
                                                const isZeroStock = val === "0" || val === "";
                                                setFormData({
                                                    ...formData,
                                                    product_stock: val,
                                                    show_in_catalog: isZeroStock ? false : formData.show_in_catalog,
                                                });
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
                                </div>
                            </div>

                            {/* Mobile-only: Product Images */}
                            <div className="md:hidden col-span-full">
                                {!productToEdit ? (
                                    <div className="space-y-2">
                                        <ImageSelector
                                            stagedFiles={stagedFiles}
                                            onFilesAdd={addStagedFiles}
                                            onFileRemove={removeStagedFile}
                                            onReorder={setStagedFiles}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <ProductImageUpload
                                            productId={productToEdit?.product_id || null}
                                            images={productImages}
                                            onImagesChange={setProductImages}
                                            loading={actionLoading}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Desktop-only: Season (on mobile it moves to the bottom) */}
                            <div className="hidden md:block">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Season</label>
                                <Select
                                    value={formData.season_id || "none"}
                                    onValueChange={(value) => setFormData({ ...formData, season_id: value === "none" ? "" : value })}
                                >
                                    <SelectTrigger className="border-gray-300 bg-white text-gray-900">
                                        <SelectValue placeholder={loadingSeasons ? "Loading seasons..." : "No season"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No season</SelectItem>
                                        {seasons.map((season) => (
                                            <SelectItem key={season.id} value={season.id}>{season.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="hidden md:block mt-1 text-xs text-gray-500">
                                    Optional. Leave empty if this item is not seasonal.
                                </p>
                            </div>
                        </div>

                        <div className="hidden md:block rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    checked={discountEnabled}
                                    onCheckedChange={(checked) => {
                                        const nextEnabled = Boolean(checked);
                                        setDiscountEnabled(nextEnabled);
                                        if (!nextEnabled) {
                                            setSelectedDiscountId("");
                                            setDiscountSearch("");
                                            setDiscountDropdownOpen(false);
                                        }
                                    }}
                                    className="!border-gray-600"
                                />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-gray-900">Apply discount code</p>
                                    <p className="hidden md:block text-xs text-gray-500">
                                        Pick an active sale code to attach to this product.
                                    </p>
                                </div>
                            </div>

                            {discountEnabled && (
                                <div className="space-y-3 pl-7">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Discount Code</label>
                                        <div className="relative" ref={discountDropdownRef}>
                                            <div className="flex items-center border border-gray-300 rounded-md bg-white overflow-hidden focus-within:ring-2 focus-within:ring-pink-300 focus-within:border-pink-300">
                                                <input
                                                    type="text"
                                                    value={discountDropdownOpen ? discountSearch : (selectedDiscount?.discount_name || "")}
                                                    placeholder={discounts.length > 0 ? "Search discount..." : "No discounts created yet"}
                                                    onChange={(e) => { setDiscountSearch(e.target.value); setDiscountDropdownOpen(true); }}
                                                    onFocus={() => { setDiscountDropdownOpen(true); setDiscountSearch(""); }}
                                                    className="flex-1 min-w-0 px-3 py-2 text-base md:text-sm text-gray-900 bg-transparent outline-none placeholder:text-gray-400"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setDiscountDropdownOpen((prev) => !prev)}
                                                    className="shrink-0 px-2 py-2 hover:bg-gray-50 transition-colors"
                                                    aria-label="Toggle discount dropdown"
                                                >
                                                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${discountDropdownOpen ? "rotate-180" : ""}`} />
                                                </button>
                                            </div>
                                            {discountDropdownOpen && (
                                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                    {filteredDiscounts.length > 0 ? filteredDiscounts.map((discount) => (
                                                        <button
                                                            key={discount.id}
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setSelectedDiscountId(String(discount.id));
                                                                setDiscountDropdownOpen(false);
                                                                setDiscountSearch("");
                                                            }}
                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-pink-50 hover:text-[#E7A3B0] transition-colors ${selectedDiscountId === String(discount.id) ? "bg-pink-50 text-[#E7A3B0] font-medium" : "text-gray-700"}`}
                                                        >
                                                            {discount.discount_name}
                                                        </button>
                                                    )) : (
                                                        <p className="px-3 py-2 text-sm text-gray-500">
                                                            {discounts.length === 0 ? "No discounts created yet" : "No matches found"}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {selectedDiscount && (
                                        <div className="rounded-lg border border-[#E7A3B0]/15 bg-white px-3 py-2 text-sm text-gray-700">
                                            <p className="font-semibold text-gray-900">{selectedDiscount.discount_name}</p>
                                            <p className="text-xs text-gray-500">
                                                {selectedDiscount.discount_type === "percent"
                                                    ? `${selectedDiscount.discount_value}% off`
                                                    : selectedDiscount.discount_type === "fixed_price"
                                                        ? `Final price ₱${selectedDiscount.discount_value.toFixed(2)}`
                                                        : `₱${selectedDiscount.discount_value.toFixed(2)} off`}
                                                {selectedDiscount.ends_at ? ` • Ends ${new Date(selectedDiscount.ends_at).toLocaleString()}` : ""}
                                            </p>
                                            {previewDiscountedPrice !== null && (
                                                <p className="mt-1 text-xs font-medium text-[#b96d7d]">
                                                    Sale preview: ₱{previewDiscountedPrice.toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
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

                            <div className="hidden md:block">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={formData.product_stock}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "" || Number(val) >= 0) {
                                            const isZeroStock = val === "0" || val === "";
                                            setFormData({
                                                ...formData,
                                                product_stock: val,
                                                show_in_catalog: isZeroStock ? false : formData.show_in_catalog,
                                            });
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
                                <p className="hidden md:block mt-1 text-xs text-gray-500">
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
                                            onChange={(e) => {
                                                setFormData({
                                                    ...formData,
                                                    size_label: sanitizeSingleLineInput(e.target.value, schemaExactLimits.productSizeLabel),
                                                });
                                                setSizeDropdownOpen(true);
                                            }}
                                            onFocus={() => setSizeDropdownOpen(true)}
                                            placeholder="e.g., M, L, One Size"
                                            maxLength={schemaExactLimits.productSizeLabel}
                                            className="flex-1 min-w-0 rounded-l-md px-3 text-sm text-gray-900 bg-transparent placeholder:text-gray-400 outline-none"
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
                                            {filteredSizeOptions.length > 0 ? filteredSizeOptions.map((size) => (
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
                                            )) : (
                                                <p className="px-3 py-2 text-sm text-gray-500">No matching presets</p>
                                            )}
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
                                            onChange={(e) => {
                                                setFormData({ ...formData, product_condition: sanitizeSingleLineInput(e.target.value, schemaExactLimits.productCondition) });
                                                setConditionDropdownOpen(true);
                                            }}
                                            onFocus={() => setConditionDropdownOpen(true)}
                                            placeholder="e.g., New, Good, Used"
                                            maxLength={schemaExactLimits.productCondition}
                                            className="flex-1 min-w-0 rounded-l-md px-3 text-sm text-gray-900 bg-transparent placeholder:text-gray-400 outline-none"
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
                                            {filteredConditionOptions.length > 0 ? filteredConditionOptions.map((cond) => (
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
                                            )) : (
                                                <p className="px-3 py-2 text-sm text-gray-500">No matching presets</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="mt-1 text-right text-xs text-gray-500">
                                    {renderLengthMeta(formData.product_condition, schemaExactLimits.productCondition)}
                                </p>
                            </div>
                        </div>

                        {/* Desktop-only: Product Images in original position */}
                        <div className="hidden md:block">
                        {!productToEdit ? (
                            <div className="space-y-2">
                                <ImageSelector
                                    stagedFiles={stagedFiles}
                                    onFilesAdd={addStagedFiles}
                                    onFileRemove={removeStagedFile}
                                    onReorder={setStagedFiles}
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
                        </div>

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
                                    className="!border-gray-600"
                                />
                                <label htmlFor="show_in_catalog" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Show in Catalog
                                </label>
                            </div>
                            <p className="hidden md:block text-xs text-gray-500">
                                Turn this off if the item should stay in inventory but remain hidden from customers.
                            </p>
                        </div>

                        {/* Mobile-only: Season at bottom */}
                        <div className="md:hidden">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Season</label>
                            <Select
                                value={formData.season_id || "none"}
                                onValueChange={(value) => setFormData({ ...formData, season_id: value === "none" ? "" : value })}
                            >
                                <SelectTrigger className="border-gray-300 bg-white text-gray-900">
                                    <SelectValue placeholder={loadingSeasons ? "Loading seasons..." : "No season"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No season</SelectItem>
                                    {seasons.map((season) => (
                                        <SelectItem key={season.id} value={season.id}>{season.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Mobile-only: Discount at bottom */}
                        <div className="md:hidden rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    checked={discountEnabled}
                                    onCheckedChange={(checked) => {
                                        const nextEnabled = Boolean(checked);
                                        setDiscountEnabled(nextEnabled);
                                        if (!nextEnabled) {
                                            setSelectedDiscountId("");
                                            setDiscountSearch("");
                                            setDiscountDropdownOpen(false);
                                        }
                                    }}
                                    className="!border-gray-600"
                                />
                                <p className="text-sm font-semibold text-gray-900">Apply discount code</p>
                            </div>

                            {discountEnabled && (
                                <div className="space-y-3 pl-7">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Discount Code</label>
                                        <div className="relative" ref={discountDropdownMobileRef}>
                                            <div className="flex items-center border border-gray-300 rounded-md bg-white overflow-hidden focus-within:ring-2 focus-within:ring-pink-300 focus-within:border-pink-300">
                                                <input
                                                    type="text"
                                                    value={discountDropdownOpen ? discountSearch : (selectedDiscount?.discount_name || "")}
                                                    placeholder={discounts.length > 0 ? "Search discount..." : "No discounts created yet"}
                                                    onChange={(e) => { setDiscountSearch(e.target.value); setDiscountDropdownOpen(true); }}
                                                    onFocus={() => { setDiscountDropdownOpen(true); setDiscountSearch(""); }}
                                                    className="flex-1 min-w-0 px-3 py-2 text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-400"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setDiscountDropdownOpen((prev) => !prev)}
                                                    className="shrink-0 px-2 py-2 hover:bg-gray-50 transition-colors"
                                                    aria-label="Toggle discount dropdown"
                                                >
                                                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${discountDropdownOpen ? "rotate-180" : ""}`} />
                                                </button>
                                            </div>
                                            {discountDropdownOpen && (
                                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                    {filteredDiscounts.length > 0 ? filteredDiscounts.map((discount) => (
                                                        <button
                                                            key={discount.id}
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setSelectedDiscountId(String(discount.id));
                                                                setDiscountDropdownOpen(false);
                                                                setDiscountSearch("");
                                                            }}
                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-pink-50 hover:text-[#E7A3B0] transition-colors ${selectedDiscountId === String(discount.id) ? "bg-pink-50 text-[#E7A3B0] font-medium" : "text-gray-700"}`}
                                                        >
                                                            {discount.discount_name}
                                                        </button>
                                                    )) : (
                                                        <p className="px-3 py-2 text-sm text-gray-500">
                                                            {discounts.length === 0 ? "No discounts created yet" : "No matches found"}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {selectedDiscount && (
                                        <div className="rounded-lg border border-[#E7A3B0]/15 bg-white px-3 py-2 text-sm text-gray-700">
                                            <p className="font-semibold text-gray-900">{selectedDiscount.discount_name}</p>
                                            <p className="text-xs text-gray-500">
                                                {selectedDiscount.discount_type === "percent"
                                                    ? `${selectedDiscount.discount_value}% off`
                                                    : selectedDiscount.discount_type === "fixed_price"
                                                        ? `Final price ₱${selectedDiscount.discount_value.toFixed(2)}`
                                                        : `₱${selectedDiscount.discount_value.toFixed(2)} off`}
                                                {selectedDiscount.ends_at ? ` • Ends ${new Date(selectedDiscount.ends_at).toLocaleString()}` : ""}
                                            </p>
                                            {previewDiscountedPrice !== null && (
                                                <p className="mt-1 text-xs font-medium text-[#b96d7d]">
                                                    Sale preview: ₱{previewDiscountedPrice.toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
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
