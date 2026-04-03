const FALLBACK_PUBLIC_ERROR = "Something went wrong. Please try again.";

const SENSITIVE_MESSAGE_PATTERNS = [
  /\bTypeError\b/i,
  /\bReferenceError\b/i,
  /\bSyntaxError\b/i,
  /\bstack\b/i,
  /\btrace\b/i,
  /\bSupabase\b/i,
  /\bPostgres(?:ql)?\b/i,
  /\bSQL\b/i,
  /\brelation\b/i,
  /\bcolumn\b/i,
  /\bschema\b/i,
  /\bconstraint\b/i,
  /\btoken\b/i,
  /\bJWT\b/i,
  /at\s+[A-Za-z0-9_.<>]+/i,
  /[A-Za-z]:\\/,
  /\/src\//,
];

function normalizeWhitespace(value: string) {
  return value
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toUserFacingErrorMessage(
  rawMessage: unknown,
  fallback = FALLBACK_PUBLIC_ERROR
) {
  if (typeof rawMessage !== "string") {
    return fallback;
  }

  const normalized = normalizeWhitespace(rawMessage);
  if (!normalized || normalized.length > 180) {
    return fallback;
  }

  if (SENSITIVE_MESSAGE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return fallback;
  }

  return normalized;
}

export function toUserFacingApiErrorMessage(
  status: number,
  rawMessage: unknown,
  fallback = FALLBACK_PUBLIC_ERROR
) {
  if (status >= 500) {
    return fallback;
  }

  return toUserFacingErrorMessage(rawMessage, fallback);
}
