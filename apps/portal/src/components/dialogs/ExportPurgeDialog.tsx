"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Download, Trash2, X } from "lucide-react";
import { Button } from "@dollys-closet/ui";

export type ExportPurgeFormat = "csv" | "xlsx" | "zip";

export interface ExportPurgeDialogProps {
  open: boolean;
  onClose: () => void;
  /** Modal heading, e.g. "Export & Purge Activity Logs" */
  title: string;
  /** Paragraph shown below the heading. */
  description: string;
  /** Singular/plural noun used in counts, e.g. { singular: "log", plural: "logs" } */
  entityLabel: { singular: string; plural: string };
  /** Formats offered in the toggle. Single-item list hides the toggle. */
  availableFormats: ExportPurgeFormat[];
  defaultFormat: ExportPurgeFormat;
  /**
   * Small hint shown under the "Cutoff" section header so the user knows
   * which date field is being compared, e.g. "created before" or "archived before".
   */
  cutoffFieldLabel?: string;
  /** Returns the count of records that would be purged. */
  onPreview: (cutoffIso: string) => Promise<{ count: number }>;
  /**
   * Performs the file download (fetch + blob + anchor). Should resolve after
   * the browser save dialog is triggered.
   */
  onDownload: (cutoffIso: string, format: ExportPurgeFormat) => Promise<void>;
  /** Performs the purge. Returns the number of deleted records. */
  onPurge: (cutoffIso: string) => Promise<{ purged: number }>;
  /** Called after a successful purge, e.g. to refetch the list. */
  onPurgeSuccess?: (purged: number, label: string) => void;
}

type PurgeMode = "preset" | "custom";

const FORMAT_LABELS: Record<ExportPurgeFormat, string> = {
  csv: "CSV",
  xlsx: "XLSX",
  zip: "ZIP",
};

/** Mounts the dialog body only while open so every close resets its state. */
export function ExportPurgeDialog({ open, ...props }: ExportPurgeDialogProps) {
  return open ? <ExportPurgeDialogBody {...props} /> : null;
}

function ExportPurgeDialogBody({
  onClose,
  title,
  description,
  entityLabel,
  availableFormats,
  defaultFormat,
  cutoffFieldLabel,
  onPreview,
  onDownload,
  onPurge,
  onPurgeSuccess,
}: Omit<ExportPurgeDialogProps, "open">) {
  const [mode, setMode] = useState<PurgeMode>("preset");
  const [presetDays, setPresetDays] = useState<30 | 90 | 180>(90);
  const [customDate, setCustomDate] = useState("");
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [format, setFormat] = useState<ExportPurgeFormat>(defaultFormat);

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setPreviewCount(null);
    setPreviewError(null);
    setDownloaded(false);
    setConfirmText("");
    setError(null);
  }, []);

  // Reset dependent state whenever the cutoff selection changes.
  const updateCutoff = (applyChange: () => void) => {
    applyChange();
    resetState();
  };

  const resolveCutoff = useCallback((): { iso: string; label: string } | { error: string } => {
    if (mode === "preset") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - presetDays);
      return {
        iso: cutoff.toISOString(),
        label: `older than ${presetDays} days (before ${cutoff.toLocaleDateString()})`,
      };
    }

    if (!customDate) return { error: "Pick a cutoff date to continue." };
    const parsed = new Date(`${customDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return { error: "Invalid cutoff date." };
    if (parsed.getTime() >= Date.now()) return { error: "Cutoff must be in the past." };

    return {
      iso: parsed.toISOString(),
      label: `older than ${parsed.toLocaleDateString()}`,
    };
  }, [mode, presetDays, customDate]);

  const handleClose = () => {
    if (submitting || downloading || previewing) return;
    onClose();
  };

  const handlePreview = async () => {
    const resolved = resolveCutoff();
    if ("error" in resolved) {
      setPreviewError(resolved.error);
      setPreviewCount(null);
      return;
    }
    try {
      setPreviewing(true);
      setPreviewError(null);
      const { count } = await onPreview(resolved.iso);
      setPreviewCount(count);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Failed to preview count");
      setPreviewCount(null);
    } finally {
      setPreviewing(false);
    }
  };

  const handleDownload = async () => {
    const resolved = resolveCutoff();
    if ("error" in resolved) { setError(resolved.error); return; }
    try {
      setDownloading(true);
      setError(null);
      await onDownload(resolved.iso, format);
      setDownloaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const handlePurge = async () => {
    const resolved = resolveCutoff();
    if ("error" in resolved) { setError(resolved.error); return; }
    if (!downloaded) { setError("You must download the export before purging."); return; }
    if (confirmText !== "DELETE") { setError('You must type "DELETE" to confirm.'); return; }

    try {
      setSubmitting(true);
      setError(null);
      const { purged } = await onPurge(resolved.iso);
      onClose();
      resetState();
      onPurgeSuccess?.(purged, resolved.label);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purge failed");
    } finally {
      setSubmitting(false);
    }
  };

  const showFormatToggle = availableFormats.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting || downloading || previewing}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <p className="text-sm text-gray-600">{description}</p>

          {/* Cutoff */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cutoff</p>
              {cutoffFieldLabel && (
                <span className="text-xs text-gray-400">({cutoffFieldLabel})</span>
              )}
            </div>
            <div className="flex gap-2 rounded-lg border border-gray-200 p-1">
              {(["preset", "custom"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateCutoff(() => setMode(m))}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    mode === m
                      ? "bg-[#E7A3B0] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {m === "preset" ? "Preset" : "Custom date"}
                </button>
              ))}
            </div>

            {mode === "preset" ? (
              <div className="flex gap-2">
                {([30, 90, 180] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => updateCutoff(() => setPresetDays(days))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      presetDays === days
                        ? "border-[#E7A3B0] bg-[#fff5f7] text-[#b96d7d]"
                        : "border-gray-200 text-gray-600 hover:border-[#E7A3B0]/50 hover:bg-[#fffafb]"
                    }`}
                  >
                    Older than {days} days
                  </button>
                ))}
              </div>
            ) : (
              <input aria-label="Cutoff date"
                type="date"
                value={customDate}
                max={today}
                onChange={(e) => updateCutoff(() => setCustomDate(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#E7A3B0] focus:outline-none focus:ring-2 focus:ring-[#E7A3B0]/20"
              />
            )}
          </div>

          {/* Format toggle (hidden when only one format) */}
          {showFormatToggle && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Export format</p>
              <div className="flex gap-2 rounded-lg border border-gray-200 p-1">
                {availableFormats.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      format === fmt
                        ? "bg-[#E7A3B0] text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {FORMAT_LABELS[fmt]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview count */}
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {entityLabel.plural.charAt(0).toUpperCase() + entityLabel.plural.slice(1)} to purge
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {previewCount === null
                    ? "—"
                    : `${previewCount} ${previewCount === 1 ? entityLabel.singular : entityLabel.plural}`}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={previewing}
                className="h-9 border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                {previewing ? "Checking..." : "Preview count"}
              </Button>
            </div>
            {previewError && (
              <p className="mt-2 text-xs text-red-600">{previewError}</p>
            )}
          </div>

          {/* Step 1 — Download */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Step 1 — Download backup
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={downloading || previewCount === null || previewCount === 0}
              className="w-full h-10 border-[#E7A3B0]/40 text-[#b96d7d] hover:bg-[#fff5f7] hover:text-[#b96d7d]"
            >
              <Download className="mr-2 h-4 w-4" />
              {downloading
                ? "Downloading..."
                : downloaded
                  ? `Downloaded (${FORMAT_LABELS[format]}) — click to re-download`
                  : `Download ${FORMAT_LABELS[format]}`}
            </Button>
            {previewCount === 0 && (
              <p className="text-xs text-gray-500">
                No {entityLabel.plural} match the selected cutoff.
              </p>
            )}
          </div>

          {/* Step 2 — Confirm */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Step 2 — Confirm deletion
            </p>
            <label htmlFor="export-purge-confirm" className="block text-xs text-gray-600">
              Type{" "}
              <span className="font-mono font-semibold text-red-600">DELETE</span> to enable the purge button.
            </label>
            <input
              id="export-purge-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={!downloaded}
              placeholder="DELETE"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting || downloading || previewing}
            className="border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePurge}
            disabled={
              submitting ||
              !downloaded ||
              confirmText !== "DELETE" ||
              previewCount === null ||
              previewCount === 0
            }
            className="bg-red-500 text-white hover:bg-red-600 hover:text-white"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {submitting
              ? "Purging..."
              : `Purge ${entityLabel.plural.charAt(0).toUpperCase() + entityLabel.plural.slice(1)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
