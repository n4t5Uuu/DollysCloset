"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Upload, Download, AlertTriangle, CheckCircle2, Loader2, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { createClient, InventoryProduct as Product } from "@dollys-closet/core";
import { 
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@dollys-closet/ui";
import { toast } from "sonner";

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
}

interface ValidatedRow {
  raw: ParsedRow;
  normalized: ParsedRow;
  index: number;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

interface ImportResult {
  succeeded: number;
  skipped: number;
  errors: { row: number; name: string; reason: string }[];
}

const MAX_META_LENGTH = 9;

function normalizeBoolean(value: string): boolean {
  const lower = value.trim().toLowerCase();
  if (lower === "false" || lower === "0" || lower === "no") return false;
  return true;
}

function sanitizeWholeNumberInput(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return /^\d+$/.test(trimmed) ? trimmed : "0";
}

function sanitizeDecimalInput(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return /^\d+(\.\d+)?$/.test(trimmed) ? trimmed : "0";
}

function buildProductFingerprint(
  name: string,
  categoryId: string,
  price: string,
): string {
  const normalizedPrice = String(Number(price.trim()));

  return [
    name.trim().toLowerCase(),
    categoryId.trim(),
    normalizedPrice,
  ].join("|");
}

function validateRows(rows: ParsedRow[], existingProducts: Product[] = []): ValidatedRow[] {
  const existingFingerprints = new Set(
    existingProducts.map((p) =>
      buildProductFingerprint(
        p.product_name,
        String(p.category_id),
        String(p.product_price),
      )
    )
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
      errors.push(`category_id "${originalCategoryId || "empty"}" must be a whole number (e.g. 11) - this row will be skipped`);
    }

    const originalPrice = row.product_price?.trim() ?? "";
    const priceStr = normalizedRow.product_price.trim();
    const hasInvalidPriceCharacters = Boolean(
      originalPrice && normalizedRow.product_price === "0" && originalPrice !== "0"
    );
    const price = Number(priceStr);
    if (hasInvalidPriceCharacters || !priceStr || Number.isNaN(price) || price < 0) {
      errors.push(`product_price "${originalPrice || "empty"}" must be a plain number with no letters or symbols (e.g. 150 or 150.00) - this row will be skipped`);
    }

    const originalStock = row.product_stock?.trim() ?? "";
    if (originalStock && normalizedRow.product_stock === "0" && originalStock !== "0") {
      warnings.push(`product_stock "${originalStock}" contains non-numeric characters somewhere in the field - it will be imported as 0.`);
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

    if (row.product_name?.trim()) {
      const fingerprint = buildProductFingerprint(
        row.product_name,
        normalizedRow.category_id,
        normalizedRow.product_price,
      );

      if (existingFingerprints.has(fingerprint)) {
        errors.push("a product with these exact details already exists in your inventory - this row will be skipped");
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
    }));
}

type Step = "upload" | "preview" | "results";

export default function BulkImportModal({ isOpen, onClose, onImportComplete, existingProducts = [] }: BulkImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setFileName(null);
    setParseError(null);
    setValidatedRows([]);
    setImporting(false);
    setImportProgress(0);
    setImportResult(null);
  };

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !importing) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [importing, isOpen]);

  const processFile = useCallback((file: File) => {
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
  }, [existingProducts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    const validRows = validatedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setImporting(true);
    setImportProgress(0);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setParseError("Not authenticated. Please refresh and try again.");
      toast.error("You need to sign in again before importing.");
      setImporting(false);
      return;
    }

    let succeeded = 0;
    const errors: ImportResult["errors"] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
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
          succeeded++;
        }
      } catch {
        errors.push({
          row: row.index + 2,
          name: row.raw.product_name || `Row ${row.index + 2}`,
          reason: "Network error",
        });
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    const skipped = validatedRows.filter((r) => !r.isValid).length;
    setImportResult({ succeeded, skipped, errors });
    setImporting(false);
    setStep("results");

    if (succeeded > 0) {
      onImportComplete();
      if (errors.length > 0 || skipped > 0) {
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(event) => {
      if (event.target === event.currentTarget && !importing) {
        handleClose();
      }
    }}>
      <Card className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden" onClick={(event) => event.stopPropagation()}>
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
            <a
              href="/api/admin/products/bulk-import-template"
              download="product_bulk_import_template.xlsx"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Template
            </a>
            <button
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
          {step === "upload" && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  Upload the <strong>Export Ready</strong> sheet from your template as a <strong>.xlsx</strong> file to add multiple products at once.
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-medium text-gray-700">Required columns</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["product_name", "category_id", "product_price"].map((col) => (
                      <code key={col} className="bg-white border border-gray-300 px-1.5 py-0.5 rounded text-xs text-pink-600">{col}</code>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-gray-700 pt-1">Optional columns</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["product_brand", "product_stock", "size_label", "product_condition", "product_description", "show_in_catalog"].map((col) => (
                      <code key={col} className="bg-white border border-gray-300 px-1.5 py-0.5 rounded text-xs text-gray-500">{col}</code>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 pt-1">
                    <strong>category_id</strong> must be a whole number (e.g. <code className="bg-white border border-gray-200 px-1 rounded">11</code>).{" "}
                    <strong>product_price</strong> must be digits only - no currency symbols or text (e.g. <code className="bg-white border border-gray-200 px-1 rounded">150</code> or <code className="bg-white border border-gray-200 px-1 rounded">150.00</code>).{" "}
                    <strong>product_stock</strong> with invalid characters anywhere in the field will be set to <code className="bg-white border border-gray-200 px-1 rounded">0</code>.{" "}
                    <strong>show_in_catalog</strong>: <code className="bg-white border border-gray-200 px-1 rounded">1</code> = visible,{" "}
                    <code className="bg-white border border-gray-200 px-1 rounded">0</code> = hidden.
                  </p>
                </div>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                  isDragging
                    ? "border-pink-400 bg-pink-50"
                    : "border-gray-300 hover:border-pink-300 hover:bg-gray-50"
                }`}
              >
                <Upload className={`w-10 h-10 ${isDragging ? "text-pink-400" : "text-gray-400"}`} />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    {isDragging ? "Drop your file here" : "Drag & drop your file here"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">or click to browse - .xlsx only</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileChange}
              />

              {parseError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {parseError}
                </div>
              )}
            </div>
          )}

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
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validatedRows.map((row) => (
                      <tr
                        key={row.index}
                        className={`border-b last:border-0 ${
                          !row.isValid ? "bg-red-50" : row.warnings.length > 0 ? "bg-amber-50" : "bg-white"
                        }`}
                      >
                        <td className="px-3 py-2 text-gray-400">{row.index + 2}</td>
                        <td className="px-3 py-2 text-gray-900 max-w-[160px] truncate">{row.raw.product_name || <span className="text-red-400 italic">empty</span>}</td>
                        <td className="px-3 py-2 text-gray-700">{row.raw.category_id || "-"}</td>
                        <td className="px-3 py-2 text-gray-700">{row.raw.product_price || "-"}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[100px] truncate">{row.raw.product_brand || <span className="text-gray-400">default</span>}</td>
                        <td className="px-3 py-2 text-gray-700">{row.raw.product_stock || "0"}</td>
                        <td className="px-3 py-2 text-gray-700">{row.raw.size_label || <span className="text-gray-400">One Size</span>}</td>
                        <td className="px-3 py-2 text-gray-700">{row.raw.product_condition || <span className="text-gray-400">New</span>}</td>
                        <td className="px-3 py-2 text-gray-700">{row.raw.show_in_catalog || "true"}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>

              {invalidCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-red-800">Rows that will be skipped ({invalidCount}):</p>
                  {validatedRows
                    .filter((r) => !r.isValid)
                    .map((r) => (
                      <div key={r.index} className="text-xs text-red-700">
                        <span className="font-medium">Row {r.index + 2}:</span> {r.errors.join(" - ")}
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
                        <span className="font-medium">Row {r.index + 2}:</span> {r.warnings.join(" - ")}
                      </div>
                    ))}
                </div>
              )}

              {importing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Importing...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-pink-400 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "results" && importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Import complete</p>
                  <p className="text-sm text-gray-600">
                    {importResult.succeeded} product{importResult.succeeded !== 1 ? "s" : ""} added successfully.
                    {importResult.skipped > 0 && ` ${importResult.skipped} row${importResult.skipped !== 1 ? "s" : ""} skipped (validation errors).`}
                    {importResult.errors.length > 0 && ` ${importResult.errors.length} row${importResult.errors.length !== 1 ? "s" : ""} failed during import.`}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Imported</p>
                  <p className="mt-1 text-2xl font-bold text-green-800">{importResult.succeeded}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Skipped</p>
                  <p className="mt-1 text-2xl font-bold text-amber-800">{importResult.skipped}</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">Failed</p>
                  <p className="mt-1 text-2xl font-bold text-red-800">{importResult.errors.length}</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-red-800">Failed rows:</p>
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-700">
                      Row {err.row} ({err.name}): {err.reason}
                    </p>
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
                disabled={importing || validCount === 0}
                className="flex-1 bg-[#E7A3B0] hover:bg-[#ca8c98] text-white"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
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
    </div>
  );
}
