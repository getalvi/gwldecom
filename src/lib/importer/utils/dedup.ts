import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ExtractedProduct } from "../interfaces";
export interface DuplicateCheckResult { isDuplicate: boolean; existingId?: string; reason?: string; }
export async function checkDuplicate(product: Partial<ExtractedProduct>): Promise<DuplicateCheckResult> {
  const supabase = await createClient();
  if (product.sourceUrl) {
    const { data } = await supabase.from("import_items").select("id, resulting_product_id").eq("url", product.sourceUrl).eq("status", "imported").limit(1).maybeSingle();
    if (data?.resulting_product_id) return { isDuplicate: true, existingId: data.resulting_product_id, reason: "Same URL already imported" };
  }
  if (product.sku) {
    const { data } = await supabase.from("products").select("id").eq("sku", product.sku).maybeSingle();
    if (data) return { isDuplicate: true, existingId: data.id, reason: `SKU ${product.sku} already exists` };
  }
  if (product.title) {
    const { data } = await supabase.from("products").select("id").eq("title", product.title).maybeSingle();
    if (data) return { isDuplicate: true, existingId: data.id, reason: "Identical title already exists" };
  }
  return { isDuplicate: false };
}
export function normalizeImageUrl(url: string, baseUrl: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) { try { return new URL(url, baseUrl).href; } catch { return url; } }
  if (!url.startsWith("http")) { try { return new URL(url, baseUrl).href; } catch { return url; } }
  try { const u = new URL(url); ["utm_source","utm_medium","utm_campaign","ref","tag"].forEach(p => u.searchParams.delete(p)); return u.href; } catch { return url; }
}
export function deduplicateImages(images: string[]): string[] {
  const seen = new Set<string>();
  return images.filter(url => {
    if (!url) return false;
    const key = url.split("?")[0] ?? url;
    if (seen.has(key)) return false;
    seen.add(key);
    return url.startsWith("http") && !url.includes("placeholder") && !url.includes("blank");
  });
}
