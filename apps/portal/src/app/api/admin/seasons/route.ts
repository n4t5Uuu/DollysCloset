import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, mapSeasonRow, seasonHelper, windowsOverlap, type SeasonRow } from "@dollys-closet/core";
import { requireRequestAuth } from "@/lib/auth/auth-server";

type SeasonPayload = {
  season_name?: unknown;
  start_month?: unknown;
  start_day?: unknown;
  end_month?: unknown;
  end_day?: unknown;
  is_active?: unknown;
};

function toInt(value: unknown) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function maxDayForMonth(month: number) {
  const date = new Date(2001, month, 0);
  return date.getDate();
}

function validateSeasonInput(payload: SeasonPayload) {
  const seasonName = typeof payload.season_name === "string" ? payload.season_name.trim() : "";
  const startMonth = toInt(payload.start_month);
  const startDay = toInt(payload.start_day);
  const endMonth = toInt(payload.end_month);
  const endDay = toInt(payload.end_day);
  const isActive = payload.is_active !== false;

  if (!seasonName) {
    return { error: "Season name is required." };
  }

  if (!startMonth || !startDay || !endMonth || !endDay) {
    return { error: "Season start/end month and day are required." };
  }

  if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
    return { error: "Month must be between 1 and 12." };
  }

  if (startDay < 1 || startDay > maxDayForMonth(startMonth)) {
    return { error: "Start day is out of range for the selected month." };
  }

  if (endDay < 1 || endDay > maxDayForMonth(endMonth)) {
    return { error: "End day is out of range for the selected month." };
  }

  return {
    data: {
      season_name: seasonName,
      start_month: startMonth,
      start_day: startDay,
      end_month: endMonth,
      end_day: endDay,
      is_active: isActive,
    },
  };
}

function findOverlappingSeason(candidate: SeasonRow, seasons: SeasonRow[], skipSeasonId?: string) {
  return seasons.find((season) => {
    if (skipSeasonId && String(season.season_id) === skipSeasonId) return false;
    return windowsOverlap(candidate, season);
  });
}

function buildSeasonCandidate(
  seasonId: string,
  payload: {
    season_name: string;
    start_month: number;
    start_day: number;
    end_month: number;
    end_day: number;
    is_active: boolean;
  }
): SeasonRow {
  return {
    season_id: seasonId,
    season_name: payload.season_name,
    start_month: payload.start_month,
    start_day: payload.start_day,
    end_month: payload.end_month,
    end_day: payload.end_day,
    is_active: payload.is_active,
  };
}

export async function GET(request: Request) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const supabaseAdmin = createAdminClient();
    const seasonsResult = await seasonHelper.getSeasons(supabaseAdmin);

    if (seasonsResult.error) {
      return NextResponse.json({ error: seasonsResult.error.message }, { status: 500 });
    }

    const rows = seasonsResult.data || [];
    const activeSeason = seasonHelper.getActiveSeason(rows);

    return NextResponse.json({
      data: rows.map((row) => mapSeasonRow(row)),
      activeSeason,
    });
  } catch (error: unknown) {
    console.error("Error fetching seasons:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch seasons" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const body = (await request.json()) as SeasonPayload;
    const validation = validateSeasonInput(body);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const existingResult = await seasonHelper.getSeasons(supabaseAdmin);
    if (existingResult.error) {
      return NextResponse.json({ error: existingResult.error.message }, { status: 500 });
    }

    const candidate = buildSeasonCandidate("candidate", validation.data);

    const overlappingSeason = findOverlappingSeason(candidate, existingResult.data || []);
    if (overlappingSeason) {
      return NextResponse.json({ error: `Season overlaps with ${overlappingSeason.season_name}.` }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("tbl_season")
      .insert([validation.data])
      .select("season_id, season_name, start_month, start_day, end_month, end_day, is_active")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      season: data ? mapSeasonRow(data as SeasonRow) : null,
    });
  } catch (error: unknown) {
    console.error("Error creating season:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create season" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();
    const seasonId = typeof body.season_id === "string" ? body.season_id.trim() : "";
    if (!seasonId) {
      return NextResponse.json({ error: "season_id is required." }, { status: 400 });
    }

    const validation = validateSeasonInput(body as SeasonPayload);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const existingResult = await seasonHelper.getSeasons(supabaseAdmin);
    if (existingResult.error) {
      return NextResponse.json({ error: existingResult.error.message }, { status: 500 });
    }

    const candidate = buildSeasonCandidate(seasonId, validation.data);

    const overlappingSeason = findOverlappingSeason(candidate, existingResult.data || [], seasonId);
    if (overlappingSeason) {
      return NextResponse.json({ error: `Season overlaps with ${overlappingSeason.season_name}.` }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("tbl_season")
      .update(validation.data)
      .eq("season_id", seasonId)
      .select("season_id, season_name, start_month, start_day, end_month, end_day, is_active")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      season: data ? mapSeasonRow(data as SeasonRow) : null,
    });
  } catch (error: unknown) {
    console.error("Error updating season:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update season" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json().catch(() => ({}));
    const seasonId = typeof body?.season_id === "string" ? body.season_id.trim() : "";
    if (!seasonId) {
      return NextResponse.json({ error: "season_id is required." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const { error: clearError } = await supabaseAdmin
      .from("tbl_product")
      .update({ season_id: null })
      .eq("season_id", seasonId);

    if (clearError) {
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }

    const { error } = await supabaseAdmin
      .from("tbl_season")
      .delete()
      .eq("season_id", seasonId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting season:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete season" }, { status: 500 });
  }
}
