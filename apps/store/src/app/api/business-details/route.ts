import { NextRequest, NextResponse } from "next/server";
import {
  createAdminClient,
  getPublicBusinessDetailsBySlug,
} from "@dollys-closet/core";

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch business details" },
      { status: 500 }
    );
  }
}
