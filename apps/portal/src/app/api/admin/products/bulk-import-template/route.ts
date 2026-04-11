import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

import { requireRequestAuth } from "@/lib/auth/auth-server";
import { createAdminClient, productHelper } from "@dollys-closet/core";

interface CategoryRecord {
  category_id: number | string;
  category_name: string;
  parent_category: number | string | null;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseInt(value, 10);
  return Number.NaN;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function buildCategoryPath(categoryId: number, categoryById: Map<number, CategoryRecord>) {
  const category = categoryById.get(categoryId);
  if (!category) return String(categoryId);

  const names: string[] = [category.category_name];
  const visited = new Set<number>([categoryId]);
  let parentId = category.parent_category;

  while (parentId !== null) {
    const numericParent = toNumber(parentId);
    if (Number.isNaN(numericParent) || visited.has(numericParent)) {
      break;
    }
    visited.add(numericParent);

    const parent = categoryById.get(numericParent);
    if (!parent) break;

    names.unshift(parent.category_name);
    parentId = parent.parent_category;
  }

  return names.join(" > ");
}

function buildCategoriesSheetData(categoryOptions: string[]) {
  return categoryOptions
    .map((label, index) => {
      const row = index + 1;
      return `<row r="${row}" spans="1:1" x14ac:dyDescent="0.35"><c r="A${row}" t="inlineStr"><is><t>${escapeXml(label)}</t></is></c></row>`;
    })
    .join("");
}

/**
 * Converts a zero-based column index to an Excel column letter (0 → A, 25 → Z, 26 → AA…).
 */
function columnIndexToLetter(index: number): string {
  let result = "";
  let n = index;
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

/**
 * Best-effort: appends image_1 … image_5 header cells to row 1 of the
 * "Export Ready" sheet. Fails silently — the template still works without
 * them since the columns are optional (user can add them manually).
 */
function injectImageFilenamesHeader(files: Record<string, Uint8Array>): void {
  try {
    const workbookXml = strFromU8(files["xl/workbook.xml"]);
    const relsXml = strFromU8(files["xl/_rels/workbook.xml.rels"]);

    const sheetRidMatch = workbookXml.match(/name="Export Ready"[^>]*r:id="([^"]+)"/);
    if (!sheetRidMatch) return;
    const rId = sheetRidMatch[1];

    const relTargetMatch = relsXml.match(new RegExp(`Id="${rId}"[^>]*Target="([^"]+)"`));
    if (!relTargetMatch) return;
    const sheetPath = relTargetMatch[1].startsWith("worksheets/")
      ? `xl/${relTargetMatch[1]}`
      : relTargetMatch[1];

    const sheetBytes = files[sheetPath];
    if (!sheetBytes) return;

    let sheetXml = strFromU8(sheetBytes);

    // Skip if image columns are already present (user added manually)
    if (sheetXml.includes("image_1")) return;

    // Find the last column letter in the header row
    const headerCellPattern = /<c r="([A-Z]+)1"[^/]*(?:\/>|>[\s\S]*?<\/c>)/g;
    const allHeaderCells = [...sheetXml.matchAll(headerCellPattern)];
    if (allHeaderCells.length === 0) return;

    const lastColLetter = allHeaderCells[allHeaderCells.length - 1][1];
    let colIndex = 0;
    for (const ch of lastColLetter) {
      colIndex = colIndex * 26 + (ch.charCodeAt(0) - 64);
    }

    // Append image_1 … image_5
    const newCells = [1, 2, 3, 4, 5]
      .map((n) => {
        const letter = columnIndexToLetter(colIndex + n - 1);
        return `<c r="${letter}1" t="inlineStr"><is><t>image_${n}</t></is></c>`;
      })
      .join("");

    sheetXml = sheetXml.replace(/(<\/row>)/, `${newCells}$1`);
    files[sheetPath] = strToU8(sheetXml);
  } catch {
    // Best-effort; template still works without these columns
  }
}

function injectCategoriesIntoTemplate(
  workbookBytes: Uint8Array,
  categoryOptions: string[],
) {
  const files = unzipSync(workbookBytes);
  const sheet2Name = "xl/worksheets/sheet2.xml";
  const sheet3Name = "xl/worksheets/sheet3.xml";

  const sheet2Bytes = files[sheet2Name];
  const sheet3Bytes = files[sheet3Name];

  if (!sheet2Bytes || !sheet3Bytes) {
    throw new Error("Template workbook is missing required worksheets.");
  }

  const safeOptions = categoryOptions.length > 0
    ? categoryOptions
    : ["1 - Uncategorized"];
  const lastRow = safeOptions.length;

  const sheet3Xml = strFromU8(sheet3Bytes);
  const updatedSheet3Xml = sheet3Xml
    .replace(
      /<dimension ref="A1:A\d+"\/>/,
      `<dimension ref="A1:A${lastRow}"/>`,
    )
    .replace(
      /<sheetData>[\s\S]*<\/sheetData>/,
      `<sheetData>${buildCategoriesSheetData(safeOptions)}</sheetData>`,
    );

  const sheet2Xml = strFromU8(sheet2Bytes);
  const updatedSheet2Xml = sheet2Xml.replace(
    /Categories!\$A\$1:\$A\$\d+/g,
    `Categories!$A$1:$A$${lastRow}`,
  );

  files[sheet2Name] = strToU8(updatedSheet2Xml);
  files[sheet3Name] = strToU8(updatedSheet3Xml);

  injectImageFilenamesHeader(files);

  return zipSync(files);
}

/**
 * Serves a live bulk-import template with category options synchronized
 * to current dashboard categories.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const supabaseAdmin = createAdminClient();
    const { data: categories, error } = await productHelper.getCategories(supabaseAdmin);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalizedCategories: CategoryRecord[] = (categories || []).map((category) => ({
      category_id: toNumber((category as CategoryRecord).category_id),
      category_name: String((category as CategoryRecord).category_name || "").trim(),
      parent_category: (category as CategoryRecord).parent_category,
    }));

    const categoryById = new Map<number, CategoryRecord>();
    normalizedCategories.forEach((category) => {
      const id = toNumber(category.category_id);
      if (!Number.isNaN(id)) {
        categoryById.set(id, category);
      }
    });

    const categoryOptions = normalizedCategories
      .map((category) => toNumber(category.category_id))
      .filter((id) => !Number.isNaN(id))
      .sort((a, b) => a - b)
      .map((id) => `${id} - ${buildCategoryPath(id, categoryById)}`);

    const templatePath = path.join(
      process.cwd(),
      "public",
      "product_bulk_import_template.xlsx",
    );
    const templateBuffer = await fs.readFile(templatePath);
    const templateBytes = new Uint8Array(templateBuffer);

    const outputBytes = injectCategoriesIntoTemplate(templateBytes, categoryOptions);

    return new NextResponse(Buffer.from(outputBytes), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="product_bulk_import_template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Failed to generate bulk import template:", error);
    return NextResponse.json(
      { error: "Failed to generate bulk import template" },
      { status: 500 },
    );
  }
}
