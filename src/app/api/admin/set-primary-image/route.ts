import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { authHelper } from "@/lib/auth-helper";
import { dataHelper } from "@/lib/data-helper";

export async function PUT(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authorization.replace("Bearer ", "");
    const { data: { user }, error: userError } = await admin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const roleResponse = await authHelper.getUserRole(user.id, admin);
    if (roleResponse.error || !["admin", "employee"].includes(roleResponse.data?.role || "")) {
      return NextResponse.json({ error: "Inventory access required" }, { status: 403 });
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
    const { data: images, error: fetchError } = await admin
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
    await admin
      .from("tbl_product_image")
      .update({ is_primary: false })
      .eq("product_id", productIdValue);

    // Set the selected image as primary
    await admin
      .from("tbl_product_image")
      .update({ is_primary: true })
      .eq("image_id", image_id);

    // Renumber display_order: primary gets 1, rest get 2, 3, 4, 5
    let orderCounter = 2;
    for (const img of images) {
      if (img.image_id === image_id) {
        await admin
          .from("tbl_product_image")
          .update({ display_order: 1 })
          .eq("image_id", image_id);
      } else {
        await admin
          .from("tbl_product_image")
          .update({ display_order: orderCounter })
          .eq("image_id", img.image_id);
        orderCounter++;
      }
    }

    // Get updated images
    const { data: updatedImages } = await admin
      .from("tbl_product_image")
      .select("*")
      .eq("product_id", productIdValue)
      .order("display_order", { ascending: true });

    await admin
      .from("tbl_product")
      .update({ image_id })
      .eq("product_id", productIdValue);

    // Log activity
    const editor = user.email || user.user_metadata?.username || "Unknown";
    await dataHelper.logActivity({
      actionType: "set_primary_image",
      productId: productIdValue,
      description: "Picture changed",
      editor: editor,
      user_id: user.id,
      supabase: admin
    });

    return NextResponse.json(updatedImages);
  } catch (error) {
    console.error("Set primary error:", error);
    return NextResponse.json(
      { error: "Failed to set primary image", details: (error as Error).message },
      { status: 500 }
    );
  }
}
