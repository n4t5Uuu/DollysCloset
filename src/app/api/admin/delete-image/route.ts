import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { productHelper } from "@/lib/products/product-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { requireRequestAuth } from "@/lib/auth/auth-server";

/**
 * Extracts the specific file path portion from a full storage image URL.
 * Intended to be passed securely to the Supabase Storage deletion command.
 * @param imageUrl - Full incoming URL to parse.
 * @returns Restructured internal storage bucket file path.
 */
function getStorageObjectPath(imageUrl: string) {
  try {
    const decodedUrl = decodeURIComponent(imageUrl);
    const bucketSegment = "/product-images/";
    const bucketIndex = decodedUrl.indexOf(bucketSegment);

    if (bucketIndex >= 0) {
      return decodedUrl.slice(bucketIndex + bucketSegment.length);
    }

    return decodedUrl.split("/").slice(-2).join("/");
  } catch {
    return imageUrl.split("/").slice(-2).join("/");
  }
}

/**
 * Handles the removal of a specific product image from both the database and storage bucket.
 * Verifies authorization to ensure the caller has inventory edit privileges.
 * Seamlessly rebundles sibling images, adjusting their `is_primary` flags or `display_order` intelligently.
 * @param request - The incoming Next.js DELETE request housing authorization headers and the `image_id` query parameter.
 * @returns A generic success payload or a 500 status outlining why the task sequence failed.
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const imageIdRaw = searchParams.get("image_id")?.trim();

    if (!imageIdRaw) {
      return NextResponse.json({ error: "Missing image_id" }, { status: 400 });
    }

    const parsedImageId = Number.parseInt(imageIdRaw, 10);
    const imageIdValue = Number.isNaN(parsedImageId) ? imageIdRaw : parsedImageId;

    // Get image details using productHelper
    const { data: image, error: fetchError } = await productHelper.getImageById(imageIdValue, admin);

    if (fetchError || !image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const { product_id, is_primary, display_order, image_url } = image;
    const productIdValue = product_id;

    const { data: remainingBeforeDelete, error: remainingBeforeDeleteError } = await productHelper.getRemainingImagesExcluding(
      productIdValue,
      imageIdValue,
      admin
    );

    if (remainingBeforeDeleteError) {
      return NextResponse.json({ error: remainingBeforeDeleteError.message }, { status: 500 });
    }

    const preferredNextImage = (remainingBeforeDelete || []).find((img) => img.is_primary) || (remainingBeforeDelete || [])[0] || null;

    const { data: productRow, error: productFetchError } = await productHelper.getProductById(
      productIdValue,
      admin
    );

    if (productFetchError && productFetchError.code !== "PGRST116") {
      return NextResponse.json({ error: productFetchError.message }, { status: 500 });
    }

    const isProductUsingDeletedImage =
      productRow?.image_id !== null &&
      productRow?.image_id !== undefined &&
      String(productRow.image_id) === String(imageIdValue);

    if (isProductUsingDeletedImage) {
      const { error: rebindProductError } = await productHelper.updateProduct(
        productIdValue,
        { image_id: preferredNextImage?.image_id || null },
        admin
      );

      if (rebindProductError) {
        return NextResponse.json({ error: rebindProductError.message }, { status: 500 });
      }
    }

    // Delete from Supabase Storage
    const storageObjectPath = getStorageObjectPath(String(image_url || ""));
    if (storageObjectPath) {
      const { error: storageDeleteError } = await admin.storage
        .from("product-images")
        .remove([storageObjectPath]);

      if (storageDeleteError) {
        console.warn("Storage delete warning:", storageDeleteError.message);
      }
    }

    // Delete from database using productHelper
    const { error: deleteError } = await productHelper.deleteImageById(imageIdValue, admin);

    if (deleteError) throw deleteError;

    const { data: remainingImages, error: remainingImagesError } = await productHelper.getProductImages(
      productIdValue,
      admin
    );

    if (remainingImagesError) {
      return NextResponse.json({ error: remainingImagesError.message }, { status: 500 });
    }

    if (!remainingImages || remainingImages.length === 0) {
      const { error: clearProductImageError } = await productHelper.updateProduct(
        productIdValue,
        { image_id: null },
        admin
      );

      if (clearProductImageError) {
        return NextResponse.json({ error: clearProductImageError.message }, { status: 500 });
      }
    } else {
      const normalizedPrimaryId = preferredNextImage?.image_id || remainingImages[0].image_id;

      // Batch normalize remaining images using dataHelper
      const updates = remainingImages.map((currentImage, index) => ({
        image_id: currentImage.image_id,
        payload: {
          display_order: index + 1,
          is_primary: currentImage.image_id === normalizedPrimaryId,
        }
      }));

      const { success, error: normalizeError } = await productHelper.batchUpdateProductImages(updates, admin);
      
      if (!success && normalizeError) {
        return NextResponse.json({ error: normalizeError.message }, { status: 500 });
      }

      const { error: setProductImageError } = await productHelper.updateProduct(
        productIdValue,
        { image_id: normalizedPrimaryId },
        admin
      );

      if (setProductImageError) {
        return NextResponse.json({ error: setProductImageError.message }, { status: 500 });
      }
    }

    const parsedProductIdForLog = Number.parseInt(String(productIdValue), 10);

    // Log activity
    const editor = user.email || user.user_metadata?.username || "Unknown";
    await activityHelper.logActivity({
      actionType: "delete_image",
      productId: Number.isNaN(parsedProductIdForLog) ? null : parsedProductIdForLog,
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
