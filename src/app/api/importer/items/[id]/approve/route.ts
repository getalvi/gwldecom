import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
import { saveProductFromExtraction } from "@/lib/importer/jobs/engine";
import { createClient } from "@/lib/supabase/server";
interface Params { params: Promise<{id:string}> }
export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireRole(["admin","staff"]);
    const { id } = await params;
    const body = z.object({overrides:z.object({title:z.string().optional(),description:z.string().optional(),price:z.number().optional(),stock:z.number().optional(),sku:z.string().optional(),brand:z.string().optional(),category:z.string().optional(),tags:z.array(z.string()).optional()}).optional().default({}),config:z.object({autoPublish:z.boolean().optional(),defaultCategoryId:z.string().optional()}).optional().default({})}).parse(await request.json());
    const supabase = await createClient();
    const { data: item } = await supabase.from("import_items").select("job_id").eq("id",id).single();
    if (!item) return Response.json({ error: "Item not found" }, { status: 404 });
    const { productId, error } = await saveProductFromExtraction(id,item.job_id,body.overrides,body.config);
    if (!productId) return Response.json({ error: error ?? "Save failed" }, { status: 422 });
    return Response.json({ productId, success:true });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.flatten() }, { status: 400 });
    return rbacErrorResponse(err);
  }
}
