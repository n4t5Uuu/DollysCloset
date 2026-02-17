import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { authHelper } from "@/lib/auth-helper";
import { dataHelper } from "@/lib/data-helper";

export async function DELETE(request: NextRequest) {
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
    if (roleResponse.error || roleResponse.data?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("image_id");

    if (!imageId) {
      return NextResponse.json({ error: "Missing image_id" }, { status: 400 });
    }

    // Get image details
    const { data: image, error: fetchError } = await admin
      .from("tbl_product_image")
      .select("*")
      .eq("image_id", imageId)
      .single();

    if (fetchError || !image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const { product_id, is_primary, display_order, image_url } = image;
    const productIdValue = Number.parseInt(String(product_id), 10);
    if (Number.isNaN(productIdValue)) {
      return NextResponse.json({ error: "Invalid product_id" }, { status: 400 });
    }

    // Delete from Supabase Storage
    const fileName = image_url.split("/").slice(-2).join("/");
    await admin.storage.from("product-images").remove([fileName]);

    // Delete from database
    const { error: deleteError } = await admin
      .from("tbl_product_image")
      .delete()
      .eq("image_id", imageId);

    if (deleteError) throw deleteError;

    // If deleted image was primary, set next highest display_order as primary
    if (is_primary) {
      const { data: nextImages } = await admin
        .from("tbl_product_image")
        .select("*")
        .eq("product_id", product_id)
        .order("display_order", { ascending: true });

      if (nextImages && nextImages.length > 0) {
        // Update first remaining image as primary
        await admin
          .from("tbl_product_image")
          .update({ is_primary: true })
          .eq("image_id", nextImages[0].image_id);

        await admin
          .from("tbl_product")
          .update({ image_id: nextImages[0].image_id })
          .eq("product_id", productIdValue);
      } else {
        await admin
          .from("tbl_product")
          .update({ image_id: null })
          .eq("product_id", productIdValue);
      }
    } else {
      // If deleted image was not primary, renumber display_order
      const { data: images } = await admin
        .from("tbl_product_image")
        .select("*")
        .eq("product_id", product_id)
        .order("display_order", { ascending: true });

      if (images) {
        for (let i = 0; i < images.length; i++) {
          await admin
            .from("tbl_product_image")
            .update({ display_order: i + 1 })
            .eq("image_id", images[i].image_id);
        }
      }
    }

    // Log activity
    const editor = user.email || user.user_metadata?.username || "Unknown";
    await dataHelper.logActivity({
      actionType: "delete_image",
      productId: productIdValue,
      description: `Deleted image (was displaying as #${display_order})`,
      editor: editor,
      user_id: user.id,
      supabase: admin
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Delete failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
