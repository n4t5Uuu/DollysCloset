import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { authHelper } from "@/lib/auth-helper";
import { productHelper } from "@/lib/products/product-helper";
import { activityHelper } from "@/lib/activity/activity-helper";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"]);

/**
 * Evaluates whether an incoming multi-part file matches system-defined safe image MIME types and extensions.
 * @param file - The raw file object queued for validation prior to bucket placement.
 * @returns A boolean confirmation regarding whether the object conforms securely.
 */
function isImageUpload(file: File) {
  const normalizedMimeType = (file.type || "").toLowerCase();
  if (normalizedMimeType && ALLOWED_IMAGE_MIME_TYPES.has(normalizedMimeType)) {
    return true;
  }

  const extension = file.name.toLowerCase().split(".").pop() || "";
  return ALLOWED_IMAGE_EXTENSIONS.has(extension);
}

/**
 * Manages securely uploading media blobs assigned as product gallery photos.
 * Implements rigid limits capping maximum assigned images natively (max 5 per product sequence).
 * Assigns chronological order values logically and logs success paths onto the general activity board via data helper schemas.
 * Requires administrative or localized employee clearance tokens.
 * @param request - Standard Next.js Request conveying the payload wrapping a generic target `product_id` and the multi-part photo.
 * @returns An updated gallery JSON record representing successful logic writes reflecting the active public Supabase URL payload.
 */
export async function POST(request: NextRequest) {
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

    const productIdValue = Number.parseInt(productId, 10);
    if (Number.isNaN(productIdValue)) {
      return NextResponse.json({ error: "Invalid product_id" }, { status: 400 });
    }

    // Check max 5 images per product using productHelper
    const { data: existingImages, error: fetchError } = await productHelper.getProductImages(productIdValue, admin);

    if (fetchError) {
      return NextResponse.json(
        { error: "Image lookup failed", details: fetchError.message },
        { status: 500 }
      );
    }
    if (existingImages && existingImages.length >= 5) {
      return NextResponse.json({ error: "Maximum 5 images per product" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileName = `${productId}/${Date.now()}-${file.name}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
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

    // Get public URL
    const { data: { publicUrl } } = admin.storage
      .from("product-images")
      .getPublicUrl(fileName);

    // Calculate display order (if no images, set to 1, otherwise get max + 1)
    let displayOrder = (existingImages?.length || 0) + 1;
    let isFirstImage = (existingImages?.length || 0) === 0;

    if (displayOrderParam) {
      displayOrder = Number.parseInt(displayOrderParam, 10);
    }
    if (isPrimaryParam) {
      isFirstImage = isPrimaryParam === "true";
    }

    // Insert image record using productHelper
    const { data: imageData, error: insertError } = await productHelper.createProductImage({
      product_id: productIdValue,
      image_url: publicUrl,
      is_primary: isFirstImage,
      display_order: displayOrder,
      created_at: new Date().toISOString(),
    }, admin);

    if (insertError) {
      return NextResponse.json(
        { error: "Image record failed", details: insertError.message },
        { status: 500 }
      );
    }

    // Update product's image_id if this is the first image or product has no image yet using productHelper
    if (imageData?.image_id) {
      const { data: productRow } = await productHelper.getProductById(productIdValue, admin);

      if (isFirstImage || productRow?.image_id == null) {
        await productHelper.updateProduct(productIdValue, { image_id: imageData.image_id }, admin);
      }
    }

    // Log activity
    const editor = user.email || user.user_metadata?.username || "Unknown";
    await activityHelper.logActivity({
      actionType: "upload_image",
      productId: productIdValue,
      description: `Uploaded image: ${file.name}`,
      editor: editor,
      user_id: user.id,
      supabase: admin
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
