import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dataHelper } from "@/lib/data-helper";
import { logActivity } from "@/lib/activity-logger";

export async function PUT(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authorization.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const roleResponse = await dataHelper.getUserRole(user.id, supabaseAdmin);
    if (roleResponse.error || roleResponse.data?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { product_id, orderedImageIds } = await request.json();

    if (!product_id || !orderedImageIds || !Array.isArray(orderedImageIds)) {
      return NextResponse.json({ error: "Missing product_id or orderedImageIds" }, { status: 400 });
    }

    // Update display_order for each image based on new order
    for (let i = 0; i < orderedImageIds.length; i++) {
        await supabaseAdmin
          .from("tbl_product_image")
        .update({ display_order: i + 1 })
        .eq("image_id", orderedImageIds[i]);
    }

    // Get updated images
    const { data: updatedImages } = await supabaseAdmin
      .from("tbl_product_image")
      .select("*")
      .eq("product_id", product_id)
      .order("display_order", { ascending: true });

    // Log activity
    const editor = user.email || user.user_metadata?.username || "Unknown";
    await logActivity(
      supabaseAdmin,
      "reorder_images",
      parseInt(product_id),
      `Reordered product images`,
      editor
    );

    return NextResponse.json(updatedImages);
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json(
      { error: "Failed to reorder images", details: (error as Error).message },
      { status: 500 }
    );
  }
}
