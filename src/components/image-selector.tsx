"use client";

import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { compressImage } from "@/lib/image-compression";

interface ImageSelectorProps {
  stagedFiles: File[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (index: number) => void;
}

const isImageFile = (file: File) => file.type.startsWith("image/");

export default function ImageSelector({
  stagedFiles,
  onFilesAdd,
  onFileRemove,
}: ImageSelectorProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  // limits the files to 5
  const canAddMore = stagedFiles.length < 5;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canAddMore) {
      alert("Maximum 5 images per product");
      return;
    }

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      isImageFile(file)
    );

    if (files.length > 0) {
      setIsCompressing(true);
      try {
        const compressedFiles: File[] = [];
        for (const file of files) {
          compressedFiles.push(await compressImage(file));
        }
        onFilesAdd(compressedFiles);
      } catch (error) {
        console.error("Compression failed:", error);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const imageFiles = selectedFiles.filter(isImageFile);

    if (selectedFiles.length > 0 && imageFiles.length === 0) {
      alert("Only image files are allowed.");
    }

    if (selectedFiles.length > imageFiles.length) {
      alert("Some files were skipped because only image files are allowed.");
    }

    if (imageFiles.length > 0) {
      setIsCompressing(true);
      try {
        const compressedFiles: File[] = [];
        for (const file of imageFiles) {
          compressedFiles.push(await compressImage(file));
        }
        onFilesAdd(compressedFiles);
      } catch (error) {
        console.error("Compression failed:", error);
      } finally {
        setIsCompressing(false);
      }
    }

    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Product Images ({stagedFiles.length}/5)
        </label>
      </div>

      {canAddMore && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className="border-2 border-black rounded-lg p-6 text-center cursor-pointer transition bg-gray-50 hover:border-pink-500 hover:bg-pink-50"
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="image-input-add"
          />
          <label htmlFor="image-input-add" className={`block ${isCompressing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
            {isCompressing ? (
              <Loader2 className="w-8 h-8 mx-auto mb-2 text-pink-500 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            )}
            <p className="text-sm text-gray-600">
              {isCompressing 
                ? "Compressing images..." 
                : "Drag images here or click to select (Max 5)"}
            </p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP up to 5MB</p>
          </label>
        </div>
      )}

      {stagedFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stagedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative group border border-black rounded-lg overflow-hidden bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(file)}
                alt={`Staged image ${index + 1}`}
                className="w-full h-32 object-cover"
              />

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onFileRemove(index)}
                  className="hidden group-hover:flex p-2 bg-red-500 hover:bg-red-600 text-white rounded cursor-pointer"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="absolute bottom-2 right-2 bg-gray-800 text-white px-2 py-1 rounded text-xs font-semibold">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {stagedFiles.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-4">
          No images selected. You can add them now or add them later.
        </p>
      )}
    </div>
  );
}
