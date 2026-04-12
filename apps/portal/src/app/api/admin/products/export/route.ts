import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, productHelper } from "@dollys-closet/core";
import { requireRequestAuth } from "@/lib/auth/auth-server";
import { buildProductArchiveZip } from "@/lib/export/zipExport";
import type { ProductForExport, ProductImageForExport } from "@/lib/export/zipExport";

/**
 * GET /api/admin/products/export?before=<ISO>
 *
 * Streams a ZIP archive of all archived products whose `archived_at` is
 * strictly older than the given cutoff. The archive contains:
 *   - products.xlsx  — product metadata with image URLs
 *   - images/<product_id>/<filename>  — actual image blobs from storage
 *   - manifest.json  — export summary
 *
 * Admin only. Used as the mandatory backup step before the purge.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const beforeParam = searchParams.get("before");

    if (!beforeParam) {
      return NextResponse.json(
        { error: "Missing required `before` query parameter (ISO 8601 timestamp)." },
        { status: 400 }
      );
    }

    const beforeDate = new Date(beforeParam);
    if (Number.isNaN(beforeDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid `before` parameter — must be a valid ISO 8601 timestamp." },
        { status: 400 }
      );
    }

    const cutoffIso = beforeDate.toISOString();
    const supabaseAdmin = createAdminClient();

    const { products, images, error } = await productHelper.fetchArchivedProductsForExport(
      cutoffIso,
      supabaseAdmin
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: "No archived products match the given cutoff." },
        { status: 404 }
      );
    }

    const zipBuffer = await buildProductArchiveZip(
      products as ProductForExport[],
      (images ?? []) as ProductImageForExport[],
      supabaseAdmin,
      cutoffIso
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `products-archive-${timestamp}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    console.error("Error exporting archived products:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
