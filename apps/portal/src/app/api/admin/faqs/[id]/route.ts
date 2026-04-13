import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, authHelper, updateFaq, deleteFaq, FAQCategory } from "@dollys-closet/core";
import { createServerSupabase } from "@dollys-closet/core/lib/supabase/server";
import { activityHelper } from "@/lib/activity/activity-helper";

async function validateAdmin(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const supabaseAdmin = createAdminClient();
  const { data: userData } = await authHelper.getUserRole(user.id, supabaseAdmin);
  if (userData?.role !== "admin") {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 }) };
  }
  return { ok: true as const, user, supabaseAdmin };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await validateAdmin(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = (await request.json()) as { question?: string; answer?: string; category?: FAQCategory; is_active?: boolean; display_order?: number };

    const faqId = Number(id);
    if (!Number.isFinite(faqId)) {
      return NextResponse.json({ error: "Invalid FAQ ID" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await updateFaq(auth.supabaseAdmin, faqId, {
      ...(body.question !== undefined && { question: body.question.trim() }),
      ...(body.answer !== undefined && { answer: body.answer.trim() }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      ...(body.display_order !== undefined && { display_order: body.display_order }),
    });

    if (updateError || !updated) {
      return NextResponse.json({ error: updateError || "Failed to update FAQ" }, { status: 500 });
    }

    await activityHelper.logActivity({
      actionType: "edit_faq",
      faqId: faqId,
      productId: null,
      businessDetailsId: null,
      description: `Updated FAQ: "${updated.question.slice(0, 60)}"`,
      editor: auth.user.email || String(auth.user.user_metadata?.username || "Unknown"),
      user_id: auth.user.id,
      supabase: auth.supabaseAdmin,
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update FAQ" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await validateAdmin(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const faqId = Number(id);
    if (!Number.isFinite(faqId)) {
      return NextResponse.json({ error: "Invalid FAQ ID" }, { status: 400 });
    }

    const { success, error: deleteError } = await deleteFaq(auth.supabaseAdmin, faqId);

    if (!success) {
      return NextResponse.json({ error: deleteError || "Failed to delete FAQ" }, { status: 500 });
    }

    await activityHelper.logActivity({
      actionType: "delete_faq",
      faqId: faqId,
      productId: null,
      businessDetailsId: null,
      description: `Deleted FAQ item`,
      editor: auth.user.email || String(auth.user.user_metadata?.username || "Unknown"),
      user_id: auth.user.id,
      supabase: auth.supabaseAdmin,
    });

    return NextResponse.json({ data: { id } });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete FAQ" }, { status: 500 });
  }
}
