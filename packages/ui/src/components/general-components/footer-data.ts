/** Fetches the public contact details shown in the footer. Returns null when unavailable. */
export async function fetchFooterContactBody(): Promise<{
    facebookLink?: string;
    instagramLink?: string;
    address?: string;
} | null> {
    try {
        const response = await fetch("/api/business-details?slug=contact", { cache: "no-store" });
        if (!response.ok) return null;

        const result = await response.json();
        return result?.data?.body ?? null;
    } catch (error) {
        console.error("Footer fetch error:", error);
        return null;
    }
}
