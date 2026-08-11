import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatBDT } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireRole(["admin", "staff"]);
  const supabase = await createClient();

  const { data: orders } = await supabase.from("orders").select("total, status, created_at").order("created_at");
  const { data: topProducts } = await supabase
    .from("order_items")
    .select("quantity, unit_price, products(title)")
    .limit(10);

  const totalRevenue = (orders ?? []).filter(o => o.status !== "cancelled" && o.status !== "refunded").reduce((s, o) => s + o.total, 0);
  const byStatus = (orders ?? []).reduce((acc: Record<string, number>, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-5">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-3xl font-bold text-success mt-1">{formatBDT(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-5">
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-3xl font-bold mt-1">{orders?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-5">
          <p className="text-sm text-muted-foreground">Avg Order Value</p>
          <p className="text-3xl font-bold mt-1">{orders?.length ? formatBDT(totalRevenue / orders.length) : "৳0"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-5">
        <h2 className="font-semibold mb-4">Orders by Status</h2>
        <div className="space-y-2">
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} className="flex items-center gap-3">
              <span className="w-24 text-sm capitalize text-muted-foreground">{status}</span>
              <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${((count as number) / (orders?.length ?? 1)) * 100}%` }} />
              </div>
              <span className="text-sm font-semibold w-8 text-right">{count as number}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
