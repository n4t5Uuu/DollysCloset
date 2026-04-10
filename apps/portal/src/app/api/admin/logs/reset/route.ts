import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Activity logs are permanent and cannot be cleared." },
    { status: 405 }
  );
}
