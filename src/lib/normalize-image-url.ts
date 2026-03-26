export function normalizeImageUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) {
    return "";
  }

  if (rawUrl.startsWith("/")) {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);
    const normalizedPathname = url.pathname
      .split("/")
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join("/");

    url.pathname = normalizedPathname;
    return url.toString();
  } catch {
    return encodeURI(rawUrl);
  }
}
