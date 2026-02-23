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
    if (roleResponse.error || !["admin", "employee"].includes(roleResponse.data?.role || "")) {
      return NextResponse.json({ error: "Inventory access required" }, { status: 403 });
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

    const { data: remainingBeforeDelete, error: remainingBeforeDeleteError } = await admin
      .from("tbl_product_image")
      .select("image_id, is_primary, display_order")
      .eq("product_id", productIdValue)
      .neq("image_id", imageId)
      .order("display_order", { ascending: true });

    if (remainingBeforeDeleteError) {
      return NextResponse.json({ error: remainingBeforeDeleteError.message }, { status: 500 });
    }

    const preferredNextImage = (remainingBeforeDelete || []).find((img) => img.is_primary) || (remainingBeforeDelete || [])[0] || null;

    const { data: productRow, error: productFetchError } = await admin
      .from("tbl_product")
      .select("image_id")
      .eq("product_id", productIdValue)
      .single();

    if (productFetchError) {
      return NextResponse.json({ error: productFetchError.message }, { status: 500 });
    }

    if (productRow?.image_id === imageId) {
      const { error: rebindProductError } = await admin
        .from("tbl_product")
        .update({ image_id: preferredNextImage?.image_id || null })
        .eq("product_id", productIdValue);

      if (rebindProductError) {
        return NextResponse.json({ error: rebindProductError.message }, { status: 500 });
      }
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

    const { data: remainingImages, error: remainingImagesError } = await admin
      .from("tbl_product_image")
      .select("*")
      .eq("product_id", productIdValue)
      .order("display_order", { ascending: true });

    if (remainingImagesError) {
      return NextResponse.json({ error: remainingImagesError.message }, { status: 500 });
    }

    if (!remainingImages || remainingImages.length === 0) {
      const { error: clearProductImageError } = await admin
        .from("tbl_product")
        .update({ image_id: null })
        .eq("product_id", productIdValue);

      if (clearProductImageError) {
        return NextResponse.json({ error: clearProductImageError.message }, { status: 500 });
      }
    } else {
      const normalizedPrimaryId = preferredNextImage?.image_id || remainingImages[0].image_id;

      // Batch normalize remaining images for performance
      const normalizePromises = remainingImages.map((currentImage, index) =>
        admin
          .from("tbl_product_image")
          .update({
            display_order: index + 1,
            is_primary: currentImage.image_id === normalizedPrimaryId,
          })
          .eq("image_id", currentImage.image_id)
      );
      
      const normalizeResults = await Promise.all(normalizePromises);
      const normalizeError = normalizeResults.find(result => result.error)?.error;
      if (normalizeError) {
        return NextResponse.json({ error: normalizeError.message }, { status: 500 });
      }

      const { error: setProductImageError } = await admin
        .from("tbl_product")
        .update({ image_id: normalizedPrimaryId })
        .eq("product_id", productIdValue);

      if (setProductImageError) {
        return NextResponse.json({ error: setProductImageError.message }, { status: 500 });
      }
    }

    // Log activity
    const editor = user.email || user.user_metadata?.username || "Unknown";
    await dataHelper.logActivity({
      actionType: "delete_image",
      productId: productIdValue,
      description: `Deleted image (was displaying as #${display_order}${is_primary ? ", primary" : ""})`,
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
