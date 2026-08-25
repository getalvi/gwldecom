import { NextRequest } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
import { extractFromUrl } from "@/lib/importer/jobs/engine";
import { z } from "zod";
interface Params { params: Promise<{id:string}> }
export const maxDuration = 55;
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireRole(["admin","staff"]);
    const { id } = await params;
    const supabase = await createClient();
    const [{ data: job },{ data: items }] = await Promise.all([supabase.from("import_jobs").select("*").eq("id",id).single(),supabase.from("import_items").select("id, url, status, extraction_method, confidence, warnings, error_message, extracted, duration_ms, resulting_product_id").eq("job_id",id).order("created_at")]);
    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
    return Response.json({ job, items: items ?? [] });
  } catch (err) { return rbacErrorResponse(err); }
}
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await requireRole(["admin","staff"]);
    const body = z.object({action:z.enum(["cancel","pause","resume","process"])}).parse(await request.json());
    const svc = createServiceRoleClient();
    const supabase = await createClient();
    if (body.action==="cancel") { await svc.from("import_jobs").update({status:"cancelled",completed_at:new Date().toISOString()}).eq("id",id); await svc.from("import_items").update({status:"skipped"}).eq("job_id",id).eq("status","pending"); return Response.json({ success:true }); }
    if (body.action==="pause") { await svc.from("import_jobs").update({status:"paused"}).eq("id",id); return Response.json({ success:true }); }
    await svc.from("import_jobs").update({status:"running"}).eq("id",id);
    const { data: pendingItems } = await supabase.from("import_items").select("id, url").eq("job_id",id).eq("status","pending").limit(5);
    const { data: job } = await supabase.from("import_jobs").select("config").eq("id",id).single();
    const config = (job?.config ?? {}) as Record<string,unknown>;
    let done=0,failed=0;
    for (const item of pendingItems??[]) {
      const { product, error } = await extractFromUrl(item.url,id,item.id,config);
      if (product) done++;
      else { failed++; await svc.from("import_items").update({status:"failed",error_message:error}).eq("id",item.id); }
    }
    const { data: counts } = await supabase.from("import_items").select("status").eq("job_id",id);
    const totalDone = counts?.filter(c=>["imported","preview","approved"].includes(c.status)).length??0;
    const totalFailed = counts?.filter(c=>c.status==="failed").length??0;
    const totalPending = counts?.filter(c=>c.status==="pending").length??0;
    await svc.from("import_jobs").update({progress_done:totalDone,progress_failed:totalFailed,status:totalPending===0?"completed":"running",...(totalPending===0?{completed_at:new Date().toISOString()}:{})}).eq("id",id);
    return Response.json({ done, failed, remaining:totalPending });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.flatten() }, { status: 400 });
    return rbacErrorResponse(err);
  }
}
