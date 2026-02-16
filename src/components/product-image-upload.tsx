"use client";

import { useState } from "react";
import { Upload, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductImage {
  image_id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

interface ProductImageUploadProps {
  productId: string | null;
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  loading?: boolean;
}

export default function ProductImageUpload({
  productId,
  images,
  onImagesChange,
  loading = false,
}: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const canUploadMore = images.length < 5;

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

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );

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
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);

    try {
      const { browserSupabase } = await import("@/lib/supabase/browser");
      const { data: { session } } = await browserSupabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

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
        onImagesChange([...images, newImage]);
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

      const response = await fetch(`/api/admin/delete-image?image_id=${imageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }

      onImagesChange(images.filter((img) => img.image_id !== imageId));
    } catch (error) {
      alert(`Delete failed: ${(error as Error).message}`);
    }
  };

  const setPrimaryImage = async (imageId: string) => {
    try {
      const { browserSupabase } = await import("@/lib/supabase/browser");
      const { data: { session } } = await browserSupabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/admin/set-primary-image", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ image_id: imageId, product_id: productId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to set primary");
      }

      const updatedImages = await response.json();
      onImagesChange(updatedImages);
    } catch (error) {
      alert(`Failed to set primary: ${(error as Error).message}`);
    }
  };

  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);

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
              <img
                src={image.image_url}
                alt={`Product image ${index + 1}`}
                className="w-full h-32 object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center gap-2">
                <div className="hidden group-hover:flex gap-2">
                  {!image.is_primary && (
                    <button
                      onClick={() => setPrimaryImage(image.image_id)}
                      title="Set as primary"
                      className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteImage(image.image_id)}
                    title="Delete image"
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Badge */}
              {image.is_primary && (
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
