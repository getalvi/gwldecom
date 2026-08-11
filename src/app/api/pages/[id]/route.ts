import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const blockSchema = z.object({
  id: z.string(),
  type: z.enum(["heading", "text", "image", "productGrid", "banner", "spacer"]),
  props: z.record(z.string(), z.string()),
});
const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(220).optional(),
  blocks: z.array(blockSchema).max(100).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireRole(["admin", "staff"]);
    const body = updateSchema.parse(await request.json());

    const supabase = await createClient();
    const { error } = await supabase.from("pages").update(body).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    if (body.status === "published") {
      await logAudit({ actorId: user.id, action: "page.publish", entityType: "page", entityId: id });
    }
    return Response.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.flatten() }, { status: 400 });
    return rbacErrorResponse(err);
  }
}
