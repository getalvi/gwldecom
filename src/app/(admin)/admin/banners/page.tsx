import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { BannerManager } from "@/components/admin/BannerManager";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  await requireRole(["admin", "staff"]);
  const supabase = await createClient();
  const { data: banners } = await supabase.from("banners").select("*").order("position");
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Banners</h1>
      <BannerManager initialBanners={banners ?? []} />
    </div>
  );
}
