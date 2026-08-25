import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { BannerManager } from "@/components/admin/BannerManager";
export const dynamic = "force-dynamic";
export default async function AdminBannersPage() {
  await requireRole(["admin","staff"]);
  const supabase = await createClient();
  const { data: banners } = await supabase.from("banners").select("*").order("position");
  return <div><h1 className="text-2xl font-bold mb-6">Banners</h1><BannerManager initialBanners={(banners ?? []) as {id:string;title:string;image_url:string;link_url:string|null;position:number;active:boolean}[]}/></div>;
}
