import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, PackageSearch } from "lucide-react";
import { InventoryProduct as Product } from "@/types/inventory.types";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InventoryTableProps {
    currentProducts: Product[];
    selectedProducts: Set<string>;
    toggleSelectAll: () => void;
    toggleSelectProduct: (productId: string) => void;
    getCategoryName: (id: number) => string;
    handleViewProduct: (product: Product) => void;
    handleEditProduct: (product: Product) => void;
    handleDeleteProduct: (productId: string) => void;
    actionLoading?: boolean;
}

export function InventoryTable({
    currentProducts,
    selectedProducts,
    toggleSelectAll,
    toggleSelectProduct,
    getCategoryName,
    handleViewProduct,
    handleEditProduct,
    handleDeleteProduct,
    actionLoading = false,
}: InventoryTableProps) {
    const formatPublishedDate = (value: string) => {
        const publishedDate = new Date(value);
        if (Number.isNaN(publishedDate.getTime())) return "—";

        return publishedDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <div className="bg-white rounded-lg border overflow-x-auto">
        <Table className="w-full">
            <TableHeader className="border-b bg-gray-50">
            <TableRow>
                <TableHead className="p-4 text-left w-12">
                <Checkbox
                    checked={selectedProducts.size === currentProducts.length && currentProducts.length > 0}
                    onCheckedChange={toggleSelectAll}
                />
                </TableHead>
                <TableHead className="p-4 text-left font-bold">Product Name</TableHead>
                <TableHead className="p-4 text-left font-bold">Category</TableHead>
                <TableHead className="p-4 text-center font-bold">Stock</TableHead>
                <TableHead className="p-4 text-right font-bold">Price</TableHead>
                <TableHead className="p-4 text-center font-bold">Status</TableHead>
                <TableHead className="p-4 text-center font-bold w-[200px]">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {currentProducts.length > 0 ? (
                currentProducts.map((product) => (
                <TableRow key={product.product_id} className="border-b hover:bg-gray-50">
                    <TableCell className="p-4">
                    <Checkbox
                        checked={selectedProducts.has(product.product_id)}
                        onCheckedChange={() => toggleSelectProduct(product.product_id)}
                    />
                    </TableCell>
                                        <TableCell className="p-4">
                                            <div className="font-medium">{product.product_name}</div>
                                            <div className="text-xs text-gray-500 mt-1">Published {formatPublishedDate(product.created_at)}</div>
                                        </TableCell>
                    <TableCell className="p-4 text-gray-600">{getCategoryName(product.category_id)}</TableCell>
                    <TableCell className="p-4 text-center">
                    <span className={product.product_stock < 10 ? "text-orange-600 font-medium" : ""}>
                        {product.product_stock}
                    </span>
                    {product.product_stock < 10 && (
                        <div className="text-xs text-orange-600 mt-1">⚠ Low</div>
                    )}
                    </TableCell>
                    <TableCell className="p-4 text-right font-medium">
                    ₱{product.product_price.toFixed(2)}
                    </TableCell>
                    <TableCell className="p-4 text-center">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                        product.show_in_catalog ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                        {product.show_in_catalog ? "Listed" : "Hidden"}
                    </span>
                    </TableCell>
                    <TableCell className="p-4">
                    <div className="flex gap-2 justify-center flex-wrap">
                        <Button size="icon" variant="outline" className="border-pink-200 text-pink-600 bg-pink-50 hover:bg-pink-200 hover:text-pink-700 hover:border-pink-300" onClick={() => handleViewProduct(product)}>
                        <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-200 hover:text-blue-700 hover:border-blue-300" onClick={() => handleEditProduct(product)}>
                        <Pencil className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="icon" variant="outline" className="border-red-200 text-red-600 bg-red-50 hover:bg-red-200 hover:text-red-700 hover:border-red-300" disabled={actionLoading}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-gray-900">Delete Product</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to delete <span className="font-semibold">{product.product_name}</span>? This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900">Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white cursor-pointer" onClick={() => handleDeleteProduct(product.product_id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                  <TableCell colSpan={7} className="p-0 border-none">
                    <Empty className="border-none rounded-none py-12">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <PackageSearch className="size-6 text-[#E7A3B0]" />
                        </EmptyMedia>
                        <EmptyTitle>No products found</EmptyTitle>
                        <EmptyDescription>
                          We couldn't find any products in your inventory matching these filters.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
        </div>
    );
}
