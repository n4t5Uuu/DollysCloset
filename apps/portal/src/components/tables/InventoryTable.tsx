import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Checkbox,
    Button,
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@dollys-closet/ui";
import { cn, InventoryProduct as Product, ProductDiscount, Season } from "@dollys-closet/core";
import { Eye, EyeOff, Pencil, Archive, RotateCcw, PackageSearch, CalendarRange, BadgePercent, MoreHorizontal, X } from "lucide-react";
import { useState } from "react";
import { getSeasonColor } from "@/components/seasons/SeasonCalendar";

interface InventoryTableProps {
    mode: "active" | "archived";
    currentProducts: Product[];
    seasons: Season[];
    selectedProducts: Set<string>;
    totalFilteredCount: number;
    showingStart: number;
    showingEnd: number;
    allCurrentProductsSelected: boolean;
    someCurrentProductsSelected: boolean;
    toggleSelectAll: (checked: boolean) => void;
    toggleSelectProduct: (productId: string) => void;
    getCategoryName: (id: number) => string;
    handleViewProduct: (product: Product) => void;
    handleEditProduct: (product: Product) => void;
    handleArchiveProduct: (productId: string) => void;
    handleRestoreProduct: (productId: string) => void;
    onRowActivate?: (product: Product) => void;
    actionLoading?: boolean;
    onClearSelection?: () => void;
    onBatchSeason?: () => void;
    onBatchDiscount?: () => void;
    onBulkScopeAction?: () => void;
    bulkCatalogAction?: "publish" | "unpublish" | null;
    onBulkCatalogToggle?: (publish: boolean) => void;
    emptyTitle?: string;
    emptyDescription?: string;
}

export function InventoryTable({
    mode,
    currentProducts,
    seasons,
    selectedProducts,
    totalFilteredCount,
    showingStart,
    showingEnd,
    allCurrentProductsSelected,
    someCurrentProductsSelected,
    toggleSelectAll,
    toggleSelectProduct,
    getCategoryName,
    handleViewProduct,
    handleEditProduct,
    handleArchiveProduct,
    handleRestoreProduct,
    onRowActivate,
    actionLoading = false,
    onClearSelection,
    onBatchSeason,
    onBatchDiscount,
    onBulkScopeAction,
    bulkCatalogAction,
    onBulkCatalogToggle,
    emptyTitle = "No products found",
    emptyDescription = "We couldn't find any products in your inventory matching these filters.",
}: InventoryTableProps) {
    const [moreMenuId, setMoreMenuId] = useState<string | null>(null);
    const [archiveTargetProduct, setArchiveTargetProduct] = useState<Product | null>(null);
    const [openIconKey, setOpenIconKey] = useState<string | null>(null);

    const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
    const seasonById = new Map(seasons.map((season) => [season.id, season]));

    const getMobileCategory = (fullPath: string) => {
        const parts = fullPath.split(" > ");
        const leaf = parts[parts.length - 1];
        const lower = fullPath.toLowerCase();
        if (lower.includes("women") || lower.includes("girl")) return `${leaf} (W)`;
        if (lower.includes("men") || lower.includes("boy")) return `${leaf} (M)`;
        if (lower.includes("kid") || lower.includes("child")) return `${leaf} (K)`;
        return leaf;
    };

    const formatPublishedDate = (value: string) => {
        const publishedDate = new Date(value);
        if (Number.isNaN(publishedDate.getTime())) return "-";

        return publishedDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const activateRow = (product: Product) => {
        if (onRowActivate) {
            onRowActivate(product);
            return;
        }

        if (mode === "active") {
            handleEditProduct(product);
        }
    };

    const formatCurrency = (value: number) => `P${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatDiscountSummary = (discount: ProductDiscount) => {
        if (discount.discount_type === "percent") {
            return `${discount.discount_value}% off`;
        }

        if (discount.discount_type === "fixed_price") {
            return `Final price ${formatCurrency(Number(discount.discount_value))}`;
        }

        return `${formatCurrency(Number(discount.discount_value))} off`;
    };

    const formatSeasonWindow = (season: Season) =>
        `${MONTH_ABBR[season.startMonth - 1]} ${season.startDay} - ${MONTH_ABBR[season.endMonth - 1]} ${season.endDay}`;

    /** Icons on the title row only — full detail in tooltips (shortest row height). */
    const renderCatalogAttributeIcons = (product: Product) => {
        const season = product.season_id ? seasonById.get(String(product.season_id)) ?? null : null;
        const discount = product.discount ?? null;
        if (!season && !discount) return null;

        return (
            <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                {season && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                                style={{
                                    color: getSeasonColor(season.id, seasons, null).border,
                                }}
                                aria-label={`Season: ${season.name}`}
                            >
                                <CalendarRange className="h-3.5 w-3.5" strokeWidth={2.25} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[240px] bg-white text-gray-900">
                            <div className="space-y-1">
                                <p className="font-semibold">{season.name}</p>
                                <p className="text-xs text-gray-600">{formatSeasonWindow(season)}</p>
                                <p className={`text-xs font-medium ${season.isActive === false ? "text-gray-500" : "text-emerald-600"}`}>
                                    {season.isActive === false ? "Inactive season" : "Active season"}
                                </p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                )}
                {discount && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-amber-700/90 hover:bg-amber-50 hover:text-amber-900"
                                aria-label={`Discount: ${discount.discount_name || formatDiscountSummary(discount)}`}
                            >
                                <BadgePercent className="h-3.5 w-3.5" strokeWidth={2.25} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[260px] bg-white text-gray-900">
                            <div className="space-y-1">
                                <p className="font-semibold">{discount.discount_name || "Discount applied"}</p>
                                <p className="text-xs text-gray-600">{formatDiscountSummary(discount)}</p>
                                {discount.ends_at ? (
                                    <p className="text-xs text-gray-600">Ends {new Date(discount.ends_at).toLocaleString()}</p>
                                ) : (
                                    <p className="text-xs text-gray-600">No end date</p>
                                )}
                                {product.discountedPrice !== null && product.discountedPrice !== undefined && (
                                    <p className="text-xs font-medium text-[#b96d7d]">
                                        Sale price {formatCurrency(product.discountedPrice)}
                                    </p>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        );
    };

    /** Mobile version — tap to open a click-dismissible panel (no hover on touch). */
    const renderMobileCatalogAttributeIcons = (product: Product) => {
        const season = product.season_id ? seasonById.get(String(product.season_id)) ?? null : null;
        const discount = product.discount ?? null;
        if (!season && !discount) return null;

        return (
            <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                {season && (
                    <div className="relative">
                        <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded"
                            style={{ color: getSeasonColor(season.id, seasons, null).border }}
                            aria-label={`Season: ${season.name}`}
                            onClick={() => setOpenIconKey(openIconKey === `${product.product_id}-season` ? null : `${product.product_id}-season`)}
                        >
                            <CalendarRange className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </button>
                        {openIconKey === `${product.product_id}-season` && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setOpenIconKey(null)} />
                                <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 min-w-40 space-y-0.5">
                                    <p className="text-xs font-semibold text-gray-900">{season.name}</p>
                                    <p className="text-[11px] text-gray-600">{formatSeasonWindow(season)}</p>
                                    <p className={`text-[11px] font-medium ${season.isActive === false ? "text-gray-500" : "text-emerald-600"}`}>
                                        {season.isActive === false ? "Inactive season" : "Active season"}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}
                {discount && (
                    <div className="relative">
                        <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-amber-700/90"
                            aria-label={`Discount: ${discount.discount_name || formatDiscountSummary(discount)}`}
                            onClick={() => setOpenIconKey(openIconKey === `${product.product_id}-discount` ? null : `${product.product_id}-discount`)}
                        >
                            <BadgePercent className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </button>
                        {openIconKey === `${product.product_id}-discount` && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setOpenIconKey(null)} />
                                <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 min-w-40 space-y-0.5">
                                    <p className="text-xs font-semibold text-gray-900">{discount.discount_name || "Discount applied"}</p>
                                    <p className="text-[11px] text-gray-600">{formatDiscountSummary(discount)}</p>
                                    {discount.ends_at
                                        ? <p className="text-[11px] text-gray-600">Ends {new Date(discount.ends_at).toLocaleString()}</p>
                                        : <p className="text-[11px] text-gray-600">No end date</p>
                                    }
                                    {product.discountedPrice !== null && product.discountedPrice !== undefined && (
                                        <p className="text-[11px] font-medium text-[#b96d7d]">Sale price {formatCurrency(product.discountedPrice)}</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const PrimaryActionDialog = ({ product }: { product: Product }) => (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    size="icon"
                    variant="outline"
                    title={mode === "active" ? "Archive product" : "Restore product"}
                    aria-label={`${mode === "active" ? "Archive" : "Restore"} ${product.product_name}`}
                    className={mode === "active"
                        ? "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 hover:border-amber-300"
                        : "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300"}
                    disabled={actionLoading}
                >
                    {mode === "active" ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-gray-900">
                        {mode === "active" ? "Archive Product" : "Restore Product"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {mode === "active"
                            ? <>Archive <span className="font-semibold">{product.product_name}</span>? Archived products are removed from active dashboards until they are restored.</>
                            : <>Restore <span className="font-semibold">{product.product_name}</span> to the active inventory list?</>}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className={`${mode === "active" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"} text-white cursor-pointer`}
                        onClick={() => mode === "active" ? handleArchiveProduct(product.product_id) : handleRestoreProduct(product.product_id)}
                    >
                        {mode === "active" ? "Archive" : "Restore"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    const emptyState = (
        <Empty className="border-none rounded-none py-12">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <PackageSearch className="size-6 text-[#E7A3B0]" />
                </EmptyMedia>
                <EmptyTitle>{emptyTitle}</EmptyTitle>
                <EmptyDescription>{emptyDescription}</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );

    return (
        <>
            <div className="sm:hidden bg-white rounded-lg border divide-y">
                {currentProducts.length > 0 ? (
                    <>
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-t-lg">
                            {selectedProducts.size > 0 ? (
                                <span className="text-[11px] text-gray-400">
                                    {selectedProducts.size}/{totalFilteredCount} selected
                                </span>
                            ) : (
                                <span className="text-[11px] text-gray-400">
                                    Showing {showingStart}–{showingEnd} of {totalFilteredCount}
                                </span>
                            )}
                            <div className="ml-auto flex items-center gap-1.5">
                                {selectedProducts.size > 0 && (
                                    <>
                                        {mode === "active" && onBatchSeason && (
                                            <Button type="button" variant="outline" size="sm" onClick={onBatchSeason} className="h-6 w-6 p-0 border-[#E7A3B0]/50 text-[#b96d7d] hover:bg-[#fff5f7]" aria-label="Set Season">
                                                <CalendarRange className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        {mode === "active" && onBatchDiscount && (
                                            <Button type="button" variant="outline" size="sm" onClick={onBatchDiscount} className="h-6 w-6 p-0 border-[#E7A3B0]/50 text-[#b96d7d] hover:bg-[#fff5f7]" aria-label="Add Discount">
                                                <BadgePercent className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        {bulkCatalogAction && onBulkCatalogToggle && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onBulkCatalogToggle(bulkCatalogAction === "publish")}
                                                disabled={actionLoading}
                                                className={`h-6 w-6 p-0 ${bulkCatalogAction === "publish" ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"}`}
                                                aria-label={bulkCatalogAction === "publish" ? "Publish" : "Unpublish"}
                                            >
                                                {bulkCatalogAction === "publish" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                            </Button>
                                        )}
                                        {onBulkScopeAction && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button type="button" variant="outline" size="sm" disabled={actionLoading} className={`h-6 w-6 p-0 ${mode === "active" ? "border-amber-200 text-amber-500 hover:bg-amber-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`} aria-label={mode === "active" ? "Archive" : "Restore"}>
                                                        {mode === "active" ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-white">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-gray-900">
                                                            {mode === "active"
                                                                ? selectedProducts.size === 1 ? "Archive Product" : "Archive Multiple Products"
                                                                : selectedProducts.size === 1 ? "Restore Product" : "Restore Multiple Products"}
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {mode === "active"
                                                                ? <>Archive <span className="font-semibold">{selectedProducts.size}</span> {selectedProducts.size === 1 ? "product" : "products"}? They can be restored later.</>
                                                                : <>Restore <span className="font-semibold">{selectedProducts.size}</span> {selectedProducts.size === 1 ? "product" : "products"} to active inventory?</>}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50">Cancel</AlertDialogCancel>
                                                        <AlertDialogAction className={`${mode === "active" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"} text-white cursor-pointer`} onClick={onBulkScopeAction}>
                                                            {mode === "active"
                                                                ? selectedProducts.size === 1 ? "Archive" : "Archive All"
                                                                : selectedProducts.size === 1 ? "Restore" : "Restore All"}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                        {onClearSelection && (
                                            <Button type="button" variant="outline" size="sm" onClick={onClearSelection} className="h-6 w-6 p-0 border-zinc-200 text-zinc-400 hover:bg-zinc-50" aria-label="Clear selection">
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </>
                                )}
                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Select all</span>
                                <Checkbox
                                    checked={allCurrentProductsSelected}
                                    onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                                />
                            </div>
                        </div>
                        {currentProducts.map((product) => (
                            <div key={product.product_id} className="flex items-start gap-2 px-3 py-2">
                                <Checkbox
                                    className="mt-1 shrink-0"
                                    checked={selectedProducts.has(product.product_id)}
                                    onCheckedChange={() => toggleSelectProduct(product.product_id)}
                                />
                                <div className="flex-1 min-w-0">
                                    {/* Name + status */}
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <button
                                            type="button"
                                            onClick={() => activateRow(product)}
                                            className="min-w-0 flex-1 truncate text-left font-semibold text-sm text-[#121212] transition-colors hover:text-[#E7A3B0]"
                                            title={mode === "active" ? `Edit ${product.product_name}` : product.product_name}
                                        >
                                            {product.product_name}
                                        </button>
                                        {renderMobileCatalogAttributeIcons(product)}
                                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${product.show_in_catalog ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                                            {product.show_in_catalog ? "Listed" : "Hidden"}
                                        </span>
                                    </div>
                                    {/* Meta row — fixed-width grid so columns align across all items */}
                                    <div className="grid grid-cols-[48px_minmax(0,1fr)_32px_minmax(0,72px)] gap-x-2 mt-0.5 items-center">
                                        <span className="text-[10px] text-gray-400 truncate">#{product.product_id}</span>
                                        <span className="text-[11px] text-gray-500 truncate">{getMobileCategory(getCategoryName(product.category_id))}</span>
                                        <span className={`text-[11px] font-medium text-right ${product.product_stock < 10 ? "text-orange-600" : "text-gray-500"}`}>
                                            {product.product_stock}
                                        </span>
                                        <span className="text-[11px] font-semibold text-gray-700 text-right truncate">
                                            ₱{(product.discountedPrice ?? product.product_price).toFixed(2)}
                                        </span>
                                    </div>
                                    {mode === "archived" && product.archived_at && (
                                        <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">
                                            Archived {formatPublishedDate(product.archived_at)}
                                        </span>
                                    )}
                                </div>
                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                    {mode === "active" && (
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            title="Edit product"
                                            aria-label={`Edit ${product.product_name}`}
                                            className="h-7 w-7 border-pink-200 text-pink-600 bg-pink-50 hover:bg-pink-200"
                                            onClick={() => handleEditProduct(product)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <div className="relative">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            title="More actions"
                                            aria-label={`More actions for ${product.product_name}`}
                                            className="h-7 w-7 border-gray-200 text-gray-500 bg-white hover:bg-gray-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMoreMenuId(moreMenuId === product.product_id ? null : product.product_id);
                                            }}
                                        >
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                        </Button>
                                        {moreMenuId === product.product_id && (
                                            <>
                                                <div className="fixed inset-0 z-20" onClick={() => setMoreMenuId(null)} />
                                                <div className="absolute right-0 bottom-full mb-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                                                    <button
                                                        type="button"
                                                        onClick={() => { handleViewProduct(product); setMoreMenuId(null); }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 text-pink-500" />
                                                        View
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setArchiveTargetProduct(product); setMoreMenuId(null); }}
                                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${mode === "active" ? "text-amber-700" : "text-emerald-700"}`}
                                                    >
                                                        {mode === "active" ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                                        {mode === "active" ? "Archive" : "Restore"}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                ) : emptyState}
            </div>

            {/* Lifted archive/restore dialog — lives outside the dropdown so unmounting the dropdown doesn't kill it */}
            <AlertDialog open={archiveTargetProduct !== null} onOpenChange={(open) => { if (!open) setArchiveTargetProduct(null); }}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-gray-900">
                            {mode === "active" ? "Archive Product" : "Restore Product"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {mode === "active"
                                ? <>Archive <span className="font-semibold">{archiveTargetProduct?.product_name}</span>? Archived products are removed from active dashboards until they are restored.</>
                                : <>Restore <span className="font-semibold">{archiveTargetProduct?.product_name}</span> to the active inventory list?</>}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className={`${mode === "active" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"} text-white cursor-pointer`}
                            onClick={() => {
                                if (!archiveTargetProduct) return;
                                mode === "active"
                                    ? handleArchiveProduct(archiveTargetProduct.product_id)
                                    : handleRestoreProduct(archiveTargetProduct.product_id);
                                setArchiveTargetProduct(null);
                            }}
                        >
                            {mode === "active" ? "Archive" : "Restore"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="hidden sm:block bg-white rounded-lg border overflow-x-auto">
                <Table className="w-full">
                    <TableHeader className="border-b bg-gray-50">
                        <TableRow>
                            <TableHead className="p-4 text-left w-12">
                                <Checkbox
                                    checked={allCurrentProductsSelected ? true : someCurrentProductsSelected ? "indeterminate" : false}
                                    onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                                />
                            </TableHead>
                            <TableHead className="p-4 text-left font-bold w-[110px] min-w-[110px]">ID</TableHead>
                            <TableHead className="p-4 text-left font-bold min-w-[200px] whitespace-normal">Product Name</TableHead>
                            <TableHead className="p-4 text-left font-bold min-w-[150px] whitespace-normal">Category</TableHead>
                            <TableHead className="p-4 text-center font-bold min-w-[80px]">Stock</TableHead>
                            <TableHead className="p-4 text-right font-bold min-w-[120px]">Price</TableHead>
                            <TableHead className="p-4 text-center font-bold min-w-[100px]">Status</TableHead>
                            {mode === "active" && (
                                <TableHead className="p-4 text-center font-bold min-w-[120px]">Last Updated</TableHead>
                            )}
                            {mode === "archived" && (
                                <TableHead className="p-4 text-center font-bold min-w-[120px]">Archived On</TableHead>
                            )}
                            <TableHead className="p-4 text-center font-bold w-[200px] min-w-[200px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentProducts.length > 0 ? (
                            currentProducts.map((product) => (
                                <TableRow
                                    key={product.product_id}
                                    className={cn("border-b hover:bg-gray-50", selectedProducts.has(String(product.product_id)) && "bg-[#E7A3B0]/5")}
                                    onDoubleClick={() => activateRow(product)}
                                >
                                    <TableCell className="p-4">
                                        <Checkbox
                                            checked={selectedProducts.has(String(product.product_id))}
                                            onCheckedChange={() => toggleSelectProduct(product.product_id)}
                                        />
                                    </TableCell>
                                    <TableCell className="p-4 text-sm font-medium text-gray-900">
                                        <div className="break-all">{product.product_id}</div>
                                    </TableCell>

                                    <TableCell className="p-4 overflow-hidden whitespace-normal">
                                        <div className="flex items-start gap-1.5 min-w-0">
                                            <div className="min-w-0 flex-1">
                                                <button
                                                    type="button"
                                                    onClick={() => activateRow(product)}
                                                    className="font-medium text-left transition-colors hover:text-[#E7A3B0] break-words [overflow-wrap:anywhere] block max-w-full line-clamp-3"
                                                    title={mode === "active" ? `Edit ${product.product_name}` : product.product_name}
                                                >
                                                    {product.product_name}
                                                </button>
                                                <div className="text-[11px] text-gray-400 mt-0.5">
                                                    {formatPublishedDate(product.created_at)}
                                                </div>
                                            </div>
                                            {renderCatalogAttributeIcons(product)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-4 text-gray-600 overflow-hidden whitespace-normal" title={getCategoryName(product.category_id)}>
                                        <span className="line-clamp-2 [overflow-wrap:anywhere]">{getCategoryName(product.category_id)}</span>
                                    </TableCell>
                                    <TableCell className="p-4 text-center">
                                        <span className={product.product_stock < 10 ? "text-orange-600 font-medium" : ""}>
                                            {product.product_stock}
                                        </span>
                                        {product.product_stock < 10 && (
                                            <div className="text-xs text-orange-600 mt-1">Low</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="p-4 text-right font-medium">
                                        {product.discountedPrice !== null && product.discountedPrice !== undefined ? (
                                            <div className="flex flex-col items-end gap-0.5">
                                                <span className="text-xs text-gray-400 line-through">₱ {product.product_price.toFixed(2)}</span>
                                                <span className="font-semibold text-[#b96d7d]">₱ {product.discountedPrice.toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <>₱ {product.product_price.toFixed(2)}</>
                                        )}
                                    </TableCell>
                                    <TableCell className="p-4 text-center">
                                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                                            product.show_in_catalog ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                        }`}>
                                            {product.show_in_catalog ? "Listed" : "Hidden"}
                                        </span>
                                    </TableCell>
                                    {mode === "active" && (
                                        <TableCell className="p-4 text-center text-sm text-gray-600">
                                            {formatPublishedDate(
                                                product.updated_at ?? product.time_updated ?? product.created_at
                                            )}
                                        </TableCell>
                                    )}
                                    {mode === "archived" && (
                                        <TableCell className="p-4 text-center">
                                            {product.archived_at ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                    <Archive className="h-3 w-3" />
                                                    {formatPublishedDate(product.archived_at)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell className="p-4">
                                        <div className="flex gap-2 justify-center flex-wrap">
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                title="View product"
                                                aria-label={`View ${product.product_name}`}
                                                className="border-pink-200 text-pink-600 bg-pink-50 hover:bg-pink-200 hover:text-pink-700 hover:border-pink-300"
                                                onClick={() => handleViewProduct(product)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {mode === "active" && (
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    title="Edit product"
                                                    aria-label={`Edit ${product.product_name}`}
                                                    className="border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-200 hover:text-blue-700 hover:border-blue-300"
                                                    onClick={() => handleEditProduct(product)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <PrimaryActionDialog product={product} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={9} className="p-0 border-none">
                                    {emptyState}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
