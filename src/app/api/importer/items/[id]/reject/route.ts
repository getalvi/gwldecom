import { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
interface Params { params: Promise<{id:string}> }
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    await requireRole(["admin","staff"]);
    const { id } = await params;
    const svc = createServiceRoleClient();
    await svc.from("import_items").update({status:"rejected"}).eq("id",id);
    return Response.json({ success:true });
  } catch (err) { return rbacErrorResponse(err); }
}
