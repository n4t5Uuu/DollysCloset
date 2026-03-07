/* eslint-disable @next/next/no-img-element */
import { InventoryProduct as Product, InventoryProductImage as ProductImage } from "@/types/inventory.types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ViewProductDialogProps {
  product: Product | null;
  images: ProductImage[];
  selectedImage: string | null;
  onSelectedImageChange: (url: string | null) => void;
  onClose: () => void;
  getCategoryName: (id: number) => string;
}

export default function ViewProductDialog({
  product,
  images,
  selectedImage,
  onSelectedImageChange,
  onClose,
  getCategoryName
}: ViewProductDialogProps) {
  if (!product) return null;

  const orderedImages = [...images].sort((a, b) => {
    if (a.is_primary === b.is_primary) return a.display_order - b.display_order;
    return a.is_primary ? -1 : 1;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 text-gray-900">
        <CardHeader className="flex flex-row items-center justify-between border-b p-6 space-y-0 text-gray-900">
          <CardTitle className="text-gray-900">Product Details</CardTitle>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-gray-600"
            aria-label="Close product details"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4 p-6 text-gray-900">
          <div className="w-full">
            {images.length > 0 ? (
              <>
                <div className="w-full h-72 rounded-lg border bg-gray-50 flex items-center justify-center p-2">
                  <img
                    src={selectedImage || orderedImages[0].image_url}
                    alt={product.product_name}
                    className="w-full h-full object-contain rounded-md"
                  />
                </div>
                {orderedImages.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {orderedImages.map((image) => {
                      const isSelected = (selectedImage || orderedImages[0].image_url) === image.image_url;
                      return (
                        <button
                          key={image.image_id}
                          type="button"
                          onClick={() => onSelectedImageChange(image.image_url)}
                          className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${isSelected ? "border-pink-400" : "border-transparent"}`}
                          aria-label="Select product image"
                        >
                          <img
                            src={image.image_url}
                            alt={`${product.product_name} thumbnail`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-64 rounded-lg border bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
                No image available
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Product Name</p>
            <p className="text-lg font-semibold">{product.product_name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Category</p>
              <p className="font-medium">{getCategoryName(product.category_id)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Brand</p>
              <p className="font-medium">{product.product_brand}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Price</p>
              <p className="font-medium">₱{product.product_price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Stock</p>
              <p className="font-medium">{product.product_stock}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Condition</p>
              <p className="font-medium">{product.product_condition}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Size</p>
              <p className="font-medium">{product.size_label}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Visibility</p>
              <p className="font-medium">{product.show_in_catalog ? "Listed" : "Hidden"}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Description</p>
            <p className="text-sm text-gray-700">{product.product_description || "No description"}</p>
          </div>
        </CardContent>
        <CardFooter className="border-t flex justify-end gap-3 p-6 bg-gray-50">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
