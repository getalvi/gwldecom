import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
import { toSlug } from "@/lib/validation/product";

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, image_url")
    .order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ categories: data }, { headers: { "Cache-Control": "public, s-maxage=300" } });
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(["admin", "staff"]);
    const body = categorySchema.parse(await request.json());
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: body.name, slug: toSlug(body.name), parent_id: body.parentId ?? null, image_url: body.imageUrl ?? null })
      .select("id, slug")
      .single();
    if (error) {
      const status = error.code === "23505" ? 409 : 500;
      return Response.json({ error: error.message }, { status });
    }
    return Response.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.flatten() }, { status: 400 });
    return rbacErrorResponse(err);
  }
}
