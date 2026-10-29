"use client";

import { ImageAlertDialog } from "@/components/image-alert-dialog";
import { useEffect, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { compressImage } from "@dollys-closet/core";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ImageSelectorProps {
  stagedFiles: File[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  onReorder: (files: File[]) => void;
}

function SortableStagedImageItem({
  file,
  index,
  onRemove,
}: {
  file: File;
  index: number;
  onRemove: (index: number) => void;
}) {
  const fileId = `${file.name}-${file.size}-${file.lastModified}`;
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fileId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative group border border-black rounded-lg overflow-hidden bg-gray-100 ${
        isDragging ? "ring-2 ring-pink-400 shadow-lg" : ""
      } cursor-grab active:cursor-grabbing`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewUrl}
        alt={`Staged upload ${index + 1}`}
        className="w-full h-20 md:h-32 object-cover"
      />

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition" />

      <div className="absolute top-2 right-2 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded cursor-pointer opacity-90 group-hover:opacity-100 shadow-sm transition-opacity"
          title="Remove image"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="absolute bottom-2 right-2 bg-gray-800 text-white px-2 py-1 rounded text-xs font-semibold">
        #{index + 1}
      </div>
    </div>
  );
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

const isImageFile = (file: File) => ALLOWED_IMAGE_TYPES.has(file.type);
const isWithinSizeLimit = (file: File) => file.size <= MAX_IMAGE_FILE_SIZE;

export default function ImageSelector({
  stagedFiles,
  onFilesAdd,
  onFileRemove,
  onReorder,
}: ImageSelectorProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ tone: "success" | "warning"; text: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stagedFiles.findIndex(
      (file) => `${file.name}-${file.size}-${file.lastModified}` === active.id
    );
    const newIndex = stagedFiles.findIndex(
      (file) => `${file.name}-${file.size}-${file.lastModified}` === over.id
    );

    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(stagedFiles, oldIndex, newIndex));
    }
  };
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
  });
  // limits the files to 5
  const canAddMore = stagedFiles.length < 5;
  const remainingSlots = Math.max(0, 5 - stagedFiles.length);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canAddMore) {
      setAlertConfig({
        isOpen: true,
        title: "Maximum Images Reached",
        description: "You can only add up to 5 images per product.",
      });
      return;
    }

    const droppedFiles = Array.from(e.dataTransfer.files);
    const imageFiles = droppedFiles.filter(isImageFile);
    const oversizedFiles = imageFiles.filter((file) => !isWithinSizeLimit(file));
    const sizedFiles = imageFiles.filter(isWithinSizeLimit);
    const files = sizedFiles.slice(0, remainingSlots);

    if (oversizedFiles.length > 0) {
      setAlertConfig({
        isOpen: true,
        title: "Image Too Large",
        description: `${oversizedFiles.length} image(s) exceed the 5 MB limit and were not added. Please upload images up to 5 MB each.`,
      });
      return;
    }

    if (droppedFiles.length > files.length) {
      setAlertConfig({
        isOpen: true,
        title: "Some Images Skipped",
        description: `Only ${remainingSlots} more image(s) can be added to reach the limit of 5.`,
      });
    }

    if (files.length > 0) {
      setIsCompressing(true);
      try {
        const compressedFiles = await Promise.all(files.map((file) => compressImage(file)));
        onFilesAdd(compressedFiles);
        setStatusMessage({
          tone: "success",
          text: `${compressedFiles.length} image${compressedFiles.length !== 1 ? "s" : ""} ready to upload when you save this product.`,
        });
      } catch (error) {
        console.error("Compression failed:", error);
        setStatusMessage({
          tone: "warning",
          text: "Some images could not be prepared. Try again with a smaller file or a different format.",
        });
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const imageFiles = selectedFiles.filter(isImageFile);
    const oversizedFiles = imageFiles.filter((file) => !isWithinSizeLimit(file));
    const sizedImageFiles = imageFiles.filter(isWithinSizeLimit);
    const limitedImageFiles = sizedImageFiles.slice(0, remainingSlots);

    if (selectedFiles.length > 0 && imageFiles.length === 0) {
      setAlertConfig({
        isOpen: true,
        title: "Invalid File Type",
        description: "Only JPG, PNG, WebP, GIF, and AVIF files are allowed.",
      });
    }

    if (selectedFiles.length > imageFiles.length) {
      setAlertConfig({
        isOpen: true,
        title: "Files Skipped",
        description: "Some files were skipped because only image files are allowed.",
      });
    }

    if (oversizedFiles.length > 0) {
      setAlertConfig({
        isOpen: true,
        title: "Image Too Large",
        description: `${oversizedFiles.length} image(s) exceed the 5 MB limit and were not added. Please upload images up to 5 MB each.`,
      });
      e.target.value = "";
      return;
    }

    if (imageFiles.length > limitedImageFiles.length) {
      setAlertConfig({
        isOpen: true,
        title: "Limit Exceeded",
        description: `Only ${remainingSlots} more image(s) can be added. The maximum is 5 images per product.`,
      });
    }

    if (limitedImageFiles.length > 0) {
      setIsCompressing(true);
      try {
        const compressedFiles = await Promise.all(limitedImageFiles.map((file) => compressImage(file)));
        onFilesAdd(compressedFiles);
        setStatusMessage({
          tone: "success",
          text: `${compressedFiles.length} image${compressedFiles.length !== 1 ? "s" : ""} added to this draft.`,
        });
      } catch (error) {
        console.error("Compression failed:", error);
        setStatusMessage({
          tone: "warning",
          text: "We couldn't prepare those images. Please try again.",
        });
      } finally {
        setIsCompressing(false);
      }
    }

    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="block text-sm font-medium text-gray-700">
          Product Images ({stagedFiles.length}/5)
        </p>
      </div>

      {statusMessage && (
        <div className={`rounded-lg px-3 py-2 text-sm ${
          statusMessage.tone === "success"
            ? "border border-green-200 bg-green-50 text-green-700"
            : "border border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          {statusMessage.text}
        </div>
      )}

      {canAddMore && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className="border-2 border-black rounded-lg p-4 sm:p-6 text-center cursor-pointer transition bg-gray-50 hover:border-pink-500 hover:bg-pink-50"
        >
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.gif,.avif"
            onChange={handleFileInput}
            className="hidden"
            id="image-input-add"
          />
          <label htmlFor="image-input-add" className={`block ${isCompressing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
            {isCompressing ? (
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-pink-500 animate-spin" />
            ) : (
              <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-400" />
            )}
            <p className="text-sm text-gray-600">
              {isCompressing 
                ? "Compressing images..." 
                : "Drag images here or click to select (Max 5)"}
            </p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP, GIF, AVIF up to 5MB</p>
          </label>
        </div>
      )}

      {stagedFiles.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stagedFiles.map((file) => `${file.name}-${file.size}-${file.lastModified}`)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-5 md:grid-cols-3 gap-2 overflow-hidden">
              {stagedFiles.map((file, index) => (
                <SortableStagedImageItem
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  file={file}
                  index={index}
                  onRemove={onFileRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {stagedFiles.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-4">
          No images selected. You can add them now or add them later.
        </p>
      )}

      <ImageAlertDialog
        config={alertConfig}
        onOpenChange={(open) => setAlertConfig((prev) => ({ ...prev, isOpen: open }))}
      />
    </div>
  );
}
