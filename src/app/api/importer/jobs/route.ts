import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
import { extractFromUrl } from "@/lib/importer/jobs/engine";
import { parseSitemap, discoverProductUrls } from "@/lib/importer/parsers/sitemap";
export const maxDuration = 55;
const createJobSchema = z.object({
  type: z.enum(["url","bulk","crawl","sitemap","api"]),
  urls: z.array(z.string().url()).optional(),
  sitemapUrl: z.string().url().optional(),
  categoryUrl: z.string().url().optional(),
  csvData: z.string().optional(),
  config: z.object({markupPercent:z.number().optional(),fixedIncrease:z.number().optional(),autoRound:z.boolean().optional(),minimumPrice:z.number().optional(),aiRewrite:z.boolean().optional(),aiTranslate:z.boolean().optional(),translateTo:z.string().optional(),autoPublish:z.boolean().optional(),defaultCategoryId:z.string().optional(),maxPages:z.number().max(50).optional()}).optional().default({}),
});
export async function GET() {
  try {
    await requireRole(["admin","staff"]);
    const supabase = await createClient();
    const { data } = await supabase.from("import_jobs").select("id, type, status, progress_total, progress_done, progress_failed, source_input, created_at, completed_at, error_message").order("created_at",{ascending:false}).limit(50);
    return Response.json({ jobs: data ?? [] });
  } catch (err) { return rbacErrorResponse(err); }
}
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["admin","staff"]);
    const body = createJobSchema.parse(await request.json());
    const svc = createServiceRoleClient();
    const supabase = await createClient();
    let urls: string[] = [];
    if (body.type==="url"||body.type==="api") urls = body.urls ?? [];
    else if (body.type==="bulk") {
      if (body.csvData) urls = body.csvData.split(/[\n,\r\t ]+/).map(l=>l.trim()).filter(l=>l.startsWith("http")).slice(0,200);
      else urls = body.urls ?? [];
    } else if (body.type==="sitemap"&&body.sitemapUrl) urls = await parseSitemap(body.sitemapUrl,body.config.maxPages??100);
    else if (body.type==="crawl"&&body.categoryUrl) urls = await discoverProductUrls(body.categoryUrl,body.config.maxPages??10);
    if (!urls.length) return Response.json({ error: "No valid URLs found" }, { status: 400 });
    const { data: job, error: jobErr } = await svc.from("import_jobs").insert({created_by:user.id,type:body.type,status:"running",source_input:{urls:urls.slice(0,5),total:urls.length} as import("@/types/database").Json,config:body.config as import("@/types/database").Json,progress_total:urls.length,started_at:new Date().toISOString()}).select("id").single();
    if (jobErr||!job) return Response.json({ error: jobErr?.message ?? "Failed to create job" }, { status: 500 });
    await svc.from("import_items").insert(urls.map(url=>({job_id:job.id,url,status:"pending" as const})));
    if (urls.length===1&&body.type==="url") {
      const { data: items } = await supabase.from("import_items").select("id").eq("job_id",job.id).limit(1);
      const itemId = items?.[0]?.id;
      if (itemId) {
        const { product, error } = await extractFromUrl(urls[0]!,job.id,itemId,body.config);
        if (!product) { await svc.from("import_jobs").update({status:"failed",error_message:error,completed_at:new Date().toISOString(),progress_failed:1}).eq("id",job.id); return Response.json({ error: error ?? "Extraction failed" }, { status: 422 }); }
        await svc.from("import_jobs").update({status:"completed",progress_done:1,completed_at:new Date().toISOString()}).eq("id",job.id);
        return Response.json({ jobId:job.id, itemId, product, preview:true }, { status: 201 });
      }
    }
    const SYNC_LIMIT = 5;
    const { data: pendingItems } = await supabase.from("import_items").select("id, url").eq("job_id",job.id).eq("status","pending").limit(SYNC_LIMIT);
    let done=0,failed=0;
    for (const item of pendingItems??[]) {
      const { product, error: extractErr } = await extractFromUrl(item.url,job.id,item.id,body.config);
      if (product) done++;
      else { failed++; await svc.from("import_items").update({status:"failed",error_message:extractErr}).eq("id",item.id); }
    }
    const allDone = done+failed>=urls.length;
    await svc.from("import_jobs").update({status:allDone?(failed===urls.length?"failed":"completed"):"running",progress_done:done,progress_failed:failed,...(allDone?{completed_at:new Date().toISOString()}:{})}).eq("id",job.id);
    return Response.json({ jobId:job.id, total:urls.length, processed:done+failed, done, failed }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.flatten() }, { status: 400 });
    return rbacErrorResponse(err);
  }
}
