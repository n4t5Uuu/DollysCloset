"use client";

import { useState, useRef, useCallback, useEffect, useEffectEvent } from "react";
import {
  X,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  ImageIcon,
  HardDrive,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetch-json";
import { mapWithConcurrency } from "@/lib/concurrency";
import { ModalBackdrop } from "@/components/dialogs/ModalBackdrop";
import {
  createClient,
  compressImage,
  numericLimits,
  parseProductPrice,
  uploadProductImageFile,
  type InventoryProduct as Product,
} from "@dollys-closet/core";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@dollys-closet/ui";
import { toast } from "sonner";

// Must mirror the server's allowed set in /api/admin/images/route.ts
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  existingProducts?: Product[];
}

interface ParsedRow {
  product_name: string;
  category_id: string;
  product_price: string;
  product_brand: string;
  product_stock: string;
  size_label: string;
  product_condition: string;
  product_description: string;
  show_in_catalog: string;
  // Up to 5 image filename columns — image_1 is preferred primary,
  // but the first non-empty value is used as primary (fallback).
  image_1: string;
  image_2: string;
  image_3: string;
  image_4: string;
  image_5: string;
}

interface ValidatedRow {
  raw: ParsedRow;
  normalized: ParsedRow;
  index: number;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

interface ImageFailure {
  row: number;
  name: string;
  productId: string;
  imagesFailed: string[];
}

interface ImportResult {
  succeeded: number;
  skipped: number;
  errors: { row: number; name: string; reason: string }[];
  partialImageFailures: ImageFailure[];
}

interface StorageQuota {
  usedBytes: number;
  budgetBytes: number;
}

interface ImageMatching {
  unmatchedReferences: string[]; // referenced in xlsx but not dropped
  orphanFiles: string[];         // dropped but not referenced
  rowImageCounts: Map<number, number>; // row.index → matched count
}

const MAX_META_LENGTH = 9;

function normalizeBoolean(value: string): boolean {
  const lower = value.trim().toLowerCase();
  if (lower === "false" || lower === "0" || lower === "no") return false;
  return true;
}

function sanitizeWholeNumberInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^\d+$/.test(trimmed) ? trimmed : "0";
}

function sanitizeDecimalInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^\d+(\.\d+)?$/.test(trimmed) ? trimmed : "0";
}

function buildProductFingerprint(name: string, categoryId: string, price: string): string {
  const normalizedPrice = String(Number(price.trim()));
  return [name.trim().toLowerCase(), categoryId.trim(), normalizedPrice].join("|");
}

function isValidImageFile(file: File): boolean {
  const ext = file.name.toLowerCase().split(".").pop() || "";
  const mimeOk = file.type.startsWith("image/") || !file.type;
  return ALLOWED_IMAGE_EXTENSIONS.has(ext) && mimeOk;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function validateRows(rows: ParsedRow[], existingProducts: Product[] = []): ValidatedRow[] {
  const existingFingerprints = new Set(
    existingProducts.map((p) =>
      buildProductFingerprint(p.product_name, String(p.category_id), String(p.product_price)),
    ),
  );
  const seenInBatch = new Set<string>();

  return rows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalizedRow: ParsedRow = {
      ...row,
      category_id: sanitizeWholeNumberInput(row.category_id ?? ""),
      product_price: sanitizeDecimalInput(row.product_price ?? ""),
      product_stock: sanitizeWholeNumberInput(row.product_stock ?? ""),
    };

    if (!row.product_name?.trim()) {
      errors.push("product_name is required");
    }

    const originalCategoryId = row.category_id?.trim() ?? "";
    const categoryIdStr = normalizedRow.category_id.trim();
    const categoryId = Number(categoryIdStr);
    if (!categoryIdStr || !Number.isInteger(categoryId) || categoryId <= 0) {
      errors.push(
        `category_id "${originalCategoryId || "empty"}" must be a whole number (e.g. 11) - this row will be skipped`,
      );
    }

    const originalPrice = row.product_price?.trim() ?? "";
    const priceStr = normalizedRow.product_price.trim();
    const hasInvalidPriceCharacters = Boolean(
      originalPrice && normalizedRow.product_price === "0" && originalPrice !== "0",
    );
    const numericPrice = Number(priceStr);
    const price = parseProductPrice(priceStr);
    if (hasInvalidPriceCharacters || !priceStr || Number.isNaN(numericPrice) || numericPrice < 0) {
      errors.push(
        `product_price "${originalPrice || "empty"}" must be a plain number with no letters or symbols (e.g. 150 or 150.00) - this row will be skipped`,
      );
    } else if (price === null) {
      errors.push(
        `product_price "${originalPrice}" must not exceed ${numericLimits.productPrice.max} - this row will be skipped`,
      );
    }

    const originalStock = row.product_stock?.trim() ?? "";
    if (originalStock && normalizedRow.product_stock === "0" && originalStock !== "0") {
      warnings.push(
        `product_stock "${originalStock}" contains non-numeric characters somewhere in the field - it will be imported as 0.`,
      );
    }

    const stockStr = normalizedRow.product_stock.trim();
    const stock = Number.parseInt(stockStr || "0", 10);
    if (!Number.isNaN(stock) && stock < 0) {
      errors.push("product_stock must be 0 or greater - this row will be skipped");
    }

    if (stock === 0 && normalizeBoolean(normalizedRow.show_in_catalog)) {
      normalizedRow.show_in_catalog = "false";
      warnings.push("stock is 0, visibility will be set to hidden automatically.");
    }

    // Validate image_1 … image_5 — each must be empty or a supported extension
    const imageSlots = [row.image_1, row.image_2, row.image_3, row.image_4, row.image_5];
    const badExts = imageSlots
      .map((n) => n.trim().toLowerCase())
      .filter((n) => {
        if (!n) return false;
        const ext = n.split(".").pop() || "";
        return !ALLOWED_IMAGE_EXTENSIONS.has(ext);
      });
    if (badExts.length > 0) {
      errors.push(
        `image columns: unsupported format(s): ${badExts.join(", ")} — must be jpg, jpeg, png, webp, gif, or avif`,
      );
    }

    if (row.product_name?.trim()) {
      const fingerprint = buildProductFingerprint(
        row.product_name,
        normalizedRow.category_id,
        normalizedRow.product_price,
      );
      if (existingFingerprints.has(fingerprint)) {
        errors.push(
          "a product with these exact details already exists in your inventory - this row will be skipped",
        );
      } else if (seenInBatch.has(fingerprint)) {
        errors.push("duplicate of another row in this file - this row will be skipped");
      } else {
        seenInBatch.add(fingerprint);
      }
    }

    return { raw: row, normalized: normalizedRow, index, errors, warnings, isValid: errors.length === 0 };
  });
}

function parseRawRows(data: Record<string, string>[]): ParsedRow[] {
  return data
    .filter((row) => {
      const name = String(row["product_name"] ?? "").trim();
      return name && name !== "0";
    })
    .map((row) => ({
      product_name: String(row["product_name"] ?? "").trim(),
      category_id: String(row["category_id"] ?? "").trim(),
      product_price: String(row["product_price"] ?? "").trim(),
      product_brand: String(row["product_brand"] ?? "").trim(),
      product_stock: String(row["product_stock"] ?? "").trim(),
      size_label: String(row["size_label"] ?? "").trim(),
      product_condition: String(row["product_condition"] ?? "").trim(),
      product_description: String(row["product_description"] ?? "").trim(),
      show_in_catalog: String(row["show_in_catalog"] ?? "true").trim(),
      image_1: String(row["image_1"] ?? "").trim(),
      image_2: String(row["image_2"] ?? "").trim(),
      image_3: String(row["image_3"] ?? "").trim(),
      image_4: String(row["image_4"] ?? "").trim(),
      image_5: String(row["image_5"] ?? "").trim(),
    }));
}

/** Returns the ordered list of non-empty image filenames for a row.
 *  The first non-empty value becomes the primary image (fallback if image_1 is blank). */
function getRowImageNames(row: ParsedRow): string[] {
  return [row.image_1, row.image_2, row.image_3, row.image_4, row.image_5]
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
}

const NO_PRODUCTS: Product[] = [];
// Image compression is CPU and memory heavy, so keep only a few running at once.
const IMAGE_COMPRESSION_CONCURRENCY = 3;

type Step = "upload" | "preview" | "results";

export default function BulkImportModal({
  isOpen,
  onClose,
  onImportComplete,
  existingProducts = NO_PRODUCTS,
}: BulkImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSubLabel, setImportSubLabel] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  // Only read by handlers, so a ref avoids redundant renders.
  const currentSessionRef = useRef<string | null>(null);

  // Image state
  const [droppedImages, setDroppedImages] = useState<Map<string, File>>(new Map());
  // Mutated in place; only read by import handlers, so changes need not re-render.
  const [compressedCache] = useState(() => new Map<string, File>());
  const [imageMatchError, setImageMatchError] = useState<string | null>(null);
  const [imageMatching, setImageMatching] = useState<ImageMatching | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimatedUploadBytes, setEstimatedUploadBytes] = useState(0);

  // Storage quota

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Fetch quota on open
  const { data: usage } = useQuery({
    queryKey: ["storage-usage"],
    queryFn: () => fetchJson<{ usedBytes?: number; budgetBytes: number }>("/api/admin/storage/usage"),
    enabled: isOpen,
  });
  const quota: StorageQuota | null =
    typeof usage?.usedBytes === "number"
      ? { usedBytes: usage.usedBytes, budgetBytes: usage.budgetBytes }
      : null;

  // Compute image matching whenever validatedRows or droppedImages changes
  useEffect(() => {
    if (validatedRows.length === 0) {
      setImageMatching(null);
      return;
    }

    const allReferenced = new Map<string, number[]>(); // name → row indices
    for (const row of validatedRows) {
      if (!row.isValid) continue;
      for (const name of getRowImageNames(row.raw)) {
        if (!allReferenced.has(name)) allReferenced.set(name, []);
        allReferenced.get(name)!.push(row.index);
      }
    }

    const rowImageCounts = new Map<number, number>();
    const unmatchedReferences: string[] = [];

    for (const [name, rowIndices] of allReferenced) {
      if (droppedImages.has(name)) {
        for (const idx of rowIndices) {
          rowImageCounts.set(idx, (rowImageCounts.get(idx) || 0) + 1);
        }
      } else {
        unmatchedReferences.push(name);
      }
    }

    const allReferencedNames = new Set(allReferenced.keys());
    const orphanFiles = [...droppedImages.keys()].filter((name) => !allReferencedNames.has(name));

    setImageMatching({ unmatchedReferences, orphanFiles, rowImageCounts });
  }, [validatedRows, droppedImages]);

  // Background compression of matched images whenever droppedImages or matching changes
  useEffect(() => {
    if (droppedImages.size === 0 || validatedRows.length === 0) {
      compressedCache.clear();
      setEstimatedUploadBytes(0);
      return;
    }

    const referencedNames = new Set<string>();
    for (const row of validatedRows) {
      if (!row.isValid) continue;
      for (const name of getRowImageNames(row.raw)) {
        if (droppedImages.has(name)) referencedNames.add(name);
      }
    }

    if (referencedNames.size === 0) {
      compressedCache.clear();
      setEstimatedUploadBytes(0);
      return;
    }

    let cancelled = false;
    setIsEstimating(true);

    (async () => {
      const cache = new Map<string, File>();
      let totalBytes = 0;

      await mapWithConcurrency([...referencedNames], IMAGE_COMPRESSION_CONCURRENCY, async (name) => {
        if (cancelled) return;
        const compressed = await compressImage(droppedImages.get(name)!);
        cache.set(name, compressed);
        totalBytes += compressed.size;
      });

      if (!cancelled) {
        compressedCache.clear();
        for (const [name, file] of cache) compressedCache.set(name, file);
        setEstimatedUploadBytes(totalBytes);
        setIsEstimating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [droppedImages, validatedRows, compressedCache]);

  const reset = () => {
    setStep("upload");
    setFileName(null);
    setParseError(null);
    setValidatedRows([]);
    setImporting(false);
    setImportProgress(0);
    setImportSubLabel("");
    setImportResult(null);
    currentSessionRef.current = null;
    setDroppedImages(new Map());
    compressedCache.clear();
    setImageMatchError(null);
    setImageMatching(null);
    setIsEstimating(false);
    setEstimatedUploadBytes(0);
  };

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose();
  };

  const closeOnEscape = useEffectEvent(() => {
    if (!importing) handleClose();
  });

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeOnEscape();
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const processFile = useCallback(
    (file: File) => {
      setParseError(null);
      setFileName(file.name);
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "xlsx") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames.includes("Export Ready")
              ? "Export Ready"
              : workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rangeOffset = sheetName === "Export Ready" ? 1 : 0;
            const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
              defval: "",
              range: rangeOffset,
            });
            const rows = parseRawRows(json);
            if (rows.length === 0) {
              setParseError("The file contains no data rows.");
              toast.error("The uploaded file has no importable product rows.");
              return;
            }
            setValidatedRows(validateRows(rows, existingProducts));
            setStep("preview");
          } catch {
            setParseError("Failed to parse Excel file. Make sure it is a valid .xlsx file.");
            toast.error("We couldn't read that spreadsheet. Please upload a valid .xlsx file.");
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setParseError("Unsupported file type. Please upload a .xlsx file.");
        toast.error("Unsupported file type. Please upload a .xlsx file.");
      }
    },
    [existingProducts],
  );

  const addImageFiles = useCallback((files: File[]) => {
    setImageMatchError(null);
    const rejected: string[] = [];
    const toAdd = new Map<string, File>();

    for (const file of files) {
      if (!isValidImageFile(file)) {
        rejected.push(file.name);
        continue;
      }
      if (file.size > MAX_IMAGE_FILE_SIZE) {
        rejected.push(`${file.name} (exceeds 5 MB)`);
        continue;
      }
      toAdd.set(file.name.toLowerCase(), file);
    }

    if (toAdd.size > 0) {
      setDroppedImages((prev) => {
        const next = new Map(prev);
        for (const [k, v] of toAdd) next.set(k, v);
        return next;
      });
    }
    if (rejected.length > 0) {
      setImageMatchError(
        `Skipped ${rejected.length} file(s) — unsupported type or over 5 MB: ${rejected.slice(0, 3).join(", ")}${rejected.length > 3 ? ` …and ${rejected.length - 3} more` : ""}`,
      );
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addImageFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const allFiles = Array.from(e.dataTransfer.files);
    const xlsxFiles = allFiles.filter((f) => f.name.toLowerCase().endsWith(".xlsx"));
    const imageFiles = allFiles.filter((f) => !f.name.toLowerCase().endsWith(".xlsx"));

    if (xlsxFiles.length > 0) processFile(xlsxFiles[0]);
    if (imageFiles.length > 0) addImageFiles(imageFiles);
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const imageFiles = Array.from(e.dataTransfer.files).filter(
      (f) => !f.name.toLowerCase().endsWith(".xlsx"),
    );
    if (imageFiles.length > 0) addImageFiles(imageFiles);
  };

  const handleRetryImages = async (failure: ImageFailure) => {
    const accessToken = currentSessionRef.current;
    if (!accessToken) return;
    toast.info(`Retrying images for "${failure.name}"…`);
    const retried: string[] = [];

    await Promise.all(
      failure.imagesFailed.map(async (failedName, j) => {
        const name = failedName.toLowerCase();
        const fileToUpload = compressedCache.get(name) ?? droppedImages.get(name);
        if (!fileToUpload) return;

        try {
          await uploadProductImageFile({
            accessToken,
            displayOrder: j + 1,
            file: fileToUpload,
            isPrimary: j === 0,
            productId: failure.productId,
          });
        } catch {
          retried.push(name);
        }
      })
    );

    if (retried.length === 0) {
      toast.success(`Images uploaded for "${failure.name}".`);
      setImportResult((prev) =>
        prev
          ? {
              ...prev,
              partialImageFailures: prev.partialImageFailures.filter(
                (f) => f.productId !== failure.productId,
              ),
            }
          : prev,
      );
    } else {
      toast.error(`${retried.length} image(s) still failed for "${failure.name}".`);
    }
  };

  const handleImport = async () => {
    const validRows = validatedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setImporting(true);
    setImportProgress(0);
    setImportSubLabel("");

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setParseError("Not authenticated. Please refresh and try again.");
      toast.error("You need to sign in again before importing.");
      setImporting(false);
      return;
    }
    currentSessionRef.current = session.access_token;

    let succeeded = 0;
    const errors: ImportResult["errors"] = [];
    const partialImageFailures: ImageFailure[] = [];

    // Weighted units: 1 per product row + 1 per matched image
    const totalUnits = validRows.reduce((sum, r) => {
      const matchedCount = getRowImageNames(r.raw).filter((n) => droppedImages.has(n)).length;
      return sum + 1 + matchedCount;
    }, 0);
    let completedUnits = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setImportSubLabel(`Row ${i + 1} of ${validRows.length}`);

      let productId: string | null = null;

      try {
        const normalized = row.normalized;
        const payload = {
          product_name: row.raw.product_name.trim(),
          category_id: Number.parseInt(normalized.category_id, 10),
          product_price: Number(normalized.product_price.trim()),
          product_brand: row.raw.product_brand.trim() || "Dolly's Closet",
          product_stock: Number.parseInt(normalized.product_stock || "0", 10),
          size_label: (row.raw.size_label.trim() || "One Size").slice(0, MAX_META_LENGTH),
          product_condition: (row.raw.product_condition.trim() || "New").slice(0, MAX_META_LENGTH),
          product_description: row.raw.product_description.trim(),
          show_in_catalog: normalizeBoolean(normalized.show_in_catalog),
          image_id: null,
        };

        const response = await fetch("/api/admin/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          errors.push({
            row: row.index + 2,
            name: row.raw.product_name || `Row ${row.index + 2}`,
            reason: data.error || "Server error",
          });
        } else {
          const productData = await response.json();
          productId = String(productData.product?.product_id ?? productData.product_id ?? "");
          succeeded++;
        }
      } catch {
        errors.push({
          row: row.index + 2,
          name: row.raw.product_name || `Row ${row.index + 2}`,
          reason: "Network error",
        });
      }

      completedUnits++;
      setImportProgress(Math.round((completedUnits / totalUnits) * 100));

      // Upload images for this product (only if the product was created)
      if (productId) {
        const imageNames = getRowImageNames(row.raw);

        setImportSubLabel(
          `Row ${i + 1} of ${validRows.length} — uploading ${imageNames.length} image(s)`,
        );

        // Each image carries its own display order, so a product's images can upload together.
        const uploadFailed = await Promise.all(
          imageNames.map(async (name, j) => {
            const fileToUpload = compressedCache.get(name) ?? droppedImages.get(name);
            let failed = false;

            if (fileToUpload) {
              try {
                await uploadProductImageFile({
                  accessToken: session.access_token,
                  displayOrder: j + 1,
                  file: fileToUpload,
                  isPrimary: j === 0,
                  productId,
                });
              } catch {
                failed = true;
              }
            }

            completedUnits++;
            setImportProgress(Math.round((completedUnits / totalUnits) * 100));
            return failed;
          }),
        );
        const imagesFailed = imageNames.filter((_, j) => uploadFailed[j]);

        if (imagesFailed.length > 0) {
          partialImageFailures.push({
            row: row.index + 2,
            name: row.raw.product_name,
            productId,
            imagesFailed,
          });
        }
      }
    }

    const skipped = validatedRows.filter((r) => !r.isValid).length;
    setImportResult({ succeeded, skipped, errors, partialImageFailures });
    setImporting(false);
    setImportSubLabel("");
    setStep("results");

    if (succeeded > 0) {
      onImportComplete();
      const hadIssues = errors.length > 0 || skipped > 0 || partialImageFailures.length > 0;
      if (hadIssues) {
        toast.warning(`Imported ${succeeded} product(s), with ${errors.length + skipped} row(s) needing attention.`);
      } else {
        toast.success(`Imported ${succeeded} product${succeeded !== 1 ? "s" : ""} successfully.`);
      }
    } else {
      toast.error("No products were imported. Review the row errors and try again.");
    }
  };

  if (!isOpen) return null;

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const invalidCount = validatedRows.filter((r) => !r.isValid).length;
  const warnCount = validatedRows.filter((r) => r.isValid && r.warnings.length > 0).length;
  const rowsWithImages = imageMatching
    ? [...imageMatching.rowImageCounts.entries()].filter(([, count]) => count > 0).length
    : 0;
  const remainingBytes = quota ? quota.budgetBytes - quota.usedBytes : null;
  const isStorageBlocked =
    remainingBytes !== null && estimatedUploadBytes > 0 && estimatedUploadBytes > remainingBytes;
  const isStorageWarning =
    !isStorageBlocked &&
    remainingBytes !== null &&
    estimatedUploadBytes > 0 &&
    estimatedUploadBytes > remainingBytes * 0.8;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <ModalBackdrop onClick={() => { if (!importing) handleClose(); }} />
      <Card className="relative bg-white w-full max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b p-6 space-y-0 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-pink-400" />
              <CardTitle className="text-gray-900">Bulk Import Products</CardTitle>
            </div>
            <p className="text-sm text-gray-500">
              Upload a prepared spreadsheet, review the preview, and import only the valid rows.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Storage usage pill */}
            {quota && (
              <span
                className={`hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                  quota.usedBytes / quota.budgetBytes > 0.9
                    ? "bg-red-50 border-red-200 text-red-700"
                    : quota.usedBytes / quota.budgetBytes > 0.7
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-gray-50 border-gray-200 text-gray-500"
                }`}
                title="Storage used / budget"
              >
                <HardDrive className="w-3 h-3" />
                {formatBytes(quota.usedBytes)} / {formatBytes(quota.budgetBytes)}
              </span>
            )}
            <a
              href="/api/admin/products/bulk-import-template"
              download="product_bulk_import_template.xlsx"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Template
            </a>
            <button aria-label="Close bulk import"
              type="button"
              onClick={handleClose}
              disabled={importing}
              className="text-gray-400 hover:text-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ── Upload step ──────────────────────────────────────────── */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 space-y-3">
                {/* Step-by-step guide */}
                <div className="bg-pink-50 border border-pink-100 rounded-lg p-4 space-y-2.5">
                  <p className="text-xs font-semibold text-pink-800 uppercase tracking-wide">How to bulk import</p>
                  <ol className="space-y-2 text-xs text-gray-700 list-none">
                    <li className="flex gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-200 text-pink-800 font-bold flex items-center justify-center text-xs">1</span>
                      <span><strong>Download the template</strong> using the link above. Fill in product data on the <em>Export Ready</em> sheet. Use the <em>Instructions</em> sheet inside the file for column descriptions.</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-200 text-pink-800 font-bold flex items-center justify-center text-xs">2</span>
                      <span><strong>Add images (optional):</strong> In columns <code className="bg-white border border-gray-200 px-1 rounded">image_1</code> through <code className="bg-white border border-gray-200 px-1 rounded">image_5</code>, type the filename of each image for that product (e.g. <code className="bg-white border border-gray-200 px-1 rounded">front.jpg</code>). <code className="bg-white border border-gray-200 px-1 rounded">image_1</code> is the primary/cover photo. If <code className="bg-white border border-gray-200 px-1 rounded">image_1</code> is blank, the first filled column is used as primary.</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-200 text-pink-800 font-bold flex items-center justify-center text-xs">3</span>
                      <span><strong>Prepare your image files</strong> in a folder on your computer. The filenames must exactly match what you typed in the spreadsheet (case-insensitive). Supported formats: jpg, jpeg, png, webp, gif, avif. Max 5 MB per image.</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-200 text-pink-800 font-bold flex items-center justify-center text-xs">4</span>
                      <span><strong>Drop everything here at once</strong> — your <code className="bg-white border border-gray-200 px-1 rounded">.xlsx</code> file and all image files (or a whole folder). Or drop images in the next step after the spreadsheet is parsed.</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-200 text-pink-800 font-bold flex items-center justify-center text-xs">5</span>
                      <span><strong>Review the Preview step</strong> — check which rows are valid, which images matched, and the estimated storage usage — then click Import.</span>
                    </li>
                  </ol>
                </div>

                {/* Column reference */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-medium text-gray-700">Required columns</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["product_name", "category_id", "product_price"].map((col) => (
                      <code key={col} className="bg-white border border-gray-300 px-1.5 py-0.5 rounded text-xs text-pink-600">{col}</code>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-gray-700 pt-1">Optional columns</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "product_brand", "product_stock", "size_label",
                      "product_condition", "product_description", "show_in_catalog",
                      "image_1", "image_2", "image_3", "image_4", "image_5",
                    ].map((col) => (
                      <code key={col} className={`bg-white border px-1.5 py-0.5 rounded text-xs ${col.startsWith("image_") ? "border-blue-200 text-blue-600" : "border-gray-300 text-gray-500"}`}>{col}</code>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 pt-1">
                    <strong>category_id</strong> must be a whole number (e.g. <code className="bg-white border border-gray-200 px-1 rounded">11</code>).{" "}
                    <strong>product_price</strong> digits only — no currency symbols.{" "}
                    <strong>show_in_catalog</strong>: <code className="bg-white border border-gray-200 px-1 rounded">1</code> = visible, <code className="bg-white border border-gray-200 px-1 rounded">0</code> = hidden.{" "}
                    <strong className="text-blue-600">image_1–image_5</strong>: one filename per cell, e.g. <code className="bg-white border border-gray-200 px-1 rounded">front.jpg</code>.
                  </p>
                </div>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                  isDragging
                    ? "border-pink-400 bg-pink-50"
                    : "border-gray-300 hover:border-pink-300 hover:bg-gray-50"
                }`}
              >
                <Upload className={`w-10 h-10 ${isDragging ? "text-pink-400" : "text-gray-400"}`} />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    {isDragging
                      ? "Drop your files here"
                      : "Drag & drop your spreadsheet + images here"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">or click to browse for your .xlsx</p>
                </div>
              </div>

              {/* Dropped images summary (while still on upload step) */}
              {droppedImages.size > 0 && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" />
                    {droppedImages.size} image file{droppedImages.size !== 1 ? "s" : ""} ready
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDroppedImages(new Map());
                    }}
                    className="text-blue-500 hover:text-blue-700 text-xs"
                  >
                    Clear
                  </button>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />

              {parseError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {parseError}
                </div>
              )}
              {imageMatchError && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {imageMatchError}
                </div>
              )}
            </div>
          )}

          {/* ── Preview step ─────────────────────────────────────────── */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm text-gray-600">
                  File: <strong>{fileName}</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> {validCount} valid
                </span>
                {warnCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                    <AlertTriangle className="w-3 h-3" /> {warnCount} with warnings
                  </span>
                )}
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                    <AlertTriangle className="w-3 h-3" /> {invalidCount} will be skipped
                  </span>
                )}
                {/* Image stats */}
                {rowsWithImages > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                    <ImageIcon className="w-3 h-3" /> {rowsWithImages} rows with images
                  </span>
                )}
                {imageMatching && imageMatching.unmatchedReferences.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium cursor-default"
                    title={`Missing: ${imageMatching.unmatchedReferences.join(", ")}`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {imageMatching.unmatchedReferences.length} filename
                    {imageMatching.unmatchedReferences.length !== 1 ? "s" : ""} missing
                  </span>
                )}
                {imageMatching && imageMatching.orphanFiles.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium cursor-default"
                    title={`Not referenced: ${imageMatching.orphanFiles.join(", ")}`}
                  >
                    <ImageIcon className="w-3 h-3" />
                    {imageMatching.orphanFiles.length} orphan file
                    {imageMatching.orphanFiles.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Storage estimate */}
              {(isEstimating || estimatedUploadBytes > 0) && quota && (
                <div
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                    isStorageBlocked
                      ? "bg-red-50 border-red-300 text-red-700"
                      : isStorageWarning
                        ? "bg-amber-50 border-amber-300 text-amber-700"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                  }`}
                >
                  <HardDrive className="w-4 h-4 shrink-0" />
                  {isEstimating ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Estimating upload size…
                    </span>
                  ) : (
                    <span>
                      Estimated upload: <strong>{formatBytes(estimatedUploadBytes)}</strong>
                      {" — "}
                      {formatBytes(Math.max(0, quota.budgetBytes - quota.usedBytes))} remaining
                      {isStorageBlocked && (
                        <strong className="ml-1">
                          — would exceed budget by{" "}
                          {formatBytes(estimatedUploadBytes - (quota.budgetBytes - quota.usedBytes))}
                        </strong>
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* Image drop zone in preview */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={handleImageDrop}
                className="border border-dashed border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3 bg-gray-50 hover:border-pink-300 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  {droppedImages.size === 0 ? (
                    "Drop image files here to attach them to rows"
                  ) : (
                    <span className="text-gray-700">
                      <strong>{droppedImages.size}</strong> image file
                      {droppedImages.size !== 1 ? "s" : ""} loaded
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="text-xs text-pink-600 hover:text-pink-800 transition-colors"
                  >
                    Browse…
                  </button>
                  {droppedImages.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setDroppedImages(new Map())}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-[#E7A3B0]/20 bg-[#fff9fb] px-4 py-3 text-sm text-[#8a6b73]">
                {validCount > 0
                  ? `Ready to import ${validCount} valid row${validCount !== 1 ? "s" : ""}. Invalid rows will be skipped automatically.`
                  : "No valid rows are ready yet. Fix the skipped rows in your spreadsheet and upload again."}
              </div>

              <div className="overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium w-8">#</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Name</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Category ID</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Price</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Brand</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Stock</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Size</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Condition</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Visible</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Images</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validatedRows.map((row) => {
                      const matchedCount = imageMatching?.rowImageCounts.get(row.index) ?? 0;
                      const requestedCount = getRowImageNames(row.raw).length;
                      return (
                        <tr
                          key={row.index}
                          className={`border-b last:border-0 ${
                            !row.isValid
                              ? "bg-red-50"
                              : row.warnings.length > 0
                                ? "bg-amber-50"
                                : "bg-white"
                          }`}
                        >
                          <td className="px-3 py-2 text-gray-400">{row.index + 2}</td>
                          <td className="px-3 py-2 text-gray-900 max-w-[160px] truncate">
                            {row.raw.product_name || (
                              <span className="text-red-400 italic">empty</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{row.raw.category_id || "-"}</td>
                          <td className="px-3 py-2 text-gray-700">{row.raw.product_price || "-"}</td>
                          <td className="px-3 py-2 text-gray-700 max-w-[100px] truncate">
                            {row.raw.product_brand || (
                              <span className="text-gray-400">default</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{row.raw.product_stock || "0"}</td>
                          <td className="px-3 py-2 text-gray-700">
                            {row.raw.size_label || <span className="text-gray-400">One Size</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {row.raw.product_condition || (
                              <span className="text-gray-400">New</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {row.raw.show_in_catalog || "true"}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {requestedCount === 0 ? (
                              <span className="text-gray-300">—</span>
                            ) : matchedCount === requestedCount ? (
                              <span className="text-blue-600 font-medium">{matchedCount} ✓</span>
                            ) : (
                              <span className="text-orange-500 font-medium" title={`${matchedCount} of ${requestedCount} matched`}>
                                {matchedCount}/{requestedCount}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {!row.isValid ? (
                              <span className="text-red-600 font-medium" title={row.errors.join("; ")}>
                                Skip
                              </span>
                            ) : row.warnings.length > 0 ? (
                              <span className="text-amber-600 font-medium" title={row.warnings.join("; ")}>
                                Warn
                              </span>
                            ) : (
                              <span className="text-green-600 font-medium">OK</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Missing filenames */}
              {imageMatching && imageMatching.unmatchedReferences.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-orange-800">
                    Filenames referenced but not found in dropped files — rows will import without
                    these images ({imageMatching.unmatchedReferences.length}):
                  </p>
                  <p className="text-xs text-orange-700">
                    {imageMatching.unmatchedReferences.join(", ")}
                  </p>
                </div>
              )}

              {/* Orphan files */}
              {imageMatching && imageMatching.orphanFiles.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-gray-700">
                    Dropped image files not referenced in any row — will be ignored (
                    {imageMatching.orphanFiles.length}):
                  </p>
                  <p className="text-xs text-gray-500">{imageMatching.orphanFiles.join(", ")}</p>
                </div>
              )}

              {invalidCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-red-800">
                    Rows that will be skipped ({invalidCount}):
                  </p>
                  {validatedRows
                    .filter((r) => !r.isValid)
                    .map((r) => (
                      <div key={r.index} className="text-xs text-red-700">
                        <span className="font-medium">Row {r.index + 2}:</span>{" "}
                        {r.errors.join(" - ")}
                      </div>
                    ))}
                </div>
              )}

              {warnCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-amber-800">
                    Rows with warnings - these will still be imported ({warnCount}):
                  </p>
                  {validatedRows
                    .filter((r) => r.isValid && r.warnings.length > 0)
                    .map((r) => (
                      <div key={r.index} className="text-xs text-amber-700">
                        <span className="font-medium">Row {r.index + 2}:</span>{" "}
                        {r.warnings.join(" - ")}
                      </div>
                    ))}
                </div>
              )}

              {/* Storage hard block banner */}
              {isStorageBlocked && (
                <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  Importing these images would exceed your storage budget. Remove some images from
                  your spreadsheet or free up storage before continuing.
                </div>
              )}

              {/* Storage soft warning banner */}
              {isStorageWarning && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  This import will use a large portion of your remaining storage budget. You can
                  continue, but consider monitoring usage afterwards.
                </div>
              )}

              {importing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{importSubLabel || "Importing…"}</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-pink-400 h-2 rounded-full transition duration-200"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Results step ─────────────────────────────────────────── */}
          {step === "results" && importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Import complete</p>
                  <p className="text-sm text-gray-600">
                    {importResult.succeeded} product
                    {importResult.succeeded !== 1 ? "s" : ""} added successfully.
                    {importResult.skipped > 0 &&
                      ` ${importResult.skipped} row${importResult.skipped !== 1 ? "s" : ""} skipped (validation errors).`}
                    {importResult.errors.length > 0 &&
                      ` ${importResult.errors.length} row${importResult.errors.length !== 1 ? "s" : ""} failed during import.`}
                    {importResult.partialImageFailures.length > 0 &&
                      ` ${importResult.partialImageFailures.length} product${importResult.partialImageFailures.length !== 1 ? "s" : ""} imported without some images.`}
                  </p>
                </div>
              </div>

              <div
                className={`grid gap-3 ${importResult.partialImageFailures.length > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
              >
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">
                    Imported
                  </p>
                  <p className="mt-1 text-2xl font-bold text-green-800">{importResult.succeeded}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Skipped
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-800">{importResult.skipped}</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
                    Failed
                  </p>
                  <p className="mt-1 text-2xl font-bold text-red-800">
                    {importResult.errors.length}
                  </p>
                </div>
                {importResult.partialImageFailures.length > 0 && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                      Image Issues
                    </p>
                    <p className="mt-1 text-2xl font-bold text-orange-800">
                      {importResult.partialImageFailures.length}
                    </p>
                  </div>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-red-800">Failed rows:</p>
                  {importResult.errors.map((err) => (
                    <p key={`${err.row}-${err.reason}`} className="text-xs text-red-700">
                      Row {err.row} ({err.name}): {err.reason}
                    </p>
                  ))}
                </div>
              )}

              {importResult.partialImageFailures.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-orange-800">
                    Products imported but some images failed — you can retry:
                  </p>
                  {importResult.partialImageFailures.map((failure) => (
                    <div
                      key={failure.productId || failure.row}
                      className="flex items-center justify-between gap-2"
                    >
                      <p className="text-xs text-orange-700">
                        Row {failure.row} ({failure.name}):{" "}
                        {failure.imagesFailed.join(", ")}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRetryImages(failure)}
                        className="text-xs text-orange-700 font-medium hover:text-orange-900 underline whitespace-nowrap"
                      >
                        Retry
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t bg-gray-50 p-4 flex gap-3 shrink-0">
          {step === "upload" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-gray-300 text-gray-700 bg-white hover:bg-white hover:text-black"
            >
              Cancel
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={reset}
                disabled={importing}
                className="border-gray-300 text-gray-700 bg-white hover:bg-white hover:text-black"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={importing || validCount === 0 || isEstimating || isStorageBlocked}
                className="flex-1 bg-[#E7A3B0] hover:bg-[#ca8c98] text-white"
              >
                {isEstimating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Preparing images…
                  </>
                ) : importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing…
                  </>
                ) : (
                  `Import ${validCount} Product${validCount !== 1 ? "s" : ""}`
                )}
              </Button>
            </>
          )}

          {step === "results" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={reset}
                className="border-gray-300 text-gray-700 bg-white hover:bg-white hover:text-black"
              >
                Import More
              </Button>
              <Button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-[#E7A3B0] hover:bg-[#ca8c98] text-white"
              >
                Done
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {/* Hidden image input (used by Browse button in preview) */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageInputChange}
      />
    </div>
  );
}
