import { NextResponse } from "next/server";
import {
  createAdminClient,
  getCatalogPayload,
} from "@dollys-closet/core";

export async function GET() {
  try {
    const admin = createAdminClient();
    const result = await getCatalogPayload(admin);

    if (result.error) {
      throw result.error;
    }

    return NextResponse.json({
      data: result.data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('CRITICAL ERROR in Catalog GET:', errorMessage);

    // Provide a more descriptive error if it's a configuration issue
    if (errorMessage.includes("configured correctly")) {
      return NextResponse.json(
        { error: `Configuration Error: ${errorMessage}. Check Vercel environment variables.` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || "Failed to fetch catalog" },
      { status: 500 }
    );
  }
}
