import { NextRequest, NextResponse } from "next/server";
import { activityHelper } from "@/lib/activity/activity-helper";
import { createAdminClient, discountHelper } from "@dollys-closet/core";
import { requireRequestAuth } from "@/lib/auth/auth-server";

function parseIsoDate(value: unknown) {
    if (typeof value !== "string" || value.trim() === "") {
        return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return parsedDate.toISOString();
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

        const supabaseAdmin = createAdminClient();
        const [discountsResult, assignmentsResult] = await Promise.all([
            discountHelper.getDiscounts(supabaseAdmin),
            supabaseAdmin.from("tbl_discount_products").select("product_id, discount_id"),
        ]);

        if (discountsResult.error) {
            return NextResponse.json({ error: discountsResult.error.message }, { status: 500 });
        }

        if (assignmentsResult.error) {
            return NextResponse.json({ error: assignmentsResult.error.message }, { status: 500 });
        }

        const productCounts = new Map<string, number>();
        for (const assignment of assignmentsResult.data || []) {
            const discountId = String(assignment.discount_id);
            productCounts.set(discountId, (productCounts.get(discountId) || 0) + 1);
        }

        const discounts = (discountsResult.data || []).map((discount) => ({
            ...discount,
            productCount: productCounts.get(String(discount.id)) || 0,
        }));

        return NextResponse.json({ data: discounts });
    } catch (error: unknown) {
        console.error("Error fetching discounts:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch discounts" }, { status: 500 });
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
        const editor = user.email || user.user_metadata?.username || "Unknown";
        const body = await request.json();
        const discountName = typeof body.discount_name === "string" ? body.discount_name.trim() : "";
        const discountType = body.discount_type === "flat"
            ? "flat"
            : body.discount_type === "percent"
                ? "percent"
                : body.discount_type === "fixed_price"
                    ? "fixed_price"
                    : null;
        const discountValue = Number(body.discount_value);
        const endsAt = parseIsoDate(body.ends_at);
        const isActive = body.is_active !== false;

        if (!discountName || !discountType || !Number.isFinite(discountValue) || discountValue < 0) {
            return NextResponse.json({ error: "Please provide a discount name, type, and value." }, { status: 400 });
        }

        if (discountType === "percent" && discountValue > 100) {
            return NextResponse.json({ error: "Percentage discounts cannot exceed 100." }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();
        const { data, error } = await discountHelper.createDiscount(
            {
                discount_name: discountName,
                discount_type: discountType,
                discount_value: discountValue,
                ends_at: endsAt,
                is_active: isActive,
            },
            supabaseAdmin
        );

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (data) {
            await activityHelper.logActivity({
                actionType: "create_discount",
                description: `Created discount code ${discountName}`,
                editor,
                user_id: user.id,
                supabase: supabaseAdmin,
            });
        }

        return NextResponse.json({ success: true, discount: data });
    } catch (error: unknown) {
        console.error("Error creating discount:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create discount" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const authResult = await requireRequestAuth(request, {
            allowedRoles: ["admin", "employee"],
        });

        if (!authResult.ok) {
            return authResult.response;
        }

        const body = await request.json();
        const discountId = body.discount_id;

        if (!discountId) {
            return NextResponse.json({ error: "Discount ID is required." }, { status: 400 });
        }

        if (typeof body.is_active !== "boolean") {
            return NextResponse.json({ error: "is_active must be a boolean." }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();
        const { data, error } = await discountHelper.toggleDiscountActive(discountId, body.is_active, supabaseAdmin);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, discount: data });
    } catch (error: unknown) {
        console.error("Error toggling discount:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to toggle discount" }, { status: 500 });
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
        const editor = user.email || user.user_metadata?.username || "Unknown";
        const parsedBody = await request.json().catch(() => ({}));
        const discountId = parsedBody?.discount_id;

        if (!discountId) {
            return NextResponse.json({ error: "Discount ID is required." }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();
        const { data: discount, error: discountError } = await discountHelper.getDiscountById(discountId, supabaseAdmin);

        if (discountError) {
            return NextResponse.json({ error: discountError.message }, { status: 500 });
        }

        if (!discount) {
            return NextResponse.json({ error: "Discount not found." }, { status: 404 });
        }

        const { error: clearAssignmentsError } = await discountHelper.clearAssignmentsByDiscount(discountId, supabaseAdmin);
        if (clearAssignmentsError) {
            return NextResponse.json({ error: clearAssignmentsError.message }, { status: 500 });
        }

        const { error: deleteDiscountError } = await discountHelper.deleteDiscount(discountId, supabaseAdmin);
        if (deleteDiscountError) {
            return NextResponse.json({ error: deleteDiscountError.message }, { status: 500 });
        }

        await activityHelper.logActivity({
            actionType: "delete_discount",
            description: `Deleted discount code ${discount.discount_name}`,
            editor,
            user_id: user.id,
            supabase: supabaseAdmin,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error deleting discount:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete discount" }, { status: 500 });
    }
}