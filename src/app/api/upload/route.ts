import { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
import { assertValidImageUpload, processProductImage } from "@/lib/image";
import { nanoid } from "nanoid";

export const maxDuration = 30;

/**
 * POST /api/upload
 * Accepts multipart/form-data with field "file".
 * Compresses to WebP, uploads to Supabase Storage, returns public URL.
 * Used by product image upload in admin panel.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["admin", "staff"]);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided (field name must be 'file')" }, { status: 400 });
    }

    assertValidImageUpload({ size: file.size, type: file.type });

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const processed = await processProductImage(inputBuffer);

    const storage = createServiceRoleClient();
    const path = `products/${user.id}/${Date.now()}-${nanoid(8)}.webp`;

    const { error: uploadError } = await storage.storage
      .from("product-images")
      .upload(path, processed.buffer, {
        contentType: processed.contentType,
        upsert: false,
        cacheControl: "31536000",
      });

    if (uploadError) {
      console.error("[upload] Supabase upload failed:", uploadError);
      return Response.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = storage.storage
      .from("product-images")
      .getPublicUrl(path);

    return Response.json({
      url: publicUrl,
      width: processed.width,
      height: processed.height,
      bytes: processed.bytes,
    }, { status: 201 });

  } catch (err) {
    return rbacErrorResponse(err);
  }
}
