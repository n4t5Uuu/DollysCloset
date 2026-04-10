import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@dollys-closet/core";
import { activityHelper } from "@/lib/activity/activity-helper";
import { requireRequestAuth } from "@/lib/auth/auth-server";
import { buildCsvString, csvDownloadHeaders } from "@/lib/export/csvExport";
import { buildXlsxBuffer, xlsxDownloadHeaders } from "@/lib/export/xlsxExport";

/**
 * GET /api/admin/logs/export?before=<ISO>&format=csv|xlsx
 *
 * Streams a CSV or XLSX of all activity logs whose `created_at` is strictly
 * older than the given cutoff. Admin only. Used by the Export & Purge modal
 * as the mandatory backup step before wiping old logs. Defaults to CSV when
 * `format` is omitted.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const beforeParam = searchParams.get("before");
    const formatParam = (searchParams.get("format") ?? "csv").toLowerCase();

    if (formatParam !== "csv" && formatParam !== "xlsx") {
      return NextResponse.json(
        { error: "Invalid `format` query parameter — must be `csv` or `xlsx`." },
        { status: 400 }
      );
    }

    if (!beforeParam) {
      return NextResponse.json(
        { error: "Missing required `before` query parameter (ISO 8601 timestamp)." },
        { status: 400 }
      );
    }

    const beforeDate = new Date(beforeParam);
    if (Number.isNaN(beforeDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid `before` query parameter — must be a valid ISO 8601 timestamp." },
        { status: 400 }
      );
    }

    const cutoffIso = beforeDate.toISOString();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await activityHelper.fetchLogsForExport(cutoffIso, supabaseAdmin);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (formatParam === "xlsx") {
      const buffer = buildXlsxBuffer("Activity Logs", rows);
      const filename = `activity-logs-export-${timestamp}.xlsx`;
      return new NextResponse(new Uint8Array(buffer), {
        headers: xlsxDownloadHeaders(filename),
      });
    }

    const csv = buildCsvString(rows);
    const filename = `activity-logs-export-${timestamp}.csv`;
    return new NextResponse(csv, {
      headers: csvDownloadHeaders(filename),
    });
  } catch (error: unknown) {
    console.error("Error exporting activity logs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
