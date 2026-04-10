import { NextResponse } from "next/server";

export async function DELETE() {
  return NextResponse.json(
    { error: "Hard delete is disabled. Archive products instead." },
    { status: 405 }
  );
}
