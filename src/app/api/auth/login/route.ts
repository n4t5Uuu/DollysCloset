import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";

// Simple in-memory sliding-window rate limiter
// Note: resets on serverless cold starts — provides best-effort protection.
// For persistent rate limiting, replace with Redis or an edge KV store.
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = failedAttempts.get(ip);

  if (!entry || now >= entry.resetAt) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = failedAttempts.get(ip);

  if (!entry || now >= entry.resetAt) {
    failedAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfterSeconds } = checkRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many failed login attempts. Please try again in 15 minutes." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    clearFailedAttempts(ip);

    // Revoke all other active sessions for this account so only one device
    // can be logged in at a time. Uses scope "others" to preserve the new session.
    let otherSessionsRevoked = false;
    if (data.session?.access_token) {
      const { error: revokeError } = await admin.auth.admin.signOut(
        data.session.access_token,
        "others"
      );
      otherSessionsRevoked = !revokeError;
    }

    return NextResponse.json({
      user: { id: data.user.id, email: data.user.email },
      accessToken: data.session?.access_token,
      otherSessionsRevoked,
    });
  } catch (err) {
    console.error("Login API error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
