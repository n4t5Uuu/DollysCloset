import { NextRequest, NextResponse } from "next/server";
import { employeeHelper } from "@/lib/employees/employee-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { createAdminClient } from "@dollys-closet/core/lib/supabase/admin";
import { requireRequestAuth } from "@/lib/auth/auth-server";

const MAX_BULK_ARCHIVE_EMPLOYEES = 100;

function normalizeEmployeeIds(payload: Record<string, unknown>) {
  const rawIds = Array.isArray(payload.employee_ids)
    ? payload.employee_ids
    : payload.employee_id !== undefined
      ? [payload.employee_id]
      : [];

  return Array.from(
    new Set(
      rawIds
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const payload = await request.json().catch(() => ({}));
    const employeeIds = normalizeEmployeeIds(payload);

    if (employeeIds.length === 0) {
      return NextResponse.json({ error: "Provide at least one valid employee_id." }, { status: 400 });
    }

    if (employeeIds.length > MAX_BULK_ARCHIVE_EMPLOYEES) {
      return NextResponse.json(
        { error: `You can archive up to ${MAX_BULK_ARCHIVE_EMPLOYEES} employees at a time.` },
        { status: 400 }
      );
    }

    if (employeeIds.includes(authResult.user.id)) {
      return NextResponse.json({ error: "You cannot archive your own account." }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();
    const { failures, deletedIds: archivedIds } = await employeeHelper.archiveEmployeesBulkAccount(employeeIds, supabaseAdmin);

    const editor = authResult.user.email || authResult.user.user_metadata?.username || "Unknown";
    await activityHelper.logActivity({
      actionType: "archive_employee",
      description:
        archivedIds.length <= 1
          ? "Archived employee account"
          : `Archived ${archivedIds.length} employee account(s)`,
      editor,
      user_id: authResult.user.id,
      supabase: supabaseAdmin,
    });

    const failedIds = failures.map((failure) => failure.employeeId);
    const status = failures.length > 0 ? 207 : 200;

    return NextResponse.json(
      {
        success: failures.length === 0,
        archived_count: archivedIds.length,
        archived_ids: archivedIds,
        failed_count: failures.length,
        failed_ids: failedIds,
        failures,
        message:
          failures.length > 0
            ? `Archived ${archivedIds.length} employee(s) with ${failures.length} failure(s).`
            : archivedIds.length === 1
              ? "Employee archived successfully."
              : `Archived ${archivedIds.length} employees successfully.`,
      },
      { status }
    );
  } catch (error: unknown) {
    console.error("Error archiving employees:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
