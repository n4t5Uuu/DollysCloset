import { cache } from "react";
import { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authHelper } from "@dollys-closet/core";
import { AuthRedirectReason } from "@/lib/auth/auth-routing";
import { createServerSupabase } from "@dollys-closet/core/lib/supabase/server";
import { createAdminClient } from "@dollys-closet/core/lib/supabase/admin";
import { employeeHelper } from "@/lib/employees/employee-helper";
import type { Employee } from "@dollys-closet/core";

/**
 * Represents the two primary administrative roles supported by the application.
 */
export type AppRole = "admin" | "employee";

interface RequestAuthOptions {
  allowCookieAuth?: boolean;
  allowedRoles?: AppRole[];
}

interface RequestAuthSuccess {
  ok: true;
  role: AppRole | null;
  user: User;
}

interface RequestAuthFailure {
  ok: false;
  reason: AuthRedirectReason;
  response: NextResponse;
}

interface ServerAuthSuccess {
  ok: true;
  role: AppRole | null;
  user: User;
}

interface ServerAuthFailure {
  ok: false;
  reason: AuthRedirectReason;
}

interface UserAccessState {
  archived: boolean;
  role: AppRole | null;
  userRow: Employee | null;
}

function isAppRole(role: string | null | undefined): role is AppRole {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === "admin" || normalized === "employee";
}

function getUnauthorizedResponse(reason: AuthRedirectReason = "login-required") {
  return NextResponse.json({ error: "Unauthorized", reason }, { status: 401 });
}

function getForbiddenResponse() {
  return NextResponse.json({ error: "Forbidden", reason: "access-denied" }, { status: 403 });
}

/**
 * Internal private helper to resolve a user's role from the database 
 * using the elevated admin client.
 * @param userId - Target user ID to lookup.
 * @param supabase - Administrative Supabase client.
 * @returns The resolved AppRole or null if not found or invalid.
 */
async function getUserRole(userId: string, supabase = createAdminClient()) {
  try {
    const { data: userRow, error } = await employeeHelper.getUserById(userId, supabase, {
      includeArchived: true,
    });

    if (error) {
      console.error(`[auth-server] Error fetching user row for ${userId}:`, error);
      return null;
    }

    if (!userRow) {
      console.warn(`[auth-server] User ${userId} has no app record in tbl_users.`);
      return null;
    }

    if (userRow.archived_at) {
      console.warn(`[auth-server] User ${userId} is archived and cannot access the portal.`);
      return null;
    }

    if (!isAppRole(userRow.role)) {
      console.warn(`[auth-server] User ${userId} has no valid app role in tbl_users. Found:`, userRow?.role);
      return null;
    }

    return userRow.role.toLowerCase() as AppRole;
  } catch (e) {
    console.error(`[auth-server] EXCEPTION in getUserRole for ${userId}:`, e);
    return null;
  }
}

export async function getUserAccessState(userId: string, supabase = createAdminClient()): Promise<UserAccessState> {
  const { data: userRow, error } = await employeeHelper.getUserById(userId, supabase, {
    includeArchived: true,
  });

  if (error || !userRow) {
    return {
      archived: false,
      role: null,
      userRow: null,
    };
  }

  if (userRow.archived_at) {
    return {
      archived: true,
      role: null,
      userRow,
    };
  }

  return {
    archived: false,
    role: isAppRole(userRow.role) ? userRow.role.toLowerCase() as AppRole : null,
    userRow,
  };
}


/**
 * A comprehensive server-side authentication guard for API Routes.
 * Supports both Bearer token (API) and Cookie (Client/Browser) authentication flows.
 * 
 * @param request - Incoming NextRequest object.
 * @param options - Configuration for role checks and cookie fallback.
 * @returns An object indicating success (with user/role) or failure (with redirect reason).
 */
export async function requireRequestAuth(
  request: Request,
  options: RequestAuthOptions = {}
): Promise<RequestAuthSuccess | RequestAuthFailure> {
  const authHeader = request.headers.get("authorization");
  let user: User | null = null;
  let reason: AuthRedirectReason = "login-required";
  const supabaseAdmin = createAdminClient();

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return {
        ok: false,
        reason: "session-expired",
        response: getUnauthorizedResponse("session-expired"),
      };
    }

    user = data.user;
  } else if (options.allowCookieAuth) {
    const supabase = await createServerSupabase();
    const {
      data: { user: cookieUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !cookieUser) {
      reason = error ? "session-expired" : "login-required";
      return {
        ok: false,
        reason,
        response: getUnauthorizedResponse(reason),
      };
    }

    user = cookieUser;
  } else {
    return {
      ok: false,
      reason,
      response: getUnauthorizedResponse(reason),
    };
  }

  const role = await getUserRole(user.id, supabaseAdmin);

  if (options.allowedRoles && (!role || !options.allowedRoles.includes(role))) {
    return {
      ok: false,
      reason: "access-denied",
      response: getForbiddenResponse(),
    };
  }

  return { ok: true, user, role };
}

/**
 * A lightweight authentication state fetcher for Server Components.
 * Simplifies the boilerplate for checking `supabase.auth.getUser()` and 
 * resolving roles during page rendering.
 * 
 * @returns An object containing the user and role if authenticated, 
 *          otherwise a redirect reason.
 */
export const getServerAuthState = cache(async (): Promise<ServerAuthSuccess | ServerAuthFailure> => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log(`[auth-server] getServerAuthState: user=${user?.id ?? 'null'}, error=${error?.message ?? 'none'}`);

  if (error || !user) {
    return {
      ok: false,
      reason: error ? "session-expired" : "login-required",
    };
  }

  const role = await getUserRole(user.id);
  console.log(`[auth-server] getServerAuthState: resolved role=${role}`);
  return { ok: true, user, role };
});
