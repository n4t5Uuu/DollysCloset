"use client";

import { Upload, X } from "lucide-react";

interface ImageSelectorProps {
  stagedFiles: File[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (index: number) => void;
}

export default function ImageSelector({
  stagedFiles,
  onFilesAdd,
  onFileRemove,
}: ImageSelectorProps) {
  // limits the files to 5
  const canAddMore = stagedFiles.length < 5;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canAddMore) {
      alert("Maximum 5 images per product");
      return;
    }

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length > 0) {
      onFilesAdd(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesAdd(files);
    }
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
          <label htmlFor="image-input-add" className="cursor-pointer block">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">
              Drag images here or click to select (Max 5)
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
              <img
                src={URL.createObjectURL(file)}
                alt={`Staged image ${index + 1}`}
                className="w-full h-32 object-cover"
              />

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onFileRemove(index)}
                  className="hidden group-hover:flex p-2 bg-red-500 hover:bg-red-600 text-white rounded"
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
