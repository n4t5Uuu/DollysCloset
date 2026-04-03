import { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authHelper } from "@/lib/auth/auth-helper";
import { AuthRedirectReason } from "@/lib/auth/auth-routing";
import { createServerSupabase } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";

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

function isAppRole(role: string | null | undefined): role is AppRole {
  return role === "admin" || role === "employee";
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
 * @returns The resolved AppRole or null if not found or invalid.
 */
async function getUserRole(userId: string) {
  const { data, error } = await authHelper.getUserRole(userId, admin);

  if (error || !isAppRole(data?.role)) {
    return null;
  }

  return data.role;
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

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    const { data, error } = await admin.auth.getUser(token);

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

  const role = await getUserRole(user.id);

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
export async function getServerAuthState(): Promise<ServerAuthSuccess | ServerAuthFailure> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      reason: error ? "session-expired" : "login-required",
    };
  }

  const role = await getUserRole(user.id);
  return { ok: true, user, role };
}
