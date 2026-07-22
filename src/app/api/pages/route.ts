import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
import { toSlug } from "@/lib/validation/product";
import { logAudit } from "@/lib/audit";

const blockSchema = z.object({
  id: z.string(),
  type: z.enum(["heading", "text", "image", "productGrid", "banner", "spacer"]),
  props: z.record(z.string(), z.string()),
});

const pageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(220).optional(),
  blocks: z.array(blockSchema).max(100),
  status: z.enum(["draft", "published"]).default("draft"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["admin", "staff"]);
    const body = pageSchema.parse(await request.json());
    const slug = body.slug ? toSlug(body.slug) : toSlug(body.title);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pages")
      .insert({ title: body.title, slug, blocks: body.blocks, status: body.status, created_by: user.id })
      .select("id, slug")
      .single();

    if (error) {
      const status = error.code === "23505" ? 409 : 500;
      return Response.json({ error: error.message }, { status });
    }

    if (body.status === "published") {
      await logAudit({ actorId: user.id, action: "page.publish", entityType: "page", entityId: data.id });
    }

    return Response.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.flatten() }, { status: 400 });
    return rbacErrorResponse(err);
  }
}
