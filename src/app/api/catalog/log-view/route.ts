import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { activityHelper } from "@/lib/activity/activity-helper";

/**
 * Endpoint for logging product views when authenticated admins/employees click on products.
 * Only tracks authenticated user clicks - anonymous views are not logged.
 */
export async function POST(request: NextRequest) {
  try {
    const { product_id, user_id } = await request.json();

    // Only log if both product_id and user_id are provided
    if (!product_id || !user_id) {
      return NextResponse.json({ success: true }); // Silently succeed
    }

    // Convert string product ID to number for consistency with database
    const numericProductId = Number(product_id);
    if (isNaN(numericProductId)) {
      return NextResponse.json({ success: true }); // Silently succeed
    }

    // Insert view log using dataHelper
    const logged = await activityHelper.logActivity({
      actionType: "view_product",
      productId: numericProductId,
      user_id: user_id,
      description: "Product viewed in catalog",
      supabase: admin,
    });

    if (!logged) {
      // Log the error for debugging but don't fail the request
      console.warn("Product view log insert failed");
    } else {
      console.log("Product view logged successfully:", numericProductId, "by user:", user_id);
    }

    // Always return success to avoid blocking the frontend
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Unexpected error in log-view api:", err);
    return NextResponse.json({ success: true });
  }
}
