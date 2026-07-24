import "server-only";
import sharp from "sharp";

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 78;

export interface ProcessedImage {
  buffer: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
  bytes: number;
}

export async function processProductImage(input: Buffer): Promise<ProcessedImage> {
  const pipeline = sharp(input, { failOn: "none" }).rotate();

  const metadata = await pipeline.metadata();
  const needsResize =
    (metadata.width ?? 0) > MAX_DIMENSION || (metadata.height ?? 0) > MAX_DIMENSION;

  const resized = needsResize
    ? pipeline.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    : pipeline;

  const output = await resized
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: output.data,
    contentType: "image/webp",
    width: output.info.width,
    height: output.info.height,
    bytes: output.info.size,
  };
}

export function assertValidImageUpload(file: { size: number; type: string }) {
  const MAX_BYTES = 10 * 1024 * 1024;
  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
  if (!ALLOWED.includes(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image exceeds 10MB upload limit");
  }
}
