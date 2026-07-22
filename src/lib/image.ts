import "server-only";
import sharp from "sharp";

const MAX_DIMENSION = 1600; // px — plenty for product zoom, keeps file size down
const WEBP_QUALITY = 78; // sweet spot for product photography

export interface ProcessedImage {
  buffer: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
  bytes: number;
}

/**
 * Compresses and converts an uploaded image to WebP, capped at MAX_DIMENSION
 * on the longest edge. This runs before every upload to Supabase Storage to
 * minimize storage + bandwidth usage on the free tier.
 */
export async function processProductImage(input: Buffer): Promise<ProcessedImage> {
  const pipeline = sharp(input, { failOn: "none" }).rotate(); // auto-orient from EXIF

  const metadata = await pipeline.metadata();
  const needsResize =
    (metadata.width ?? 0) > MAX_DIMENSION || (metadata.height ?? 0) > MAX_DIMENSION;

  const resized = needsResize
    ? pipeline.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    : pipeline;

  const output = await resized.webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer({ resolveWithObject: true });

  return {
    buffer: output.data,
    contentType: "image/webp",
    width: output.info.width,
    height: output.info.height,
    bytes: output.info.size,
  };
}

/** Basic server-side guardrails before we ever run sharp on user input. */
export function assertValidImageUpload(file: { size: number; type: string }) {
  const MAX_BYTES = 10 * 1024 * 1024; // 10MB upload cap
  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED.includes(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image exceeds 10MB upload limit");
  }
}
