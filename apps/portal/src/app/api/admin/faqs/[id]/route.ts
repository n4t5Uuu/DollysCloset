import { NextRequest, NextResponse } from "next/server";
import {
  createAdminClient,
  authHelper,
  updateFAQ,
  deleteFAQ,
  FAQCategory,
  sanitizeSingleLineText,
  sanitizeMultilineText,
  uiContentLimits,
} from "@dollys-closet/core";
import { createServerSupabase } from "@dollys-closet/core/lib/supabase/server";
import { activityHelper } from "@/lib/activity/activity-helper";

const FAQ_CATEGORIES: FAQCategory[] = ["General", "Ordering", "Shipping", "Returns", "Products"];

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
    const nextQuestion = body.question !== undefined
      ? sanitizeSingleLineText(body.question, uiContentLimits.faqQuestion.maxLength)
      : undefined;
    const nextAnswer = body.answer !== undefined
      ? sanitizeMultilineText(body.answer, uiContentLimits.faqAnswer.maxLength)
      : undefined;

    if (body.category !== undefined && !FAQ_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: "Invalid FAQ category" }, { status: 400 });
    }

    if (body.question !== undefined && !nextQuestion) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    if (body.answer !== undefined && !nextAnswer) {
      return NextResponse.json({ error: "Answer is required" }, { status: 400 });
    }

    const updated = await updateFAQ(auth.supabaseAdmin, id, {
      ...(nextQuestion !== undefined && { question: nextQuestion }),
      ...(nextAnswer !== undefined && { answer: nextAnswer }),
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
