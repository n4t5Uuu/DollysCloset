import { NextRequest, NextResponse } from "next/server";
import {
  createAdminClient,
  getPublicBusinessDetailsBySlug,
} from "@dollys-closet/core";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const result = await getPublicBusinessDetailsBySlug(slug, admin);
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('CRITICAL ERROR in Business Details GET:', errorMessage);

    // Provide a more descriptive error if it's a configuration issue
    if (errorMessage.includes("configured correctly")) {
      return NextResponse.json(
        { error: `Configuration Error: ${errorMessage}. Check Vercel environment variables.` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || "Failed to fetch business details" },
      { status: 500 }
    );
  }
}
