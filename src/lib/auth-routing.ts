export type AuthRedirectReason = "access-denied" | "login-required" | "session-expired";

const FALLBACK_REDIRECT_PATH = "/dashboard";

export function getSafeInternalPath(candidate?: string | null, fallback = FALLBACK_REDIRECT_PATH) {
  if (!candidate) {
    return fallback;
  }

  const trimmed = candidate.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}

export function buildLoginPath(options?: { nextPath?: string | null; reason?: AuthRedirectReason }) {
  const params = new URLSearchParams();
  const reason = options?.reason ?? "login-required";
  const safeNextPath = getSafeInternalPath(options?.nextPath, FALLBACK_REDIRECT_PATH);

  params.set("reason", reason);

  if (safeNextPath !== FALLBACK_REDIRECT_PATH) {
    params.set("next", safeNextPath);
  }

  return `/?${params.toString()}`;
}

export function buildUnauthorizedPath(reason: AuthRedirectReason = "access-denied") {
  const params = new URLSearchParams({ reason });
  return `/unauthorized?${params.toString()}`;
}

export function getAuthReasonCopy(reason?: string | null) {
  switch (reason) {
    case "session-expired":
      return {
        description: "Your session expired. Please sign in again to continue.",
        title: "Session Expired",
      };
    case "access-denied":
      return {
        description: "Your account is signed in, but it does not have permission to access that page.",
        title: "Access Denied",
      };
    case "login-required":
    default:
      return {
        description: "Please sign in with an authorized account to continue.",
        title: "Login Required",
      };
  }
}

export function readSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
