import Papa from "papaparse";

/**
 * Serializes a list of plain objects to a CSV string via papaparse.
 *
 * - Keys across all rows become the header row (in order of first appearance).
 * - Commas, quotes, and newlines inside values are correctly escaped.
 */
export function buildCsvString(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "";
  }
  return Papa.unparse(rows, {
    quotes: true,
    newline: "\r\n",
  });
}

/**
 * Standard headers for a CSV download response.
 */
export function csvDownloadHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}
