import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@dollys-closet/core";
import { activityHelper } from "@/lib/activity/activity-helper";
import { requireRequestAuth } from "@/lib/auth/auth-server";

/**
 * Parses and validates an ISO 8601 `before` cutoff. The cutoff must be a
 * valid date strictly in the past — future cutoffs are rejected so callers
 * can't accidentally wipe live data.
 */
function parseBeforeParam(value: string | null): { iso: string } | { error: string } {
  if (!value) {
    return { error: "Missing required `before` parameter (ISO 8601 timestamp)." };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "Invalid `before` parameter — must be a valid ISO 8601 timestamp." };
  }

  if (parsed.getTime() >= Date.now()) {
    return { error: "`before` must be a date in the past." };
  }

  return { iso: parsed.toISOString() };
}

/**
 * GET /api/admin/logs/reset?dryRun=1&before=<ISO>
 *
 * Dry-run preview for the Export & Purge modal. Returns the number of
 * activity logs that would be wiped by a purge with the given cutoff.
 * Admin only.
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
    const dryRun = searchParams.get("dryRun");
    if (dryRun !== "1" && dryRun !== "true") {
      return NextResponse.json(
        { error: "Only dryRun=1 is supported on GET. Use POST to purge." },
        { status: 400 }
      );
    }

    const parsed = parseBeforeParam(searchParams.get("before"));
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { count, error } = await activityHelper.countLogsOlderThan(parsed.iso, supabaseAdmin);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count, before: parsed.iso });
  } catch (error: unknown) {
    console.error("Error running logs purge dry-run:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/logs/reset
 * Body: { before: ISO string, confirm: "DELETE", exportConfirmed: true }
 *
 * Hard-deletes activity logs strictly older than the cutoff. Requires an
 * explicit DELETE confirmation and a flag proving the caller has already
 * downloaded an export. Admin only; uses a service-role client so the
 * `prevent_activity_log_mutation` trigger permits the delete.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (payload.confirm !== "DELETE") {
      return NextResponse.json(
        { error: 'You must type "DELETE" to confirm this destructive action.' },
        { status: 400 }
      );
    }

    if (payload.exportConfirmed !== true) {
      return NextResponse.json(
        { error: "You must export the logs before purging them." },
        { status: 400 }
      );
    }

    const parsed = parseBeforeParam(
      typeof payload.before === "string" ? payload.before : null
    );
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const { count: toPurge, error: countError } = await activityHelper.countLogsOlderThan(
      parsed.iso,
      supabaseAdmin
    );
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if (toPurge === 0) {
      return NextResponse.json({ purged: 0, message: "No logs matched the cutoff." });
    }

    const { count: purged, error: purgeError } = await activityHelper.purgeLogsOlderThan(
      parsed.iso,
      supabaseAdmin
    );
    if (purgeError) {
      return NextResponse.json({ error: purgeError.message }, { status: 500 });
    }

    const editor =
      authResult.user.email || authResult.user.user_metadata?.username || "Unknown";

    await activityHelper.logActivity({
      actionType: "purge_activity_logs",
      description: `Purged ${purged} activity log(s) older than ${parsed.iso}.`,
      editor,
      user_id: authResult.user.id,
      supabase: supabaseAdmin,
    });

    return NextResponse.json({ purged, before: parsed.iso });
  } catch (error: unknown) {
    console.error("Error purging activity logs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
