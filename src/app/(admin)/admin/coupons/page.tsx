import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { CouponManager } from "@/components/admin/CouponManager";
export const dynamic = "force-dynamic";
export default async function AdminCouponsPage() {
  await requireRole(["admin","staff"]);
  const supabase = await createClient();
  const { data: coupons } = await supabase.from("coupons").select("*").order("created_at",{ascending:false});
  return <div><h1 className="text-2xl font-bold mb-6">Coupons</h1><CouponManager initialCoupons={(coupons ?? []) as {id:string;code:string;type:"percentage"|"fixed";value:number;min_order_amount:number|null;max_uses:number|null;used_count:number;expires_at:string|null;active:boolean;created_at:string}[]}/></div>;
}
