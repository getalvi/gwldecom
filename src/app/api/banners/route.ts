import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("banners").select("*").eq("active", true).order("position");
  return Response.json({ banners: data ?? [] });
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(["admin", "staff"]);
    const body = z.object({ title: z.string().min(1), image_url: z.string().url(), link_url: z.string().optional(), position: z.number().default(0) }).parse(await request.json());
    const supabase = await createClient();
    const { data, error } = await supabase.from("banners").insert(body).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data, { status: 201 });
  } catch (err) { return rbacErrorResponse(err); }
}
