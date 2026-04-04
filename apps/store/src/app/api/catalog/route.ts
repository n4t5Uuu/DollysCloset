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
    console.error('CRITICAL ERROR in Catalog GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch catalog" },
      { status: 500 }
    );
  }
}
