import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  try {
    await requireRole(["admin", "staff"]);
    const body = z.object({ code: z.string().min(2).max(20), type: z.enum(["percentage","fixed"]), value: z.number().positive(), min_order_amount: z.number().nullable().optional(), max_uses: z.number().int().nullable().optional(), expires_at: z.string().nullable().optional() }).parse(await request.json());
    const supabase = await createClient();
    const { data, error } = await supabase.from("coupons").insert(body).select().single();
    if (error) return Response.json({ error: error.message }, { status: error.code === "23505" ? 409 : 500 });
    return Response.json(data, { status: 201 });
  } catch (err) { return rbacErrorResponse(err); }
}
