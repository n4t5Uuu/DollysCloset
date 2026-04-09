import { NextRequest, NextResponse } from 'next/server';
import { activityHelper } from "@/lib/activity/activity-helper";
import { createAdminClient, productHelper } from "@dollys-closet/core";
import { requireRequestAuth } from "@/lib/auth/auth-server";

const MAX_BULK_DISCOUNT_PRODUCTS = 200;

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { user } = authResult;
    const editor = user.email || user.user_metadata?.username || 'Unknown';

    const { product_ids, discount_percent, discount_expires_at } = await request.json();

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty product_ids array' }, { status: 400 });
    }

    if (product_ids.length > MAX_BULK_DISCOUNT_PRODUCTS) {
      return NextResponse.json(
        { error: `You can update discounts for up to ${MAX_BULK_DISCOUNT_PRODUCTS} products at a time.` },
        { status: 400 }
      );
    }

    const parsedDiscountPercent = Math.round(Number(discount_percent));
    if (!Number.isFinite(parsedDiscountPercent) || parsedDiscountPercent < 0 || parsedDiscountPercent > 100) {
      return NextResponse.json({ error: 'Discount must be between 0 and 100.' }, { status: 400 });
    }

    if (parsedDiscountPercent > 0 && !discount_expires_at) {
      return NextResponse.json({ error: 'discount_expires_at is required when discount is greater than 0.' }, { status: 400 });
    }

    // Validate discount_expires_at if provided
    let validExpiresAt = null;
    if (discount_expires_at) {
      const expiryDate = new Date(discount_expires_at);
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json({ error: 'Invalid discount_expires_at date' }, { status: 400 });
      }
      if (expiryDate <= new Date()) {
        return NextResponse.json({ error: 'Expiration date must be in the future' }, { status: 400 });
      }
      validExpiresAt = expiryDate.toISOString();
    }

    const productIds = product_ids
      .map((id: unknown) => Number.parseInt(String(id), 10))
      .filter((id: number) => !Number.isNaN(id));

    if (productIds.length === 0) {
      return NextResponse.json({ error: 'No valid product_ids provided' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const updatePayload: any = { discount_percent: parsedDiscountPercent };
    if (parsedDiscountPercent === 0) {
      updatePayload.discount_expires_at = null;
    } else if (validExpiresAt) {
      updatePayload.discount_expires_at = validExpiresAt;
    }

    const { error: updateError } = await productHelper.updateProductsBulk(
      productIds,
      updatePayload,
      supabaseAdmin
    );

    if (updateError) {
      console.error('Bulk discount update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const saleEndInfo = validExpiresAt ? ` until ${new Date(validExpiresAt).toLocaleString()}` : '';

    await activityHelper.logActivity({
      actionType: 'edit_product',
      productId: null,
      description: `Set discount to ${parsedDiscountPercent}% for ${productIds.length} product(s)${saleEndInfo}`,
      editor,
      user_id: user.id,
      supabase: supabaseAdmin,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully set ${parsedDiscountPercent}% discount for ${productIds.length} product(s).`,
      updated_count: productIds.length,
    });
  } catch (error: unknown) {
    console.error('Error applying bulk discount:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
