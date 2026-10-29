/**
 * Fetches JSON and throws an Error (with the API's `error` message when present)
 * on non-2xx or non-JSON responses.
 */
export async function fetchJson<T = any>(
  url: string,
  init?: RequestInit,
  fallbackMessage = "Request failed."
): Promise<T> {
  const response = await fetch(url, init);
  const isJson = (response.headers.get("content-type") ?? "").includes("application/json");

  if (!response.ok) {
    const body = isJson ? await response.json().catch(() => null) : null;
    throw new Error(typeof body?.error === "string" && body.error ? body.error : fallbackMessage);
  }
  if (!isJson) throw new Error(fallbackMessage);

  return response.json();
}
