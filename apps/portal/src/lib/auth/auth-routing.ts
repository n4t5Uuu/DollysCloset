/**
 * Defines the permissible set of reasons for an authentication-driven redirect.
 * Used to provide context-sensitive messaging on the login and unauthorized pages.
 */
export type AuthRedirectReason = "access-denied" | "login-required" | "session-expired" | "signed-out-elsewhere";

const FALLBACK_REDIRECT_PATH = "/dashboard";

/**
 * Sanitizes a URL path to ensure it is internal and safe for redirection.
 * Prevents Open Redirect vulnerabilities by enforcing a leading slash and 
 * blocking protocol-relative URLs (//example.com).
 * 
 * @param candidate - The raw URL string from search params or state.
 * @param fallback - The default path to return if the candidate is unsafe.
 * @returns A validated internal path.
 */
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

/**
 * Constructs a fully qualified login URL with optional redirect context.
 * 
 * @param options - Configuration for the login path.
 * @param options.nextPath - The intended destination after a successful login.
 * @param options.reason - The cause of the redirect (e.g. "session-expired").
 * @returns A URL string targeting the login portal.
 */
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
    case "signed-out-elsewhere":
      return {
        description: "Your account was signed in on another device. You have been signed out.",
        title: "Signed Out Remotely",
      };
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
