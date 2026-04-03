import { NextRequest, NextResponse } from "next/server";

/**
 * Kept as a compatibility endpoint, but product-view events are handled by analytics only.
 */
export async function POST(request: NextRequest) {
  try {
    await request.json().catch(() => null);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
