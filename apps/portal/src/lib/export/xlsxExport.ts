import * as XLSX from "xlsx";

/**
 * Serializes a list of plain objects to an XLSX workbook and returns it as a
 * Node buffer suitable for `new NextResponse(buffer, { headers })`.
 *
 * All keys across the rows become columns in order of first appearance.
 */
export function buildXlsxBuffer(
  sheetName: string,
  rows: Record<string, unknown>[]
): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || "Sheet1");
  const arrayBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.isBuffer(arrayBuffer) ? arrayBuffer : Buffer.from(arrayBuffer);
}

/**
 * Standard headers for an XLSX download response. Matches the pattern used by
 * `apps/portal/src/app/api/admin/products/bulk-import-template/route.ts`.
 */
export function xlsxDownloadHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}
