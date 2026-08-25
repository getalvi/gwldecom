import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
interface Params { params: Promise<{id:string}> }
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await requireRole(["admin","staff"]);
    const body = z.object({title:z.string().optional(),blocks:z.array(z.object({id:z.string(),type:z.string(),props:z.record(z.string(),z.string())})).optional(),status:z.enum(["draft","published"]).optional()}).parse(await request.json());
    const supabase = await createClient();
    const { error } = await supabase.from("pages").update(body).eq("id",id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (err) { return rbacErrorResponse(err); }
}
