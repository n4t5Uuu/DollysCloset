import { NextRequest, NextResponse } from "next/server";
import {
  createAdminClient,
  authHelper,
  getAllFaqs,
  createFaq,
  FAQCategory,
  sanitizeSingleLineText,
  sanitizeMultilineText,
  uiContentLimits,
} from "@dollys-closet/core";
import { createServerSupabase } from "@dollys-closet/core/lib/supabase/server";
import { activityHelper } from "@/lib/activity/activity-helper";

const FAQ_CATEGORIES: FAQCategory[] = ["General", "Ordering", "Shipping", "Returns", "Products"];
const MAX_FAQ_ITEMS = 8;

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

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdmin(request);
    if (!auth.ok) return auth.response;

    const { data: faqs, error: faqError } = await getAllFaqs(auth.supabaseAdmin);
    if (faqError) return NextResponse.json({ error: faqError }, { status: 500 });
    return NextResponse.json({ data: faqs });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch FAQs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAdmin(request);
    if (!auth.ok) return auth.response;

    const { data: existingFaqs, error: faqError } = await getAllFaqs(auth.supabaseAdmin);
    if (faqError) {
      return NextResponse.json({ error: faqError }, { status: 500 });
    }

    if (existingFaqs.length >= MAX_FAQ_ITEMS) {
      return NextResponse.json({ error: `You can only have up to ${MAX_FAQ_ITEMS} FAQs.` }, { status: 400 });
    }

    const body = (await request.json()) as { question?: string; answer?: string; category?: FAQCategory; display_order?: number };
    const { category = "General", display_order = 0 } = body;
    const question = sanitizeSingleLineText(body.question, uiContentLimits.faqQuestion.maxLength);
    const answer = sanitizeMultilineText(body.answer, uiContentLimits.faqAnswer.maxLength);

    if (!FAQ_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid FAQ category" }, { status: 400 });
    }

    if (!question || !answer) {
      return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
    }

    const { data: created, error: createError } = await createFaq(auth.supabaseAdmin, {
      question,
      answer,
      category,
      display_order,
    });

    if (createError || !created) {
      return NextResponse.json({ error: createError || "Failed to create FAQ" }, { status: 500 });
    }

    await activityHelper.logActivity({
      actionType: "create_faq",
      productId: null,
      businessDetailsId: null,
      description: `Created FAQ: "${question.slice(0, 60)}"`,
      editor: auth.user.email || String(auth.user.user_metadata?.username || "Unknown"),
      user_id: auth.user.id,
      supabase: auth.supabaseAdmin,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create FAQ" }, { status: 500 });
  }
}
