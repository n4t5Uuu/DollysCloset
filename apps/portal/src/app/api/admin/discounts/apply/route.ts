import { NextRequest, NextResponse } from "next/server";
import { activityHelper } from "@/lib/activity/activity-helper";
import { createAdminClient, discountHelper } from "@dollys-closet/core";
import { requireRequestAuth } from "@/lib/auth/auth-server";

function formatCurrency(value: number) {
    return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        const editor = user.email || user.user_metadata?.username || "Unknown";
        const { discount_id, product_ids } = await request.json();

        const productIds = Array.isArray(product_ids)
            ? product_ids.map((productId) => String(productId)).filter(Boolean)
            : [];

        if (!discount_id || productIds.length === 0) {
            return NextResponse.json({ error: "Select a discount and at least one product." }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();
        const { data: discount, error: discountError } = await discountHelper.getDiscountById(discount_id, supabaseAdmin);

        if (discountError) {
            return NextResponse.json({ error: discountError.message }, { status: 500 });
        }

        if (!discount) {
            return NextResponse.json({ error: "Discount not found." }, { status: 404 });
        }

        if (!discount.is_active) {
            return NextResponse.json({ error: "This discount is inactive." }, { status: 400 });
        }

        if (discount.ends_at && new Date(discount.ends_at).getTime() <= Date.now()) {
            return NextResponse.json({ error: "This discount has already ended." }, { status: 400 });
        }

        if (discount.discount_type === "fixed_price") {
            const targetPrice = Math.max(0, Number(discount.discount_value) || 0);
            const { data: products, error: productsError } = await supabaseAdmin
                .from("tbl_product")
                .select("product_id, product_name, product_price")
                .in("product_id", productIds);

            if (productsError) {
                return NextResponse.json({ error: productsError.message }, { status: 500 });
            }

            const productRows = (products || []) as Array<{ product_id: string | number; product_name: string; product_price: number }>;
            const productById = new Map(productRows.map((product) => [String(product.product_id), product]));
            const missingProductIds = productIds.filter((productId) => !productById.has(String(productId)));

            if (missingProductIds.length > 0) {
                return NextResponse.json({ error: "One or more selected products could not be found." }, { status: 404 });
            }

            const invalidProducts = productRows.filter((product) => Number(product.product_price || 0) <= targetPrice);
            if (invalidProducts.length > 0) {
                const productNames = invalidProducts.map((product) => product.product_name).join(", ");
                return NextResponse.json({
                    error: `This code sets the final price to ${formatCurrency(targetPrice)}, but these products are already at or below that price: ${productNames}.`,
                }, { status: 400 });
            }
        }

        const { error } = await discountHelper.assignDiscountToProducts(discount_id, productIds, supabaseAdmin);
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        await activityHelper.logActivity({
            actionType: "apply_discount",
            description: `Applied discount ${discount.discount_name} to ${productIds.length} product(s)`,
            editor,
            user_id: user.id,
            supabase: supabaseAdmin,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error applying discount:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to apply discount" }, { status: 500 });
    }
}