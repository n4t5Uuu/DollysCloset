import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");

    if (!productId) {
      return NextResponse.json({ error: "Missing product_id" }, { status: 400 });
    }

    const { data: images, error } = await admin
      .from("tbl_product_image")
      .select("*")
      .eq("product_id", productId)
      .order("display_order", { ascending: true });

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
