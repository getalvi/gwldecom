import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { processProductImage } from "@/lib/image";
import { nanoid } from "nanoid";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

/**
 * Downloads a remote image, compresses it to WebP, uploads to Supabase Storage.
 * Returns the Supabase public URL, or null if download/upload fails.
 */
export async function downloadAndStoreImage(
  remoteUrl: string,
  productTitle: string,
  position: number
): Promise<string | null> {
  try {
    // Fetch with browser-like headers to avoid hotlink blocks
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(remoteUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": new URL(remoteUrl).origin,
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site",
      },
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    const mimeType = contentType.split(";")[0]?.trim() ?? "image/jpeg";
    if (!ALLOWED_TYPES.some(t => mimeType.startsWith(t.split("/")[0]!))) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) return null;
    if (buffer.length < 500) return null; // likely a placeholder/blank

    // Compress + convert to WebP
    const processed = await processProductImage(buffer);

    // Upload to Supabase Storage
    const storage = createServiceRoleClient();
    const path = `imported/${Date.now()}-${nanoid(6)}-${position}.webp`;

    const { error: uploadError } = await storage.storage
      .from("product-images")
      .upload(path, processed.buffer, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "31536000",
      });

    if (uploadError) {
      console.error("[imageDownloader] upload failed:", uploadError.message);
      return null;
    }

    const { data: { publicUrl } } = storage.storage
      .from("product-images")
      .getPublicUrl(path);

    return publicUrl;
  } catch (err) {
    console.error("[imageDownloader] failed for", remoteUrl, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Downloads up to `maxImages` from a list of remote URLs, stores them,
 * and returns the list of successfully stored Supabase URLs.
 */
export async function downloadAndStoreImages(
  remoteUrls: string[],
  productTitle: string,
  maxImages = 8
): Promise<string[]> {
  const results: string[] = [];
  const toProcess = remoteUrls.slice(0, maxImages);

  // Process in parallel, up to 3 at a time
  const CONCURRENCY = 3;
  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const batch = toProcess.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map((url, j) => downloadAndStoreImage(url, productTitle, i + j))
    );
    for (const result of settled) {
      if (result.status === "fulfilled" && result.value) {
        results.push(result.value);
      }
    }
  }

  return results;
}
