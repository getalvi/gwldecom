import { redirect } from "next/navigation";
import Link from "next/link";
import { Package } from "lucide-react";
import { getCurrentUser } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatBDT, formatDate, getStatusColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface OrderItemRow { quantity: number; unit_price: number; products: { title: string } | null }
interface OrderRow { id: string; total: number; status: string; payment_method: string; created_at: string; order_items: OrderItemRow[] }

export default async function CustomerOrdersPage() {
  let user;
  try { user = await getCurrentUser(); } catch { redirect("/login?redirect=/account/orders"); }

  const supabase = await createClient();
  const { data: rawOrders } = await supabase
    .from("orders")
    .select("id, total, status, payment_method, created_at, order_items(quantity, unit_price, products(title))")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const orders: OrderRow[] = (rawOrders ?? []).map(o => ({
    ...o,
    order_items: ((o.order_items ?? []) as unknown[]).map((item: unknown) => {
      const i = item as { quantity: number; unit_price: number; products: unknown };
      return { ...i, products: Array.isArray(i.products) ? (i.products[0] ?? null) : i.products } as OrderItemRow;
    }),
  }));

  return (
    <main className="container max-w-2xl py-8 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No orders yet</p>
          <Link href="/" className="text-primary hover:underline text-sm">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Order #{order.id.slice(0,8).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getStatusColor(order.status)}`}>{order.status}</span>
              </div>
              <div className="space-y-1 mb-3">
                {order.order_items.map((item, i) => (
                  <p key={i} className="text-sm">{item.products?.title ?? "Product"} × {item.quantity}</p>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-sm capitalize text-muted-foreground">{order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method}</span>
                <span className="font-bold text-primary">{formatBDT(order.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
