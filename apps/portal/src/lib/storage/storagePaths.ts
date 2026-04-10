/**
 * Extracts the relative object path inside the `product-images` Supabase
 * storage bucket from a public image URL.
 *
 * Examples:
 *   https://xxx.supabase.co/storage/v1/object/public/product-images/42/1712345-img.jpg
 *     => "42/1712345-img.jpg"
 *
 *   https://example.com/some/other/42/image.jpg
 *     => "42/image.jpg" (fallback: last two segments)
 */
export function getStorageObjectPath(imageUrl: string): string {
  try {
    const decodedUrl = decodeURIComponent(imageUrl);
    const bucketSegment = "/product-images/";
    const bucketIndex = decodedUrl.indexOf(bucketSegment);

    if (bucketIndex >= 0) {
      return decodedUrl.slice(bucketIndex + bucketSegment.length);
    }

    return decodedUrl.split("/").slice(-2).join("/");
  } catch {
    return imageUrl.split("/").slice(-2).join("/");
  }
}
