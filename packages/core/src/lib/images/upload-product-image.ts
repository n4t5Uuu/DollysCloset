import { InventoryProductImage } from "@/types/inventory.types";

const DEFAULT_UPLOAD_TIMEOUT_MS = 45000;

interface UploadProductImageParams {
  accessToken: string;
  displayOrder: number;
  file: File;
  isPrimary: boolean;
  productId: string;
  timeoutMs?: number;
}

interface UploadErrorResponse {
  details?: string;
  error?: string;
}

async function getUploadErrorMessage(response: Response) {
  try {
    const errorPayload = await response.json() as UploadErrorResponse;

    if (errorPayload.details) {
      return `${errorPayload.error || "Upload failed"}: ${errorPayload.details}`;
    }

    if (errorPayload.error) {
      return errorPayload.error;
    }
  } catch {
    // Fall back to a generic response error below.
  }

  return `Upload failed with status ${response.status}`;
}

export async function uploadProductImageFile({
  accessToken,
  displayOrder,
  file,
  isPrimary,
  productId,
  timeoutMs = DEFAULT_UPLOAD_TIMEOUT_MS,
}: UploadProductImageParams): Promise<InventoryProductImage> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("product_id", productId);
    formData.append("display_order", String(displayOrder));
    formData.append("is_primary", String(isPrimary));

    const response = await fetch("/api/admin/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await getUploadErrorMessage(response));
    }

    return await response.json() as InventoryProductImage;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Upload timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
    }

    throw error instanceof Error ? error : new Error("Upload failed.");
  } finally {
    window.clearTimeout(timeoutId);
  }
}
