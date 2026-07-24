import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: products } = await supabase.from("products").select("slug, updated_at").eq("status", "published");
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000";
  return [
    { url: base, lastModified: new Date(), priority: 1 },
    { url: `${base}/search`, lastModified: new Date(), priority: 0.8 },
    ...((products ?? []).map(p => ({ url: `${base}/products/${p.slug}`, lastModified: new Date(p.updated_at), priority: 0.9 }))),
  ];
}
