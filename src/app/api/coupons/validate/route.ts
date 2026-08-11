import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const total = Number(searchParams.get("total") ?? 0);
  if (!code) return Response.json({ error: "Code required" }, { status: 400 });

  const supabase = await createClient();
  const { data: coupon } = await supabase
    .from("coupons").select("*").eq("code", code.toUpperCase()).eq("active", true).single();

  if (!coupon) return Response.json({ error: "Invalid or expired coupon" }, { status: 404 });
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return Response.json({ error: "Coupon expired" }, { status: 400 });
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return Response.json({ error: "Usage limit reached" }, { status: 400 });
  if (coupon.min_order_amount && total < coupon.min_order_amount) return Response.json({ error: `Min order ৳${coupon.min_order_amount}` }, { status: 400 });

  const discount = coupon.type === "percentage" ? (total * coupon.value) / 100 : coupon.value;
  return Response.json({ discount: Math.min(discount, total), type: coupon.type, value: coupon.value });
}
