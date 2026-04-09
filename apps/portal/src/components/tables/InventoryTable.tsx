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
} from "@dollys-closet/ui";
import { cn, InventoryProduct as Product } from "@dollys-closet/core";
import { Eye, Pencil, Archive, RotateCcw, PackageSearch } from "lucide-react";

interface InventoryTableProps {
    mode: "active" | "archived";
    currentProducts: Product[];
    selectedProducts: Set<string>;
    toggleSelectAll: () => void;
    toggleSelectProduct: (productId: string) => void;
    getCategoryName: (id: number) => string;
    handleViewProduct: (product: Product) => void;
    handleEditProduct: (product: Product) => void;
    handleArchiveProduct: (productId: string) => void;
    handleRestoreProduct: (productId: string) => void;
    onRowActivate?: (product: Product) => void;
    actionLoading?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
}

export function InventoryTable({
    mode,
    currentProducts,
    selectedProducts,
    toggleSelectAll,
    toggleSelectProduct,
    getCategoryName,
    handleViewProduct,
    handleEditProduct,
    handleArchiveProduct,
    handleRestoreProduct,
    onRowActivate,
    actionLoading = false,
    emptyTitle = "No products found",
    emptyDescription = "We couldn't find any products in your inventory matching these filters.",
}: InventoryTableProps) {
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
                            <Checkbox
                                checked={selectedProducts.size === currentProducts.length && currentProducts.length > 0}
                                onCheckedChange={toggleSelectAll}
                            />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select all</span>
                        </div>
                        {currentProducts.map((product) => (
                            <div key={product.product_id} className="flex items-center gap-3 px-3 py-2.5">
                                <Checkbox
                                    checked={selectedProducts.has(product.product_id)}
                                    onCheckedChange={() => toggleSelectProduct(product.product_id)}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => activateRow(product)}
                                            className="truncate text-left font-medium text-sm text-[#121212] transition-colors hover:text-[#E7A3B0]"
                                            title={mode === "active" ? `Edit ${product.product_name}` : product.product_name}
                                        >
                                            {product.product_name}
                                        </button>
                                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${product.show_in_catalog ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                                            {product.show_in_catalog ? "Listed" : "Hidden"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                        <span className="text-[10px] text-gray-400">#{product.product_id}</span>
                                        <span className="text-gray-300">&middot;</span>
                                        <span>{getMobileCategory(getCategoryName(product.category_id))}</span>
                                        <span>&middot;</span>
                                        <span className={product.product_stock < 10 ? "text-orange-600 font-medium" : ""}>
                                            {product.product_stock < 10 ? `Low: ${product.product_stock}` : product.product_stock}
                                        </span>
                                        <span>&middot;</span>
                                        <span className="font-medium text-gray-700">PHP {product.product_price.toFixed(2)}</span>
                                        {mode === "archived" && product.archived_at && (
                                            <>
                                                <span>&middot;</span>
                                                <span className="text-amber-600 font-medium">Archived {formatPublishedDate(product.archived_at)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        title="View product"
                                        aria-label={`View ${product.product_name}`}
                                        className="h-8 w-8 border-pink-200 text-pink-600 bg-pink-50 hover:bg-pink-200"
                                        onClick={() => handleViewProduct(product)}
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    {mode === "active" && (
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            title="Edit product"
                                            aria-label={`Edit ${product.product_name}`}
                                            className="h-8 w-8 border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-200"
                                            onClick={() => handleEditProduct(product)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <PrimaryActionDialog product={product} />
                                </div>
                            </div>
                        ))}
                    </>
                ) : emptyState}
            </div>

            <div className="hidden sm:block bg-white rounded-lg border overflow-x-auto">
                <Table className="w-full table-fixed">
                    <TableHeader className="border-b bg-gray-50">
                        <TableRow>
                            <TableHead className="p-4 text-left w-12">
                                <Checkbox
                                    checked={selectedProducts.size === currentProducts.length && currentProducts.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="p-4 text-left font-bold w-[110px]">ID</TableHead>
                            <TableHead className="p-4 text-left font-bold">Product Name</TableHead>
                            <TableHead className="p-4 text-left font-bold">Category</TableHead>
                            <TableHead className="p-4 text-center font-bold">Stock</TableHead>
                            <TableHead className="p-4 text-right font-bold">Price</TableHead>
                            <TableHead className="p-4 text-center font-bold">Status</TableHead>
                            {mode === "archived" && (
                                <TableHead className="p-4 text-center font-bold">Archived On</TableHead>
                            )}
                            <TableHead className="p-4 text-center font-bold w-[200px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentProducts.length > 0 ? (
                            currentProducts.map((product) => (
                                <TableRow
                                    key={product.product_id}
                                    className={cn("border-b hover:bg-gray-50", selectedProducts.has(product.product_id) && "bg-[#E7A3B0]/5")}
                                    onDoubleClick={() => activateRow(product)}
                                    title={mode === "active" ? "Double-click to edit this product" : undefined}
                                >
                                    <TableCell className="p-4">
                                        <Checkbox
                                            checked={selectedProducts.has(product.product_id)}
                                            onCheckedChange={() => toggleSelectProduct(product.product_id)}
                                        />
                                    </TableCell>
                                    <TableCell className="p-4 text-sm font-medium text-gray-900">
                                        <div className="break-all">{product.product_id}</div>
                                    </TableCell>

                                    <TableCell className="p-4 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => activateRow(product)}
                                            className="font-medium text-left transition-colors hover:text-[#E7A3B0] break-words [overflow-wrap:anywhere] block max-w-[200px] md:max-w-xs line-clamp-3"
                                            title={mode === "active" ? `Edit ${product.product_name}` : product.product_name}
                                        >
                                            {product.product_name}
                                        </button>
                                        <div className="text-[11px] text-gray-400 mt-1">
                                            {formatPublishedDate(product.created_at)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-4 text-gray-600 overflow-hidden">
                                        <span className="line-clamp-2 wrap-anywhere">{getCategoryName(product.category_id)}</span>
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
                                        PHP {product.product_price.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded text-sm font-medium ${
                                            product.show_in_catalog ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                        }`}>
                                            {product.show_in_catalog ? "Listed" : "Hidden"}
                                        </span>
                                    </TableCell>
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
                                <TableCell colSpan={mode === "archived" ? 9 : 8} className="p-0 border-none">
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
