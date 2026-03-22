import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { productHelper } from "@/lib/products/product-helper";

/**
 * Retrieves an order-sorted sequence of product image mappings tied to a specific `product_id`.
 * Contains parsing cleanup to ensure `is_primary` strictly corresponds to boolean logic.
 * Enforces rendering normalization so only one primary image stands out for UI presentation logic.
 * @param request - The Next.js request holding `product_id` across URL search parameters.
 * @returns JSON indicating product configurations encompassing arrays matching exact image mappings.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");

    if (!productId) {
      return NextResponse.json({ error: "Missing product_id" }, { status: 400 });
    }

    const { data: images, error } = await productHelper.getProductImages(productId, admin);

    if (error) throw error;

    const normalizedImages = (images || []).map((image) => ({
      ...image,
      is_primary: Boolean(image.is_primary),
    }));

    const effectivePrimaryId =
      normalizedImages.find((image) => image.is_primary)?.image_id ||
      normalizedImages[0]?.image_id;

    const singlePrimaryImages = normalizedImages.map((image) => ({
      ...image,
      is_primary: image.image_id === effectivePrimaryId,
    }));

    return NextResponse.json({ data: singlePrimaryImages });
  } catch (error) {
    console.error("Fetch images error:", error);
    return NextResponse.json(
      { error: "Failed to fetch images", details: (error as Error).message },
      { status: 500 }
    );
  }
}
