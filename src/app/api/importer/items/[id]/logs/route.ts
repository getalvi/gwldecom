import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
interface Params { params: Promise<{id:string}> }
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireRole(["admin","staff"]);
    const { id } = await params;
    const supabase = await createClient();
    const { data } = await supabase.from("import_logs").select("*").eq("item_id",id).order("created_at");
    return Response.json({ logs: data ?? [] });
  } catch (err) { return rbacErrorResponse(err); }
}
