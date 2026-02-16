import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dataHelper } from "@/lib/data-helper";
import { logActivity } from "@/lib/activity-logger";

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const productId = formData.get("product_id") as string;

    if (!file || !productId) {
      return NextResponse.json({ error: "Missing file or product_id" }, { status: 400 });
    }

    const productIdValue = Number.parseInt(productId, 10);
    if (Number.isNaN(productIdValue)) {
      return NextResponse.json({ error: "Invalid product_id" }, { status: 400 });
    }

    // Check max 5 images per product
    const { data: existingImages, error: fetchError } = await supabaseAdmin
      .from("tbl_product_image")
      .select("image_id")
      .eq("product_id", productIdValue);

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

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
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
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(fileName);

    // Calculate display order (if no images, set to 1, otherwise get max + 1)
    const displayOrder = (existingImages?.length || 0) + 1;
    const isFirstImage = (existingImages?.length || 0) === 0;

    // Insert image record
    const { data: imageData, error: insertError } = await supabaseAdmin
      .from("tbl_product_image")
      .insert({
        product_id: productIdValue,
        image_url: publicUrl,
        is_primary: isFirstImage,
        display_order: displayOrder,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Image record failed", details: insertError.message },
        { status: 500 }
      );
    }

    // Update product's image_id if this is the first image or product has no image yet
    if (imageData.image_id) {
      const { data: productRow } = await supabaseAdmin
        .from("tbl_product")
        .select("image_id")
        .eq("product_id", productIdValue)
        .single();

      if (isFirstImage || productRow?.image_id == null) {
        await supabaseAdmin
          .from("tbl_product")
          .update({ image_id: imageData.image_id })
          .eq("product_id", productIdValue);
      }
    }

    // Log activity
    const editor = user.email || user.user_metadata?.username || "Unknown";
    await logActivity(
      supabaseAdmin,
      "upload_image",
      productIdValue,
      `Uploaded image: ${file.name}`,
      editor
    );

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
