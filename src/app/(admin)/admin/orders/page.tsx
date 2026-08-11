import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatBDT, formatDate, getStatusColor } from "@/lib/utils";
import { OrderStatusButtons } from "@/components/admin/OrderStatusButtons";

export const dynamic = "force-dynamic";

interface OrderItem { id: string; quantity: number; unit_price: number; products: { id: string; title: string; slug: string } | null }
interface OrderProfile { full_name: string | null; email: string | null; phone: string | null }
interface Order {
  id: string; status: string; payment_method: string; payment_status: string;
  total: number; shipping_address: Record<string, string>; created_at: string;
  profiles: OrderProfile | null; order_items: OrderItem[];
}

export default async function AdminOrdersPage() {
  await requireRole(["admin", "staff"]);
  const supabase = await createClient();

  const { data: rawOrders } = await supabase
    .from("orders")
    .select("id, status, payment_method, payment_status, total, shipping_address, created_at, profiles!customer_id(full_name, email, phone), order_items(id, quantity, unit_price, products(id, title, slug))")
    .order("created_at", { ascending: false })
    .limit(100);

  const orders: Order[] = (rawOrders ?? []).map(o => ({
    ...o,
    shipping_address: o.shipping_address as Record<string, string>,
    profiles: Array.isArray(o.profiles) ? (o.profiles[0] ?? null) : (o.profiles as OrderProfile | null),
    order_items: ((o.order_items ?? []) as unknown[]).map((item: unknown) => {
      const i = item as { id: string; quantity: number; unit_price: number; products: unknown };
      return { ...i, products: Array.isArray(i.products) ? (i.products[0] ?? null) : i.products } as OrderItem;
    }),
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">{orders.length} total orders</p>
      </div>
      <div className="space-y-4">
        {orders.map((order) => {
          const addr = order.shipping_address;
          return (
            <div key={order.id} className="rounded-xl border border-border bg-background overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/30 px-5 py-3 border-b border-border">
                <div className="flex items-center gap-4">
                  <div><span className="text-xs text-muted-foreground">Order ID</span><p className="text-sm font-mono font-semibold">#{order.id.slice(0,8).toUpperCase()}</p></div>
                  <div><span className="text-xs text-muted-foreground">Date</span><p className="text-sm">{formatDate(order.created_at)}</p></div>
                  <div><span className="text-xs text-muted-foreground">Payment</span><p className="text-sm capitalize">{order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusColor(order.status)}`}>{order.status}</span>
                  <span className="font-bold text-primary">{formatBDT(order.total)}</span>
                </div>
              </div>
              <div className="p-5 grid gap-5 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Customer</p>
                  <p className="text-sm font-semibold">{order.profiles?.full_name ?? addr.fullName}</p>
                  <p className="text-sm text-muted-foreground">{order.profiles?.email ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">{order.profiles?.phone ?? addr.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Shipping Address</p>
                  <p className="text-sm">{addr.fullName}</p>
                  <p className="text-sm text-muted-foreground">{addr.addressLine1}</p>
                  <p className="text-sm text-muted-foreground">{addr.city}, {addr.district} {addr.postalCode}</p>
                  <p className="text-sm text-muted-foreground">{addr.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Products</p>
                  <div className="space-y-1">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="truncate mr-2">{item.products?.title ?? "Product"} × {item.quantity}</span>
                        <span className="shrink-0 font-medium">{formatBDT(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-5 pb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Update Status</p>
                <OrderStatusButtons orderId={order.id} currentStatus={order.status} />
              </div>
            </div>
          );
        })}
        {orders.length === 0 && (
          <div className="rounded-xl border border-border bg-background p-12 text-center">
            <p className="text-muted-foreground">No orders yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
