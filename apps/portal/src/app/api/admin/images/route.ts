import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@dollys-closet/core/lib/supabase/admin";
import { productHelper } from "@/lib/products/product-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { requireRequestAuth } from "@/lib/auth/auth-server";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function isImageUpload(file: File) {
  const normalizedMimeType = (file.type || "").toLowerCase();
  if (normalizedMimeType && ALLOWED_IMAGE_MIME_TYPES.has(normalizedMimeType)) {
    return true;
  }

  const extension = file.name.toLowerCase().split(".").pop() || "";
  return ALLOWED_IMAGE_EXTENSIONS.has(extension);
}

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

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");

    if (!productId) {
      return NextResponse.json({ error: "Missing product_id" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: images, error } = await productHelper.getProductImages(productId, supabaseAdmin);

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

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { user } = authResult;
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const productId = formData.get("product_id") as string;
    const displayOrderParam = formData.get("display_order") as string;
    const isPrimaryParam = formData.get("is_primary") as string;

    if (!file || !productId) {
      return NextResponse.json({ error: "Missing file or product_id" }, { status: 400 });
    }

    if (!isImageUpload(file)) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image must be 5MB or smaller" },
        { status: 400 }
      );
    }

    const productIdValue = Number.parseInt(productId, 10);
    if (Number.isNaN(productIdValue)) {
      return NextResponse.json({ error: "Invalid product_id" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: existingImages, error: fetchError } = await productHelper.getProductImages(productIdValue, supabaseAdmin);

    if (fetchError) {
      return NextResponse.json(
        { error: "Image lookup failed", details: fetchError.message },
        { status: 500 }
      );
    }
    if (existingImages && existingImages.length >= 5) {
      return NextResponse.json({ error: "Maximum 5 images per product" }, { status: 400 });
    }

    const fileName = `${productId}/${Date.now()}-${file.name}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-images")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Upload failed", details: uploadError.message },
        { status: 500 }
      );
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(fileName);

    let displayOrder = (existingImages?.length || 0) + 1;
    let isFirstImage = (existingImages?.length || 0) === 0;

    if (displayOrderParam) {
      displayOrder = Number.parseInt(displayOrderParam, 10);
    }
    if (isPrimaryParam) {
      isFirstImage = isPrimaryParam === "true";
    }

    const { data: imageData, error: insertError } = await productHelper.createProductImage({
      product_id: productIdValue,
      image_url: publicUrl,
      is_primary: isFirstImage,
      display_order: displayOrder,
      created_at: new Date().toISOString(),
    }, supabaseAdmin);

    if (insertError) {
      return NextResponse.json(
        { error: "Image record failed", details: insertError.message },
        { status: 500 }
      );
    }

    if (imageData?.image_id) {
      const { data: productRow } = await productHelper.getProductById(productIdValue, supabaseAdmin);

      if (isFirstImage || productRow?.image_id == null) {
        await productHelper.updateProduct(productIdValue, { image_id: imageData.image_id }, supabaseAdmin);
      }
    }

    const editor = user.email || user.user_metadata?.username || "Unknown";
    await activityHelper.logActivity({
      actionType: "upload_image",
      productId: productIdValue,
      description: `Uploaded image: ${file.name} on product ID ${productIdValue}`,
      editor: editor,
      user_id: user.id,
      supabase: supabaseAdmin
    });

    return NextResponse.json(imageData, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Upload failed", details: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { user } = authResult;
    const { product_id, orderedImageIds } = await request.json();

    if (!product_id || !orderedImageIds || !Array.isArray(orderedImageIds)) {
      return NextResponse.json({ error: "Missing product_id or orderedImageIds" }, { status: 400 });
    }

    const updates = orderedImageIds.map((imageId, index) => ({
      image_id: imageId,
      payload: { display_order: index + 1, is_primary: index === 0 }
    }));

    const supabaseAdmin = createAdminClient();
    const { error: batchError } = await productHelper.batchUpdateProductImages(updates, supabaseAdmin);
    if (batchError) throw batchError;

    const { data: updatedImages } = await productHelper.getProductImages(product_id, supabaseAdmin);

    const editor = user.email || user.user_metadata?.username || "Unknown";
    await activityHelper.logActivity({
      actionType: "reorder_images",
      productId: parseInt(product_id),
      description: "Reordered product images",
      editor: editor,
      user_id: user.id,
      supabase: supabaseAdmin
    });

    return NextResponse.json(updatedImages);
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json(
      { error: "Failed to reorder images", details: (error as Error).message },
      { status: 500 }
    );
  }
}

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

    const supabaseAdmin = createAdminClient();
    const { data: image, error: fetchError } = await productHelper.getImageById(imageIdValue, supabaseAdmin);

    if (fetchError || !image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const { product_id, is_primary, display_order, image_url } = image;
    const productIdValue = product_id;

    const { data: remainingBeforeDelete, error: remainingBeforeDeleteError } = await productHelper.getRemainingImagesExcluding(
      productIdValue,
      imageIdValue,
      supabaseAdmin
    );

    if (remainingBeforeDeleteError) {
      return NextResponse.json({ error: remainingBeforeDeleteError.message }, { status: 500 });
    }

    const preferredNextImage = (remainingBeforeDelete || []).find((img) => img.is_primary) || (remainingBeforeDelete || [])[0] || null;

    const { data: productRow, error: productFetchError } = await productHelper.getProductById(
      productIdValue,
      supabaseAdmin
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
        supabaseAdmin
      );

      if (rebindProductError) {
        return NextResponse.json({ error: rebindProductError.message }, { status: 500 });
      }
    }

    const storageObjectPath = getStorageObjectPath(String(image_url || ""));
    if (storageObjectPath) {
      const { error: storageDeleteError } = await supabaseAdmin.storage
        .from("product-images")
        .remove([storageObjectPath]);

      if (storageDeleteError) {
        console.warn("Storage delete warning:", storageDeleteError.message);
      }
    }

    const { error: deleteError } = await productHelper.deleteImageById(imageIdValue, supabaseAdmin);

    if (deleteError) throw deleteError;

    const { data: remainingImages, error: remainingImagesError } = await productHelper.getProductImages(
      productIdValue,
      supabaseAdmin
    );

    if (remainingImagesError) {
      return NextResponse.json({ error: remainingImagesError.message }, { status: 500 });
    }

    if (!remainingImages || remainingImages.length === 0) {
      const { error: clearProductImageError } = await productHelper.updateProduct(
        productIdValue,
        { image_id: null },
        supabaseAdmin
      );

      if (clearProductImageError) {
        return NextResponse.json({ error: clearProductImageError.message }, { status: 500 });
      }
    } else {
      const normalizedPrimaryId = preferredNextImage?.image_id || remainingImages[0].image_id;

      const updates = remainingImages.map((currentImage, index) => ({
        image_id: currentImage.image_id,
        payload: {
          display_order: index + 1,
          is_primary: currentImage.image_id === normalizedPrimaryId,
        }
      }));

      const { success, error: normalizeError } = await productHelper.batchUpdateProductImages(updates, supabaseAdmin);

      if (!success && normalizeError) {
        return NextResponse.json({ error: normalizeError.message }, { status: 500 });
      }

      const { error: setProductImageError } = await productHelper.updateProduct(
        productIdValue,
        { image_id: normalizedPrimaryId },
        supabaseAdmin
      );

      if (setProductImageError) {
        return NextResponse.json({ error: setProductImageError.message }, { status: 500 });
      }
    }

    const parsedProductIdForLog = Number.parseInt(String(productIdValue), 10);

    const editor = user.email || user.user_metadata?.username || "Unknown";
    await activityHelper.logActivity({
      actionType: "delete_image",
      productId: Number.isNaN(parsedProductIdForLog) ? null : parsedProductIdForLog,
      description: `Deleted image (was displaying as #${display_order}${is_primary ? ", primary" : ""}) on product ID ${String(productIdValue)}`,
      editor: editor,
      user_id: user.id,
      supabase: supabaseAdmin
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
