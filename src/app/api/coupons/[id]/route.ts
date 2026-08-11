import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";

interface Params { params: Promise<{ id: string }> }
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    const supabase = await createClient();
    await supabase.from("coupons").delete().eq("id", id);
    return Response.json({ success: true });
  } catch (err) { return rbacErrorResponse(err); }
}
