"use client";

import { useState, useRef, useCallback } from "react";
import { X, Upload, Download, AlertTriangle, CheckCircle2, Loader2, FileSpreadsheet } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { browserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
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
  index: number;
  errors: string[];
  isValid: boolean;
}

interface ImportResult {
  succeeded: number;
  skipped: number;
  errors: { row: number; name: string; reason: string }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_META_LENGTH = 9;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeBoolean(value: string): boolean {
  const lower = value.trim().toLowerCase();
  if (lower === "false" || lower === "0" || lower === "no") return false;
  return true; // default to true
}

function validateRows(rows: ParsedRow[]): ValidatedRow[] {
  return rows.map((row, index) => {
    const errors: string[] = [];

    if (!row.product_name?.trim()) {
      errors.push("product_name is required");
    }

    const categoryIdStr = row.category_id?.trim() ?? "";
    const categoryId = Number(categoryIdStr);
    if (!categoryIdStr || !Number.isInteger(categoryId) || categoryId <= 0) {
      errors.push(`category_id "${categoryIdStr || "empty"}" must be a whole number (e.g. 11)`);
    }

    const priceStr = row.product_price?.trim() ?? "";
    const price = Number(priceStr);
    if (!priceStr || Number.isNaN(price) || price < 0) {
      errors.push(`product_price "${priceStr || "empty"}" must be a plain number with no letters or symbols (e.g. 150 or 150.00)`);
    }

    const stock = Number.parseInt(row.product_stock || "0", 10);
    if (!Number.isNaN(stock) && stock < 0) {
      errors.push("product_stock must be 0 or greater");
    }

    return { raw: row, index, errors, isValid: errors.length === 0 };
  });
}

function parseRawRows(data: Record<string, string>[]): ParsedRow[] {
  return data
    .filter((row) => {
      // Skip completely empty rows and zero-filled formula placeholder rows
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

// ─── Component ───────────────────────────────────────────────────────────────

type Step = "upload" | "preview" | "results";

export default function BulkImportModal({ isOpen, onClose, onImportComplete }: BulkImportModalProps) {
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

  // ── File parsing ────────────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    setParseError(null);
    setFileName(file.name);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            setParseError("Failed to parse CSV: " + results.errors[0].message);
            return;
          }
          const rows = parseRawRows(results.data);
          if (rows.length === 0) {
            setParseError("The file contains no data rows.");
            return;
          }
          setValidatedRows(validateRows(rows));
          setStep("preview");
        },
        error: (err) => setParseError("Failed to parse CSV: " + err.message),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames.includes("Export Ready")
            ? "Export Ready"
            : workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          // "Export Ready" has an info row before the headers — skip it with range: 1
          const rangeOffset = sheetName === "Export Ready" ? 1 : 0;
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
            defval: "",
            range: rangeOffset,
          });
          const rows = parseRawRows(json);
          if (rows.length === 0) {
            setParseError("The file contains no data rows.");
            return;
          }
          setValidatedRows(validateRows(rows));
          setStep("preview");
        } catch {
          setParseError("Failed to parse Excel file. Make sure it is a valid .xlsx file.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setParseError("Unsupported file type. Please upload a .csv or .xlsx file.");
    }
  }, []);

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

  // ── Import ──────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    const validRows = validatedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setImporting(true);
    setImportProgress(0);

    const { data: { session } } = await browserSupabase.auth.getSession();
    if (!session) {
      setParseError("Not authenticated. Please refresh and try again.");
      setImporting(false);
      return;
    }

    let succeeded = 0;
    const errors: ImportResult["errors"] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const payload = {
          product_name: row.raw.product_name.trim(),
          category_id: Number.parseInt(row.raw.category_id, 10),
          product_price: Number(row.raw.product_price.trim()),
          product_brand: row.raw.product_brand.trim() || "Dolly's Closet",
          product_stock: Number.parseInt(row.raw.product_stock || "0", 10),
          size_label: (row.raw.size_label.trim() || "One Size").slice(0, MAX_META_LENGTH),
          product_condition: (row.raw.product_condition.trim() || "New").slice(0, MAX_META_LENGTH),
          product_description: row.raw.product_description.trim(),
          show_in_catalog: normalizeBoolean(row.raw.show_in_catalog),
          image_id: null,
        };

        const response = await fetch("/api/admin/create-product", {
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
            row: row.index + 2, // +2 for header row and 0-index
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
    }
  };

  if (!isOpen) return null;

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const invalidCount = validatedRows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b p-6 space-y-0 shrink-0">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-pink-400" />
            <CardTitle className="text-gray-900">Bulk Import Products</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/admin/bulk-import-template"
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

        {/* Body */}
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* ── Step: Upload ── */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  Upload the <strong>Export Ready</strong> sheet from your template as a <strong>.xlsx</strong> or <strong>.csv</strong> file to add multiple products at once.
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
                    <strong>product_price</strong> must be digits only — no currency symbols or text (e.g. <code className="bg-white border border-gray-200 px-1 rounded">150</code> or <code className="bg-white border border-gray-200 px-1 rounded">150.00</code>).{" "}
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
                  <p className="text-xs text-gray-500 mt-1">or click to browse — .csv, .xlsx supported</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
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

          {/* ── Step: Preview ── */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm text-gray-600">
                  File: <strong>{fileName}</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                    <AlertTriangle className="w-3 h-3" /> {invalidCount} will be skipped
                  </span>
                )}
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
                          row.isValid ? "bg-white" : "bg-red-50"
                        }`}
                      >
                        <td className="px-3 py-2 text-gray-400">{row.index + 2}</td>
                        <td className="px-3 py-2 text-gray-900 max-w-[160px] truncate">{row.raw.product_name || <span className="text-red-400 italic">empty</span>}</td>
                        <td className="px-3 py-2 text-gray-700">{row.raw.category_id || "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{row.raw.product_price || "—"}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[100px] truncate">{row.raw.product_brand || <span className="text-gray-400">default</span>}</td>
                        <td className="px-3 py-2 text-gray-700">{row.raw.product_stock || "0"}</td>
                        <td className="px-3 py-2 text-gray-700">{row.raw.size_label || <span className="text-gray-400">One Size</span>}</td>
                        <td className="px-3 py-2 text-gray-700">{row.raw.product_condition || <span className="text-gray-400">New</span>}</td>
                        <td className="px-3 py-2 text-gray-700">{row.raw.show_in_catalog || "true"}</td>
                        <td className="px-3 py-2">
                          {row.isValid ? (
                            <span className="text-green-600 font-medium">✓ OK</span>
                          ) : (
                            <span className="text-red-600 font-medium" title={row.errors.join(", ")}>
                              ✕ Skip
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Validation error details */}
              {invalidCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-amber-800">Rows that will be skipped:</p>
                  {validatedRows
                    .filter((r) => !r.isValid)
                    .map((r) => (
                      <p key={r.index} className="text-xs text-amber-700">
                        Row {r.index + 2}: {r.errors.join(", ")}
                      </p>
                    ))}
                </div>
              )}

              {/* Progress bar during import */}
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

          {/* ── Step: Results ── */}
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

        {/* Footer */}
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
