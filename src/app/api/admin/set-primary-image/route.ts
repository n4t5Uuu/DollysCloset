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

    const { image_id, product_id } = await request.json();

    if (!image_id || !product_id) {
      return NextResponse.json({ error: "Missing image_id or product_id" }, { status: 400 });
    }

    const productIdValue = Number.parseInt(String(product_id), 10);
    if (Number.isNaN(productIdValue)) {
      return NextResponse.json({ error: "Invalid product_id" }, { status: 400 });
    }

    // Get all images for this product
    const { data: images, error: fetchError } = await supabaseAdmin
      .from("tbl_product_image")
      .select("*")
      .eq("product_id", productIdValue)
      .order("display_order", { ascending: true });

    if (fetchError || !images) {
      return NextResponse.json({ error: "Could not fetch images" }, { status: 500 });
    }

    // Find the image to set as primary
    const imageToSetPrimary = images.find((img) => img.image_id === image_id);
    if (!imageToSetPrimary) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Set all images to not primary
    await supabaseAdmin
      .from("tbl_product_image")
      .update({ is_primary: false })
      .eq("product_id", productIdValue);

    // Set the selected image as primary
    await supabaseAdmin
      .from("tbl_product_image")
      .update({ is_primary: true })
      .eq("image_id", image_id);

    // Renumber display_order: primary gets 1, rest get 2, 3, 4, 5
    let orderCounter = 2;
    for (const img of images) {
      if (img.image_id === image_id) {
        await supabaseAdmin
          .from("tbl_product_image")
          .update({ display_order: 1 })
          .eq("image_id", image_id);
      } else {
        await supabaseAdmin
          .from("tbl_product_image")
          .update({ display_order: orderCounter })
          .eq("image_id", img.image_id);
        orderCounter++;
      }
    }

    // Get updated images
    const { data: updatedImages } = await supabaseAdmin
      .from("tbl_product_image")
      .select("*")
      .eq("product_id", productIdValue)
      .order("display_order", { ascending: true });

    await supabaseAdmin
      .from("tbl_product")
      .update({ image_id })
      .eq("product_id", productIdValue);

    // Log activity
    const editor = user.email || user.user_metadata?.username || "Unknown";
    await logActivity(
      supabaseAdmin,
      "set_primary_image",
      productIdValue,
      "Picture changed",
      editor
    );

    return NextResponse.json(updatedImages);
  } catch (error) {
    console.error("Set primary error:", error);
    return NextResponse.json(
      { error: "Failed to set primary image", details: (error as Error).message },
      { status: 500 }
    );
  }
}
