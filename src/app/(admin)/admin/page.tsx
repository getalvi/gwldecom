import Link from "next/link";
import { ShoppingBag, Package, Users, TrendingUp, Clock, AlertTriangle, DollarSign, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/rbac";
import { formatBDT, formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface OrderRow {
  id: string; total: number; status: string; created_at: string; shipping_address: Record<string, string>;
  profiles: { full_name: string | null; email: string | null } | null;
}

export default async function AdminDashboard() {
  await requireRole(["admin", "staff"]);
  const supabase = await createClient();

  const [
    { count: totalProducts }, { count: publishedProducts },
    { count: totalOrders }, { count: pendingOrders }, { count: totalCustomers },
    { data: rawRecentOrders }, { data: lowStock }, { data: revenueData },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("orders").select("id, total, status, created_at, shipping_address, profiles!customer_id(full_name, email)").order("created_at", { ascending: false }).limit(5),
    supabase.from("products").select("id, title, stock_quantity").eq("status", "published").lt("stock_quantity", 5).order("stock_quantity").limit(5),
    supabase.from("orders").select("total, created_at").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);

  const recentOrders: OrderRow[] = (rawRecentOrders ?? []).map(o => ({
    ...o,
    shipping_address: o.shipping_address as Record<string, string>,
    profiles: Array.isArray(o.profiles) ? (o.profiles[0] ?? null) : (o.profiles as { full_name: string | null; email: string | null } | null),
  }));

  const totalRevenue = (revenueData ?? []).reduce((s, o) => s + o.total, 0);
  const todayOrders = (revenueData ?? []).filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length;

  const stats = [
    { label: "Revenue (30d)", value: formatBDT(totalRevenue), icon: DollarSign, color: "text-success", bg: "bg-success/10" },
    { label: "Total Orders", value: String(totalOrders ?? 0), icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Pending Orders", value: String(pendingOrders ?? 0), icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Customers", value: String(totalCustomers ?? 0), icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Products", value: String(totalProducts ?? 0), icon: Package, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Published", value: String(publishedProducts ?? 0), icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
    { label: "Today's Orders", value: String(todayOrders), icon: Star, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Low Stock", value: String(lowStock?.length ?? 0), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Welcome back! Here&apos;s what&apos;s happening.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-border bg-background p-4">
            <div className={`inline-flex rounded-lg p-2 ${bg} mb-3`}><Icon size={18} className={color} /></div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{order.profiles?.full_name ?? order.shipping_address?.fullName ?? "Guest"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatBDT(order.total)}</p>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(order.status)}`}>{order.status}</span>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No orders yet</p>}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold">Low Stock Alerts</h2>
            <Link href="/admin/products" className="text-xs text-primary hover:underline">Manage</Link>
          </div>
          <div className="divide-y divide-border">
            {(lowStock ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4">
                <p className="text-sm font-medium truncate flex-1 mr-4">{p.title}</p>
                <Badge variant={p.stock_quantity === 0 ? "destructive" : "warning"}>
                  {p.stock_quantity === 0 ? "Out of stock" : `${p.stock_quantity} left`}
                </Badge>
              </div>
            ))}
            {(lowStock ?? []).length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">All products well-stocked ✓</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
