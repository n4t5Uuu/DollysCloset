"use client";

import { useState } from "react";
import { Upload, X, Star } from "lucide-react";
import { InventoryProductImage as ProductImage } from "@/types/inventory.types";

interface ProductImageUploadProps {
  productId: string | null;
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  loading?: boolean;
}

const isImageFile = (file: File) => file.type.startsWith("image/");

export default function ProductImageUpload({
  productId,
  images,
  onImagesChange,
}: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const canUploadMore = images.length < 5;
  const remainingSlots = Math.max(0, 5 - images.length);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canUploadMore && !uploading) {
      setDragActive(e.type === "dragenter" || e.type === "dragover");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!productId) {
      alert("Please save the product first");
      return;
    }

    if (!canUploadMore) {
      alert("Maximum 5 images per product");
      return;
    }

    const files = Array.from(e.dataTransfer.files)
      .filter((file) => isImageFile(file))
      .slice(0, remainingSlots);

    if (e.dataTransfer.files.length > files.length) {
      alert(`Only ${remainingSlots} more image(s) can be uploaded.`);
    }

    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!productId) {
      alert("Please save the product first");
      return;
    }

    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(isImageFile);
    const limitedImageFiles = imageFiles.slice(0, remainingSlots);

    if (files.length > 0 && imageFiles.length === 0) {
      alert("Only image files are allowed.");
    }

    if (files.length > imageFiles.length) {
      alert("Some files were skipped because only image files are allowed.");
    }

    if (imageFiles.length > limitedImageFiles.length) {
      alert(`Only ${remainingSlots} more image(s) can be uploaded.`);
    }

    if (limitedImageFiles.length > 0) {
      uploadFiles(limitedImageFiles);
    }

    e.target.value = "";
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.every(isImageFile)) {
      alert("Only image files are allowed.");
      return;
    }

    if (files.length > remainingSlots) {
      alert(`Only ${remainingSlots} more image(s) can be uploaded.`);
      return;
    }

    setUploading(true);

    try {
      const { browserSupabase } = await import("@/lib/supabase/browser");
      const { data: { session } } = await browserSupabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const uploadedImages: ProductImage[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("product_id", productId!);

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
            : (error.error || "Upload failed");
          throw new Error(message);
        }

        const newImage = await response.json();
        uploadedImages.push(newImage);
      }

      if (uploadedImages.length > 0) {
        const refreshResponse = await fetch(`/api/admin/fetch-images?product_id=${encodeURIComponent(String(productId))}`);

        if (refreshResponse.ok) {
          const result = await refreshResponse.json();
          onImagesChange(result.data || []);
        } else {
          const mergedImages = [...images, ...uploadedImages].sort(
            (a, b) => a.display_order - b.display_order
          );
          onImagesChange(mergedImages);
        }
      }
    } catch (error) {
      alert(`Upload failed: ${(error as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!confirm("Delete this image?")) return;

    try {
      const { browserSupabase } = await import("@/lib/supabase/browser");
      const { data: { session } } = await browserSupabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`/api/admin/delete-image?image_id=${encodeURIComponent(imageId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        const message = error.details
          ? `${error.error}: ${error.details}`
          : (error.error || "Delete failed");
        throw new Error(message);
      }

      const refreshResponse = await fetch(`/api/admin/fetch-images?product_id=${encodeURIComponent(String(productId))}`);
      if (refreshResponse.ok) {
        const result = await refreshResponse.json();
        onImagesChange(result.data || []);
      } else {
        onImagesChange(images.filter((img) => img.image_id !== imageId));
      }
    } catch (error) {
      alert(`Delete failed: ${(error as Error).message}`);
    }
  };

  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);
  const primaryImageId = sortedImages.find((image) => image.is_primary)?.image_id || sortedImages[0]?.image_id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Product Images ({images.length}/5)
        </label>
      </div>

      {/* Upload Area */}
      {canUploadMore && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
            dragActive ? "border-pink-500 bg-pink-50" : "border-gray-300 bg-gray-50"
          } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            disabled={uploading}
            className="hidden"
            id="image-input"
          />
          <label htmlFor="image-input" className="cursor-pointer block">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">
              {uploading
                ? "Uploading..."
                : "Drag images here or click to select (Max 5)"}
            </p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP up to 5MB</p>
          </label>
        </div>
      )}

      {/* Image Grid */}
      {sortedImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sortedImages.map((image, index) => (
            <div
              key={image.image_id}
              className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.image_url}
                alt={`Product image ${index + 1}`}
                className="w-full h-32 object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition" />
              <button
                type="button"
                onClick={() => deleteImage(image.image_id)}
                title="Delete image"
                className="absolute top-2 right-2 p-2 bg-red-500/95 hover:bg-red-600 text-white rounded transition opacity-90 group-hover:opacity-100 shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Badge */}
              {image.image_id === primaryImageId && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3" /> Primary
                </div>
              )}

              {/* Order Number */}
              <div className="absolute bottom-2 right-2 bg-gray-800 text-white px-2 py-1 rounded text-xs font-semibold">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-4">
          No images yet. Upload at least one image.
        </p>
      )}
    </div>
  );
}
