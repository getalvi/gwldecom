import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

interface Params { params: Promise<{ id: string }> }

const ORDER_STATUSES = ["pending","confirmed","packed","shipped","delivered","cancelled","refunded"] as const;

// PATCH /api/orders/:id — admin updates order status
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireRole(["admin", "staff"]);
    const body = z.object({ status: z.enum(ORDER_STATUSES) }).parse(await request.json());

    const supabase = await createClient();
    const { error } = await supabase.from("orders").update({ status: body.status }).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    await logAudit({
      actorId: user.id,
      action: "product.update",
      entityType: "order",
      entityId: id,
      metadata: { status: body.status } as Record<string, unknown>,
    });

    return Response.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.flatten() }, { status: 400 });
    return rbacErrorResponse(err);
  }
}
