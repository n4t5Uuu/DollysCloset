import { NextRequest, NextResponse } from 'next/server';
import { productHelper } from "@/lib/products/product-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { admin } from "@/lib/supabase/admin";
import { requireRequestAuth } from "@/lib/auth/auth-server";
import {
  sanitizeMultilineText,
  sanitizeSingleLineText,
  schemaExactLimits,
  uiContentLimits,
} from "@/lib/input-sanitization";

export async function GET(request: Request) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { data, error } = await productHelper.getProducts(admin);

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
    } = await request.json();
    const normalizedProductName = sanitizeSingleLineText(product_name, schemaExactLimits.productName);
    const normalizedBrand = sanitizeSingleLineText(product_brand, schemaExactLimits.productBrand) || "Dolly's Closet";
    const normalizedDescription = sanitizeMultilineText(product_description, uiContentLimits.productDescription.maxLength);
    const normalizedCondition = sanitizeSingleLineText(product_condition || "New", schemaExactLimits.productCondition) || "New";
    const normalizedSizeLabel = sanitizeSingleLineText(size_label || "One Size", schemaExactLimits.productSizeLabel) || "One Size";

    if (!normalizedProductName || !category_id || product_price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedStock = parseInt(product_stock) || 0;
    let finalShowInCatalog = show_in_catalog !== false;

    if (parsedStock === 0) {
      finalShowInCatalog = false;
    }

    const { data: product, error: insertError } = await productHelper.createProduct({
      product_name: normalizedProductName,
      category_id,
      product_price: parseFloat(product_price),
      product_brand: normalizedBrand,
      product_description: normalizedDescription,
      product_stock: parsedStock,
      product_condition: normalizedCondition,
      size_label: normalizedSizeLabel,
      show_in_catalog: finalShowInCatalog,
      image_id: image_id || null,
    }, admin);

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (product) {
      await activityHelper.logActivity({
        actionType: 'create_product',
        productId: product.product_id,
        description: `Created product: ${normalizedProductName}`,
        editor: editor,
        user_id: user.id,
        supabase: admin
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

    const { product_id, product_name, category_id, product_price, product_brand, product_description, product_stock, product_condition, size_label, show_in_catalog, image_id } = await request.json();
    const normalizedProductName = sanitizeSingleLineText(product_name, schemaExactLimits.productName);
    const normalizedBrand = sanitizeSingleLineText(product_brand, schemaExactLimits.productBrand) || "Dolly's Closet";
    const normalizedDescription = sanitizeMultilineText(product_description, uiContentLimits.productDescription.maxLength);
    const normalizedCondition = sanitizeSingleLineText(product_condition || 'New', schemaExactLimits.productCondition) || 'New';
    const normalizedSizeLabel = sanitizeSingleLineText(size_label || 'One Size', schemaExactLimits.productSizeLabel) || 'One Size';

    if (!product_id || !normalizedProductName || !category_id || product_price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: currentProduct } = await productHelper.getProductById(product_id, admin);

    const parsedStock = parseInt(product_stock) || 0;
    let finalShowInCatalog = show_in_catalog !== false;

    if (parsedStock === 0) {
      finalShowInCatalog = false;
    }

    const changes: string[] = [];
    if (currentProduct) {
      if (currentProduct.product_name !== product_name) changes.push(`name: ${currentProduct.product_name} → ${product_name}`);
      if (currentProduct.category_id !== category_id) changes.push(`category: ${currentProduct.category_id} → ${category_id}`);
      if (currentProduct.product_price !== parseFloat(product_price)) changes.push(`price: ${currentProduct.product_price} → ${product_price}`);
      if (currentProduct.product_brand !== (product_brand || 'Dolly\'s Closet')) changes.push(`brand: ${currentProduct.product_brand} → ${product_brand || 'Dolly\'s Closet'}`);
      if (currentProduct.product_description !== (product_description || '')) changes.push(`description updated`);
      if (currentProduct.product_stock !== parsedStock) changes.push(`stock: ${currentProduct.product_stock} → ${parsedStock}`);
      if (currentProduct.product_condition !== normalizedCondition) changes.push(`condition: ${currentProduct.product_condition} → ${normalizedCondition}`);
      if (currentProduct.size_label !== normalizedSizeLabel) changes.push(`size: ${currentProduct.size_label} → ${normalizedSizeLabel}`);
      if (currentProduct.show_in_catalog !== finalShowInCatalog) changes.push(`visibility: ${currentProduct.show_in_catalog ? 'shown' : 'hidden'} → ${finalShowInCatalog ? 'shown' : 'hidden'}`);
    }

    let normalizedImageId: string | number | null = null;
    if (image_id !== null && image_id !== undefined && String(image_id).trim() !== '') {
      const parsedImageId = Number.parseInt(String(image_id), 10);
      const imageIdValue = Number.isNaN(parsedImageId) ? String(image_id).trim() : parsedImageId;

      const { data: linkedImage, error: linkedImageError } = await productHelper.verifyProductImage(
        imageIdValue,
        product_id,
        admin
      );

      if (linkedImageError) {
        return NextResponse.json({ error: linkedImageError.message }, { status: 500 });
      }

      normalizedImageId = linkedImage?.image_id ?? null;
    }

    const { error: updateError } = await productHelper.updateProduct(product_id, {
      product_name: normalizedProductName,
      category_id,
      product_price: parseFloat(product_price),
      product_brand: normalizedBrand,
      product_description: normalizedDescription,
      product_stock: parsedStock,
      product_condition: normalizedCondition,
      size_label: normalizedSizeLabel,
      show_in_catalog: finalShowInCatalog,
      image_id: normalizedImageId,
    }, admin);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await activityHelper.logActivity({
      actionType: 'edit_product',
      productId: product_id,
      description: changes.length > 0 ? `Updated product "${normalizedProductName}": ${changes.join(', ')}` : `Updated product "${normalizedProductName}"`,
      editor: editor,
      user_id: user.id,
      supabase: admin
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

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { user } = authResult;
    const editor = user.email || user.user_metadata?.username || 'Unknown';

    const { product_id } = await request.json();

    if (!product_id) {
      return NextResponse.json({ error: 'Missing product_id' }, { status: 400 });
    }

    const productIdValue = Number.parseInt(String(product_id), 10);
    if (Number.isNaN(productIdValue)) {
      return NextResponse.json({ error: 'Invalid product_id' }, { status: 400 });
    }

    const { data: images, error: imagesError } = await productHelper.getProductImages(productIdValue, admin);

    if (imagesError) {
      console.error('Image fetch error:', imagesError);
      return NextResponse.json({ error: imagesError.message }, { status: 500 });
    }

    if (images && images.length > 0) {
      const { error: clearImageReferenceError } = await productHelper.updateProduct(
        productIdValue,
        { image_id: null },
        admin
      );

      if (clearImageReferenceError) {
        console.error('Clear image reference error:', clearImageReferenceError);
        return NextResponse.json({ error: clearImageReferenceError.message }, { status: 500 });
      }

      const filePaths = images
        .map((img) => img.image_url?.split('/').slice(-2).join('/'))
        .filter((path) => path);

      if (filePaths.length > 0) {
        await admin.storage.from('product-images').remove(filePaths);
      }

      const { error: imageDeleteError } = await productHelper.deleteProductImageReferences(
        productIdValue,
        admin
      );

      if (imageDeleteError) {
        console.error('Image delete error:', imageDeleteError);
        return NextResponse.json({ error: imageDeleteError.message }, { status: 500 });
      }
    }

    const { error: deleteError } = await productHelper.deleteProduct(productIdValue, admin);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await activityHelper.logActivity({
      actionType: 'delete_product',
      productId: product_id,
      description: 'Deleted product',
      editor: editor,
      user_id: user.id,
      supabase: admin
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error: unknown) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
