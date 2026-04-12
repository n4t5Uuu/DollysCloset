import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, storageUsageHelper } from "@dollys-closet/core";
import { requireRequestAuth } from "@/lib/auth/auth-server";

const DEFAULT_BUDGET_BYTES = 900 * 1024 * 1024; // 900 MB

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) return authResult.response;

    const supabase = createAdminClient();
    const { data, error } = await storageUsageHelper.getStorageUsage(supabase);

    if (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }

    const budgetBytes = Number(process.env.STORAGE_BUDGET_BYTES ?? DEFAULT_BUDGET_BYTES);
    const usedBytes = Number((data as { used_bytes: number } | null)?.used_bytes ?? 0);

    return NextResponse.json({
      usedBytes,
      budgetBytes,
      remainingBytes: Math.max(0, budgetBytes - usedBytes),
    });
  } catch (error) {
    console.error("Storage usage error:", error);
    return NextResponse.json({ error: "Failed to fetch storage usage" }, { status: 500 });
  }
}
