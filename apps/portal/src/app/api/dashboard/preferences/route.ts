import { NextRequest, NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/auth/auth-server";
import {
  canAccessDashboardSurface,
  getDefaultDashboardLayout,
  isDashboardSurfaceKey,
  normalizeDashboardLayoutPreference,
} from "@/lib/dashboard-layout/config";
import { dashboardPreferenceStore } from "@/lib/dashboard-layout/preferences";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const surfaceParam = request.nextUrl.searchParams.get("surface");

    if (!surfaceParam || !isDashboardSurfaceKey(surfaceParam)) {
      return NextResponse.json({ error: "Invalid dashboard surface" }, { status: 400 });
    }

    if (!authResult.role || !canAccessDashboardSurface(authResult.role, surfaceParam)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await dashboardPreferenceStore.get(authResult.user.id, surfaceParam);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        surface: surfaceParam,
        layout: data ?? getDefaultDashboardLayout(surfaceParam),
        hasSavedPreference: Boolean(data),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();
    const surface = typeof body?.surface === "string" ? body.surface : "";

    if (!isDashboardSurfaceKey(surface)) {
      return NextResponse.json({ error: "Invalid dashboard surface" }, { status: 400 });
    }

    if (!authResult.role || !canAccessDashboardSurface(authResult.role, surface)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const normalizedLayout = normalizeDashboardLayoutPreference(surface, body?.layout);
    const { data, error } = await dashboardPreferenceStore.save(
      authResult.user.id,
      surface,
      normalizedLayout
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        surface,
        layout: data ?? normalizedLayout,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save dashboard preferences" },
      { status: 500 }
    );
  }
}
