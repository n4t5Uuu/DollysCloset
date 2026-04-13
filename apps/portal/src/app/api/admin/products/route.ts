import { NextRequest, NextResponse } from 'next/server';
import { activityHelper } from "@/lib/activity/activity-helper";
import { createAdminClient, discountHelper, productHelper } from "@dollys-closet/core";
import { requireRequestAuth } from "@/lib/auth/auth-server";
import {
  numericLimits,
  parseProductPrice,
  sanitizeMultilineText,
  sanitizeSingleLineText,
  schemaExactLimits,
  uiContentLimits,
} from "@dollys-closet/core";

type ProductScope = "active" | "archived" | "all";

function normalizeScope(rawScope: string | null): ProductScope {
  if (rawScope === "archived" || rawScope === "all") {
    return rawScope;
  }

  return "active";
}

function normalizeSeasonId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function validateSeasonSelection(
  body: Record<string, unknown>,
  seasonId: string | null,
  supabaseAdmin: ReturnType<typeof createAdminClient>
) {
  if (!Object.prototype.hasOwnProperty.call(body, "season_id") || !seasonId) {
    return null;
  }

  const { data: seasonRow, error: seasonError } = await supabaseAdmin
    .from("tbl_season")
    .select("season_id")
    .eq("season_id", seasonId)
    .maybeSingle();

  if (seasonError) {
    return NextResponse.json({ error: seasonError.message }, { status: 500 });
  }

  if (!seasonRow) {
    return NextResponse.json({ error: "Selected season was not found." }, { status: 404 });
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const scope = normalizeScope(searchParams.get("scope"));
    const supabaseAdmin = createAdminClient();
    const { data, error } = await productHelper.getProducts(supabaseAdmin, { scope });

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })

  } catch (err: unknown) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
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
    const editor = user.email || user.user_metadata?.username || 'Unknown';

    const body = await request.json() as Record<string, unknown>;
    const {
      product_name,
      category_id,
      product_price,
      product_brand,
      product_description,
      product_stock,
      product_condition,
      size_label,
      show_in_catalog,
      image_id,
      discount_id,
      season_id,
    } = body;
    const normalizedDiscountId =
      typeof discount_id === "string" || typeof discount_id === "number" ? discount_id : null;
    const normalizedProductName = sanitizeSingleLineText(product_name, schemaExactLimits.productName);
    const normalizedBrand = sanitizeSingleLineText(product_brand, schemaExactLimits.productBrand) || "Dolly's Closet";
    const normalizedDescription = sanitizeMultilineText(product_description, uiContentLimits.productDescription.maxLength);
    const normalizedCondition = sanitizeSingleLineText(product_condition || "New", schemaExactLimits.productCondition) || "New";
    const normalizedSizeLabel = sanitizeSingleLineText(size_label || "One Size", schemaExactLimits.productSizeLabel) || "One Size";

    if (!normalizedProductName || !category_id || product_price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedProductPrice = parseProductPrice(product_price);
    if (parsedProductPrice === null) {
      return NextResponse.json(
        { error: `Price must be between 0 and ₱${numericLimits.productPrice.max.toLocaleString()}.` },
        { status: 400 }
      );
    }

    const parsedStock = Number.parseInt(String(product_stock), 10) || 0;
    const requestedShowInCatalog = show_in_catalog !== false;

    if (parsedStock === 0 && requestedShowInCatalog) {
      return NextResponse.json(
        { error: "You can't show an out-of-stock product." },
        { status: 400 }
      );
    }

    let finalShowInCatalog = requestedShowInCatalog;

    if (parsedStock === 0) {
      finalShowInCatalog = false;
    }

    const supabaseAdmin = createAdminClient();

    const normalizedSeasonId = normalizeSeasonId(season_id);
    const seasonValidationResponse = await validateSeasonSelection(body, normalizedSeasonId, supabaseAdmin);
    if (seasonValidationResponse) {
      return seasonValidationResponse;
    }

    if (Object.prototype.hasOwnProperty.call(body, "discount_id") && normalizedDiscountId) {
      const { data: selectedDiscount, error: discountError } = await discountHelper.getDiscountById(normalizedDiscountId, supabaseAdmin);
      if (discountError) {
        return NextResponse.json({ error: discountError.message }, { status: 500 });
      }

      if (!selectedDiscount) {
        return NextResponse.json({ error: "Discount not found." }, { status: 404 });
      }

      if (!selectedDiscount.is_active) {
        return NextResponse.json({ error: "Selected discount is inactive." }, { status: 400 });
      }

      if (selectedDiscount.ends_at && new Date(selectedDiscount.ends_at).getTime() <= Date.now()) {
        return NextResponse.json({ error: "Selected discount has already ended." }, { status: 400 });
      }

      if (selectedDiscount.discount_type === "fixed_price") {
        const targetPrice = Math.max(0, Number(selectedDiscount.discount_value) || 0);
        const productPrice = parsedProductPrice;

        if (productPrice <= targetPrice) {
          return NextResponse.json({
            error: `This code sets the final price to ₱${targetPrice.toFixed(2)}, which must be lower than the product price.`,
          }, { status: 400 });
        }
      }
    }

    const { data: product, error: insertError } = await productHelper.createProduct({
      product_name: normalizedProductName,
      category_id,
      product_price: parsedProductPrice,
      product_brand: normalizedBrand,
      product_description: normalizedDescription,
      product_stock: parsedStock,
      product_condition: normalizedCondition,
      size_label: normalizedSizeLabel,
      show_in_catalog: finalShowInCatalog,
      season_id: normalizedSeasonId,
      image_id: image_id || null,
    }, supabaseAdmin);

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (product && Object.prototype.hasOwnProperty.call(body, "discount_id")) {
      if (normalizedDiscountId) {
        const { error: applyError } = await discountHelper.assignDiscountToProducts(normalizedDiscountId, [product.product_id], supabaseAdmin);
        if (applyError) {
          return NextResponse.json({ error: applyError.message }, { status: 500 });
        }
      } else {
        const { error: clearError } = await discountHelper.clearDiscountFromProducts([product.product_id], supabaseAdmin);
        if (clearError) {
          return NextResponse.json({ error: clearError.message }, { status: 500 });
        }
      }

      await activityHelper.logActivity({
        actionType: 'create_product',
        productId: product.product_id,
        description: `Created product: ${normalizedProductName}`,
        editor: editor,
        user_id: user.id,
        supabase: supabaseAdmin
      });
    }

    return NextResponse.json({
      success: true,
      product: product
    });

  } catch (error: unknown) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

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

    const body = await request.json() as Record<string, unknown>;
    const { product_id, product_name, category_id, product_price, product_brand, product_description, product_stock, product_condition, size_label, show_in_catalog, image_id, discount_id, season_id } = body;
    const normalizedProductId =
      typeof product_id === "string" || typeof product_id === "number" ? product_id : null;
    const normalizedDiscountId =
      typeof discount_id === "string" || typeof discount_id === "number" ? discount_id : null;
    const normalizedProductName = sanitizeSingleLineText(product_name, schemaExactLimits.productName);
    const normalizedBrand = sanitizeSingleLineText(product_brand, schemaExactLimits.productBrand) || "Dolly's Closet";
    const normalizedDescription = sanitizeMultilineText(product_description, uiContentLimits.productDescription.maxLength);
    const normalizedCondition = sanitizeSingleLineText(product_condition || 'New', schemaExactLimits.productCondition) || 'New';
    const normalizedSizeLabel = sanitizeSingleLineText(size_label || 'One Size', schemaExactLimits.productSizeLabel) || 'One Size';
    const numericProductId = Number.parseInt(String(normalizedProductId), 10);

    if (!normalizedProductId || !normalizedProductName || !category_id || product_price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedProductPrice = parseProductPrice(product_price);
    if (parsedProductPrice === null) {
      return NextResponse.json(
        { error: `Price must be between 0 and ₱${numericLimits.productPrice.max.toLocaleString()}.` },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const normalizedSeasonId = normalizeSeasonId(season_id);
    const seasonValidationResponse = await validateSeasonSelection(body, normalizedSeasonId, supabaseAdmin);
    if (seasonValidationResponse) {
      return seasonValidationResponse;
    }

    const { data: currentProduct } = await productHelper.getProductById(normalizedProductId, supabaseAdmin, {
      includeArchived: true,
    });

    if (!currentProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (currentProduct.archived_at) {
      return NextResponse.json({ error: 'Archived products must be restored before they can be edited.' }, { status: 409 });
    }

    const parsedStock = Number.parseInt(String(product_stock), 10) || 0;
    const requestedShowInCatalog = show_in_catalog !== false;

    if (parsedStock === 0 && requestedShowInCatalog) {
      return NextResponse.json(
        { error: "You can't show an out-of-stock product." },
        { status: 400 }
      );
    }

    let finalShowInCatalog = requestedShowInCatalog;

    if (parsedStock === 0) {
      finalShowInCatalog = false;
    }

    const changes: string[] = [];
    if (currentProduct) {
      if (currentProduct.product_name !== product_name) changes.push(`name: ${currentProduct.product_name} → ${product_name}`);
      if (currentProduct.category_id !== category_id) changes.push(`category: ${currentProduct.category_id} → ${category_id}`);
      if (currentProduct.product_price !== parsedProductPrice) changes.push(`price: ${currentProduct.product_price} → ${parsedProductPrice}`);
      if (currentProduct.product_brand !== (product_brand || 'Dolly\'s Closet')) changes.push(`brand: ${currentProduct.product_brand} → ${product_brand || 'Dolly\'s Closet'}`);
      if (currentProduct.product_description !== (product_description || '')) changes.push(`description updated`);
      if (currentProduct.product_stock !== parsedStock) changes.push(`stock: ${currentProduct.product_stock} → ${parsedStock}`);
      if (currentProduct.product_condition !== normalizedCondition) changes.push(`condition: ${currentProduct.product_condition} → ${normalizedCondition}`);
      if (currentProduct.size_label !== normalizedSizeLabel) changes.push(`size: ${currentProduct.size_label} → ${normalizedSizeLabel}`);
      if (currentProduct.show_in_catalog !== finalShowInCatalog) changes.push(`visibility: ${currentProduct.show_in_catalog ? 'shown' : 'hidden'} → ${finalShowInCatalog ? 'shown' : 'hidden'}`);
      if ((currentProduct.season_id || null) !== normalizedSeasonId) changes.push(`season updated`);
    }

    let normalizedImageId: string | number | null = null;

    if (Object.prototype.hasOwnProperty.call(body, "discount_id") && normalizedDiscountId) {
      const { data: selectedDiscount, error: discountError } = await discountHelper.getDiscountById(normalizedDiscountId, supabaseAdmin);
      if (discountError) {
        return NextResponse.json({ error: discountError.message }, { status: 500 });
      }

      if (!selectedDiscount) {
        return NextResponse.json({ error: 'Discount not found.' }, { status: 404 });
      }

      if (!selectedDiscount.is_active) {
        return NextResponse.json({ error: 'Selected discount is inactive.' }, { status: 400 });
      }

      if (selectedDiscount.ends_at && new Date(selectedDiscount.ends_at).getTime() <= Date.now()) {
        return NextResponse.json({ error: 'Selected discount has already ended.' }, { status: 400 });
      }

      if (selectedDiscount.discount_type === "fixed_price") {
        const targetPrice = Math.max(0, Number(selectedDiscount.discount_value) || 0);
        const productPrice = parsedProductPrice;

        if (productPrice <= targetPrice) {
          return NextResponse.json({
            error: `This code sets the final price to ₱${targetPrice.toFixed(2)}, which must be lower than the product price.`,
          }, { status: 400 });
        }
      }
    }

    if (image_id !== null && image_id !== undefined && String(image_id).trim() !== '') {
      const parsedImageId = Number.parseInt(String(image_id), 10);
      const imageIdValue = Number.isNaN(parsedImageId) ? String(image_id).trim() : parsedImageId;

      const { data: linkedImage, error: linkedImageError } = await productHelper.verifyProductImage(
        imageIdValue,
        normalizedProductId,
        supabaseAdmin
      );

      if (linkedImageError) {
        return NextResponse.json({ error: linkedImageError.message }, { status: 500 });
      }

      normalizedImageId = linkedImage?.image_id ?? null;
    }

    const { error: updateError } = await productHelper.updateProduct(normalizedProductId, {
      product_name: normalizedProductName,
      category_id,
      product_price: parsedProductPrice,
      product_brand: normalizedBrand,
      product_description: normalizedDescription,
      product_stock: parsedStock,
      product_condition: normalizedCondition,
      size_label: normalizedSizeLabel,
      show_in_catalog: finalShowInCatalog,
      season_id: normalizedSeasonId,
      image_id: normalizedImageId,
    }, supabaseAdmin);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (Object.prototype.hasOwnProperty.call(body, "discount_id")) {
      if (normalizedDiscountId) {
        const { error: applyError } = await discountHelper.assignDiscountToProducts(normalizedDiscountId, [normalizedProductId], supabaseAdmin);
        if (applyError) {
          return NextResponse.json({ error: applyError.message }, { status: 500 });
        }

        changes.push(`discount assigned`);
      } else {
        const { error: clearError } = await discountHelper.clearDiscountFromProducts([normalizedProductId], supabaseAdmin);
        if (clearError) {
          return NextResponse.json({ error: clearError.message }, { status: 500 });
        }

        changes.push(`discount removed`);
      }
    }

    await activityHelper.logActivity({
      actionType: 'edit_product',
      productId: Number.isNaN(numericProductId) ? undefined : numericProductId,
      description: changes.length > 0 ? `Updated product "${normalizedProductName}": ${changes.join(', ')}` : `Updated product "${normalizedProductName}"`,
      editor: editor,
      user_id: user.id,
      supabase: supabaseAdmin
    });

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully'
    });

  } catch (error: unknown) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Hard delete is disabled. Archive products instead.' },
    { status: 405 }
  );
}
